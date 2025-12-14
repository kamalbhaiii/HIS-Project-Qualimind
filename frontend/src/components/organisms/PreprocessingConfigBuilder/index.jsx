import React from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '../atoms/CustomTypography';
import Divider from '@mui/material/Divider';

import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

const TASK_LABELS = {
  label_cleaning: 'Label cleaning',
  encoding: 'Encoding',
  scaling: 'Scaling',
  type_inference: 'Type inference',
  missing_values: 'Missing values',
  cardinality_reduction: 'Cardinality reduction',
};

const METHOD_OPTIONS = {
  label_cleaning: [
    { value: 'standard', label: 'Standard' },
  ],
  encoding: [
    { value: 'auto', label: 'Auto' },
    { value: 'one_hot', label: 'One-hot' },
    { value: 'label', label: 'Label encoding' },
    { value: 'frequency', label: 'Frequency encoding' },
  ],
  scaling: [
    { value: 'minmax', label: 'Min-max' },
    { value: 'zscore', label: 'Z-score' },
  ],
  type_inference: [
    { value: 'numeric_like', label: 'Numeric-like inference' },
  ],
};

function safeNumber(v) {
  if (v === '' || v == null) return '';
  const n = Number(v);
  return Number.isFinite(n) ? n : '';
}

export default function PreprocessingConfigBuilder({
  columns,
  value,
  onChange,
}) {
  const cfg = value || { version: '1.0', steps: [] };

  const updateStep = (idx, patch) => {
    const next = { ...cfg, steps: cfg.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)) };
    onChange(next);
  };

  const updateAppliesTo = (idx, patch) => {
    const s = cfg.steps[idx];
    updateStep(idx, { appliesTo: { ...(s.appliesTo || {}), ...patch } });
  };

  const updateParams = (idx, patch) => {
    const s = cfg.steps[idx];
    updateStep(idx, { params: { ...(s.params || {}), ...patch } });
  };

  if (!cfg.steps || cfg.steps.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary">
        No suggested configuration yet. Click “Suggest configuration” to generate one.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      {cfg.steps.map((step, idx) => {
        const task = step.task;
        const methodOptions = METHOD_OPTIONS[task] || [{ value: step.method, label: step.method }];
        const stepTitle = TASK_LABELS[task] || task;

        const appliesTo = step.appliesTo || {};
        const types = appliesTo.types || [];
        const selectedColumns = appliesTo.columns || [];

        const showColumnsPicker = columns && columns.length > 0;

        return (
          <Card
            key={`${task}-${idx}`}
            sx={{
              borderRadius: 2,
              border: (t) => `1px solid ${t.palette.divider}`,
              boxShadow: 'none',
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {stepTitle}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Task: {task}
                  </Typography>
                </Box>

                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel id={`method-${idx}`}>Method</InputLabel>
                  <Select
                    labelId={`method-${idx}`}
                    value={step.method || ''}
                    label="Method"
                    onChange={(e) => updateStep(idx, { method: e.target.value })}
                  >
                    {methodOptions.map((m) => (
                      <MenuItem key={m.value} value={m.value}>
                        {m.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Divider sx={{ my: 1.25 }} />

              {/* AppliesTo */}
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>
                Applies to
              </Typography>

              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 0.75 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={types.includes('categorical')}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? Array.from(new Set([...types, 'categorical']))
                          : types.filter((t) => t !== 'categorical');
                        updateAppliesTo(idx, { types: next });
                      }}
                    />
                  }
                  label="Categorical"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={types.includes('numeric')}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? Array.from(new Set([...types, 'numeric']))
                          : types.filter((t) => t !== 'numeric');
                        updateAppliesTo(idx, { types: next });
                      }}
                    />
                  }
                  label="Numeric"
                />
              </Stack>

              {showColumnsPicker && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="textSecondary">
                    Optional: target specific columns
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
                    {columns.map((c) => {
                      const selected = selectedColumns.includes(c);
                      return (
                        <Chip
                          key={c}
                          label={c}
                          size="small"
                          variant={selected ? 'filled' : 'outlined'}
                          onClick={() => {
                            const next = selected
                              ? selectedColumns.filter((x) => x !== c)
                              : [...selectedColumns, c];
                            updateAppliesTo(idx, { columns: next });
                          }}
                          sx={{ borderRadius: 2 }}
                        />
                      );
                    })}
                  </Box>
                </Box>
              )}

              {/* Params (simple, task-aware) */}
              {task === 'encoding' && (
                <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <TextField
                    size="small"
                    label="one_hot_max_levels"
                    value={step.params?.one_hot_max_levels ?? ''}
                    onChange={(e) => updateParams(idx, { one_hot_max_levels: safeNumber(e.target.value) })}
                    sx={{ width: 220 }}
                    helperText="One-hot when levels ≤ this value"
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}

PreprocessingConfigBuilder.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.string),
  value: PropTypes.shape({
    version: PropTypes.string,
    steps: PropTypes.array,
  }),
  onChange: PropTypes.func.isRequired,
};
