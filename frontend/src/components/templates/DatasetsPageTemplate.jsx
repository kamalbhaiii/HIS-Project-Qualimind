import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import FlexBox from '../atoms/FlexBox';
import DashboardStatsOverview from '../organisms/DashboardStatsOverview';
import DatasetListTable from '../organisms/DatasetListTable';
import DatasetUploadPanel from '../organisms/DatasetUploadPanel';
import DashboardSectionHeader from '../molecules/DashboardSectionHeader';
import {getDatasets} from '../../services/modules/dataset.api'
import { useToast } from '../organisms/ToastProvider';

const DatasetsPageTemplate = () => {
  const [datasets, setDatasets] = React.useState([]); 
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const navigate = useNavigate();
  const {showToast} = useToast();

  const fetchDatasets = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await getDatasets();

      const data = await res
      setDatasets(data);
    } catch (err) {
      showToast(err.message || 'Failed to fetch datasets', 'error')
      setError(err.message || 'Failed to fetch datasets');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes)) return '-';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    return `${value.toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  };

  // Map API datasets into what DatasetListTable expects
  const tableDatasets = datasets.map((d) => (
    {
    id: d.id,
    name: d.name || d.originalName,
    size: formatBytes(d.sizeBytes),
    uploadedAt: formatDate(d.createdAt),
    lastJobStatus: d.job?.status || null,
    lastJobId: d.job?.id || null,
    status: d?.job?.status
  }));

  // Derive stats from real data
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const stats = {
    processedDatasets: datasets.filter((d) => d.job?.status === 'SUCCESS').length,
    runningJobs: datasets.filter((d) => d.job?.status === 'RUNNING').length,
    pendingJobs: datasets.filter((d) => d.job?.status === 'PENDING').length,
    failedJobs24h: datasets.filter((d) => {
      if (d.job?.status !== 'FAILED' || !d.job?.completedAt) return false;
      const completedAt = new Date(d.job.completedAt).getTime();
      return now - completedAt <= ONE_DAY_MS;
    }).length,
  };

  // --- Handlers --------------------------------------------------------

  const handleViewDataset = (dataset) => {
    // Navigate to a dataset view page; adjust route if needed
    navigate(`/dataset-view/${dataset.id}`);
  };

  const handleStartJob = (dataset) => {
    // Here you can call an API to create a new processing job for the dataset
    // eslint-disable-next-line no-console
    console.log('Start job for dataset:', dataset);
  };

  const handleUpload = async (files) => {
    if (!files || !files.length) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);

    try {
      const res = await fetch('/api/datasets', {
        method: 'POST',
        body: formData,
        credentials: 'include', // adjust if you use tokens instead of cookies
      });

      if (!res.ok) {
        throw new Error('Failed to upload dataset');
      }

      // Refresh list after successful upload
      await fetchDatasets();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setError(err.message || 'Failed to upload dataset');
    }
  };

  return (
    <DashboardLayout activeKey="datasets">
      <DashboardStatsOverview stats={stats} />

      <DashboardSectionHeader
        title="Datasets"
        subtitle="Manage your uploaded datasets and preprocessing runs"
      />

      {error && (
        <div style={{ marginBottom: 16, color: 'red' }}>
          {error}
        </div>
      )}

      <FlexBox
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
          gap: 2,
        }}
      >
        {loading ? (
          <div>Loading datasets...</div>
        ) : (
          <DatasetListTable
            datasets={tableDatasets}
            onViewDataset={handleViewDataset}
            onStartJob={handleStartJob}
          />
        )}

        <DatasetUploadPanel onMockUpload={handleUpload} />
      </FlexBox>
    </DashboardLayout>
  );
};

export default DatasetsPageTemplate;
