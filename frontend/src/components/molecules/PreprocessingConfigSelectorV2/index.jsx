import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import FlexBox from '../../atoms/FlexBox';
import Typography from '../../atoms/CustomTypography';
import Button from '../../atoms/CustomButton';
import ToggleChip from '../../atoms/ToggleChip';

function SelectNative({ value, onChange, options, disabled, minWidth = 240 }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid rgba(0,0,0,0.15)',
        minWidth,
        width: '100%',
        maxWidth: 520,
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

function InputNative({
  value,
  onChange,
  disabled,
  type = 'text',
  placeholder,
  width,
  step,
}) {
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
        width: width ?? '100%',
        maxWidth: 520,
        outline: 'none',
      }}
    />
  );
}

/**
 * UX goals (design-only changes):
 * - Presets: one click to set good defaults
 * - Defaults first (applies to all columns)
 * - Advanced overrides: searchable, filterable, only show relevant controls
 * - Reset buttons
 * - Responsive: stacked on small screens, compact grid on larger screens
 *
 * NOTE: Logic intentionally unchanged; only layout/styles improved.
 */
export default function PreprocessingConfigSelectorV2({
  selectedTaskKeys,
  columns,
  columnTypes,
  onConfigChange,
  seedDefaults
}) {
  const hasTask = (k) => selectedTaskKeys.includes(k);

  // -----------------------------
  // Presets
  // -----------------------------
  const PRESETS = useMemo(
    () => [
      {
        key: 'fast',
        label: 'Fast (recommended)',
        apply: () => ({
          categoricalMissing: 'categorical_unknown',
          unknownLevel: 'unknown',
          numericMissing: 'numeric_median',
          numericConstant: 0,
          scaling: 'zscore',
          encoding: 'auto',
          oneHotMaxLevels: 10,
          rarePropThreshold: 0.01,
          highCardinalityThreshold: 50,
        }),
      },
      {
        key: 'robust',
        label: 'Robust (outlier-safe)',
        apply: () => ({
          categoricalMissing: 'categorical_unknown',
          unknownLevel: 'missing',
          numericMissing: 'numeric_median',
          numericConstant: 0,
          scaling: 'minmax',
          encoding: 'auto',
          oneHotMaxLevels: 8,
          rarePropThreshold: 0.02,
          highCardinalityThreshold: 40,
        }),
      },
      {
        key: 'minimal',
        label: 'Minimal changes',
        apply: () => ({
          categoricalMissing: 'categorical_mode',
          unknownLevel: 'unknown',
          numericMissing: 'numeric_mean',
          numericConstant: 0,
          scaling: 'none',
          encoding: 'auto',
          oneHotMaxLevels: 10,
          rarePropThreshold: 0.01,
          highCardinalityThreshold: 50,
        }),
      },
    ],
    []
  );

  // -----------------------------
  // Defaults (type-based)
  // -----------------------------
  const [defaults, setDefaults] = useState(() => PRESETS[0].apply());

  // NEW: allow Wizard (AI Suggest) to seed defaults
  useEffect(() => {
    if (!seedDefaults) return;
    setDefaults((prev) => ({
      ...prev,
      ...seedDefaults,
    }));
    // do not auto-clear overrides; user may already have overrides
  }, [seedDefaults]);

  // -----------------------------
  // Overrides (per-column)
  // -----------------------------
  // overrides[col] may include:
  // categoricalMissing, unknownLevel, numericMissing, numericConstant, scaling
  const [overrides, setOverrides] = useState({});
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Advanced UI helpers
  const [filterType, setFilterType] = useState('all'); // all | numeric | categorical
  const [search, setSearch] = useState('');
  const [onlyOverridden, setOnlyOverridden] = useState(false);

  const overrideCount = useMemo(() => Object.keys(overrides).length, [overrides]);

  const resetAllOverrides = () => setOverrides({});
  const resetOneOverride = (col) =>
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[col];
      return next;
    });

  const setOverride = (col, patch) => {
    setOverrides((prev) => ({
      ...prev,
      [col]: { ...(prev[col] || {}), ...patch },
    }));
  };

  // -----------------------------
  // Lightweight data-quality warnings (non-blocking)
  // -----------------------------
  const warnings = useMemo(() => {
    const out = [];
    if (hasTask('encode_categoricals') && !hasTask('clean_category_labels')) {
      out.push(
        'Encoding is enabled but label cleaning is off. Consider enabling label cleaning to reduce inconsistent categories.'
      );
    }
    if (hasTask('numeric_scaling') && defaults.scaling === 'none') {
      out.push('Scaling is enabled but default scaling is set to "None".');
    }
    return out;
  }, [selectedTaskKeys, defaults.scaling]); // eslint-disable-line react-hooks/exhaustive-deps

  // -----------------------------
  // Build preprocessingConfig (R-compatible)
  // -----------------------------
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
        const m = overrides[col]?.categoricalMissing;
        if (m) {
          const params =
            m === 'categorical_unknown'
              ? { unknownLevel: overrides[col]?.unknownLevel ?? defaults.unknownLevel }
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
        const m = overrides[col]?.numericMissing;
        if (m) {
          const params =
            m === 'numeric_constant'
              ? { value: overrides[col]?.numericConstant ?? defaults.numericConstant }
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
        const m = overrides[col]?.scaling;
        if (m) pushColumnStep('scaling', m, col);
      }
      pushTypeStep('scaling', defaults.scaling, 'numeric');
    }

    return { version: '1.0', steps };
  }, [selectedTaskKeys, columns, columnTypes, overrides, defaults]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onConfigChange(preprocessingConfig);
  }, [preprocessingConfig, onConfigChange]);

  // -----------------------------
  // Advanced list filtering
  // -----------------------------
  const filteredColumns = useMemo(() => {
    const s = search.trim().toLowerCase();

    return columns.filter((col) => {
      const t = columnTypes[col];
      if (filterType !== 'all' && t !== filterType) return false;
      if (s && !col.toLowerCase().includes(s)) return false;
      if (onlyOverridden && !overrides[col]) return false;
      return true;
    });
  }, [columns, columnTypes, filterType, search, onlyOverridden, overrides]);

  // -----------------------------
  // Render helpers (design-only)
  // -----------------------------
  const Section = ({ title, subtitle, right }) => (
    <FlexBox
      sx={{
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', md: 'center' },
        gap: 1.5,
        flexWrap: 'wrap',
      }}
    >
      <FlexBox sx={{ flexDirection: 'column', gap: 0.25 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="textSecondary">
            {subtitle}
          </Typography>
        )}
      </FlexBox>
      {right}
    </FlexBox>
  );

  Section.propTypes = {
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    right: PropTypes.node,
  };

  const FieldRow = ({ label, children }) => (
    <FlexBox
      sx={{
        gap: 1,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <Typography
        variant="caption"
        color="textSecondary"
        sx={{ minWidth: { xs: 'auto', md: 130 } }}
      >
        {label}
      </Typography>
      <FlexBox sx={{ flex: 1, minWidth: { xs: '100%', md: 260 } }}>{children}</FlexBox>
    </FlexBox>
  );

  FieldRow.propTypes = {
    label: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,
  };

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Section
        title="Preprocessing methods"
        subtitle="Choose defaults for the dataset. Optionally override methods per column."
        right={
          <FlexBox sx={{ display:'flex', flexDirection: 'column', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => {
                setDefaults(PRESETS[0].apply());
                setOverrides({});
              }}
            >
              Reset all
            </Button>

            <Button
              variant="outlined"
              color="inherit"
              onClick={() => setAdvancedOpen((v) => !v)}
            >
              {advancedOpen
                ? `Hide advanced (${overrideCount} overrides)`
                : `Advanced (${overrideCount} overrides)`}
            </Button>
          </FlexBox>
        }
      />

      {/* Presets */}
      <FlexBox
        sx={{
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 2,
          padding: { xs: 1.5, md: 2 },
          background: 'rgba(0,0,0,0.02)',
        }}
      >
        <FlexBox sx={{ flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Recommended presets
          </Typography>

          <FlexBox sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {PRESETS.map((p) => (
              <ToggleChip
                key={p.key}
                label={p.label}
                selected={false}
                onClick={() => {
                  setDefaults(p.apply());
                  // Keep overrides; user might want them.
                }}
              />
            ))}
          </FlexBox>

          <Typography variant="caption" color="textSecondary">
            Presets adjust defaults only. Advanced overrides remain unchanged.
          </Typography>
        </FlexBox>
      </FlexBox>

      {/* Warnings */}
      {warnings.length > 0 && (
        <FlexBox
          sx={{
            border: '1px solid rgba(255, 180, 0, 0.35)',
            background: 'rgba(255, 180, 0, 0.08)',
            borderRadius: 2,
            padding: { xs: 1.25, md: 1.5 },
            gap: 0.5,
            flexDirection: 'column',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Suggestions
          </Typography>
          {warnings.map((w, idx) => (
            <Typography key={idx} variant="body2" color="textSecondary">
              {w}
            </Typography>
          ))}
        </FlexBox>
      )}

      {/* Defaults */}
      <FlexBox
        sx={{
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 2,
          padding: { xs: 1.5, md: 2 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: { xs: 1.5, md: 2 },
        }}
      >
        {/* Categorical missing */}
        <FlexBox sx={{ flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Categorical missing values
          </Typography>

          <SelectNative
            disabled={!hasTask('handle_missing_categoricals')}
            value={defaults.categoricalMissing}
            onChange={(v) => setDefaults((p) => ({ ...p, categoricalMissing: v }))}
            options={[
              { key: 'categorical_unknown', label: 'Fill with "unknown" (recommended)' },
              { key: 'categorical_mode', label: 'Fill with mode (most frequent)' },
            ]}
          />

          {defaults.categoricalMissing === 'categorical_unknown' && (
            <FieldRow label="Unknown label">
              <InputNative
                disabled={!hasTask('handle_missing_categoricals')}
                value={defaults.unknownLevel}
                onChange={(e) => setDefaults((p) => ({ ...p, unknownLevel: e.target.value }))}
                placeholder="unknown"
              />
            </FieldRow>
          )}
        </FlexBox>

        {/* Numeric missing */}
        <FlexBox sx={{ flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Numeric missing values
          </Typography>

          <SelectNative
            disabled={!hasTask('numeric_imputation')}
            value={defaults.numericMissing}
            onChange={(v) => setDefaults((p) => ({ ...p, numericMissing: v }))}
            options={[
              { key: 'numeric_median', label: 'Median (recommended)' },
              { key: 'numeric_mean', label: 'Mean' },
              { key: 'numeric_constant', label: 'Constant value' },
            ]}
          />

          {defaults.numericMissing === 'numeric_constant' && (
            <FieldRow label="Constant">
              <InputNative
                disabled={!hasTask('numeric_imputation')}
                value={defaults.numericConstant}
                onChange={(e) =>
                  setDefaults((p) => ({ ...p, numericConstant: Number(e.target.value) }))
                }
                type="number"
                width={undefined}
              />
            </FieldRow>
          )}
        </FlexBox>

        {/* Scaling */}
        <FlexBox sx={{ flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Scaling (numeric)
          </Typography>

          <SelectNative
            disabled={!hasTask('numeric_scaling')}
            value={defaults.scaling}
            onChange={(v) => setDefaults((p) => ({ ...p, scaling: v }))}
            options={[
              { key: 'zscore', label: 'Z-score (recommended)' },
              { key: 'minmax', label: 'Min-max' },
              { key: 'none', label: 'None' },
            ]}
          />
        </FlexBox>

        {/* Encoding + thresholds */}
        <FlexBox sx={{ flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Encoding and cardinality
          </Typography>

          <FieldRow label="Encoding">
            <SelectNative
              disabled={!hasTask('encode_categoricals')}
              value={defaults.encoding}
              onChange={(v) => setDefaults((p) => ({ ...p, encoding: v }))}
              options={[{ key: 'auto', label: 'Auto' }]}
              minWidth={200}
            />
          </FieldRow>

          <FieldRow label="Max one-hot levels">
            <InputNative
              disabled={!hasTask('encode_categoricals')}
              value={defaults.oneHotMaxLevels}
              onChange={(e) =>
                setDefaults((p) => ({ ...p, oneHotMaxLevels: Number(e.target.value) }))
              }
              type="number"
              width={undefined}
            />
          </FieldRow>

          <FieldRow label="Rare threshold">
            <InputNative
              disabled={!hasTask('reduce_cardinality')}
              value={defaults.rarePropThreshold}
              onChange={(e) =>
                setDefaults((p) => ({ ...p, rarePropThreshold: Number(e.target.value) }))
              }
              type="number"
              step="0.001"
              width={undefined}
            />
          </FieldRow>

          <FieldRow label="High-card threshold">
            <InputNative
              disabled={!hasTask('reduce_cardinality')}
              value={defaults.highCardinalityThreshold}
              onChange={(e) =>
                setDefaults((p) => ({
                  ...p,
                  highCardinalityThreshold: Number(e.target.value),
                }))
              }
              type="number"
              width={undefined}
            />
          </FieldRow>
        </FlexBox>
      </FlexBox>

      {/* Advanced overrides */}
      {advancedOpen && (
        <FlexBox sx={{ display:'flex',flexDirection: 'column', gap: 1.5 }}>
          <Section
            title="Advanced overrides"
            subtitle="Override methods for specific columns. Overrides only apply when the related task is enabled."
            right={
              <Button variant="outlined" color="inherit" onClick={resetAllOverrides}>
                Reset overrides
              </Button>
            }
          />

          {/* Filters */}
          <FlexBox
            sx={{
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 2,
              padding: { xs: 1.25, md: 1.5 },
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 200px 220px' },
              gap: 1,
              alignItems: 'center',
              background: 'rgba(0,0,0,0.02)',
            }}
          >
            <InputNative
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search columns..."
              width={undefined}
            />

            <SelectNative
              value={filterType}
              onChange={setFilterType}
              options={[
                { key: 'all', label: 'All types' },
                { key: 'numeric', label: 'Numeric only' },
                { key: 'categorical', label: 'Categorical only' },
              ]}
              minWidth={200}
            />

            <SelectNative
              value={onlyOverridden ? 'yes' : 'no'}
              onChange={(v) => setOnlyOverridden(v === 'yes')}
              options={[
                { key: 'no', label: 'Show all columns' },
                { key: 'yes', label: 'Show overridden only' },
              ]}
              minWidth={220}
            />
          </FlexBox>

          {/* Column cards */}
          <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filteredColumns.map((col) => {
              const type = columnTypes[col];
              const ov = overrides[col];

              const showCatMissing =
                type === 'categorical' && hasTask('handle_missing_categoricals');
              const showNumMissing = type === 'numeric' && hasTask('numeric_imputation');
              const showScaling = type === 'numeric' && hasTask('numeric_scaling');

              return (
                <FlexBox
                  key={col}
                  sx={{
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 2,
                    padding: { xs: 1.25, md: 1.5 },
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '260px 1fr' },
                    gap: 1.25,
                    alignItems: 'start',
                  }}
                >
                  <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      {col}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {type}
                      {ov ? ' • overridden' : ''}
                    </Typography>

                    {ov && (
                      <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => resetOneOverride(col)}
                      >
                        Reset this column
                      </Button>
                    )}
                  </FlexBox>

                  <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {showCatMissing && (
                      <FlexBox sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          sx={{ minWidth: { xs: 'auto', md: 220 } }}
                        >
                          Categorical missing
                        </Typography>

                        <FlexBox sx={{ flex: 1, minWidth: { xs: '100%', md: 260 } }}>
                          <SelectNative
                            value={ov?.categoricalMissing || ''}
                            onChange={(v) =>
                              setOverride(col, { categoricalMissing: v || undefined })
                            }
                            options={[
                              { key: '', label: 'Use default' },
                              { key: 'categorical_unknown', label: 'Fill with "unknown"' },
                              { key: 'categorical_mode', label: 'Fill with mode' },
                            ]}
                          />
                        </FlexBox>

                        {(ov?.categoricalMissing || '') === 'categorical_unknown' && (
                          <FlexBox sx={{ flex: 1, minWidth: { xs: '100%', md: 220 } }}>
                            <InputNative
                              value={ov?.unknownLevel ?? ''}
                              onChange={(e) => setOverride(col, { unknownLevel: e.target.value })}
                              placeholder={defaults.unknownLevel}
                              width={undefined}
                            />
                          </FlexBox>
                        )}
                      </FlexBox>
                    )}

                    {showNumMissing && (
                      <FlexBox sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          sx={{ minWidth: { xs: 'auto', md: 220 } }}
                        >
                          Numeric missing
                        </Typography>

                        <FlexBox sx={{ flex: 1, minWidth: { xs: '100%', md: 260 } }}>
                          <SelectNative
                            value={ov?.numericMissing || ''}
                            onChange={(v) => setOverride(col, { numericMissing: v || undefined })}
                            options={[
                              { key: '', label: 'Use default' },
                              { key: 'numeric_median', label: 'Median' },
                              { key: 'numeric_mean', label: 'Mean' },
                              { key: 'numeric_constant', label: 'Constant' },
                            ]}
                          />
                        </FlexBox>

                        {(ov?.numericMissing || '') === 'numeric_constant' && (
                          <FlexBox sx={{ flex: 1, minWidth: { xs: '100%', md: 180 } }}>
                            <InputNative
                              value={ov?.numericConstant ?? ''}
                              onChange={(e) =>
                                setOverride(col, { numericConstant: Number(e.target.value) })
                              }
                              placeholder={String(defaults.numericConstant)}
                              type="number"
                              width={undefined}
                            />
                          </FlexBox>
                        )}
                      </FlexBox>
                    )}

                    {showScaling && (
                      <FlexBox sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          sx={{ minWidth: { xs: 'auto', md: 220 } }}
                        >
                          Scaling
                        </Typography>

                        <FlexBox sx={{ flex: 1, minWidth: { xs: '100%', md: 260 } }}>
                          <SelectNative
                            value={ov?.scaling || ''}
                            onChange={(v) => setOverride(col, { scaling: v || undefined })}
                            options={[
                              { key: '', label: 'Use default' },
                              { key: 'zscore', label: 'Z-score' },
                              { key: 'minmax', label: 'Min-max' },
                              { key: 'none', label: 'None' },
                            ]}
                          />
                        </FlexBox>
                      </FlexBox>
                    )}

                    {!showCatMissing && !showNumMissing && !showScaling && (
                      <Typography variant="body2" color="textSecondary">
                        No overrides available for this column with the currently selected tasks.
                      </Typography>
                    )}
                  </FlexBox>
                </FlexBox>
              );
            })}

            {filteredColumns.length === 0 && (
              <FlexBox
                sx={{
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 2,
                  padding: 1.5,
                  background: 'rgba(0,0,0,0.02)',
                }}
              >
                <Typography variant="body2" color="textSecondary">
                  No columns match the current filters.
                </Typography>
              </FlexBox>
            )}
          </FlexBox>
        </FlexBox>
      )}
    </FlexBox>
  );
}

PreprocessingConfigSelectorV2.propTypes = {
  selectedTaskKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  columns: PropTypes.arrayOf(PropTypes.string).isRequired,
  columnTypes: PropTypes.object.isRequired,
  onConfigChange: PropTypes.func.isRequired,
  seedDefaults: PropTypes.object,
};
