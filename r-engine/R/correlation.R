# R/correlation.R
library(jsonlite)

`%||%` <- function(a, b) if (!is.null(a)) a else b

is_empty_correlation_config <- function(cfg) {
  if (is.null(cfg)) return(TRUE)
  if (!is.list(cfg)) return(TRUE)
  cols <- cfg$columns %||% NULL
  if (is.null(cols)) return(TRUE)
  if (length(cols) == 0) return(TRUE)
  FALSE
}

# ---- legacy single-analysis normalizer ----
normalize_single_correlation_config <- function(cfg) {
  if (is.null(cfg)) return(NULL)

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

# ---- compute one analysis (legacy-compatible) ----
compute_correlation_analysis_single <- function(df, cfg) {
  cfg <- normalize_single_correlation_config(cfg)
  if (is_empty_correlation_config(cfg)) return(NULL)

  requested <- cfg$columns
  present <- requested[requested %in% colnames(df)]
  missing <- setdiff(requested, present)

  numeric_present <- present[sapply(df[present], is.numeric)]
  non_numeric <- setdiff(present, numeric_present)

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
  cor_mat <- stats::cor(sub, use = "pairwise.complete.obs", method = cfg$method)

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
        r = jsonlite::unbox(as.numeric(r))
      )
      idx <- idx + 1
    }
  }

  if (length(pairs) > 0) {
    abs_r <- vapply(pairs, function(x) abs(as.numeric(x$r)), numeric(1))
    ord <- order(abs_r, decreasing = TRUE)
    pairs <- pairs[ord]
    if (length(pairs) > cfg$topK) pairs <- pairs[seq_len(cfg$topK)]
  }

  out <- list(
    enabled = jsonlite::unbox(TRUE),
    method = jsonlite::unbox(cfg$method),
    requested_columns = requested,
    used_columns = use_cols,
    missing_columns = missing,
    non_numeric_columns = non_numeric,
    constant_columns = const_cols,
    n_used = jsonlite::unbox(length(use_cols)),
    top_pairs = pairs
  )

  if (isTRUE(cfg$includeMatrix) && length(use_cols) <= cfg$maxMatrixCols) {
    out$matrix <- cor_mat
  } else if (isTRUE(cfg$includeMatrix) && length(use_cols) > cfg$maxMatrixCols) {
    out$matrix <- NULL
    out$matrix_note <- jsonlite::unbox("Matrix omitted due to size limit.")
  }

  out
}

# ---- NEW: multi-analysis entry point ----
# Accepts either:
# 1) legacy single analysis: { columns, method, ... }
# 2) multi envelope: { version:"1.0", primaryId, analyses:[{id,name,enabled,columns,...}, ...] }
compute_correlation_analysis <- function(df, cfg) {
  if (is.null(cfg)) return(NULL)

  # Parse JSON string if needed
  if (is.character(cfg) && nzchar(cfg)) {
    cfg <- jsonlite::fromJSON(cfg, simplifyVector = FALSE)
  }
  if (!is.list(cfg)) stop("correlationConfig must be an object")

  # Multi envelope support
  if (!is.null(cfg$version) && as.character(cfg$version) == "1.0" && is.list(cfg$analyses)) {
    analyses_in <- cfg$analyses
    out_analyses <- list()

    ran <- 0L
    skipped <- 0L

    for (i in seq_along(analyses_in)) {
      a <- analyses_in[[i]]
      if (!is.list(a)) next

      id <- as.character(a$id %||% paste0("analysis_", i))
      name <- as.character(a$name %||% paste0("Correlation ", i))

      enabled <- isTRUE(a$enabled %||% FALSE)
      if (!enabled) {
        skipped <- skipped + 1L
        out_analyses[[length(out_analyses) + 1L]] <- list(
          id = jsonlite::unbox(id),
          name = jsonlite::unbox(name),
          enabled = jsonlite::unbox(FALSE),
          message = jsonlite::unbox("Skipped: disabled.")
        )
        next
      }

      # Run as single analysis using the same function
      ran <- ran + 1L
      res <- tryCatch({
        compute_correlation_analysis_single(df, a)
      }, error = function(e) {
        list(enabled = jsonlite::unbox(TRUE), error = jsonlite::unbox(e$message))
      })

      out_analyses[[length(out_analyses) + 1L]] <- list(
        id = jsonlite::unbox(id),
        name = jsonlite::unbox(name),
        enabled = jsonlite::unbox(TRUE),
        result = res
      )
    }

    primaryId <- as.character(cfg$primaryId %||% "")
    if (primaryId == "" && length(out_analyses) > 0) {
      primaryId <- out_analyses[[1]]$id
    }

    return(list(
      version = jsonlite::unbox("1.0"),
      primaryId = jsonlite::unbox(primaryId),
      summary = list(
        total = jsonlite::unbox(length(out_analyses)),
        ran = jsonlite::unbox(ran),
        skipped = jsonlite::unbox(skipped)
      ),
      analyses = out_analyses
    ))
  }

  # Fallback: legacy single config
  compute_correlation_analysis_single(df, cfg)
}
