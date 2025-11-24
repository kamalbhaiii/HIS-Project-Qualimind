import React from 'react';
import PropTypes from 'prop-types';

import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import FlexBox from '../../atoms/FlexBox';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';

const DatasetViewPanel = ({
  mode,
  jobStatus,
  originalColumns,
  originalRows,
  processedColumns,
  processedRows,
}) => {
  const isProcessing =
    jobStatus === 'PENDING' || jobStatus === 'RUNNING';
  const isFailed = jobStatus === 'FAILED';

  const renderTable = (columns, rows) => (
    <>
      <Typography
        variant="body2"
        color="textSecondary"
        sx={{ mb: 1 }}
      >
        Showing {rows.length} rows • {columns.length} columns (mock data)
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col}>{col}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ py: 2 }}
                  >
                    No preview available for this dataset.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow key={idx}>
                  {columns.map((col) => (
                    <TableCell key={col}>{row[col]}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );

  return (
    <SurfaceCard sx={{ p: 3, borderRadius: 2 }}>
      {mode === 'original' && (
        <>
          <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
            Original dataset (uploaded file)
          </Typography>
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ mb: 2 }}
          >
            This is a sample preview of the dataset as you originally
            uploaded it.
          </Typography>
          {renderTable(originalColumns, originalRows)}
        </>
      )}

      {mode === 'processed' && (
        <>
          <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
            Preprocessed dataset
          </Typography>

          {isProcessing && (
            <FlexBox
              sx={{
                minHeight: 240,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <Typography variant="body1" color="textSecondary">
                The dataset is still under preprocessing.
                <br />
                Please check back once the job has completed.
              </Typography>
            </FlexBox>
          )}

          {isFailed && !isProcessing && (
            <FlexBox
              sx={{
                minHeight: 240,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <Typography variant="body1" color="textSecondary">
                The preprocessing job for this dataset has failed, so no
                processed preview is available.
              </Typography>
            </FlexBox>
          )}

          {!isProcessing && !isFailed && renderTable(processedColumns, processedRows)}
        </>
      )}
    </SurfaceCard>
  );
};

DatasetViewPanel.propTypes = {
  mode: PropTypes.oneOf(['original', 'processed']).isRequired,
  jobStatus: PropTypes.oneOf(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED'])
    .isRequired,
  originalColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
  originalRows: PropTypes.arrayOf(PropTypes.object).isRequired,
  processedColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
  processedRows: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default DatasetViewPanel;
