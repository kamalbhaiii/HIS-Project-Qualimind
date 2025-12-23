# R/correlation.R
library(jsonlite)

is_empty_correlation_config <- function(cfg) {
  if (is.null(cfg)) return(TRUE)
  if (!is.list(cfg)) return(TRUE)
  cols <- cfg$columns %||% NULL
  if (is.null(cols)) return(TRUE)
  if (length(cols) == 0) return(TRUE)
  FALSE
}

normalize_correlation_config <- function(cfg) {
  if (is.null(cfg)) return(NULL)

  # allow cfg to arrive as JSON string
  if (is.character(cfg) && nzchar(cfg)) {
    cfg <- jsonlite::fromJSON(cfg, simplifyVector = FALSE)
  }
  if (!is.list(cfg)) stop("correlationConfig must be an object")

  cols <- cfg$columns %||% character(0)
  cols <- unique(trimws(as.character(cols)))
  cols <- cols[cols != ""]

  method <- tolower(trimws(as.character(cfg$method %||% "pearson")))
  if (!(method %in% c("pearson", "spearman", "kendall"))) {
    stop("correlationConfig.method must be one of: pearson, spearman, kendall")
  }

  topK <- as.integer(cfg$topK %||% 50)
  if (is.na(topK) || topK < 1) topK <- 50

  minAbs <- as.numeric(cfg$minAbs %||% 0)
  if (is.na(minAbs) || minAbs < 0) minAbs <- 0
  if (minAbs > 1) minAbs <- 1

  includeMatrix <- isTRUE(cfg$includeMatrix %||% FALSE)
  maxMatrixCols <- as.integer(cfg$maxMatrixCols %||% 200)
  if (is.na(maxMatrixCols) || maxMatrixCols < 2) maxMatrixCols <- 200

  list(
    columns = cols,
    method = method,
    topK = topK,
    minAbs = minAbs,
    includeMatrix = includeMatrix,
    maxMatrixCols = maxMatrixCols
  )
}

compute_correlation_analysis <- function(df, cfg) {
  cfg <- normalize_correlation_config(cfg)
  if (is_empty_correlation_config(cfg)) return(NULL)

  requested <- cfg$columns
  present <- requested[requested %in% colnames(df)]
  missing <- setdiff(requested, present)

  # numeric-only
  numeric_present <- present[sapply(df[present], is.numeric)]
  non_numeric <- setdiff(present, numeric_present)

  # need at least 2 numeric columns
  if (length(numeric_present) < 2) {
    return(list(
      enabled = jsonlite::unbox(TRUE),
      method = jsonlite::unbox(cfg$method),
      requested_columns = requested,
      used_columns = numeric_present,
      missing_columns = missing,
      non_numeric_columns = non_numeric,
      message = jsonlite::unbox("Correlation skipped: need at least 2 numeric columns.")
    ))
  }

  sub <- df[, numeric_present, drop = FALSE]

  # drop constant columns (sd==0 or all NA)
  is_const <- sapply(sub, function(x) {
    x2 <- x[!is.na(x)]
    if (length(x2) == 0) return(TRUE)
    stats::sd(x2) == 0
  })
  const_cols <- names(is_const)[is_const]
  use_cols <- setdiff(numeric_present, const_cols)

  if (length(use_cols) < 2) {
    return(list(
      enabled = jsonlite::unbox(TRUE),
      method = jsonlite::unbox(cfg$method),
      requested_columns = requested,
      used_columns = use_cols,
      missing_columns = missing,
      non_numeric_columns = non_numeric,
      constant_columns = const_cols,
      message = jsonlite::unbox("Correlation skipped: fewer than 2 usable numeric columns after removing constants.")
    ))
  }

  sub <- sub[, use_cols, drop = FALSE]

  # compute correlation matrix
  cor_mat <- stats::cor(sub, use = "pairwise.complete.obs", method = cfg$method)

  # extract top pairs from upper triangle
  p <- ncol(cor_mat)
  pairs <- list()
  idx <- 1
  for (i in seq_len(p - 1)) {
    for (j in seq((i + 1), p)) {
      r <- cor_mat[i, j]
      if (is.na(r)) next
      if (abs(r) < cfg$minAbs) next
      pairs[[idx]] <- list(
        col1 = colnames(cor_mat)[i],
        col2 = colnames(cor_mat)[j],
        r = unbox(as.numeric(r))
      )
      idx <- idx + 1
    }
  }

  # sort by |r| desc
  if (length(pairs) > 0) {
    abs_r <- vapply(pairs, function(x) abs(as.numeric(x$r)), numeric(1))
    ord <- order(abs_r, decreasing = TRUE)
    pairs <- pairs[ord]
    if (length(pairs) > cfg$topK) pairs <- pairs[seq_len(cfg$topK)]
  }

  out <- list(
    enabled = unbox(TRUE),
    method = unbox(cfg$method),
    requested_columns = requested,
    used_columns = use_cols,
    missing_columns = missing,
    non_numeric_columns = non_numeric,
    constant_columns = const_cols,
    n_used = unbox(length(use_cols)),
    top_pairs = pairs
  )

  # optionally include matrix, size-limited
  if (isTRUE(cfg$includeMatrix) && length(use_cols) <= cfg$maxMatrixCols) {
    out$matrix <- cor_mat
  } else if (isTRUE(cfg$includeMatrix) && length(use_cols) > cfg$maxMatrixCols) {
    out$matrix <- NULL
    out$matrix_note <- unbox("Matrix omitted due to size limit.")
  }

  out
}
