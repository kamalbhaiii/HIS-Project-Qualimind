#* @apiTitle R Categorical Data Preprocessing API
#* @apiDescription Comprehensive categorical and numerical preprocessing pipeline with Redis and PostgreSQL storage

library(plumber)
library(jsonlite)
library(readr)
library(dplyr)
library(uuid)
library(RPostgres)
library(redux)
library(stringr)
library(tidyr)
library(DBI)

`%||%` <- function(a, b) if (is.null(a)) b else a

REDIS_HOST <- Sys.getenv("REDIS_HOST", "redis")
REDIS_PORT <- as.integer(Sys.getenv("REDIS_PORT", "6379"))
POSTGRES_HOST <- Sys.getenv("POSTGRES_HOST", "postgres")
POSTGRES_PORT <- as.integer(Sys.getenv("POSTGRES_PORT", "5432"))
POSTGRES_USER <- Sys.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD <- Sys.getenv("POSTGRES_PASSWORD", "postgres")
POSTGRES_DB <- Sys.getenv("POSTGRES_DB", "qualimind-testing")

print(paste("Connecting to Redis at", REDIS_HOST, ":", REDIS_PORT))
print(paste("Connecting to PostgreSQL at", POSTGRES_HOST, ":", POSTGRES_PORT, "DB:", POSTGRES_DB))

get_redis_conn <- function() {
  tryCatch({
    conn <- redux::hiredis(host = REDIS_HOST, port = REDIS_PORT)
    print("Redis connection established")
    conn
  }, error = function(e) {
    warning("Redis connection failed: ", e$message)
    NULL
  })
}

get_postgres_conn <- function() {
  tryCatch({
    conn <- dbConnect(
      Postgres(),
      host = POSTGRES_HOST,
      port = POSTGRES_PORT,
      user = POSTGRES_USER,
      password = POSTGRES_PASSWORD,
      dbname = POSTGRES_DB
    )
    print("PostgreSQL connection established")
    conn
  }, error = function(e) {
    warning("PostgreSQL connection failed: ", e$message)
    NULL
  })
}

store_in_redis <- function(job_id, processed_data, metadata) {
  redis_conn <- get_redis_conn()
  if (is.null(redis_conn)) return(FALSE)
  tryCatch({
    data_json <- jsonlite::toJSON(processed_data, na = "string")
    redis_conn$SET(paste0("processed:", job_id), data_json)
    redis_conn$SETEX(paste0("processed:", job_id, ":meta"), 86400, jsonlite::toJSON(metadata, auto_unbox = TRUE))
    redis_conn$SET(paste0("job:", job_id, ":status"), "completed")
    TRUE
  }, error = function(e) {
    warning("Redis storage failed: ", e$message)
    FALSE
  })
}

