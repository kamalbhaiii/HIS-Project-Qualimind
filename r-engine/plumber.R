#* @apiTitle R Categorical Data Preprocessing API
#* @apiDescription Comprehensive categorical data preprocessing pipeline with Redis and PostgreSQL storage

library(plumber)
library(jsonlite)
library(readr)
library(readxl)
library(dplyr)
library(uuid)
library(tools)
library(RPostgres)
library(redux)
library(stringr)
library(forcats)
library(tidyr)
library(recipes)
library(janitor)
library(DBI)

# Safe-null helper
`%||%` <- function(x, y) {
  if (is.null(x)) return(y)
  if (length(x) == 1 && is.character(x) && nchar(trimws(x)) == 0) return(y)
  x
}

# Configuration - will be set via environment variables or defaults
REDIS_HOST <- Sys.getenv("REDIS_HOST", "redis")
REDIS_PORT <- as.integer(Sys.getenv("REDIS_PORT", "6379"))
POSTGRES_HOST <- Sys.getenv("POSTGRES_HOST", "postgres")
POSTGRES_PORT <- as.integer(Sys.getenv("POSTGRES_PORT", "5432"))
POSTGRES_USER <- Sys.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD <- Sys.getenv("POSTGRES_PASSWORD", "postgres")
POSTGRES_DB <- Sys.getenv("POSTGRES_DB", "qualimind-testing")

# Supported file extensions
SUPPORTED_EXTENSIONS <- c("csv", "tsv", "txt", "json", "xlsx", "xls")
HIGH_CARDINALITY_THRESHOLD <- as.numeric(Sys.getenv("HIGH_CARDINALITY_THRESHOLD", "50"))
RARE_CATEGORY_MIN_FRACTION <- as.numeric(Sys.getenv("RARE_CATEGORY_MIN_FRACTION", "0.01"))

# Simple in-memory job store
.job_store <- new.env(parent = emptyenv())

# ---------------------------
# Helper utilities
# ---------------------------

infer_extension <- function(file) {
  candidates <- c(
    tolower(file_ext(file$filename %||% "")),
    tolower(file_ext(file$datapath %||% ""))
  )
  candidates <- candidates[nzchar(candidates)]
  if (length(candidates)) candidates[[1]] else ""
}

load_dataset_file <- function(path, ext = NULL) {
  ext <- tolower(ext %||% file_ext(path))
  if (!ext %in% SUPPORTED_EXTENSIONS) {
    stop(sprintf("Unsupported file type: %s", ext))
  }
  df <- switch(
    ext,
    csv = readr::read_csv(path, show_col_types = FALSE, progress = FALSE),
    tsv = readr::read_tsv(path, show_col_types = FALSE, progress = FALSE),
    txt = readr::read_delim(path, delim = "\t", show_col_types = FALSE, progress = FALSE),
    json = {
      json_content <- jsonlite::fromJSON(path, flatten = TRUE)
      if (is.data.frame(json_content)) json_content else as.data.frame(json_content, stringsAsFactors = FALSE)
    },
    xlsx = readxl::read_excel(path),
    xls = readxl::read_excel(path),
    stop("Unsupported file type")
  )
  as.data.frame(df, stringsAsFactors = FALSE)
}

coerce_input_to_df <- function(obj) {
  if (is.data.frame(obj)) {
    return(as.data.frame(obj, stringsAsFactors = FALSE))
  }
  if (is.list(obj)) {
    return(as.data.frame(obj, stringsAsFactors = FALSE))
  }
  stop("Input must be a JSON array of objects or a data frame")
}

clean_categorical_labels <- function(df, categorical_cols) {
  if (length(categorical_cols) == 0) return(df)
  df %>%
    mutate(
      across(
        all_of(categorical_cols),
        ~ {
          value <- as.character(.x)
          value <- stringr::str_trim(value)
          value <- stringr::str_to_lower(value)
          value <- stringr::str_replace_all(value, "[^a-z0-9\\s]", "")
          value <- stringr::str_replace_all(value, "\\s+", "_")
          value[value == "" | is.na(value)] <- "unknown"
          value
        }
      )
    )
}

