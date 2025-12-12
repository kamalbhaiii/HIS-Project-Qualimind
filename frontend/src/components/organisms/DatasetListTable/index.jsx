import React from 'react';
import PropTypes from 'prop-types';

import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import StatusChip from '../../atoms/StatusChip';
import DatasetRowActions from '../../molecules/DatasetRowActions';
import PaginationControl from '../../atoms/PaginationControl';
import DatasetTableFilters from '../../molecules/DatasetTableFilters';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import TableSortLabel from '@mui/material/TableSortLabel';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import FilterListIcon from '@mui/icons-material/FilterList';

const ROWS_PER_PAGE = 4;

const defaultFilters = {
  search: '',
  status: 'ALL',
  runs: 'ALL', // ALL | HAS_RUNS | NO_RUNS
  uploadedFrom: '',
  uploadedTo: '',
};

const SORT_KEYS = {
  NAME: 'name',
  SIZE: 'size',
  UPLOADED_AT: 'uploadedAt',
  STATUS: 'status',
};

const DatasetListTable = ({ datasets, onViewDataset, onRemoveDataset }) => {
  const theme = useTheme();

  // Use stacked rows on phones + tablets
  const isLgUp = useMediaQuery(theme.breakpoints.up('md')); // table only on lg+

  const [page, setPage] = React.useState(1);
  const [filters, setFilters] = React.useState(defaultFilters);
  const [sortBy, setSortBy] = React.useState(SORT_KEYS.UPLOADED_AT);
  const [sortDirection, setSortDirection] = React.useState('desc');

  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const totalPages = Math.max(1, Math.ceil(datasets.length / ROWS_PER_PAGE));

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleFiltersChange = (nextFilters) => {
    setFilters(nextFilters);
    setPage(1);
  };

  const handleFiltersReset = () => {
    setFilters(defaultFilters);
    setPage(1);
  };

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDirection('asc');
    }
  };

  const parseSizeToBytes = (sizeStr) => {
    if (!sizeStr) return 0;
    const [valueStr, unitRaw] = sizeStr.split(' ');
    const value = parseFloat(valueStr);
    if (Number.isNaN(value)) return 0;
    const unit = (unitRaw || '').toUpperCase();

    const map = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
    return value * (map[unit] || 1);
  };

  const compareValues = (a, b, direction) => {
    if (a < b) return direction === 'asc' ? -1 : 1;
    if (a > b) return direction === 'asc' ? 1 : -1;
    return 0;
  };

  const statusRank = (status) => {
    switch (status) {
      case 'RUNNING':
        return 4;
      case 'PENDING':
        return 3;
      case 'FAILED':
        return 2;
      case 'SUCCESS':
        return 1;
      default:
        return 0;
    }
  };

  const filteredDatasets = datasets.filter((ds) => {
    if (filters.search) {
      const needle = filters.search.toLowerCase();
      const haystack = ds.name.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }

    if (filters.status !== 'ALL' && ds.lastJobStatus !== filters.status) return false;

    if (filters.runs === 'HAS_RUNS' && !ds.lastJobStatus) return false;
    if (filters.runs === 'NO_RUNS' && ds.lastJobStatus) return false;

    if (filters.uploadedFrom && ds.uploadedAt < filters.uploadedFrom) return false;
    if (filters.uploadedTo && ds.uploadedAt > filters.uploadedTo) return false;

    return true;
  });

  const sortedDatasets = [...filteredDatasets].sort((a, b) => {
    switch (sortBy) {
      case SORT_KEYS.NAME:
        return compareValues(a.name.toLowerCase(), b.name.toLowerCase(), sortDirection);
      case SORT_KEYS.SIZE:
        return compareValues(parseSizeToBytes(a.size), parseSizeToBytes(b.size), sortDirection);
      case SORT_KEYS.STATUS:
        return compareValues(statusRank(a.lastJobStatus), statusRank(b.lastJobStatus), sortDirection);
      case SORT_KEYS.UPLOADED_AT:
      default:
        return compareValues(a.uploadedAt, b.uploadedAt, sortDirection);
    }
  });

  const startIndex = (page - 1) * ROWS_PER_PAGE;
  const paginatedDatasets = sortedDatasets.slice(startIndex, startIndex + ROWS_PER_PAGE);

  const hasActiveFilters =
    filters.search ||
    filters.status !== 'ALL' ||
    filters.runs !== 'ALL' ||
    filters.uploadedFrom ||
    filters.uploadedTo;

  const renderEmptyState = (message) => (
    <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
      {message}
    </Typography>
  );

  // Mobile/tablet card row
  const DatasetCardRow = ({ ds }) => {
    return (
      <Box
        sx={{
          border: (t) => `1px solid ${t.palette.divider}`,
          borderRadius: 2,
          p: 1.25,
          bgcolor: 'background.paper',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, minWidth: 0 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap title={ds.name}>
              {ds.name}
            </Typography>
            <Typography variant="caption" color="textSecondary" noWrap>
              Uploaded: {ds.uploadedAt} • Size: {ds.size}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {ds.lastJobStatus ? (
              <StatusChip status={ds.lastJobStatus} />
            ) : (
              <Typography variant="caption" color="textSecondary" sx={{ whiteSpace: 'nowrap' }}>
                No runs
              </Typography>
            )}
          </Box>
        </Box>

        <Divider />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="textSecondary" noWrap>
            Last job: {ds.lastJobId || '—'}
          </Typography>

          <DatasetRowActions
            status={ds.status}
            onView={onViewDataset ? () => onViewDataset(ds) : undefined}
            onDelete={onRemoveDataset ? () => onRemoveDataset(ds.id) : undefined}
          />
        </Box>
      </Box>
    );
  };

  DatasetCardRow.propTypes = {
    ds: PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      size: PropTypes.string.isRequired,
      uploadedAt: PropTypes.string.isRequired,
      lastJobStatus: PropTypes.oneOf(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', null]),
      lastJobId: PropTypes.string,
      status: PropTypes.oneOf(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', null]),
    }).isRequired,
  };

  return (
    <SurfaceCard
      sx={{
        p: 2,
        borderRadius: 2,
        height: '100%',
        width: '100%',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          mb: 1.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          minWidth: 0,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
            Your datasets
          </Typography>
          <Typography variant="body2" color="textSecondary" noWrap>
            {datasets.length} total
          </Typography>
        </Box>

        <Tooltip title={filtersOpen ? 'Hide filters' : 'Show filters'}>
          <IconButton
            aria-label="toggle filters"
            onClick={() => setFiltersOpen((v) => !v)}
            size="small"
            sx={{
              border: (t) => `1px solid ${t.palette.divider}`,
              borderRadius: 2,
              bgcolor: hasActiveFilters ? 'action.selected' : 'transparent',
            }}
          >
            <FilterListIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Filters */}
      <Collapse in={filtersOpen} timeout="auto" unmountOnExit>
        <Box sx={{ mb: 1.5 }}>
          <DatasetTableFilters
            filters={filters}
            onChange={handleFiltersChange}
            onReset={handleFiltersReset}
          />
        </Box>
        <Divider sx={{ mb: 1.5 }} />
      </Collapse>

      {/* Content */}
      {datasets.length === 0 ? (
        renderEmptyState('No datasets yet. Upload your first dataset to get started.')
      ) : paginatedDatasets.length === 0 ? (
        renderEmptyState('No datasets match your filters.')
      ) : isLgUp ? (
        // Desktop table (lg+)
        <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
          <Table size="small" stickyHeader sx={{ width: '100%', tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{ width: 260 }}
                  sortDirection={sortBy === SORT_KEYS.NAME ? sortDirection : false}
                >
                  <TableSortLabel
                    active={sortBy === SORT_KEYS.NAME}
                    direction={sortBy === SORT_KEYS.NAME ? sortDirection : 'asc'}
                    onClick={() => handleSort(SORT_KEYS.NAME)}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>

                <TableCell
                  sx={{ width: 120 }}
                  sortDirection={sortBy === SORT_KEYS.SIZE ? sortDirection : false}
                >
                  <TableSortLabel
                    active={sortBy === SORT_KEYS.SIZE}
                    direction={sortBy === SORT_KEYS.SIZE ? sortDirection : 'asc'}
                    onClick={() => handleSort(SORT_KEYS.SIZE)}
                  >
                    Size
                  </TableSortLabel>
                </TableCell>

                <TableCell
                  sx={{ width: 140 }}
                  sortDirection={sortBy === SORT_KEYS.UPLOADED_AT ? sortDirection : false}
                >
                  <TableSortLabel
                    active={sortBy === SORT_KEYS.UPLOADED_AT}
                    direction={sortBy === SORT_KEYS.UPLOADED_AT ? sortDirection : 'asc'}
                    onClick={() => handleSort(SORT_KEYS.UPLOADED_AT)}
                  >
                    Uploaded
                  </TableSortLabel>
                </TableCell>

                <TableCell sx={{ width: 140 }}>Last job</TableCell>

                <TableCell
                  sx={{ width: 140 }}
                  sortDirection={sortBy === SORT_KEYS.STATUS ? sortDirection : false}
                >
                  <TableSortLabel
                    active={sortBy === SORT_KEYS.STATUS}
                    direction={sortBy === SORT_KEYS.STATUS ? sortDirection : 'asc'}
                    onClick={() => handleSort(SORT_KEYS.STATUS)}
                  >
                    Last status
                  </TableSortLabel>
                </TableCell>

                <TableCell sx={{ width: 120 }} align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedDatasets.map((ds) => (
                <TableRow key={ds.id} hover>
                  <TableCell
                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={ds.name}
                  >
                    {ds.name}
                  </TableCell>

                  <TableCell
                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={ds.size}
                  >
                    {ds.size}
                  </TableCell>

                  <TableCell
                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={ds.uploadedAt}
                  >
                    {ds.uploadedAt}
                  </TableCell>

                  <TableCell
                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={ds.lastJobId || '—'}
                  >
                    {ds.lastJobId || '—'}
                  </TableCell>

                  <TableCell>
                    {ds.lastJobStatus ? (
                      <StatusChip status={ds.lastJobStatus} />
                    ) : (
                      <Typography variant="caption" color="textSecondary">
                        No runs
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell align="right">
                    <DatasetRowActions
                      status={ds.status}
                      onView={onViewDataset ? () => onViewDataset(ds) : undefined}
                      onDelete={onRemoveDataset ? () => onRemoveDataset(ds.id) : undefined}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        // Mobile/tablet stacked rows
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          {paginatedDatasets.map((ds) => (
            <DatasetCardRow key={ds.id} ds={ds} />
          ))}
        </Box>
      )}

      {/* Pagination */}
      <Box sx={{ mt: 1.5 }}>
        <PaginationControl
          page={page}
          pageCount={Math.max(1, Math.ceil(filteredDatasets.length / ROWS_PER_PAGE))}
          onChange={setPage}
        />
      </Box>
    </SurfaceCard>
  );
};

DatasetListTable.propTypes = {
  datasets: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      size: PropTypes.string.isRequired,
      uploadedAt: PropTypes.string.isRequired,
      lastJobStatus: PropTypes.oneOf(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', null]),
      lastJobId: PropTypes.string,
      status: PropTypes.oneOf(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', null]),
    })
  ).isRequired,
  onViewDataset: PropTypes.func,
  onRemoveDataset: PropTypes.func,
};

export default DatasetListTable;
