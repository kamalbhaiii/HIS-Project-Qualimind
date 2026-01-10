# R/preprocessing_config.R
# Method-aware preprocessing engine (task-method-scope)
# Used when preprocessingConfig is provided.
# STRICT MODE: ONLY runs steps explicitly present in config.
#
# IMPORTANT (project invariant):
# Even in strict config mode, we ALWAYS run:
# 1) missing token normalization
# 2) numeric type inference
# These are preflight sanitation steps (not "tasks").

# ---------- helpers ----------

normalize_config <- function(cfg) {
  if (is.null(cfg)) return(NULL)

  # allow cfg to arrive as JSON string
  if (is.character(cfg) && nzchar(cfg)) {
    cfg <- jsonlite::fromJSON(cfg, simplifyVector = FALSE)
  }

  if (!is.list(cfg)) stop("preprocessingConfig must be an object")

  steps <- cfg$steps
  if (is.null(steps)) stop("preprocessingConfig.steps must be an array")

  if (is.data.frame(steps)) {
    steps <- lapply(seq_len(nrow(steps)), function(i) as.list(steps[i, , drop = FALSE]))
  }
  if (!is.list(steps)) stop("preprocessingConfig.steps must be an array")

  norm_steps <- lapply(seq_along(steps), function(i) {
    st <- steps[[i]]
    if (!is.list(st)) stop(paste0("steps[", i, "] must be an object"))

    task <- tolower(trimws(as.character(st$task %||% "")))
    method <- tolower(trimws(as.character(st$method %||% "")))
    if (task == "" || method == "") stop(paste0("steps[", i, "] must include task and method"))

    applies <- st$appliesTo %||% list()
    cols <- applies$columns %||% NULL
    types <- applies$types %||% NULL
    if (!is.null(cols)) cols <- as.character(cols)
    if (!is.null(types)) types <- tolower(as.character(types))

    params <- st$params %||% list()

    list(
      task = task,
      method = method,
      appliesTo = list(columns = cols, types = types),
      params = params
    )
  })

  cfg$version <- cfg$version %||% "1.0"
  cfg$steps <- norm_steps
  cfg
}

detect_column_types <- function(df) {
  categorical_cols <- colnames(df)[sapply(df, function(x) is.character(x) || is.factor(x))]
  numeric_cols     <- colnames(df)[sapply(df, is.numeric)]
  list(categorical = categorical_cols, numeric = numeric_cols)
}

select_columns <- function(df, col_types, appliesTo) {
  cols <- appliesTo$columns %||% NULL
  types <- appliesTo$types %||% NULL

  selected <- character(0)

  if (!is.null(types)) {
    if ("categorical" %in% types) selected <- c(selected, col_types$categorical)
    if ("numeric" %in% types) selected <- c(selected, col_types$numeric)
  }

  if (!is.null(cols)) selected <- c(selected, cols)

  selected <- unique(selected)
  selected <- selected[selected %in% colnames(df)]
  selected
}

# ---------- helpers: keep categoricals for UI (Category Drift) ----------

snapshot_categorical_columns <- function(df, cols) {
  cols <- intersect(as.character(cols %||% character()), colnames(df))
  if (!length(cols)) return(NULL)

  keep <- cols[sapply(cols, function(c) is.character(df[[c]]) || is.factor(df[[c]]))]
  if (!length(keep)) return(NULL)

  out <- df[, keep, drop = FALSE]
  for (c in colnames(out)) out[[c]] <- as.character(out[[c]])
  out
}

merge_categorical_snapshots <- function(a, b) {
  if (is.null(a) || !ncol(a)) return(b)
  if (is.null(b) || !ncol(b)) return(a)

  # add only new columns from b
  new_cols <- setdiff(colnames(b), colnames(a))
  if (!length(new_cols)) return(a)

  cbind(a, b[, new_cols, drop = FALSE])
}

reattach_categorical_snapshot <- function(df, snap) {
  if (is.null(snap) || !ncol(snap)) return(df)

  # avoid name collisions (shouldn't happen, but keep safe)
  overlap <- intersect(colnames(df), colnames(snap))
  if (length(overlap)) df <- df[, setdiff(colnames(df), overlap), drop = FALSE]

  cbind(df, snap)
}