add_frequency_features <- function(df, categorical_cols) {
  if (length(categorical_cols) == 0) {
    return(list(data = df, created = character()))
  }
  freq_cols <- character()
  for (col in categorical_cols) {
    freq_table <- df %>%
      count(.data[[col]], name = "freq") %>%
      mutate(freq = freq / sum(freq))
    new_col <- paste0(col, "_frequency")
    df[[new_col]] <- freq_table$freq[match(df[[col]], freq_table[[col]])]
    freq_cols <- c(freq_cols, new_col)
  }
  list(data = df, created = freq_cols)
}

identify_column_types <- function(df) {
  df <- as.data.frame(df, stringsAsFactors = FALSE)
  # drop unsupported complex columns
  drop_cols <- names(Filter(function(col) is.list(col) || is.data.frame(col), df))
  if (length(drop_cols)) {
    df[drop_cols] <- NULL
  }
  # convert logical to character to preserve categorical meaning
  df <- df %>%
    mutate(
      across(
        where(is.logical),
        ~ ifelse(is.na(.x), "unknown", ifelse(.x, "true", "false"))
      )
    )
  df <- df %>%
    mutate(across(where(function(x) inherits(x, "POSIXt")), ~ as.character(.x)))
  categorical_cols <- names(Filter(function(col) is.character(col) || is.factor(col), df))
  numeric_cols <- names(Filter(function(col) is.numeric(col), df))
  list(data = df, categorical = categorical_cols, numeric = numeric_cols, dropped = drop_cols)
}

build_preprocessing_recipe <- function(df) {
  rec <- recipe(~ ., data = df)
  if (any(vapply(df, is.numeric, logical(1)))) {
    rec <- rec %>% step_impute_median(all_numeric_predictors())
  }
  if (any(vapply(df, function(x) is.character(x) || is.factor(x), logical(1)))) {
    rec <- rec %>%
      step_impute_mode(all_nominal_predictors()) %>%
      step_other(all_nominal_predictors(), threshold = RARE_CATEGORY_MIN_FRACTION, other = "rare_category") %>%
      step_dummy(all_nominal_predictors(), one_hot = TRUE)
  }
  rec %>%
    step_zv(all_predictors()) %>%
    step_center(all_numeric_predictors()) %>%
    step_scale(all_numeric_predictors())
}

# Redis connection function
get_redis_conn <- function() {
  tryCatch({
    redux::hiredis(host = REDIS_HOST, port = REDIS_PORT)
  }, error = function(e) {
    warning("Redis connection failed: ", e$message)
    return(NULL)
  })
}

# PostgreSQL connection function
get_postgres_conn <- function() {
  tryCatch({
    dbConnect(
      Postgres(),
      host = POSTGRES_HOST,
      port = POSTGRES_PORT,
      user = POSTGRES_USER,
      password = POSTGRES_PASSWORD,
      dbname = POSTGRES_DB
    )
  }, error = function(e) {
    warning("PostgreSQL connection failed: ", e$message)
    return(NULL)
  })
}

# Store processed data in Redis
store_in_redis <- function(job_id, processed_data, metadata) {
  redis_conn <- get_redis_conn()
  if (is.null(redis_conn)) return(FALSE)
  
  tryCatch({
    # Store processed data as JSON
    data_json <- jsonlite::toJSON(processed_data, na = "string")
    redis_conn$SET(paste0("processed:", job_id), data_json)
    redis_conn$SETEX(paste0("processed:", job_id, ":meta"), 86400, jsonlite::toJSON(metadata)) # 24h TTL
    redis_conn$SET(paste0("job:", job_id, ":status"), "completed")
    return(TRUE)
  }, error = function(e) {
    warning("Redis storage failed: ", e$message)
    return(FALSE)
  })
}

