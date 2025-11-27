// DatasetListTable.jsx
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

const ROWS_PER_PAGE = 4;

const defaultFilters = {
  search: '',
  status: 'ALL',
  runs: 'ALL',          // ALL | HAS_RUNS | NO_RUNS
  uploadedFrom: '',
  uploadedTo: '',
};

// For sorting
const SORT_KEYS = {
  NAME: 'name',
  SIZE: 'size',
  UPLOADED_AT: 'uploadedAt',
  STATUS: 'status',
};

const DatasetListTable = ({ datasets, onViewDataset, onRemoveDataset }) => {
  const [page, setPage] = React.useState(1);
  const [filters, setFilters] = React.useState(defaultFilters);
  const [sortBy, setSortBy] = React.useState(SORT_KEYS.UPLOADED_AT);
  const [sortDirection, setSortDirection] = React.useState('desc'); // 'asc' | 'desc'

  const totalPages = Math.max(1, Math.ceil(datasets.length / ROWS_PER_PAGE));

  // Snap page if datasets length changes
  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // --- Helpers --------------------------------------------------------

  const handleFiltersChange = (nextFilters) => {
    setFilters(nextFilters);
    setPage(1); // reset to first page when filters change
  };

  const handleFiltersReset = () => {
    setFilters(defaultFilters);
    setPage(1);
  };

  const handleSort = (key) => {
    if (sortBy === key) {
      // toggle direction
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

    const map = {
      B: 1,
      KB: 1024,
      MB: 1024 ** 2,
      GB: 1024 ** 3,
      TB: 1024 ** 4,
    };

    const multiplier = map[unit] || 1;
    return value * multiplier;
  };

  const compareValues = (a, b, direction) => {
    if (a < b) return direction === 'asc' ? -1 : 1;
    if (a > b) return direction === 'asc' ? 1 : -1;
    return 0;
  };

  const statusRank = (status) => {
    // Define custom order for statuses
    // e.g. RUNNING > PENDING > FAILED > SUCCESS > null
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

  // --- Filtering ------------------------------------------------------

  const filteredDatasets = datasets.filter((ds) => {
    // Search by name
    if (filters.search) {
      const needle = filters.search.toLowerCase();
      const haystack = ds.name.toLowerCase();
      if (!haystack.includes(needle)) {
        return false;
      }
    }

    // Filter by job status
    if (filters.status !== 'ALL') {
      if (ds.lastJobStatus !== filters.status) {
        return false;
      }
    }

    // Filter by runs (has / no runs)
    if (filters.runs === 'HAS_RUNS' && !ds.lastJobStatus) {
      return false;
    }
    if (filters.runs === 'NO_RUNS' && ds.lastJobStatus) {
      return false;
    }

    // Filter by uploaded date range
    if (filters.uploadedFrom) {
      if (ds.uploadedAt < filters.uploadedFrom) {
        return false;
      }
    }

    if (filters.uploadedTo) {
      if (ds.uploadedAt > filters.uploadedTo) {
        return false;
      }
    }

    return true;
  });

  // --- Sorting --------------------------------------------------------

  const sortedDatasets = [...filteredDatasets].sort((a, b) => {
    switch (sortBy) {
      case SORT_KEYS.NAME:
        return compareValues(a.name.toLowerCase(), b.name.toLowerCase(), sortDirection);
      case SORT_KEYS.SIZE:
        return compareValues(
          parseSizeToBytes(a.size),
          parseSizeToBytes(b.size),
          sortDirection
        );
      case SORT_KEYS.STATUS:
        return compareValues(
          statusRank(a.lastJobStatus),
          statusRank(b.lastJobStatus),
          sortDirection
        );
      case SORT_KEYS.UPLOADED_AT:
      default:
        // uploadedAt is YYYY-MM-DD, string comparison works
        return compareValues(a.uploadedAt, b.uploadedAt, sortDirection);
    }
  });

  // --- Pagination -----------------------------------------------------

  const startIndex = (page - 1) * ROWS_PER_PAGE;
  const paginatedDatasets = sortedDatasets.slice(
    startIndex,
    startIndex + ROWS_PER_PAGE
  );

  // --- Render ---------------------------------------------------------

  return (
    <SurfaceCard sx={{ p: 2, borderRadius: 2, height: '100%' }}>
      <Box
        sx={{
          mb: 1.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Your datasets
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {datasets.length} total
        </Typography>
      </Box>

      {/* Filters */}
      <DatasetTableFilters
        filters={filters}
        onChange={handleFiltersChange}
        onReset={handleFiltersReset}
      />

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sortDirection={sortBy === SORT_KEYS.NAME ? sortDirection : false}>
                <TableSortLabel
                  active={sortBy === SORT_KEYS.NAME}
                  direction={sortBy === SORT_KEYS.NAME ? sortDirection : 'asc'}
                  onClick={() => handleSort(SORT_KEYS.NAME)}
                >
                  Name
                </TableSortLabel>
              </TableCell>

              <TableCell sortDirection={sortBy === SORT_KEYS.SIZE ? sortDirection : false}>
                <TableSortLabel
                  active={sortBy === SORT_KEYS.SIZE}
                  direction={sortBy === SORT_KEYS.SIZE ? sortDirection : 'asc'}
                  onClick={() => handleSort(SORT_KEYS.SIZE)}
                >
                  Size
                </TableSortLabel>
              </TableCell>

              <TableCell
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

              <TableCell>Last job</TableCell>

              <TableCell sortDirection={sortBy === SORT_KEYS.STATUS ? sortDirection : false}>
                <TableSortLabel
                  active={sortBy === SORT_KEYS.STATUS}
                  direction={sortBy === SORT_KEYS.STATUS ? sortDirection : 'asc'}
                  onClick={() => handleSort(SORT_KEYS.STATUS)}
                >
                  Last status
                </TableSortLabel>
              </TableCell>

              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {datasets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ py: 2 }}
                  >
                    No datasets yet. Upload your first dataset to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : paginatedDatasets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ py: 2 }}
                  >
                    No datasets match your filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedDatasets.map((ds) => {
                const canRemove = ds.lastJobStatus === 'SUCCESS';

                return (
                  <TableRow key={ds.id} hover>
                    <TableCell>{ds.name}</TableCell>
                    <TableCell>{ds.size}</TableCell>
                    <TableCell>{ds.uploadedAt}</TableCell>
                    <TableCell>{ds.lastJobId || '—'}</TableCell>
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
                        onView={
                          onViewDataset ? () => onViewDataset(ds) : undefined
                        }
                        onRemove={
                          canRemove && onRemoveDataset
                            ? () => onRemoveDataset(ds)
                            : undefined
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination at the bottom – operates on filtered+sorted list */}
      <PaginationControl
        page={page}
        pageCount={Math.max(1, Math.ceil(filteredDatasets.length / ROWS_PER_PAGE))}
        onChange={setPage}
      />
    </SurfaceCard>
  );
};

DatasetListTable.propTypes = {
  datasets: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      size: PropTypes.string.isRequired,       // e.g. "2.4 MB"
      uploadedAt: PropTypes.string.isRequired, // "YYYY-MM-DD"
      lastJobStatus: PropTypes.oneOf([
        'PENDING',
        'RUNNING',
        'SUCCESS',
        'FAILED',
        null,
      ]),
      lastJobId: PropTypes.string,
    })
  ).isRequired,
  onViewDataset: PropTypes.func,
  onRemoveDataset: PropTypes.func,  // ✨ new
};

export default DatasetListTable;
