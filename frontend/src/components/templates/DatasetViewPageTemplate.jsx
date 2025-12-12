// src/components/templates/DatasetViewPageTemplate.jsx
import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import DashboardSectionHeader from "../../components/molecules/DashboardSectionHeader";
import FlexBox from "../../components/atoms/FlexBox";
import Typography from "../../components/atoms/CustomTypography";
import DatasetViewToggle from "../../components/molecules/DatasetViewToggle";
import DatasetViewPanel from "../../components/organisms/DatasetViewPanel";
import DatasetMetaPanel from "../../components/organisms/DatasetMetaPanel";

// --- helpers ---------------------------------------------------

const formatBytes = (bytes) => {
  if (bytes === null || bytes === undefined) return "-";
  if (Number.isNaN(bytes)) return "-";
  if (bytes === 0) return "0 Bytes";

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

    const processingSummary = dataset.processingSummary || {};
    const metadata = processingSummary.metadata || {};

    const numericCols = Array.isArray(metadata.numeric_columns)
      ? metadata.numeric_columns
      : [];
    const categoricalCols = Array.isArray(metadata.categorical_columns)
      ? metadata.categorical_columns
      : [];

    const numericCount = numericCols.length;
    const categoricalCount = categoricalCols.length;

    // Ensure correct operator precedence and null safety:
    const totalColumns =
      typeof numericCount === "number" && typeof categoricalCount === "number"
        ? numericCount + categoricalCount
        : null;

    return {
      id: dataset.id,
      name: dataset.originalName || dataset.name,
      size: formatBytes(dataset.sizeBytes),
      uploadedAt: formatDateTime(dataset.createdAt),
      totalRows: processingSummary.processedRows ?? null,
      preprocessingTasks: dataset.job?.preprocessingTasks || [],
      categoricalColumns: categoricalCount,
      numericColumns: numericCount,
      totalColumns,
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
    // Optional UX improvement: keep current viewFormat, or reset:
    // setViewFormat("table");
  };

  return (
    <>
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
              // Responsive layout container
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "minmax(320px, 1.1fr) minmax(0, 2fr)",
              },
              gap: { xs: 2, sm: 2.5 },
              mb: 3,

              // Prevent page-level overflow from children
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              alignItems: "start",
            }}
          >
            {/* Left column: metadata */}
            <FlexBox
              sx={{
                minWidth: 0,
                maxWidth: "100%",
              }}
            >
              <DatasetMetaPanel dataset={metaDataset} />
            </FlexBox>

            {/* Right column: toggle + view panel */}
            <FlexBox
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                minWidth: 0,
                maxWidth: "100%",
              }}
            >
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
            Note: For performance reasons, only the first few rows of each dataset
            are displayed here.
          </Typography>
        </>
      )}
    </>
  );
};

DatasetViewPageTemplate.propTypes = {
  dataset: PropTypes.object,
  loading: PropTypes.bool,
  error: PropTypes.string,
  onNavigate: PropTypes.func,
};

export default DatasetViewPageTemplate;
