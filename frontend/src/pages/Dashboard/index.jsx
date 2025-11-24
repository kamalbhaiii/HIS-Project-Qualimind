import React from 'react';
import PropTypes from 'prop-types';

import DashboardLayout from '../../components/templates/DashboardLayout';
import DashboardStatsOverview from '../../components/organisms/DashboardStatsOverview';
import RecentJobsTable from '../../components/organisms/RecentJobsTable';
import RecentDatasetsTable from '../../components/organisms/RecentDatasetsTable';
import QuickActionsPanel from '../../components/organisms/QuickActionsPanel';
import FlexBox from '../../components/atoms/FlexBox';
import { useNavigate } from 'react-router-dom';
import ProtectedRoute from '../../routes/ProtectedRoute'; 

const DashboardPage = ({ onNavigate }) => {
    const navigate = useNavigate();
  // Mock data for now; later we plug in real API data
  const stats = {
    processedDatasets: 12,
    runningJobs: 3,
    failedJobs24h: 1,
  };

  const recentJobs = [
    {
      id: 'job_001',
      datasetName: 'customer_churn.csv',
      status: 'SUCCESS',
      createdAt: '2025-11-20 10:15',
    },
    {
      id: 'job_002',
      datasetName: 'survey_responses.csv',
      status: 'RUNNING',
      createdAt: '2025-11-23 08:02',
    },
    {
      id: 'job_003',
      datasetName: 'transactions_2025_q3.csv',
      status: 'FAILED',
      createdAt: '2025-11-22 16:44',
    },
  ];

  const recentDatasets = [
    {
      id: 'ds_001',
      name: 'customer_churn.csv',
      size: '2.4 MB',
      uploadedAt: '2025-11-20',
    },
    {
      id: 'ds_002',
      name: 'survey_responses.csv',
      size: '1.2 MB',
      uploadedAt: '2025-11-22',
    },
    {
      id: 'ds_003',
      name: 'transactions_2025_q3.csv',
      size: '5.8 MB',
      uploadedAt: '2025-11-23',
    },
  ];

  const handleUploadDataset = () => {
    navigate('/upload-dataset');    
  };

  const handleViewJobs = () => {
    navigate('/jobs');
  };

  return (
    <ProtectedRoute>
          <DashboardLayout activeKey="dashboard" onNavigate={onNavigate}>
      <DashboardStatsOverview stats={stats} />

      <FlexBox
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 2fr' },
          gap: 2,
          mb: 3,
        }}
      >
        <RecentJobsTable jobs={recentJobs} />
        <RecentDatasetsTable datasets={recentDatasets} />
      </FlexBox>

      <QuickActionsPanel
        onUploadDataset={handleUploadDataset}
        onViewJobs={handleViewJobs}
      />
    </DashboardLayout>
      </ProtectedRoute>
  );
};

DashboardPage.propTypes = {
  onNavigate: PropTypes.func, // (key: 'dashboard' | 'datasets' | 'jobs' | 'settings') => void
};

export default DashboardPage;