# Store processed data in PostgreSQL
store_in_postgres <- function(job_id, processed_data, metadata) {
  pg_conn <- get_postgres_conn()
  if (is.null(pg_conn)) return(FALSE)
  
  tryCatch({
    # Create table if it doesn't exist
    dbExecute(pg_conn, "
      CREATE TABLE IF NOT EXISTS processed_datasets (
        job_id VARCHAR(255) PRIMARY KEY,
        original_filename VARCHAR(500),
        original_rows INTEGER,
        processed_rows INTEGER,
        processed_columns INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB,
        processing_stats JSONB
      )
    ")
    
    # Create table for processed data (store as JSONB for flexibility)
    dbExecute(pg_conn, "
      CREATE TABLE IF NOT EXISTS processed_data (
        job_id VARCHAR(255),
        row_index INTEGER,
        data JSONB,
        PRIMARY KEY (job_id, row_index)
      )
    ")
    
    # Insert metadata
    metadata_json <- jsonlite::toJSON(metadata, auto_unbox = TRUE)
    stats_json <- jsonlite::toJSON(list(
      categorical_columns = length(metadata$categorical_columns %||% c()),
      encoded_columns = length(metadata$encoded_columns %||% c()),
      numeric_columns = length(metadata$numeric_columns %||% c())
    ), auto_unbox = TRUE)
    
    # Ensure all parameters are scalars
    processed_rows <- as.integer(nrow(processed_data) %||% 0L)
    processed_cols <- as.integer(ncol(processed_data) %||% 0L)
    original_rows <- as.integer(metadata$original_rows %||% 0L)
    filename <- as.character(metadata$filename %||% "")
    
    dbExecute(pg_conn, "
      INSERT INTO processed_datasets (job_id, original_filename, original_rows, processed_rows, processed_columns, metadata, processing_stats)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (job_id) DO UPDATE SET
        processed_rows = EXCLUDED.processed_rows,
        processed_at = CURRENT_TIMESTAMP,
        metadata = EXCLUDED.metadata,
        processing_stats = EXCLUDED.processing_stats
    ", params = list(
      as.character(job_id),
      filename,
      original_rows,
      processed_rows,
      processed_cols,
      metadata_json,
      stats_json
    ))
    
    # Store processed data rows
    dbExecute(pg_conn, "DELETE FROM processed_data WHERE job_id = $1", params = list(as.character(job_id)))
    
    if (nrow(processed_data) > 0) {
      for (i in 1:nrow(processed_data)) {
        row_json <- jsonlite::toJSON(as.list(processed_data[i, , drop = FALSE]), auto_unbox = TRUE)
        dbExecute(pg_conn, "
          INSERT INTO processed_data (job_id, row_index, data)
          VALUES ($1, $2, $3)
        ", params = list(
          as.character(job_id),
          as.integer(i - 1L),
          as.character(row_json)
        ))
      }
    }
    
    dbDisconnect(pg_conn)
    return(TRUE)
  }, error = function(e) {
    warning("PostgreSQL storage failed: ", e$message)
    if (!is.null(pg_conn)) dbDisconnect(pg_conn)
    return(FALSE)
  })
}

