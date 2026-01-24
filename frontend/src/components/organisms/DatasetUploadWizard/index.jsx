// src/components/organisms/DatasetUploadWizard.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import Papa from "papaparse";

import AppModal from "../../atoms/AppModal";
import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";
import Button from "../../atoms/CustomButton";
import InputFieldWithLabel from "../../molecules/InputFieldWithLabel";

import { uploadDataset } from "../../../services/modules/dataset.api";
import { useToast } from "../../organisms/ToastProvider";
import { excelToCsv, jsonFileToCsv } from "../../../lib/fileConverters";
import { inferColumnTypes } from "../../../helpers/type_inference.helper";

import Step2PreprocessingOrchestrator from "../Step2PreprocessingOrchestrator";
import { buildPreprocessingConfig } from "../../../lib/buildPreprocessingConfig";

import WizardStepShell from "../../molecules/WizardStepShell";
import Step3CorrelationOrchestrator from "../Step3CorrelationOrchestrator";

// MUI Components
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Collapse from "@mui/material/Collapse";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CircularProgress from "@mui/material/CircularProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";

/* --------------------------- Helpers --------------------------- */

function uniq(arr) {
  return Array.from(new Set(arr));
}

function parseNumberRanges(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];

  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  const nums = [];
  
  for (const part of parts) {
    // Match "1-100" or "1 - 100"
    const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      const start = Math.min(a, b);
      const end = Math.max(a, b);
      for (let i = start; i <= end; i += 1) nums.push(i);
      continue;
    }
    // Match single number "5"
    const single = part.match(/^\d+$/);
    if (single) nums.push(Number(part));
  }
  return uniq(nums).filter((n) => Number.isFinite(n) && n > 0);
}

function validatePreprocessingConfig(cfg) {
  if (!cfg) return { ok: false, message: "preprocessingConfig is missing" };
  if (cfg.version !== "1.0") return { ok: false, message: 'preprocessingConfig.version must be "1.0"' };
  if (!Array.isArray(cfg.steps)) return { ok: false, message: "preprocessingConfig.steps must be an array" };

  for (let i = 0; i < cfg.steps.length; i += 1) {
    const s = cfg.steps[i];
    if (!s || typeof s !== "object") return { ok: false, message: `steps[${i}] must be an object` };
    if (!s.task || typeof s.task !== "string") return { ok: false, message: `steps[${i}].task is required` };
    if (!s.method || typeof s.method !== "string") return { ok: false, message: `steps[${i}].method is required` };
    if (!s.appliesTo || typeof s.appliesTo !== "object")
      return { ok: false, message: `steps[${i}].appliesTo is required` };
    const hasTypes = Array.isArray(s.appliesTo.types) && s.appliesTo.types.length > 0;
    const hasCols = Array.isArray(s.appliesTo.columns) && s.appliesTo.columns.length > 0;
    if (!hasTypes && !hasCols) return { ok: false, message: `steps[${i}].appliesTo must include types or columns` };
  }
  return { ok: true };
}

function ensureDefaults(defaults) {
  return {
    categoricalMissing: defaults?.categoricalMissing || "categorical_unknown",
    unknownLevel: defaults?.unknownLevel || "unknown",
    numericMissing: defaults?.numericMissing || "numeric_median",
    numericConstant: Number.isFinite(Number(defaults?.numericConstant)) ? Number(defaults.numericConstant) : 0,
    scaling: defaults?.scaling || "zscore",
    oneHotMaxLevels: Number.isFinite(Number(defaults?.oneHotMaxLevels)) ? Number(defaults.oneHotMaxLevels) : 10,
    rarePropThreshold: Number.isFinite(Number(defaults?.rarePropThreshold)) ? Number(defaults.rarePropThreshold) : 0.01,
    highCardinalityThreshold: Number.isFinite(Number(defaults?.highCardinalityThreshold))
      ? Number(defaults.highCardinalityThreshold)
      : 50,
  };
}

