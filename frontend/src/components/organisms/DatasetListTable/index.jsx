import React from 'react';
import PropTypes from 'prop-types';

import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import StatusChip from '../../atoms/StatusChip';
import PaginationControl from '../../atoms/PaginationControl';
import DatasetTableFilters from '../../molecules/DatasetTableFilters';
import { useToast } from '../../organisms/ToastProvider';

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
import Checkbox from '@mui/material/Checkbox';

import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import FilterListIcon from '@mui/icons-material/FilterList';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useNavigate } from 'react-router-dom';

const ROWS_PER_PAGE = 4;

const defaultFilters = {
  search: '',
  status: 'ALL',
  runs: 'ALL',
  uploadedFrom: '',
  uploadedTo: '',
};

const SORT_KEYS = {
  JOB_ID: 'lastJobId',
  NAME: 'name',
  SIZE: 'size',
  UPLOADED_AT: 'uploadedAt',
  STATUS: 'status',
};

const DatasetListTable = ({ datasets, onRemoveDataset }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { showToast } = useToast();

  // Cards on small screens, table on md+
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  const [page, setPage] = React.useState(1);
  const [filters, setFilters] = React.useState(defaultFilters);
  const [sortBy, setSortBy] = React.useState(SORT_KEYS.UPLOADED_AT);
  const [sortDirection, setSortDirection] = React.useState('desc');
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const [selectedIds, setSelectedIds] = React.useState(() => new Set());

  const totalPages = Math.max(1, Math.ceil(datasets.length / ROWS_PER_PAGE));

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleFiltersChange = (nextFilters) => {
    setFilters(nextFilters);
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleFiltersReset = () => {
    setFilters(defaultFilters);
    setPage(1);
    setSelectedIds(new Set());
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
      case SORT_KEYS.JOB_ID: {
        const aVal = a.lastJobId || '';
        const bVal = b.lastJobId || '';
        return compareValues(aVal, bVal, sortDirection);
      }
      case SORT_KEYS.UPLOADED_AT:
      default:
        return compareValues(a.uploadedAt, b.uploadedAt, sortDirection);
    }
  });

  const startIndex = (page - 1) * ROWS_PER_PAGE;
  const paginatedDatasets = sortedDatasets.slice(startIndex, startIndex + ROWS_PER_PAGE);

  const pageIds = paginatedDatasets.map((d) => d.id);
  const selectedOnPageCount = pageIds.filter((id) => selectedIds.has(id)).length;
  const allSelectedOnPage = pageIds.length > 0 && selectedOnPageCount === pageIds.length;
  const someSelectedOnPage = selectedOnPageCount > 0 && !allSelectedOnPage;

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!onRemoveDataset) return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      await onRemoveDataset(id);
    }
    setSelectedIds(new Set());
  };

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

  // ---- Sticky left columns (checkbox + dataset id) -------------------
  const CHECKBOX_COL_W = 48;
  const DATASET_ID_COL_W = 220;

  const stickyLeftBase = {
    position: 'sticky',
    bgcolor: 'background.paper',
    zIndex: 2,
  };

  const stickyLeftHeadBase = {
    ...stickyLeftBase,
    zIndex: 6,
  };

  const stickyCheckboxCellSx = (isHeader) => ({
    ...(isHeader ? stickyLeftHeadBase : stickyLeftBase),
    left: 0,
    width: CHECKBOX_COL_W,
    minWidth: CHECKBOX_COL_W,
    maxWidth: CHECKBOX_COL_W,
  });

  const stickyDatasetIdCellSx = (isHeader) => ({
    ...(isHeader ? stickyLeftHeadBase : stickyLeftBase),
    left: CHECKBOX_COL_W,
    width: DATASET_ID_COL_W,
    minWidth: DATASET_ID_COL_W,
    maxWidth: DATASET_ID_COL_W,
  });

  const canOpenDataset = (ds) => ds?.lastJobStatus === 'SUCCESS';

  // NEW: card click handler (mobile/tablet)
  const handleCardOpen = (ds) => {
    if (canOpenDataset(ds)) {
      navigate(`/dataset-view/${ds.id}`);
      return;
    }
    showToast?.(
      'View is not available until the latest run finishes successfully.',
      'info'
    );
  };

