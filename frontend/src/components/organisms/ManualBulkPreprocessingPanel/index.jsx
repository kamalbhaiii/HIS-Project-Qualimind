import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Checkbox from '@mui/material/Checkbox';

import FlexBox from '../../atoms/FlexBox';
import Typography from '../../atoms/CustomTypography';
import Button from '../../atoms/CustomButton';
import SectionCard from '../../atoms/SectionCard';

import ColumnMultiSelectToolbar from '../../molecules/ColumnMultiSelectToolbar';

// Reuse the “native” controls style you already use in V2:
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

function InputNative({ value, onChange, type = 'text', disabled, placeholder, step }) {
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

function getTaskBulkOptions(taskKey) {
  // Map your UI-level taskKeys to override fields used in PreprocessingConfigSelectorV2
  // Note: only tasks that have per-column override capability are supported here.
  if (taskKey === 'handle_missing_categoricals') {
    return {
      appliesToType: 'categorical',
      label: 'Categorical missing values',
      methodOptions: [
        { key: 'categorical_unknown', label: 'Fill with "unknown"' },
        { key: 'categorical_mode', label: 'Fill with mode' },
      ],
      needsUnknownLevel: true,
    };
  }

  if (taskKey === 'numeric_imputation') {
    return {
      appliesToType: 'numeric',
      label: 'Numeric missing values',
      methodOptions: [
        { key: 'numeric_median', label: 'Median' },
        { key: 'numeric_mean', label: 'Mean' },
        { key: 'numeric_constant', label: 'Constant' },
      ],
      needsNumericConstant: true,
    };
  }

  if (taskKey === 'numeric_scaling') {
    return {
      appliesToType: 'numeric',
      label: 'Scaling',
      methodOptions: [
        { key: 'zscore', label: 'Z-score' },
        { key: 'minmax', label: 'Min-max' },
        { key: 'none', label: 'None' },
      ],
    };
  }

  return null;
}

export default function ManualBulkPreprocessingPanel({
  enabledTaskKeys,
  columns,
  columnTypes,
  defaults,
  overrides,
  onOverridesChange,
}) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedCols, setSelectedCols] = useState([]);

  const bulkCapableTasks = useMemo(() => {
    // only tasks that map to per-column override knobs
    const supported = ['handle_missing_categoricals', 'numeric_imputation', 'numeric_scaling'];
    return enabledTaskKeys.filter((k) => supported.includes(k));
  }, [enabledTaskKeys]);

  const [selectedBulkTask, setSelectedBulkTask] = useState(bulkCapableTasks[0] || '');
  const bulkSpec = useMemo(() => getTaskBulkOptions(selectedBulkTask), [selectedBulkTask]);

  const [bulkMethod, setBulkMethod] = useState('');
  const [bulkUnknownLevel, setBulkUnknownLevel] = useState('');
  const [bulkNumericConstant, setBulkNumericConstant] = useState('');

  // Update defaults when task changes
  React.useEffect(() => {
    if (!bulkSpec) return;

    // seed method with default from defaults where possible
    if (selectedBulkTask === 'handle_missing_categoricals') setBulkMethod(defaults?.categoricalMissing || 'categorical_unknown');
    if (selectedBulkTask === 'numeric_imputation') setBulkMethod(defaults?.numericMissing || 'numeric_median');
    if (selectedBulkTask === 'numeric_scaling') setBulkMethod(defaults?.scaling || 'zscore');

    setBulkUnknownLevel('');
    setBulkNumericConstant('');
  }, [selectedBulkTask]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredColumns = useMemo(() => {
    const s = search.trim().toLowerCase();

    return columns.filter((c) => {
      const t = columnTypes?.[c];
      if (filterType !== 'all' && t !== filterType) return false;
      if (s && !c.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [columns, columnTypes, filterType, search]);

  const toggleSelected = (col) => {
    setSelectedCols((prev) => (prev.includes(col) ? prev.filter((x) => x !== col) : [...prev, col]));
  };

  const selectAllFiltered = () => {
    setSelectedCols((prev) => Array.from(new Set([...prev, ...filteredColumns])));
  };

  const clearSelection = () => setSelectedCols([]);

  const applyBulk = () => {
    if (!bulkSpec) return;
    if (!bulkMethod) return;
    if (selectedCols.length === 0) return;

    const typeTarget = bulkSpec.appliesToType;
    const colsOfType = selectedCols.filter((c) => columnTypes?.[c] === typeTarget);

    if (colsOfType.length === 0) return;

    const next = { ...(overrides || {}) };

    for (const col of colsOfType) {
      const existing = next[col] || {};

      if (selectedBulkTask === 'handle_missing_categoricals') {
        next[col] = {
          ...existing,
          categoricalMissing: bulkMethod,
          ...(bulkMethod === 'categorical_unknown'
            ? { unknownLevel: bulkUnknownLevel || existing.unknownLevel || defaults?.unknownLevel || 'unknown' }
            : {}),
        };
      }

      if (selectedBulkTask === 'numeric_imputation') {
        next[col] = {
          ...existing,
          numericMissing: bulkMethod,
          ...(bulkMethod === 'numeric_constant'
            ? {
                numericConstant: Number.isFinite(Number(bulkNumericConstant))
                  ? Number(bulkNumericConstant)
                  : (existing.numericConstant ?? defaults?.numericConstant ?? 0),
              }
            : {}),
        };
      }

      if (selectedBulkTask === 'numeric_scaling') {
        next[col] = { ...existing, scaling: bulkMethod };
      }
    }

    onOverridesChange(next);
  };

  const canApply = Boolean(bulkSpec) && Boolean(bulkMethod) && selectedCols.length > 0;

  return (
    <FlexBox sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' }, gap: 2 }}>
      {/* Left: column selection */}
      <SectionCard sx={{ padding: { xs: 1.25, md: 1.5 } }}>
        <FlexBox sx={{ flexDirection: 'column', gap: 1.25 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Select columns (bulk)
          </Typography>

          <ColumnMultiSelectToolbar
            search={search}
            onSearch={setSearch}
            filterType={filterType}
            onFilterType={setFilterType}
            onSelectAllFiltered={selectAllFiltered}
            onClearSelection={clearSelection}
            selectedCount={selectedCols.length}
          />

          <FlexBox
            sx={{
              maxHeight: 360,
              overflow: 'auto',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 2,
              padding: 1,
            }}
          >
            <FlexBox sx={{ flexDirection: 'column', gap: 0.5 }}>
              {filteredColumns.map((col) => {
                const t = columnTypes?.[col] || 'unknown';
                const checked = selectedCols.includes(col);

                return (
                  <FlexBox
                    key={col}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      borderRadius: 2,
                      padding: 0.5,
                      '&:hover': { background: 'rgba(0,0,0,0.03)' },
                    }}
                  >
                    <Checkbox checked={checked} onChange={() => toggleSelected(col)} />
                    <FlexBox sx={{ flexDirection: 'column' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {col}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {t}
                      </Typography>
                    </FlexBox>
                  </FlexBox>
                );
              })}

              {filteredColumns.length === 0 && (
                <Typography variant="body2" color="textSecondary">
                  No columns match the current filters.
                </Typography>
              )}
            </FlexBox>
          </FlexBox>
        </FlexBox>
      </SectionCard>

      {/* Right: bulk apply */}
      <SectionCard sx={{ padding: { xs: 1.25, md: 1.5 } }}>
        <FlexBox sx={{ flexDirection: 'column', gap: 1.25 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Apply a method to selected columns
          </Typography>

          {bulkCapableTasks.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              Enable at least one bulk-capable task (categorical missing, numeric missing, or scaling) to use bulk apply.
            </Typography>
          ) : (
            <>
              <FlexBox sx={{ flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="caption" color="textSecondary">
                  Bulk action
                </Typography>
                <SelectNative
                  value={selectedBulkTask}
                  onChange={(v) => setSelectedBulkTask(v)}
                  options={bulkCapableTasks.map((k) => ({
                    key: k,
                    label: getTaskBulkOptions(k)?.label || k,
                  }))}
                />
              </FlexBox>

              {bulkSpec ? (
                <>
                  <FlexBox sx={{ flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" color="textSecondary">
                      Method
                    </Typography>
                    <SelectNative
                      value={bulkMethod}
                      onChange={setBulkMethod}
                      options={bulkSpec.methodOptions}
                    />
                  </FlexBox>

                  {selectedBulkTask === 'handle_missing_categoricals' && bulkMethod === 'categorical_unknown' && (
                    <FlexBox sx={{ flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="caption" color="textSecondary">
                        Unknown label (optional)
                      </Typography>
                      <InputNative
                        value={bulkUnknownLevel}
                        onChange={(e) => setBulkUnknownLevel(e.target.value)}
                        placeholder={defaults?.unknownLevel || 'unknown'}
                      />
                    </FlexBox>
                  )}

                  {selectedBulkTask === 'numeric_imputation' && bulkMethod === 'numeric_constant' && (
                    <FlexBox sx={{ flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="caption" color="textSecondary">
                        Constant value (optional)
                      </Typography>
                      <InputNative
                        value={bulkNumericConstant}
                        onChange={(e) => setBulkNumericConstant(e.target.value)}
                        type="number"
                        placeholder={String(defaults?.numericConstant ?? 0)}
                      />
                    </FlexBox>
                  )}

                  <FlexBox sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 0.5 }}>
                    <Button variant="contained" color="primary" onClick={applyBulk} disabled={!canApply}>
                      Apply to {selectedCols.length} selected
                    </Button>
                  </FlexBox>

                  <Typography variant="caption" color="textSecondary">
                    Note: Bulk apply writes per-column overrides. Dataset defaults remain unchanged.
                  </Typography>
                </>
              ) : null}
            </>
          )}
        </FlexBox>
      </SectionCard>
    </FlexBox>
  );
}

ManualBulkPreprocessingPanel.propTypes = {
  enabledTaskKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  columns: PropTypes.arrayOf(PropTypes.string).isRequired,
  columnTypes: PropTypes.object.isRequired,
  defaults: PropTypes.object, // from config selector
  overrides: PropTypes.object,
  onOverridesChange: PropTypes.func.isRequired,
};
