# R/correlation.R
library(jsonlite)

`%||%` <- function(a, b) if (!is.null(a)) a else b

# -----------------------------
# Type helpers (defensive)
# -----------------------------
is_num_col <- function(x) is.numeric(x) || is.integer(x)

# Treat logical as categorical by default (more interpretable for many datasets)
is_cat_col <- function(x) is.factor(x) || is.character(x) || is.logical(x)

coerce_categorical <- function(x) {
  # Preserve NA
  if (is.factor(x)) return(x)
  if (is.logical(x)) return(factor(ifelse(is.na(x), NA, ifelse(x, "TRUE", "FALSE"))))
  factor(as.character(x))
}

coerce_numeric <- function(x) {
  if (is.numeric(x) || is.integer(x)) return(as.numeric(x))
  suppressWarnings(as.numeric(x))
}

# -----------------------------
# Association metrics
# -----------------------------

# numeric x numeric: Pearson/Spearman/Kendall via cor()
assoc_num_num <- function(x, y, method) {
  x <- as.numeric(x); y <- as.numeric(y)
  ok <- is.finite(x) & is.finite(y) & !is.na(x) & !is.na(y)
  if (sum(ok) < 3) return(NA_real_)
  suppressWarnings(stats::cor(x[ok], y[ok], method = method))
}

# numeric x categorical: correlation ratio eta (0..1)
# eta^2 = SSB / SST ; eta = sqrt(eta^2)
assoc_num_cat_eta <- function(num, cat) {
  num <- as.numeric(num)
  cat <- coerce_categorical(cat)

  ok <- is.finite(num) & !is.na(num) & !is.na(cat)
  num <- num[ok]
  cat <- cat[ok]

  if (length(num) < 3) return(NA_real_)
  if (nlevels(cat) < 2) return(NA_real_)

  grand_mean <- mean(num)
  sst <- sum((num - grand_mean)^2)
  if (!is.finite(sst) || sst <= 0) return(NA_real_)

  # between-group sum of squares
  means <- tapply(num, cat, mean)
  ns <- tapply(num, cat, length)
  ssb <- sum(ns * (means - grand_mean)^2)

  eta2 <- ssb / sst
  eta2 <- max(0, min(1, as.numeric(eta2)))
  sqrt(eta2)
}

# categorical x categorical: Cramer's V (0..1)
assoc_cat_cat_cramers_v <- function(a, b) {
  a <- coerce_categorical(a)
  b <- coerce_categorical(b)

  ok <- !is.na(a) & !is.na(b)
  a <- a[ok]
  b <- b[ok]

  if (length(a) < 3) return(NA_real_)
  if (nlevels(a) < 2 || nlevels(b) < 2) return(NA_real_)

  tbl <- table(a, b)
  if (any(dim(tbl) < 2)) return(NA_real_)

  suppressWarnings({
    chi <- stats::chisq.test(tbl, correct = FALSE)
  })

  n <- sum(tbl)
  if (!is.finite(n) || n <= 0) return(NA_real_)

  r <- nrow(tbl)
  k <- ncol(tbl)
  denom <- n * (min(r - 1, k - 1))
  if (!is.finite(denom) || denom <= 0) return(NA_real_)

  v <- sqrt(as.numeric(chi$statistic) / denom)
  v <- max(0, min(1, as.numeric(v)))
  v
}

# Decide metric based on types
compute_pair_association <- function(df, col1, col2, method = "pearson") {
  x <- df[[col1]]
  y <- df[[col2]]

  x_is_num <- is_num_col(x)
  y_is_num <- is_num_col(y)

  x_is_cat <- is_cat_col(x)
  y_is_cat <- is_cat_col(y)

  # If something is neither clearly numeric nor categorical, treat as categorical fallback
  if (!x_is_num && !x_is_cat) x_is_cat <- TRUE
  if (!y_is_num && !y_is_cat) y_is_cat <- TRUE

  type1 <- if (x_is_num) "numeric" else "categorical"
  type2 <- if (y_is_num) "numeric" else "categorical"

  if (x_is_num && y_is_num) {
    r <- assoc_num_num(x, y, method)
    return(list(metric = method, value = r, signed = TRUE, type1 = type1, type2 = type2))
  }

  if ((x_is_num && y_is_cat) || (x_is_cat && y_is_num)) {
    if (x_is_num) {
      v <- assoc_num_cat_eta(x, y)
      return(list(metric = "eta", value = v, signed = FALSE, type1 = type1, type2 = type2))
    } else {
      v <- assoc_num_cat_eta(y, x)
      return(list(metric = "eta", value = v, signed = FALSE, type1 = type1, type2 = type2))
    }
  }

  # categorical x categorical
  v <- assoc_cat_cat_cramers_v(x, y)
  list(metric = "cramers_v", value = v, signed = FALSE, type1 = type1, type2 = type2)
}

