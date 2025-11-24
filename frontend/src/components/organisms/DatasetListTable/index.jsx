import React from 'react';
import PropTypes from 'prop-types';

import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import StatusChip from '../../atoms/StatusChip';
import DatasetRowActions from '../../molecules/DatasetRowActions';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import Box from '@mui/material/Box';

const DatasetListTable = ({ datasets, onViewDataset, onStartJob }) => {
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

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Uploaded</TableCell>
              <TableCell>Last job</TableCell>
              <TableCell>Last status</TableCell>
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
            ) : (
              datasets.map((ds) => (
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
                      onView={
                        onViewDataset
                          ? () => onViewDataset(ds)
                          : undefined
                      }
                      onStartJob={
                        onStartJob ? () => onStartJob(ds) : undefined
                      }
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

DatasetListTable.propTypes = {
  datasets: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      size: PropTypes.string.isRequired,
      uploadedAt: PropTypes.string.isRequired,
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
  onViewDataset: PropTypes.func, // (dataset) => void
  onStartJob: PropTypes.func, // (dataset) => void
};

export default DatasetListTable;