# Comprehensive data preprocessing function
preprocess_dataset <- function(df) {
  if (!is.data.frame(df)) {
    stop("Dataset must be a data frame")
  }
  original_rows <- nrow(df)
  original_cols <- colnames(df)
  if (original_rows == 0) {
    stop("Dataset is empty")
  }
  df <- janitor::remove_empty(df, which = c("rows", "cols"))
  df <- distinct(as_tibble(df))
  df <- janitor::clean_names(df)
  duplicates_removed <- original_rows - nrow(df)
  type_info <- identify_column_types(df)
  df <- type_info$data
  if (!nrow(df) || !ncol(df)) {
    stop("Dataset does not contain supported columns after cleaning")
  }
  categorical_cols <- type_info$categorical
  numeric_cols <- type_info$numeric
  if (length(categorical_cols) > 0) {
    df <- df %>%
      mutate(across(all_of(categorical_cols), ~ifelse(is.na(.x) | .x == "", "unknown", .x)))
    df <- clean_categorical_labels(df, categorical_cols)
  }
  high_cardinality_cols <- character()
  if (length(categorical_cols) > 0) {
    high_cardinality_cols <- categorical_cols[vapply(categorical_cols, function(col) {
      length(unique(df[[col]])) > HIGH_CARDINALITY_THRESHOLD
    }, logical(1))]
  }
  freq_result <- add_frequency_features(df, categorical_cols)
  df <- freq_result$data
  numeric_cols <- unique(c(numeric_cols, freq_result$created))
  numeric_stats <- list()
  if (length(numeric_cols) > 0) {
    numeric_stats <- lapply(numeric_cols, function(col) {
      list(
        mean = suppressWarnings(mean(as.numeric(df[[col]]), na.rm = TRUE)),
        sd = suppressWarnings(sd(as.numeric(df[[col]]), na.rm = TRUE))
      )
    })
    names(numeric_stats) <- numeric_cols
  }
  pre_recipe_cols <- colnames(df)
  rec <- build_preprocessing_recipe(df)
  rec_prep <- prep(rec, training = df, retain = TRUE)
  processed <- bake(rec_prep, new_data = NULL) %>% as.data.frame(stringsAsFactors = FALSE)
  if (!nrow(processed) || !ncol(processed)) {
    stop("Preprocessing produced an empty dataset")
  }
  metadata <- list(
    original_rows = original_rows,
    processed_rows = nrow(processed),
    original_columns = length(original_cols),
    processed_columns = ncol(processed),
    duplicates_removed = duplicates_removed,
    categorical_columns = categorical_cols,
    numeric_columns = numeric_cols,
    frequency_features = freq_result$created,
    encoded_columns = setdiff(colnames(processed), pre_recipe_cols),
    dropped_columns = type_info$dropped,
    high_cardinality_columns = high_cardinality_cols,
    scaling_stats = numeric_stats,
    recipe_steps = vapply(rec_prep$steps, function(step) class(step)[1], character(1)),
    preprocessing_steps = c(
      "duplicate_removal",
      "missing_value_handling",
      "category_label_cleaning",
      "frequency_encoding",
      "rare_category_handling",
      "categorical_encoding",
      "numeric_scaling"
    )
  )
  list(data = processed, metadata = metadata)
}

#* Health check endpoint
#* @get /health
#* @serializer json
function() {
  redis_status <- "disconnected"
  postgres_status <- "disconnected"
  
  redis_conn <- get_redis_conn()
  if (!is.null(redis_conn)) {
    tryCatch({
      redis_conn$PING()
      redis_status <- "connected"
    }, error = function(e) NULL)
  }
  
  pg_conn <- get_postgres_conn()
  if (!is.null(pg_conn)) {
    tryCatch({
      dbExecute(pg_conn, "SELECT 1")
      postgres_status <- "connected"
      dbDisconnect(pg_conn)
    }, error = function(e) {
      if (!is.null(pg_conn)) dbDisconnect(pg_conn)
    })
  }
  
  list(
    status = "ok",
    service = "r-engine",
    time = as.character(Sys.time()),
    redis = redis_status,
    postgres = postgres_status
  )
}

