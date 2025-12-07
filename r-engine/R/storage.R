# R/storage.R
# Storage functions for Redis and PostgreSQL

store_in_redis <- function(job_id, processed_data, metadata) {
  redis_conn <- get_redis_conn()
  if (is.null(redis_conn)) return(FALSE)

  tryCatch({
    data_json <- jsonlite::toJSON(processed_data, na = "string")
    redis_conn$SET(paste0("processed:", job_id), data_json)
    redis_conn$SETEX(
      paste0("processed:", job_id, ":meta"),
      86400,
      jsonlite::toJSON(metadata, auto_unbox = TRUE)
    )
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
