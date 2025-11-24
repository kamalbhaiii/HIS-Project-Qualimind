import React from 'react';
import PropTypes from 'prop-types';
import Grid from '@mui/material/Grid';
import StatCard from '../../molecules/StatCard';
import DashboardSectionHeader from '../../molecules/DashboardSectionHeader';

const DashboardStatsOverview = ({ stats }) => {
  const { processedDatasets, runningJobs, failedJobs24h } = stats;

  return (
    <>
      <DashboardSectionHeader
        title="Overview"
        subtitle="High-level snapshot of your preprocessing activity"
      />
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <StatCard
            label="Processed datasets"
            value={processedDatasets}
            helperText="Total successfully processed"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            label="Running jobs"
            value={runningJobs}
            helperText="Currently in progress"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            label="Failed jobs (24h)"
            value={failedJobs24h}
            helperText="Recent failures"
          />
        </Grid>
      </Grid>
    </>
  );
};

DashboardStatsOverview.propTypes = {
  stats: PropTypes.shape({
    processedDatasets: PropTypes.number.isRequired,
    runningJobs: PropTypes.number.isRequired,
    failedJobs24h: PropTypes.number.isRequired,
  }).isRequired,
};

export default DashboardStatsOverview;