#* Upload dataset file
#* @param file:file The dataset file (CSV/XLSX/JSON)
#* @post /upload
#* @serializer json
function(req, res, file) {
  if (is.null(file)) {
    res$status <- 400
    return(list(error = "file is required"))
  }
  
  # Debug: check file structure
  filename <- file$filename %||% ""
  datapath <- file$datapath %||% ""
  
  # Try to infer extension from filename first, then datapath
  ext <- ""
  if (nchar(filename) > 0) {
    ext <- tolower(file_ext(filename))
  }
  if (nchar(ext) == 0 && nchar(datapath) > 0) {
    ext <- tolower(file_ext(datapath))
  }
  
  # If still no extension, try to detect from content (for CSV files)
  if (nchar(ext) == 0 && nchar(datapath) > 0 && file.exists(datapath)) {
    # Try reading first line to detect CSV
    first_line <- tryCatch(readLines(datapath, n = 1), error = function(e) "")
    if (grepl(",", first_line)) {
      ext <- "csv"
    }
  }
  
  if (nchar(ext) == 0 || !ext %in% SUPPORTED_EXTENSIONS) {
    res$status <- 415
    return(list(
      error = sprintf("unsupported file type; allowed: %s", paste(SUPPORTED_EXTENSIONS, collapse = ", ")),
      debug = list(
        filename = filename,
        datapath = datapath,
        inferred_ext = ext
      )
    ))
  }
  
  dir.create("data/uploads", recursive = TRUE, showWarnings = FALSE)
  id <- UUIDgenerate()
  path <- file.path("data/uploads", paste0(id, ".", ext))
  ok <- file.copy(file$datapath, path, overwrite = TRUE)
  
  if (!ok) {
    res$status <- 500
    return(list(error = "failed to save upload"))
  }
  
  .job_store[[id]] <- list(
    status = "uploaded",
    path = path,
    ext = ext,
    filename = file$filename,
    createdAt = as.character(Sys.time())
  )
  
  list(jobId = id, status = "uploaded", message = "File uploaded successfully")
}

#* Process job - accepts job object with data and returns processed JSON
#* @post /process
#* @serializer json
function(req, res) {
  # Parse request body
  body <- tryCatch({
    jsonlite::fromJSON(req$postBody)
  }, error = function(e) {
    res$status <- 400
    return(list(error = "Invalid JSON in request body"))
  })
  
  if (is.null(body$data)) {
    res$status <- 400
    return(list(error = "Job must contain 'data' field with array of objects"))
  }
  
  # Convert to dataframe if needed
  df <- tryCatch({
    coerce_input_to_df(body$data)
  }, error = function(e) {
    res$status <- 400
    return(list(error = e$message))
  })
  
  if (is.null(df) || nrow(df) == 0) {
    res$status <- 400
    return(list(error = "Dataset is empty"))
  }
  
  # Generate job ID if not provided
  job_id <- body$jobId %||% UUIDgenerate()
  
  # Perform comprehensive preprocessing
  result <- tryCatch({
    preprocess_dataset(df)
  }, error = function(e) {
    res$status <- 500
    return(list(error = paste("Preprocessing failed:", e$message)))
  })
  
  if (is.null(result)) {
    return(list(error = "Preprocessing returned NULL"))
  }
  
  processed_df <- result$data
  metadata <- result$metadata
  metadata$jobId <- job_id
  metadata$filename <- body$filename %||% "inline_data"
  metadata$source <- "api_request"
  metadata$fileType <- body$fileType %||% "inline-json"
  
  # Store in Redis and PostgreSQL
  redis_success <- store_in_redis(job_id, processed_df, metadata)
  postgres_success <- store_in_postgres(job_id, processed_df, metadata)
  
  # Convert to JSON-friendly format
  cleaned_data <- jsonlite::fromJSON(jsonlite::toJSON(processed_df, na = "string"))
  
  # Return JSON response
  list(
    jobId = job_id,
    status = "processed",
    rows = nrow(processed_df),
    originalRows = metadata$original_rows,
    columns = ncol(processed_df),
    storage = list(
      redis = ifelse(redis_success, "success", "failed"),
      postgres = ifelse(postgres_success, "success", "failed")
    ),
    metadata = metadata,
    data = cleaned_data
  )
}

