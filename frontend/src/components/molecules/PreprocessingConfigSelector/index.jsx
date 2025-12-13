import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import FlexBox from '../../atoms/FlexBox';
import Typography from '../../atoms/CustomTypography';
import Button from '../../atoms/CustomButton';

function Select({ value, onChange, options, disabled }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        padding: '8px 10px',
        borderRadius: 10,
        border: '1px solid rgba(0,0,0,0.15)',
        background: disabled ? 'rgba(0,0,0,0.03)' : 'white',
      }}
    >
      {options.map((o) => (
        <option key={o.key} value={o.key}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default function PreprocessingConfigSelector({
  selectedTaskKeys,
  columns,
  columnTypes,
  taskRegistry,
  onConfigChange,
}) {
  const enabledTasks = useMemo(() => {
    const set = new Set(selectedTaskKeys);
    return taskRegistry.filter((t) => set.has(t.taskKey));
  }, [selectedTaskKeys, taskRegistry]);

  // Defaults (type-based)
  const [defaults, setDefaults] = useState({
    categoricalMissing: 'categorical_unknown',
    numericMissing: 'numeric_median',
    scaling: 'zscore',
    encoding: 'auto',
    oneHotMaxLevels: 10,
    rarePropThreshold: 0.01,
    highCardinalityThreshold: 50,
    unknownLevel: 'unknown',
    numericConstant: 0,
  });

  // Per-column overrides: { [col]: { missing?: methodKey, scaling?: methodKey, ... } }
  const [overridesOpen, setOverridesOpen] = useState(false);
  const [overrides, setOverrides] = useState({});

  const setOverride = (col, patch) => {
    setOverrides((prev) => ({
      ...prev,
      [col]: { ...(prev[col] || {}), ...patch },
    }));
  };

  // Build preprocessingConfig whenever inputs change
  const config = useMemo(() => {
    const steps = [];

    const has = (taskKey) => selectedTaskKeys.includes(taskKey);

    // Helper to create column-specific steps
    const pushColumnStep = (task, method, col, params) => {
      steps.push({
        task,
        method,
        appliesTo: { columns: [col] },
        ...(params ? { params } : {}),
      });
    };

    // Helper to create type-based steps
    const pushTypeStep = (task, method, type, params) => {
      steps.push({
        task,
        method,
        appliesTo: { types: [type] },
        ...(params ? { params } : {}),
      });
    };

    // 1) Missing values – categorical
    if (has('handle_missing_categoricals')) {
      // per-column overrides first
      for (const col of columns) {
        if (columnTypes[col] !== 'categorical') continue;
        const m = overrides[col]?.categoricalMissing;
        if (m) {
          const params =
            m === 'categorical_unknown'
              ? { unknownLevel: overrides[col]?.unknownLevel ?? defaults.unknownLevel }
              : undefined;
          pushColumnStep('missing_values', m, col, params);
        }
      }

      // type default for remaining categoricals
      pushTypeStep(
        'missing_values',
        defaults.categoricalMissing,
        'categorical',
        defaults.categoricalMissing === 'categorical_unknown'
          ? { unknownLevel: defaults.unknownLevel }
          : undefined
      );
    }

    // 2) Missing values – numeric
    if (has('numeric_imputation')) {
      for (const col of columns) {
        if (columnTypes[col] !== 'numeric') continue;
        const m = overrides[col]?.numericMissing;
        if (m) {
          const params = m === 'numeric_constant' ? { value: overrides[col]?.numericConstant ?? defaults.numericConstant } : undefined;
          pushColumnStep('missing_values', m, col, params);
        }
      }

      pushTypeStep(
        'missing_values',
        defaults.numericMissing,
        'numeric',
        defaults.numericMissing === 'numeric_constant' ? { value: defaults.numericConstant } : undefined
      );
    }

    // 3) Label cleaning
    if (has('clean_category_labels')) {
      pushTypeStep('label_cleaning', 'standard', 'categorical');
    }

    // 4) Reduce cardinality
    if (has('reduce_cardinality')) {
      pushTypeStep('reduce_cardinality', 'rare_to_other', 'categorical', {
        rare_prop_threshold: defaults.rarePropThreshold,
        high_cardinality_threshold: defaults.highCardinalityThreshold,
      });
    }

    // 5) Encoding
    if (has('encode_categoricals')) {
      pushTypeStep('encoding', defaults.encoding, 'categorical', {
        one_hot_max_levels: Number(defaults.oneHotMaxLevels) || 10,
      });
    }

    // 6) Scaling (numeric)
    if (has('numeric_scaling')) {
      for (const col of columns) {
        if (columnTypes[col] !== 'numeric') continue;
        const m = overrides[col]?.scaling;
        if (m) {
          pushColumnStep('scaling', m, col);
        }
      }
      pushTypeStep('scaling', defaults.scaling, 'numeric');
    }

    return {
      version: '1.0',
      steps,
    };
  }, [selectedTaskKeys, columns, columnTypes, overrides, defaults]);

  // Emit config up to parent
  React.useEffect(() => {
    onConfigChange(config);
  }, [config, onConfigChange]);

  // UI rendering
  const enabledTaskKeys = new Set(enabledTasks.map((t) => t.taskKey));

  return (
    <FlexBox sx={{ flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle1">Methods (Defaults)</Typography>

      {/* Categorical missing */}
      <FlexBox sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="body2" color="textSecondary" sx={{ minWidth: 220 }}>
          Categorical missing values
        </Typography>
        <Select
          disabled={!enabledTaskKeys.has('handle_missing_categoricals')}
          value={defaults.categoricalMissing}
          onChange={(v) => setDefaults((p) => ({ ...p, categoricalMissing: v }))}
          options={[
            { key: 'categorical_unknown', label: 'Fill with "unknown"' },
            { key: 'categorical_mode', label: 'Fill with mode' },
          ]}
        />
        {defaults.categoricalMissing === 'categorical_unknown' && (
          <input
            disabled={!enabledTaskKeys.has('handle_missing_categoricals')}
            value={defaults.unknownLevel}
            onChange={(e) => setDefaults((p) => ({ ...p, unknownLevel: e.target.value }))}
            placeholder='unknown'
            style={{
              padding: '8px 10px',
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.15)',
            }}
          />
        )}
      </FlexBox>

      {/* Numeric missing */}
      <FlexBox sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="body2" color="textSecondary" sx={{ minWidth: 220 }}>
          Numeric missing values
        </Typography>
        <Select
          disabled={!enabledTaskKeys.has('numeric_imputation')}
          value={defaults.numericMissing}
          onChange={(v) => setDefaults((p) => ({ ...p, numericMissing: v }))}
          options={[
            { key: 'numeric_median', label: 'Median' },
            { key: 'numeric_mean', label: 'Mean' },
            { key: 'numeric_constant', label: 'Constant value' },
          ]}
        />
        {defaults.numericMissing === 'numeric_constant' && (
          <input
            disabled={!enabledTaskKeys.has('numeric_imputation')}
            value={defaults.numericConstant}
            onChange={(e) => setDefaults((p) => ({ ...p, numericConstant: Number(e.target.value) }))}
            placeholder='0'
            type="number"
            style={{
              padding: '8px 10px',
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.15)',
              width: 120,
            }}
          />
        )}
      </FlexBox>

      {/* Scaling */}
      <FlexBox sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="body2" color="textSecondary" sx={{ minWidth: 220 }}>
          Scaling (numeric)
        </Typography>
        <Select
          disabled={!enabledTaskKeys.has('numeric_scaling')}
          value={defaults.scaling}
          onChange={(v) => setDefaults((p) => ({ ...p, scaling: v }))}
          options={[
            { key: 'zscore', label: 'Z-score' },
            { key: 'minmax', label: 'Min-max' },
            { key: 'none', label: 'None' },
          ]}
        />
      </FlexBox>

      {/* Encoding */}
      <FlexBox sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="body2" color="textSecondary" sx={{ minWidth: 220 }}>
          Encoding (categorical)
        </Typography>
        <Select
          disabled={!enabledTaskKeys.has('encode_categoricals')}
          value={defaults.encoding}
          onChange={(v) => setDefaults((p) => ({ ...p, encoding: v }))}
          options={[{ key: 'auto', label: 'Auto' }]}
        />
        <Typography variant="caption" color="textSecondary">
          Max one-hot levels
        </Typography>
        <input
          disabled={!enabledTaskKeys.has('encode_categoricals')}
          value={defaults.oneHotMaxLevels}
          onChange={(e) => setDefaults((p) => ({ ...p, oneHotMaxLevels: Number(e.target.value) }))}
          type="number"
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.15)',
            width: 120,
          }}
        />
      </FlexBox>

      {/* Cardinality */}
      <FlexBox sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="body2" color="textSecondary" sx={{ minWidth: 220 }}>
          Reduce cardinality
        </Typography>

        <Typography variant="caption" color="textSecondary">
          Rare threshold
        </Typography>
        <input
          disabled={!enabledTaskKeys.has('reduce_cardinality')}
          value={defaults.rarePropThreshold}
          onChange={(e) => setDefaults((p) => ({ ...p, rarePropThreshold: Number(e.target.value) }))}
          type="number"
          step="0.001"
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.15)',
            width: 140,
          }}
        />

        <Typography variant="caption" color="textSecondary">
          High-card threshold
        </Typography>
        <input
          disabled={!enabledTaskKeys.has('reduce_cardinality')}
          value={defaults.highCardinalityThreshold}
          onChange={(e) => setDefaults((p) => ({ ...p, highCardinalityThreshold: Number(e.target.value) }))}
          type="number"
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.15)',
            width: 160,
          }}
        />
      </FlexBox>

      <FlexBox sx={{ mt: 1 }}>
        <Button variant="outlined" color="inherit" onClick={() => setOverridesOpen((v) => !v)}>
          {overridesOpen ? 'Hide per-column overrides' : 'Advanced: per-column overrides'}
        </Button>
      </FlexBox>

      {overridesOpen && (
        <FlexBox sx={{ flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <Typography variant="subtitle2">Per-column overrides</Typography>
          <Typography variant="body2" color="textSecondary">
            Overrides apply only if the corresponding task is enabled.
          </Typography>

          <FlexBox sx={{ flexDirection: 'column', gap: 1 }}>
            {columns.map((col) => {
              const type = columnTypes[col];
              return (
                <FlexBox
                  key={col}
                  sx={{
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 2,
                    padding: 1.5,
                    gap: 2,
                    flexDirection: 'column',
                  }}
                >
                  <FlexBox sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {col}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {type}
                    </Typography>
                  </FlexBox>

                  {type === 'categorical' && (
                    <>
                      <FlexBox sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography variant="body2" color="textSecondary" sx={{ minWidth: 220 }}>
                          Missing values method
                        </Typography>
                        <Select
                          disabled={!enabledTaskKeys.has('handle_missing_categoricals')}
                          value={overrides[col]?.categoricalMissing || ''}
                          onChange={(v) => setOverride(col, { categoricalMissing: v || undefined })}
                          options={[
                            { key: '', label: 'Use default' },
                            { key: 'categorical_unknown', label: 'Fill with "unknown"' },
                            { key: 'categorical_mode', label: 'Fill with mode' },
                          ]}
                        />
                        {(overrides[col]?.categoricalMissing || '') === 'categorical_unknown' && (
                          <input
                            disabled={!enabledTaskKeys.has('handle_missing_categoricals')}
                            value={overrides[col]?.unknownLevel ?? ''}
                            onChange={(e) => setOverride(col, { unknownLevel: e.target.value })}
                            placeholder={defaults.unknownLevel}
                            style={{
                              padding: '8px 10px',
                              borderRadius: 10,
                              border: '1px solid rgba(0,0,0,0.15)',
                            }}
                          />
                        )}
                      </FlexBox>
                    </>
                  )}

                  {type === 'numeric' && (
                    <>
                      <FlexBox sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography variant="body2" color="textSecondary" sx={{ minWidth: 220 }}>
                          Missing values method
                        </Typography>
                        <Select
                          disabled={!enabledTaskKeys.has('numeric_imputation')}
                          value={overrides[col]?.numericMissing || ''}
                          onChange={(v) => setOverride(col, { numericMissing: v || undefined })}
                          options={[
                            { key: '', label: 'Use default' },
                            { key: 'numeric_median', label: 'Median' },
                            { key: 'numeric_mean', label: 'Mean' },
                            { key: 'numeric_constant', label: 'Constant' },
                          ]}
                        />
                        {(overrides[col]?.numericMissing || '') === 'numeric_constant' && (
                          <input
                            disabled={!enabledTaskKeys.has('numeric_imputation')}
                            value={overrides[col]?.numericConstant ?? ''}
                            onChange={(e) => setOverride(col, { numericConstant: Number(e.target.value) })}
                            placeholder={String(defaults.numericConstant)}
                            type="number"
                            style={{
                              padding: '8px 10px',
                              borderRadius: 10,
                              border: '1px solid rgba(0,0,0,0.15)',
                              width: 120,
                            }}
                          />
                        )}
                      </FlexBox>

                      <FlexBox sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography variant="body2" color="textSecondary" sx={{ minWidth: 220 }}>
                          Scaling method
                        </Typography>
                        <Select
                          disabled={!enabledTaskKeys.has('numeric_scaling')}
                          value={overrides[col]?.scaling || ''}
                          onChange={(v) => setOverride(col, { scaling: v || undefined })}
                          options={[
                            { key: '', label: 'Use default' },
                            { key: 'zscore', label: 'Z-score' },
                            { key: 'minmax', label: 'Min-max' },
                            { key: 'none', label: 'None' },
                          ]}
                        />
                      </FlexBox>
                    </>
                  )}
                </FlexBox>
              );
            })}
          </FlexBox>
        </FlexBox>
      )}
    </FlexBox>
  );
}

PreprocessingConfigSelector.propTypes = {
  selectedTaskKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  columns: PropTypes.arrayOf(PropTypes.string).isRequired,
  columnTypes: PropTypes.object.isRequired,
  taskRegistry: PropTypes.array.isRequired,
  onConfigChange: PropTypes.func.isRequired,
};
