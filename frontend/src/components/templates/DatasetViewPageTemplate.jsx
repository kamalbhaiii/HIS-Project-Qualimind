import React, { useMemo, useState } from "react";
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

import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Box from "@mui/material/Box";

const DatasetViewPageTemplate = ({ dataset, loading, error }) => {
  const [mode, setMode] = useState("original"); // original | processed (used in Preview section)
  const [section, setSection] = useState("preview"); // preview | visualize
  const [viewFormat, setViewFormat] = useState("table"); // table | csv | json

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

  const handleModeChange = (newMode) => setMode(newMode);

  // Resolve requested config source robustly:
  const requestedPreprocessingConfig =
    dataset?.job?.preprocessingConfig ||
    processingSummary?.metadata?.requested_config ||
    dataset?.job?.preprocessingConfig ||
    null;

  const executedSteps = metadataNormalized?.executed_steps || [];

  return (
    <>
      <DashboardSectionHeader
        title="Dataset view"
        subtitle="Inspect your original dataset, the preprocessed output, and analytical insights."
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
              gridTemplateColumns: { xs: "1fr", lg: "minmax(320px, 1.1fr) minmax(0, 2fr)" },
              gap: { xs: 2, sm: 2.5 },
              mb: 3,
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              alignItems: "start",
            }}
          >
            {/* Left: metadata */}
            <FlexBox sx={{ minWidth: 0, maxWidth: "100%" }}>
              <DatasetMetaPanel
                dataset={metaDataset}
                requestedPreprocessingConfig={requestedPreprocessingConfig}
                executedSteps={executedSteps}
              />
            </FlexBox>

            {/* Right: toggles + content */}
            <FlexBox
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                minWidth: 0,
                maxWidth: "100%",
              }}
            >
              <FlexBox
                sx={{
                  display: "flex",
                  gap: 1.5,
                  flexDirection: { xs: "column", sm: "row" },
                  alignItems: { xs: "stretch", sm: "center" },
                  justifyContent: "space-between",
                }}
              >
                <DatasetViewToggle mode={mode} onChange={handleModeChange} />

                <FlexBox
                  sx={{
                    display: "flex",
                    alignItems: { xs: "stretch", sm: "center" },
                    justifyContent: "flex-end",
                    gap: 1.5,
                    flexWrap: "wrap",
                  }}
                >
                  <DatasetViewSectionToggle value={section} onChange={setSection} />

                  {/* Optional AI inference: show toggle only on Visualize */}
                  {section === "visualize" && (
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={aiInferenceEnabled}
                            onChange={(e) => setAiInferenceEnabled(e.target.checked)}
                          />
                        }
                        label="AI inference"
                      />
                    </Box>
                  )}
                </FlexBox>
              </FlexBox>

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

          <Typography variant="caption" color="textSecondary">
            Note: For performance reasons, only the first few rows of each dataset are displayed in previews.
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
};

export default DatasetViewPageTemplate;