store_in_postgres <- function(job_id, processed_data, metadata) {
  pg_conn <- get_postgres_conn()
  if (is.null(pg_conn)) return(FALSE)
  on.exit({
    if (!is.null(pg_conn)) dbDisconnect(pg_conn)
  }, add = TRUE)

  tryCatch({
    # ONLY summary / metadata is stored now
    dbExecute(pg_conn, "
      CREATE TABLE IF NOT EXISTS dataset_processing_summary (
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

    metadata_json <- jsonlite::toJSON(metadata, auto_unbox = TRUE)
    stats_json <- jsonlite::toJSON(list(
      categorical_columns = length(metadata$categorical_columns %||% c()),
      encoded_columns     = length(metadata$encoded_columns %||% c()),
      numeric_columns     = length(metadata$numeric_columns %||% c())
    ), auto_unbox = TRUE)

    dbExecute(pg_conn, "
      INSERT INTO dataset_processing_summary (
        job_id,
        original_filename,
        original_rows,
        processed_rows,
        processed_columns,
        metadata,
        processing_stats
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (job_id) DO UPDATE SET
        processed_rows   = EXCLUDED.processed_rows,
        processed_at     = CURRENT_TIMESTAMP,
        metadata         = EXCLUDED.metadata,
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

    TRUE
  }, error = function(e) {
    warning("PostgreSQL storage failed: ", e$message)
    FALSE
  })
}

preprocess_categorical_data <- function(df) {
  original_rows <- nrow(df)
  original_cols <- colnames(df)
  df <- dplyr::distinct(df)
  duplicates_removed <- original_rows - nrow(df)

  missing_tokens <- c("NULL", "null", "Na", "NA", "N/A", "n/a", "", "?", "NaN", "nan")

  for (col in colnames(df)) {
    if (is.character(df[[col]]) || is.factor(df[[col]])) {
      v <- as.character(df[[col]])
      v <- stringr::str_trim(v)
      v[v %in% missing_tokens] <- NA
      df[[col]] <- v
    }
  }

  for (col in colnames(df)) {
    if (is.character(df[[col]])) {
      v <- df[[col]]
      non_na <- v[!is.na(v)]
      if (length(non_na) > 0) {
        numeric_like <- grepl("^-?[0-9]+(\\.[0-9]+)?$", non_na)
        if (mean(numeric_like) > 0.9) {
          suppressWarnings({
            num_v <- as.numeric(non_na)
          })
          if (!all(is.na(num_v))) {
            suppressWarnings({
              vv <- as.numeric(v)
            })
            df[[col]] <- vv
          }
        }
      }
    }
  }

  categorical_cols <- colnames(df)[sapply(df, function(x) is.character(x) || is.factor(x))]
  numeric_cols <- colnames(df)[sapply(df, is.numeric)]

  for (col in categorical_cols) {
    v <- df[[col]]
    if (all(is.na(v))) {
      df[[col]] <- "unknown"
    } else if (any(is.na(v))) {
      tbl <- table(v, useNA = "no")
      mode_val <- names(tbl)[which.max(tbl)]
      v[is.na(v)] <- mode_val
      df[[col]] <- v
    }
  }

  for (col in categorical_cols) {
    v <- as.character(df[[col]])
    v <- stringr::str_trim(v)
    v <- stringr::str_to_lower(v)
    v <- stringr::str_replace_all(v, "[^a-z0-9\\s]", " ")
    v <- stringr::str_replace_all(v, "\\s+", "_")
    df[[col]] <- v
  }

  high_cardinality_threshold <- 50
  rare_prop_threshold <- 0.01
  high_cardinality_cols <- character()
  rare_category_info <- list()

  for (col in categorical_cols) {
    v <- df[[col]]
    freq <- table(v)
    prop <- as.numeric(freq) / sum(freq)
    names(prop) <- names(freq)
    unique_count <- length(freq)
    if (unique_count > high_cardinality_threshold) {
      high_cardinality_cols <- c(high_cardinality_cols, col)
    }
    rare_levels <- names(prop)[prop < rare_prop_threshold]
    if (length(rare_levels) > 0) {
      df[[col]][df[[col]] %in% rare_levels] <- "other"
      rare_category_info[[col]] <- list(
        rare_levels = rare_levels,
        threshold = rare_prop_threshold
      )
    } else {
      rare_category_info[[col]] <- list(
        rare_levels = character(),
        threshold = rare_prop_threshold
      )
    }
  }

  interaction_features <- list()
  cat_unique_counts <- sapply(categorical_cols, function(col) length(unique(df[[col]])))
  interaction_candidates <- categorical_cols[cat_unique_counts <= 20]
  if (length(interaction_candidates) >= 2) {
    interaction_candidates <- interaction_candidates[order(cat_unique_counts[interaction_candidates])]
    interaction_candidates <- head(interaction_candidates, 3)
    pairs <- combn(interaction_candidates, 2, simplify = FALSE)
    for (p in pairs) {
      c1 <- p[1]
      c2 <- p[2]
      combo <- paste(df[[c1]], df[[c2]], sep = "__")
      freq <- table(combo)
      freq_norm <- as.numeric(freq) / sum(freq)
      names(freq_norm) <- names(freq)
      feature_name <- paste0(c1, "__x__", c2, "_freq")
      df[[feature_name]] <- as.numeric(freq_norm[combo])
      interaction_features[[paste(c1, c2, sep = ":")]] <- list(
        cols = c(c1, c2),
        feature = feature_name,
        method = "frequency_encoding"
      )
    }
  }

  encoding_stats <- list()
  encoded_columns <- character()
  freq_encoded_columns <- character()

  for (col in categorical_cols) {
    v <- df[[col]]
    freq <- table(v)
    freq_norm <- as.numeric(freq) / sum(freq)
    names(freq_norm) <- names(freq)
    freq_col <- paste0(col, "_freq")
    df[[freq_col]] <- as.numeric(freq_norm[v])
    freq_encoded_columns <- c(freq_encoded_columns, freq_col)

    levels_col <- sort(unique(v))
    unique_count <- length(levels_col)

    if (unique_count <= 10) {
      new_cols <- character()
      for (lvl in levels_col) {
        new_name <- paste0(col, "_", lvl)
        df[[new_name]] <- as.integer(v == lvl)
        new_cols <- c(new_cols, new_name)
      }
      encoding_stats[[col]] <- list(
        method = "one_hot",
        one_hot_columns = new_cols,
        frequency_column = freq_col,
        levels = levels_col
      )
      encoded_columns <- c(encoded_columns, new_cols, freq_col)
    } else {
      mapping <- seq_along(levels_col)
      names(mapping) <- levels_col
      label_col <- paste0(col, "_label")
      df[[label_col]] <- as.integer(mapping[v])
      encoding_stats[[col]] <- list(
        method = "label",
        label_column = label_col,
        mapping = mapping,
        frequency_column = freq_col,
        levels = levels_col
      )
      encoded_columns <- c(encoded_columns, label_col, freq_col)
    }
  }

  df <- df[, setdiff(colnames(df), categorical_cols), drop = FALSE]

  for (col in numeric_cols) {
    if (col %in% colnames(df)) {
      v <- df[[col]]
      if (any(is.na(v))) {
        med <- stats::median(v, na.rm = TRUE)
        v[is.na(v)] <- med
        df[[col]] <- v
      }
    }
  }

  scaling_stats <- list()
  for (col in numeric_cols) {
    if (col %in% colnames(df)) {
      v <- df[[col]]
      mean_val <- mean(v, na.rm = TRUE)
      sd_val <- stats::sd(v, na.rm = TRUE)
      if (!is.na(sd_val) && sd_val > 0) {
        df[[col]] <- (v - mean_val) / sd_val
        scaling_stats[[col]] <- list(
          mean = mean_val,
          sd = sd_val,
          method = "standardization"
        )
      }
    }
  }

  numeric_cols_final <- colnames(df)[sapply(df, is.numeric)]

  metadata <- list(
    original_rows             = jsonlite::unbox(original_rows),
    processed_rows            = jsonlite::unbox(nrow(df)),
    original_columns          = jsonlite::unbox(length(original_cols)),
    processed_columns         = jsonlite::unbox(ncol(df)),
    duplicates_removed        = jsonlite::unbox(duplicates_removed),
    categorical_columns       = categorical_cols,
    numeric_columns           = numeric_cols,
    numeric_columns_final     = numeric_cols_final,
    encoded_columns           = encoded_columns,
    frequency_encoded_columns = freq_encoded_columns,
    high_cardinality_columns  = high_cardinality_cols,
    rare_category_info        = rare_category_info,
    encoding_stats            = encoding_stats,
    scaling_stats             = scaling_stats,
    interaction_features      = interaction_features,
    parameters = list(
      high_cardinality_threshold = jsonlite::unbox(high_cardinality_threshold),
      rare_prop_threshold        = jsonlite::unbox(rare_prop_threshold),
      one_hot_max_levels         = jsonlite::unbox(10),
      interaction_max_levels     = jsonlite::unbox(20),
      interaction_max_columns    = jsonlite::unbox(3)
    ),
    preprocessing_steps = c(
      "duplicate_removal",
      "missing_token_normalization",
      "numeric_type_inference",
      "missing_categorical_imputation",
      "category_label_cleaning",
      "high_cardinality_reduction",
      "rare_category_handling",
      "categorical_frequency_encoding",
      "categorical_interaction_features",
      "categorical_encoding",
      "numeric_missing_imputation",
      "numeric_scaling"
    )
  )

  list(data = df, metadata = metadata)
}

get_processing_job_with_dataset <- function(job_id) {
  pg_conn <- get_postgres_conn()
  if (is.null(pg_conn)) return(NULL)
  on.exit({
    if (!is.null(pg_conn)) dbDisconnect(pg_conn)
  }, add = TRUE)

  job_df <- tryCatch({
    dbGetQuery(pg_conn, '
      SELECT 
        pj.id               AS "jobId",
        pj.status           AS "status",
        pj."errorMessage"   AS "errorMessage",
        pj."resultKey"      AS "resultKey",
        pj."datasetId"      AS "datasetId",
        d."storagePath"     AS "storagePath",
        d."originalName"    AS "originalName",
        d."mimeType"        AS "mimeType",
        d."sizeBytes"       AS "sizeBytes"
      FROM "ProcessingJob" pj
      JOIN "Dataset" d ON d.id = pj."datasetId"
      WHERE pj.id = $1
    ', params = list(job_id))
  }, error = function(e) {
    warning("Failed to fetch ProcessingJob from PostgreSQL: ", e$message)
    NULL
  })

  if (is.null(job_df) || nrow(job_df) == 0) return(NULL)
  job_df[1, , drop = FALSE]
}

update_processing_job_status <- function(job_id,
                                         status,
                                         error_message = NULL,
                                         result_key = NULL,
                                         mark_started = FALSE,
                                         mark_completed = FALSE) {
  pg_conn <- get_postgres_conn()
  if (is.null(pg_conn)) return(FALSE)
  on.exit({
    if (!is.null(pg_conn)) dbDisconnect(pg_conn)
  }, add = TRUE)

  set_clauses <- c("status = $2")
  params <- list(job_id, status)
  idx <- 3

  if (!is.null(error_message)) {
    set_clauses <- c(set_clauses, sprintf('"errorMessage" = $%d', idx))
    params[[idx]] <- error_message
    idx <- idx + 1
  }

  if (!is.null(result_key)) {
    set_clauses <- c(set_clauses, sprintf('"resultKey" = $%d', idx))
    params[[idx]] <- result_key
    idx <- idx + 1
  }

  if (mark_started) {
    set_clauses <- c(set_clauses, '"startedAt" = COALESCE("startedAt", NOW())')
  }
  if (mark_completed) {
    set_clauses <- c(set_clauses, '"completedAt" = NOW()')
  }

  sql <- sprintf('UPDATE "ProcessingJob" SET %s WHERE id = $1', paste(set_clauses, collapse = ", "))

  ok <- tryCatch({
    dbExecute(pg_conn, sql, params = params)
    TRUE
  }, error = function(e) {
    warning("Failed to update ProcessingJob status: ", e$message)
    FALSE
  })

  ok
}

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
    }, error = function(e) {})
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
    status   = "ok",
    service  = "r-engine",
    time     = as.character(Sys.time()),
    redis    = redis_status,
    postgres = postgres_status
  )
}

#* @post /process
#* @serializer json
function(req, res) {
  body <- tryCatch({
    jsonlite::fromJSON(req$postBody)
  }, error = function(e) {
    NULL
  })

  if (is.null(body)) {
    res$status <- 400
    return(list(error = "Invalid JSON in request body"))
  }

  if (is.null(body$data) || (!is.data.frame(body$data) && !is.list(body$data))) {
    if (is.list(body$data) && length(body$data) > 0) {
      body$data <- tryCatch({
        jsonlite::fromJSON(jsonlite::toJSON(body$data), simplifyDataFrame = TRUE)
      }, error = function(e) {
        NULL
      })
    }
  }

  df <- if (is.data.frame(body$data)) {
    body$data
  } else if (is.null(body$data)) {
    NULL
  } else {
    tryCatch({
      jsonlite::fromJSON(jsonlite::toJSON(body$data), simplifyDataFrame = TRUE)
    }, error = function(e) {
      NULL
    })
  }

  if (is.null(df) || !is.data.frame(df) || nrow(df) == 0) {
    res$status <- 400
    return(list(error = "Job must contain non-empty 'data' field as array of objects"))
  }

  job_id <- body$jobId %||% UUIDgenerate()

  err_msg <- NULL
  result <- tryCatch({
    preprocess_categorical_data(df)
  }, error = function(e) {
    err_msg <<- e$message
    NULL
  })

  if (is.null(result)) {
    res$status <- 500
    return(list(error = paste("Preprocessing failed:", err_msg %||% "")))
  }

  processed_df <- result$data
  metadata <- result$metadata
  metadata$jobId   <- jsonlite::unbox(job_id)
  metadata$filename <- jsonlite::unbox(body$filename %||% "inline_data")
  metadata$source  <- jsonlite::unbox("api_request")

  redis_success    <- store_in_redis(job_id, processed_df, metadata)
  postgres_success <- store_in_postgres(job_id, processed_df, metadata)

  cleaned_data <- jsonlite::fromJSON(jsonlite::toJSON(processed_df, na = "string"))

  list(
    jobId        = job_id,
    status       = "processed",
    rows         = nrow(processed_df),
    originalRows = metadata$original_rows,
    columns      = ncol(processed_df),
    storage      = list(
      redis    = ifelse(redis_success, "success", "failed"),
      postgres = ifelse(postgres_success, "success", "failed")
    ),
    metadata     = metadata,
    data         = cleaned_data
  )
}

#* @param jobId:string The ProcessingJob ID
#* @post /clean
#* @serializer json
function(req, res, jobId) {
  if (is.null(jobId) || jobId == "") {
    res$status <- 400
    return(list(error = "jobId is required"))
  }

  job <- get_processing_job_with_dataset(jobId)
  if (is.null(job)) {
    res$status <- 404
    return(list(error = "job not found in PostgreSQL"))
  }

  file_path <- job$storagePath[1]
  filename  <- job$originalName[1]

  update_processing_job_status(jobId, status = "RUNNING", mark_started = TRUE)

  df <- NULL

  if (!is.na(file_path) && file_path != "") {
    df <- tryCatch({
      readr::read_csv(file_path, show_col_types = FALSE)
    }, error = function(e) {
      NULL
    })
  }

  if (is.null(df) || nrow(df) == 0) {
    body <- tryCatch({
      if (nzchar(req$postBody)) jsonlite::fromJSON(req$postBody) else NULL
    }, error = function(e) {
      NULL
    })

    if (!is.null(body) && !is.null(body$data)) {
      df <- if (is.data.frame(body$data)) {
        body$data
      } else if (is.list(body$data) && length(body$data) > 0) {
        tryCatch({
          jsonlite::fromJSON(jsonlite::toJSON(body$data), simplifyDataFrame = TRUE)
        }, error = function(e) {
          NULL
        })
      } else {
        NULL
      }

      if (!is.null(body$filename)) {
        filename <- body$filename
      }
    }
  }

  if (is.null(df) || !is.data.frame(df) || nrow(df) == 0) {
    update_processing_job_status(
      jobId,
      status         = "FAILED",
      error_message  = "Dataset is empty or could not be read from file or body",
      mark_completed = TRUE
    )
    res$status <- 400
    return(list(error = "Dataset is empty or could not be read from file or body"))
  }

  err_msg <- NULL
  result <- tryCatch({
    preprocess_categorical_data(df)
  }, error = function(e) {
    err_msg <<- e$message
    NULL
  })

  if (is.null(result)) {
    update_processing_job_status(
      jobId,
      status         = "FAILED",
      error_message  = paste("Preprocessing failed:", err_msg %||% ""),
      mark_completed = TRUE
    )
    res$status <- 500
    return(list(error = paste("Preprocessing failed:", err_msg %||% "")))
  }

  processed_df <- result$data
  metadata <- result$metadata
  metadata$filename  <- jsonlite::unbox(filename)
  metadata$jobId     <- jsonlite::unbox(jobId)
  metadata$datasetId <- jsonlite::unbox(job$datasetId[1])

  result_key <- paste0("processed:", jobId)

  redis_success    <- store_in_redis(jobId, processed_df, metadata)
  postgres_success <- store_in_postgres(jobId, processed_df, metadata)

  store_error_message <- NULL
  if (!postgres_success) {
    if (!redis_success) {
      store_error_message <- "Processed successfully but failed to store results in both PostgreSQL and Redis"
    } else {
      store_error_message <- "Processed successfully but failed to store results in PostgreSQL; results stored only in Redis"
    }
  } else if (!redis_success) {
    store_error_message <- "Processed successfully and stored in PostgreSQL, but failed to store results in Redis"
  }

  final_status <- if (postgres_success == TRUE) "SUCCESS" else "FAILED"

  update_processing_job_status(
    jobId,
    status         = final_status,
    result_key     = if (redis_success) result_key else NULL,
    error_message  = store_error_message,
    mark_completed = TRUE
  )

  cleaned_data <- jsonlite::fromJSON(jsonlite::toJSON(processed_df, na = "string"))

  list(
    jobId        = jobId,
    status       = if (postgres_success) "cleaned" else "failed",
    rows         = nrow(processed_df),
    originalRows = metadata$original_rows,
    columns      = ncol(processed_df),
    storage      = list(
      redis    = ifelse(redis_success, "success", "failed"),
      postgres = ifelse(postgres_success, "success", "failed")
    ),
    metadata     = metadata,
    data         = cleaned_data
  )
}

#* @post /clean-inline
#* @serializer json
function(req, res) {
  body <- tryCatch({
    jsonlite::fromJSON(req$postBody, simplifyDataFrame = TRUE)
  }, error = function(e) {
    NULL
  })

  if (is.null(body) || !is.data.frame(body)) {
    res$status <- 400
    return(list(error = "Body must be a JSON array of objects"))
  }

  err_msg <- NULL
  result <- tryCatch({
    preprocess_categorical_data(body)
  }, error = function(e) {
    err_msg <<- e$message
    NULL
  })

  if (is.null(result)) {
    res$status <- 500
    return(list(error = paste("Preprocessing failed:", err_msg %||% "")))
  }

  cleaned_data <- jsonlite::fromJSON(jsonlite::toJSON(result$data, na = "string"))

  list(
    rows         = nrow(result$data),
    originalRows = result$metadata$original_rows,
    metadata     = result$metadata,
    data         = cleaned_data
  )
}

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

#* @param jobId:string The job ID
#* @get /result/postgres
#* @serializer json
function(jobId, res) {
  if (is.null(jobId) || jobId == "") {
    res$status <- 400
    return(list(error = "jobId is required"))
  }

  # Row-level processed data is no longer stored in PostgreSQL.
  # We keep only summary/metadata in Postgres; full data is in Redis.
  res$status <- 410  # Gone
  list(
    error  = "Row-level processed data is no longer stored in PostgreSQL. Use /result/redis to fetch processed data.",
    jobId  = jobId
  )
}
