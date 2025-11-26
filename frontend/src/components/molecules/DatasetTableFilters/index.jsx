import React from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

const STATUS_OPTIONS = ['ALL', 'PENDING', 'RUNNING', 'SUCCESS', 'FAILED'];
const RUNS_OPTIONS = ['ALL', 'HAS_RUNS', 'NO_RUNS'];

const DatasetTableFilters = ({ filters, onChange, onReset }) => {
  const handleChange = (key) => (event) => {
    onChange({
      ...filters,
      [key]: event.target.value,
    });
  };

  const handleReset = () => {
    onReset();
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        {/* Search by name */}
        <TextField
          size="small"
          label="Search name"
          variant="outlined"
          value={filters.search}
          onChange={handleChange('search')}
          fullWidth
        />

        {/* Filter by job status */}
        <TextField
          select
          size="small"
          label="Job status"
          variant="outlined"
          value={filters.status}
          onChange={handleChange('status')}
          sx={{ minWidth: 150 }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt === 'ALL' ? 'All statuses' : opt}
            </MenuItem>
          ))}
        </TextField>

        {/* Has runs / no runs */}
        <TextField
          select
          size="small"
          label="Runs"
          variant="outlined"
          value={filters.runs}
          onChange={handleChange('runs')}
          sx={{ minWidth: 150 }}
        >
          {RUNS_OPTIONS.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt === 'ALL'
                ? 'All datasets'
                : opt === 'HAS_RUNS'
                ? 'With runs'
                : 'Without runs'}
            </MenuItem>
          ))}
        </TextField>

        {/* Uploaded date from */}
        <TextField
          size="small"
          label="Uploaded from"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={filters.uploadedFrom}
          onChange={handleChange('uploadedFrom')}
        />

        {/* Uploaded date to */}
        <TextField
          size="small"
          label="Uploaded to"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={filters.uploadedTo}
          onChange={handleChange('uploadedTo')}
        />

        {/* Reset */}
        <Button
          size="small"
          variant="outlined"
          onClick={handleReset}
        >
          Reset
        </Button>
      </Stack>
    </Box>
  );
};

DatasetTableFilters.propTypes = {
  filters: PropTypes.shape({
    search: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    runs: PropTypes.string.isRequired,
    uploadedFrom: PropTypes.string.isRequired,
    uploadedTo: PropTypes.string.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired, // (nextFilters) => void
  onReset: PropTypes.func.isRequired,
};

export default DatasetTableFilters;
