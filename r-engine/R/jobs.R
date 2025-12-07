# R/jobs.R
# Helpers for ProcessingJob and Dataset interaction

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
                                         result_key    = NULL,
                                         mark_started  = FALSE,
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
