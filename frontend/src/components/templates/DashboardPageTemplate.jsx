// src/pages/main/DashboardPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

import DashboardLayout, { useDashboard } from '../../components/templates/DashboardLayout';
import DashboardStatsOverview from '../../components/organisms/DashboardStatsOverview';
import RecentJobsTable from '../../components/organisms/RecentJobsTable';
import RecentDatasetsTable from '../../components/organisms/RecentDatasetsTable';
import QuickActionsPanel from '../../components/organisms/QuickActionsPanel';
import FlexBox from '../../components/atoms/FlexBox';
import Typography from '../../components/atoms/CustomTypography';
import ProtectedRoute from '../../routes/ProtectedRoute';

import { getJobs } from '../../services/modules/job.api';
import { getDatasets } from '../../services/modules/dataset.api';
import { useToast } from '../../components/organisms/ToastProvider';

// --- helpers ---------------------------------------------------------

const formatDateTime = (iso) => {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(); // tweak if you want a different style
};

const formatDate = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
};

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes)) return '-';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(1)} ${sizes[i]}`;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const DashboardPageTemplate = ({ onNavigate }) => {
  const navigate = useNavigate();

  const {jobs, setJobs, datasets, setDatasets, loading, setLoading,error, setError} = useDashboard();

  // --- Stats (from real jobs) -----------------------------------------

  const stats = useMemo(() => {
    const now = Date.now();

    // processedDatasets: distinct datasetIds that have at least one SUCCESS job
    const successDatasetIds = new Set(
      jobs
        .filter((j) => j.status === 'SUCCESS' && j.datasetId)
        .map((j) => j.datasetId)
    );

    const runningJobs = jobs.filter((j) => j.status === 'RUNNING').length;
    const pendingJobs = jobs.filter((j) => j.status === 'PENDING').length;

    const failedJobs24h = jobs.filter((j) => {
      if (j.status !== 'FAILED' || !j.completedAt) return false;
      const completedAt = new Date(j.completedAt).getTime();
      if (Number.isNaN(completedAt)) return false;
      return now - completedAt <= ONE_DAY_MS;
    }).length;

    return {
      processedDatasets: successDatasetIds.size,
      runningJobs,
      pendingJobs,
      failedJobs24h,
    };
  }, [jobs]);

  // --- Recent jobs (real data) ----------------------------------------

  const recentJobs = useMemo(() => {
    const sorted = [...jobs].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime; // newest first
    });

    return sorted.slice(0, 5).map((job) => ({
      id: job.id,
      datasetName: job.datasetName || '—',
      status: job.status,
      createdAt: formatDateTime(job.createdAt),
    }));
  }, [jobs]);

  // --- Recent datasets (real data) ------------------------------------

  const recentDatasets = useMemo(() => {
    const sorted = [...datasets].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime; // newest first
    });

    return sorted.slice(0, 5).map((d) => ({
      id: d.id,
      name: d.name || d.originalName || 'Untitled dataset',
      size: formatBytes(d.sizeBytes),
      uploadedAt: formatDate(d.createdAt),
    }));
  }, [datasets]);

  // --- Quick actions --------------------------------------------------

  const handleUploadDataset = () => {
    navigate('/upload-dataset');
  };

  const handleViewJobs = () => {
    navigate('/jobs');
  };

  return (
<>
        <DashboardStatsOverview stats={stats} />

        {error && (
          <Typography
            variant="body2"
            color="error"
            sx={{ mb: 1 }}
          >
            {error}
          </Typography>
        )}

        {loading && (
          <Typography
            variant="body2"
            sx={{ mb: 1 }}
          >
            Loading dashboard data...
          </Typography>
        )}

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
</>
  );
};

DashboardPageTemplate.propTypes = {
  onNavigate: PropTypes.func, // (key: 'dashboard' | 'datasets' | 'jobs' | 'settings') => void
};

export default DashboardPageTemplate;