# ---------- STRICT explicit step: missing token normalization ----------

missing_token_normalization_method <- function(df, cols, actions, tokens) {
  for (col in cols) {
    if (is.character(df[[col]]) || is.factor(df[[col]])) {
      v <- as.character(df[[col]])
      v <- stringr::str_trim(v)
      v[v %in% tokens] <- NA
      df[[col]] <- v
      actions[[col]] <- c(actions[[col]] %||% character(), "missing_token_normalization:standard")
    }
  }
  list(df = df, actions = actions)
}

# ---------- STRICT explicit step: numeric type inference ----------

numeric_type_inference_method <- function(df, cols, actions, threshold = 0.9) {
  for (col in cols) {
    if (!is.character(df[[col]])) next
    v <- df[[col]]
    non_na <- v[!is.na(v)]
    if (length(non_na) == 0) next

    numeric_like <- grepl("^-?[0-9]+(\\.[0-9]+)?$", non_na)
    if (mean(numeric_like) > threshold) {
      suppressWarnings(num_v <- as.numeric(non_na))
      if (!all(is.na(num_v))) {
        suppressWarnings(df[[col]] <- as.numeric(v))
        actions[[col]] <- c(actions[[col]] %||% character(), "numeric_type_inference:standard")
      }
    }
  }
  list(df = df, actions = actions)
}

# ---------- ALWAYS-ON preflight (config mode invariant) ----------

preflight_missing_token_normalization_all <- function(df, actions, tokens) {
  changed_any <- FALSE
  cols <- colnames(df)

  for (col in cols) {
    if (is.character(df[[col]]) || is.factor(df[[col]])) {
      v0 <- as.character(df[[col]])
      v1 <- stringr::str_trim(v0)

      # mark tokens -> NA
      v1[v1 %in% tokens] <- NA

      # changed?
      # compare using is.na + identical where possible
      if (!identical(v0, v1)) changed_any <- TRUE

      df[[col]] <- v1
      if (!identical(v0, v1)) {
        actions[[col]] <- c(actions[[col]] %||% character(), "preflight:missing_token_normalization")
      }
    }
  }

  list(df = df, actions = actions, changed = changed_any)
}

preflight_numeric_type_inference_all <- function(df, actions, threshold = 0.9) {
  changed_any <- FALSE
  cols <- colnames(df)

  for (col in cols) {
    if (!is.character(df[[col]])) next

    v <- df[[col]]
    non_na <- v[!is.na(v)]
    if (length(non_na) == 0) next

    numeric_like <- grepl("^-?[0-9]+(\\.[0-9]+)?$", non_na)
    if (mean(numeric_like) > threshold) {
      suppressWarnings(num_v <- as.numeric(non_na))
      if (!all(is.na(num_v))) {
        suppressWarnings(vn <- as.numeric(v))
        # conversion happened
        df[[col]] <- vn
        changed_any <- TRUE
        actions[[col]] <- c(actions[[col]] %||% character(), "preflight:numeric_type_inference")
      }
    }
  }

  list(df = df, actions = actions, changed = changed_any)
}

# ---------- helper: scoped numeric coercion (STRICT) ----------
# Only used when a numeric imputation method is explicitly requested for a column.
coerce_numeric_column_strict <- function(x) {
  if (is.numeric(x)) return(x)

  if (is.factor(x)) x <- as.character(x)

  if (is.character(x)) {
    x <- stringr::str_trim(x)
    # STRICT: only treat empty-string as missing unless user also runs missing_token_normalization
    x[x == ""] <- NA
    suppressWarnings(xn <- as.numeric(x))
    return(xn)
  }

  # If it's some other type, return as-is (imputer will skip)
  x
}

# ---------- methods: missing values ----------

impute_numeric_median <- function(df, cols, actions) {
  for (col in cols) {
    v2 <- coerce_numeric_column_strict(df[[col]])

    if (is.numeric(v2) && any(is.na(v2))) {
      med <- stats::median(v2, na.rm = TRUE)
      v2[is.na(v2)] <- med
      df[[col]] <- v2
      actions[[col]] <- c(actions[[col]] %||% character(), "missing_values:numeric_median")
    } else {
      # still assign coerced vector (keeps numerics numeric even if no NA)
      df[[col]] <- v2
    }
  }
  list(df = df, actions = actions)
}

