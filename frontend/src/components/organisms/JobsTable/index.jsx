// src/components/organisms/JobsTable.jsx
import React from 'react';
import PropTypes from 'prop-types';

import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import StatusChip from '../../atoms/StatusChip';
import JobRowActions from '../../molecules/JobRowActions';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';

const JobsTable = ({ jobs, onViewJob, onRetryJob }) => {
  return (
    <SurfaceCard sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
        Jobs
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Job ID</TableCell>
              <TableCell>Dataset</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Finished</TableCell>
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
                    No jobs found for the selected filter.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
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
                      onView={onViewJob ? () => onViewJob(job) : undefined}
                      onRetry={onRetryJob ? () => onRetryJob(job) : undefined}
                      showRetry={job.status === 'FAILED'}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </SurfaceCard>
  );
};

JobsTable.propTypes = {
  jobs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      datasetName: PropTypes.string.isRequired,
      status: PropTypes.oneOf([
        'PENDING',
        'RUNNING',
        'SUCCESS',
        'FAILED',
      ]).isRequired,
      createdAt: PropTypes.string.isRequired,
      finishedAt: PropTypes.string,
      duration: PropTypes.string,
    })
  ).isRequired,
  onViewJob: PropTypes.func, // (job) => void
  onRetryJob: PropTypes.func, // (job) => void
};

export default JobsTable;
