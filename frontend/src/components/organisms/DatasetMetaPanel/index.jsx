import React from 'react';
import PropTypes from 'prop-types';

import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import FlexBox from '../../atoms/FlexBox';
import StatusChip from '../../atoms/StatusChip';
import KeyValueItem from '../../molecules/KeyValueItem';

import Grid from '@mui/material/Grid';

const DatasetMetaPanel = ({ dataset }) => {
  const safeNumber = (value) =>
    typeof value === 'number' ? value.toLocaleString() : '—';

  const safeValue = (value) =>
    value !== null && value !== undefined && value !== '' ? value : '—';

  if (!dataset) return null;

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
          {safeValue(dataset.name)}
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
          <KeyValueItem label="Size" value={safeValue(dataset.size)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <KeyValueItem
            label="Uploaded at"
            value={safeValue(dataset.uploadedAt)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <KeyValueItem
            label="Total rows"
            value={safeNumber(dataset.totalRows)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <KeyValueItem
            label="Total columns"
            value={safeNumber(dataset.totalColumns)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <KeyValueItem
            label="Categorical features"
            value={safeNumber(dataset.categoricalColumns)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <KeyValueItem
            label="Numeric features"
            value={safeNumber(dataset.numericColumns)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <KeyValueItem
            label="Last job ID"
            value={safeValue(dataset.lastJobId)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <KeyValueItem
            label="Last processed at"
            value={safeValue(dataset.lastProcessedAt)}
          />
        </Grid>
      </Grid>
    </SurfaceCard>
  );
};

DatasetMetaPanel.propTypes = {
  dataset: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    size: PropTypes.string,
    uploadedAt: PropTypes.string,
    totalRows: PropTypes.number,          // not required anymore
    totalColumns: PropTypes.number,
    categoricalColumns: PropTypes.number,
    numericColumns: PropTypes.number,
    lastJobStatus: PropTypes.oneOf([
      'PENDING',
      'RUNNING',
      'SUCCESS',
      'FAILED',
      null,
    ]),
    lastJobId: PropTypes.string,
    lastProcessedAt: PropTypes.string,
  }),
};

export default DatasetMetaPanel;
