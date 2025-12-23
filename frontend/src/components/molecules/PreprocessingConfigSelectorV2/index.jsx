// components/molecules/PreprocessingConfigSelectorV2.jsx
import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import FlexBox from '../../atoms/FlexBox';
import Typography from '../../atoms/CustomTypography';

function SelectNative({ value, onChange, options, disabled }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid rgba(0,0,0,0.15)',
        width: '100%',
        outline: 'none',
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

function InputNative({ value, onChange, disabled, type = 'text', placeholder, step }) {
  return (
    <input
      value={value}
      onChange={onChange}
      disabled={disabled}
      type={type}
      step={step}
      placeholder={placeholder}
      style={{
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid rgba(0,0,0,0.15)',
        width: '100%',
        outline: 'none',
      }}
    />
  );
}

/**
 * Purpose now:
 * - Maintain the SAME preprocessing_config generation logic (R-compatible)
 * - Provide minimal defaults editor
 * - Accept controlled overrides from BulkSelectionPanel
 * - Emit generated config to parent via onConfigChange
 * - Emit defaults snapshot via onDefaultsSnapshot
 *
 * No advanced UI, no presets section, no per-column override UI in this component.
 */
export default function PreprocessingConfigSelectorV2({
  selectedTaskKeys,
  columns,
  columnTypes,
  onConfigChange,
  seedDefaults,

  // NEW (optional): controlled overrides
  overrides: controlledOverrides,
  onOverridesChange,

  // NEW (optional): expose defaults to bulk panel
  onDefaultsSnapshot,
}) {
  const hasTask = (k) => selectedTaskKeys.includes(k);

  // Defaults (type-based)
  const [defaults, setDefaults] = useState(() => ({
    categoricalMissing: 'categorical_unknown',
    unknownLevel: 'unknown',
    numericMissing: 'numeric_median',
    numericConstant: 0,
    encoding: 'auto',
    oneHotMaxLevels: 10,
    scaling: 'zscore',
    rarePropThreshold: 0.01,
    highCardinalityThreshold: 50,
  }));

  // seed defaults from AI (kept for compatibility, no UI here)
  useEffect(() => {
    if (!seedDefaults) return;
    setDefaults((prev) => ({ ...prev, ...seedDefaults }));
  }, [seedDefaults]);

  // Overrides: controlled or internal
  const isControlled = Boolean(onOverridesChange);
  const [internalOverrides, setInternalOverrides] = useState({});
  const overrides = isControlled ? (controlledOverrides || {}) : internalOverrides;
  const setOverrides = isControlled ? onOverridesChange : setInternalOverrides;

  // Emit defaults snapshot (for BulkSelectionPanel)
  useEffect(() => {
    if (!onDefaultsSnapshot) return;
    onDefaultsSnapshot(defaults);
  }, [defaults, onDefaultsSnapshot]);

  // Build preprocessingConfig (UNCHANGED LOGIC)
  const preprocessingConfig = useMemo(() => {
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

    // 1) Missing values – categorical
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

    // 2) Missing values – numeric
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

    // 3) Label cleaning
    if (hasTask('clean_category_labels')) {
      pushTypeStep('label_cleaning', 'standard', 'categorical');
    }

    // 4) Reduce cardinality
    if (hasTask('reduce_cardinality')) {
      pushTypeStep('reduce_cardinality', 'rare_to_other', 'categorical', {
        rare_prop_threshold: Number(defaults.rarePropThreshold),
        high_cardinality_threshold: Number(defaults.highCardinalityThreshold),
      });
    }

    // 5) Encoding
    if (hasTask('encode_categoricals')) {
      pushTypeStep('encoding', defaults.encoding, 'categorical', {
        one_hot_max_levels: Number(defaults.oneHotMaxLevels) || 10,
      });
    }

    // 6) Scaling
    if (hasTask('numeric_scaling')) {
      for (const col of columns) {
        if (columnTypes[col] !== 'numeric') continue;
        const m = overrides?.[col]?.scaling;
        if (m) pushColumnStep('scaling', m, col);
      }
      pushTypeStep('scaling', defaults.scaling, 'numeric');
    }

    return { version: '1.0', steps };
  }, [selectedTaskKeys, columns, columnTypes, overrides, defaults]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onConfigChange(preprocessingConfig);
  }, [preprocessingConfig, onConfigChange]);

  // Minimal Defaults UI
  const Field = ({ label, children, helper }) => (
    <FlexBox sx={{ flexDirection: 'column', gap: 0.5 }}>
      <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
      {children}
      {helper ? (
        <Typography variant="caption" color="textSecondary">
          {helper}
        </Typography>
      ) : null}
    </FlexBox>
  );

  return (
    <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        Defaults (used unless overridden by Bulk Selection)
      </Typography>

      <FlexBox
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 1.5,
        }}
      >
        <Field label="Categorical missing method" helper={!hasTask('handle_missing_categoricals') ? 'Enable the related task to apply.' : ''}>
          <SelectNative
            disabled={!hasTask('handle_missing_categoricals')}
            value={defaults.categoricalMissing}
            onChange={(v) => setDefaults((p) => ({ ...p, categoricalMissing: v }))}
            options={[
              { key: 'categorical_unknown', label: 'Fill with "unknown"' },
              { key: 'categorical_mode', label: 'Fill with mode' },
            ]}
          />
        </Field>

        <Field label="Unknown label (if using unknown)">
          <InputNative
            disabled={!hasTask('handle_missing_categoricals') || defaults.categoricalMissing !== 'categorical_unknown'}
            value={defaults.unknownLevel}
            onChange={(e) => setDefaults((p) => ({ ...p, unknownLevel: e.target.value }))}
            placeholder="unknown"
          />
        </Field>

        <Field label="Numeric missing method" helper={!hasTask('numeric_imputation') ? 'Enable the related task to apply.' : ''}>
          <SelectNative
            disabled={!hasTask('numeric_imputation')}
            value={defaults.numericMissing}
            onChange={(v) => setDefaults((p) => ({ ...p, numericMissing: v }))}
            options={[
              { key: 'numeric_median', label: 'Median' },
              { key: 'numeric_mean', label: 'Mean' },
              { key: 'numeric_constant', label: 'Constant value' },
            ]}
          />
        </Field>

        <Field label="Numeric constant (if using constant)">
          <InputNative
            disabled={!hasTask('numeric_imputation') || defaults.numericMissing !== 'numeric_constant'}
            value={defaults.numericConstant}
            onChange={(e) => setDefaults((p) => ({ ...p, numericConstant: Number(e.target.value) }))}
            type="number"
            placeholder="0"
          />
        </Field>

        <Field label="Scaling default (numeric)" helper={!hasTask('numeric_scaling') ? 'Enable the related task to apply.' : ''}>
          <SelectNative
            disabled={!hasTask('numeric_scaling')}
            value={defaults.scaling}
            onChange={(v) => setDefaults((p) => ({ ...p, scaling: v }))}
            options={[
              { key: 'zscore', label: 'Z-score' },
              { key: 'minmax', label: 'Min-max' },
              { key: 'none', label: 'None' },
            ]}
          />
        </Field>

        <Field label="Max one-hot levels (encoding)" helper={!hasTask('encode_categoricals') ? 'Enable encoding to apply.' : ''}>
          <InputNative
            disabled={!hasTask('encode_categoricals')}
            value={defaults.oneHotMaxLevels}
            onChange={(e) => setDefaults((p) => ({ ...p, oneHotMaxLevels: Number(e.target.value) }))}
            type="number"
            placeholder="10"
          />
        </Field>

        <Field label="Rare threshold" helper={!hasTask('reduce_cardinality') ? 'Enable reduce-cardinality to apply.' : ''}>
          <InputNative
            disabled={!hasTask('reduce_cardinality')}
            value={defaults.rarePropThreshold}
            onChange={(e) => setDefaults((p) => ({ ...p, rarePropThreshold: Number(e.target.value) }))}
            type="number"
            step="0.001"
            placeholder="0.01"
          />
        </Field>

        <Field label="High-cardinality threshold" helper={!hasTask('reduce_cardinality') ? 'Enable reduce-cardinality to apply.' : ''}>
          <InputNative
            disabled={!hasTask('reduce_cardinality')}
            value={defaults.highCardinalityThreshold}
            onChange={(e) => setDefaults((p) => ({ ...p, highCardinalityThreshold: Number(e.target.value) }))}
            type="number"
            placeholder="50"
          />
        </Field>
      </FlexBox>

      {/* This keeps the controlled overrides state "anchored" even though we don't render overrides here */}
      <input type="hidden" value={JSON.stringify(overrides || {})} readOnly />
      <input type="hidden" value={JSON.stringify(preprocessingConfig || {})} readOnly />
    </FlexBox>
  );
}

PreprocessingConfigSelectorV2.propTypes = {
  selectedTaskKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  columns: PropTypes.arrayOf(PropTypes.string).isRequired,
  columnTypes: PropTypes.object.isRequired,
  onConfigChange: PropTypes.func.isRequired,
  seedDefaults: PropTypes.object,

  overrides: PropTypes.object,
  onOverridesChange: PropTypes.func,
  onDefaultsSnapshot: PropTypes.func,
};
