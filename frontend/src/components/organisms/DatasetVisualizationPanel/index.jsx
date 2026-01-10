// src/components/organisms/DatasetVisualizationPanel/index.jsx
import React, { useMemo, useEffect, useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";

import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";
import ChartCard from "../../molecules/ChartCard";
import VizSection from "../../molecules/VizSection";

import {
  getNumericColumnsFromRows,
  getCategoricalColumnsFromRows,
  buildHistogram,
  buildCategoryCounts,
  buildScatter,
} from "../../../lib/chartData";

import { EHistogram, EBar, EScatter, EHeatmap, EWordCloud } from "../../molecules/Echarts";

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";

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

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableContainer from "@mui/material/TableContainer";

import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

import RefreshIcon from "@mui/icons-material/Refresh";
import TuneIcon from "@mui/icons-material/Tune";

import { generateDatasetInsights } from "../../../services/modules/insights.api";

// New modular viz organisms
import MissingnessSection from "../Viz/MissingnessSection";
import NumericSummarySection from "../Viz/NumericSummarySection";
import BoxplotSection from "../Viz/BoxplotSection";
import ECDFSection from "../Viz/ECDFSection";
import CategoryDriftSection from "../Viz/CategoryDriftSection";

/* ------------------------- helpers ------------------------- */

function isPlainObject(x) {
  return !!x && typeof x === "object" && !Array.isArray(x);
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
    // ignore
  }
}

function makeInsightsStorageKey({ datasetId, jobId }) {
  const d = datasetId || "na";
  const j = jobId || "na";
  return `ai_insights:v1:${d}:${j}`;
}

function makePrefsStorageKey({ datasetId, jobId }) {
  const d = datasetId || "na";
  const j = jobId || "na";
  return `viz_prefs:v4:${d}:${j}`;
}

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

