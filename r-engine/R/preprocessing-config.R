# R/preprocessing_config.R
# Method-aware preprocessing engine (task-method-scope)
# Backward compatible: used only when preprocessingConfig is provided.

# ---------- helpers ----------

normalize_config <- function(cfg) {
  if (is.null(cfg)) return(NULL)
  if (!is.list(cfg)) stop("preprocessingConfig must be an object")

  steps <- cfg$steps
  if (is.null(steps) || !is.list(steps)) stop("preprocessingConfig.steps must be an array")

  # ensure each step is list-like and normalize keys
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
  # categorical: character or factor
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

  if (!is.null(cols)) {
    selected <- c(selected, cols)
  }

  selected <- unique(selected)
  selected <- selected[selected %in% colnames(df)]
  selected
}

# ---------- methods: missing values ----------

impute_numeric_median <- function(df, cols, actions) {
  for (col in cols) {
    v <- df[[col]]
    if (is.numeric(v) && any(is.na(v))) {
      med <- stats::median(v, na.rm = TRUE)
      df[[col]][is.na(df[[col]])] <- med
      actions[[col]] <- c(actions[[col]] %||% character(), "missing_values:numeric_median")
    }
  }
  list(df = df, actions = actions)
}

impute_numeric_mean <- function(df, cols, actions) {
  for (col in cols) {
    v <- df[[col]]
    if (is.numeric(v) && any(is.na(v))) {
      m <- mean(v, na.rm = TRUE)
      df[[col]][is.na(df[[col]])] <- m
      actions[[col]] <- c(actions[[col]] %||% character(), "missing_values:numeric_mean")
    }
  }
  list(df = df, actions = actions)
}

impute_numeric_constant <- function(df, cols, actions, value = 0) {
  for (col in cols) {
    v <- df[[col]]
    if (is.numeric(v) && any(is.na(v))) {
      df[[col]][is.na(df[[col]])] <- value
      actions[[col]] <- c(actions[[col]] %||% character(), paste0("missing_values:numeric_constant=", value))
    }
  }
  list(df = df, actions = actions)
}

impute_categorical_mode <- function(df, cols, actions) {
  for (col in cols) {
    v <- df[[col]]
    if (is.character(v) || is.factor(v)) {
      vv <- as.character(v)
      if (all(is.na(vv))) {
        # if everything missing, do nothing here; leave to unknown method
        next
      }
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
      df[[col]] <- vv
      actions[[col]] <- c(actions[[col]] %||% character(), "label_cleaning:standard")
    }
  }
  list(df = df, actions = actions)
}

# ---------- methods: reduce cardinality / rare categories ----------

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

# ---------- methods: encoding (reuse your logic patterns) ----------

encode_categoricals_method <- function(df, cols, actions, params, encoding_stats_out, encoded_cols_out, freq_cols_out) {
  one_hot_max_levels <- params$one_hot_max_levels %||% 10

  encoding_stats <- encoding_stats_out
  encoded_columns <- encoded_cols_out
  freq_encoded_columns <- freq_cols_out

  for (col in cols) {
    v <- df[[col]]
    if (!(is.character(v) || is.factor(v))) next
    vv <- as.character(v)

    # frequency encoding always
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

  # always: missing token normalization + numeric type inference (same as your baseline)
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

  col_types <- detect_column_types(df)

  # execution logs
  executed_steps <- character()
  warnings_out <- character()
  column_actions <- list()

  # stats to include in metadata
  scaling_stats <- list()
  encoding_stats <- list()
  encoded_columns <- character()
  frequency_encoded_columns <- character()
  rare_category_info <- list()
  high_cardinality_columns <- character()
  parameters_out <- list()

  # Apply steps in order
  for (i in seq_along(cfg$steps)) {
    st <- cfg$steps[[i]]
    task <- st$task
    method <- st$method
    appliesTo <- st$appliesTo %||% list()
    params <- st$params %||% list()

    target_cols <- select_columns(df, col_types, appliesTo)

    # If scope empty, skip gracefully
    if (length(target_cols) == 0) {
      warnings_out <- c(warnings_out, paste0("Step ", i, " skipped: no matching columns"))
      next
    }

    if (task == "missing_values") {
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

    # refresh column types if encoding dropped/replaced columns later (optional)
    col_types <- detect_column_types(df)
  }

  # If encoding ran, drop original categoricals if still present and were encoded
  # (In auto encoding method we add new columns but do not remove originals here;
  #  to keep behavior consistent, we drop only those explicitly selected that remain categorical.)
  # NOTE: you may choose to keep originals by design; current pipeline drops.
  # We'll follow current pipeline approach: drop all remaining categoricals IF encoding executed.
  if (any(grepl("^encoding:", executed_steps)) || any(executed_steps == "encoding:auto")) {
    col_types2 <- detect_column_types(df)
    if (length(col_types2$categorical) > 0) {
      df <- df[, setdiff(colnames(df), col_types2$categorical), drop = FALSE]
    }
  }

  # final metadata
  numeric_cols_final <- colnames(df)[sapply(df, is.numeric)]

  metadata <- list(
    preprocessing_mode       = jsonlite::unbox("config"),
    config_version           = jsonlite::unbox(cfg$version %||% "1.0"),
    requested_config         = cfg,
    executed_steps           = executed_steps,
    warnings                 = warnings_out,
    column_actions           = column_actions,

    categorical_columns      = col_types$categorical,
    numeric_columns          = col_types$numeric,
    numeric_columns_final    = numeric_cols_final,

    encoded_columns          = encoded_columns,
    frequency_encoded_columns= frequency_encoded_columns,
    encoding_stats           = encoding_stats,

    scaling_stats            = scaling_stats,

    rare_category_info       = rare_category_info,
    high_cardinality_columns = high_cardinality_columns,

    parameters               = parameters_out
  )

  list(data = df, metadata = metadata)
}
