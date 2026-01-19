// components/organisms/BulkAssignmentPanel.jsx
import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import FlexBox from '../../atoms/FlexBox';
import Typography from '../../atoms/CustomTypography';
import Button from '../../atoms/CustomButton';
import SectionCard from '../../atoms/SectionCard';

import OverrideConfirmModal from '../OverrideConfirmModal';

function InputNative({ value, onChange, placeholder, type = 'text', step }) {
  return (
    <input
      value={value}
      onChange={onChange}
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

/**
 * Bulk assignment:
 * - user selects columns (left)
 * - sets methods for enabled tasks (right)
 * - Apply: writes per-column overrides, confirms if overwriting, and clears selection
 */
export default function BulkAssignmentPanel({
  enabledTaskKeys,
  columns,
  columnTypes,

  defaults,
  onDefaultsChange,

  overrides,
  onOverridesChange,
}) {
  const hasTask = (k) => enabledTaskKeys.includes(k);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // all | numeric | categorical
  const [selectedCols, setSelectedCols] = useState([]);

  // form values (what will be applied to selection)
  const [form, setForm] = useState({
    // missing
    categoricalMissing: 'categorical_unknown',
    unknownLevel: 'unknown',
    numericMissing: 'numeric_median',
    numericConstant: 0,

    // scaling
    scaling: 'zscore',

    // encoding
    oneHotMaxLevels: 10,

    // cardinality
    rarePropThreshold: 0.01,
    highCardinalityThreshold: 50,
  });

  // confirm override modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPatch, setPendingPatch] = useState(null);
  const [conflicts, setConflicts] = useState([]);

  const selectedTypeStats = useMemo(() => {
    let nNum = 0;
    let nCat = 0;
    selectedCols.forEach((c) => {
      if (columnTypes[c] === 'numeric') nNum += 1;
      if (columnTypes[c] === 'categorical') nCat += 1;
    });
    return { nNum, nCat };
  }, [selectedCols, columnTypes]);

  const filteredCols = useMemo(() => {
    const s = search.trim().toLowerCase();
    return columns.filter((c) => {
      const t = columnTypes[c];
      if (filterType !== 'all' && t !== filterType) return false;
      if (s && !c.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [columns, columnTypes, filterType, search]);

  const toggleCol = (col) => {
    setSelectedCols((prev) => (prev.includes(col) ? prev.filter((x) => x !== col) : [...prev, col]));
  };

  const selectAllFiltered = () => setSelectedCols(filteredCols);
  const clearSelection = () => setSelectedCols([]);

  // Build override patch for selected columns from current form
  const buildOverridePatch = () => {
    const patch = {};

    selectedCols.forEach((col) => {
      const t = columnTypes[col];
      const next = { ...(overrides[col] || {}) };

      // categorical missing
      if (t === 'categorical' && hasTask('handle_missing_categoricals')) {
        next.categoricalMissing = form.categoricalMissing;
        if (form.categoricalMissing === 'categorical_unknown') {
          next.unknownLevel = form.unknownLevel;
        } else {
          delete next.unknownLevel;
        }
      }

      // numeric missing
      if (t === 'numeric' && hasTask('numeric_imputation')) {
        next.numericMissing = form.numericMissing;
        if (form.numericMissing === 'numeric_constant') {
          next.numericConstant = Number(form.numericConstant) || 0;
        } else {
          delete next.numericConstant;
        }
      }

      // scaling
      if (t === 'numeric' && hasTask('numeric_scaling')) {
        next.scaling = form.scaling;
      }

      // encoding (categorical)
      if (t === 'categorical' && hasTask('encode_categoricals')) {
        next.encoding = { oneHotMaxLevels: Number(form.oneHotMaxLevels) || 10 };
      }

      // reduce cardinality (categorical)
      if (t === 'categorical' && hasTask('reduce_cardinality')) {
        next.reduceCardinality = {
          rarePropThreshold: Number(form.rarePropThreshold),
          highCardinalityThreshold: Number(form.highCardinalityThreshold),
        };
      }

      patch[col] = next;
    });

    return patch;
  };

  // Detect conflicts (overwriting existing per-column settings)
  const detectConflicts = (patch) => {
    const out = [];

    selectedCols.forEach((col) => {
      const before = overrides[col] || {};
      const after = patch[col] || {};

      const changedFields = [];

      const compare = (key) => {
        const b = before?.[key];
        const a = after?.[key];
        const differs = JSON.stringify(b) !== JSON.stringify(a);
        // conflict only if "before" had something and it changes
        const had = b !== undefined;
        if (had && differs) changedFields.push(key);
      };

      compare('categoricalMissing');
      compare('unknownLevel');
      compare('numericMissing');
      compare('numericConstant');
      compare('scaling');
      compare('encoding');
      compare('reduceCardinality');

      if (changedFields.length) out.push({ column: col, fields: changedFields });
    });

    return out;
  };

  const applyPatch = (patch) => {
    onOverridesChange((prev) => ({ ...prev, ...patch }));
    // Clear selection after apply (your requirement)
    setSelectedCols([]);
  };

  const handleApply = () => {
    if (selectedCols.length === 0) return;

    const patch = buildOverridePatch();
    const c = detectConflicts(patch);

    if (c.length > 0) {
      setPendingPatch(patch);
      setConflicts(c);
      setConfirmOpen(true);
      return;
    }

    applyPatch(patch);
  };

  return (
    <>
      <OverrideConfirmModal
        open={confirmOpen}
        conflicts={conflicts}
        onClose={() => {
          setConfirmOpen(false);
          setPendingPatch(null);
          setConflicts([]);
        }}
        onConfirm={() => {
          if (pendingPatch) applyPatch(pendingPatch);
          setConfirmOpen(false);
          setPendingPatch(null);
          setConflicts([]);
        }}
      />

      <FlexBox sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        {/* LEFT: column picker */}
        <SectionCard>
          <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Select columns
            </Typography>

            <FlexBox sx={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 1 }}>
              <InputNative value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search columns..." />
              <SelectNative
                value={filterType}
                onChange={setFilterType}
                options={[
                  { key: 'all', label: 'All' },
                  { key: 'numeric', label: 'Numeric' },
                  { key: 'categorical', label: 'Categorical' },
                ]}
              />
            </FlexBox>

            <FlexBox sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" color="inherit" onClick={selectAllFiltered} disabled={filteredCols.length === 0}>
                Select all filtered
              </Button>
              <Button variant="outlined" color="inherit" onClick={clearSelection} disabled={selectedCols.length === 0}>
                Clear selection
              </Button>
            </FlexBox>

            <Typography variant="caption" color="textSecondary">
              Selected: {selectedCols.length} (categorical: {selectedTypeStats.nCat}, numeric: {selectedTypeStats.nNum})
            </Typography>

            <FlexBox
              sx={{
                mt: 0.5,
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 2,
                maxHeight: 360,
                overflow: 'auto',
              }}
            >
              {filteredCols.map((col) => {
                const selected = selectedCols.includes(col);
                return (
                  <FlexBox
                    key={col}
                    onClick={() => toggleCol(col)}
                    sx={{
                      cursor: 'pointer',
                      padding: '10px 12px',
                      borderBottom: '1px solid rgba(0,0,0,0.06)',
                      background: selected ? 'rgba(0,0,0,0.06)' : 'transparent',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 1,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: selected ? 700 : 500 }}>
                      {col}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {columnTypes[col] || 'unknown'}
                    </Typography>
                  </FlexBox>
                );
              })}
            </FlexBox>
          </FlexBox>
        </SectionCard>

        {/* RIGHT: assignment form for selected */}
        <SectionCard>
          <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Per-selection override assignment */}
            <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                Apply to selected (creates per-column overrides)
              </Typography>

              <FlexBox sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1 }}>
                {hasTask('handle_missing_categoricals') && selectedTypeStats.nCat > 0 && (
                  <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" color="textSecondary">
                      Categorical missing
                    </Typography>
                    <SelectNative
                      value={form.categoricalMissing}
                      onChange={(v) => setForm((p) => ({ ...p, categoricalMissing: v }))}
                      options={[
                        { key: 'categorical_unknown', label: 'Fill "unknown"' },
                        { key: 'categorical_mode', label: 'Fill mode' },
                      ]}
                    />
                    {form.categoricalMissing === 'categorical_unknown' && (
                      <InputNative
                        value={form.unknownLevel}
                        onChange={(e) => setForm((p) => ({ ...p, unknownLevel: e.target.value }))}
                        placeholder="unknown"
                      />
                    )}
                  </FlexBox>
                )}

                {hasTask('numeric_imputation') && selectedTypeStats.nNum > 0 && (
                  <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" color="textSecondary">
                      Numeric missing
                    </Typography>
                    <SelectNative
                      value={form.numericMissing}
                      onChange={(v) => setForm((p) => ({ ...p, numericMissing: v }))}
                      options={[
                        { key: 'numeric_median', label: 'Median' },
                        { key: 'numeric_mean', label: 'Mean' },
                        { key: 'numeric_constant', label: 'Constant' },
                      ]}
                    />
                    {form.numericMissing === 'numeric_constant' && (
                      <InputNative
                        type="number"
                        value={form.numericConstant}
                        onChange={(e) => setForm((p) => ({ ...p, numericConstant: e.target.value }))}
                        placeholder="0"
                      />
                    )}
                  </FlexBox>
                )}

                {hasTask('numeric_scaling') && selectedTypeStats.nNum > 0 && (
                  <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" color="textSecondary">
                      Scaling
                    </Typography>
                    <SelectNative
                      value={form.scaling}
                      onChange={(v) => setForm((p) => ({ ...p, scaling: v }))}
                      options={[
                        { key: 'zscore', label: 'Z-score' },
                        { key: 'minmax', label: 'Min-max' },
                        { key: 'none', label: 'None' },
                      ]}
                    />
                  </FlexBox>
                )}

                {hasTask('encode_categoricals') && selectedTypeStats.nCat > 0 && (
                  <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" color="textSecondary">
                      One-hot max levels
                    </Typography>
                    <InputNative
                      type="number"
                      value={form.oneHotMaxLevels}
                      onChange={(e) => setForm((p) => ({ ...p, oneHotMaxLevels: e.target.value }))}
                    />
                  </FlexBox>
                )}

                {hasTask('reduce_cardinality') && selectedTypeStats.nCat > 0 && (
                  <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" color="textSecondary">
                      Rare threshold
                    </Typography>
                    <InputNative
                      type="number"
                      step="0.001"
                      value={form.rarePropThreshold}
                      onChange={(e) => setForm((p) => ({ ...p, rarePropThreshold: e.target.value }))}
                    />
                  </FlexBox>
                )}

                {hasTask('reduce_cardinality') && selectedTypeStats.nCat > 0 && (
                  <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" color="textSecondary">
                      High-card threshold
                    </Typography>
                    <InputNative
                      type="number"
                      value={form.highCardinalityThreshold}
                      onChange={(e) => setForm((p) => ({ ...p, highCardinalityThreshold: e.target.value }))}
                    />
                  </FlexBox>
                )}
              </FlexBox>

              <FlexBox sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                <Button variant="outlined" color="inherit" onClick={() => onOverridesChange({})}>
                  Reset all overrides
                </Button>
                <Button variant="contained" color="primary" onClick={handleApply} disabled={selectedCols.length === 0}>
                  Apply to Selected
                </Button>
              </FlexBox>

              <Typography variant="caption" color="textSecondary">
                After applying, the selection clears automatically. If a column already had overrides, you will be asked to
                confirm overwriting.
              </Typography>
            </FlexBox>
          </FlexBox>
        </SectionCard>
      </FlexBox>
    </>
  );
}

BulkAssignmentPanel.propTypes = {
  enabledTaskKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  columns: PropTypes.arrayOf(PropTypes.string).isRequired,
  columnTypes: PropTypes.object.isRequired,

  defaults: PropTypes.object.isRequired,
  onDefaultsChange: PropTypes.func.isRequired,

  overrides: PropTypes.oneOfType([PropTypes.object, PropTypes.func]).isRequired,
  onOverridesChange: PropTypes.func.isRequired,
};