function normalizeCorrelationMeta(corr) {
  if (!corr) return { mode: "none", analyses: [] };

  if (isPlainObject(corr) && corr.version === "1.0" && Array.isArray(corr.analyses)) {
    const analyses = corr.analyses
      .map((a, idx) => {
        const id = String(a?.id || `analysis_${idx + 1}`);
        const name = String(a?.name || `Correlation ${idx + 1}`);
        const result = a?.result || null;
        const effective = result || a;
        return { id, name, raw: a, result: effective && isPlainObject(effective) ? effective : null };
      })
      .filter(Boolean);

    return {
      mode: "multi",
      primaryId: corr.primaryId ? String(corr.primaryId) : analyses[0]?.id || null,
      summary: corr.summary || null,
      analyses,
    };
  }

  if (isPlainObject(corr)) {
    return {
      mode: "single",
      primaryId: "primary",
      analyses: [{ id: "primary", name: "Correlation", raw: corr, result: corr }],
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

/* ------------------------- word charts helpers ------------------------- */

const DEFAULT_STOPWORDS = new Set([
  "a","an","and","are","as","at","be","by","for","from","has","have","he","her","hers","him","his",
  "i","in","is","it","its","me","my","no","not","of","on","or","our","ours","she","that","the","their",
  "them","then","there","these","they","this","those","to","us","was","we","were","with","will","would",
  "you","your","yours"
]);

function isNumericString(s) {
  const str = String(s ?? "").trim();
  if (!str) return false;
  return /^-?\d+(\.\d+)?$/.test(str);
}

function tokenizeText(value) {
  if (value == null) return [];
  const s = String(value).toLowerCase();
  return s
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter(Boolean);
}

function buildWordCounts(rows, column, { maxWords = 80 } = {}) {
  const counts = new Map();

  const addToken = (tok) => {
    if (!tok) return;
    if (tok.length < 3) return;
    if (DEFAULT_STOPWORDS.has(tok)) return;
    counts.set(tok, (counts.get(tok) || 0) + 1);
  };

  (rows || []).forEach((r) => {
    if (!r || typeof r !== "object") return;

    if (column === "__ALL_TEXT__") {
      Object.values(r).forEach((v) => {
        const str = String(v ?? "").trim();
        if (!str) return;
        if (isNumericString(str)) return;
        tokenizeText(str).forEach(addToken);
      });
      return;
    }

    const str = String(r[column] ?? "").trim();
    if (!str) return;
    if (isNumericString(str)) return;
    tokenizeText(str).forEach(addToken);
  });

  return Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxWords);
}

function toBarSeriesFromWords(words, topN = 20) {
  return (words || []).slice(0, topN).map((w) => ({ label: w.word, value: w.count }));
}

/* ------------------------- compact styling tokens ------------------------- */

const leftTitleVariant = "subtitle2";
const leftBodyVariant = "caption";
const leftChipSize = "small";

const compactAccordionSx = {
  "&:before": { display: "none" },
  boxShadow: "none",
  borderRadius: 1.5,
  border: "1px solid rgba(0,0,0,0.08)",
};

const compactSummarySx = {
  minHeight: 40,
  "& .MuiAccordionSummary-content": { my: 0.5 },
};

const compactSwitchSx = {
  "& .MuiSwitch-switchBase": { p: 0.5 },
  "& .MuiSwitch-thumb": { width: 14, height: 14 },
  "& .MuiSwitch-track": { borderRadius: 999 },
};

/* ------------------------- section state ------------------------- */

function SectionState({ loading, error, empty, emptyText }) {
  if (loading) {
    return (
      <Box sx={{ width: "100%" }}>
        <Skeleton variant="rounded" height={22} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" height={240} />
      </Box>
    );
  }
  if (error) return <Alert severity="error">{error}</Alert>;
  if (empty) return <Alert severity="info">{emptyText || "No data available."}</Alert>;
  return null;
}

SectionState.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  empty: PropTypes.bool,
  emptyText: PropTypes.string,
};

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

  const numericColsOriginal = useMemo(() => getNumericColumnsFromRows(originalRows), [originalRows]);
  const numericColsProcessed = useMemo(() => getNumericColumnsFromRows(processedRows), [processedRows]);

  const categoricalColsOriginal = useMemo(() => getCategoricalColumnsFromRows(originalRows, 50), [originalRows]);
  const categoricalColsProcessed = useMemo(() => getCategoricalColumnsFromRows(processedRows, 50), [processedRows]);

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

  const corrNormalized = useMemo(() => normalizeCorrelationMeta(metadata?.correlation || null), [metadata?.correlation]);

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
    if ((numericColsProcessed || []).length >= 2) return { col1: numericColsProcessed[0], col2: numericColsProcessed[1], r: null };
    return null;
  }, [activeCorrPairs, numericColsProcessed]);

  const [scatterPairIndex, setScatterPairIndex] = useState(0);

  useEffect(() => {
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

  const prefsKey = useMemo(() => makePrefsStorageKey({ datasetId, jobId }), [datasetId, jobId]);

  const defaultPrefs = useMemo(
    () => ({
      showAiInference: aiInferenceEnabled === true,
      showCorrelation: true,
      showCorrelationScatter: true,

      showDistributions: true,
      showCategorical: true,
      showWordCharts: true,

      showMissingness: true,
      showNumericSummary: true,
      showBoxplots: true,
      showECDF: true,
      showCategoryDrift: true,

      showScalingStats: true,
      showPreprocessingImpact: true,

      expandCustomize: true,
      expandAi: true,
      expandCorrelation: true,
      expandScatter: true,
      expandDistributions: true,
      expandCategorical: true,
      expandWordCharts: true,

      expandMissingness: true,
      expandNumericSummary: true,
      expandBoxplots: true,
      expandECDF: true,
      expandCategoryDrift: true,

      expandScaling: true,
      expandPreprocess: true,
    }),
    [aiInferenceEnabled]
  );

  const [vizPrefs, setVizPrefs] = useState(() => {
    const cached = safeSessionGet(prefsKey);
    return { ...defaultPrefs, ...(cached || {}) };
  });

  useEffect(() => {
    setVizPrefs((p) => ({ ...p, showAiInference: aiInferenceEnabled === true }));
  }, [aiInferenceEnabled]);

  useEffect(() => {
    safeSessionSet(prefsKey, vizPrefs);
  }, [prefsKey, vizPrefs]);

  const updatePref = useCallback((key) => {
    setVizPrefs((p) => ({ ...p, [key]: !p[key] }));
  }, []);

  const resetPrefs = useCallback(() => {
    setVizPrefs(defaultPrefs);
    safeSessionSet(prefsKey, defaultPrefs);
  }, [defaultPrefs, prefsKey]);

  const [distDatasetMode, setDistDatasetMode] = useState("both"); // original | processed | both
  const [catDatasetMode, setCatDatasetMode] = useState("original"); // original | processed

  // Histogram columns
  const [histColA, setHistColA] = useState("");
  const [histColB, setHistColB] = useState("");

  useEffect(() => {
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
    histTargets.forEach((c) => { out[c] = buildHistogram(originalRows, c, 8); });
    return out;
  }, [originalRows, histTargets]);

  const histDataProcessed = useMemo(() => {
    const out = {};
    histTargets.forEach((c) => { out[c] = buildHistogram(processedRows, c, 8); });
    return out;
  }, [processedRows, histTargets]);

  // Categorical distribution
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

  // Word charts
  const [wordDatasetMode, setWordDatasetMode] = useState("processed"); // original | processed | both
  const [wordSource, setWordSource] = useState("__ALL_TEXT__");

  const wordSourceOptions = useMemo(() => {
    const cols = Array.from(new Set(["__ALL_TEXT__", ...(categoricalColsProcessed || []), ...(categoricalColsOriginal || [])]));
    return cols.map((c) => ({ value: c, label: c === "__ALL_TEXT__" ? "All text-like fields (combined)" : c }));
  }, [categoricalColsProcessed, categoricalColsOriginal]);

  useEffect(() => {
    const allowed = new Set(wordSourceOptions.map((o) => o.value));
    if (!allowed.has(wordSource)) setWordSource("__ALL_TEXT__");
  }, [wordSourceOptions, wordSource]);

  const wordRows = useMemo(() => {
    if (wordDatasetMode === "original") return originalRows;
    if (wordDatasetMode === "processed") return processedRows;
    return [...(originalRows || []), ...(processedRows || [])];
  }, [wordDatasetMode, originalRows, processedRows]);

  const wordCounts = useMemo(() => buildWordCounts(wordRows, wordSource, { maxWords: 80 }), [wordRows, wordSource]);
  const topTermsBar = useMemo(() => toBarSeriesFromWords(wordCounts, 20), [wordCounts]);

  // Numeric-summary driven selections (shared with boxplot/ECDF)
  const [summaryCols, setSummaryCols] = useState([]);
  useEffect(() => {
    const cols = (numericColsProcessed?.length ? numericColsProcessed : numericColsOriginal) || [];
    const defaults = cols.slice(0, 4);
    setSummaryCols((prev) => (prev?.length ? prev.filter((c) => cols.includes(c)).slice(0, 6) : defaults));
  }, [numericColsProcessed, numericColsOriginal]);

  const [boxDatasetMode, setBoxDatasetMode] = useState("processed"); // processed | original

  const [ecdfCol, setEcdfCol] = useState("");
  useEffect(() => {
    const cols = (numericColsProcessed?.length ? numericColsProcessed : numericColsOriginal) || [];
    if (!cols.length) return;
    setEcdfCol((prev) => (prev && cols.includes(prev) ? prev : cols[0]));
  }, [numericColsProcessed, numericColsOriginal]);

  // Category drift col
  const [driftCatCol, setDriftCatCol] = useState("");
  useEffect(() => {
    const cols = Array.from(new Set([...(categoricalColsOriginal || []), ...(categoricalColsProcessed || [])]));
    setDriftCatCol((prev) => (prev && cols.includes(prev) ? prev : (cols?.[0] || "")));
  }, [categoricalColsOriginal, categoricalColsProcessed]);

  // Insights
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(null);

  const insightsCacheRef = useRef(new Map());
  const insightsKey = useMemo(() => makeInsightsStorageKey({ datasetId, jobId }), [datasetId, jobId]);

  const fetchInsights = useCallback(
    async ({ bypassCache = false } = {}) => {
      if (!aiInferenceEnabled) return;
      if (loading || jobRunning) return;

      if (!bypassCache) {
        const memCached = insightsCacheRef.current.get(insightsKey);
        if (memCached) {
          setInsights(memCached);
          setInsightsError(null);
          return;
        }
        const sessionCached = safeSessionGet(insightsKey);
        if (sessionCached) {
          insightsCacheRef.current.set(insightsKey, sessionCached);
          setInsights(sessionCached);
          setInsightsError(null);
          return;
        }
      }

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

        insightsCacheRef.current.set(insightsKey, res);
        safeSessionSet(insightsKey, res);
        setInsights(res);
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message || "Failed to generate AI insights";
        setInsightsError(msg);
        setInsights(null);
      } finally {
        setInsightsLoading(false);
      }
    },
    [
      aiInferenceEnabled,
      loading,
      jobRunning,
      insightsKey,
      filename,
      rawData,
      processedData,
      processedRowsCount,
      processedColumnsCount,
      metadata,
    ]
  );

  useEffect(() => {
    fetchInsights({ bypassCache: false });
  }, [fetchInsights]);

  const datasetHeader = useMemo(() => {
    const previewOriginal = Array.isArray(originalRows) ? originalRows.length : 0;
    const previewProcessed = Array.isArray(processedRows) ? processedRows.length : 0;

    return {
      previewOriginal,
      previewProcessed,
      procRows: typeof processedRowsCount === "number" ? processedRowsCount : null,
      procCols: typeof processedColumnsCount === "number" ? processedColumnsCount : null,
      numOrig: numericColsOriginal.length,
      numProc: numericColsProcessed.length,
      catOrig: categoricalColsOriginal.length,
      catProc: categoricalColsProcessed.length,
    };
  }, [
    originalRows,
    processedRows,
    processedRowsCount,
    processedColumnsCount,
    numericColsOriginal.length,
    numericColsProcessed.length,
    categoricalColsOriginal.length,
    categoricalColsProcessed.length,
  ]);

  const numericOptions = useMemo(() => {
    const cols = numericColsProcessed.length ? numericColsProcessed : numericColsOriginal;
    return cols.map((c) => ({ label: c }));
  }, [numericColsProcessed, numericColsOriginal]);

  const topPairsForUi = useMemo(() => {
    const src = (activeCorrPairs?.length ? activeCorrPairs : [scatterPair]).slice(0, 10);
    return src
      .filter(Boolean)
      .map((p, idx) => ({
        idx,
        label: `${p.col1} vs ${p.col2}${typeof p.r === "number" ? ` (r=${p.r.toFixed(3)})` : ""}`,
      }));
  }, [activeCorrPairs, scatterPair]);

  const renderCorrelation = useCallback(() => {
    if (!corrNormalized || corrNormalized.mode === "none" || !corrNormalized.analyses.length) {
      return <Alert severity="info">Correlation was not requested for this job.</Alert>;
    }

    return (
      <Box sx={{ width: "100%" }}>
        <FlexBox sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", alignItems: "center", mb: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 900 }}>
            Active analysis
          </Typography>

          <FormControl size="small" sx={{ minWidth: 260 }}>
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

          {corrNormalized.mode === "multi" && corrNormalized.summary && (
            <FlexBox sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Chip size="small" label={`Total: ${corrNormalized.summary.total ?? corrNormalized.analyses.length}`} />
              <Chip size="small" label={`Ran: ${corrNormalized.summary.ran ?? "—"}`} />
            </FlexBox>
          )}
        </FlexBox>

        <Divider sx={{ mb: 1.5 }} />

        <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {corrNormalized.analyses.map((a) => {
            const r = a.result || null;
            const isExplicitSkip = isPlainObject(a.raw) && a.raw.enabled === false;
            const err = r?.error ? String(r.error) : null;
            const message = r?.message
              ? String(r.message)
              : isExplicitSkip
              ? String(a.raw?.message || "Skipped.")
              : null;

            const cols = safeColumnsFromCorrelationResult(r);
            const matrix = safeCorrelationMatrix(r);
            const pairs = safePairsFromCorrelationResult(r);

            const isActive = a.id === activeCorrAnalysisId;

            return (
              <Accordion key={a.id} defaultExpanded={isActive} disableGutters sx={compactAccordionSx}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={compactSummarySx}>
                  <FlexBox sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography variant="body2" sx={{ fontWeight: 900 }}>
                      {a.name}
                    </Typography>

                    {a.id === corrNormalized.primaryId && <Chip size="small" label="Primary" variant="outlined" />}

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
                    <Alert severity="error">Correlation failed: {err}</Alert>
                  ) : message && !matrix ? (
                    <Alert severity="info">{message}</Alert>
                  ) : !matrix ? (
                    <Alert severity="info">Correlation matrix is not available.</Alert>
                  ) : (
                    <EHeatmap
                      title="Correlation heatmap"
                      columns={cols}
                      matrix={matrix}
                      filename={`${filename || "dataset"}_${a.id}_correlation_heatmap`}
                      showDownload
                    />
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 900, mb: 1 }}>
                      Top correlation pairs
                    </Typography>

                    {!pairs.length ? (
                      <Alert severity="info">No correlation pairs available.</Alert>
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
                              <TableCell sx={{ fontWeight: 900 }}>#</TableCell>
                              <TableCell sx={{ fontWeight: 900 }}>Column 1</TableCell>
                              <TableCell sx={{ fontWeight: 900 }}>Column 2</TableCell>
                              <TableCell sx={{ fontWeight: 900, textAlign: "right" }}>r</TableCell>
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
      </Box>
    );
  }, [corrNormalized, activeCorrAnalysisId, filename]);

  /* ------------------------- visibility guards (do not show if data missing) ------------------------- */

  const canShowCorrelation = vizPrefs.showCorrelation && corrNormalized?.analyses?.length > 0;
  const canShowScatter =
    vizPrefs.showCorrelationScatter &&
    !!scatterPair?.col1 &&
    !!scatterPair?.col2 &&
    scatterDataProcessed.length > 0;

  const canShowNumericDistributions =
    vizPrefs.showDistributions && histTargets.length > 0 && (
      (distDatasetMode !== "original" && histTargets.some((c) => (histDataProcessed[c] || []).length > 0)) ||
      (distDatasetMode !== "processed" && histTargets.some((c) => (histDataOriginal[c] || []).length > 0))
    );

  const canShowCategorical =
    vizPrefs.showCategorical &&
    !!catCol &&
    (catDatasetMode === "processed" ? categoricalColsProcessed.length > 0 : categoricalColsOriginal.length > 0) &&
    (catData || []).length > 0;

  const canShowWordCharts =
    vizPrefs.showWordCharts && (wordCounts || []).length > 0;

  const canShowScalingStats = vizPrefs.showScalingStats && scalingRows.length > 0;
  const canShowPreprocessingImpact = vizPrefs.showPreprocessingImpact && actionCountSeries.length > 0;

  const canShowMissingness =
    vizPrefs.showMissingness &&
    ((originalRows?.length || 0) > 0 || (processedRows?.length || 0) > 0) &&
    ((originalRows?.[0] && Object.keys(originalRows[0]).length) || (processedRows?.[0] && Object.keys(processedRows[0]).length));

  const canShowNumericSummary =
    vizPrefs.showNumericSummary && (summaryCols || []).length > 0 && ((originalRows?.length || 0) > 0 || (processedRows?.length || 0) > 0);

  const canShowBoxplot =
    vizPrefs.showBoxplots && (summaryCols || []).length > 0 && ((boxDatasetMode === "original" ? originalRows : processedRows)?.length || 0) > 0;

  const canShowECDF =
    vizPrefs.showECDF && !!ecdfCol && ((originalRows?.length || 0) > 1 || (processedRows?.length || 0) > 1);

  const canShowCategoryDrift =
    vizPrefs.showCategoryDrift && !!driftCatCol && (categoricalColsOriginal.length + categoricalColsProcessed.length) > 0;

  return (
    <FlexBox
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          lg: "minmax(280px, 25%) minmax(0, 75%)",
        },
        gap: { xs: 2, sm: 2.5 },
        width: "100%",
        minWidth: 0,
        alignItems: "start",
      }}
    >
      {/* LEFT: compact settings */}
      <Box sx={{ position: { lg: "sticky" }, top: { lg: 12 }, zIndex: 1, minWidth: 0 }}>
        <ChartCard
          title="Visualization settings"
          subtitle="Display controls and inputs."
          loading={showLoading}
          sx={{ "& .MuiCardContent-root": { p: 1.5 } }}
        >
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1 }}>
            <Chip size={leftChipSize} label={`Preview (orig): ${datasetHeader.previewOriginal}`} />
            <Chip size={leftChipSize} label={`Preview (proc): ${datasetHeader.previewProcessed}`} />
            {datasetHeader.procRows != null && <Chip size={leftChipSize} label={`Rows: ${datasetHeader.procRows}`} />}
            {datasetHeader.procCols != null && <Chip size={leftChipSize} label={`Cols: ${datasetHeader.procCols}`} />}
            <Chip size={leftChipSize} label={`Num o/p: ${datasetHeader.numOrig}/${datasetHeader.numProc}`} variant="outlined" />
            <Chip size={leftChipSize} label={`Cat o/p: ${datasetHeader.catOrig}/${datasetHeader.catProc}`} variant="outlined" />
          </Box>

          <Alert severity="info" sx={{ mb: 1.25, py: 0.5, "& .MuiAlert-message": { fontSize: 12 } }}>
            {previewNote}
          </Alert>

          <Accordion expanded={vizPrefs.expandCustomize} onChange={() => updatePref("expandCustomize")} disableGutters sx={compactAccordionSx}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={compactSummarySx}>
              <FlexBox sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TuneIcon fontSize="small" />
                <Typography variant={leftTitleVariant} sx={{ fontWeight: 900 }}>
                  Customize
                </Typography>
              </FlexBox>
            </AccordionSummary>

            <AccordionDetails sx={{ pt: 0.5 }}>
              <FormGroup sx={{ gap: 0.25 }}>
                <FormControlLabel
                  sx={{ "& .MuiFormControlLabel-label": { fontSize: 12 } }}
                  control={<Switch sx={compactSwitchSx} size="small" checked={vizPrefs.showAiInference} onChange={() => updatePref("showAiInference")} />}
                  label="AI inference"
                />
                <FormControlLabel
                  sx={{ "& .MuiFormControlLabel-label": { fontSize: 12 } }}
                  control={<Switch sx={compactSwitchSx} size="small" checked={vizPrefs.showCorrelation} onChange={() => updatePref("showCorrelation")} />}
                  label="Correlation matrices"
                />
                <FormControlLabel
                  sx={{ "& .MuiFormControlLabel-label": { fontSize: 12 } }}
                  control={<Switch sx={compactSwitchSx} size="small" checked={vizPrefs.showCorrelationScatter} onChange={() => updatePref("showCorrelationScatter")} />}
                  label="Scatter"
                />

                <Divider sx={{ my: 1.25 }} />

                <FormControlLabel
                  sx={{ "& .MuiFormControlLabel-label": { fontSize: 12 } }}
                  control={<Switch sx={compactSwitchSx} size="small" checked={vizPrefs.showMissingness} onChange={() => updatePref("showMissingness")} />}
                  label="Missingness"
                />
                <FormControlLabel
                  sx={{ "& .MuiFormControlLabel-label": { fontSize: 12 } }}
                  control={<Switch sx={compactSwitchSx} size="small" checked={vizPrefs.showDistributions} onChange={() => updatePref("showDistributions")} />}
                  label="Numeric distributions"
                />
                <FormControlLabel
                  sx={{ "& .MuiFormControlLabel-label": { fontSize: 12 } }}
                  control={<Switch sx={compactSwitchSx} size="small" checked={vizPrefs.showNumericSummary} onChange={() => updatePref("showNumericSummary")} />}
                  label="Numeric summary"
                />
                <FormControlLabel
                  sx={{ "& .MuiFormControlLabel-label": { fontSize: 12 } }}
                  control={<Switch sx={compactSwitchSx} size="small" checked={vizPrefs.showBoxplots} onChange={() => updatePref("showBoxplots")} />}
                  label="Boxplots"
                />
                <FormControlLabel
                  sx={{ "& .MuiFormControlLabel-label": { fontSize: 12 } }}
                  control={<Switch sx={compactSwitchSx} size="small" checked={vizPrefs.showECDF} onChange={() => updatePref("showECDF")} />}
                  label="ECDF"
                />

                <Divider sx={{ my: 1.25 }} />

                <FormControlLabel
                  sx={{ "& .MuiFormControlLabel-label": { fontSize: 12 } }}
                  control={<Switch sx={compactSwitchSx} size="small" checked={vizPrefs.showCategorical} onChange={() => updatePref("showCategorical")} />}
                  label="Categorical distribution"
                />
                <FormControlLabel
                  sx={{ "& .MuiFormControlLabel-label": { fontSize: 12 } }}
                  control={<Switch sx={compactSwitchSx} size="small" checked={vizPrefs.showCategoryDrift} onChange={() => updatePref("showCategoryDrift")} />}
                  label="Category drift"
                />
                <FormControlLabel
                  sx={{ "& .MuiFormControlLabel-label": { fontSize: 12 } }}
                  control={<Switch sx={compactSwitchSx} size="small" checked={vizPrefs.showWordCharts} onChange={() => updatePref("showWordCharts")} />}
                  label="Word charts"
                />

                <Divider sx={{ my: 1.25 }} />

                <FormControlLabel
                  sx={{ "& .MuiFormControlLabel-label": { fontSize: 12 } }}
                  control={<Switch sx={compactSwitchSx} size="small" checked={vizPrefs.showScalingStats} onChange={() => updatePref("showScalingStats")} />}
                  label="Scaling statistics"
                />
                <FormControlLabel
                  sx={{ "& .MuiFormControlLabel-label": { fontSize: 12 } }}
                  control={<Switch sx={compactSwitchSx} size="small" checked={vizPrefs.showPreprocessingImpact} onChange={() => updatePref("showPreprocessingImpact")} />}
                  label="Preprocessing impact"
                />
              </FormGroup>

              <Divider sx={{ my: 1.25 }} />

              <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel id="dist-mode-label">Numeric dataset</InputLabel>
                  <Select labelId="dist-mode-label" value={distDatasetMode} label="Numeric dataset" onChange={(e) => setDistDatasetMode(e.target.value)}>
                    <MenuItem value="both">Both</MenuItem>
                    <MenuItem value="original">Original</MenuItem>
                    <MenuItem value="processed">Processed</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="cat-mode-label">Categorical dataset</InputLabel>
                  <Select labelId="cat-mode-label" value={catDatasetMode} label="Categorical dataset" onChange={(e) => setCatDatasetMode(e.target.value)}>
                    <MenuItem value="original">Original</MenuItem>
                    <MenuItem value="processed">Processed</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="word-mode-label">Word charts dataset</InputLabel>
                  <Select labelId="word-mode-label" value={wordDatasetMode} label="Word charts dataset" onChange={(e) => setWordDatasetMode(e.target.value)}>
                    <MenuItem value="processed">Processed</MenuItem>
                    <MenuItem value="original">Original</MenuItem>
                    <MenuItem value="both">Both</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="box-mode-label">Boxplot dataset</InputLabel>
                  <Select labelId="box-mode-label" value={boxDatasetMode} label="Boxplot dataset" onChange={(e) => setBoxDatasetMode(e.target.value)}>
                    <MenuItem value="processed">Processed</MenuItem>
                    <MenuItem value="original">Original</MenuItem>
                  </Select>
                </FormControl>
              </FlexBox>

              <Divider sx={{ my: 1.25 }} />

              <FlexBox sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Tooltip title="Reset toggles/expansion to defaults for this dataset/job">
                  <Button size="small" variant="outlined" onClick={resetPrefs} sx={{ fontSize: 12, py: 0.5 }}>
                    Reset
                  </Button>
                </Tooltip>

                {aiInferenceEnabled && (
                  <Tooltip title="Force re-generate AI insights (bypasses cache)">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<RefreshIcon fontSize="small" />}
                      onClick={() => fetchInsights({ bypassCache: true })}
                      disabled={showLoading || insightsLoading}
                      sx={{ fontSize: 12, py: 0.5 }}
                    >
                      Refresh AI
                    </Button>
                  </Tooltip>
                )}
              </FlexBox>

              <Typography variant={leftBodyVariant} color="textSecondary" sx={{ mt: 1 }}>
                Tip: Enable only sections you want to reduce noise.
              </Typography>
            </AccordionDetails>
          </Accordion>
        </ChartCard>
      </Box>

      {/* RIGHT: charts */}
      <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 2.5, minWidth: 0 }}>

        {/* AI */}
        <VizSection
          visible={aiInferenceEnabled && vizPrefs.showAiInference}
          title="AI inference"
          subtitle="Automated interpretation based on processed dataset + metadata."
          loading={showLoading}
          expanded={vizPrefs.expandAi}
          onToggleExpanded={() => updatePref("expandAi")}
          summaryLabel="Insights"
        >
          <SectionState
            loading={insightsLoading}
            error={insightsError}
            empty={!insights && !insightsLoading && !insightsError}
            emptyText="No insights available."
          />

          {!insightsLoading && !insightsError && insights && (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 900 }}>
                Executive summary
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 0.75, mb: 1.5 }}>
                {insights.executiveSummary || "—"}
              </Typography>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="body2" sx={{ fontWeight: 900 }}>
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

              <Typography variant="body2" sx={{ fontWeight: 900 }}>
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

              <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 1.5 }}>
                Confidence: {typeof insights.confidence === "number" ? `${Math.round(insights.confidence * 100)}%` : "—"}
              </Typography>
            </Box>
          )}
        </VizSection>

        {/* Correlation */}
        <VizSection
          visible={canShowCorrelation}
          title="Correlation"
          subtitle={corrNormalized.mode === "multi" ? "Multiple correlation analyses computed by the backend." : "Correlation analysis computed by the backend."}
          footer={previewNote}
          loading={showLoading}
          expanded={vizPrefs.expandCorrelation}
          onToggleExpanded={() => updatePref("expandCorrelation")}
          summaryLabel="Matrices and top pairs"
        >
          {renderCorrelation()}
        </VizSection>

        {/* Scatter */}
        <VizSection
          visible={canShowScatter}
          title="Correlation scatter plot"
          subtitle="Scatter plot based on active correlation analysis."
          footer={previewNote}
          loading={showLoading}
          expanded={vizPrefs.expandScatter}
          onToggleExpanded={() => updatePref("expandScatter")}
          summaryLabel="Scatter plot"
        >
          <FlexBox sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mb: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>
              Pair to plot
            </Typography>

            <Autocomplete
              size="small"
              options={topPairsForUi}
              value={topPairsForUi.find((x) => x.idx === scatterPairIndex) || null}
              onChange={(_, v) => setScatterPairIndex(v ? v.idx : 0)}
              renderInput={(params) => <TextField {...params} label="Top pairs" sx={{ minWidth: 360 }} />}
              disableClearable
              disabled={!topPairsForUi.length}
            />

            <Chip size="small" label={`Analysis: ${activeCorrAnalysis?.name || "—"}`} variant="outlined" />
          </FlexBox>

          <EScatter
            title="Scatter"
            data={scatterDataProcessed}
            xLabel={scatterPair.col1}
            yLabel={scatterPair.col2}
            filename={`${filename || "dataset"}_${activeCorrAnalysis?.id || "corr"}_scatter_${scatterPair.col1}_vs_${scatterPair.col2}`}
            showDownload
          />
        </VizSection>

        {/* Missingness */}
        <VizSection
          visible={canShowMissingness}
          title="Missingness"
          subtitle="Missing values per column (preview rows)."
          footer={previewNote}
          loading={showLoading}
          expanded={vizPrefs.expandMissingness}
          onToggleExpanded={() => updatePref("expandMissingness")}
          summaryLabel="Missing values"
        >
          <MissingnessSection originalRows={originalRows} processedRows={processedRows} filename={filename} />
        </VizSection>

        {/* Numeric distributions */}
        <VizSection
          visible={canShowNumericDistributions}
          title="Numeric distributions"
          subtitle="Compare distributions between original and processed data."
          footer={previewNote}
          loading={showLoading}
          expanded={vizPrefs.expandDistributions}
          onToggleExpanded={() => updatePref("expandDistributions")}
          summaryLabel="Histograms"
        >
          <FlexBox sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mb: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>
              Columns
            </Typography>

            <Autocomplete
              size="small"
              options={numericOptions}
              value={histColA ? { label: histColA } : null}
              onChange={(_, v) => setHistColA(v?.label || "")}
              renderInput={(params) => <TextField {...params} label="Histogram A" sx={{ minWidth: 240 }} />}
              disableClearable
              disabled={!numericOptions.length}
            />

            <Autocomplete
              size="small"
              options={numericOptions}
              value={histColB ? { label: histColB } : null}
              onChange={(_, v) => setHistColB(v?.label || "")}
              renderInput={(params) => <TextField {...params} label="Histogram B" sx={{ minWidth: 240 }} />}
              disableClearable
              disabled={!numericOptions.length}
            />

            <Chip size="small" label={`Mode: ${distDatasetMode}`} variant="outlined" />
          </FlexBox>

          <Divider sx={{ mb: 1.5 }} />

          <FlexBox
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: distDatasetMode === "both" ? "1fr 1fr" : "1fr" },
              gap: 2,
            }}
          >
            {(distDatasetMode === "both" || distDatasetMode === "original") && (
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 900, mb: 1 }}>
                  Original dataset
                </Typography>

                <FlexBox sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" }, gap: 2 }}>
                  {histTargets.map((col) =>
                    (histDataOriginal[col] || []).length ? (
                      <ChartCard key={`orig-hist-${col}`} title="Histogram" subtitle={`"${col}"`} loading={showLoading}>
                        <EHistogram
                          title="Histogram"
                          data={histDataOriginal[col]}
                          xLabel={col}
                          yLabel="Count"
                          filename={`${filename || "dataset"}_original_hist_${col}`}
                          showDownload
                        />
                      </ChartCard>
                    ) : null
                  )}
                </FlexBox>
              </Box>
            )}

            {(distDatasetMode === "both" || distDatasetMode === "processed") && (
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 900, mb: 1 }}>
                  Processed dataset
                </Typography>

                <FlexBox sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" }, gap: 2 }}>
                  {histTargets.map((col) =>
                    (histDataProcessed[col] || []).length ? (
                      <ChartCard key={`proc-hist-${col}`} title="Histogram" subtitle={`"${col}"`} loading={showLoading}>
                        <EHistogram
                          title="Histogram"
                          data={histDataProcessed[col]}
                          xLabel={col}
                          yLabel="Count"
                          filename={`${filename || "dataset"}_processed_hist_${col}`}
                          showDownload
                        />
                      </ChartCard>
                    ) : null
                  )}
                </FlexBox>
              </Box>
            )}
          </FlexBox>
        </VizSection>

        {/* Numeric summary */}
        <VizSection
          visible={canShowNumericSummary}
          title="Numeric summary"
          subtitle="Summary stats and drift between original and processed."
          footer={previewNote}
          loading={showLoading}
          expanded={vizPrefs.expandNumericSummary}
          onToggleExpanded={() => updatePref("expandNumericSummary")}
          summaryLabel="Stats and drift"
        >
          <FlexBox sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mb: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>
              Columns
            </Typography>

            <Autocomplete
              multiple
              size="small"
              options={numericOptions}
              value={(summaryCols || []).map((c) => ({ label: c }))}
              onChange={(_, vs) => setSummaryCols((vs || []).map((v) => v.label).slice(0, 6))}
              renderInput={(params) => <TextField {...params} label="Up to 6 columns" sx={{ minWidth: 420 }} />}
              disableCloseOnSelect
            />
          </FlexBox>

          <NumericSummarySection
            originalRows={originalRows}
            processedRows={processedRows}
            columns={summaryCols}
            filename={filename}
          />
        </VizSection>

        {/* Boxplots */}
        <VizSection
          visible={canShowBoxplot}
          title="Boxplots"
          subtitle="Five-number summary for selected numeric columns."
          footer={previewNote}
          loading={showLoading}
          expanded={vizPrefs.expandBoxplots}
          onToggleExpanded={() => updatePref("expandBoxplots")}
          summaryLabel="Boxplot"
        >
          <BoxplotSection
            rows={boxDatasetMode === "original" ? originalRows : processedRows}
            columns={summaryCols}
            filename={filename}
            label={`Boxplot (${boxDatasetMode})`}
          />
        </VizSection>

        {/* ECDF */}
        <VizSection
          visible={canShowECDF}
          title="ECDF"
          subtitle="Empirical CDF for shape comparison."
          footer={previewNote}
          loading={showLoading}
          expanded={vizPrefs.expandECDF}
          onToggleExpanded={() => updatePref("expandECDF")}
          summaryLabel="ECDF"
        >
          <FlexBox sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mb: 1.5 }}>
            <Autocomplete
              size="small"
              options={numericOptions}
              value={ecdfCol ? { label: ecdfCol } : null}
              onChange={(_, v) => setEcdfCol(v?.label || "")}
              renderInput={(params) => <TextField {...params} label="Column" sx={{ minWidth: 260 }} />}
              disableClearable
              disabled={!numericOptions.length}
            />
          </FlexBox>

          <ECDFSection
            originalRows={originalRows}
            processedRows={processedRows}
            column={ecdfCol}
            filename={filename}
          />
        </VizSection>

        {/* Categorical distribution */}
        <VizSection
          visible={canShowCategorical}
          title="Categorical distribution"
          subtitle="Pick a categorical column and view its frequency distribution."
          footer={previewNote}
          loading={showLoading}
          expanded={vizPrefs.expandCategorical}
          onToggleExpanded={() => updatePref("expandCategorical")}
          summaryLabel="Category counts"
        >
          <FlexBox sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mb: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>
              Column
            </Typography>

            <FormControl size="small" sx={{ minWidth: 280 }}>
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

          <EBar
            title="Category counts"
            data={catData}
            xLabel={catCol}
            yLabel="Count"
            horizontal
            filename={`${filename || "dataset"}_${catDatasetMode}_categorical_${catCol}`}
            showDownload
          />
        </VizSection>

        {/* Category drift */}
        <VizSection
          visible={canShowCategoryDrift}
          title="Category drift"
          subtitle="Compare category proportions (original vs processed)."
          footer={previewNote}
          loading={showLoading}
          expanded={vizPrefs.expandCategoryDrift}
          onToggleExpanded={() => updatePref("expandCategoryDrift")}
          summaryLabel="Proportion drift"
        >
          <FlexBox sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mb: 1.5 }}>
            <FormControl size="small" sx={{ minWidth: 320 }}>
              <InputLabel id="drift-cat-label">Categorical column</InputLabel>
              <Select
                labelId="drift-cat-label"
                value={driftCatCol || ""}
                label="Categorical column"
                onChange={(e) => setDriftCatCol(e.target.value)}
                disabled={!categoricalColsOriginal.length && !categoricalColsProcessed.length}
              >
                {Array.from(new Set([...(categoricalColsOriginal || []), ...(categoricalColsProcessed || [])])).map((c) => (
                  <MenuItem key={`drift-${c}`} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </FlexBox>

          <CategoryDriftSection
            originalRows={originalRows}
            processedRows={processedRows}
            column={driftCatCol}
            filename={filename}
          />
        </VizSection>

        {/* Word charts */}
        <VizSection
          visible={canShowWordCharts}
          title="Word charts"
          subtitle="Quick text signal from preview rows (word cloud + top terms)."
          footer={previewNote}
          loading={showLoading}
          expanded={vizPrefs.expandWordCharts}
          onToggleExpanded={() => updatePref("expandWordCharts")}
          summaryLabel="Word cloud and top terms"
        >
          <FlexBox sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mb: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>
              Text source
            </Typography>

            <Autocomplete
              size="small"
              options={wordSourceOptions}
              value={wordSourceOptions.find((o) => o.value === wordSource) || wordSourceOptions[0]}
              onChange={(_, v) => setWordSource(v?.value || "__ALL_TEXT__")}
              renderInput={(params) => <TextField {...params} label="Source" sx={{ minWidth: 320 }} />}
              disableClearable
            />

            <Chip size="small" label={`Dataset: ${wordDatasetMode}`} variant="outlined" />
            <Chip size="small" label={`Terms: ${wordCounts.length}`} variant="outlined" />
          </FlexBox>

          <FlexBox
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
              gap: 2,
              alignItems: "start",
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 900, mb: 1 }}>
                Word cloud
              </Typography>
              <EWordCloud
                title="Word cloud"
                words={wordCounts}
                filename={`${filename || "dataset"}_wordcloud_${wordDatasetMode}_${wordSource}`}
                showDownload
              />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 900, mb: 1 }}>
                Top terms
              </Typography>
              <EBar
                title="Top terms"
                data={topTermsBar}
                xLabel="Count"
                yLabel="Terms"
                horizontal
                filename={`${filename || "dataset"}_top_terms_${wordDatasetMode}_${wordSource}`}
                showDownload
              />
            </Box>
          </FlexBox>
        </VizSection>

        {/* Scaling stats */}
        <VizSection
          visible={canShowScalingStats}
          title="Scaling statistics"
          subtitle="Statistics used for scaling (from backend metadata)."
          footer="This uses backend scaling_stats (not recomputed client-side)."
          loading={showLoading}
          expanded={vizPrefs.expandScaling}
          onToggleExpanded={() => updatePref("expandScaling")}
          summaryLabel="Scaling table"
        >
          <TableContainer sx={{ borderRadius: 1, border: (theme) => `1px solid ${theme.palette.divider}`, maxHeight: 320 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900 }}>Column</TableCell>
                  <TableCell sx={{ fontWeight: 900, textAlign: "right" }}>Min</TableCell>
                  <TableCell sx={{ fontWeight: 900, textAlign: "right" }}>Max</TableCell>
                  <TableCell sx={{ fontWeight: 900, textAlign: "right" }}>Mean</TableCell>
                  <TableCell sx={{ fontWeight: 900, textAlign: "right" }}>SD</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Method</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scalingRows.map((r) => (
                  <TableRow key={r.col} hover>
                    <TableCell>{r.col}</TableCell>
                    <TableCell sx={{ textAlign: "right" }}>{typeof r.min === "number" ? r.min.toFixed(4) : "—"}</TableCell>
                    <TableCell sx={{ textAlign: "right" }}>{typeof r.max === "number" ? r.max.toFixed(4) : "—"}</TableCell>
                    <TableCell sx={{ textAlign: "right" }}>{typeof r.mean === "number" ? r.mean.toFixed(4) : "—"}</TableCell>
                    <TableCell sx={{ textAlign: "right" }}>{typeof r.sd === "number" ? r.sd.toFixed(4) : "—"}</TableCell>
                    <TableCell>{r.method}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </VizSection>

        {/* Preprocessing impact */}
        <VizSection
          visible={canShowPreprocessingImpact}
          title="Preprocessing impact"
          subtitle="How many transformations/actions were applied per column (from metadata)."
          footer={previewNote}
          loading={showLoading}
          expanded={vizPrefs.expandPreprocess}
          onToggleExpanded={() => updatePref("expandPreprocess")}
          summaryLabel="Actions per column"
        >
          <EBar
            title="Actions per column"
            data={actionCountSeries}
            xLabel="Actions"
            yLabel="Columns"
            horizontal
            filename={`${filename || "dataset"}_preprocessing_actions`}
            showDownload
          />
        </VizSection>

        {/* Empty state: when everything is hidden */}
        {!showLoading &&
          !(
            (aiInferenceEnabled && vizPrefs.showAiInference) ||
            canShowCorrelation ||
            canShowScatter ||
            canShowMissingness ||
            canShowNumericDistributions ||
            canShowNumericSummary ||
            canShowBoxplot ||
            canShowECDF ||
            canShowCategorical ||
            canShowCategoryDrift ||
            canShowWordCharts ||
            canShowScalingStats ||
            canShowPreprocessingImpact
          ) && (
            <Alert severity="info">
              No visualizations available for the current preview rows (or all sections are disabled in settings).
            </Alert>
          )}
      </FlexBox>
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

