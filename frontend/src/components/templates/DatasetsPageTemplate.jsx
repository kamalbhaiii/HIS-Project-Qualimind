import React from 'react';
import DashboardLayout from './DashboardLayout';
import FlexBox from '../atoms/FlexBox';
import DashboardStatsOverview from '../organisms/DashboardStatsOverview'; // optional reuse
import DatasetListTable from '../organisms/DatasetListTable';
import DatasetUploadPanel from '../organisms/DatasetUploadPanel';
import DashboardSectionHeader from '../molecules/DashboardSectionHeader';
import { useNavigate } from 'react-router-dom';

const DatasetsPageTemplate = () => {
  // Mock stats just for visual consistency (can be removed if you want)
  const stats = {
    processedDatasets: 12,
    runningJobs: 3,
    failedJobs24h: 1,
  };

  const mockDatasets = [
    {
      id: 'ds_001',
      name: 'customer_churn.csv',
      size: '2.4 MB',
      uploadedAt: '2025-11-20',
      lastJobStatus: 'SUCCESS',
      lastJobId: 'job_001',
    },
    {
      id: 'ds_002',
      name: 'survey_responses.csv',
      size: '1.2 MB',
      uploadedAt: '2025-11-22',
      lastJobStatus: 'RUNNING',
      lastJobId: 'job_002',
    },
    {
      id: 'ds_003',
      name: 'transactions_2025_q3.csv',
      size: '5.8 MB',
      uploadedAt: '2025-11-23',
      lastJobStatus: 'FAILED',
      lastJobId: 'job_003',
    },
    {
      id: 'ds_004',
      name: 'marketing_leads.csv',
      size: '860 KB',
      uploadedAt: '2025-11-21',
      lastJobStatus: null,
      lastJobId: null,
    },
  ];

  const navigate = useNavigate();

  const handleMockViewDataset = (dataset) => {
    navigate(`/dataset-view`);
  };

  const handleMockStartJob = (dataset) => {
    // For now, just log – later this will open job creation / trigger API
    // eslint-disable-next-line no-console
    console.log('Start job for dataset (mock):', dataset);
  };

  const handleMockUpload = (files) => {
    // For now, just log
    // eslint-disable-next-line no-console
    console.log('Mock upload files:', files);
  };

  return (
    <DashboardLayout activeKey="datasets">
      {/* Optional: You can show high-level stats at top or remove this */}
      <DashboardStatsOverview stats={stats} />

      <DashboardSectionHeader
        title="Datasets"
        subtitle="Manage your uploaded datasets and preprocessing runs"
      />

      <FlexBox
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
          gap: 2,
        }}
      >
        <DatasetListTable
          datasets={mockDatasets}
          onViewDataset={handleMockViewDataset}
          onStartJob={handleMockStartJob}
        />
        <DatasetUploadPanel onMockUpload={handleMockUpload} />
      </FlexBox>
    </DashboardLayout>
  );
};

export default DatasetsPageTemplate;
