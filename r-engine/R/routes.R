# R/routes.R
# Plumber route handlers

# /health -------------------------------------------------------------

health_handler <- function(req, res) {
  redis_status    <- "disconnected"
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

# /process ------------------------------------------------------------

process_handler <- function(req, res) {
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

# /clean --------------------------------------------------------------

clean_handler <- function(req, res, jobId) {
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

# /clean-inline -------------------------------------------------------

clean_inline_handler <- function(req, res) {
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

# /result/redis -------------------------------------------------------

result_redis_handler <- function(jobId, res) {
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

# /result/postgres ----------------------------------------------------

result_postgres_handler <- function(jobId, res) {
  if (is.null(jobId) || jobId == "") {
    res$status <- 400
    return(list(error = "jobId is required"))
  }

  # Row-level processed data is no longer stored in PostgreSQL.
  # We keep only summary/metadata in Postgres; full data is in Redis.
  res$status <- 410  # Gone
  list(
    error = "Row-level processed data is no longer stored in PostgreSQL. Use /result/redis to fetch processed data.",
    jobId = jobId
  )
}