impute_numeric_mean <- function(df, cols, actions) {
  for (col in cols) {
    v2 <- coerce_numeric_column_strict(df[[col]])

    if (is.numeric(v2) && any(is.na(v2))) {
      m <- mean(v2, na.rm = TRUE)
      v2[is.na(v2)] <- m
      df[[col]] <- v2
      actions[[col]] <- c(actions[[col]] %||% character(), "missing_values:numeric_mean")
    } else {
      df[[col]] <- v2
    }
  }
  list(df = df, actions = actions)
}

impute_numeric_constant <- function(df, cols, actions, value = 0) {
  for (col in cols) {
    v2 <- coerce_numeric_column_strict(df[[col]])

    if (is.numeric(v2) && any(is.na(v2))) {
      v2[is.na(v2)] <- value
      df[[col]] <- v2
      actions[[col]] <- c(actions[[col]] %||% character(), paste0("missing_values:numeric_constant=", value))
    } else {
      df[[col]] <- v2
    }
  }
  list(df = df, actions = actions)
}

impute_categorical_mode <- function(df, cols, actions) {
  for (col in cols) {
    v <- df[[col]]
    if (is.character(v) || is.factor(v)) {
      vv <- as.character(v)
      if (all(is.na(vv))) next
      if (any(is.na(vv))) {
        tbl <- table(vv, useNA = "no")
        mode_val <- names(tbl)[which.max(tbl)]
        vv[is.na(vv)] <- mode_val
        df[[col]] <- vv
        actions[[col]] <- c(actions[[col]] %||% character(), "missing_values:categorical_mode")
      }
    }
  }
  list(df = df, actions = actions)
}

impute_categorical_unknown <- function(df, cols, actions, unknown = "unknown") {
  for (col in cols) {
    v <- df[[col]]
    if (is.character(v) || is.factor(v)) {
      vv <- as.character(v)
      if (all(is.na(vv))) {
        df[[col]] <- rep(unknown, length(vv))
        actions[[col]] <- c(actions[[col]] %||% character(), paste0("missing_values:categorical_unknown=", unknown))
      } else if (any(is.na(vv))) {
        vv[is.na(vv)] <- unknown
        df[[col]] <- vv
        actions[[col]] <- c(actions[[col]] %||% character(), paste0("missing_values:categorical_unknown=", unknown))
      }
    }
  }
  list(df = df, actions = actions)
}

# ---------- methods: scaling ----------

scale_zscore <- function(df, cols, actions, stats_out) {
  for (col in cols) {
    v <- df[[col]]
    if (is.numeric(v)) {
      mean_val <- mean(v, na.rm = TRUE)
      sd_val <- stats::sd(v, na.rm = TRUE)
      if (!is.na(sd_val) && sd_val > 0) {
        df[[col]] <- (v - mean_val) / sd_val
        stats_out[[col]] <- list(mean = mean_val, sd = sd_val, method = "zscore")
        actions[[col]] <- c(actions[[col]] %||% character(), "scaling:zscore")
      }
    }
  }
  list(df = df, actions = actions, scaling_stats = stats_out)
}

scale_minmax <- function(df, cols, actions, stats_out) {
  for (col in cols) {
    v <- df[[col]]
    if (is.numeric(v)) {
      mn <- min(v, na.rm = TRUE)
      mx <- max(v, na.rm = TRUE)
      if (!is.na(mn) && !is.na(mx) && mx > mn) {
        df[[col]] <- (v - mn) / (mx - mn)
        stats_out[[col]] <- list(min = mn, max = mx, method = "minmax")
        actions[[col]] <- c(actions[[col]] %||% character(), "scaling:minmax")
      }
    }
  }
  list(df = df, actions = actions, scaling_stats = stats_out)
}

# ---------- methods: label cleaning ----------

