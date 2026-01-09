// src/components/organisms/DatasetVisualizationPanel/index.jsx

import React, { useMemo, useEffect, useRef, useState, useCallback } from "react";
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
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";

import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";

import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";

import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// NEW: insights API call
import { generateDatasetInsights } from "../../../services/modules/insights.api";

/* ------------------------- helpers ------------------------- */

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
    // ignore quota/security errors
  }
}

function isPlainObject(x) {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

/**
 * Normalize correlation metadata to a multi-analysis internal shape.
 * Supports:
 * - Legacy single result: { used_columns, matrix, top_pairs, ... }
 * - Multi envelope (new): { version:"1.0", analyses:[{id,name,result|enabled|message}, ...], summary, primaryId }
 */
function normalizeCorrelationMeta(corr) {
  if (!corr) return { mode: "none", analyses: [] };

  // Multi envelope from the production-grade R fix:
  if (isPlainObject(corr) && corr.version === "1.0" && Array.isArray(corr.analyses)) {
    const analyses = corr.analyses
      .map((a, idx) => {
        const id = String(a?.id || `analysis_${idx + 1}`);
        const name = String(a?.name || `Correlation ${idx + 1}`);

        // In multi-run output, a may be:
        // - { id, name, result: { ...legacyResult } }
        // - or { id, name, enabled:false, message:"Skipped" }
        const result = a?.result || null;

        // Some outputs may keep fields at top-level (defensive)
        const effective = result || a;

        return {
          id,
          name,
          raw: a,
          result: effective && isPlainObject(effective) ? effective : null,
        };
      })
      .filter(Boolean);

    return {
      mode: "multi",
      primaryId: corr.primaryId ? String(corr.primaryId) : analyses[0]?.id || null,
      summary: corr.summary || null,
      analyses,
    };
  }

  // Legacy single result
  if (isPlainObject(corr)) {
    return {
      mode: "single",
      primaryId: "primary",
      analyses: [
        {
          id: "primary",
          name: "Correlation",
          raw: corr,
          result: corr,
        },
      ],
    };
  }

  return { mode: "none", analyses: [] };
}

function safeColumnsFromCorrelationResult(r) {
  if (!r || typeof r !== "object") return [];
  const cols = Array.isArray(r.used_columns) ? r.used_columns : Array.isArray(r.usedColumns) ? r.usedColumns : [];
  return cols.filter(Boolean);
}

function safePairsFromCorrelationResult(r) {
  if (!r || typeof r !== "object") return [];
  const pairs = Array.isArray(r.top_pairs) ? r.top_pairs : Array.isArray(r.topPairs) ? r.topPairs : [];
  return pairs;
}

function safeCorrelationMatrix(r) {
  if (!r || typeof r !== "object") return null;
  return r.matrix || null;
}

/* ------------------------- component ------------------------- */

const DatasetVisualizationPanel = ({
  loading,
  jobRunning,
  originalRows,
  processedRows,
  metadata,
  aiInferenceEnabled,

  datasetId,
  jobId,
  filename,
  rawData,
  processedData,
  processedRowsCount,
  processedColumnsCount,
}) => {
  const showLoading = loading || jobRunning;

  const previewNote = "Charts are computed from preview rows only (client-side).";

  /* -------------------------
   * Dataset-derived columns
   * ------------------------- */

  const numericColsOriginal = useMemo(() => getNumericColumnsFromRows(originalRows), [originalRows]);
  const numericColsProcessed = useMemo(() => getNumericColumnsFromRows(processedRows), [processedRows]);

  const categoricalColsOriginal = useMemo(
    () => getCategoricalColumnsFromRows(originalRows, 50),
    [originalRows]
  );
  const categoricalColsProcessed = useMemo(
    () => getCategoricalColumnsFromRows(processedRows, 50),
    [processedRows]
  );

  /* -------------------------
   * Metadata-driven panes
   * ------------------------- */

  const scalingStats = metadata?.scaling_stats || {};
  const columnActions = metadata?.column_actions || {};
  const actionCountSeries = useMemo(() => toActionCountSeries(columnActions).slice(0, 12), [columnActions]);

  const scalingRows = useMemo(() => {
    if (!scalingStats || typeof scalingStats !== "object") return [];
    return Object.entries(scalingStats).map(([col, v]) => {
      const mean = typeof v?.mean === "number" ? v.mean : null;
      const sd = typeof v?.sd === "number" ? v.sd : null;
      const method = v?.method ? String(v.method) : "—";
      const min = typeof v?.min === "number" ? v.min : null;
      const max = typeof v?.max === "number" ? v.max : null;
      return { col, mean, sd, min, max, method };
    });
  }, [scalingStats]);

  /* -------------------------
   * Correlation (single + multi)
   * ------------------------- */

  const corrNormalized = useMemo(() => normalizeCorrelationMeta(metadata?.correlation || null), [metadata?.correlation]);

  // For UI control: which analysis is "active" for pair/scatter selection (default primary)
  const [activeCorrAnalysisId, setActiveCorrAnalysisId] = useState(null);

  useEffect(() => {
    if (!corrNormalized?.analyses?.length) {
      setActiveCorrAnalysisId(null);
      return;
    }
    const preferred = corrNormalized.primaryId || corrNormalized.analyses[0]?.id;
    setActiveCorrAnalysisId((prev) => prev || preferred);
  }, [corrNormalized]);

  const activeCorrAnalysis = useMemo(() => {
    if (!activeCorrAnalysisId) return null;
    return corrNormalized.analyses.find((a) => a.id === activeCorrAnalysisId) || corrNormalized.analyses[0] || null;
  }, [corrNormalized.analyses, activeCorrAnalysisId]);

  const activeCorrResult = activeCorrAnalysis?.result || null;
  const activeCorrPairs = useMemo(() => safePairsFromCorrelationResult(activeCorrResult), [activeCorrResult]);
  const activeTopPair = useMemo(() => {
    if (activeCorrPairs?.length) return activeCorrPairs[0];
    // fallback: use processed numeric columns if possible
    if ((numericColsProcessed || []).length >= 2) return { col1: numericColsProcessed[0], col2: numericColsProcessed[1], r: null };
    return null;
  }, [activeCorrPairs, numericColsProcessed]);

  const [scatterPairIndex, setScatterPairIndex] = useState(0);

  useEffect(() => {
    // Reset pair index when analysis changes
    setScatterPairIndex(0);
  }, [activeCorrAnalysisId]);

  const scatterPair = useMemo(() => {
    if (!activeCorrPairs?.length) return activeTopPair;
    const idx = Math.min(Math.max(0, scatterPairIndex), activeCorrPairs.length - 1);
    return activeCorrPairs[idx] || activeTopPair;
  }, [activeCorrPairs, scatterPairIndex, activeTopPair]);

  const scatterDataProcessed = useMemo(() => {
    if (!scatterPair || !scatterPair.col1 || !scatterPair.col2) return [];
    return buildScatter(processedRows, scatterPair.col1, scatterPair.col2);
  }, [processedRows, scatterPair]);

  /* -------------------------
   * User-controlled visualization selection
   * ------------------------- */

  // Defaults: show a balanced set without overwhelming the user.
  const [vizPrefs, setVizPrefs] = useState(() => ({
    showPreprocessingImpact: true,
    showCorrelation: true,
    showCorrelationPairs: true,
    showCorrelationScatter: true,
    showDistributions: true,
    showCategorical: true,
    showScalingStats: true,
    showAiInference: false, // controlled by aiInferenceEnabled anyway
  }));

  useEffect(() => {
    // Keep preference in sync with external AI toggle (page-level)
    setVizPrefs((p) => ({ ...p, showAiInference: aiInferenceEnabled === true }));
  }, [aiInferenceEnabled]);

  const updatePref = useCallback((key) => {
    setVizPrefs((p) => ({ ...p, [key]: !p[key] }));
  }, []);

  // Dataset control per chart group
  const [distDatasetMode, setDistDatasetMode] = useState("both"); // original | processed | both
  const [catDatasetMode, setCatDatasetMode] = useState("original"); // original | processed
  const [corrDatasetMode] = useState("processed"); // correlation should reflect processed_df from backend; keep fixed

  /* -------------------------
   * Distributions: user selection
   * ------------------------- */

  const [histColA, setHistColA] = useState("");
  const [histColB, setHistColB] = useState("");

  useEffect(() => {
    // Initialize histogram targets sensibly based on processed numeric columns
    const cols = numericColsProcessed || [];
    if (!cols.length) return;

    setHistColA((prev) => (prev && cols.includes(prev) ? prev : cols[0]));
    setHistColB((prev) => {
      if (prev && cols.includes(prev)) return prev;
      if (cols.length >= 2) return cols[1];
      return cols[0];
    });
  }, [numericColsProcessed]);

  const histTargets = useMemo(() => {
    const out = [];
    if (histColA) out.push(histColA);
    if (histColB && histColB !== histColA) out.push(histColB);
    return out.slice(0, 2);
  }, [histColA, histColB]);

  const histDataOriginal = useMemo(() => {
    const out = {};
    histTargets.forEach((c) => {
      out[c] = buildHistogram(originalRows, c, 8);
    });
    return out;
  }, [originalRows, histTargets]);

  const histDataProcessed = useMemo(() => {
    const out = {};
    histTargets.forEach((c) => {
      out[c] = buildHistogram(processedRows, c, 8);
    });
    return out;
  }, [processedRows, histTargets]);

  /* -------------------------
   * Categorical distribution: user selection
   * ------------------------- */

  const [catCol, setCatCol] = useState("");

  useEffect(() => {
    const sourceCols = catDatasetMode === "processed" ? categoricalColsProcessed : categoricalColsOriginal;
    const fallback = sourceCols?.[0] || "";
    setCatCol((prev) => (prev && sourceCols.includes(prev) ? prev : fallback));
  }, [catDatasetMode, categoricalColsOriginal, categoricalColsProcessed]);

  const catData = useMemo(() => {
    if (!catCol) return [];
    const rows = catDatasetMode === "processed" ? processedRows : originalRows;
    return buildCategoryCounts(rows, catCol, 12);
  }, [catDatasetMode, processedRows, originalRows, catCol]);

  /* -------------------------
   * AI Insights state + cache
   * ------------------------- */

  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(null);

  const insightsCacheRef = useRef(new Map());
  const storageKey = useMemo(() => makeInsightsStorageKey({ datasetId, jobId }), [datasetId, jobId]);

  useEffect(() => {
    if (!aiInferenceEnabled) return;
    if (loading || jobRunning) return;

    const memCached = insightsCacheRef.current.get(storageKey);
    if (memCached) {
      setInsights(memCached);
      setInsightsError(null);
      return;
    }

    const sessionCached = safeSessionGet(storageKey);
    if (sessionCached) {
      insightsCacheRef.current.set(storageKey, sessionCached);
      setInsights(sessionCached);
      setInsightsError(null);
      return;
    }

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

        const res = await generateDatasetInsights(payload);

        insightsCacheRef.current.set(storageKey, res);
        safeSessionSet(storageKey, res);

        setInsights(res);
      } catch (err) {
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

  /* -------------------------
   * Render helpers
   * ------------------------- */

  const renderCorrelationCards = useCallback(() => {
    if (!corrNormalized || corrNormalized.mode === "none" || !corrNormalized.analyses.length) {
      return (
        <ChartCard
          title="Correlation"
          subtitle="Pairwise correlation for requested numeric columns."
          loading={showLoading}
          footer={previewNote}
          sx={{ gridColumn: { xs: "auto", md: "1 / span 2" } }}
        >
          <Typography variant="body2" color="textSecondary">
            Correlation was not requested for this job.
          </Typography>
        </ChartCard>
      );
    }

    return (
      <ChartCard
        title="Correlation analyses"
        subtitle={
          corrNormalized.mode === "multi"
            ? "Multiple correlation analyses computed by the backend."
            : "Correlation analysis computed by the backend."
        }
        loading={showLoading}
        footer={previewNote}
        sx={{ gridColumn: { xs: "auto", md: "1 / span 2" } }}
      >
        {/* Analysis selector */}
        <FlexBox sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", mb: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Active analysis
          </Typography>

          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel id="corr-analysis-select-label">Correlation analysis</InputLabel>
            <Select
              labelId="corr-analysis-select-label"
              value={activeCorrAnalysisId || ""}
              label="Correlation analysis"
              onChange={(e) => setActiveCorrAnalysisId(e.target.value)}
            >
              {corrNormalized.analyses.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {corrNormalized.mode === "multi" && (
            <FlexBox sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {corrNormalized.summary && (
                <>
                  <Chip size="small" label={`Total: ${corrNormalized.summary.total ?? corrNormalized.analyses.length}`} />
                  <Chip size="small" label={`Ran: ${corrNormalized.summary.ran ?? "—"}`} />
                </>
              )}
            </FlexBox>
          )}
        </FlexBox>

        <Divider sx={{ mb: 1.5 }} />

        {/* One accordion per analysis to support multiple matrices */}
        <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {corrNormalized.analyses.map((a) => {
            const r = a.result || null;

            // Some multi-run entries may be "Skipped: disabled"
            const isExplicitSkip = isPlainObject(a.raw) && a.raw.enabled === false;

            const err = r?.error ? String(r.error) : null;
            const message = r?.message ? String(r.message) : isExplicitSkip ? String(a.raw?.message || "Skipped.") : null;

            const cols = safeColumnsFromCorrelationResult(r);
            const matrix = safeCorrelationMatrix(r);
            const pairs = safePairsFromCorrelationResult(r);

            const isActive = a.id === activeCorrAnalysisId;

            return (
              <Accordion key={a.id} defaultExpanded={isActive} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <FlexBox sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {a.name}
                    </Typography>

                    {a.id === corrNormalized.primaryId && (
                      <Chip size="small" label="Primary" variant="outlined" />
                    )}

                    {err ? (
                      <Chip size="small" color="error" label="Error" />
                    ) : message ? (
                      <Chip size="small" label="Info" />
                    ) : (
                      <Chip size="small" color="success" label="OK" />
                    )}

                    <Chip size="small" label={`${cols.length} cols`} variant="outlined" />
                    <Chip size="small" label={`${pairs.length} pairs`} variant="outlined" />
                  </FlexBox>
                </AccordionSummary>

                <AccordionDetails>
                  {err ? (
                    <Typography variant="body2" color="error">
                      Correlation failed: {err}
                    </Typography>
                  ) : message && !matrix ? (
                    <Typography variant="body2" color="textSecondary">
                      {message}
                    </Typography>
                  ) : !matrix ? (
                    <Typography variant="body2" color="textSecondary">
                      Correlation matrix is not available.
                    </Typography>
                  ) : (
                    <CorrelationHeatmap columns={cols} matrix={matrix} />
                  )}

                  {/* Top pairs table for this analysis */}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>
                      Top correlation pairs
                    </Typography>

                    {!pairs.length ? (
                      <Typography variant="body2" color="textSecondary">
                        No correlation pairs available (not enough usable numeric columns or all constant).
                      </Typography>
                    ) : (
                      <TableContainer
                        sx={{
                          borderRadius: 1,
                          border: (theme) => `1px solid ${theme.palette.divider}`,
                          maxHeight: 240,
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
                            {pairs.slice(0, 10).map((p, idx) => (
                              <TableRow key={`${a.id}-${p.col1}-${p.col2}-${idx}`} hover>
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
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </FlexBox>
      </ChartCard>
    );
  }, [corrNormalized, activeCorrAnalysisId, showLoading, previewNote]);

  /* -------------------------
   * Layout
   * ------------------------- */

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
      {/* Customize visualizations */}
      <ChartCard
        title="Customize visualizations"
        subtitle="Choose which charts to display. Defaults are enabled for a quick overview."
        loading={showLoading}
        sx={{ gridColumn: { xs: "auto", md: "1 / span 2" } }}
      >
        <Box
          sx={{
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 2,
            p: 1.5,
            background: "rgba(0,0,0,0.02)",
          }}
        >
          <FormGroup row>
            <FormControlLabel
              control={<Switch checked={vizPrefs.showPreprocessingImpact} onChange={() => updatePref("showPreprocessingImpact")} />}
              label="Preprocessing impact"
            />
            <FormControlLabel
              control={<Switch checked={vizPrefs.showCorrelation} onChange={() => updatePref("showCorrelation")} />}
              label="Correlation matrices"
            />
            <FormControlLabel
              control={<Switch checked={vizPrefs.showCorrelationScatter} onChange={() => updatePref("showCorrelationScatter")} />}
              label="Scatter (from correlation)"
            />
            <FormControlLabel
              control={<Switch checked={vizPrefs.showDistributions} onChange={() => updatePref("showDistributions")} />}
              label="Numeric distributions"
            />
            <FormControlLabel
              control={<Switch checked={vizPrefs.showCategorical} onChange={() => updatePref("showCategorical")} />}
              label="Categorical distribution"
            />
            <FormControlLabel
              control={<Switch checked={vizPrefs.showScalingStats} onChange={() => updatePref("showScalingStats")} />}
              label="Scaling statistics"
            />
          </FormGroup>

          <Divider sx={{ my: 1.5 }} />

          {/* Dataset mode controls */}
          <FlexBox sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="dist-mode-label">Numeric charts dataset</InputLabel>
              <Select
                labelId="dist-mode-label"
                value={distDatasetMode}
                label="Numeric charts dataset"
                onChange={(e) => setDistDatasetMode(e.target.value)}
              >
                <MenuItem value="both">Both (original + processed)</MenuItem>
                <MenuItem value="original">Original only</MenuItem>
                <MenuItem value="processed">Processed only</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="cat-mode-label">Categorical chart dataset</InputLabel>
              <Select
                labelId="cat-mode-label"
                value={catDatasetMode}
                label="Categorical chart dataset"
                onChange={(e) => setCatDatasetMode(e.target.value)}
              >
                <MenuItem value="original">Original</MenuItem>
                <MenuItem value="processed">Processed</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography variant="caption" color="textSecondary">
                Correlation is computed by the backend on the processed dataset ({corrDatasetMode}).
              </Typography>
            </Box>
          </FlexBox>
        </Box>
      </ChartCard>

      {/* AI inference (only when enabled from page toggle) */}
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

      {/* Preprocessing impact */}
      {vizPrefs.showPreprocessingImpact && (
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
      )}

      {/* Multi correlation matrices */}
      {vizPrefs.showCorrelation && renderCorrelationCards()}

      {/* Scatter plot from correlation (active analysis) */}
      {vizPrefs.showCorrelationScatter && (
        <ChartCard
          title="Correlation scatter plot"
          subtitle="Scatter plot based on correlation output (active analysis)."
          loading={showLoading}
          footer={previewNote}
          sx={{ gridColumn: { xs: "auto", md: "1 / span 2" } }}
        >
          {!activeCorrAnalysis ? (
            <Typography variant="body2" color="textSecondary">
              Correlation was not requested or is not available.
            </Typography>
          ) : activeCorrResult?.error ? (
            <Typography variant="body2" color="error">
              Correlation failed: {String(activeCorrResult.error)}
            </Typography>
          ) : !scatterPair ? (
            <Typography variant="body2" color="textSecondary">
              Not enough numeric columns to plot.
            </Typography>
          ) : (
            <>
              <FlexBox sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mb: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Pair to plot
                </Typography>

                <FormControl size="small" sx={{ minWidth: 320 }}>
                  <InputLabel id="pair-select-label">Top pairs</InputLabel>
                  <Select
                    labelId="pair-select-label"
                    value={String(scatterPairIndex)}
                    label="Top pairs"
                    onChange={(e) => setScatterPairIndex(Number(e.target.value))}
                    disabled={!activeCorrPairs?.length}
                  >
                    {(activeCorrPairs?.length ? activeCorrPairs : [scatterPair]).slice(0, 10).map((p, idx) => (
                      <MenuItem key={`${p.col1}-${p.col2}-${idx}`} value={String(idx)}>
                        {p.col1} vs {p.col2}
                        {typeof p.r === "number" ? ` (r=${p.r.toFixed(3)})` : ""}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Chip
                  size="small"
                  label={`Analysis: ${activeCorrAnalysis.name}`}
                  variant="outlined"
                />
              </FlexBox>

              {scatterDataProcessed.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  Not enough numeric points in the preview to plot.
                </Typography>
              ) : (
                <ScatterPlot data={scatterDataProcessed} xLabel={scatterPair.col1} yLabel={scatterPair.col2} />
              )}
            </>
          )}
        </ChartCard>
      )}

      {/* Numeric distributions (user-selected columns + dataset mode) */}
      {vizPrefs.showDistributions && (
        <ChartCard
          title="Numeric distributions"
          subtitle="Choose numeric columns and compare distributions between original and processed data."
          loading={showLoading}
          footer={previewNote}
          sx={{ gridColumn: { xs: "auto", md: "1 / span 2" } }}
        >
          <FlexBox sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mb: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Columns
            </Typography>

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="hist-a-label">Histogram A</InputLabel>
              <Select
                labelId="hist-a-label"
                value={histColA || ""}
                label="Histogram A"
                onChange={(e) => setHistColA(e.target.value)}
              >
                {(numericColsProcessed.length ? numericColsProcessed : numericColsOriginal).map((c) => (
                  <MenuItem key={`a-${c}`} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="hist-b-label">Histogram B</InputLabel>
              <Select
                labelId="hist-b-label"
                value={histColB || ""}
                label="Histogram B"
                onChange={(e) => setHistColB(e.target.value)}
              >
                {(numericColsProcessed.length ? numericColsProcessed : numericColsOriginal).map((c) => (
                  <MenuItem key={`b-${c}`} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Chip size="small" label={`Mode: ${distDatasetMode}`} variant="outlined" />
          </FlexBox>

          <Divider sx={{ mb: 1.5 }} />

          {histTargets.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              No numeric columns found in the preview rows.
            </Typography>
          ) : (
            <FlexBox
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: distDatasetMode === "both" ? "1fr 1fr" : "1fr" },
                gap: 2,
              }}
            >
              {/* Original */}
              {(distDatasetMode === "both" || distDatasetMode === "original") && (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>
                    Original dataset
                  </Typography>

                  <FlexBox sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                    {histTargets.map((col) => (
                      <ChartCard
                        key={`orig-hist-${col}`}
                        title="Histogram"
                        subtitle={`"${col}"`}
                        loading={showLoading}
                        footer={null}
                      >
                        {histDataOriginal[col]?.length ? (
                          <HistogramChart data={histDataOriginal[col]} />
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            Not enough numeric values to build a histogram.
                          </Typography>
                        )}
                      </ChartCard>
                    ))}
                  </FlexBox>
                </Box>
              )}

              {/* Processed */}
              {(distDatasetMode === "both" || distDatasetMode === "processed") && (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>
                    Processed dataset
                  </Typography>

                  <FlexBox sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                    {histTargets.map((col) => (
                      <ChartCard
                        key={`proc-hist-${col}`}
                        title="Histogram"
                        subtitle={`"${col}"`}
                        loading={showLoading}
                        footer={null}
                      >
                        {histDataProcessed[col]?.length ? (
                          <HistogramChart data={histDataProcessed[col]} />
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            Not enough numeric values to build a histogram.
                          </Typography>
                        )}
                      </ChartCard>
                    ))}
                  </FlexBox>
                </Box>
              )}
            </FlexBox>
          )}
        </ChartCard>
      )}

      {/* Categorical distribution */}
      {vizPrefs.showCategorical && (
        <ChartCard
          title="Categorical distribution"
          subtitle="Pick a categorical column and view its frequency distribution."
          loading={showLoading}
          footer={previewNote}
        >
          <FlexBox sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mb: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Column
            </Typography>

            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel id="cat-col-label">Categorical column</InputLabel>
              <Select
                labelId="cat-col-label"
                value={catCol || ""}
                label="Categorical column"
                onChange={(e) => setCatCol(e.target.value)}
                disabled={
                  (catDatasetMode === "original" && !categoricalColsOriginal.length) ||
                  (catDatasetMode === "processed" && !categoricalColsProcessed.length)
                }
              >
                {(catDatasetMode === "processed" ? categoricalColsProcessed : categoricalColsOriginal).map((c) => (
                  <MenuItem key={`cat-${c}`} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Chip size="small" label={`Dataset: ${catDatasetMode}`} variant="outlined" />
          </FlexBox>

          {!catCol ? (
            <Typography variant="body2" color="textSecondary">
              No categorical column available in the selected dataset preview.
            </Typography>
          ) : (
            <CategoryBarChart data={catData} />
          )}
        </ChartCard>
      )}

      {/* Scaling stats */}
      {vizPrefs.showScalingStats && (
        <ChartCard
          title="Scaling statistics"
          subtitle="Statistics used for scaling (from backend metadata)."
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
                    <TableCell sx={{ fontWeight: 700, textAlign: "right" }}>Min</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: "right" }}>Max</TableCell>
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
                        {typeof r.min === "number" ? r.min.toFixed(4) : "—"}
                      </TableCell>
                      <TableCell sx={{ textAlign: "right" }}>
                        {typeof r.max === "number" ? r.max.toFixed(4) : "—"}
                      </TableCell>
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
      )}
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