# -----------------------------
# Config parsing (defensive)
# -----------------------------
is_empty_correlation_config <- function(cfg) {
  if (is.null(cfg)) return(TRUE)
  if (!is.list(cfg)) return(TRUE)
  cols <- cfg$columns %||% NULL
  if (is.null(cols)) return(TRUE)
  if (length(cols) == 0) return(TRUE)
  FALSE
}

normalize_single_correlation_config <- function(cfg) {
  if (is.null(cfg)) return(NULL)

  # Accept JSON string or object
  if (is.character(cfg) && nzchar(cfg)) {
    cfg <- jsonlite::fromJSON(cfg, simplifyVector = FALSE)
  }

  # If frontend sends something weird (array/number/etc.), do NOT crash; treat as empty
  if (!is.list(cfg)) {
    return(list(
      columns = character(0),
      method = "pearson",
      topK = 50L,
      minAbs = 0,
      includeMatrix = FALSE,
      maxMatrixCols = 200L
    ))
  }

  cols <- cfg$columns %||% character(0)
  cols <- unique(trimws(as.character(cols)))
  cols <- cols[cols != ""]

  method <- tolower(trimws(as.character(cfg$method %||% "pearson")))
  if (!(method %in% c("pearson", "spearman", "kendall"))) {
    # Do not stop hard; default to pearson for robustness
    method <- "pearson"
  }

  topK <- suppressWarnings(as.integer(cfg$topK %||% 50))
  if (is.na(topK) || topK < 1) topK <- 50L

  minAbs <- suppressWarnings(as.numeric(cfg$minAbs %||% 0))
  if (is.na(minAbs) || minAbs < 0) minAbs <- 0
  # For eta/cramers_v it's already [0,1], for cor() clamp to [0,1] thresholding on abs
  if (minAbs > 1) minAbs <- 1

  includeMatrix <- isTRUE(cfg$includeMatrix %||% FALSE)
  maxMatrixCols <- suppressWarnings(as.integer(cfg$maxMatrixCols %||% 200))
  if (is.na(maxMatrixCols) || maxMatrixCols < 2) maxMatrixCols <- 200L

  list(
    columns = cols,
    method = method,
    topK = topK,
    minAbs = minAbs,
    includeMatrix = includeMatrix,
    maxMatrixCols = maxMatrixCols
  )
}