clean_category_labels_method <- function(df, cols, actions) {
  for (col in cols) {
    v <- df[[col]]
    if (is.character(v) || is.factor(v)) {
      vv <- as.character(v)

      vv <- stringr::str_trim(vv)
      vv <- stringr::str_to_lower(vv)
      vv <- stringr::str_replace_all(vv, "[^a-z0-9\\s]", " ")
      vv <- stringr::str_replace_all(vv, "\\s+", "_")

      # NEW: normalize underscores (covers trailing punctuation like "BLUE!" -> "blue")
      vv <- stringr::str_replace_all(vv, "_+", "_")
      vv <- stringr::str_replace_all(vv, "^_+|_+$", "")

      df[[col]] <- vv
      actions[[col]] <- c(actions[[col]] %||% character(), "label_cleaning:standard")
    }
  }
  list(df = df, actions = actions)
}

# ---------- methods: reduce cardinality ----------

reduce_cardinality_method <- function(df, cols, actions, params, rare_info_out, high_card_out) {
  high_cardinality_threshold <- params$high_cardinality_threshold %||% 50
  rare_prop_threshold <- params$rare_prop_threshold %||% 0.01

  high_cols <- high_card_out
  rare_info <- rare_info_out

  for (col in cols) {
    v <- df[[col]]
    if (!(is.character(v) || is.factor(v))) next
    vv <- as.character(v)
    freq <- table(vv)
    prop <- as.numeric(freq) / sum(freq)
    names(prop) <- names(freq)

    if (length(freq) > high_cardinality_threshold) {
      high_cols <- unique(c(high_cols, col))
    }

    rare_levels <- names(prop)[prop < rare_prop_threshold]
    if (length(rare_levels) > 0) {
      vv[vv %in% rare_levels] <- "other"
      df[[col]] <- vv
      rare_info[[col]] <- list(rare_levels = rare_levels, threshold = rare_prop_threshold)
      actions[[col]] <- c(actions[[col]] %||% character(), "reduce_cardinality:rare_to_other")
    } else {
      rare_info[[col]] <- list(rare_levels = character(), threshold = rare_prop_threshold)
    }
  }

  list(
    df = df,
    actions = actions,
    rare_category_info = rare_info,
    high_cardinality_columns = high_cols,
    parameters = list(
      high_cardinality_threshold = jsonlite::unbox(high_cardinality_threshold),
      rare_prop_threshold = jsonlite::unbox(rare_prop_threshold)
    )
  )
}

# ---------- methods: encoding ----------

encode_categoricals_method <- function(df, cols, actions, params, encoding_stats_out, encoded_cols_out, freq_cols_out) {
  one_hot_max_levels <- params$one_hot_max_levels %||% 10

  encoding_stats <- encoding_stats_out
  encoded_columns <- encoded_cols_out
  freq_encoded_columns <- freq_cols_out

  for (col in cols) {
    v <- df[[col]]
    if (!(is.character(v) || is.factor(v))) next
    vv <- as.character(v)

    freq <- table(vv)
    freq_norm <- as.numeric(freq) / sum(freq)
    names(freq_norm) <- names(freq)

    freq_col <- paste0(col, "_freq")
    df[[freq_col]] <- as.numeric(freq_norm[vv])
    freq_encoded_columns <- c(freq_encoded_columns, freq_col)

    levels_col <- sort(unique(vv))
    unique_count <- length(levels_col)

    if (unique_count <= one_hot_max_levels) {
      new_cols <- character()
      for (lvl in levels_col) {
        new_name <- paste0(col, "_", lvl)
        df[[new_name]] <- as.integer(vv == lvl)
        new_cols <- c(new_cols, new_name)
      }
      encoding_stats[[col]] <- list(
        method = "one_hot",
        one_hot_columns = new_cols,
        frequency_column = freq_col,
        levels = levels_col
      )
      encoded_columns <- c(encoded_columns, new_cols, freq_col)
      actions[[col]] <- c(actions[[col]] %||% character(), "encoding:one_hot+frequency")
    } else {
      mapping <- seq_along(levels_col)
      names(mapping) <- levels_col
      label_col <- paste0(col, "_label")
      df[[label_col]] <- as.integer(mapping[vv])
      encoding_stats[[col]] <- list(
        method = "label",
        label_column = label_col,
        mapping = mapping,
        frequency_column = freq_col,
        levels = levels_col
      )
      encoded_columns <- c(encoded_columns, label_col, freq_col)
      actions[[col]] <- c(actions[[col]] %||% character(), "encoding:label+frequency")
    }
  }

  list(
    df = df,
    actions = actions,
    encoding_stats = encoding_stats,
    encoded_columns = encoded_columns,
    frequency_encoded_columns = freq_encoded_columns
  )
}

