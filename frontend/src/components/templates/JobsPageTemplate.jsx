// src/pages/main/JobsPage.jsx (adjust path as per your structure)
import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';

import DashboardLayout from '../../components/templates/DashboardLayout';
import DashboardSectionHeader from '../../components/molecules/DashboardSectionHeader';
import FlexBox from '../../components/atoms/FlexBox';

import JobStatusSummaryStrip from '../../components/organisms/JobStatusSummaryStrip';
import JobsTable from '../../components/organisms/JobsTable';
import StatusFilterChips from '../../components/molecules/StatusFilterChips';

const JobsPageTemplate = ({ onNavigate }) => {
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Mock jobs data
  const jobs = [
    {
      id: 'job_001',
      datasetName: 'customer_churn.csv',
      status: 'SUCCESS',
      createdAt: '2025-11-20 10:30',
      finishedAt: '2025-11-20 10:45',
      duration: '15m',
    },
    {
      id: 'job_002',
      datasetName: 'survey_responses.csv',
      status: 'RUNNING',
      createdAt: '2025-11-23 08:02',
      finishedAt: null,
      duration: '—',
    },
    {
      id: 'job_003',
      datasetName: 'transactions_2025_q3.csv',
      status: 'FAILED',
      createdAt: '2025-11-22 16:44',
      finishedAt: '2025-11-22 16:50',
      duration: '6m',
    },
    {
      id: 'job_004',
      datasetName: 'marketing_leads.csv',
      status: 'PENDING',
      createdAt: '2025-11-23 09:10',
      finishedAt: null,
      duration: '—',
    },
    {
      id: 'job_005',
      datasetName: 'survey_responses.csv',
      status: 'SUCCESS',
      createdAt: '2025-11-21 13:15',
      finishedAt: '2025-11-21 13:25',
      duration: '10m',
    },
  ];

  // Counts (for the summary strip)
  const counts = useMemo(() => {
    const base = {
      total: jobs.length,
      pending: 0,
      running: 0,
      success: 0,
      failed: 0,
    };
    jobs.forEach((job) => {
      if (job.status === 'PENDING') base.pending += 1;
      if (job.status === 'RUNNING') base.running += 1;
      if (job.status === 'SUCCESS') base.success += 1;
      if (job.status === 'FAILED') base.failed += 1;
    });
    return base;
  }, [jobs]);

  // ✅ Filtered jobs based on selected status
  const filteredJobs = useMemo(() => {
    if (filterStatus === 'ALL') return jobs;
    return jobs.filter((job) => job.status === filterStatus);
  }, [jobs, filterStatus]);

  const handleFilterChange = (status) => {
    setFilterStatus(status);
  };

  const handleViewJob = (job) => {
    // Later: navigate to JobDetailPage with job.id
    // eslint-disable-next-line no-console
    console.log('View job (mock):', job);
    if (onNavigate) {
      onNavigate('jobDetail'); // or whatever key you use
    }
  };

  const handleRetryJob = (job) => {
    // Later: trigger re-run or open confirmation
    // eslint-disable-next-line no-console
    console.log('Retry job (mock):', job);
  };

  return (
    <DashboardLayout activeKey="jobs" onNavigate={onNavigate}>
      <DashboardSectionHeader
        title="Jobs"
        subtitle="Monitor and inspect your preprocessing jobs"
        action={
          <StatusFilterChips
            value={filterStatus}
            onChange={handleFilterChange}
          />
        }
      />

      <FlexBox sx={{ mb: 2 }}>
        <JobStatusSummaryStrip counts={counts} />
      </FlexBox>

      <JobsTable
        jobs={filteredJobs}
        onViewJob={handleViewJob}
        onRetryJob={handleRetryJob}
      />
    </DashboardLayout>
  );
};

JobsPageTemplate.propTypes = {
  onNavigate: PropTypes.func, // your app-level navigation handler
};

export default JobsPageTemplate;
