import React from 'react';

import DashboardLayout from '../templates/DashboardLayout';
import DashboardSectionHeader from '../molecules/DashboardSectionHeader';
import FlexBox from '../atoms/FlexBox';

import JobHeaderPanel from '../organisms/JobHeaderPanel';
import JobTimelinePanel from '../organisms/JobTimelinePanel';
import JobResultSummaryPanel from '../organisms/JobResultSummaryPanel';
import JobResultPreviewTable from '../organisms/JobResultPreviewTable';
import JobExportPanel from '../organisms/JobExportPanel';
import InfoAlert from '../molecules/InfoAlert';

const JobDetailPageTemplate = () => {
  // Mock job details
  const job = {
    id: 'job_001',
    datasetName: 'customer_churn.csv',
    status: 'SUCCESS', // try 'FAILED' to see retry + error state
    duration: '15m',
    createdAt: '2025-11-20 10:30',
    startedAt: '2025-11-20 10:31',
    finishedAt: '2025-11-20 10:45',
    errorMessage: null,
  };

  // Mock result summary
  const resultSummary = {
    processedRows: 12500,
    processedColumns: 32,
    categoricalFeatures: 18,
    numericFeatures: 14,
    missingValuesHandled: 2300,
    rareCategoriesGrouped: 42,
  };

  // Mock processed data preview
  const previewColumns = [
    'customer_id',
    'churned',
    'age_group_25_34',
    'age_group_35_44',
    'region_North',
    'region_West',
  ];

  const previewRows = [
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

  const showSuccessAlert = job.status === 'SUCCESS';
  const showErrorAlert = job.status === 'FAILED' && job.errorMessage;

  return (
    <DashboardLayout activeKey="jobs">
      <DashboardSectionHeader
        title="Job details"
        subtitle="Track job lifecycle, inspect the processed result, and export data"
      />

      <JobHeaderPanel job={job} onRetry={handleRetry} />

      {showSuccessAlert && (
        <FlexBox sx={{ mb: 2 }}>
          <InfoAlert severity="success">
            Job completed successfully. The processed dataset is ready for
            export and downstream ML workflows (mock state).
          </InfoAlert>
        </FlexBox>
      )}

      {showErrorAlert && (
        <FlexBox sx={{ mb: 2 }}>
          <InfoAlert severity="error">
            {job.errorMessage ||
              'Job failed due to an unknown error (mock message).'}
          </InfoAlert>
        </FlexBox>
      )}

      <FlexBox
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.3fr 1.7fr' },
          gap: 2,
          mb: 3,
        }}
      >
        <JobTimelinePanel
          createdAt={job.createdAt}
          startedAt={job.startedAt}
          finishedAt={job.finishedAt}
        />
        <JobResultSummaryPanel summary={resultSummary} />
      </FlexBox>

      <FlexBox
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
          gap: 2,
        }}
      >
        <JobResultPreviewTable
          columns={previewColumns}
          rows={previewRows}
        />
        <JobExportPanel onExport={handleExport} />
      </FlexBox>
    </DashboardLayout>
  );
};

export default JobDetailPageTemplate;
