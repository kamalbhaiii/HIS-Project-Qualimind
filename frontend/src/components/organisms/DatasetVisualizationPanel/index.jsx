// src/components/organisms/DatasetVisualizationPanel/index.jsx
// (Use your actual path/file name; this is the fully updated component code.)

import React, { useMemo, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";
import ChartCard from "../../molecules/ChartCard";
import CorrelationHeatmap from "../../molecules/CorrelationHeatmap";
import { HistogramChart, CategoryBarChart, ScatterPlot } from "../../molecules/BasicCharts";

import {
  getNumericColumnsFromRows,
  getCategoricalColumnsFromRows,
  buildHistogram,
  buildCategoryCounts,
  buildScatter,
} from "../../../lib/chartData";

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableContainer from "@mui/material/TableContainer";
import Box from "@mui/material/Box";

// NEW: insights API call
import { generateDatasetInsights } from "../../../services/modules/insights.api";

function toActionCountSeries(columnActions) {
  if (!columnActions || typeof columnActions !== "object") return [];
  const out = [];
  Object.entries(columnActions).forEach(([col, actions]) => {
    const arr = Array.isArray(actions) ? actions : actions ? [actions] : [];
    out.push({ label: col, value: arr.length });
  });
  out.sort((a, b) => (b.value || 0) - (a.value || 0));
  return out;
}

// --- Session storage helpers (per dataset/job) ---
function makeInsightsStorageKey({ datasetId, jobId }) {
  const d = datasetId || "na";
  const j = jobId || "na";
  return `ai_insights:v1:${d}:${j}`;
}

function safeSessionGet(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function safeSessionSet(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / security errors
  }
}

const DatasetVisualizationPanel = ({
  loading,
  jobRunning,
  originalRows,
  processedRows,
  metadata,
  aiInferenceEnabled,

  // NEW props for insights payload + cache identity
  datasetId,
  jobId,
  filename,
  rawData,
  processedData,
  processedRowsCount,
  processedColumnsCount,
}) => {
  const showLoading = loading || jobRunning;

  // ----------------------------
  // Existing analytics rendering
  // ----------------------------
  const corr = metadata?.correlation || null;
  const corrColumns = Array.isArray(corr?.used_columns) ? corr.used_columns : [];
  const topPairs = Array.isArray(corr?.top_pairs) ? corr.top_pairs : [];

  const scalingStats = metadata?.scaling_stats || {};
  const columnActions = metadata?.column_actions || {};

  const numericCols = useMemo(() => getNumericColumnsFromRows(processedRows), [processedRows]);

  const categoricalColsOriginal = useMemo(
    () => getCategoricalColumnsFromRows(originalRows, 50),
    [originalRows]
  );

  const topPair = useMemo(() => {
    if (topPairs.length) return topPairs[0];
    if (numericCols.length >= 2) return { col1: numericCols[0], col2: numericCols[1], r: null };
    return null;
  }, [topPairs, numericCols]);

  const scatterData = useMemo(() => {
    if (!topPair) return [];
    return buildScatter(processedRows, topPair.col1, topPair.col2);
  }, [processedRows, topPair]);

  const histTargets = useMemo(() => numericCols.slice(0, 2), [numericCols]);

  const histData = useMemo(() => {
    const out = {};
    histTargets.forEach((c) => {
      out[c] = buildHistogram(processedRows, c, 8);
    });
    return out;
  }, [processedRows, histTargets]);

  const categoryTarget = categoricalColsOriginal[0] || null;

  const catData = useMemo(() => {
    if (!categoryTarget) return [];
    return buildCategoryCounts(originalRows, categoryTarget, 12);
  }, [originalRows, categoryTarget]);

  const actionCountSeries = useMemo(() => toActionCountSeries(columnActions).slice(0, 12), [
    columnActions,
  ]);

  const scalingRows = useMemo(() => {
    if (!scalingStats || typeof scalingStats !== "object") return [];
    return Object.entries(scalingStats).map(([col, v]) => {
      const mean = typeof v?.mean === "number" ? v.mean : null;
      const sd = typeof v?.sd === "number" ? v.sd : null;
      const method = v?.method ? String(v.method) : "—";
      return { col, mean, sd, method };
    });
  }, [scalingStats]);

  const previewNote = "Charts are computed from preview rows only.";

  // ----------------------------
  // NEW: AI Insights state + cache (sessionStorage + in-memory)
  // ----------------------------
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(null);

  // in-memory cache to prevent repeat fetches during the same page lifetime
  const insightsCacheRef = useRef(new Map());

  // Compute a stable storage key for this dataset/job
  const storageKey = useMemo(() => {
    return makeInsightsStorageKey({ datasetId, jobId });
  }, [datasetId, jobId]);

  useEffect(() => {
    // Rule: Only call (or load cache) if enabled
    if (!aiInferenceEnabled) return;

    // If job still running or page loading, do nothing
    if (loading || jobRunning) return;

    // 1) Check in-memory cache first
    const memCached = insightsCacheRef.current.get(storageKey);
    if (memCached) {
      setInsights(memCached);
      setInsightsError(null);
      return;
    }

    // 2) Check sessionStorage next
    const sessionCached = safeSessionGet(storageKey);
    if (sessionCached) {
      insightsCacheRef.current.set(storageKey, sessionCached);
      setInsights(sessionCached);
      setInsightsError(null);
      return;
    }

    // 3) Otherwise call API
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;

    (async () => {
      try {
        setInsightsLoading(true);
        setInsightsError(null);

        const payload = {
          filename: filename || "",
          rawData: rawData || "",
          processedData: processedData || "",
          processedRows: typeof processedRowsCount === "number" ? processedRowsCount : undefined,
          processedColumns: typeof processedColumnsCount === "number" ? processedColumnsCount : undefined,
          metadata: metadata || {},
        };

        const res = await generateDatasetInsights(
          payload,
        );

        // Save caches
        insightsCacheRef.current.set(storageKey, res);
        safeSessionSet(storageKey, res);

        setInsights(res);
      } catch (err) {
        if (err?.name === "AbortError") return;

        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to generate AI insights";

        setInsightsError(msg);
        setInsights(null);
      } finally {
        setInsightsLoading(false);
      }
    })();

    return () => {
      if (controller) controller.abort();
    };
  }, [
    aiInferenceEnabled,
    loading,
    jobRunning,
    storageKey,
    filename,
    rawData,
    processedData,
    processedRowsCount,
    processedColumnsCount,
    metadata,
  ]);

  return (
    <FlexBox
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gap: { xs: 2, sm: 2.5 },
        width: "100%",
        minWidth: 0,
      }}
    >
            {/* AI inference (only when enabled) */}
      {aiInferenceEnabled && (
        <ChartCard
          title="AI inference"
          subtitle="Automated interpretation of what can be concluded from the processed dataset."
          loading={showLoading}
          sx={{ gridColumn: { xs: "auto", md: "1 / span 2" } }}
        >
          <Box
            sx={{
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 2,
              p: 2,
              background: "rgba(0,0,0,0.02)",
            }}
          >
            {insightsLoading ? (
              <Typography variant="body2" color="textSecondary">
                Generating insights...
              </Typography>
            ) : insightsError ? (
              <>
                <Typography variant="body2" sx={{ fontWeight: 700 }} color="error">
                  Failed to generate insights
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 0.75 }}>
                  {insightsError}
                </Typography>
              </>
            ) : !insights ? (
              <Typography variant="body2" color="textSecondary">
                No insights available.
              </Typography>
            ) : (
              <>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Executive summary
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 0.75, mb: 1.5 }}>
                  {insights.executiveSummary || "—"}
                </Typography>

                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Key findings
                </Typography>
                <ul style={{ marginTop: 8, marginBottom: 16 }}>
                  {(insights.keyFindings || []).slice(0, 8).map((x, i) => (
                    <li key={`kf-${i}`}>
                      <Typography variant="body2" color="textSecondary">
                        {x}
                      </Typography>
                    </li>
                  ))}
                </ul>

                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Data quality observations
                </Typography>
                <ul style={{ marginTop: 8, marginBottom: 16 }}>
                  {(insights.dataQualityObservations || []).slice(0, 8).map((x, i) => (
                    <li key={`dq-${i}`}>
                      <Typography variant="body2" color="textSecondary">
                        {x}
                      </Typography>
                    </li>
                  ))}
                </ul>

                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Correlation insights
                </Typography>
                <ul style={{ marginTop: 8, marginBottom: 16 }}>
                  {(insights.correlationInsights || []).slice(0, 8).map((x, i) => (
                    <li key={`ci-${i}`}>
                      <Typography variant="body2" color="textSecondary">
                        {x}
                      </Typography>
                    </li>
                  ))}
                </ul>

                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Recommended next steps
                </Typography>
                <ul style={{ marginTop: 8, marginBottom: 0 }}>
                  {(insights.recommendedNextSteps || []).slice(0, 8).map((x, i) => (
                    <li key={`ns-${i}`}>
                      <Typography variant="body2" color="textSecondary">
                        {x}
                      </Typography>
                    </li>
                  ))}
                </ul>

                <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 1.5 }}>
                  Confidence:{" "}
                  {typeof insights.confidence === "number"
                    ? `${Math.round(insights.confidence * 100)}%`
                    : "—"}
                </Typography>

                {!!(insights.warnings || []).length && (
                  <>
                    <Typography variant="body2" sx={{ fontWeight: 700, mt: 1.5 }}>
                      Warnings
                    </Typography>
                    <ul style={{ marginTop: 8, marginBottom: 0 }}>
                      {(insights.warnings || []).slice(0, 6).map((x, i) => (
                        <li key={`w-${i}`}>
                          <Typography variant="body2" color="textSecondary">
                            {x}
                          </Typography>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </Box>
        </ChartCard>
      )}
      {/* Actions per column */}
      <ChartCard
        title="Preprocessing impact"
        subtitle="How many transformations/actions were applied per column (from metadata)."
        loading={showLoading}
        footer={previewNote}
        sx={{ gridColumn: { xs: "auto", md: "1 / span 2" } }}
      >
        {actionCountSeries.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No column action metadata available for this job.
          </Typography>
        ) : (
          <CategoryBarChart data={actionCountSeries} />
        )}
      </ChartCard>

      {/* Correlation heatmap */}
      <ChartCard
        title="Correlation heatmap"
        subtitle="Pairwise correlation for requested numeric columns."
        loading={showLoading}
        footer={previewNote}
        sx={{ gridColumn: { xs: "auto", md: "1 / span 2" } }}
      >
        {!corr ? (
          <Typography variant="body2" color="textSecondary">
            Correlation was not requested for this job.
          </Typography>
        ) : corr?.error ? (
          <Typography variant="body2" color="error">
            Correlation failed: {String(corr.error)}
          </Typography>
        ) : (
          <CorrelationHeatmap columns={corrColumns} matrix={corr.matrix} />
        )}
      </ChartCard>

      {/* Top correlation pairs */}
      <ChartCard
        title="Top correlation pairs"
        subtitle="Strongest relationships ranked by absolute correlation."
        loading={showLoading}
        footer={previewNote}
      >
        {!corr ? (
          <Typography variant="body2" color="textSecondary">
            Correlation was not requested for this job.
          </Typography>
        ) : !topPairs.length ? (
          <Typography variant="body2" color="textSecondary">
            No correlation pairs available (not enough usable numeric columns or all constant).
          </Typography>
        ) : (
          <TableContainer
            sx={{
              borderRadius: 1,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              maxHeight: 260,
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Column 1</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Column 2</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: "right" }}>r</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topPairs.slice(0, 10).map((p, idx) => (
                  <TableRow key={`${p.col1}-${p.col2}-${idx}`} hover>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{p.col1}</TableCell>
                    <TableCell>{p.col2}</TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      {typeof p.r === "number" ? p.r.toFixed(4) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </ChartCard>

      {/* Scatter plot */}
      <ChartCard
        title="Correlation scatter plot"
        subtitle={
          topPair
            ? `${topPair.col1} vs ${topPair.col2}${
                typeof topPair.r === "number" ? ` (r=${topPair.r.toFixed(3)})` : ""
              }`
            : "No pair available"
        }
        loading={showLoading}
        footer={previewNote}
      >
        {!topPair ? (
          <Typography variant="body2" color="textSecondary">
            Not enough numeric columns to plot.
          </Typography>
        ) : scatterData.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            Not enough numeric points in the preview to plot.
          </Typography>
        ) : (
          <ScatterPlot data={scatterData} xLabel={topPair.col1} yLabel={topPair.col2} />
        )}
      </ChartCard>

      {/* Categorical distribution */}
      <ChartCard
        title="Categorical distribution"
        subtitle={categoryTarget ? `Top categories for "${categoryTarget}"` : "No categorical column found"}
        loading={showLoading}
        footer={previewNote}
      >
        {!categoryTarget ? (
          <Typography variant="body2" color="textSecondary">
            No categorical column available in the original preview.
          </Typography>
        ) : (
          <CategoryBarChart data={catData} />
        )}
      </ChartCard>

      {/* Numeric distributions */}
      {histTargets.map((col) => (
        <ChartCard
          key={col}
          title="Numeric distribution"
          subtitle={`Histogram for "${col}"`}
          loading={showLoading}
          footer={previewNote}
        >
          {histData[col]?.length ? (
            <HistogramChart data={histData[col]} />
          ) : (
            <Typography variant="body2" color="textSecondary">
              Not enough numeric values to build a histogram.
            </Typography>
          )}
        </ChartCard>
      ))}

      {/* Scaling stats */}
      <ChartCard
        title="Scaling statistics"
        subtitle="Mean and standard deviation used for scaling (from metadata)."
        loading={showLoading}
        footer="This uses backend scaling_stats (not recomputed client-side)."
        sx={{ gridColumn: { xs: "auto", md: "1 / span 2" } }}
      >
        {!scalingRows.length ? (
          <Typography variant="body2" color="textSecondary">
            No scaling statistics were recorded for this job.
          </Typography>
        ) : (
          <TableContainer
            sx={{
              borderRadius: 1,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              maxHeight: 260,
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Column</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: "right" }}>Mean</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: "right" }}>SD</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scalingRows.map((r) => (
                  <TableRow key={r.col} hover>
                    <TableCell>{r.col}</TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      {typeof r.mean === "number" ? r.mean.toFixed(4) : "—"}
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      {typeof r.sd === "number" ? r.sd.toFixed(4) : "—"}
                    </TableCell>
                    <TableCell>{r.method}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </ChartCard>
    </FlexBox>
  );
};

DatasetVisualizationPanel.propTypes = {
  loading: PropTypes.bool,
  jobRunning: PropTypes.bool,
  originalRows: PropTypes.arrayOf(PropTypes.object),
  processedRows: PropTypes.arrayOf(PropTypes.object),
  metadata: PropTypes.object,
  aiInferenceEnabled: PropTypes.bool,

  datasetId: PropTypes.string,
  jobId: PropTypes.string,
  filename: PropTypes.string,
  rawData: PropTypes.string,
  processedData: PropTypes.string,
  processedRowsCount: PropTypes.number,
  processedColumnsCount: PropTypes.number,
};

DatasetVisualizationPanel.defaultProps = {
  loading: false,
  jobRunning: false,
  originalRows: [],
  processedRows: [],
  metadata: null,
  aiInferenceEnabled: false,

  datasetId: null,
  jobId: null,
  filename: "",
  rawData: "",
  processedData: "",
  processedRowsCount: null,
  processedColumnsCount: null,
};

export default DatasetVisualizationPanel;
