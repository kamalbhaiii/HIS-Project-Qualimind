import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import StatusChip from '../../atoms/StatusChip';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Divider from '@mui/material/Divider';

const RecentJobsTable = ({ jobs }) => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const rows = useMemo(() => jobs || [], [jobs]);

  return (
    <SurfaceCard
      sx={{
        p: 2,
        borderRadius: 2,
        height: '100%',
        width: '100%',
        minWidth: 0, // IMPORTANT in grid/flex
        overflow: 'hidden', // keeps visuals clean
      }}
    >
      <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
        Recent Jobs
      </Typography>

      {rows.length === 0 ? (
        <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
          No jobs yet. Start by uploading a dataset.
        </Typography>
      ) : isMdUp ? (
        <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
          <Table size="small" stickyHeader sx={{ width: '100%', tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 120 }}>Job ID</TableCell>
                <TableCell>Dataset</TableCell>
                <TableCell sx={{ width: 120 }}>Status</TableCell>
                <TableCell sx={{ width: 170 }}>Created</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((job) => (
                <TableRow key={job.id} hover>
                  <TableCell
                    sx={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={job.id}
                  >
                    {job.id}
                  </TableCell>

                  <TableCell
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={job.datasetName}
                  >
                    {job.datasetName}
                  </TableCell>

                  <TableCell>
                    <StatusChip status={job.status} />
                  </TableCell>

                  <TableCell
                    sx={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={job.createdAt}
                  >
                    {job.createdAt}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {rows.map((job) => (
            <Box
              key={job.id}
              sx={{
                border: (t) => `1px solid ${t.palette.divider}`,
                borderRadius: 2,
                p: 1.25,
                bgcolor: 'background.paper',
                minWidth: 0,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap title={job.datasetName}>
                  {job.datasetName}
                </Typography>
                <StatusChip status={job.status} />
              </Box>

              <Divider sx={{ my: 1 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, minWidth: 0 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="textSecondary">
                    Job ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }} noWrap title={job.id}>
                    {job.id}
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'right', minWidth: 0 }}>
                  <Typography variant="caption" color="textSecondary">
                    Created
                  </Typography>
                  <Typography variant="body2" noWrap title={job.createdAt}>
                    {job.createdAt}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </SurfaceCard>
  );
};

RecentJobsTable.propTypes = {
  jobs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      datasetName: PropTypes.string.isRequired,
      status: PropTypes.oneOf(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED']).isRequired,
      createdAt: PropTypes.string.isRequired, // already formatted in DashboardPage; OK
    })
  ).isRequired,
};

export default RecentJobsTable;
