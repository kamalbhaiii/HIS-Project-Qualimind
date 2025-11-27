// src/components/organisms/JobsTable.jsx
import React from 'react';
import PropTypes from 'prop-types';

import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import StatusChip from '../../atoms/StatusChip';
import JobRowActions from '../../molecules/JobRowActions';
import PaginationControl from '../../atoms/PaginationControl';
import DatasetTableFilters from '../../molecules/DatasetTableFilters'; // reuse filters UI

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import TableSortLabel from '@mui/material/TableSortLabel';

const SORT_KEYS = {
  ID: 'id',
  DATASET: 'datasetName',
  STATUS: 'status',
  CREATED: 'createdAt',
  FINISHED: 'finishedAt',
};

const ROWS_PER_PAGE = 5;

// Reuse same shape as DatasetListTable so DatasetTableFilters works
const defaultFilters = {
  search: '',
  status: 'ALL',
  runs: 'ALL',          // not really used for jobs, but kept for compatibility
  uploadedFrom: '',
  uploadedTo: '',
};

const JobsTable = ({ jobs, onViewJob, onDeleteJob }) => {
  const [sortBy, setSortBy] = React.useState(SORT_KEYS.CREATED);
  const [sortDirection, setSortDirection] = React.useState('desc'); // 'asc' | 'desc'
  const [page, setPage] = React.useState(1);
  const [filters, setFilters] = React.useState(defaultFilters);

  // --- Filter handlers ------------------------------------------------

  const handleFiltersChange = (nextFilters) => {
    setFilters(nextFilters);
    setPage(1); // reset to first page on filter change
  };

  const handleFiltersReset = () => {
    setFilters(defaultFilters);
    setPage(1);
  };

  // --- Sorting helpers ------------------------------------------------

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
        return job.id;
      case SORT_KEYS.DATASET:
        return job.datasetName?.toLowerCase() || '';
      case SORT_KEYS.STATUS:
        return job.status || '';
      case SORT_KEYS.CREATED:
        // prefer raw ISO for correct ordering
        return job.createdAtRaw || job.createdAt || '';
      case SORT_KEYS.FINISHED:
        return job.finishedAtRaw || job.finishedAt || '';
      default:
        return '';
    }
  };

  // --- Filtering ------------------------------------------------------

  const filteredJobs = React.useMemo(() => {
    return jobs.filter((job) => {
      const {
        search,
        status,
        uploadedFrom,
        uploadedTo,
        // runs is unused for jobs but included to keep filters shape compatible
      } = filters;

      // search: match on job ID OR dataset name
      if (search) {
        const needle = search.toLowerCase();
        const haystack =
          `${job.id} ${job.datasetName || ''}`.toLowerCase();
        if (!haystack.includes(needle)) {
          return false;
        }
      }

      // status filter
      if (status !== 'ALL' && job.status !== status) {
        return false;
      }

      // created date range filter (mapped from uploadedFrom/To)
      const createdIso = job.createdAtRaw || job.createdAtRawStr || job.createdAt;
      if (uploadedFrom && createdIso) {
        // uploadedFrom is expected YYYY-MM-DD; compare string prefix
        const createdDateOnly = createdIso.slice(0, 10);
        if (createdDateOnly < uploadedFrom) {
          return false;
        }
      }
      if (uploadedTo && createdIso) {
        const createdDateOnly = createdIso.slice(0, 10);
        if (createdDateOnly > uploadedTo) {
          return false;
        }
      }

      return true;
    });
  }, [jobs, filters]);

  // --- Sorting + Pagination -------------------------------------------

  const sortedJobs = React.useMemo(() => {
    const copy = [...filteredJobs];
    copy.sort((a, b) =>
      compareValues(
        getSortValue(a, sortBy),
        getSortValue(b, sortBy),
        sortDirection
      )
    );
    return copy;
  }, [filteredJobs, sortBy, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(sortedJobs.length / ROWS_PER_PAGE));

  // keep page in range when data length changes
  React.useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const startIndex = (page - 1) * ROWS_PER_PAGE;
  const paginatedJobs = sortedJobs.slice(startIndex, startIndex + ROWS_PER_PAGE);

  // --- Render ---------------------------------------------------------

  return (
    <SurfaceCard sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
        Jobs
      </Typography>

      {/* Filters – same level as DatasetListTable */}
      <DatasetTableFilters
        filters={filters}
        onChange={handleFiltersChange}
        onReset={handleFiltersReset}
      />

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sortDirection={sortBy === SORT_KEYS.ID ? sortDirection : false}>
                <TableSortLabel
                  active={sortBy === SORT_KEYS.ID}
                  direction={sortBy === SORT_KEYS.ID ? sortDirection : 'asc'}
                  onClick={() => handleSort(SORT_KEYS.ID)}
                >
                  Job ID
                </TableSortLabel>
              </TableCell>

              <TableCell sortDirection={sortBy === SORT_KEYS.DATASET ? sortDirection : false}>
                <TableSortLabel
                  active={sortBy === SORT_KEYS.DATASET}
                  direction={sortBy === SORT_KEYS.DATASET ? sortDirection : 'asc'}
                  onClick={() => handleSort(SORT_KEYS.DATASET)}
                >
                  Dataset
                </TableSortLabel>
              </TableCell>

              <TableCell sortDirection={sortBy === SORT_KEYS.STATUS ? sortDirection : false}>
                <TableSortLabel
                  active={sortBy === SORT_KEYS.STATUS}
                  direction={sortBy === SORT_KEYS.STATUS ? sortDirection : 'asc'}
                  onClick={() => handleSort(SORT_KEYS.STATUS)}
                >
                  Status
                </TableSortLabel>
              </TableCell>

              <TableCell sortDirection={sortBy === SORT_KEYS.CREATED ? sortDirection : false}>
                <TableSortLabel
                  active={sortBy === SORT_KEYS.CREATED}
                  direction={sortBy === SORT_KEYS.CREATED ? sortDirection : 'asc'}
                  onClick={() => handleSort(SORT_KEYS.CREATED)}
                >
                  Created
                </TableSortLabel>
              </TableCell>

              <TableCell sortDirection={sortBy === SORT_KEYS.FINISHED ? sortDirection : false}>
                <TableSortLabel
                  active={sortBy === SORT_KEYS.FINISHED}
                  direction={sortBy === SORT_KEYS.FINISHED ? sortDirection : 'asc'}
                  onClick={() => handleSort(SORT_KEYS.FINISHED)}
                >
                  Finished
                </TableSortLabel>
              </TableCell>

              <TableCell>Duration</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ py: 2 }}
                  >
                    No jobs yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : paginatedJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ py: 2 }}
                  >
                    No jobs match your filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedJobs.map((job) => (
                <TableRow key={job.id} hover>
                  <TableCell>{job.id}</TableCell>
                  <TableCell>{job.datasetName}</TableCell>
                  <TableCell>
                    <StatusChip status={job.status} />
                  </TableCell>
                  <TableCell>{job.createdAt}</TableCell>
                  <TableCell>{job.finishedAt || '—'}</TableCell>
                  <TableCell>{job.duration || '—'}</TableCell>
                  <TableCell align="right">
                    <JobRowActions
                      // View only when SUCCESS
                      onView={
                        job.status === 'SUCCESS' && onViewJob
                          ? () => onViewJob(job)
                          : undefined
                      }
                          onDelete={
      onDeleteJob
        ? () => onDeleteJob(job)  
        : undefined
    }
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <PaginationControl
        page={page}
        pageCount={pageCount}
        onChange={setPage}
      />
    </SurfaceCard>
  );
};

JobsTable.propTypes = {
  jobs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      datasetId: PropTypes.string,
      datasetName: PropTypes.string.isRequired,
      status: PropTypes.oneOf(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED'])
        .isRequired,
      createdAt: PropTypes.string.isRequired, // formatted
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
