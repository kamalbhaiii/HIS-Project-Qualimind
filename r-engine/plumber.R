#* @apiTitle R Categorical Data Preprocessing API
#* @apiDescription Comprehensive categorical data preprocessing pipeline with Redis and PostgreSQL storage

library(plumber)
library(jsonlite)
library(readr)
library(dplyr)
library(uuid)
library(tools)
library(RPostgres)
library(redux)
library(stringr)
library(forcats)
library(tidyr)
library(DBI)    

# Configuration - will be set via environment variables or defaults
REDIS_HOST <- Sys.getenv("REDIS_HOST", "redis")
REDIS_PORT <- as.integer(Sys.getenv("REDIS_PORT", "6379"))
POSTGRES_HOST <- Sys.getenv("POSTGRES_HOST", "postgres")
POSTGRES_PORT <- as.integer(Sys.getenv("POSTGRES_PORT", "5432"))
POSTGRES_USER <- Sys.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD <- Sys.getenv("POSTGRES_PASSWORD", "postgres")
POSTGRES_DB <- Sys.getenv("POSTGRES_DB", "qualimind-testing")

# Simple in-memory job store
.job_store <- new.env(parent = emptyenv())

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
    
    dbExecute(pg_conn, "
      INSERT INTO processed_datasets (job_id, original_filename, original_rows, processed_rows, processed_columns, metadata, processing_stats)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (job_id) DO UPDATE SET
        processed_rows = EXCLUDED.processed_rows,
        processed_at = CURRENT_TIMESTAMP,
        metadata = EXCLUDED.metadata,
        processing_stats = EXCLUDED.processing_stats
    ", params = list(
      job_id,
      metadata$filename %||% "",
      metadata$original_rows %||% 0,
      nrow(processed_data),
      ncol(processed_data),
      metadata_json,
      stats_json
    ))
    
    # Store processed data rows
    dbExecute(pg_conn, "DELETE FROM processed_data WHERE job_id = $1", params = list(job_id))
    
    for (i in 1:nrow(processed_data)) {
      row_json <- jsonlite::toJSON(as.list(processed_data[i, ]), auto_unbox = TRUE)
      dbExecute(pg_conn, "
        INSERT INTO processed_data (job_id, row_index, data)
        VALUES ($1, $2, $3)
      ", params = list(job_id, i - 1, row_json))
    }
    
    dbDisconnect(pg_conn)
    return(TRUE)
  }, error = function(e) {
    warning("PostgreSQL storage failed: ", e$message)
    if (!is.null(pg_conn)) dbDisconnect(pg_conn)
    return(FALSE)
  })
}