function isNumericType(t) {
  if (!t) return false;
  const s = String(t).toLowerCase();
  return s === "numeric" || s === "number";
}

function isCategoricalType(t) {
  if (!t) return false;
  const s = String(t).toLowerCase();
  return s === "categorical" || s === "factor" || s === "character" || s === "string";
}

function isPlainObject(x) {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function hasAnyValidEnabledCorrelation(correlationConfig) {
  if (!isPlainObject(correlationConfig)) return false;
  if (String(correlationConfig.version || "") !== "1.0") return false;
  if (!Array.isArray(correlationConfig.analyses)) return false;

  return correlationConfig.analyses.some((a) => {
    if (!a || a.enabled !== true) return false;
    const cols = Array.isArray(a.columns) ? a.columns.filter(Boolean) : [];
    return cols.length >= 2;
  });
}

function safeJson(obj) {
  try {
    return JSON.stringify(obj ?? null, null, 2);
  } catch {
    return "";
  }
}

function isRowEffectivelyEmpty(rowObj) {
  if (!rowObj || typeof rowObj !== "object") return true;
  const vals = Object.values(rowObj);
  if (!vals || vals.length === 0) return true;
  return vals.every((v) => {
    if (v === null || v === undefined) return true;
    const s = String(v);
    return s.trim() === "";
  });
}

/* --------------------------- Optimized Sub-Components --------------------------- */

// 1. Memoized Item for List Performance
const ColumnItem = React.memo(({ col, index, isSelected, onToggle }) => {
  return (
    <FormControlLabel
      sx={{ display: 'block', ml: 0, mr: 0, '& .MuiFormControlLabel-label': { fontSize: '0.85rem' } }}
      control={
        <Checkbox 
          size="small" 
          checked={isSelected} 
          onChange={() => onToggle(col)} 
        />
      }
      label={`${index + 1}. ${col}`}
    />
  );
});

ColumnItem.displayName = "ColumnItem";

// 2. Optimized List Container
// Using a simple list but strictly controlled to avoid overhead
const OptimizedColumnList = React.memo(({ columns, selectedSet, onToggle }) => {
  return (
    <Box>
      {columns.map((col, idx) => (
        <ColumnItem 
          key={col} 
          col={col} 
          index={idx} 
          isSelected={selectedSet.has(col)} 
          onToggle={onToggle} 
        />
      ))}
    </Box>
  );
});

OptimizedColumnList.displayName = "OptimizedColumnList";

/* --------------------------- Main Component --------------------------- */

export default function DatasetUploadWizard({ open, file, onClose, onUploaded }) {
  const { showToast } = useToast();

  // Loading States
  const [loadingFile, setLoadingFile] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Data States
  // OPTIMIZATION: Store full dataset in Ref to avoid React state lag on 10k rows
  const fullRowsRef = useRef([]); 
  const [previewRows, setPreviewRows] = useState([]); // Only store top 100 for UI
  const [columnTypes, setColumnTypes] = useState({});
  const [totalRows, setTotalRows] = useState(0);
  const [columns, setColumns] = useState([]);
  const [datasetName, setDatasetName] = useState("");
  
  // Selection States
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [colRange, setColRange] = useState("");
  const [colRangeHint, setColRangeHint] = useState("");

  // Logic States
  const [booleanConvertedColumns, setBooleanConvertedColumns] = useState(new Set());
  const [step, setStep] = useState(0); // 0=Columns, 1=Preprocessing, 2=Correlation

  // Config States
  const [defaults, setDefaults] = useState(() =>
    ensureDefaults({
      categoricalMissing: "categorical_unknown",
      unknownLevel: "unknown",
      numericMissing: "numeric_median",
      numericConstant: 0,
      scaling: "zscore",
      oneHotMaxLevels: 10,
      rarePropThreshold: 0.01,
      highCardinalityThreshold: 50,
    })
  );

  const [overrides, setOverrides] = useState({});
  const [preprocessingConfig, setPreprocessingConfig] = useState(null);

  // Custom Config States
  const [useCustomConfig, setUseCustomConfig] = useState(false);
  const [customConfigText, setCustomConfigText] = useState("");
  const [customConfigParsed, setCustomConfigParsed] = useState(null);
  const [customConfigError, setCustomConfigError] = useState(null);

  // Correlation State
  const [correlationForm, setCorrelationForm] = useState({
    version: "1.0",
    primaryId: "primary",
    analyses: [
      {
        id: "primary",
        name: "Correlation 1",
        enabled: false,
        columns: [],
        method: "pearson",
        topK: 10,
        minAbs: 0.0,
        includeMatrix: true,
      },
    ],
  });

  // UI Toggles
  const [showPayloadPreview, setShowPayloadPreview] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);

  // --------------------------- File Parsing Logic ---------------------------

  useEffect(() => {
    if (!file) return;

    setLoadingFile(true);

    const processFile = async () => {
      try {
        const rawName = file.name || "dataset";
        const lower = rawName.toLowerCase();
        const dotIndex = rawName.lastIndexOf(".");
        const baseName = dotIndex > 0 ? rawName.slice(0, dotIndex) : rawName;
        
        setDatasetName(baseName);
        setStep(0);
        fullRowsRef.current = []; // Clear ref
        setPreviewRows([]);
        setColumnTypes({});
        setBooleanConvertedColumns(new Set());
        setColumns([]);
        setSelectedColumns([]);
        setTotalRows(0);
        setShowSnapshot(false);
        setOverrides({});
        setPreprocessingConfig(null);
        setColRange("");
        setColRangeHint("");
        
        let csvString = "";

        if (lower.endsWith(".csv")) {
          csvString = await file.text();
        } else if (lower.endsWith(".json")) {
          csvString = await jsonFileToCsv(file);
        } else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
          csvString = await excelToCsv(file);
        } else {
          throw new Error("Unsupported file format.");
        }

        // OPTIMIZATION: Parse full file once, store in Ref, but only State the preview
        Papa.parse(csvString, {
          header: true,
          skipEmptyLines: true,
          complete: (parsedFull) => {
            const fields = parsedFull.meta?.fields || [];
            const allRows = (parsedFull.data || []).filter((r) => !isRowEffectivelyEmpty(r));
            
            // Store heavy data in Ref
            fullRowsRef.current = allRows;
            setTotalRows(allRows.length);
            
            // UI State updates (Lightweight)
            const PREVIEW_SIZE = 100;
            const rowsSlice = allRows.slice(0, PREVIEW_SIZE);
            
            // Infer types based on SAMPLE only (Performance Win)
            const types = inferColumnTypes(rowsSlice, fields);
            
            setColumns(fields);
            setSelectedColumns([]); // Default select all
            setPreviewRows(rowsSlice);
            setColumnTypes(types);
            setLoadingFile(false);
          },
          error: (err) => { 
            throw err; 
          }
        });

      } catch (error) {
        console.error("Column detection failed:", error);
        showToast(error.message || "Failed to parse file.", "error");
        setColumns([]);
        setLoadingFile(false);
      }
    };

    processFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // --------------------------- Computed Values ---------------------------

  const hasNumeric = useMemo(() => {
    return (selectedColumns || []).some((c) => isNumericType(columnTypes?.[c]));
  }, [selectedColumns, columnTypes]);

  const hasCategorical = useMemo(() => {
    return (selectedColumns || []).some((c) => isCategoricalType(columnTypes?.[c]));
  }, [selectedColumns, columnTypes]);

  // Map 1-based index to column name for Range logic
  const indexToCol = useMemo(() => {
    const map = {};
    columns.forEach((c, idx) => { map[idx + 1] = c; });
    return map;
  }, [columns]);

  // OPTIMIZATION: Create a Set for O(1) lookups in the list renderer
  const selectedColumnsSet = useMemo(() => new Set(selectedColumns), [selectedColumns]);

  // --------------------------- Handlers ---------------------------

  const handleRangeChange = (e) => setColRange(e.target.value);

  const applyRangeSelection = (mode) => {
    const indices = parseNumberRanges(colRange);
    
    // Only warn if empty AND user is trying to add/replace. Removing with empty implies clear? 
    // Usually standard to just return if empty.
    if (!indices.length) {
      setColRangeHint("Invalid range or empty. Use format '1-5, 8'");
      return;
    }

    const pickedCols = indices.map(i => indexToCol[i]).filter(Boolean);
    
    if (!pickedCols.length) {
      setColRangeHint("No columns match the provided indices.");
      return;
    }

    setColRangeHint("");
    
    // Logic fix: Ensure state updates cleanly
    setSelectedColumns(prev => {
      const prevSet = new Set(prev);
      const pickedSet = new Set(pickedCols);

      if (mode === "replace") {
        return uniq(pickedCols); // Correctly returns ONLY the new range
      }
      if (mode === "add") {
        return uniq([...prev, ...pickedCols]);
      }
      if (mode === "remove") {
        return prev.filter(c => !pickedSet.has(c));
      }
      return prev;
    });
  };

  const handleToggleColumn = useCallback((col) => {
    setSelectedColumns((prev) => {
      const s = new Set(prev);
      if (s.has(col)) s.delete(col);
      else s.add(col);
      return Array.from(s);
    });
  }, []);

  const handleSelectAll = () => setSelectedColumns(columns);
  const handleSelectNone = () => setSelectedColumns([]);

  const handleTypeChange = useCallback(
    (col) => {
      const currentType = columnTypes[col];
      const isCurrentNum = isNumericType(currentType);
      const targetType = isCurrentNum ? "Categorical" : "Numeric";

      // Use preview rows for validation to stay fast
      const values = previewRows
        .map((r) => r[col])
        .filter((v) => v !== null && v !== undefined && String(v).trim() !== "");

      if (targetType === "Numeric") {
        const allParsable = values.every((v) => !isNaN(Number(v)));
        if (!allParsable) {
          showToast(`Cannot convert '${col}' to Numeric. Contains non-numeric values (checked first 100 rows).`, "error");
          return;
        }
        
        // We do NOT update fullRowsRef here, we only handle conversion during Upload.
        // We only update the PreviewRows for visual feedback.
        const newRows = previewRows.map((r) => {
          const val = r[col];
          const isEmpty = val === null || val === undefined || String(val).trim() === "";
          return { ...r, [col]: isEmpty ? null : Number(val) };
        });
        
        setPreviewRows(newRows);
        setColumnTypes((prev) => ({ ...prev, [col]: "Numeric" }));
        setBooleanConvertedColumns((prev) => {
          const next = new Set(prev); next.delete(col); return next;
        });
        showToast(`Converted '${col}' to Numeric.`, "success");
      } else {
        // Converting to Categorical
        const uniqueValues = new Set(values.map((v) => Number(v)));
        const isZeroOneOnly = uniqueValues.size > 0 && uniqueValues.size <= 2 && [...uniqueValues].every((v) => v === 0 || v === 1);

        if (isZeroOneOnly) {
          const newRows = previewRows.map((r) => {
            const val = r[col];
            if (val === null || val === undefined || String(val).trim() === "") return { ...r, [col]: null };
            return { ...r, [col]: Number(val) === 1 ? "True" : "False" };
          });
          setPreviewRows(newRows);
          setBooleanConvertedColumns((prev) => new Set(prev).add(col));
          setColumnTypes((prev) => ({ ...prev, [col]: "Categorical" }));
          showToast(`Converted '${col}' to Categorical (Boolean mapped).`, "success");
        } else {
          const newRows = previewRows.map((r) => ({ ...r, [col]: r[col] === null ? null : String(r[col]) }));
          setPreviewRows(newRows);
          setColumnTypes((prev) => ({ ...prev, [col]: "Categorical" }));
          setBooleanConvertedColumns((prev) => {
            const next = new Set(prev); next.delete(col); return next;
          });
          showToast(`Converted '${col}' to Categorical.`, "success");
        }
      }
    },
    [columnTypes, previewRows, showToast]
  );

  useEffect(() => {
    if (useCustomConfig) return;
    const hasOverrides = overrides && Object.keys(overrides).length > 0;
    if (!hasOverrides) {
      setPreprocessingConfig(null);
      return;
    }
    const cfg = buildPreprocessingConfig({ columns: selectedColumns, columnTypes, overrides });
    setPreprocessingConfig(cfg?.steps?.length ? cfg : null);
  }, [selectedColumns, columnTypes, overrides, useCustomConfig]);

  const goToPreprocessing = () => {
    const trimmedName = datasetName.trim();
    if (!trimmedName) return showToast("Please provide a name for this dataset.", "warning");
    if (selectedColumns.length === 0) return showToast("Please keep at least one column.", "warning");
    setStep(1);
  };

  const goToCorrelation = () => {
    if (!useCustomConfig && (!overrides || Object.keys(overrides).length === 0)) {
      setStep(2);
      return;
    }
    const cfg = useCustomConfig ? customConfigParsed : preprocessingConfig;
    if (!cfg) return showToast("No valid preprocessing configuration to apply.", "warning");
    
    const v = validatePreprocessingConfig(cfg);
    if (!v.ok) return showToast(v.message || "Invalid preprocessingConfig.", "error");
    setStep(2);
  };

  const handleBack = () => {
    if (step === 1) setStep(0);
    else if (step === 2) setStep(1);
  };

  const copyToClipboard = async (txt) => {
    try {
      await navigator.clipboard.writeText(txt || "");
      showToast("Copied to clipboard.", "success");
    } catch {
      showToast("Copy failed.", "warning");
    }
  };

  const resolveCfgToSend = () => {
    let cfgToSend = null;
    if (useCustomConfig) {
      if (!customConfigParsed) return { ok: false, message: "Custom config is enabled but not valid." };
      const v = validatePreprocessingConfig(customConfigParsed);
      if (!v.ok) return { ok: false, message: v.message || "Invalid custom preprocessingConfig." };
      cfgToSend = customConfigParsed;
    } else {
      const hasOverridesLocal = overrides && Object.keys(overrides).length > 0;
      if (hasOverridesLocal && preprocessingConfig?.steps?.length) {
        const v = validatePreprocessingConfig(preprocessingConfig);
        if (!v.ok) return { ok: false, message: v.message || "Invalid preprocessingConfig." };
        cfgToSend = preprocessingConfig;
      }
    }
    const corrToSend = hasAnyValidEnabledCorrelation(correlationForm) ? correlationForm : null;
    return { ok: true, cfgToSend, corrToSend };
  };

  const handleUpload = async () => {
    if (!file) return;
    
    const resolved = resolveCfgToSend();
    if (!resolved.ok) {
      showToast(resolved.message || "Invalid configuration.", "error");
      return;
    }

    setUploading(true);

    // OPTIMIZATION: Use setTimeout to allow UI to render the "Uploading" state
    // before the heavy main thread work of mapping 10k+ rows begins.
    setTimeout(async () => {
      try {
        const finalName = (datasetName.trim() || "dataset") + ".csv";
        
        // Use the Ref (Full Data) instead of State
        const allRows = fullRowsRef.current || [];

        // Apply final type conversions & Filtering
        const filteredRows = allRows.map((row) => {
          const newRow = {};
          selectedColumns.forEach((col) => {
            let val = row[col];
            const targetType = columnTypes[col];
            const isTargetNum = isNumericType(targetType);
            
            if (val === null || val === undefined || String(val).trim() === "") {
               newRow[col] = null;
               return;
            }

            if (isTargetNum) {
              newRow[col] = Number(val);
            } else {
              if (booleanConvertedColumns.has(col)) {
                const n = Number(val);
                newRow[col] = n === 1 ? "True" : n === 0 ? "False" : String(val);
              } else {
                newRow[col] = String(val);
              }
            }
          });
          return newRow;
        });

        // Generate CSV from filtered data
        const finalCsvString = Papa.unparse({ fields: selectedColumns, data: filteredRows });
        const csvFile = new File([finalCsvString], finalName, { type: "text/csv" });

        const { cfgToSend, corrToSend } = resolved;
        if (correlationForm?.analyses?.some((a) => a?.enabled === true) && !corrToSend) {
          showToast("Correlation enabled but invalid. Skipping.", "warning");
        }

        const res = await uploadDataset({
          file: csvFile,
          name: finalName,
          preprocessingTasks: [],
          preprocessingConfig: cfgToSend,
          correlationConfig: corrToSend,
        });

        showToast("Dataset uploaded successfully!", "success");
        if (onUploaded) onUploaded(res);
        onClose();
      } catch (err) {
        console.error(err);
        showToast(err?.message || "Upload failed.", "error");
      } finally {
        setUploading(false);
      }
    }, 100);
  };

  // --------------------------- Render Helpers ---------------------------

  const modalTitle = step === 0 ? "Upload dataset" : step === 1 ? "Preprocessing" : "Correlation";
  const stepLabel = step === 0 ? "1 of 3 · Columns" : step === 1 ? "2 of 3 · Preprocessing" : "3 of 3 · Correlation";
  const stepShellTitle = step === 0 ? "Name & columns" : step === 1 ? "Tasks & configuration" : "Correlation analysis";

  const resolvedForPreview = useMemo(() => resolveCfgToSend(), [
    useCustomConfig,
    customConfigParsed,
    preprocessingConfig,
    overrides,
    correlationForm,
  ]);
  const preprocessingPreview = resolvedForPreview.ok ? resolvedForPreview.cfgToSend : null;
  const correlationPreview = resolvedForPreview.ok ? resolvedForPreview.corrToSend : null;

  // Snapshot only needs to slice the PREVIEW rows, which are already small.
  const snapshotRows = previewRows;
  const snapshotCols = useMemo(() => (selectedColumns || []).slice(0, selectedColumns.length), [selectedColumns]);

  return (
    <AppModal
      open={open}
      title={modalTitle}
      subtitle="Follow the steps to select columns, configure preprocessing, and optionally run correlation/association analysis."
      onClose={onClose}
      maxWidth="md"
      disableBackdropClose={uploading}
    >
      <WizardStepShell title={stepShellTitle} stepLabel={stepLabel} step={step}>
        
        {/* Loading Overlay for parsing */}
        {loadingFile && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
               Parsing large dataset...
            </Typography>
          </Box>
        )}

        {!loadingFile && (
          <>
            {/* Top Summary Header */}
            <Box sx={{ mb: 2, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 2, p: 1.5, background: "rgba(0,0,0,0.015)", display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 240 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  {datasetName?.trim() ? datasetName.trim() : "Untitled dataset"}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Selected: <b>{selectedColumns.length}</b> / {columns.length} columns | Rows: ~{totalRows}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ fontSize: 10 }}>
                   Types: {hasCategorical ? "Categorical " : ""}{hasNumeric ? "Numeric " : ""}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                <Chip size="small" label={useCustomConfig ? "Custom" : overrides && Object.keys(overrides).length ? "Live Config" : "No Config"} sx={{ fontWeight: 800 }} />
                <Button variant="outlined" color="inherit" size="small" onClick={() => setShowPayloadPreview((v) => !v)} endIcon={showPayloadPreview ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
                  Payload
                </Button>
              </Box>

              <Collapse in={showPayloadPreview} style={{ width: "100%" }}>
                <Divider sx={{ my: 1.25 }} />
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.5 }}>
                  <Box sx={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 2, p: 1 }}>
                     <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>preprocessingConfig</Typography>
                        <IconButton size="small" onClick={() => copyToClipboard(safeJson(preprocessingPreview))}><ContentCopyIcon fontSize="small" /></IconButton>
                     </Box>
                     <Box sx={{ mt: 1, maxHeight: 150, overflow: "auto", fontSize: 11, fontFamily: 'monospace' }}>{safeJson(preprocessingPreview)}</Box>
                  </Box>
                  <Box sx={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 2, p: 1 }}>
                     <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>correlationConfig</Typography>
                        <IconButton size="small" onClick={() => copyToClipboard(safeJson(correlationPreview))}><ContentCopyIcon fontSize="small" /></IconButton>
                     </Box>
                     <Box sx={{ mt: 1, maxHeight: 150, overflow: "auto", fontSize: 11, fontFamily: 'monospace' }}>{safeJson(correlationPreview)}</Box>
                  </Box>
                </Box>
              </Collapse>
            </Box>

            {/* Step 0: Column Selection */}
            {step === 0 && (
              <FlexBox sx={{ flexDirection: "column", gap: 2 }}>
                <FlexBox sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, alignItems: "start" }}>
                  
                  {/* Left Column: Name & Range Logic */}
                  <FlexBox sx={{ flexDirection: "column", gap: 1.5 }}>
                    <InputFieldWithLabel
                      label="Dataset name"
                      placeholder="Enter a dataset name"
                      value={datasetName}
                      onChange={(e) => setDatasetName(e.target.value)}
                    />

                    {/* Range Selection Box */}
                    <Box sx={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 2, p: 1.5, background: "rgba(0,0,0,0.02)" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Range Selection</Typography>
                      <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                        Select columns by index (e.g., "1-5, 8, 10").
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                           fullWidth
                           size="small"
                           placeholder="e.g. 1-100"
                           value={colRange}
                           onChange={handleRangeChange}
                           error={!!colRangeHint}
                        />
                      </Box>
                      {colRangeHint && <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>{colRangeHint}</Typography>}
                      
                      <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button size="small" variant="outlined" onClick={() => applyRangeSelection('remove')}>Remove</Button>
                        <Button size="small" variant="outlined" onClick={() => applyRangeSelection('replace')}>Replace</Button>
                        <Button size="small" variant="contained" onClick={() => applyRangeSelection('add')}>Add</Button>
                      </Box>
                    </Box>
                    
                    {/* Snapshot Toggle */}
                    <Button variant="outlined" color="inherit" size="small" onClick={() => setShowSnapshot((v) => !v)} endIcon={showSnapshot ? <ExpandLessIcon /> : <ExpandMoreIcon />} disabled={!previewRows.length}>
                      {showSnapshot ? "Hide Snapshot" : "Show Snapshot"}
                    </Button>
                  </FlexBox>

                  {/* Right Column: List */}
                  <FlexBox sx={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 2, padding: 1.5, maxHeight: 400, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                       <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Columns</Typography>
                       <Box>
                         <Button size="small" sx={{ minWidth: 0, p: 0.5, fontSize: 10 }} onClick={handleSelectAll}>All</Button>
                         <Button size="small" sx={{ minWidth: 0, p: 0.5, fontSize: 10 }} onClick={handleSelectNone}>None</Button>
                       </Box>
                    </Box>
                    
                    {/* OPTIMIZED LIST CONTAINER */}
                    <Box sx={{ overflowY: 'auto', flex: 1, border: '1px solid #eee', borderRadius: 1, px: 1 }}>
                       <OptimizedColumnList 
                          columns={columns} 
                          selectedSet={selectedColumnsSet} 
                          onToggle={handleToggleColumn} 
                       />
                    </Box>
                  </FlexBox>
                </FlexBox>

                {/* Snapshot Table */}
                <Collapse in={showSnapshot} style={{ width: "100%" }}>
                  <Box sx={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 2, p: 1.5, background: "rgba(0,0,0,0.02)" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Preview ({snapshotRows.length} rows)</Typography>
                    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 2, maxHeight: 320 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            {snapshotCols.map((c) => (
                              <TableCell key={c} sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{c}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {snapshotRows.map((row, idx) => (
                            <TableRow key={idx} hover>
                              {snapshotCols.map((c) => (
                                <TableCell key={c} sx={{ whiteSpace: 'nowrap', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  <Typography variant="caption" color="textSecondary">
                                    {row?.[c] ?? "—"}
                                  </Typography>
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Collapse>

                <FlexBox sx={{ display: "flex", justifyContent: "flex-end", gap: 1, width: "100%" }}>
                  <Button variant="contained" color="primary" onClick={goToPreprocessing} disabled={columns.length === 0}>Next: Preprocessing</Button>
                </FlexBox>
              </FlexBox>
            )}

            {/* Step 1: Preprocessing */}
            {step === 1 && (
              <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Step2PreprocessingOrchestrator
                  liveConfig={preprocessingConfig}
                  columns={selectedColumns}
                  columnTypes={columnTypes}
                  onTypeChange={handleTypeChange}
                  previewRows={previewRows}
                  filename={file?.name || "dataset.csv"}
                  defaults={defaults}
                  setDefaults={setDefaults}
                  overrides={overrides}
                  setOverrides={setOverrides}
                  validatePreprocessingConfig={validatePreprocessingConfig}
                  useCustomConfig={useCustomConfig}
                  setUseCustomConfig={setUseCustomConfig}
                  customConfigText={customConfigText}
                  setCustomConfigText={setCustomConfigText}
                  setCustomConfigParsed={setCustomConfigParsed}
                  customConfigError={customConfigError}
                  setCustomConfigError={setCustomConfigError}
                />
                <FlexBox sx={{ justifyContent: "space-between", gap: 1, width: "100%", mt: 2, display: "flex" }}>
                  <Button variant="outlined" color="inherit" onClick={handleBack} disabled={uploading}>Back</Button>
                  <Button variant="contained" color="primary" onClick={goToCorrelation} disabled={uploading}>Next: Correlation</Button>
                </FlexBox>
              </FlexBox>
            )}

            {/* Step 2: Correlation */}
            {step === 2 && (
              <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Step3CorrelationOrchestrator
                  columnTypes={columnTypes}
                  correlationValue={correlationForm}
                  onCorrelationChange={setCorrelationForm}
                  livePreprocessingConfig={preprocessingConfig}
                  preprocessingConfigEffective={preprocessingConfig}
                  setPreprocessingConfigEffective={setPreprocessingConfig}
                  validatePreprocessingConfig={validatePreprocessingConfig}
                  useCustomConfig={useCustomConfig}
                  setUseCustomConfig={setUseCustomConfig}
                  customConfigText={customConfigText}
                  setCustomConfigText={setCustomConfigText}
                  setCustomConfigParsed={setCustomConfigParsed}
                  customConfigError={customConfigError}
                  setCustomConfigError={setCustomConfigError}
                />
                <FlexBox sx={{ justifyContent: "space-between", gap: 1, width: "100%", mt: 2, display: "flex" }}>
                  <Button variant="outlined" color="inherit" onClick={handleBack} disabled={uploading}>Back</Button>
                  <Button variant="contained" color="primary" onClick={handleUpload} disabled={uploading}>
                    {uploading ? "Uploading..." : "Upload dataset"}
                  </Button>
                </FlexBox>
              </FlexBox>
            )}
          </>
        )}
      </WizardStepShell>
    </AppModal>
  );
}

DatasetUploadWizard.propTypes = {
  open: PropTypes.bool.isRequired,
  file: PropTypes.instanceOf(File),
  onClose: PropTypes.func.isRequired,
  onUploaded: PropTypes.func,
};

DatasetUploadWizard.defaultProps = {
  file: null,
  onUploaded: null,
};