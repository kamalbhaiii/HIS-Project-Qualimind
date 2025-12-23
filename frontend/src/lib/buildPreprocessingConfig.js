// components/utils/buildPreprocessingConfig.js

export function buildPreprocessingConfig({
  selectedTaskKeys,
  columns,
  columnTypes,
  defaults,
  overrides,
}) {
  const hasTask = (k) => selectedTaskKeys.includes(k);

  const steps = [];

  const pushColumnStep = (task, method, col, params) => {
    steps.push({
      task,
      method,
      appliesTo: { columns: [col] },
      ...(params ? { params } : {}),
    });
  };

  const pushTypeStep = (task, method, type, params) => {
    steps.push({
      task,
      method,
      appliesTo: { types: [type] },
      ...(params ? { params } : {}),
    });
  };

  // ----------------------------
  // 1) Missing values – categorical
  // ----------------------------
  if (hasTask('handle_missing_categoricals')) {
    for (const col of columns) {
      if (columnTypes[col] !== 'categorical') continue;

      const m = overrides?.[col]?.categoricalMissing;
      if (m) {
        const params =
          m === 'categorical_unknown'
            ? { unknownLevel: overrides?.[col]?.unknownLevel ?? defaults.unknownLevel }
            : undefined;
        pushColumnStep('missing_values', m, col, params);
      }
    }

    pushTypeStep(
      'missing_values',
      defaults.categoricalMissing,
      'categorical',
      defaults.categoricalMissing === 'categorical_unknown'
        ? { unknownLevel: defaults.unknownLevel }
        : undefined
    );
  }

  // ----------------------------
  // 2) Missing values – numeric
  // ----------------------------
  if (hasTask('numeric_imputation')) {
    for (const col of columns) {
      if (columnTypes[col] !== 'numeric') continue;

      const m = overrides?.[col]?.numericMissing;
      if (m) {
        const params =
          m === 'numeric_constant'
            ? { value: overrides?.[col]?.numericConstant ?? defaults.numericConstant }
            : undefined;
        pushColumnStep('missing_values', m, col, params);
      }
    }

    pushTypeStep(
      'missing_values',
      defaults.numericMissing,
      'numeric',
      defaults.numericMissing === 'numeric_constant'
        ? { value: defaults.numericConstant }
        : undefined
    );
  }

  // ----------------------------
  // 3) Label cleaning (type-level)
  // ----------------------------
  if (hasTask('clean_category_labels')) {
    pushTypeStep('label_cleaning', 'standard', 'categorical');
  }

  // ----------------------------
  // 4) Reduce cardinality (type-level default + optional per-column override)
  // ----------------------------
  if (hasTask('reduce_cardinality')) {
    // per-column overrides (optional)
    for (const col of columns) {
      if (columnTypes[col] !== 'categorical') continue;

      const ov = overrides?.[col]?.reduceCardinality;
      if (!ov) continue;

      pushColumnStep('reduce_cardinality', 'rare_to_other', col, {
        rare_prop_threshold: Number(ov.rarePropThreshold ?? defaults.rarePropThreshold),
        high_cardinality_threshold: Number(ov.highCardinalityThreshold ?? defaults.highCardinalityThreshold),
      });
    }

    pushTypeStep('reduce_cardinality', 'rare_to_other', 'categorical', {
      rare_prop_threshold: Number(defaults.rarePropThreshold),
      high_cardinality_threshold: Number(defaults.highCardinalityThreshold),
    });
  }

  // ----------------------------
  // 5) Encoding (type-level default + optional per-column override)
  // ----------------------------
  if (hasTask('encode_categoricals')) {
    for (const col of columns) {
      if (columnTypes[col] !== 'categorical') continue;

      const ov = overrides?.[col]?.encoding;
      if (!ov) continue;

      pushColumnStep('encoding', 'auto', col, {
        one_hot_max_levels: Number(ov.oneHotMaxLevels ?? defaults.oneHotMaxLevels) || 10,
      });
    }

    pushTypeStep('encoding', 'auto', 'categorical', {
      one_hot_max_levels: Number(defaults.oneHotMaxLevels) || 10,
    });
  }

  // ----------------------------
  // 6) Scaling (numeric)
  // ----------------------------
  if (hasTask('numeric_scaling')) {
    for (const col of columns) {
      if (columnTypes[col] !== 'numeric') continue;

      const m = overrides?.[col]?.scaling;
      if (m) pushColumnStep('scaling', m, col);
    }

    pushTypeStep('scaling', defaults.scaling, 'numeric');
  }

  return { version: '1.0', steps };
}
