// src/pages/templates/DatasetViewPageTemplate.jsx
import React, { useMemo, useState, useCallback } from "react";
import PropTypes from "prop-types";

import DashboardSectionHeader from "../../components/molecules/DashboardSectionHeader";
import FlexBox from "../../components/atoms/FlexBox";
import Typography from "../../components/atoms/CustomTypography";

import DatasetViewToggle from "../../components/molecules/DatasetViewToggle";
import DatasetViewSectionToggle from "../../components/molecules/DatasetViewSectionToggle";

import DatasetViewPanel from "../../components/organisms/DatasetViewPanel";
import DatasetMetaPanel from "../../components/organisms/DatasetMetaPanel";
import DatasetVisualizationPanel from "../../components/organisms/DatasetVisualizationPanel";

import { parseCsvPreview } from "../../lib/parseCsvPreview";
import { normalizeMetadata } from "../../lib/datasetNormalization";

import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Skeleton from "@mui/material/Skeleton";
import Chip from "@mui/material/Chip";

const DatasetViewPageTemplate = ({ dataset, loading, error }) => {
  // SECTION: preview | visualize
  const [section, setSection] = useState("preview");

  // PREVIEW MODE: original | processed
  const [mode, setMode] = useState("original");

  // PREVIEW FORMAT: table | csv | json
  const [viewFormat, setViewFormat] = useState("table");

  // Optional AI inference toggle (default OFF)
  const [aiInferenceEnabled, setAiInferenceEnabled] = useState(false);

  const jobStatus = dataset?.job?.status || "PENDING";
  const isProcessing = jobStatus === "PENDING" || jobStatus === "RUNNING";

  const processingSummary = dataset?.processingSummary || {};

  const metadataNormalized = useMemo(() => {
    return normalizeMetadata(processingSummary?.metadata || {});
  }, [processingSummary?.metadata]);

  const metaDataset = useMemo(() => {
    if (!dataset) return null;

    const numericCount = metadataNormalized.numeric_columns.length;
    const categoricalCount = metadataNormalized.categorical_columns.length;

    const totalColumns =
      typeof numericCount === "number" && typeof categoricalCount === "number"
        ? numericCount + categoricalCount
        : null;

    return {
      id: dataset.id,
      name: dataset.originalName || dataset.name,
      size: dataset.sizeBytes !== null && dataset.sizeBytes !== undefined ? dataset.sizeBytes : null,
      uploadedAt: dataset.createdAt,
      totalRows: processingSummary.processedRows ?? null,

      preprocessingTasks: dataset.job?.preprocessingTasks || [],

      categoricalColumns: categoricalCount,
      numericColumns: numericCount,
      totalColumns,
      lastJobStatus: dataset.job?.status || "PENDING",
      lastJobId: dataset.job?.id,
      lastProcessedAt: dataset.job?.completedAt || null,
    };
  }, [dataset, metadataNormalized, processingSummary.processedRows]);

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

  const handleModeChange = useCallback((newMode) => setMode(newMode), []);

  // Resolve requested config source robustly:
  const requestedPreprocessingConfig =
    dataset?.job?.preprocessingConfig ||
    processingSummary?.metadata?.requested_config ||
    dataset?.job?.preprocessingConfig ||
    null;

  const executedSteps = metadataNormalized?.executed_steps || [];

  const headerRight = useMemo(() => {
    const name = dataset?.originalName || dataset?.name || "Dataset";
    return (
      <FlexBox sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        <Chip size="small" label={name} variant="outlined" />
        <Chip size="small" label={`Job: ${jobStatus}`} color={isProcessing ? "warning" : "default"} />
        {processingSummary?.processedRows != null && (
          <Chip size="small" label={`Rows: ${processingSummary.processedRows}`} />
        )}
        {processingSummary?.processedColumns != null && (
          <Chip size="small" label={`Cols: ${processingSummary.processedColumns}`} />
        )}
      </FlexBox>
    );
  }, [dataset, jobStatus, isProcessing, processingSummary?.processedRows, processingSummary?.processedColumns]);

  return (
    <>
      <DashboardSectionHeader
        title="Dataset view"
        subtitle="Inspect your original dataset, the preprocessed output, and analytical insights."
        rightSlot={headerRight}
      />

      {loading && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Skeleton variant="text" height={28} width="40%" />
          <Skeleton variant="rounded" height={120} sx={{ mt: 1 }} />
        </Paper>
      )}

      {error && !loading && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !dataset && !error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No dataset found.
        </Alert>
      )}

      {dataset && (
        <>
          <FlexBox
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", xl: "minmax(360px, 0.9fr) minmax(0, 2.1fr)" },
              gap: { xs: 2, sm: 2.5 },
              mb: 3,
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              alignItems: "start",
            }}
          >
            {/* Left: metadata (sticky on wide screens) */}
            <Box sx={{ minWidth: 0, maxWidth: "100%", position: { xl: "sticky" }, top: { xl: 16 }, alignSelf: "start" }}>
              <DatasetMetaPanel
                dataset={metaDataset}
                requestedPreprocessingConfig={requestedPreprocessingConfig}
                executedSteps={executedSteps}
              />
            </Box>

            {/* Right: controls + content */}
            <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0, maxWidth: "100%" }}>
              {/* Unified control bar */}
              <Paper
                elevation={0}
                sx={{
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  p: 1.5,
                }}
              >
                <FlexBox
                  sx={{
                    display: "flex",
                    gap: 1.25,
                    flexDirection: { xs: "column", md: "row" },
                    alignItems: { xs: "stretch", md: "center" },
                    justifyContent: "space-between",
                  }}
                >
                  <DatasetViewSectionToggle value={section} onChange={setSection} />

                  <FlexBox
                    sx={{
                      display: "flex",
                      gap: 1.5,
                      alignItems: { xs: "stretch", md: "center" },
                      justifyContent: "flex-end",
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Show dataset mode toggle only when Preview is selected */}
                    {section === "preview" && <DatasetViewToggle mode={mode} onChange={handleModeChange} />}

                    {/* Show AI toggle only when Visualize is selected */}
                    {section === "visualize" && (
                      <FormControlLabel
                        sx={{ ml: 0 }}
                        control={
                          <Switch
                            checked={aiInferenceEnabled}
                            onChange={(e) => setAiInferenceEnabled(e.target.checked)}
                          />
                        }
                        label="AI inference"
                      />
                    )}
                  </FlexBox>
                </FlexBox>

                <Divider sx={{ my: 1.25 }} />

                <Typography variant="caption" color="textSecondary">
                  Note: For performance reasons, only the first few rows of each dataset are used in preview and charts.
                  Correlation comes from the backend metadata when available.
                </Typography>
              </Paper>

              {/* Content */}
              {section === "preview" ? (
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
              ) : (
                <DatasetVisualizationPanel
                  loading={loading}
                  jobRunning={isProcessing}
                  originalRows={originalRows}
                  processedRows={processedRows}
                  metadata={metadataNormalized}
                  aiInferenceEnabled={aiInferenceEnabled}
                  datasetId={dataset?.id}
                  jobId={dataset?.job?.id}
                  filename={dataset?.originalName || dataset?.name}
                  rawData={dataset?.rawData || ""}
                  processedData={dataset?.processedData || ""}
                  processedRowsCount={processingSummary?.processedRows ?? null}
                  processedColumnsCount={processingSummary?.processedColumns ?? null}
                />
              )}
            </FlexBox>
          </FlexBox>
        </>
      )}
    </>
  );
};

DatasetViewPageTemplate.propTypes = {
  dataset: PropTypes.object,
  loading: PropTypes.bool,
  error: PropTypes.string,
};

DatasetViewPageTemplate.defaultProps = {
  dataset: null,
  loading: false,
  error: null,
};

export default DatasetViewPageTemplate;