#* Clean and preprocess uploaded dataset
#* @param jobId:string The job ID returned from /upload
#* @post /clean
#* @serializer json
function(req, res, jobId) {
  if (is.null(jobId) || jobId == "") {
    res$status <- 400
    return(list(error = "jobId is required"))
  }
  
  job <- .job_store[[jobId]]
  if (is.null(job)) {
    res$status <- 404
    return(list(error = "job not found"))
  }
  
  # Read dataset
  df <- tryCatch({
    load_dataset_file(job$path, job$ext)
  }, error = function(e) {
    res$status <- 400
    return(list(error = paste("Failed to parse dataset:", e$message)))
  })
  
  if (is.null(df) || nrow(df) == 0) {
    res$status <- 400
    return(list(error = "Dataset is empty or could not be read"))
  }
  
  # Perform comprehensive preprocessing
  result <- tryCatch({
    preprocess_dataset(df)
  }, error = function(e) {
    res$status <- 500
    return(list(error = paste("Preprocessing failed:", e$message)))
  })
  
  if (is.null(result)) {
    return(list(error = "Preprocessing returned NULL"))
  }
  
  processed_df <- result$data
  metadata <- result$metadata
  metadata$filename <- job$filename
  metadata$jobId <- jobId
  metadata$fileType <- job$ext %||% "unknown"
  metadata$source <- "uploaded_file"
  
  # Store in Redis and PostgreSQL
  redis_success <- store_in_redis(jobId, processed_df, metadata)
  postgres_success <- store_in_postgres(jobId, processed_df, metadata)
  
  # Update job status
  .job_store[[jobId]]$status <- "cleaned"
  .job_store[[jobId]]$rows <- nrow(processed_df)
  .job_store[[jobId]]$metadata <- metadata
  .job_store[[jobId]]$redis_stored <- redis_success
  .job_store[[jobId]]$postgres_stored <- postgres_success
  
  # Convert to JSON-friendly format
  cleaned_data <- jsonlite::fromJSON(jsonlite::toJSON(processed_df, na = "string"))
  
  list(
    jobId = jobId,
    status = "cleaned",
    rows = nrow(processed_df),
    originalRows = metadata$original_rows,
    columns = ncol(processed_df),
    storage = list(
      redis = ifelse(redis_success, "success", "failed"),
      postgres = ifelse(postgres_success, "success", "failed")
    ),
    metadata = metadata,
    data = cleaned_data
  )
}

#* Clean inline JSON data
#* @post /clean-inline
#* @serializer json
function(req, res) {
  body <- tryCatch({
    jsonlite::fromJSON(req$postBody, simplifyDataFrame = TRUE)
  }, error = function(e) {
    res$status <- 400
    return(list(error = "Invalid JSON in request body"))
  })
  
  df <- tryCatch({
    coerce_input_to_df(body)
  }, error = function(e) {
    res$status <- 400
    return(list(error = e$message))
  })
  
  if (is.null(df) || nrow(df) == 0) {
    res$status <- 400
    return(list(error = "Body must be a JSON array of objects"))
  }
  
  # Perform preprocessing
  result <- tryCatch({
    preprocess_dataset(df)
  }, error = function(e) {
    res$status <- 500
    return(list(error = paste("Preprocessing failed:", e$message)))
  })
  
  if (is.null(result)) {
    return(list(error = "Preprocessing returned NULL"))
  }
  
  metadata <- result$metadata
  metadata$source <- "clean_inline"
  metadata$fileType <- "inline-json"
  cleaned_data <- jsonlite::fromJSON(jsonlite::toJSON(result$data, na = "string"))
  
  list(
    rows = nrow(result$data),
    originalRows = result$metadata$original_rows,
    metadata = metadata,
    data = cleaned_data
  )
}

#* Get job status
#* @param jobId:string The job ID
#* @get /status
#* @serializer json
function(jobId, res) {
  if (is.null(jobId) || jobId == "") {
    res$status <- 400
    return(list(error = "jobId is required"))
  }
  
  job <- .job_store[[jobId]]
  if (is.null(job)) {
    res$status <- 404
    return(list(error = "job not found"))
  }
  
  list(
    jobId = jobId,
    status = job$status,
    filename = job$filename,
    fileType = job$ext,
    createdAt = job$createdAt,
    rows = job$rows,
    storage = list(
      redis = ifelse(job$redis_stored %||% FALSE, "stored", "not stored"),
      postgres = ifelse(job$postgres_stored %||% FALSE, "stored", "not stored")
    ),
    metadata = job$metadata %||% NULL
  )
}