// Mobile/tablet cards: single-row layout, no overflow, checkbox in first row
const DatasetCardRow = ({ ds }) => {
  const clickable = canOpenDataset(ds);

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => handleCardOpen(ds)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardOpen(ds);
        }
      }}
      sx={{
        border: (t) => `1px solid ${t.palette.divider}`,
        borderRadius: 2,
        p: 1.25,
        bgcolor: 'background.paper',
        minWidth: 0,
        cursor: clickable ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        overflow: 'hidden',

        '&:hover': clickable ? { boxShadow: 2 } : undefined,
        outline: 'none',
        '&:focus-visible': {
          outline: (t) => `2px solid ${t.palette.primary.main}`,
          outlineOffset: '2px',
        },
      }}
    >
      {/* Checkbox (first row) */}
      <Checkbox
        size="small"
        checked={selectedIds.has(ds.id)}
        onClick={(e) => e.stopPropagation()}
        onChange={() => toggleOne(ds.id)}
        inputProps={{ 'aria-label': `select dataset ${ds.name}` }}
        sx={{ p: 0.5 }}
      />

      {/* Middle content (single line, ellipsis) */}
      <Box
        sx={{
          minWidth: 0,
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          overflow: 'hidden',
        }}
      >
        {/* Name */}
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, minWidth: 0 }}
          noWrap
          title={ds.name}
        >
          {ds.name}
        </Typography>

        {/* Secondary meta (kept in same row, ellipsis if needed) */}
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{ minWidth: 0, flex: 1 }}
          noWrap
          title={`ID: ${ds.id} • ${ds.uploadedAt} • ${ds.size}`}
        >
          {`ID: ${ds.id} • ${ds.uploadedAt} • ${ds.size}`}
        </Typography>
      </Box>

      {/* Status (right) */}
      <Box sx={{ flexShrink: 0 }}>
        {ds.lastJobStatus ? (
          <StatusChip status={ds.lastJobStatus} />
        ) : (
          <Typography variant="caption" color="textSecondary" noWrap>
            No runs
          </Typography>
        )}
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
          gap: 1.5,
          minWidth: 0,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
            Your datasets
          </Typography>
          <Typography variant="body2" color="textSecondary" noWrap>
            {datasets.length} total
            {selectedIds.size > 0 ? ` • ${selectedIds.size} selected` : ''}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={selectedIds.size ? 'Delete selected' : 'Select datasets to delete'}>
            <span>
              <IconButton
                aria-label="delete selected datasets"
                onClick={handleBulkDelete}
                size="small"
                disabled={!onRemoveDataset || selectedIds.size === 0}
                sx={{
                  border: (t) => `1px solid ${t.palette.divider}`,
                  borderRadius: 2,
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

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
      ) : isMdUp ? (
        <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
          <Table size="small" stickyHeader sx={{ width: '100%', tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={stickyCheckboxCellSx(true)}>
                  <Checkbox
                    size="small"
                    checked={allSelectedOnPage}
                    indeterminate={someSelectedOnPage}
                    onChange={toggleAllOnPage}
                    inputProps={{ 'aria-label': 'select all datasets on this page' }}
                  />
                </TableCell>

                <TableCell
                  sx={stickyDatasetIdCellSx(true)}
                  sortDirection={sortBy === SORT_KEYS.JOB_ID ? sortDirection : false}
                >
                  <TableSortLabel
                    active={sortBy === SORT_KEYS.JOB_ID}
                    direction={sortBy === SORT_KEYS.JOB_ID ? sortDirection : 'asc'}
                    onClick={() => handleSort(SORT_KEYS.JOB_ID)}
                  >
                    Dataset ID
                  </TableSortLabel>
                </TableCell>

                <TableCell sx={{ width: 260 }}>Name</TableCell>
                <TableCell sx={{ width: 120 }}>Size</TableCell>
                <TableCell sx={{ width: 140 }}>Uploaded</TableCell>
                <TableCell sx={{ width: 160 }}>Last status</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedDatasets.map((ds) => {
                const clickable = canOpenDataset(ds);

                return (
                  <TableRow key={ds.id} hover>
                    <TableCell sx={stickyCheckboxCellSx(false)}>
                      <Checkbox
                        size="small"
                        checked={selectedIds.has(ds.id)}
                        onChange={() => toggleOne(ds.id)}
                        inputProps={{ 'aria-label': `select dataset ${ds.name}` }}
                      />
                    </TableCell>

                    <TableCell
                      sx={{
                        ...stickyDatasetIdCellSx(false),
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={ds.id || '—'}
                    >
                      {ds.id ? (
                        clickable ? (
                          <Box
                            component="button"
                            type="button"
                            onClick={() => navigate(`/dataset-view/${ds.id}`)}
                            title={ds.id}
                            style={{
                              all: 'unset',
                              cursor: 'pointer',
                              display: 'inline-block',
                              maxWidth: '100%',
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                navigate(`/dataset-view/${ds.id}`);
                              }
                            }}
                          >
                            <Box
                              component="span"
                              sx={{
                                display: 'inline-block',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: 'primary.main',
                                fontWeight: 600,
                                '&:hover': { textDecoration: 'underline' },
                                '&:focus-visible': {
                                  outline: (t) => `2px solid ${t.palette.primary.main}`,
                                  outlineOffset: '2px',
                                  borderRadius: 0.5,
                                },
                              }}
                            >
                              {ds.id}
                            </Box>
                          </Box>
                        ) : (
                          <Box
                            component="span"
                            sx={{
                              display: 'inline-block',
                              maxWidth: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontWeight: 700,
                              color: 'text.primary',
                            }}
                          >
                            {ds.id}
                          </Box>
                        )
                      ) : (
                        '—'
                      )}
                    </TableCell>

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

                    <TableCell>
                      {ds.lastJobStatus ? (
                        <StatusChip status={ds.lastJobStatus} />
                      ) : (
                        <Typography variant="caption" color="textSecondary">
                          No runs
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
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
  onRemoveDataset: PropTypes.func,
};

export default DatasetListTable;
