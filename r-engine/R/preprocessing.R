# R/preprocessing.R
# Categorical & numerical preprocessing pipeline

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
  numeric_cols     <- colnames(df)[sapply(df, is.numeric)]

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
    v <- df[[col]]
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
        threshold   = rare_prop_threshold
      )
    } else {
      rare_category_info[[col]] <- list(
        rare_levels = character(),
        threshold   = rare_prop_threshold
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
      freq  <- table(combo)
      freq_norm <- as.numeric(freq) / sum(freq)
      names(freq_norm) <- names(freq)
      feature_name <- paste0(c1, "__x__", c2, "_freq")
      df[[feature_name]] <- as.numeric(freq_norm[combo])
      interaction_features[[paste(c1, c2, sep = ":")]] <- list(
        cols    = c(c1, c2),
        feature = feature_name,
        method  = "frequency_encoding"
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
        method           = "one_hot",
        one_hot_columns  = new_cols,
        frequency_column = freq_col,
        levels           = levels_col
      )
      encoded_columns <- c(encoded_columns, new_cols, freq_col)
    } else {
      mapping <- seq_along(levels_col)
      names(mapping) <- levels_col
      label_col <- paste0(col, "_label")
      df[[label_col]] <- as.integer(mapping[v])
      encoding_stats[[col]] <- list(
        method           = "label",
        label_column     = label_col,
        mapping          = mapping,
        frequency_column = freq_col,
        levels           = levels_col
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
      sd_val   <- stats::sd(v, na.rm = TRUE)
      if (!is.na(sd_val) && sd_val > 0) {
        df[[col]] <- (v - mean_val) / sd_val
        scaling_stats[[col]] <- list(
          mean   = mean_val,
          sd     = sd_val,
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
