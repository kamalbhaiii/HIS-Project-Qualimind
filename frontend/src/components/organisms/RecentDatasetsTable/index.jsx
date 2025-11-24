import React from 'react';
import PropTypes from 'prop-types';
import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';

const RecentDatasetsTable = ({ datasets }) => {
  return (
    <SurfaceCard sx={{ p: 2, borderRadius: 2, height: '100%' }}>
      <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
        Recent Datasets
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Uploaded</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {datasets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ py: 2 }}
                  >
                    No datasets uploaded yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              datasets.map((ds) => (
                <TableRow key={ds.id} hover>
                  <TableCell>{ds.name}</TableCell>
                  <TableCell>{ds.size}</TableCell>
                  <TableCell>{ds.uploadedAt}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
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
