// src/components/templates/DatasetViewPageTemplate.jsx
import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";

import DashboardLayout from "../../components/templates/DashboardLayout";
import DashboardSectionHeader from "../../components/molecules/DashboardSectionHeader";
import FlexBox from "../../components/atoms/FlexBox";
import Typography from "../../components/atoms/CustomTypography";
import DatasetViewToggle from "../../components/molecules/DatasetViewToggle";
import DatasetViewPanel from "../../components/organisms/DatasetViewPanel";
import DatasetMetaPanel from "../../components/organisms/DatasetMetaPanel";

// --- helpers ---------------------------------------------------

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return "-";
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(1)} ${sizes[i]}`;
};

const formatDateTime = (iso) => {
  if (!iso) return "-";
  const date = new Date(iso);
  return date.toLocaleString();
};

/**
 * Very simple CSV preview parser.
 * NOTE: If you need full RFC support (quoted commas, etc),
 * swap this out for PapaParse or a similar library.
 */
const parseCsvPreview = (csvString, maxRows = 100) => {
  if (!csvString) return { columns: [], rows: [] };

  const lines = csvString.trim().split(/\r?\n/);
  if (!lines.length) return { columns: [], rows: [] };

  const columns = lines[0].split(",").map((c) => c.trim());
  const rows = lines
    .slice(1, 1 + maxRows)
    .filter((l) => l.trim().length > 0)
    .map((line) => {
      const values = line.split(",");
      const row = {};
      columns.forEach((col, idx) => {
        row[col] = values[idx] ?? "";
      });
      return row;
    });

  return { columns, rows };
};

const DatasetViewPageTemplate = ({ dataset, loading, error, onNavigate }) => {
  const [mode, setMode] = useState("original"); // original | processed
  const [viewFormat, setViewFormat] = useState("table"); // table | csv | json

  const jobStatus = dataset?.job?.status || "PENDING";

  const metaDataset = useMemo(() => {
    if (!dataset) return null;

    return {
      id: dataset.id,
      name: dataset.originalName || dataset.name,
      size: formatBytes(dataset.sizeBytes),
      uploadedAt: formatDateTime(dataset.createdAt),
      totalRows: dataset.totalRows ?? null, // optional, if backend adds
      totalColumns: dataset.totalColumns ?? null,
      categoricalColumns: dataset.categoricalColumns ?? null,
      numericColumns: dataset.numericColumns ?? null,
      lastJobStatus: dataset.job?.status || "PENDING",
      lastJobId: dataset.job?.id,
      lastProcessedAt: dataset.job?.completedAt
        ? formatDateTime(dataset.job.completedAt)
        : null,
    };
  }, [dataset]);

  const originalCsv = dataset?.rawData || "";
  const processedCsv = dataset?.processedData || "";

  const { columns: originalColumns, rows: originalRows } = useMemo(
    () => parseCsvPreview(originalCsv),
    [originalCsv]
  );

  const { columns: processedColumns, rows: processedRows } = useMemo(
    () => parseCsvPreview(processedCsv),
    [processedCsv]
  );

  const handleModeChange = (newMode) => {
    setMode(newMode);
  };

  return (
    <DashboardLayout activeKey="datasets" onNavigate={onNavigate}>
      <DashboardSectionHeader
        title="Dataset view"
        subtitle="Inspect your original dataset and the preprocessed output."
      />

      {loading && (
        <Typography variant="body2" sx={{ mb: 2 }}>
          Loading dataset...
        </Typography>
      )}

      {error && !loading && (
        <Typography variant="body2" color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {!loading && !dataset && !error && (
        <Typography variant="body2" sx={{ mb: 2 }}>
          No dataset found.
        </Typography>
      )}

      {dataset && (
        <>
          <FlexBox
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.4fr 2fr" },
              gap: 2,
              mb: 3,
            }}
          >
            <DatasetMetaPanel dataset={metaDataset} />

            <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <DatasetViewToggle mode={mode} onChange={handleModeChange} />

              <DatasetViewPanel
                mode={mode}
                jobStatus={jobStatus}
                jobErrorMessage={dataset?.job?.errorMessage || ""}
                datasetName={dataset.originalName || dataset.name}
                viewFormat={viewFormat}
                onViewFormatChange={setViewFormat}
                originalCsv={originalCsv}
                originalColumns={originalColumns}
                originalRows={originalRows}
                processedCsv={processedCsv}
                processedColumns={processedColumns}
                processedRows={processedRows}
              />
            </FlexBox>
          </FlexBox>

          <Typography variant="caption" color="textSecondary">
            Note: For performance reasons, only the first few rows of each
            dataset are displayed here.
          </Typography>
        </>
      )}
    </DashboardLayout>
  );
};

DatasetViewPageTemplate.propTypes = {
  dataset: PropTypes.object,
  loading: PropTypes.bool,
  error: PropTypes.string,
  onNavigate: PropTypes.func,
};

export default DatasetViewPageTemplate;
