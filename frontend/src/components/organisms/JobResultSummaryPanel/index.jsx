import React from 'react';
import PropTypes from 'prop-types';

import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import FlexBox from '../../atoms/FlexBox';
import KeyValueItem from '../../molecules/KeyValueItem';

import Grid from '@mui/material/Grid';

const JobResultSummaryPanel = ({ summary }) => {
  const {
    processedRows,
    processedColumns,
    categoricalFeatures,
    numericFeatures,
    missingValuesHandled,
    rareCategoriesGrouped,
  } = summary;

  return (
    <SurfaceCard sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
        Result summary
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Overview of the processed dataset after categorical preprocessing and
        feature engineering.
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <KeyValueItem
            label="Processed rows"
            value={processedRows.toLocaleString()}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <KeyValueItem
            label="Processed columns"
            value={processedColumns}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <KeyValueItem
            label="Categorical features"
            value={categoricalFeatures}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <KeyValueItem
            label="Numeric features"
            value={numericFeatures}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <KeyValueItem
            label="Missing values handled"
            value={missingValuesHandled}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <KeyValueItem
            label="Rare categories grouped"
            value={rareCategoriesGrouped}
          />
        </Grid>
      </Grid>

      <FlexBox sx={{ mt: 2 }}>
        <Typography variant="caption" color="textSecondary">
          Note: Values are mock-only right now. Later, they will be derived
          from real job result metadata.
        </Typography>
      </FlexBox>
    </SurfaceCard>
  );
};

JobResultSummaryPanel.propTypes = {
  summary: PropTypes.shape({
    processedRows: PropTypes.number.isRequired,
    processedColumns: PropTypes.number.isRequired,
    categoricalFeatures: PropTypes.number.isRequired,
    numericFeatures: PropTypes.number.isRequired,
    missingValuesHandled: PropTypes.number.isRequired,
    rareCategoriesGrouped: PropTypes.number.isRequired,
  }).isRequired,
};

export default JobResultSummaryPanel;