# -----------------------------
# Compute single analysis (mixed support)
# -----------------------------
compute_correlation_analysis_single <- function(df, cfg) {
  cfg <- normalize_single_correlation_config(cfg)
  if (is_empty_correlation_config(cfg)) return(NULL)

  requested <- cfg$columns
  present <- requested[requested %in% colnames(df)]
  missing <- setdiff(requested, present)

  if (length(present) < 2) {
    return(list(
      enabled = jsonlite::unbox(TRUE),
      requested_columns = requested,
      used_columns = present,
      missing_columns = missing,
      message = jsonlite::unbox("Association skipped: need at least 2 existing columns.")
    ))
  }

  # Remove constant columns (numeric sd==0 or categorical single level) for stability
  is_constant <- function(x) {
    if (is_num_col(x)) {
      x2 <- x[!is.na(x)]
      if (length(x2) == 0) return(TRUE)
      return(stats::sd(as.numeric(x2)) == 0)
    }
    # treat others as categorical
    f <- coerce_categorical(x)
    lv <- levels(droplevels(f[!is.na(f)]))
    length(lv) <= 1
  }

  const_flags <- sapply(df[present], is_constant)
  const_cols <- names(const_flags)[const_flags]
  use_cols <- setdiff(present, const_cols)

  if (length(use_cols) < 2) {
    return(list(
      enabled = jsonlite::unbox(TRUE),
      requested_columns = requested,
      used_columns = use_cols,
      missing_columns = missing,
      constant_columns = const_cols,
      message = jsonlite::unbox("Association skipped: fewer than 2 usable columns after removing constants.")
    ))
  }

  # Build all pairs and compute association metric depending on types
  p <- length(use_cols)
  pairs <- list()
  idx <- 1L

  for (i in seq_len(p - 1)) {
    for (j in seq((i + 1), p)) {
      c1 <- use_cols[i]
      c2 <- use_cols[j]

      info <- tryCatch({
        compute_pair_association(df, c1, c2, method = cfg$method)
      }, error = function(e) NULL)

      if (is.null(info)) next

      val <- suppressWarnings(as.numeric(info$value))
      if (is.na(val)) next

      # Thresholding:
      # - signed metrics: abs(val)
      # - unsigned metrics: val
      score <- if (isTRUE(info$signed)) abs(val) else val
      if (!is.finite(score)) next
      if (score < cfg$minAbs) next

      pairs[[idx]] <- list(
        col1 = c1,
        col2 = c2,
        type1 = info$type1,
        type2 = info$type2,
        metric = info$metric,
        value = jsonlite::unbox(val),
        score = jsonlite::unbox(score)
      )
      idx <- idx + 1L
    }
  }

  # Sort pairs by score desc, then take topK
  if (length(pairs) > 0) {
    scores <- vapply(pairs, function(x) as.numeric(x$score), numeric(1))
    ord <- order(scores, decreasing = TRUE)
    pairs <- pairs[ord]
    if (length(pairs) > cfg$topK) pairs <- pairs[seq_len(cfg$topK)]
  }

  # Optional matrix: only meaningful for numeric-numeric and same metric
  # We will include a numeric-only correlation matrix (legacy behavior), and keep mixed pairs in top_pairs.
  matrix_out <- NULL
  matrix_note <- NULL

  if (isTRUE(cfg$includeMatrix)) {
    numeric_cols <- use_cols[sapply(df[use_cols], is_num_col)]

    if (length(numeric_cols) >= 2 && length(numeric_cols) <= cfg$maxMatrixCols) {
      sub <- df[, numeric_cols, drop = FALSE]
      sub <- as.data.frame(lapply(sub, as.numeric))
      matrix_out <- suppressWarnings(stats::cor(sub, use = "pairwise.complete.obs", method = cfg$method))
    } else if (length(numeric_cols) > cfg$maxMatrixCols) {
      matrix_note <- "Matrix omitted due to size limit."
    } else {
      matrix_note <- "Matrix omitted: fewer than 2 numeric columns available."
    }
  }

  out <- list(
    enabled = jsonlite::unbox(TRUE),
    mode = jsonlite::unbox("mixed_association"),
    numeric_method = jsonlite::unbox(cfg$method),
    requested_columns = requested,
    used_columns = use_cols,
    missing_columns = missing,
    constant_columns = const_cols,
    n_used = jsonlite::unbox(length(use_cols)),
    top_pairs = pairs
  )

  if (isTRUE(cfg$includeMatrix)) {
    out$matrix <- matrix_out
    if (!is.null(matrix_note)) out$matrix_note <- jsonlite::unbox(matrix_note)
  }

  out
}

# -----------------------------
# Multi-analysis envelope support (unchanged interface, more defensive)
# -----------------------------
compute_correlation_analysis <- function(df, cfg) {
  if (is.null(cfg)) return(NULL)

  # Parse JSON string if needed
  if (is.character(cfg) && nzchar(cfg)) {
    cfg <- jsonlite::fromJSON(cfg, simplifyVector = FALSE)
  }

  # If frontend sends "weird" top-level type, do not error; just return a stable object
  if (!is.list(cfg)) {
    return(list(
      enabled = jsonlite::unbox(TRUE),
      error = jsonlite::unbox("correlationConfig must be an object; received non-object."),
      result = NULL
    ))
  }

  # Multi envelope support
  if (!is.null(cfg$version) && as.character(cfg$version) == "1.0" && is.list(cfg$analyses)) {
    analyses_in <- cfg$analyses
    out_analyses <- list()

    ran <- 0L
    skipped <- 0L

    for (i in seq_along(analyses_in)) {
      a <- analyses_in[[i]]
      if (!is.list(a)) {
        skipped <- skipped + 1L
        out_analyses[[length(out_analyses) + 1L]] <- list(
          id = jsonlite::unbox(paste0("analysis_", i)),
          name = jsonlite::unbox(paste0("Correlation ", i)),
          enabled = jsonlite::unbox(FALSE),
          message = jsonlite::unbox("Skipped: analysis item is not an object.")
        )
        next
      }

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
