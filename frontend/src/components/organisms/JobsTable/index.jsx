// src/components/organisms/JobsTable.jsx
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

const SORT_KEYS = {
  ID: 'id',
  DATASET: 'datasetName',
  STATUS: 'status',
  CREATED: 'createdAt',
  FINISHED: 'finishedAt',
};

const ROWS_PER_PAGE = 5;

const defaultFilters = {
  search: '',
  status: 'ALL',
  runs: 'ALL', // unused for jobs; kept for compatibility
  uploadedFrom: '',
  uploadedTo: '',
};

const JobsTable = ({ jobs, onViewJob, onDeleteJob }) => {
  const theme = useTheme();
  const { showToast } = useToast();

  // Cards on small screens, table on md+
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  const [sortBy, setSortBy] = React.useState(SORT_KEYS.CREATED);
  const [sortDirection, setSortDirection] = React.useState('desc');
  const [page, setPage] = React.useState(1);
  const [filters, setFilters] = React.useState(defaultFilters);

  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState(() => new Set());

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

  const compareValues = (a, b, direction) => {
    if (a === null || a === undefined) a = '';
    if (b === null || b === undefined) b = '';
    if (a < b) return direction === 'asc' ? -1 : 1;
    if (a > b) return direction === 'asc' ? 1 : -1;
    return 0;
  };

  const getSortValue = (job, key) => {
    switch (key) {
      case SORT_KEYS.ID:
        return job.id || '';
      case SORT_KEYS.DATASET:
        return job.datasetName?.toLowerCase() || '';
      case SORT_KEYS.STATUS:
        return job.status || '';
      case SORT_KEYS.CREATED:
        return job.createdAtRaw || job.createdAt || '';
      case SORT_KEYS.FINISHED:
        return job.finishedAtRaw || job.finishedAt || '';
      default:
        return '';
    }
  };

  const filteredJobs = React.useMemo(() => {
    return jobs.filter((job) => {
      const { search, status, uploadedFrom, uploadedTo } = filters;

      if (search) {
        const needle = search.toLowerCase();
        const haystack = `${job.id} ${job.datasetName || ''}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      if (status !== 'ALL' && job.status !== status) return false;

      const createdIso = job.createdAtRaw || job.createdAtRawStr || job.createdAt;
      if (uploadedFrom && createdIso) {
        const createdDateOnly = createdIso.slice(0, 10);
        if (createdDateOnly < uploadedFrom) return false;
      }
      if (uploadedTo && createdIso) {
        const createdDateOnly = createdIso.slice(0, 10);
        if (createdDateOnly > uploadedTo) return false;
      }

      return true;
    });
  }, [jobs, filters]);

  const sortedJobs = React.useMemo(() => {
    const copy = [...filteredJobs];
    copy.sort((a, b) =>
      compareValues(getSortValue(a, sortBy), getSortValue(b, sortBy), sortDirection)
    );
    return copy;
  }, [filteredJobs, sortBy, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(sortedJobs.length / ROWS_PER_PAGE));

  React.useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const startIndex = (page - 1) * ROWS_PER_PAGE;
  const paginatedJobs = sortedJobs.slice(startIndex, startIndex + ROWS_PER_PAGE);

  // Selection (current page)
  const pageIds = paginatedJobs.map((j) => j.id);
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
      if (allSelectedOnPage) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!onDeleteJob) return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      await onDeleteJob(jobs.find((j) => j.id === id));
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

  // Sticky left columns (checkbox + Job ID)
  const CHECKBOX_COL_W = 48;
  const JOB_ID_COL_W = 220;

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

  const stickyJobIdCellSx = (isHeader) => ({
    ...(isHeader ? stickyLeftHeadBase : stickyLeftBase),
    left: CHECKBOX_COL_W,
    width: JOB_ID_COL_W,
    minWidth: JOB_ID_COL_W,
    maxWidth: JOB_ID_COL_W,
  });

  // “Twist”: Job ID click uses same logic as view button
  const canViewJob = (job) => job.status === 'SUCCESS' && !!onViewJob;

  const handleCardOpen = (job) => {
    if (canViewJob(job)) {
      onViewJob(job);
      return;
    }
    showToast?.('View is not available until the job finishes successfully.', 'info');
  };

  const JobIdCell = ({ job }) => {
    const clickable = canViewJob(job);

    return (
      <TableCell
        sx={{
          ...stickyJobIdCellSx(false),
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={job.id || '—'}
      >
        {job.id ? (
          clickable ? (
            <Box
              component="button"
              type="button"
              onClick={() => onViewJob(job)}
              title={job.id}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'inline-block',
                maxWidth: '100%',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onViewJob(job);
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
                {job.id}
              </Box>
            </Box>
          ) : (
            <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {job.id}
            </Box>
          )
        ) : (
          '—'
        )}
      </TableCell>
    );
  };

  JobIdCell.propTypes = {
    job: PropTypes.shape({
      id: PropTypes.string,
      status: PropTypes.string,
    }).isRequired,
  };

  // Mobile/tablet stacked rows: single row, checkbox first row, no overflow, tap card to view (SUCCESS only)
  const JobCardRow = ({ job }) => {
    const clickable = canViewJob(job);

    return (
      <Box
        role="button"
        tabIndex={0}
        onClick={() => handleCardOpen(job)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardOpen(job);
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
        <Checkbox
          size="small"
          checked={selectedIds.has(job.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggleOne(job.id)}
          inputProps={{ 'aria-label': `select job ${job.id}` }}
          sx={{ p: 0.5 }}
        />

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
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, minWidth: 0 }}
            noWrap
            title={job.datasetName || '—'}
          >
            {job.datasetName || '—'}
          </Typography>

          <Typography
            variant="caption"
            color="textSecondary"
            sx={{ minWidth: 0, flex: 1 }}
            noWrap
            title={`Job: ${job.id} • ${job.createdAt || '—'} • ${job.finishedAt || '—'} • ${job.duration || '—'}`}
          >
            {`Job: ${job.id} • ${job.createdAt || '—'} • ${job.finishedAt || '—'} • ${job.duration || '—'}`}
          </Typography>
        </Box>

        <Box sx={{ flexShrink: 0 }}>
          <StatusChip status={job.status} />
        </Box>
      </Box>
    );
  };

  JobCardRow.propTypes = {
    job: PropTypes.shape({
      id: PropTypes.string.isRequired,
      datasetName: PropTypes.string,
      status: PropTypes.oneOf(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED']).isRequired,
      createdAt: PropTypes.string,
      finishedAt: PropTypes.string,
      duration: PropTypes.string,
    }).isRequired,
  };

  return (
    <SurfaceCard sx={{ p: 2, borderRadius: 2, width: '100%', minWidth: 0, overflow: 'hidden' }}>
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
            Jobs
          </Typography>
          <Typography variant="body2" color="textSecondary" noWrap>
            {jobs.length} total
            {selectedIds.size > 0 ? ` • ${selectedIds.size} selected` : ''}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={selectedIds.size ? 'Delete selected' : 'Select jobs to delete'}>
            <span>
              <IconButton
                aria-label="delete selected jobs"
                onClick={handleBulkDelete}
                size="small"
                disabled={!onDeleteJob || selectedIds.size === 0}
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
      {jobs.length === 0 ? (
        renderEmptyState('No jobs yet.')
      ) : paginatedJobs.length === 0 ? (
        renderEmptyState('No jobs match your filters.')
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
                    inputProps={{ 'aria-label': 'select all jobs on this page' }}
                  />
                </TableCell>

                <TableCell
                  sx={stickyJobIdCellSx(true)}
                  sortDirection={sortBy === SORT_KEYS.ID ? sortDirection : false}
                >
                  <TableSortLabel
                    active={sortBy === SORT_KEYS.ID}
                    direction={sortBy === SORT_KEYS.ID ? sortDirection : 'asc'}
                    onClick={() => handleSort(SORT_KEYS.ID)}
                  >
                    Job ID
                  </TableSortLabel>
                </TableCell>

                <TableCell
                  sortDirection={sortBy === SORT_KEYS.DATASET ? sortDirection : false}
                  sx={{ width: 220 }}
                >
                  <TableSortLabel
                    active={sortBy === SORT_KEYS.DATASET}
                    direction={sortBy === SORT_KEYS.DATASET ? sortDirection : 'asc'}
                    onClick={() => handleSort(SORT_KEYS.DATASET)}
                  >
                    Dataset
                  </TableSortLabel>
                </TableCell>

                <TableCell sortDirection={sortBy === SORT_KEYS.STATUS ? sortDirection : false} sx={{ width: 140 }}>
                  <TableSortLabel
                    active={sortBy === SORT_KEYS.STATUS}
                    direction={sortBy === SORT_KEYS.STATUS ? sortDirection : 'asc'}
                    onClick={() => handleSort(SORT_KEYS.STATUS)}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>

                <TableCell sortDirection={sortBy === SORT_KEYS.CREATED ? sortDirection : false} sx={{ width: 180 }}>
                  <TableSortLabel
                    active={sortBy === SORT_KEYS.CREATED}
                    direction={sortBy === SORT_KEYS.CREATED ? sortDirection : 'asc'}
                    onClick={() => handleSort(SORT_KEYS.CREATED)}
                  >
                    Created
                  </TableSortLabel>
                </TableCell>

                <TableCell sortDirection={sortBy === SORT_KEYS.FINISHED ? sortDirection : false} sx={{ width: 180 }}>
                  <TableSortLabel
                    active={sortBy === SORT_KEYS.FINISHED}
                    direction={sortBy === SORT_KEYS.FINISHED ? sortDirection : 'asc'}
                    onClick={() => handleSort(SORT_KEYS.FINISHED)}
                  >
                    Finished
                  </TableSortLabel>
                </TableCell>

                <TableCell sx={{ width: 140 }}>Duration</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedJobs.map((job) => (
                <TableRow key={job.id} hover>
                  <TableCell sx={stickyCheckboxCellSx(false)}>
                    <Checkbox
                      size="small"
                      checked={selectedIds.has(job.id)}
                      onChange={() => toggleOne(job.id)}
                      inputProps={{ 'aria-label': `select job ${job.id}` }}
                    />
                  </TableCell>

                  <JobIdCell job={job} />

                  <TableCell
                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={job.datasetName || '—'}
                  >
                    {job.datasetName || '—'}
                  </TableCell>

                  <TableCell>
                    <StatusChip status={job.status} />
                  </TableCell>

                  <TableCell
                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={job.createdAt || '—'}
                  >
                    {job.createdAt || '—'}
                  </TableCell>

                  <TableCell
                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={job.finishedAt || '—'}
                  >
                    {job.finishedAt || '—'}
                  </TableCell>

                  <TableCell>{job.duration || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          {paginatedJobs.map((job) => (
            <JobCardRow key={job.id} job={job} />
          ))}
        </Box>
      )}

      <Box sx={{ mt: 1.5 }}>
        <PaginationControl page={page} pageCount={pageCount} onChange={setPage} />
      </Box>
    </SurfaceCard>
  );
};

JobsTable.propTypes = {
  jobs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      datasetId: PropTypes.string,
      datasetName: PropTypes.string,
      status: PropTypes.oneOf(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED']).isRequired,
      createdAt: PropTypes.string,
      finishedAt: PropTypes.string,
      duration: PropTypes.string,
      createdAtRaw: PropTypes.string,
      finishedAtRaw: PropTypes.string,
    })
  ).isRequired,
  onViewJob: PropTypes.func,
  onDeleteJob: PropTypes.func,
};

export default JobsTable;
