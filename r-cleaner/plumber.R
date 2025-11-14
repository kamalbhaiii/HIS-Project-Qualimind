library(plumber)
library(jsonlite)
library(readr)
library(dplyr)
library(uuid)
library(tools)

# Simple in-memory job store (replace with Redis/DB in production)
.job_store <- new.env(parent = emptyenv())

#* Liveness/readiness check
#* @get /health
function() {
  list(status = "ok", service = "r-cleaner", time = as.character(Sys.time()))
}

#* Upload dataset (multipart/form-data)
#* @param file:file The dataset file (csv)
#* @post /upload
function(req, res, file) {
  if (is.null(file)) {
    res$status <- 400
    return(list(error = "file is required"))
  }
  ext <- tolower(file_ext(file$filename %||% ""))
  if (!ext %in% c("csv")) {
    res$status <- 415
    return(list(error = "unsupported file type; only csv for now"))
  }
  dir.create("data/uploads", recursive = TRUE, showWarnings = FALSE)
  id <- UUIDgenerate()
  path <- file.path("data/uploads", paste0(id, ".", ext))
  ok <- file.copy(file$datapath, path, overwrite = TRUE)
  if (!ok) {
    res$status <- 500
    return(list(error = "failed to save upload"))
  }
  .job_store[[id]] <- list(status = "uploaded", path = path, createdAt = Sys.time())
  list(jobId = id, status = "uploaded")
}

#* Clean an uploaded dataset (synchronous)
#* @param jobId:string The ID returned from /upload
#* @post /clean
function(req, res, jobId) {
  job <- .job_store[[jobId]]
  if (is.null(job)) {
    res$status <- 404
    return(list(error = "job not found"))
  }
  df <- tryCatch(readr::read_csv(job$path, show_col_types = FALSE), error = function(e) NULL)
  if (is.null(df)) {
    res$status <- 400
    return(list(error = "failed to parse csv"))
  }
  cleaned <- df |>
    distinct() |>
    mutate(across(everything(), ~ ifelse(is.na(.x), "", .x)))

  .job_store[[jobId]] <- modifyList(job, list(status = "cleaned", rows = nrow(cleaned)))

  list(
    jobId = jobId,
    status = "cleaned",
    rows = nrow(cleaned),
    data = jsonlite::fromJSON(jsonlite::toJSON(cleaned, na = "string"))
  )
}

#* Clean inline JSON data (array of objects)
#* @post /clean-inline
function(req, res) {
  body <- tryCatch(jsonlite::fromJSON(req$postBody, simplifyDataFrame = TRUE), error = function(e) NULL)
  if (is.null(body) || !is.data.frame(body)) {
    res$status <- 400
    return(list(error = "body must be a JSON array of objects"))
  }
  cleaned <- body |>
    distinct() |>
    mutate(across(everything(), ~ ifelse(is.na(.x), "", .x)))
  list(rows = nrow(cleaned), data = jsonlite::fromJSON(jsonlite::toJSON(cleaned, na = "string")))
}

#* Job status
#* @param jobId:string
#* @get /status
function(jobId, res) {
  job <- .job_store[[jobId]]
  if (is.null(job)) {
    res$status <- 404
    return(list(error = "job not found"))
  }
  job[c("status", "path", "createdAt", "rows")]
}

#* Return cleaned file (CSV) after /clean
#* @param jobId:string
#* @get /result
function(jobId, res) {
  job <- .job_store[[jobId]]
  if (is.null(job) || is.null(job$rows) || job$status != "cleaned") {
    res$status <- 409
    return(list(error = "job not cleaned yet"))
  }
  res$setHeader("Content-Type", "text/csv")
  readBin(job$path, "raw", n = file.info(job$path)$size)
}


