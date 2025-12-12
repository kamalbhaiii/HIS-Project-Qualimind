import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import Divider from '@mui/material/Divider';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const RecentDatasetsTable = ({ datasets }) => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const rows = useMemo(() => datasets || [], [datasets]);

  return (
    <SurfaceCard
      sx={{
        p: 2,
        borderRadius: 2,
        height: '100%',
        width: '100%',
        minWidth: 0, // IMPORTANT for grid/flex
        overflow: 'hidden',
      }}
    >
      <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
        Recent Datasets
      </Typography>

      {rows.length === 0 ? (
        <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
          No datasets uploaded yet.
        </Typography>
      ) : isMdUp ? (
        <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
          <Table size="small" stickyHeader sx={{ width: '100%', tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell sx={{ width: 120 }}>Size</TableCell>
                <TableCell sx={{ width: 140 }}>Uploaded</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((ds) => (
                <TableRow key={ds.id} hover>
                  <TableCell
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={ds.name}
                  >
                    {ds.name}
                  </TableCell>

                  <TableCell
                    sx={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={ds.size}
                  >
                    {ds.size}
                  </TableCell>

                  <TableCell
                    sx={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={ds.uploadedAt}
                  >
                    {ds.uploadedAt}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {rows.map((ds) => (
            <Box
              key={ds.id}
              sx={{
                border: (t) => `1px solid ${t.palette.divider}`,
                borderRadius: 2,
                p: 1.25,
                bgcolor: 'background.paper',
                minWidth: 0,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap title={ds.name}>
                {ds.name}
              </Typography>

              <Divider sx={{ my: 1 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, minWidth: 0 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="textSecondary">
                    Size
                  </Typography>
                  <Typography variant="body2" noWrap title={ds.size}>
                    {ds.size}
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'right', minWidth: 0 }}>
                  <Typography variant="caption" color="textSecondary">
                    Uploaded
                  </Typography>
                  <Typography variant="body2" noWrap title={ds.uploadedAt}>
                    {ds.uploadedAt}
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

RecentDatasetsTable.propTypes = {
  datasets: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      size: PropTypes.string.isRequired,
      uploadedAt: PropTypes.string.isRequired,
    })
  ).isRequired,
};

export default RecentDatasetsTable;
