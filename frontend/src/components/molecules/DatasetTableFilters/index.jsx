import React from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';

import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const STATUS_OPTIONS = ['ALL', 'PENDING', 'RUNNING', 'SUCCESS', 'FAILED'];
const RUNS_OPTIONS = ['ALL', 'HAS_RUNS', 'NO_RUNS'];

const DatasetTableFilters = ({ filters, onChange, onReset }) => {
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  const handleChange = (key) => (event) => {
    onChange({
      ...filters,
      [key]: event.target.value,
    });
  };

  const hasActiveAdvanced = Boolean(filters.uploadedFrom || filters.uploadedTo);
  const hasAnyFilters =
    Boolean(filters.search) ||
    filters.status !== 'ALL' ||
    filters.runs !== 'ALL' ||
    hasActiveAdvanced;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Primary filters */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',      // mobile
            sm: '1fr',      // tablet
            md: '1fr',      // small desktop / tablet landscape
            lg: '2fr 1fr 1fr auto', // desktop only
          },
          gap: 1.25,
          alignItems: 'center',
          mb: 1,
        }}
      >
        <TextField
          size="small"
          label="Search datasets"
          placeholder="Search by name…"
          value={filters.search}
          onChange={handleChange('search')}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          select
          size="small"
          label="Status"
          value={filters.status}
          onChange={handleChange('status')}
          fullWidth
        >
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt === 'ALL' ? 'All statuses' : opt}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Runs"
          value={filters.runs}
          onChange={handleChange('runs')}
          fullWidth
        >
          {RUNS_OPTIONS.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt === 'ALL' ? 'All' : opt === 'HAS_RUNS' ? 'With runs' : 'No runs'}
            </MenuItem>
          ))}
        </TextField>

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Tooltip title={advancedOpen ? 'Hide advanced filters' : 'Show advanced filters'}>
            <IconButton
              onClick={() => setAdvancedOpen((v) => !v)}
              size="small"
              sx={{
                border: (t) => `1px solid ${t.palette.divider}`,
                borderRadius: 2,
                bgcolor: hasActiveAdvanced ? 'action.selected' : 'transparent',
              }}
            >
              <TuneIcon fontSize="small" />
              {advancedOpen ? (
                <ExpandLessIcon fontSize="small" />
              ) : (
                <ExpandMoreIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>

          <Tooltip title={hasAnyFilters ? 'Reset filters' : 'No filters to reset'}>
            <span>
              <Button
                size="small"
                variant="outlined"
                onClick={onReset}
                disabled={!hasAnyFilters}
                startIcon={<RestartAltIcon />}
              >
                Reset
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {/* Advanced filters */}
      <Collapse in={advancedOpen} timeout="auto" unmountOnExit>
        <Divider sx={{ my: 1.25 }} />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: '1fr',
              md: '1fr',
              lg: '1fr 1fr',
            },
            gap: 1.25,
          }}
        >
          <TextField
            size="small"
            label="Uploaded from"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={filters.uploadedFrom}
            onChange={handleChange('uploadedFrom')}
            fullWidth
          />

          <TextField
            size="small"
            label="Uploaded to"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={filters.uploadedTo}
            onChange={handleChange('uploadedTo')}
            fullWidth
          />
        </Box>
      </Collapse>
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
  onChange: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
};

export default DatasetTableFilters;