#* Get processed data from Redis
#* @param jobId:string The job ID
#* @get /result/redis
#* @serializer json
function(jobId, res) {
  if (is.null(jobId) || jobId == "") {
    res$status <- 400
    return(list(error = "jobId is required"))
  }
  
  redis_conn <- get_redis_conn()
  if (is.null(redis_conn)) {
    res$status <- 503
    return(list(error = "Redis not available"))
  }
  
  data_json <- redis_conn$GET(paste0("processed:", jobId))
  if (is.null(data_json)) {
    res$status <- 404
    return(list(error = "Processed data not found in Redis"))
  }
  
  data <- jsonlite::fromJSON(data_json)
  list(jobId = jobId, data = data)
}

#* Get processed data from PostgreSQL
#* @param jobId:string The job ID
#* @get /result/postgres
#* @serializer json
function(jobId, res) {
  if (is.null(jobId) || jobId == "") {
    res$status <- 400
    return(list(error = "jobId is required"))
  }
  
  pg_conn <- get_postgres_conn()
  if (is.null(pg_conn)) {
    res$status <- 503
    return(list(error = "PostgreSQL not available"))
  }
  
  tryCatch({
    result <- dbGetQuery(pg_conn, "
      SELECT data FROM processed_data 
      WHERE job_id = $1 
      ORDER BY row_index
    ", params = list(as.character(jobId)))
    
    if (nrow(result) == 0) {
      res$status <- 404
      return(list(error = "Processed data not found in PostgreSQL"))
    }
    
    # Combine all rows
    all_data <- lapply(result$data, function(x) jsonlite::fromJSON(x))
    df <- bind_rows(all_data)
    
    dbDisconnect(pg_conn)
    list(jobId = jobId, data = df)
  }, error = function(e) {
    if (!is.null(pg_conn)) dbDisconnect(pg_conn)
    res$status <- 500
    return(list(error = paste("Failed to retrieve data:", e$message)))
  })
}

#* Download cleaned result as CSV
#* @param jobId:string The job ID
#* @param source:string Data source: "redis", "postgres", or "memory" (default)
#* @get /result
#* @serializer csv
function(jobId, source = "memory", res) {
  if (is.null(jobId) || jobId == "") {
    res$status <- 400
    return(list(error = "jobId is required"))
  }
  
  job <- .job_store[[jobId]]
  if (is.null(job) || job$status != "cleaned") {
    res$status <- 409
    return(list(error = "Job not cleaned yet. Please call /clean first"))
  }
  
  # Retrieve data based on source
  if (source == "redis") {
    redis_conn <- get_redis_conn()
    if (is.null(redis_conn)) {
      res$status <- 503
      return(list(error = "Redis not available"))
    }
    data_json <- redis_conn$GET(paste0("processed:", jobId))
    if (is.null(data_json)) {
      res$status <- 404
      return(list(error = "Data not found in Redis"))
    }
    df <- jsonlite::fromJSON(data_json)
  } else if (source == "postgres") {
    pg_conn <- get_postgres_conn()
    if (is.null(pg_conn)) {
      res$status <- 503
      return(list(error = "PostgreSQL not available"))
    }
    result <- dbGetQuery(pg_conn, "
      SELECT data FROM processed_data 
      WHERE job_id = $1 
      ORDER BY row_index
    ", params = list(as.character(jobId)))
    if (nrow(result) == 0) {
      res$status <- 404
      return(list(error = "Data not found in PostgreSQL"))
    }
    all_data <- lapply(result$data, function(x) jsonlite::fromJSON(x))
    df <- bind_rows(all_data)
    dbDisconnect(pg_conn)
  } else {
    # Read from original file and reprocess (or cache in memory)
    df <- readr::read_csv(job$path, show_col_types = FALSE)
    result <- preprocess_dataset(df)
    df <- result$data
  }
  
  res$setHeader("Content-Type", "text/csv")
  res$setHeader("Content-Disposition", paste0('attachment; filename="cleaned_', jobId, '.csv"'))
  
  return(df)
}
