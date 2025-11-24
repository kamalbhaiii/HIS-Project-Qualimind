import React from 'react';
import PropTypes from 'prop-types';
import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import StatusChip from '../../atoms/StatusChip';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';

const RecentJobsTable = ({ jobs }) => {
  return (
    <SurfaceCard sx={{ p: 2, borderRadius: 2, height: '100%' }}>
      <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
        Recent Jobs
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Job ID</TableCell>
              <TableCell>Dataset</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ py: 2 }}
                  >
                    No jobs yet. Start by uploading a dataset.
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </SurfaceCard>
  );
};

RecentJobsTable.propTypes = {
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
    })
  ).isRequired,
};

export default RecentJobsTable;
