import React from 'react';

import DashboardLayout from '../templates/DashboardLayout';
import DashboardSectionHeader from '../molecules/DashboardSectionHeader';
import FlexBox from '../atoms/FlexBox';

import DatasetMetaPanel from '../organisms/DatasetMetaPanel';
import DatasetJobsTable from '../organisms/DatasetJobsTable';
import DatasetPreviewTable from '../organisms/DatasetPreviewTable';

const DatasetDetailPage = () => {
  // Mock dataset details
  const dataset = {
    id: 'ds_001',
    name: 'customer_churn.csv',
    size: '2.4 MB',
    uploadedAt: '2025-11-20 10:30',
    totalRows: 12500,
    totalColumns: 24,
    categoricalColumns: 12,
    numericColumns: 12,
    lastJobStatus: 'SUCCESS',
    lastJobId: 'job_001',
    lastProcessedAt: '2025-11-20 10:45',
  };

  // Mock jobs for this dataset
  const datasetJobs = [
    {
      id: 'job_001',
      status: 'SUCCESS',
      createdAt: '2025-11-20 10:30',
      finishedAt: '2025-11-20 10:45',
    },
    {
      id: 'job_004',
      status: 'FAILED',
      createdAt: '2025-11-19 09:10',
      finishedAt: '2025-11-19 09:20',
    },
    {
      id: 'job_005',
      status: 'RUNNING',
      createdAt: '2025-11-23 08:05',
      finishedAt: null,
    },
  ];

  // Mock preview data
  const previewColumns = ['customer_id', 'churned', 'age_group', 'region'];
  const previewRows = [
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
    {
      customer_id: 'CUST_004',
      churned: 'Yes',
      age_group: '18-24',
      region: 'East',
    },
    {
      customer_id: 'CUST_005',
      churned: 'No',
      age_group: '25-34',
      region: 'North',
    },
  ];

  return (
    <DashboardLayout activeKey="datasets">
      <DashboardSectionHeader
        title="Dataset details"
        subtitle="Inspect metadata, associated jobs, and a sample preview"
      />

      <FlexBox
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1.5fr' },
          gap: 2,
          mb: 3,
        }}
      >
        <DatasetMetaPanel dataset={dataset} />
        <DatasetPreviewTable columns={previewColumns} rows={previewRows} />
      </FlexBox>

      <DatasetJobsTable jobs={datasetJobs} />
    </DashboardLayout>
  );
};

export default DatasetDetailPage;
