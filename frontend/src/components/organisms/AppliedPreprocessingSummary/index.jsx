// components/organisms/AppliedPreprocessingSummary.jsx
import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import FlexBox from '../../atoms/FlexBox';
import Typography from '../../atoms/CustomTypography';
import SectionCard from '../../atoms/SectionCard';

function SelectNative({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
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

function formatValue(v) {
  if (v === undefined) return '—';
  if (v === null) return 'null';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export default function AppliedPreprocessingSummary({
  selectedTaskKeys,
  columns,
  columnTypes,
  defaults,
  overrides,
}) {
  const [inspectCol, setInspectCol] = useState(columns?.[0] || '');

  const overrideKeys = useMemo(() => Object.keys(overrides || {}), [overrides]);

  const effective = useMemo(() => {
    const col = inspectCol;
    const t = columnTypes?.[col];

    const ov = overrides?.[col] || {};

    // “effective” is default + override (where applicable)
    const out = { column: col, type: t };

    if (selectedTaskKeys.includes('handle_missing_categoricals') && t === 'categorical') {
      out.categoricalMissing = ov.categoricalMissing ?? defaults.categoricalMissing;
      out.unknownLevel = (ov.unknownLevel ?? defaults.unknownLevel);
    }

    if (selectedTaskKeys.includes('numeric_imputation') && t === 'numeric') {
      out.numericMissing = ov.numericMissing ?? defaults.numericMissing;
      out.numericConstant = ov.numericConstant ?? defaults.numericConstant;
    }

    if (selectedTaskKeys.includes('numeric_scaling') && t === 'numeric') {
      out.scaling = ov.scaling ?? defaults.scaling;
    }

    if (selectedTaskKeys.includes('encode_categoricals') && t === 'categorical') {
      const d = { oneHotMaxLevels: defaults.oneHotMaxLevels };
      out.encoding = ov.encoding ?? d;
    }

    if (selectedTaskKeys.includes('reduce_cardinality') && t === 'categorical') {
      const d = {
        rarePropThreshold: defaults.rarePropThreshold,
        highCardinalityThreshold: defaults.highCardinalityThreshold,
      };
      out.reduceCardinality = ov.reduceCardinality ?? d;
    }

    return out;
  }, [inspectCol, columnTypes, overrides, defaults, selectedTaskKeys]);

  return (
    <SectionCard>
      <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Applied preprocessing summary
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Defaults apply to all columns of a type. Overrides apply to specific columns.
        </Typography>

        <FlexBox
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 1.5,
            mt: 1,
          }}
        >
          <FlexBox
            sx={{
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 2,
              padding: 1.25,
              background: 'rgba(0,0,0,0.02)',
              flexDirection: 'column',
              gap: 0.5,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              Defaults
            </Typography>
            <Typography variant="caption" color="textSecondary">
              categoricalMissing: {formatValue(defaults.categoricalMissing)} (unknownLevel: {formatValue(defaults.unknownLevel)})
            </Typography>
            <Typography variant="caption" color="textSecondary">
              numericMissing: {formatValue(defaults.numericMissing)} (numericConstant: {formatValue(defaults.numericConstant)})
            </Typography>
            <Typography variant="caption" color="textSecondary">
              scaling: {formatValue(defaults.scaling)}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              encoding.oneHotMaxLevels: {formatValue(defaults.oneHotMaxLevels)}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              rarePropThreshold: {formatValue(defaults.rarePropThreshold)}; highCardinalityThreshold: {formatValue(defaults.highCardinalityThreshold)}
            </Typography>
          </FlexBox>

          <FlexBox
            sx={{
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 2,
              padding: 1.25,
              flexDirection: 'column',
              gap: 0.5,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              Overrides
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Columns overridden: {overrideKeys.length}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {overrideKeys.length ? overrideKeys.slice(0, 12).join(', ') : '—'}
              {overrideKeys.length > 12 ? ' …' : ''}
            </Typography>
          </FlexBox>
        </FlexBox>

        <FlexBox sx={{ mt: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 1 }}>
          <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              Inspect a column
            </Typography>
            <SelectNative
              value={inspectCol}
              onChange={setInspectCol}
              options={columns.map((c) => ({ key: c, label: `${c} (${columnTypes?.[c] || 'unknown'})` }))}
            />
          </FlexBox>

          <FlexBox
            sx={{
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 2,
              padding: 1.25,
              background: 'rgba(0,0,0,0.02)',
              flexDirection: 'column',
              gap: 0.5,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              Effective settings
            </Typography>
            {Object.entries(effective).map(([k, v]) => (
              <Typography key={k} variant="caption" color="textSecondary">
                {k}: {formatValue(v)}
              </Typography>
            ))}
          </FlexBox>
        </FlexBox>
      </FlexBox>
    </SectionCard>
  );
}

AppliedPreprocessingSummary.propTypes = {
  selectedTaskKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  columns: PropTypes.arrayOf(PropTypes.string).isRequired,
  columnTypes: PropTypes.object.isRequired,
  defaults: PropTypes.object.isRequired,
  overrides: PropTypes.object.isRequired,
};
