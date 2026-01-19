// components/organisms/BulkSelectionPanel.jsx
import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import FlexBox from '../../atoms/FlexBox';
import Typography from '../../atoms/CustomTypography';
import Button from '../../atoms/CustomButton';
import SectionCard from '../../atoms/SectionCard';

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

function CheckboxRow({ checked, onChange, label, sublabel }) {
  return (
    <label
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        padding: '8px 10px',
        borderRadius: 10,
        border: '1px solid rgba(0,0,0,0.08)',
        cursor: 'pointer',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 3 }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700 }}>{label}</div>
        {sublabel ? <div style={{ fontSize: 12, opacity: 0.75 }}>{sublabel}</div> : null}
      </div>
    </label>
  );
}

/**
 * Bulk Selection:
 * - Select columns (search + type filter + select all)
 * - Choose target area and method
 * - Apply overrides for selected columns
 * - Remove overrides for selected columns
 */
export default function BulkSelectionPanel({
  enabledTaskKeys,
  columns,
  columnTypes,
  defaults, // snapshot from selector
  overrides,
  onOverridesChange,
}) {
  const [target, setTarget] = useState('categorical_missing'); // categorical_missing | numeric_missing | scaling
  const [filterType, setFilterType] = useState('all'); // all | numeric | categorical
  const [search, setSearch] = useState('');
  const [selectedCols, setSelectedCols] = useState([]);

  // method selection per target
  const [catMethod, setCatMethod] = useState('categorical_unknown');
  const [catUnknown, setCatUnknown] = useState('');
  const [numMethod, setNumMethod] = useState('numeric_median');
  const [numConstant, setNumConstant] = useState('');
  const [scaleMethod, setScaleMethod] = useState('zscore');

  const isTargetEnabled = useMemo(() => {
    if (target === 'categorical_missing') return enabledTaskKeys.includes('handle_missing_categoricals');
    if (target === 'numeric_missing') return enabledTaskKeys.includes('numeric_imputation');
    if (target === 'scaling') return enabledTaskKeys.includes('numeric_scaling');
    return false;
  }, [target, enabledTaskKeys]);

  const targetType = useMemo(() => {
    if (target === 'categorical_missing') return 'categorical';
    if (target === 'numeric_missing') return 'numeric';
    if (target === 'scaling') return 'numeric';
    return 'all';
  }, [target]);

  const filteredColumns = useMemo(() => {
    const q = search.trim().toLowerCase();
    return columns.filter((c) => {
      const t = columnTypes[c];
      if (filterType !== 'all' && t !== filterType) return false;
      if (q && !c.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [columns, columnTypes, filterType, search]);

  const selectedCount = selectedCols.length;

  const toggleColumn = (col, nextChecked) => {
    setSelectedCols((prev) => {
      if (nextChecked) return prev.includes(col) ? prev : [...prev, col];
      return prev.filter((x) => x !== col);
    });
  };

  const selectAllFiltered = () => setSelectedCols(filteredColumns);
  const clearSelection = () => setSelectedCols([]);

  const applyBulk = () => {
    if (!isTargetEnabled) return;
    if (selectedCols.length === 0) return;

    const next = { ...(overrides || {}) };
    let skipped = 0;

    for (const col of selectedCols) {
      const t = columnTypes[col];
      if (targetType !== 'all' && t !== targetType) {
        skipped += 1;
        continue;
      }

      if (!next[col]) next[col] = {};

      if (target === 'categorical_missing') {
        next[col].categoricalMissing = catMethod;
        if (catMethod === 'categorical_unknown') {
          next[col].unknownLevel = (catUnknown || defaults?.unknownLevel || 'unknown');
        } else {
          delete next[col].unknownLevel;
        }
      }

      if (target === 'numeric_missing') {
        next[col].numericMissing = numMethod;
        if (numMethod === 'numeric_constant') {
          const v = numConstant !== '' ? Number(numConstant) : Number(defaults?.numericConstant ?? 0);
          next[col].numericConstant = Number.isFinite(v) ? v : 0;
        } else {
          delete next[col].numericConstant;
        }
      }

      if (target === 'scaling') {
        next[col].scaling = scaleMethod;
      }
    }

    onOverridesChange(next);

    // UX: keep selection, but show feedback in UI
    // We avoid toast dependency here; orchestrator can optionally toast if you want later.
    setLastResult({ kind: 'applied', skipped });
  };

  const removeOverridesForSelected = () => {
    if (selectedCols.length === 0) return;

    const next = { ...(overrides || {}) };
    let changed = 0;

    for (const col of selectedCols) {
      if (!next[col]) continue;

      if (target === 'categorical_missing') {
        if ('categoricalMissing' in next[col] || 'unknownLevel' in next[col]) {
          delete next[col].categoricalMissing;
          delete next[col].unknownLevel;
          changed += 1;
        }
      }

      if (target === 'numeric_missing') {
        if ('numericMissing' in next[col] || 'numericConstant' in next[col]) {
          delete next[col].numericMissing;
          delete next[col].numericConstant;
          changed += 1;
        }
      }

      if (target === 'scaling') {
        if ('scaling' in next[col]) {
          delete next[col].scaling;
          changed += 1;
        }
      }

      // Clean up empty override object
      if (next[col] && Object.keys(next[col]).length === 0) {
        delete next[col];
      }
    }

    onOverridesChange(next);
    setLastResult({ kind: 'removed', changed });
  };

  const [lastResult, setLastResult] = useState(null);

  const TargetControls = () => {
    if (target === 'categorical_missing') {
      return (
        <FlexBox sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1 }}>
          <FlexBox sx={{ flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>
              Method
            </Typography>
            <SelectNative
              disabled={!isTargetEnabled}
              value={catMethod}
              onChange={setCatMethod}
              options={[
                { key: 'categorical_unknown', label: 'Fill with "unknown"' },
                { key: 'categorical_mode', label: 'Fill with mode' },
              ]}
            />
          </FlexBox>

          <FlexBox sx={{ flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>
              Unknown label (if needed)
            </Typography>
            <InputNative
              disabled={!isTargetEnabled || catMethod !== 'categorical_unknown'}
              value={catUnknown}
              onChange={(e) => setCatUnknown(e.target.value)}
              placeholder={defaults?.unknownLevel || 'unknown'}
            />
          </FlexBox>
        </FlexBox>
      );
    }

    if (target === 'numeric_missing') {
      return (
        <FlexBox sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1 }}>
          <FlexBox sx={{ flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>
              Method
            </Typography>
            <SelectNative
              disabled={!isTargetEnabled}
              value={numMethod}
              onChange={setNumMethod}
              options={[
                { key: 'numeric_median', label: 'Median' },
                { key: 'numeric_mean', label: 'Mean' },
                { key: 'numeric_constant', label: 'Constant value' },
              ]}
            />
          </FlexBox>

          <FlexBox sx={{ flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>
              Constant (if needed)
            </Typography>
            <InputNative
              disabled={!isTargetEnabled || numMethod !== 'numeric_constant'}
              value={numConstant}
              onChange={(e) => setNumConstant(e.target.value)}
              placeholder={String(defaults?.numericConstant ?? 0)}
              type="number"
            />
          </FlexBox>
        </FlexBox>
      );
    }

    // scaling
    return (
      <FlexBox sx={{ flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>
          Method
        </Typography>
        <SelectNative
          disabled={!isTargetEnabled}
          value={scaleMethod}
          onChange={setScaleMethod}
          options={[
            { key: 'zscore', label: 'Z-score' },
            { key: 'minmax', label: 'Min-max' },
            { key: 'none', label: 'None' },
          ]}
        />
      </FlexBox>
    );
  };

  return (
    <SectionCard>
      <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <FlexBox sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
          <FlexBox sx={{ flexDirection: 'column', gap: 0.25 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Bulk Selection
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Select many columns and apply one preprocessing method at once. Overrides are applied only to compatible column types.
            </Typography>
          </FlexBox>

          <FlexBox sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined" color="inherit" onClick={selectAllFiltered} disabled={filteredColumns.length === 0}>
              Select all (filtered)
            </Button>
            <Button variant="outlined" color="inherit" onClick={clearSelection} disabled={selectedCols.length === 0}>
              Clear
            </Button>
          </FlexBox>
        </FlexBox>

        {/* Target + Method controls */}
        <FlexBox
          sx={{
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 2,
            padding: 1.25,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '260px 1fr' },
            gap: 1.25,
            background: 'rgba(0,0,0,0.02)',
          }}
        >
          <FlexBox sx={{ flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>
              Target
            </Typography>
            <SelectNative
              value={target}
              onChange={setTarget}
              options={[
                { key: 'categorical_missing', label: 'Categorical missing values' },
                { key: 'numeric_missing', label: 'Numeric missing values' },
                { key: 'scaling', label: 'Scaling (numeric)' },
              ]}
            />
            {!isTargetEnabled ? (
              <Typography variant="caption" color="textSecondary">
                Enable the corresponding task to apply this target.
              </Typography>
            ) : null}
          </FlexBox>

          <TargetControls />
        </FlexBox>

        {/* Filters */}
        <FlexBox
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 220px' },
            gap: 1,
            alignItems: 'center',
          }}
        >
          <InputNative value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search columns..." />
          <SelectNative
            value={filterType}
            onChange={setFilterType}
            options={[
              { key: 'all', label: 'All types' },
              { key: 'numeric', label: 'Numeric only' },
              { key: 'categorical', label: 'Categorical only' },
            ]}
          />
        </FlexBox>

        {/* Column list */}
        <FlexBox
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 1,
            maxHeight: 360,
            overflow: 'auto',
            paddingRight: 0.5,
          }}
        >
          {filteredColumns.map((col) => {
            const t = columnTypes[col] || 'unknown';
            const checked = selectedCols.includes(col);
            const hasOv = Boolean(overrides?.[col]);

            return (
              <CheckboxRow
                key={col}
                checked={checked}
                onChange={(v) => toggleColumn(col, v)}
                label={col}
                sublabel={`${t}${hasOv ? ' • has overrides' : ''}`}
              />
            );
          })}

          {filteredColumns.length === 0 ? (
            <FlexBox
              sx={{
                gridColumn: '1 / -1',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 2,
                padding: 1.25,
                background: 'rgba(0,0,0,0.02)',
              }}
            >
              <Typography variant="body2" color="textSecondary">
                No columns match the current filters.
              </Typography>
            </FlexBox>
          ) : null}
        </FlexBox>

        {/* Actions */}
        <FlexBox sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="caption" color="textSecondary">
            Selected: {selectedCount}
            {lastResult?.kind === 'applied' ? (
              <>
                {' '}
                • Applied
                {lastResult.skipped ? ` (skipped ${lastResult.skipped} incompatible)` : ''}
              </>
            ) : null}
            {lastResult?.kind === 'removed' ? <> • Removed ({lastResult.changed})</> : null}
          </Typography>

          <FlexBox sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={removeOverridesForSelected}
              disabled={selectedCols.length === 0}
            >
              Remove overrides (selected)
            </Button>

            <Button
              variant="contained"
              color="primary"
              onClick={applyBulk}
              disabled={!isTargetEnabled || selectedCols.length === 0}
            >
              Apply to selected
            </Button>
          </FlexBox>
        </FlexBox>
      </FlexBox>
    </SectionCard>
  );
}

BulkSelectionPanel.propTypes = {
  enabledTaskKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  columns: PropTypes.arrayOf(PropTypes.string).isRequired,
  columnTypes: PropTypes.object.isRequired,
  defaults: PropTypes.object,
  overrides: PropTypes.object.isRequired,
  onOverridesChange: PropTypes.func.isRequired,
};