# ---------- main: preprocess with config ----------

preprocess_with_config <- function(df, config_raw) {
  cfg <- normalize_config(config_raw)

  executed_steps <- character()
  warnings_out <- character()
  column_actions <- list()

  # ----------------------------
  # ALWAYS-ON PREFLIGHT (INVARIANT)
  # ----------------------------
  tokens <- c("NULL","null","Na","NA","N/A","n/a","","?","NaN","nan")

  pf1 <- preflight_missing_token_normalization_all(df, column_actions, tokens = tokens)
  df <- pf1$df; column_actions <- pf1$actions
  if (isTRUE(pf1$changed)) executed_steps <- c(executed_steps, "preflight:missing_token_normalization")

  pf2 <- preflight_numeric_type_inference_all(df, column_actions, threshold = 0.9)
  df <- pf2$df; column_actions <- pf2$actions
  if (isTRUE(pf2$changed)) executed_steps <- c(executed_steps, "preflight:numeric_type_inference")

  # types after preflight
  col_types <- detect_column_types(df)

  scaling_stats <- list()
  encoding_stats <- list()
  encoded_columns <- character()
  frequency_encoded_columns <- character()
  rare_category_info <- list()
  high_cardinality_columns <- character()
  parameters_out <- list()
  categorical_snapshot <- NULL

  for (i in seq_along(cfg$steps)) {
    st <- cfg$steps[[i]]
    task <- st$task
    method <- st$method
    appliesTo <- st$appliesTo %||% list()
    params <- st$params %||% list()

    target_cols <- select_columns(df, col_types, appliesTo)

    if (length(target_cols) == 0) {
      warnings_out <- c(warnings_out, paste0("Step ", i, " skipped: no matching columns"))
      next
    }

    if (task == "missing_token_normalization") {
      if (method != "standard") stop("missing_token_normalization.method must be 'standard'")
      tokens2 <- params$tokens %||% tokens
      out <- missing_token_normalization_method(df, target_cols, column_actions, tokens = tokens2)
      df <- out$df; column_actions <- out$actions
      executed_steps <- c(executed_steps, "missing_token_normalization:standard")

    } else if (task == "numeric_type_inference") {
      if (method != "standard") stop("numeric_type_inference.method must be 'standard'")
      threshold <- as.numeric(params$threshold %||% 0.9)
      if (is.na(threshold) || threshold <= 0 || threshold > 1) threshold <- 0.9
      out <- numeric_type_inference_method(df, target_cols, column_actions, threshold = threshold)
      df <- out$df; column_actions <- out$actions
      executed_steps <- c(executed_steps, "numeric_type_inference:standard")

    } else if (task == "missing_values") {
      if (method == "numeric_median") {
        out <- impute_numeric_median(df, target_cols, column_actions)
        df <- out$df; column_actions <- out$actions
        executed_steps <- c(executed_steps, "missing_values:numeric_median")
      } else if (method == "numeric_mean") {
        out <- impute_numeric_mean(df, target_cols, column_actions)
        df <- out$df; column_actions <- out$actions
        executed_steps <- c(executed_steps, "missing_values:numeric_mean")
      } else if (method == "numeric_constant") {
        value <- params$value %||% 0
        out <- impute_numeric_constant(df, target_cols, column_actions, value = value)
        df <- out$df; column_actions <- out$actions
        executed_steps <- c(executed_steps, "missing_values:numeric_constant")
      } else if (method == "categorical_mode") {
        out <- impute_categorical_mode(df, target_cols, column_actions)
        df <- out$df; column_actions <- out$actions
        executed_steps <- c(executed_steps, "missing_values:categorical_mode")
      } else if (method == "categorical_unknown") {
        unknown <- params$unknownLevel %||% "unknown"
        out <- impute_categorical_unknown(df, target_cols, column_actions, unknown = unknown)
        df <- out$df; column_actions <- out$actions
        executed_steps <- c(executed_steps, "missing_values:categorical_unknown")
      } else {
        stop(paste0("Unsupported missing_values method: ", method))
      }

    } else if (task == "label_cleaning") {
      if (method == "standard") {
        out <- clean_category_labels_method(df, target_cols, column_actions)
        df <- out$df; column_actions <- out$actions
        executed_steps <- c(executed_steps, "label_cleaning:standard")
      } else {
        stop(paste0("Unsupported label_cleaning method: ", method))
      }

    } else if (task == "reduce_cardinality") {
      if (method == "rare_to_other") {
        out <- reduce_cardinality_method(
          df,
          target_cols,
          column_actions,
          params = params,
          rare_info_out = rare_category_info,
          high_card_out = high_cardinality_columns
        )
        df <- out$df
        column_actions <- out$actions
        rare_category_info <- out$rare_category_info
        high_cardinality_columns <- out$high_cardinality_columns
        parameters_out$reduce_cardinality <- out$parameters
        executed_steps <- c(executed_steps, "reduce_cardinality:rare_to_other")
      } else {
        stop(paste0("Unsupported reduce_cardinality method: ", method))
      }

    } else if (task == "encoding") {
      if (method == "auto") {
        snap <- snapshot_categorical_columns(df, target_cols)
        categorical_snapshot <- merge_categorical_snapshots(categorical_snapshot, snap)
        out <- encode_categoricals_method(
          df,
          target_cols,
          column_actions,
          params = params,
          encoding_stats_out = encoding_stats,
          encoded_cols_out = encoded_columns,
          freq_cols_out = frequency_encoded_columns
        )
        df <- out$df
        column_actions <- out$actions
        encoding_stats <- out$encoding_stats
        encoded_columns <- out$encoded_columns
        frequency_encoded_columns <- out$frequency_encoded_columns
        executed_steps <- c(executed_steps, "encoding:auto")
      } else {
        stop(paste0("Unsupported encoding method: ", method, " (supported: auto)"))
      }

    } else if (task == "scaling") {
      if (method == "zscore") {
        out <- scale_zscore(df, target_cols, column_actions, scaling_stats)
        df <- out$df; column_actions <- out$actions; scaling_stats <- out$scaling_stats
        executed_steps <- c(executed_steps, "scaling:zscore")
      } else if (method == "minmax") {
        out <- scale_minmax(df, target_cols, column_actions, scaling_stats)
        df <- out$df; column_actions <- out$actions; scaling_stats <- out$scaling_stats
        executed_steps <- c(executed_steps, "scaling:minmax")
      } else if (method == "none") {
        executed_steps <- c(executed_steps, "scaling:none")
      } else {
        stop(paste0("Unsupported scaling method: ", method))
      }

    } else {
      stop(paste0("Unsupported task: ", task))
    }

    col_types <- detect_column_types(df)
  }

  if (any(executed_steps == "encoding:auto")) {
    col_types2 <- detect_column_types(df)
    if (length(col_types2$categorical) > 0) {
      df <- df[, setdiff(colnames(df), col_types2$categorical), drop = FALSE]
    }

    # Reattach categorical strings for UI features (Category Drift, etc.)
    df <- reattach_categorical_snapshot(df, categorical_snapshot)
  }

  numeric_cols_final <- colnames(df)[sapply(df, is.numeric)]
  col_types_final <- detect_column_types(df)

  metadata <- list(
    preprocessing_mode        = jsonlite::unbox("config"),
    config_version            = jsonlite::unbox(cfg$version %||% "1.0"),
    requested_config          = cfg,
    executed_steps            = executed_steps,
    warnings                  = warnings_out,
    column_actions            = column_actions,

    categorical_columns       = col_types_final$categorical,
    numeric_columns           = col_types_final$numeric,
    numeric_columns_final     = numeric_cols_final,

    encoded_columns           = encoded_columns,
    frequency_encoded_columns = frequency_encoded_columns,
    encoding_stats            = encoding_stats,

    scaling_stats             = scaling_stats,

    rare_category_info        = rare_category_info,
    high_cardinality_columns  = high_cardinality_columns,

    parameters                = parameters_out
  )

  list(data = df, metadata = metadata)
}
