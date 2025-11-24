import React, { useState } from 'react';
import PropTypes from 'prop-types';

import DashboardLayout from '../../components/templates/DashboardLayout';
import DashboardSectionHeader from '../../components/molecules/DashboardSectionHeader';
import FlexBox from '../../components/atoms/FlexBox';
import Typography from '../../components/atoms/CustomTypography';
import DatasetViewToggle from '../../components/molecules/DatasetViewToggle';
import DatasetViewPanel from '../../components/organisms/DatasetViewPanel';
import DatasetMetaPanel from '../../components/organisms/DatasetMetaPanel';

const DatasetViewPageTemplate = ({ onNavigate }) => {
  const [mode, setMode] = useState('original'); // 'original' | 'processed'

  // Mock dataset info + job status (change status to see behavior)
  const dataset = {
    id: 'ds_001',
    name: 'customer_churn.csv',
    size: '2.4 MB',
    uploadedAt: '2025-11-20 10:30',
    totalRows: 12500,
    totalColumns: 24,
    categoricalColumns: 12,
    numericColumns: 12,
    lastJobStatus: 'RUNNING', // try 'SUCCESS' to enable preprocessed table
    lastJobId: 'job_001',
    lastProcessedAt: '2025-11-20 10:45',
  };

  const jobStatus = dataset.lastJobStatus || 'PENDING';

  // Mock original data
  const originalColumns = ['customer_id', 'churned', 'age_group', 'region'];
  const originalRows = [
    {
      customer_id: 'CUST_001',
      churned: 'No',
      age_group: '25-34',
      region: 'North',
    },
    {
      customer_id: 'CUST_002',
      churned: 'Yes',
      age_group: '35-44',
      region: 'West',
    },
    {
      customer_id: 'CUST_003',
      churned: 'No',
      age_group: '45-54',
      region: 'South',
    },
  ];

  // Mock processed data (only used if jobStatus === 'SUCCESS')
  const processedColumns = [
    'customer_id',
    'churned',
    'age_group_25_34',
    'age_group_35_44',
    'region_North',
    'region_West',
  ];
  const processedRows = [
    {
      customer_id: 'CUST_001',
      churned: 0,
      age_group_25_34: 1,
      age_group_35_44: 0,
      region_North: 1,
      region_West: 0,
    },
    {
      customer_id: 'CUST_002',
      churned: 1,
      age_group_25_34: 0,
      age_group_35_44: 1,
      region_North: 0,
      region_West: 1,
    },
    {
      customer_id: 'CUST_003',
      churned: 0,
      age_group_25_34: 0,
      age_group_35_44: 1,
      region_North: 0,
      region_West: 0,
    },
  ];

  const handleModeChange = (newMode) => {
    setMode(newMode);
  };

  return (
    <DashboardLayout activeKey="datasets" onNavigate={onNavigate}>
      <DashboardSectionHeader
        title="Dataset view"
        subtitle="Switch between the original uploaded data and the preprocessed output"
      />

      <FlexBox
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.4fr 2fr' },
          gap: 2,
          mb: 3,
        }}
      >
        <DatasetMetaPanel dataset={dataset} />

        <FlexBox sx={{ display: 'flex', flexDirection: 'column' }}>
          <DatasetViewToggle mode={mode} onChange={handleModeChange} />
          <DatasetViewPanel
            mode={mode}
            jobStatus={jobStatus}
            originalColumns={originalColumns}
            originalRows={originalRows}
            processedColumns={processedColumns}
            processedRows={processedRows}
          />
        </FlexBox>
      </FlexBox>

      <Typography variant="caption" color="textSecondary">
        Note: All data displayed on this page is mock. Later, this will be
        driven by the dataset & job APIs.
      </Typography>
    </DashboardLayout>
  );
};

DatasetViewPageTemplate.propTypes = {
  onNavigate: PropTypes.func, // your app-level navigation handler
};

export default DatasetViewPageTemplate;
