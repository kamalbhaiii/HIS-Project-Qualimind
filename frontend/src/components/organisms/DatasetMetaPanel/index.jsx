import React from 'react';
import PropTypes from 'prop-types';

import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import FlexBox from '../../atoms/FlexBox';
import StatusChip from '../../atoms/StatusChip';
import KeyValueItem from '../../molecules/KeyValueItem';

import Grid from '@mui/material/Grid';

const DatasetMetaPanel = ({ dataset }) => {
  return (
    <SurfaceCard sx={{ p: 3, borderRadius: 2 }}>
      {/* Header row: name + status */}
      <FlexBox
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          gap: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {dataset.name}
        </Typography>
        {dataset.lastJobStatus ? (
          <StatusChip status={dataset.lastJobStatus} />
        ) : (
          <Typography variant="caption" color="textSecondary">
            No jobs yet
          </Typography>
        )}
      </FlexBox>

      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Dataset metadata and preprocessing overview.
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <KeyValueItem label="Size" value={dataset.size} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <KeyValueItem label="Uploaded at" value={dataset.uploadedAt} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <KeyValueItem
            label="Total rows"
            value={dataset.totalRows.toLocaleString()}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <KeyValueItem
            label="Total columns"
            value={dataset.totalColumns}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <KeyValueItem
            label="Categorical features"
            value={dataset.categoricalColumns}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <KeyValueItem
            label="Numeric features"
            value={dataset.numericColumns}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <KeyValueItem
            label="Last job ID"
            value={dataset.lastJobId || '—'}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <KeyValueItem
            label="Last processed at"
            value={dataset.lastProcessedAt || '—'}
          />
        </Grid>
      </Grid>
    </SurfaceCard>
  );
};

DatasetMetaPanel.propTypes = {
  dataset: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    size: PropTypes.string.isRequired,
    uploadedAt: PropTypes.string.isRequired,
    totalRows: PropTypes.number.isRequired,
    totalColumns: PropTypes.number.isRequired,
    categoricalColumns: PropTypes.number.isRequired,
    numericColumns: PropTypes.number.isRequired,
    lastJobStatus: PropTypes.oneOf([
      'PENDING',
      'RUNNING',
      'SUCCESS',
      'FAILED',
      null,
    ]),
    lastJobId: PropTypes.string,
    lastProcessedAt: PropTypes.string,
  }).isRequired,
};

export default DatasetMetaPanel;
