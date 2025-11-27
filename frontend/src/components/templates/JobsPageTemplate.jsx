// src/pages/main/JobsPage.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

import DashboardLayout from '../../components/templates/DashboardLayout';
import DashboardSectionHeader from '../../components/molecules/DashboardSectionHeader';
import FlexBox from '../../components/atoms/FlexBox';

import JobStatusSummaryStrip from '../../components/organisms/JobStatusSummaryStrip';
import JobsTable from '../../components/organisms/JobsTable';
import StatusFilterChips from '../../components/molecules/StatusFilterChips';
import { getJobs } from '../../services/modules/job.api';
import Typography from '../../components/atoms/CustomTypography';
import { useToast } from '../../components/organisms/ToastProvider'; // adjust path if needed
import { deleteDatasetByID } from '../../services/modules/dataset.api';

// Helpers for formatting
const formatDateTime = (iso) => {
  if (!iso) return null;
  const date = new Date(iso);
  return date.toLocaleString();
};

const formatDuration = (startIso, endIso) => {
  if (!startIso || !endIso) return '—';
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return '—';

  const diffMs = end - start;
  const diffSec = Math.floor(diffMs / 1000);
  const minutes = Math.floor(diffSec / 60);
  const seconds = diffSec % 60;

  if (minutes === 0) return `${seconds}s`;
  if (minutes < 60) return `${minutes}m ${seconds}s`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

const JobsPageTemplate = ({ onNavigate }) => {
  const {showToast} = useToast();
  const navigate = useNavigate();

  const [filterStatus, setFilterStatus] = useState('ALL');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch jobs from API
  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await getJobs(); // expects an array as per your sample
      setJobs(res || []);
    } catch (err) {
      const msg = err?.message || 'Failed to fetch jobs';
      setError(msg);
      showToast?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Map API jobs -> UI jobs (format dates & duration)
  const uiJobs = useMemo(
    () =>
      jobs.map((job) => ({
        id: job.id,
        datasetId: job.datasetId,
        datasetName: job.datasetName,
        status: job.status,
        createdAt: formatDateTime(job.createdAt),
        finishedAt: job.completedAt ? formatDateTime(job.completedAt) : null,
        duration: formatDuration(job.startedAt, job.completedAt),
        // raw values for sorting if needed
        createdAtRaw: job.createdAt,
        finishedAtRaw: job.completedAt,
      })),
    [jobs]
  );

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

  // Filter by status for the table
  const filteredJobs = useMemo(() => {
    if (filterStatus === 'ALL') return uiJobs;
    return uiJobs.filter((job) => job.status === filterStatus);
  }, [uiJobs, filterStatus]);

  const handleFilterChange = (status) => {
    setFilterStatus(status);
  };

  const handleViewJob = (job) => {
    // Navigate to dataset view using datasetId
    if (job.datasetId) {
      navigate(`/dataset-view/${job.datasetId}`);
    }
    // Keep this if you still want app-level navigation logic
    if (onNavigate) {
      onNavigate('datasetView');
    }
  };

  const handleDeleteJob = async (job) => {
    try{
      const status = await deleteDatasetByID(job.datasetId)
      await fetchJobs()
      showToast(`Job ${job.datasetId} removed successfully.`, 'success')
    }
    catch(err) {
      showToast(`${err.message || err}`, 'error')
    }
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

      {loading && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          Loading jobs...
        </Typography>
      )}

      {error && !loading && (
        <Typography variant="body2" color="error" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}

      <JobsTable
        jobs={filteredJobs}
        onViewJob={handleViewJob}
        onDeleteJob={handleDeleteJob}
      />
    </DashboardLayout>
  );
};

JobsPageTemplate.propTypes = {
  onNavigate: PropTypes.func, // your app-level navigation handler
};

export default JobsPageTemplate;