# Comprehensive categorical preprocessing function
preprocess_categorical_data <- function(df) {
  original_rows <- nrow(df)
  original_cols <- colnames(df)
  
  # Step 1: Remove duplicates
  df <- df %>% distinct()
  duplicates_removed <- original_rows - nrow(df)
  
  # Step 2: Identify column types
  categorical_cols <- character()
  numeric_cols <- character()
  
  for (col in colnames(df)) {
    if (is.character(df[[col]]) || is.factor(df[[col]])) {
      categorical_cols <- c(categorical_cols, col)
    } else if (is.numeric(df[[col]])) {
      numeric_cols <- c(numeric_cols, col)
    }
  }
  
  # Step 3: Handle missing categorical values
  for (col in categorical_cols) {
    # Replace NA with "Unknown" or most frequent category
    if (any(is.na(df[[col]]))) {
      most_frequent <- names(sort(table(df[[col]], useNA = "no"), decreasing = TRUE))[1]
      replacement <- ifelse(is.null(most_frequent) || is.na(most_frequent), "Unknown", most_frequent)
      df[[col]] <- ifelse(is.na(df[[col]]), replacement, df[[col]])
    }
  }
  
  # Step 4: Clean and standardize category labels
  for (col in categorical_cols) {
    df[[col]] <- df[[col]] %>%
      as.character() %>%
      str_trim() %>%                    # Remove leading/trailing whitespace
      str_to_lower() %>%                # Convert to lowercase
      str_replace_all("[^a-z0-9\\s]", "") %>%  # Remove special characters
      str_replace_all("\\s+", "_")      # Replace spaces with underscores
  }
  
  # Step 5: Reduce high cardinality of categories
  cardinality_threshold <- 50  # Categories with more than 50 unique values
  high_cardinality_cols <- character()
  
  for (col in categorical_cols) {
    unique_count <- length(unique(df[[col]]))
    if (unique_count > cardinality_threshold) {
      high_cardinality_cols <- c(high_cardinality_cols, col)
      
      # Group rare categories into "Other"
      category_counts <- table(df[[col]])
      rare_categories <- names(category_counts[category_counts < max(category_counts) * 0.01])
      df[[col]] <- ifelse(df[[col]] %in% rare_categories, "other", df[[col]])
    }
  }
  
  # Step 6: Handle rare categories and categorical outliers
  for (col in categorical_cols) {
    category_counts <- table(df[[col]])
    rare_threshold <- nrow(df) * 0.01  # Less than 1% of data
    
    rare_categories <- names(category_counts[category_counts < rare_threshold])
    if (length(rare_categories) > 0) {
      df[[col]] <- ifelse(df[[col]] %in% rare_categories, "rare_category", df[[col]])
    }
  }
  
  # Step 7: Encode categorical variables
  encoded_cols <- character()
  encoding_stats <- list()
  
  for (col in categorical_cols) {
    unique_count <- length(unique(df[[col]]))
    
    # Use one-hot encoding for low cardinality (< 10), label encoding for high cardinality
    if (unique_count <= 10) {
      # One-hot encoding
      df_encoded <- df %>%
        mutate(value = 1) %>%
        pivot_wider(names_from = !!sym(col), values_from = value, values_fill = 0, names_prefix = paste0(col, "_"))
      
      # Remove original column and add encoded columns
      df <- df %>% select(-!!sym(col))
      new_cols <- setdiff(colnames(df_encoded), colnames(df))
      df <- bind_cols(df, df_encoded %>% select(all_of(new_cols)))
      encoded_cols <- c(encoded_cols, new_cols)
      encoding_stats[[col]] <- list(method = "one_hot", columns = new_cols)
    } else {
      # Label encoding (numeric mapping)
      unique_vals <- unique(df[[col]])
      label_map <- setNames(1:length(unique_vals), unique_vals)
      encoded_col_name <- paste0(col, "_encoded")
      df[[encoded_col_name]] <- as.numeric(label_map[df[[col]]])
      df <- df %>% select(-!!sym(col))
      encoded_cols <- c(encoded_cols, encoded_col_name)
      encoding_stats[[col]] <- list(method = "label", column = encoded_col_name)
    }
  }
  
  # Step 8: Feature engineering for categorical data
  # Create interaction features for important categorical pairs (if any remain)
  # This is a placeholder - can be expanded based on domain knowledge
  
  # Step 9: Handle missing numeric values (fill with median)
  for (col in numeric_cols) {
    if (any(is.na(df[[col]]))) {
      median_val <- median(df[[col]], na.rm = TRUE)
      df[[col]] <- ifelse(is.na(df[[col]]), median_val, df[[col]])
    }
  }
  
  # Step 10: Scaling/normalizing numeric features after encoding
  numeric_cols_final <- colnames(df)[sapply(df, is.numeric)]
  scaling_stats <- list()
  
  for (col in numeric_cols_final) {
    # Standardization (z-score normalization)
    mean_val <- mean(df[[col]], na.rm = TRUE)
    sd_val <- sd(df[[col]], na.rm = TRUE)
    
    if (sd_val > 0) {
      df[[col]] <- (df[[col]] - mean_val) / sd_val
      scaling_stats[[col]] <- list(mean = mean_val, sd = sd_val, method = "standardization")
    }
  }
  
  # Prepare metadata
  metadata <- list(
    original_rows = original_rows,
    processed_rows = nrow(df),
    original_columns = length(original_cols),
    processed_columns = ncol(df),
    duplicates_removed = duplicates_removed,
    categorical_columns = categorical_cols,
    numeric_columns = numeric_cols,
    encoded_columns = encoded_cols,
    high_cardinality_columns = high_cardinality_cols,
    encoding_stats = encoding_stats,
    scaling_stats = scaling_stats,
    preprocessing_steps = c(
      "duplicate_removal",
      "missing_value_handling",
      "category_label_cleaning",
      "high_cardinality_reduction",
      "rare_category_handling",
      "categorical_encoding",
      "numeric_scaling"
    )
  )
  
  return(list(data = df, metadata = metadata))
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
#* @param file:file The dataset file (CSV)
#* @post /upload
#* @serializer json
function(req, res, file) {
  if (is.null(file)) {
    res$status <- 400
    return(list(error = "file is required"))
  }
  
  ext <- tolower(file_ext(file$filename %||% ""))
  if (!ext %in% c("csv")) {
    res$status <- 415
    return(list(error = "unsupported file type; only CSV supported"))
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
  
  # Validate job structure
  if (is.null(body$data) || (!is.data.frame(body$data) && !is.list(body$data))) {
    # Try to convert data to dataframe if it's a list/array
    if (is.list(body$data) && length(body$data) > 0) {
      body$data <- tryCatch({
        jsonlite::fromJSON(jsonlite::toJSON(body$data), simplifyDataFrame = TRUE)
      }, error = function(e) {
        res$status <- 400
        return(list(error = "Data must be a JSON array of objects"))
      })
    } else {
      res$status <- 400
      return(list(error = "Job must contain 'data' field with array of objects"))
    }
  }
  
  # Convert to dataframe if needed
  df <- if (is.data.frame(body$data)) {
    body$data
  } else {
    tryCatch({
      jsonlite::fromJSON(jsonlite::toJSON(body$data), simplifyDataFrame = TRUE)
    }, error = function(e) {
      res$status <- 400
      return(list(error = "Failed to convert data to dataframe"))
    })
  }
  
  if (is.null(df) || nrow(df) == 0) {
    res$status <- 400
    return(list(error = "Dataset is empty"))
  }
  
  # Generate job ID if not provided
  job_id <- body$jobId %||% UUIDgenerate()
  
  # Perform comprehensive preprocessing
  result <- tryCatch({
    preprocess_categorical_data(df)
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
    readr::read_csv(job$path, show_col_types = FALSE)
  }, error = function(e) {
    res$status <- 400
    return(list(error = paste("Failed to parse CSV:", e$message)))
  })
  
  if (is.null(df) || nrow(df) == 0) {
    res$status <- 400
    return(list(error = "Dataset is empty or could not be read"))
  }
  
  # Perform comprehensive preprocessing
  result <- tryCatch({
    preprocess_categorical_data(df)
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
  
  if (is.null(body) || !is.data.frame(body)) {
    res$status <- 400
    return(list(error = "Body must be a JSON array of objects"))
  }
  
  # Perform preprocessing
  result <- tryCatch({
    preprocess_categorical_data(body)
  }, error = function(e) {
    res$status <- 500
    return(list(error = paste("Preprocessing failed:", e$message)))
  })
  
  if (is.null(result)) {
    return(list(error = "Preprocessing returned NULL"))
  }
  
  cleaned_data <- jsonlite::fromJSON(jsonlite::toJSON(result$data, na = "string"))
  
  list(
    rows = nrow(result$data),
    originalRows = result$metadata$original_rows,
    metadata = result$metadata,
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
    ", params = list(jobId))
    
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
    ", params = list(jobId))
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
    result <- preprocess_categorical_data(df)
    df <- result$data
  }
  
  res$setHeader("Content-Type", "text/csv")
  res$setHeader("Content-Disposition", paste0('attachment; filename="cleaned_', jobId, '.csv"'))
  
  return(df)
}
