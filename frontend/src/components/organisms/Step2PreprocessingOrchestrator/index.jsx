// components/organisms/Step2PreprocessingOrchestrator.jsx
import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";

import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";
import ModeTabs from "../../atoms/ModeTabs";
import SectionCard from "../../atoms/SectionCard";
import Button from "../../atoms/CustomButton";
import InputFieldWithLabel from "../../molecules/InputFieldWithLabel";

import PreprocessingConfigEditorPanel from "../PreprocessingConfigEditorPanel";
import AISuggestionConsoleModal from "../AISuggestionConsoleModal";
import { suggestPreprocessing } from "../../../services/modules/preprocessingSuggest.api";

/* ---------------------------- type helpers ---------------------------- */

function isNumericType(t) {
  const s = String(t || "").toLowerCase();
  return s === "numeric" || s === "number" || s === "integer" || s === "float" || s === "decimal";
}

function isCategoricalType(t) {
  const s = String(t || "").toLowerCase();
  return s === "categorical" || s === "factor" || s === "character" || s === "string" || s === "object" || s === "boolean" || s === "bool";
}

function prettyType(t) {
  if (isNumericType(t)) return "Numeric";
  if (isCategoricalType(t)) return "Categorical";
  return "Unknown";
}

function kindFromType(t) {
  if (isCategoricalType(t)) return "cat";
  if (isNumericType(t)) return "num";
  return "unk";
}

/* --------------------------- Data Analysis Helpers --------------------------- */

/**
 * Analyzes column data to determine if type conversion is valid.
 * This makes the tool "smart" — allowing Cat->Num only if data is actually numeric.
 */
function analyzeTypeConvertibility(col, currentType, rows) {
  if (!rows || rows.length === 0) return { canSwitch: true, targetType: isNumericType(currentType) ? "categorical" : "numeric" }; // Fallback

  const isCurrentNum = isNumericType(currentType);
  
  // Check a sample of non-null values
  const sample = rows
    .map(r => r[col])
    .filter(v => v !== null && v !== undefined && String(v).trim() !== "")
    .slice(0, 50);

  if (sample.length === 0) return { canSwitch: true, targetType: isCurrentNum ? "categorical" : "numeric" }; // Empty column, allow anything

  // Check if data looks numeric (parseable numbers)
  const numericCount = sample.filter(v => !isNaN(Number(v))).length;
  const isLikeNumeric = (numericCount / sample.length) > 0.8; // 80% threshold

  if (isCurrentNum) {
    // Can always switch Numeric -> Categorical
    return { canSwitch: true, targetType: "categorical" };
  } else {
    // Categorical -> Numeric? Only if it looks like a number
    return { canSwitch: isLikeNumeric, targetType: "numeric" };
  }
}

function getSampleValue(col, rows) {
  if (!rows || !rows.length) return "";
  const val = rows.find(r => r[col] !== null && r[col] !== undefined)?.[col];
  return val !== undefined ? String(val) : "";
}

/* --------------------------- small helpers --------------------------- */

function uniq(arr) {
  return Array.from(new Set(arr));
}

function isPlainObject(x) {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

/**
 * Parse ranges like: "1-5, 8, 10-12"
 */
function parseNumberRanges(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];

  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const nums = [];
  for (const part of parts) {
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

    const single = part.match(/^\d+$/);
    if (single) nums.push(Number(part));
  }

  return uniq(nums).filter((n) => Number.isFinite(n) && n > 0);
}

/* --------------------------- UI subcomponents -------------------------- */

function PillToggle({ label, active, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: "1px solid rgba(0,0,0,0.10)",
        background: disabled ? "rgba(0,0,0,0.04)" : active ? "rgba(25,118,210,0.10)" : "white",
        color: disabled ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.85)",
        padding: "8px 12px",
        borderRadius: 999,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 12,
        fontWeight: 600,
        userSelect: "none",
        transition: "all 0.2s ease",
      }}
    >
      {label}
    </button>
  );
}

function SegmentedViewToggle({ value, onChange }) {
  return (
    <div
      style={{
        display: "inline-flex",
        border: "1px solid rgba(0,0,0,0.10)",
        borderRadius: 8,
        overflow: "hidden",
        background: "white",
      }}
    >
      <button
        type="button"
        onClick={() => onChange("grouped")}
        style={{
          border: "none",
          padding: "8px 12px",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          background: value === "grouped" ? "rgba(25,118,210,0.10)" : "transparent",
          color: value === "grouped" ? "rgba(25,118,210,1)" : "rgba(0,0,0,0.7)",
          transition: "background 0.2s",
        }}
      >
        Grouped by Type
      </button>
      <div style={{ width: 1, background: "rgba(0,0,0,0.1)" }} />
      <button
        type="button"
        onClick={() => onChange("ordered")}
        style={{
          border: "none",
          padding: "8px 12px",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          background: value === "ordered" ? "rgba(25,118,210,0.10)" : "transparent",
          color: value === "ordered" ? "rgba(25,118,210,1)" : "rgba(0,0,0,0.7)",
          transition: "background 0.2s",
        }}
      >
        Dataset Order
      </button>
    </div>
  );
}

// Badge: Smart toggle with analysis
function Badge({ text, kind, onClick, disabled }) {
  const isCat = kind === "cat";
  const isNum = kind === "num";
  
  const bg = isCat
      ? "rgba(46,125,50,0.10)"
      : isNum
      ? "rgba(156,39,176,0.10)"
      : "rgba(0,0,0,0.06)";
  
  const fg = isCat
      ? "rgba(46,125,50,0.90)"
      : isNum
      ? "rgba(156,39,176,0.90)"
      : "rgba(0,0,0,0.65)";
  
  const canClick = onClick && !disabled;

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        if(canClick) onClick();
      }}
      title={disabled ? "Conversion not compatible with data" : "Click to toggle type"}
      style={{
        padding: "4px 10px",
        borderRadius: 6,
        background: bg,
        color: fg,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        cursor: canClick ? "pointer" : "default",
        border: `1px solid ${fg.replace('0.90', '0.20')}`,
        display: "flex",
        alignItems: "center",
        gap: 6,
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.2s"
      }}
      onMouseOver={(e) => {
        if(canClick) e.currentTarget.style.filter = "brightness(0.95)";
      }}
      onMouseOut={(e) => {
        if(canClick) e.currentTarget.style.filter = "none";
      }}
    >
      {text}
      {canClick && <span style={{ fontSize: 10, opacity: 0.6 }}>⇄</span>}
    </span>
  );
}

function Chip({ text }) {
  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: 4,
        background: "rgba(0,0,0,0.04)",
        color: "rgba(0,0,0,0.75)",
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
        border: "1px solid rgba(0,0,0,0.05)"
      }}
    >
      {text}
    </span>
  );
}

// New Component: Tabular snapshot of selected columns
function SelectedColumnsTable({ selectedIndices, indexToCol, allTypes, rows }) {
  if (!selectedIndices || selectedIndices.length === 0) {
    return (
      <div style={{ marginTop: 12, padding: 12, background: "rgba(0,0,0,0.02)", borderRadius: 6, textAlign: "center" }}>
        <Typography variant="caption" color="textSecondary">No columns selected in this range.</Typography>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 6, background: "white", overflow: "hidden" }}>
      <div style={{ padding: "8px 12px", background: "rgba(0,0,0,0.03)", borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", gap: 8 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, flex: "0 0 40px" }}>Idx</Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, flex: 1 }}>Column Name</Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, flex: "0 0 80px" }}>Type</Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, flex: 1, textAlign: "right" }}>Sample</Typography>
      </div>
      <div style={{ maxHeight: 180, overflowY: "auto" }}>
        {selectedIndices.map(idx => {
          const colName = indexToCol[idx];
          if(!colName) return null;
          const type = allTypes[colName];
          const pretty = prettyType(type);
          const sample = getSampleValue(colName, rows);

          return (
            <div key={idx} style={{ display: "flex", gap: 8, padding: "6px 12px", borderBottom: "1px solid rgba(0,0,0,0.04)", alignItems: "center" }}>
              <Typography variant="caption" color="textSecondary" sx={{ flex: "0 0 40px", fontFamily: "monospace" }}>{idx}</Typography>
              <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, fontSize: 12 }}>{colName}</Typography>
              <div style={{ flex: "0 0 80px" }}>
                 <Badge text={pretty} kind={kindFromType(type)} />
              </div>
              <Typography variant="caption" color="textSecondary" sx={{ flex: 1, textAlign: "right", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {sample || <span style={{opacity: 0.5}}>(empty)</span>}
              </Typography>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------ mapping overrides -> labels ------------------------ */

const LABELS = {
  label_cleaning: "Clean Labels",
  missing_cat: "Impute (Cat)",
  missing_num: "Impute (Num)",
  reduce_cardinality: "Reduce Card.",
  encoding: "Encoding",
  scaling: "Scaling",
};

function summarizeOverridesForColumn(colOverride) {
  const out = [];
  if (!colOverride || typeof colOverride !== "object") return out;

  if (colOverride.label_cleaning?.method === "standard") out.push(LABELS.label_cleaning);
  if (colOverride.missing_values?.categorical?.method) out.push(LABELS.missing_cat);
  if (colOverride.missing_values?.numeric?.method) out.push(LABELS.missing_num);
  if (colOverride.reduce_cardinality?.method) out.push(LABELS.reduce_cardinality);
  if (colOverride.encoding?.method) out.push(LABELS.encoding);
  if (colOverride.scaling?.method) out.push(LABELS.scaling);

  return out;
}

/* ------------------------ NEW: Config -> Bulk sync helpers ------------------------ */

function expandAppliesTo({ appliesTo, allColumns, effectiveColumnTypes }) {
  const ap = isPlainObject(appliesTo) ? appliesTo : {};

  const cols = Array.isArray(ap.columns) ? ap.columns.filter(Boolean) : [];
  if (cols.length) {
    const allowed = new Set(allColumns || []);
    return cols.filter((c) => allowed.has(c));
  }

  const types = Array.isArray(ap.types) ? ap.types.map((t) => String(t || "").toLowerCase()) : [];
  if (!types.length) return [];

  const wantCat = types.some((t) => t === "categorical" || t === "cat" || t === "factor" || t === "character" || t === "string");
  const wantNum = types.some((t) => t === "numeric" || t === "num" || t === "number");

  return (allColumns || []).filter((c) => {
    const t = effectiveColumnTypes?.[c];
    if (wantCat && isCategoricalType(t)) return true;
    if (wantNum && isNumericType(t)) return true;
    return false;
  });
}

function configToBulkState({ config, allColumns, effectiveColumnTypes }) {
  const cfg = isPlainObject(config) ? config : null;
  const steps = Array.isArray(cfg?.steps) ? cfg.steps : [];

  const nextOverrides = {};
  const nextDefaults = {};

  const setDefaultOnce = (k, v) => {
    if (nextDefaults[k] === undefined) nextDefaults[k] = v;
  };

  const ensureCol = (col) => {
    if (!nextOverrides[col]) nextOverrides[col] = {};
    return nextOverrides[col];
  };

  for (const step of steps) {
    if (!isPlainObject(step)) continue;

    const task = String(step.task || step.type || step.action || "").trim().toLowerCase();
    const method = String(step.method || step.strategy || "").trim();

    const targetCols = expandAppliesTo({
      appliesTo: step.appliesTo,
      allColumns,
      effectiveColumnTypes,
    });

    if (!targetCols.length) continue;

    // 1) Label cleaning
    if (task === "label_cleaning") {
      const m = method || "standard";
      if (String(m).toLowerCase() !== "standard") continue;

      targetCols.forEach((col) => {
        const t = effectiveColumnTypes?.[col];
        if (!isCategoricalType(t)) return;
        const cur = ensureCol(col);
        cur.label_cleaning = { method: "standard" };
      });
      continue;
    }

    // 2) Missing values
    if (task === "missing_values") {
      const m = String(method || "").toLowerCase();

      targetCols.forEach((col) => {
        const t = effectiveColumnTypes?.[col];
        const cur = ensureCol(col);

        if (isCategoricalType(t)) {
          const catMethod =
            m === "categorical_mode" || m === "mode"
              ? "categorical_mode"
              : "categorical_unknown";

          cur.missing_values = { ...(cur.missing_values || {}) };
          cur.missing_values.categorical = {
            method: catMethod,
            ...(catMethod === "categorical_unknown"
              ? { unknownLevel: step?.params?.unknownLevel || step?.unknownLevel || "unknown" }
              : {}),
          };

          setDefaultOnce("categoricalMissing", catMethod);
          if (catMethod === "categorical_unknown") {
            setDefaultOnce("unknownLevel", cur.missing_values.categorical.unknownLevel || "unknown");
          }
          return;
        }

        if (isNumericType(t)) {
          const numMethod =
            m === "numeric_mean" || m === "mean"
              ? "numeric_mean"
              : m === "numeric_constant" || m === "constant"
              ? "numeric_constant"
              : "numeric_median";

          cur.missing_values = { ...(cur.missing_values || {}) };
          cur.missing_values.numeric = {
            method: numMethod,
            ...(numMethod === "numeric_constant"
              ? { value: Number.isFinite(Number(step?.params?.value ?? step?.value)) ? Number(step?.params?.value ?? step?.value) : 0 }
              : {}),
          };

          setDefaultOnce("numericMissing", numMethod);
          if (numMethod === "numeric_constant") {
            setDefaultOnce("numericConstant", cur.missing_values.numeric.value ?? 0);
          }
        }
      });

      continue;
    }

    // 3) Reduce cardinality
    if (task === "reduce_cardinality") {
      const m = String(method || "rare_to_other").toLowerCase();
      if (m !== "rare_to_other") continue;

      const rareProp =
        Number.isFinite(Number(step?.params?.rare_prop_threshold))
          ? Number(step.params.rare_prop_threshold)
          : Number.isFinite(Number(step?.rare_prop_threshold))
          ? Number(step.rare_prop_threshold)
          : 0.01;

      const highCard =
        Number.isFinite(Number(step?.params?.high_cardinality_threshold))
          ? Number(step.params.high_cardinality_threshold)
          : Number.isFinite(Number(step?.high_cardinality_threshold))
          ? Number(step.high_cardinality_threshold)
          : 50;

      targetCols.forEach((col) => {
        const t = effectiveColumnTypes?.[col];
        if (!isCategoricalType(t)) return;

        const cur = ensureCol(col);
        cur.reduce_cardinality = {
          method: "rare_to_other",
          rare_prop_threshold: rareProp,
          high_cardinality_threshold: highCard,
        };
      });

      setDefaultOnce("rarePropThreshold", rareProp);
      setDefaultOnce("highCardinalityThreshold", highCard);
      continue;
    }

    // 4) Encoding
    if (task === "encoding") {
      const m = String(method || "auto").toLowerCase();
      if (m !== "auto") continue;

      const oneHotMax =
        Number.isFinite(Number(step?.params?.one_hot_max_levels))
          ? Number(step.params.one_hot_max_levels)
          : Number.isFinite(Number(step?.one_hot_max_levels))
          ? Number(step.one_hot_max_levels)
          : 10;

      targetCols.forEach((col) => {
        const t = effectiveColumnTypes?.[col];
        if (!isCategoricalType(t)) return;

        const cur = ensureCol(col);
        cur.encoding = { method: "auto", one_hot_max_levels: oneHotMax };
      });

      setDefaultOnce("oneHotMaxLevels", oneHotMax);
      continue;
    }

    // 5) Scaling
    if (task === "scaling") {
      const m = String(method || "zscore").toLowerCase();
      const scalingMethod = m === "minmax" ? "minmax" : m === "none" ? "none" : "zscore";

      targetCols.forEach((col) => {
        const t = effectiveColumnTypes?.[col];
        if (!isNumericType(t)) return;

        const cur = ensureCol(col);
        cur.scaling = { method: scalingMethod };
      });

      setDefaultOnce("scaling", scalingMethod);
      continue;
    }
  }

  // cleanup
  Object.keys(nextOverrides).forEach((col) => {
    const cur = nextOverrides[col];
    const empty =
      !cur ||
      (!cur.missing_values &&
        !cur.label_cleaning &&
        !cur.reduce_cardinality &&
        !cur.encoding &&
        !cur.scaling);
    if (empty) delete nextOverrides[col];
  });

  return { overrides: nextOverrides, defaults: nextDefaults };
}

/* ------------------------------ main component ------------------------------ */

export default function Step2PreprocessingOrchestrator({
  columns,
  columnTypes, // raw types from backend
  onTypeChange,
  previewRows,
  filename,

  defaults,
  setDefaults,
  overrides,
  setOverrides,

  validatePreprocessingConfig,

  liveConfig,
  useCustomConfig,
  setUseCustomConfig,
  customConfigText,
  setCustomConfigText,
  setCustomConfigParsed,
  customConfigError,
  setCustomConfigError,
}) {
  const [mode, setMode] = useState("bulk");

  // Source of truth for types
  const effectiveColumnTypes = columnTypes;

  const handleModeChange = useCallback((arg1, arg2) => {
    const next =
      typeof arg2 === "string"
        ? arg2
        : typeof arg1 === "string"
        ? arg1
        : arg1?.target?.value;

    setMode(next === "config" || next === "bulk" ? next : "bulk");
  }, []);

  const tabs = useMemo(
    () => [
      { key: "bulk", label: "Bulk Selection" },
      { key: "config", label: "Config Editor" },
    ],
    []
  );

  const [listView, setListView] = useState("grouped"); // "grouped" | "ordered"

  // selection
  const [selectedCols, setSelectedCols] = useState([]);
  const [colSearch, setColSearch] = useState("");

  const handleSearchChange = useCallback((e) => setColSearch(e.target.value), []);

  const filteredColumns = useMemo(() => {
    const q = String(colSearch || "").trim().toLowerCase();
    if (!q) return columns || [];
    return (columns || []).filter((c) => String(c).toLowerCase().includes(q));
  }, [columns, colSearch]);

  // Derived lists based on EFFECTIVE types
  const { categoricalColumns, numericColumns, unknownColumns } = useMemo(() => {
    const cats = [];
    const nums = [];
    const unk = [];

    for (const col of filteredColumns || []) {
      const t = effectiveColumnTypes?.[col];
      if (isCategoricalType(t)) cats.push(col);
      else if (isNumericType(t)) nums.push(col);
      else unk.push(col);
    }

    cats.sort((a, b) => String(a).localeCompare(String(b)));
    nums.sort((a, b) => String(a).localeCompare(String(b)));
    unk.sort((a, b) => String(a).localeCompare(String(b)));

    return { categoricalColumns: cats, numericColumns: nums, unknownColumns: unk };
  }, [filteredColumns, effectiveColumnTypes]);

  const orderedColumns = useMemo(() => filteredColumns || [], [filteredColumns]);

  // Index maps (1-based for UX)
  const catIndexToCol = useMemo(() => {
    const map = {};
    (categoricalColumns || []).forEach((c, idx) => { map[idx + 1] = c; });
    return map;
  }, [categoricalColumns]);

  const numIndexToCol = useMemo(() => {
    const map = {};
    (numericColumns || []).forEach((c, idx) => { map[idx + 1] = c; });
    return map;
  }, [numericColumns]);

  const unkIndexToCol = useMemo(() => {
    const map = {};
    (unknownColumns || []).forEach((c, idx) => { map[idx + 1] = c; });
    return map;
  }, [unknownColumns]);

  const ordIndexToCol = useMemo(() => {
    const map = {};
    (orderedColumns || []).forEach((c, idx) => { map[idx + 1] = c; });
    return map;
  }, [orderedColumns]);

  const selectedSummary = useMemo(() => {
    const selected = selectedCols || [];
    const types = selected.map((c) => effectiveColumnTypes?.[c]);
    const hasCat = types.some((t) => isCategoricalType(t));
    const hasNum = types.some((t) => isNumericType(t));
    return { hasCat, hasNum, count: selected.length };
  }, [selectedCols, effectiveColumnTypes]);

  const configuredColumns = useMemo(() => Object.keys(overrides || {}), [overrides]);
  const configuredCount = configuredColumns.length;

  const toggleSelected = useCallback((col) => {
    setSelectedCols((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]));
  }, []);

  const clearOverridesForColumn = useCallback(
    (col) => {
      setOverrides((prev) => {
        const next = { ...(prev || {}) };
        delete next[col];
        return next;
      });
    },
    [setOverrides]
  );

  // NEW: Robust Type Toggling Logic
  const handleToggleColumnType = useCallback((col) => {
    const currentType = effectiveColumnTypes[col];
    const { canSwitch, targetType } = analyzeTypeConvertibility(col, currentType, previewRows);

    if (!canSwitch) {
      console.warn(`Cannot convert column ${col} to ${targetType} based on data analysis.`);
      return; 
    }

    if (onTypeChange) {
      // Pass the explicit target type to ensure correctness
      onTypeChange(col, targetType); 
    }
    
    // Clear incompatible configurations
    clearOverridesForColumn(col);
  }, [onTypeChange, clearOverridesForColumn, effectiveColumnTypes, previewRows]);

  /* --------------------- NEW: Sync Custom Config -> Bulk Selection --------------------- */

  const lastAppliedCustomSigRef = useRef(null);

  const customSig = useMemo(() => {
    if (!useCustomConfig) return null;
    try {
      void liveConfig; 
      return String(customConfigText || "").trim();
    } catch {
      return String(customConfigText || "").trim();
    }
  }, [useCustomConfig, customConfigText, liveConfig]);

  useEffect(() => {
    if (!useCustomConfig) {
      lastAppliedCustomSigRef.current = null;
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(String(customConfigText || ""));
    } catch {
      return;
    }

    const v = validatePreprocessingConfig(parsed);
    if (!v?.ok) return;

    const sig = customSig;
    if (!sig) return;

    if (lastAppliedCustomSigRef.current === sig) return;

    const { overrides: nextOv, defaults: nextDef } = configToBulkState({
      config: parsed,
      allColumns: columns || [],
      effectiveColumnTypes: effectiveColumnTypes || {},
    });

    setOverrides(nextOv);
    setDefaults((prev) => ({ ...(prev || {}), ...(nextDef || {}) }));
    setSelectedCols([]);

    lastAppliedCustomSigRef.current = sig;
  }, [
    useCustomConfig,
    customSig,
    customConfigText,
    validatePreprocessingConfig,
    columns,
    effectiveColumnTypes,
    setOverrides,
    setDefaults,
  ]);

  /* --------------------- Range-based selection --------------------- */

  const [catRange, setCatRange] = useState("");
  const [numRange, setNumRange] = useState("");
  const [unkRange, setUnkRange] = useState("");
  const [ordRange, setOrdRange] = useState("");

  const handleCatRangeChange = useCallback((e) => setCatRange(e.target.value), []);
  const handleNumRangeChange = useCallback((e) => setNumRange(e.target.value), []);
  const handleUnkRangeChange = useCallback((e) => setUnkRange(e.target.value), []);
  const handleOrdRangeChange = useCallback((e) => setOrdRange(e.target.value), []);

  const [catRangeHint, setCatRangeHint] = useState(null);
  const [numRangeHint, setNumRangeHint] = useState(null);
  const [unkRangeHint, setUnkRangeHint] = useState(null);
  const [ordRangeHint, setOrdRangeHint] = useState(null);

  // Parse input ranges to actual indices
  const catSelectedIndices = useMemo(() => parseNumberRanges(catRange), [catRange]);
  const numSelectedIndices = useMemo(() => parseNumberRanges(numRange), [numRange]);
  const unkSelectedIndices = useMemo(() => parseNumberRanges(unkRange), [unkRange]);
  const ordSelectedIndices = useMemo(() => parseNumberRanges(ordRange), [ordRange]);

  const validateRange = useCallback(({ rangeText, indexToCol }) => {
    const nums = parseNumberRanges(rangeText);
    if (!nums.length) {
      return { ok: false, message: "Enter a range like “1-5” or “1-3, 7, 10-12”." };
    }
    const validCols = nums.map((n) => indexToCol[n]).filter(Boolean);
    if (!validCols.length) {
      return { ok: false, message: "No valid indices matched in this list." };
    }
    const unknown = nums.filter((n) => !indexToCol[n]);
    if (unknown.length) {
      return {
        ok: true,
        message: `Some indices ignored: ${unknown.slice(0, 8).join(", ")}${unknown.length > 8 ? "…" : ""}`,
      };
    }
    return { ok: true, message: null };
  }, []);

  const applyRangeToSelection = useCallback(({ rangeText, indexToCol, allowedCols, mode: mergeMode }) => {
    const allowedSet = new Set(allowedCols || []);
    const nums = parseNumberRanges(rangeText);

    const pickedCols = nums
      .map((n) => indexToCol[n])
      .filter(Boolean)
      .filter((col) => allowedSet.has(col));

    setSelectedCols((prev) => {
      const prevArr = Array.isArray(prev) ? prev : [];
      if (mergeMode === "replace") {
        const keep = prevArr.filter((c) => !allowedSet.has(c));
        return uniq([...keep, ...pickedCols]);
      }
      if (mergeMode === "remove") {
        const toRemove = new Set(pickedCols);
        return prevArr.filter((c) => !toRemove.has(c));
      }
      return uniq([...prevArr, ...pickedCols]);
    });
  }, []);

  /* ------------------------- Right panel (group apply) ------------------------- */

  const [catMissingEnabled, setCatMissingEnabled] = useState(false);
  const [catMissingMethod, setCatMissingMethod] = useState(defaults?.categoricalMissing || "categorical_unknown");
  const [unknownLevel, setUnknownLevel] = useState(defaults?.unknownLevel || "unknown");

  const [labelCleanEnabled, setLabelCleanEnabled] = useState(false);

  // RESTORED: Parameter inputs
  const [reduceEnabled, setReduceEnabled] = useState(false);
  const [rarePropThreshold, setRarePropThreshold] = useState(String(defaults?.rarePropThreshold ?? 0.01));
  const [highCardThreshold, setHighCardThreshold] = useState(String(defaults?.highCardinalityThreshold ?? 50));

  const [encodingEnabled, setEncodingEnabled] = useState(false);
  const [oneHotMaxLevels, setOneHotMaxLevels] = useState(String(defaults?.oneHotMaxLevels ?? 10));

  const [numMissingEnabled, setNumMissingEnabled] = useState(false);
  const [numMissingMethod, setNumMissingMethod] = useState(defaults?.numericMissing || "numeric_median");
  const [numConstant, setNumConstant] = useState(String(defaults?.numericConstant ?? 0));

  const [scalingEnabled, setScalingEnabled] = useState(false);
  const [scalingMethod, setScalingMethod] = useState(defaults?.scaling || "zscore");

  const handleUnknownLevelChange = useCallback((e) => setUnknownLevel(e.target.value), []);
  const handleRarePropThresholdChange = useCallback((e) => setRarePropThreshold(e.target.value), []);
  const handleHighCardThresholdChange = useCallback((e) => setHighCardThreshold(e.target.value), []);
  const handleOneHotMaxLevelsChange = useCallback((e) => setOneHotMaxLevels(e.target.value), []);
  const handleNumConstantChange = useCallback((e) => setNumConstant(e.target.value), []);

  const applyToSelected = useCallback(() => {
    const colsSnapshot = Array.isArray(selectedCols) ? [...selectedCols] : [];
    if (!colsSnapshot.length) return;

    setOverrides((prev) => {
      const next = { ...(prev || {}) };

      colsSnapshot.forEach((col) => {
        const t = effectiveColumnTypes?.[col];
        const isCat = isCategoricalType(t);
        const isNum = isNumericType(t);

        const cur = { ...(next[col] || {}) };

        // ---- categorical block ----
        if (isCat) {
          if (labelCleanEnabled) cur.label_cleaning = { method: "standard" };
          else if (cur.label_cleaning) delete cur.label_cleaning;

          if (catMissingEnabled) {
            cur.missing_values = {
              ...(cur.missing_values || {}),
              categorical: {
                method: catMissingMethod,
                ...(catMissingMethod === "categorical_unknown"
                  ? { unknownLevel: unknownLevel || "unknown" }
                  : {}),
              },
            };
          } else if (cur?.missing_values?.categorical) {
            const mv = { ...(cur.missing_values || {}) };
            delete mv.categorical;
            cur.missing_values = mv;
          }

          if (reduceEnabled) {
            cur.reduce_cardinality = {
              method: "rare_to_other",
              rare_prop_threshold: Number.isFinite(Number(rarePropThreshold)) ? Number(rarePropThreshold) : 0.01,
              high_cardinality_threshold: Number.isFinite(Number(highCardThreshold)) ? Number(highCardThreshold) : 50,
            };
          } else if (cur.reduce_cardinality) {
            delete cur.reduce_cardinality;
          }

          if (encodingEnabled) {
            cur.encoding = {
              method: "auto",
              one_hot_max_levels: Number.isFinite(Number(oneHotMaxLevels)) ? Number(oneHotMaxLevels) : 10,
            };
          } else if (cur.encoding) {
            delete cur.encoding;
          }
        }

        // ---- numeric block ----
        if (isNum) {
          if (numMissingEnabled) {
            cur.missing_values = {
              ...(cur.missing_values || {}),
              numeric: {
                method: numMissingMethod,
                ...(numMissingMethod === "numeric_constant"
                  ? { value: Number.isFinite(Number(numConstant)) ? Number(numConstant) : 0 }
                  : {}),
              },
            };
          } else if (cur?.missing_values?.numeric) {
            const mv = { ...(cur.missing_values || {}) };
            delete mv.numeric;
            cur.missing_values = mv;
          }

          if (scalingEnabled) cur.scaling = { method: scalingMethod };
          else if (cur.scaling) delete cur.scaling;
        }

        // cleanup
        if (cur.missing_values && !cur.missing_values.categorical && !cur.missing_values.numeric) {
          delete cur.missing_values;
        }
        const isEmpty =
          !cur.missing_values && !cur.label_cleaning && !cur.reduce_cardinality && !cur.encoding && !cur.scaling;
        if (isEmpty) delete next[col];
        else next[col] = cur;
      });

      return next;
    });

    // sync defaults
    setDefaults((prev) => ({
      ...(prev || {}),
      categoricalMissing: catMissingMethod,
      unknownLevel,
      numericMissing: numMissingMethod,
      numericConstant: Number.isFinite(Number(numConstant)) ? Number(numConstant) : 0,
      scaling: scalingMethod,
      oneHotMaxLevels: Number.isFinite(Number(oneHotMaxLevelsSafe(oneHotMaxLevels))) ? Number(oneHotMaxLevels) : 10,
      rarePropThreshold: Number.isFinite(Number(rarePropThreshold)) ? Number(rarePropThreshold) : 0.01,
      highCardinalityThreshold: Number.isFinite(Number(highCardThreshold)) ? Number(highCardThreshold) : 50,
    }));

    setSelectedCols([]);
    setCatRange(""); setNumRange(""); setUnkRange(""); setOrdRange("");
    setCatRangeHint(null); setNumRangeHint(null); setUnkRangeHint(null); setOrdRangeHint(null);
  }, [
    selectedCols,
    setOverrides,
    setDefaults,
    effectiveColumnTypes, // Changed to effective
    labelCleanEnabled,
    catMissingEnabled,
    catMissingMethod,
    unknownLevel,
    reduceEnabled,
    rarePropThreshold,
    highCardThreshold,
    encodingEnabled,
    oneHotMaxLevels,
    numMissingEnabled,
    numMissingMethod,
    numConstant,
    scalingEnabled,
    scalingMethod,
  ]);

  /* ------------------------------- AI Suggest ------------------------------- */

  const [aiConsoleOpen, setAiConsoleOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  const pickRandomSample = useCallback((rows, n) => {
    const arr = Array.isArray(rows) ? rows.slice() : [];
    if (arr.length <= n) return arr;
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr.slice(0, n);
  }, []);

  const isMissing = useCallback((v) => {
    if (v === null || v === undefined) return true;
    if (typeof v === "string" && v.trim() === "") return true;
    return false;
  }, []);

  const buildColumnProfiles = useCallback(
    ({ cols, types, sampleRows }) => {
      const profiles = [];
      for (const col of cols) {
        const inferredType = types?.[col] || "unknown";
        let missingCount = 0;
        const uniques = new Set();
        const sampleValues = [];

        for (const row of sampleRows) {
          const v = row?.[col];
          if (isMissing(v)) {
            missingCount += 1;
            continue;
          }
          const s = String(v);
          uniques.add(s);
          if (sampleValues.length < 8) sampleValues.push(s);
        }

        profiles.push({
          name: col,
          inferredType,
          missingCount,
          uniqueCount: uniques.size,
          sampleValues,
        });
      }
      return profiles;
    },
    [isMissing]
  );

  const handleAiSuggest = useCallback(async () => {
    setAiConsoleOpen(true);
    setAiLoading(true);
    setAiError(null);
    setAiSuggestion(null);

    try {
      const rows = Array.isArray(previewRows) ? previewRows : [];
      if (rows.length === 0) throw new Error("No sample rows available for suggestion.");

      const sampleRows = pickRandomSample(rows, Math.min(100, rows.length));
      const columnProfiles = buildColumnProfiles({
        cols: columns,
        types: effectiveColumnTypes,
        sampleRows,
      });

      const resp = await suggestPreprocessing({
        filename: filename || "dataset.csv",
        columns: columnProfiles,
        sampleRows,
        sampleRowCount: sampleRows.length,
      });

      setAiSuggestion(resp);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      setAiError(e?.message || "Unknown error");
    } finally {
      setAiLoading(false);
    }
  }, [previewRows, pickRandomSample, buildColumnProfiles, columns, effectiveColumnTypes, filename]);

  const handleAiAccept = useCallback(() => {
    if (!aiSuggestion?.preprocessingConfig) return;
    setCustomConfigText(JSON.stringify(aiSuggestion.preprocessingConfig, null, 2));
    setCustomConfigParsed(aiSuggestion.preprocessingConfig);
    setCustomConfigError(null);
    setUseCustomConfig(true);
    setAiConsoleOpen(false);
  }, [aiSuggestion, setCustomConfigText, setCustomConfigParsed, setCustomConfigError, setUseCustomConfig]);

  const handleAiReject = useCallback(() => setAiConsoleOpen(false), []);

  /* ------------------------------ Applied summary ------------------------------ */

  const appliedList = useMemo(() => {
    const out = [];
    const ov = overrides || {};
    for (const col of Object.keys(ov)) {
      const labels = summarizeOverridesForColumn(ov[col]);
      out.push({
        col,
        type: prettyType(effectiveColumnTypes?.[col]),
        labels,
      });
    }
    out.sort((a, b) => String(a.col).localeCompare(String(b.col)));
    return out;
  }, [overrides, effectiveColumnTypes]);

  /* ------------------------------ Column row renderer ------------------------------ */

  const renderColumnRow = useCallback(
    ({ col, index, listKind }) => {
      const t = effectiveColumnTypes?.[col];
      const selected = selectedCols.includes(col);
      const configured = !!overrides?.[col];

      const kind = listKind || kindFromType(t);

      // Check convertibility for tooltips/disabled state
      const { canSwitch } = analyzeTypeConvertibility(col, t, previewRows);

      return (
        <div
          key={col}
          role="button"
          tabIndex={0}
          onClick={() => toggleSelected(col)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") toggleSelected(col);
          }}
          style={{
            border: "1px solid rgba(0,0,0,0.10)",
            borderRadius: 8,
            padding: "10px 14px",
            cursor: "pointer",
            outline: "none",
            background: selected ? "rgba(25,118,210,0.08)" : "white",
            boxShadow: selected ? "0 0 0 2px rgba(25,118,210,0.2) inset" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            transition: "all 0.15s ease-in-out"
          }}
        >
          <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}>
              <span style={{ opacity: 0.5, marginRight: 10, fontFamily: 'monospace' }}>{`${index}.`}</span>
              {col}
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ fontSize: 10 }}>
              {configured ? "● Configured" : "○ Not configured"}
            </Typography>
          </FlexBox>

          <FlexBox sx={{ display: "flex", alignItems: "center", gap: 1 }}>
             {/* Robust clickable badge */}
            <Badge 
              text={prettyType(t)} 
              kind={kind} 
              onClick={() => handleToggleColumnType(col)} 
              disabled={!canSwitch}
            />
          </FlexBox>
        </div>
      );
    },
    [effectiveColumnTypes, overrides, selectedCols, toggleSelected, handleToggleColumnType, previewRows]
  );

  const SelectionRangeBar = useCallback(
    ({ title, value, onChange, hint, indexToCol, selectedIndices, onAdd, onReplace, onRemove }) => (
      <FlexBox
        sx={{
          mt: 1,
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 2,
          padding: 1.5,
          background: "rgba(0,0,0,0.015)",
        }}
      >
        <FlexBox sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="caption" sx={{ fontWeight: 800 }}>
            Select by range — {title}
          </Typography>
        </FlexBox>

        <div style={{ marginTop: 8 }}>
          <input
            value={value}
            onChange={onChange}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="e.g. 1-5, 8, 10-12"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid rgba(0,0,0,0.2)",
              outline: "none",
              fontSize: 13,
              fontFamily: "monospace",
            }}
          />
          <div style={{ marginTop: 6, minHeight: 18, fontSize: 12, color: hint ? "rgba(211,47,47,0.8)" : "rgba(0,0,0,0.35)" }}>
            {hint || "Enter indices to see preview below"}
          </div>
        </div>

        {/* NEW: Tabular snapshot of range selection */}
        <SelectedColumnsTable 
          selectedIndices={selectedIndices} 
          indexToCol={indexToCol} 
          allTypes={effectiveColumnTypes} 
          rows={previewRows} 
        />

        <FlexBox sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Button variant="outlined" color="inherit" size="small" onClick={onRemove}>
            Remove from selection
          </Button>
          <Button variant="outlined" color="inherit" size="small" onClick={onReplace}>
            Replace selection
          </Button>
          <Button variant="contained" color="primary" size="small" onClick={onAdd}>
            Add to selection
          </Button>
        </FlexBox>
      </FlexBox>
    ),
    [effectiveColumnTypes, previewRows]
  );

  const catRows = useMemo(
    () => (categoricalColumns || []).map((col, i) => ({ col, index: i + 1, listKind: "cat" })),
    [categoricalColumns]
  );
  const numRows = useMemo(
    () => (numericColumns || []).map((col, i) => ({ col, index: i + 1, listKind: "num" })),
    [numericColumns]
  );
  const unkRows = useMemo(
    () => (unknownColumns || []).map((col, i) => ({ col, index: i + 1, listKind: "unk" })),
    [unknownColumns]
  );
  const ordRows = useMemo(
    () => (orderedColumns || []).map((col, i) => ({ col, index: i + 1, listKind: kindFromType(effectiveColumnTypes?.[col]) })),
    [orderedColumns, effectiveColumnTypes]
  );

  return (
    <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <AISuggestionConsoleModal
        open={aiConsoleOpen}
        onClose={() => setAiConsoleOpen(false)}
        suggestion={aiSuggestion}
        loading={aiLoading}
        error={aiError}
        onAccept={handleAiAccept}
        onReject={handleAiReject}
      />

      <SectionCard>
        <FlexBox
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 1,
            alignItems: { xs: "flex-start", md: "center" },
            flexWrap: "wrap",
          }}
        >
          <FlexBox sx={{ flexDirection: "column", gap: 0.25 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Column Preprocessing & Type Management
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Review derived column types and apply preprocessing steps in bulk.
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Configured columns: {configuredCount}
              {useCustomConfig ? " • Custom config: ON (bulk is synced from config)" : ""}
            </Typography>
          </FlexBox>

          <Button variant="contained" color="primary" onClick={handleAiSuggest} disabled={aiLoading}>
            {aiLoading ? "Suggesting..." : "AI Suggest"}
          </Button>
        </FlexBox>
      </SectionCard>

      <SectionCard sx={{ padding: 0 }}>
        <ModeTabs value={mode} onChange={handleModeChange} tabs={tabs} />
      </SectionCard>

      {mode === "bulk" && (
        <FlexBox
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1.25fr" },
            gap: 2,
            alignItems: "start",
          }}
        >
          <SectionCard>
            <FlexBox sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Columns
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Selected: {selectedSummary.count}
              </Typography>
            </FlexBox>

            <FlexBox sx={{ mt: 1, display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
              <FlexBox sx={{ flex: 1, minWidth: 240 }}>
                <InputFieldWithLabel
                  label="Search"
                  placeholder="Search columns"
                  value={colSearch}
                  onChange={handleSearchChange}
                />
              </FlexBox>

              <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 0.5, alignItems: "flex-end" }}>
                <SegmentedViewToggle
                  value={listView}
                  onChange={(next) => {
                    setListView(next);
                    setCatRange(""); setNumRange(""); setUnkRange(""); setOrdRange("");
                    setCatRangeHint(null); setNumRangeHint(null); setUnkRangeHint(null); setOrdRangeHint(null);
                  }}
                />
              </FlexBox>
            </FlexBox>

            {listView === "ordered" && (
              <>
                <FlexBox sx={{ mt: 1.25, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    All columns (dataset order)
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {orderedColumns.length}
                  </Typography>
                </FlexBox>

                <SelectionRangeBar
                  title="All columns"
                  value={ordRange}
                  onChange={handleOrdRangeChange}
                  hint={ordRangeHint}
                  indexToCol={ordIndexToCol}
                  selectedIndices={ordSelectedIndices}
                  onAdd={() => {
                    const v = validateRange({ rangeText: ordRange, indexToCol: ordIndexToCol });
                    setOrdRangeHint(v.message);
                    if (!v.ok) return;
                    applyRangeToSelection({ rangeText: ordRange, indexToCol: ordIndexToCol, allowedCols: orderedColumns, mode: "add" });
                  }}
                  onReplace={() => {
                    const v = validateRange({ rangeText: ordRange, indexToCol: ordIndexToCol });
                    setOrdRangeHint(v.message);
                    if (!v.ok) return;
                    applyRangeToSelection({ rangeText: ordRange, indexToCol: ordIndexToCol, allowedCols: orderedColumns, mode: "replace" });
                  }}
                  onRemove={() => {
                    const v = validateRange({ rangeText: ordRange, indexToCol: ordIndexToCol });
                    setOrdRangeHint(v.message);
                    if (!v.ok) return;
                    applyRangeToSelection({ rangeText: ordRange, indexToCol: ordIndexToCol, allowedCols: orderedColumns, mode: "remove" });
                  }}
                />

                <FlexBox sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", maxHeight: 520 }}>
                  {ordRows.length ? ordRows.map(renderColumnRow) : (
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                      No columns match the search.
                    </Typography>
                  )}
                </FlexBox>
              </>
            )}

            {listView === "grouped" && (
              <>
                {/* Categorical */}
                <FlexBox sx={{ mt: 1.25, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Categorical
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {categoricalColumns.length}
                  </Typography>
                </FlexBox>

                <SelectionRangeBar
                  title="Categorical"
                  value={catRange}
                  onChange={handleCatRangeChange}
                  hint={catRangeHint}
                  indexToCol={catIndexToCol}
                  selectedIndices={catSelectedIndices}
                  onAdd={() => {
                    const v = validateRange({ rangeText: catRange, indexToCol: catIndexToCol });
                    setCatRangeHint(v.message);
                    if (!v.ok) return;
                    applyRangeToSelection({ rangeText: catRange, indexToCol: catIndexToCol, allowedCols: categoricalColumns, mode: "add" });
                  }}
                  onReplace={() => {
                    const v = validateRange({ rangeText: catRange, indexToCol: catIndexToCol });
                    setCatRangeHint(v.message);
                    if (!v.ok) return;
                    applyRangeToSelection({ rangeText: catRange, indexToCol: catIndexToCol, allowedCols: categoricalColumns, mode: "replace" });
                  }}
                  onRemove={() => {
                    const v = validateRange({ rangeText: catRange, indexToCol: catIndexToCol });
                    setCatRangeHint(v.message);
                    if (!v.ok) return;
                    applyRangeToSelection({ rangeText: catRange, indexToCol: catIndexToCol, allowedCols: categoricalColumns, mode: "remove" });
                  }}
                />

                <FlexBox sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", maxHeight: 300 }}>
                  {catRows.length ? catRows.map(renderColumnRow) : (
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                      No categorical columns match the search.
                    </Typography>
                  )}
                </FlexBox>

                {/* Numeric */}
                <FlexBox sx={{ mt: 2, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Numeric
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {numericColumns.length}
                  </Typography>
                </FlexBox>

                <SelectionRangeBar
                  title="Numeric"
                  value={numRange}
                  onChange={handleNumRangeChange}
                  hint={numRangeHint}
                  indexToCol={numIndexToCol}
                  selectedIndices={numSelectedIndices}
                  onAdd={() => {
                    const v = validateRange({ rangeText: numRange, indexToCol: numIndexToCol });
                    setNumRangeHint(v.message);
                    if (!v.ok) return;
                    applyRangeToSelection({ rangeText: numRange, indexToCol: numIndexToCol, allowedCols: numericColumns, mode: "add" });
                  }}
                  onReplace={() => {
                    const v = validateRange({ rangeText: numRange, indexToCol: numIndexToCol });
                    setNumRangeHint(v.message);
                    if (!v.ok) return;
                    applyRangeToSelection({ rangeText: numRange, indexToCol: numIndexToCol, allowedCols: numericColumns, mode: "replace" });
                  }}
                  onRemove={() => {
                    const v = validateRange({ rangeText: numRange, indexToCol: numIndexToCol });
                    setNumRangeHint(v.message);
                    if (!v.ok) return;
                    applyRangeToSelection({ rangeText: numRange, indexToCol: numIndexToCol, allowedCols: numericColumns, mode: "remove" });
                  }}
                />

                <FlexBox sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", maxHeight: 300 }}>
                  {numRows.length ? numRows.map(renderColumnRow) : (
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                      No numeric columns match the search.
                    </Typography>
                  )}
                </FlexBox>

                {/* Unknown */}
                {unknownColumns.length > 0 && (
                  <>
                    <FlexBox sx={{ mt: 2, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        Unknown
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {unknownColumns.length}
                      </Typography>
                    </FlexBox>

                    <SelectionRangeBar
                      title="Unknown"
                      value={unkRange}
                      onChange={handleUnkRangeChange}
                      hint={unkRangeHint}
                      indexToCol={unkIndexToCol}
                      selectedIndices={unkSelectedIndices}
                      onAdd={() => {
                        const v = validateRange({ rangeText: unkRange, indexToCol: unkIndexToCol });
                        setUnkRangeHint(v.message);
                        if (!v.ok) return;
                        applyRangeToSelection({ rangeText: unkRange, indexToCol: unkIndexToCol, allowedCols: unknownColumns, mode: "add" });
                      }}
                      onReplace={() => {
                        const v = validateRange({ rangeText: unkRange, indexToCol: unkIndexToCol });
                        setUnkRangeHint(v.message);
                        if (!v.ok) return;
                        applyRangeToSelection({ rangeText: unkRange, indexToCol: unkIndexToCol, allowedCols: unknownColumns, mode: "replace" });
                      }}
                      onRemove={() => {
                        const v = validateRange({ rangeText: unkRange, indexToCol: unkIndexToCol });
                        setUnkRangeHint(v.message);
                        if (!v.ok) return;
                        applyRangeToSelection({ rangeText: unkRange, indexToCol: unkIndexToCol, allowedCols: unknownColumns, mode: "remove" });
                      }}
                    />

                    <FlexBox sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", maxHeight: 300 }}>
                      {unkRows.map(renderColumnRow)}
                    </FlexBox>
                  </>
                )}
              </>
            )}

            {/* Applied summary */}
            {appliedList.length > 0 && (
              <FlexBox
                sx={{
                  mt: 2,
                  borderTop: "1px solid rgba(0,0,0,0.08)",
                  pt: 1.5,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  overflowY: "auto",
                  maxHeight: 300,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Applied preprocessing
                </Typography>

                {appliedList.map((item) => (
                  <FlexBox
                    key={item.col}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.75,
                      border: "1px solid rgba(0,0,0,0.10)",
                      borderRadius: 2,
                      padding: 1,
                      background: "rgba(0,0,0,0.015)",
                    }}
                  >
                    <FlexBox sx={{ display: "flex", justifyContent: "space-between", gap: 1, alignItems: "center" }}>
                      <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {item.col}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {item.type}
                        </Typography>
                      </FlexBox>

                      <Button variant="outlined" color="inherit" onClick={() => clearOverridesForColumn(item.col)}>
                        Clear
                      </Button>
                    </FlexBox>

                    <FlexBox sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                      {(item.labels || []).length ? (
                        item.labels.map((lbl) => <Chip key={lbl} text={lbl} />)
                      ) : (
                        <Chip text="No actions" />
                      )}
                    </FlexBox>
                  </FlexBox>
                ))}
              </FlexBox>
            )}
          </SectionCard>

          {/* Right: config */}
          <SectionCard>
            <FlexBox sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Configure selected columns
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Applies to: {selectedSummary.count ? `${selectedSummary.count} column(s)` : "—"}
              </Typography>
            </FlexBox>

            <FlexBox sx={{ mt: 1 }}>
              <Typography variant="caption" color="textSecondary">
                Changes here are staged. Click "Apply to selected" to commit them.
              </Typography>
              {useCustomConfig && (
                <Typography variant="caption" color="textSecondary">
                  Custom config is ON: bulk changes will reflect in the live config, and config changes will sync back into bulk.
                </Typography>
              )}
            </FlexBox>

            {/* Categorical */}
            {selectedSummary.hasCat && (
              <FlexBox
                sx={{
                  mt: 2,
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 2,
                  padding: 1.5,
                }}
              >
                <FlexBox sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    Categorical preprocessing
                  </Typography>
                  <Badge text="Categorical" kind="cat" />
                </FlexBox>

                <FlexBox sx={{ mt: 1.25, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                  <PillToggle
                    label="Clean labels"
                    active={labelCleanEnabled}
                    onClick={() => setLabelCleanEnabled((v) => !v)}
                    disabled={!selectedSummary.hasCat}
                  />
                  <PillToggle
                    label="Handle missing values"
                    active={catMissingEnabled}
                    onClick={() => setCatMissingEnabled((v) => !v)}
                    disabled={!selectedSummary.hasCat}
                  />
                  <PillToggle
                    label="Reduce cardinality"
                    active={reduceEnabled}
                    onClick={() => setReduceEnabled((v) => !v)}
                    disabled={!selectedSummary.hasCat}
                  />
                  <PillToggle
                    label="Encode"
                    active={encodingEnabled}
                    onClick={() => setEncodingEnabled((v) => !v)}
                    disabled={!selectedSummary.hasCat}
                  />
                </FlexBox>

                {catMissingEnabled && (
                  <FlexBox
                    sx={{
                      mt: 1.25,
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                      gap: 1,
                    }}
                  >
                    <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                      <Typography variant="caption" color="textSecondary">
                        Missing method
                      </Typography>
                      <select
                        value={catMissingMethod}
                        onChange={(e) => setCatMissingMethod(e.target.value)}
                        style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)" }}
                      >
                        <option value="categorical_unknown">Fill with unknown</option>
                        <option value="categorical_mode">Fill with mode</option>
                      </select>
                    </FlexBox>

                    <InputFieldWithLabel
                      label="unknownLevel"
                      value={unknownLevel}
                      onChange={handleUnknownLevelChange}
                      helperText="Used only for “Fill with unknown”"
                      disabled={catMissingMethod !== "categorical_unknown"}
                    />
                  </FlexBox>
                )}

                {/* RESTORED: Reduce Cardinality Inputs */}
                {reduceEnabled && (
                  <FlexBox
                    sx={{
                      mt: 1.25,
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                      gap: 1,
                    }}
                  >
                    <InputFieldWithLabel
                      label="rare_prop_threshold"
                      value={rarePropThreshold}
                      onChange={handleRarePropThresholdChange}
                      helperText="Example: 0.01 (1%)"
                    />
                    <InputFieldWithLabel
                      label="high_cardinality_threshold"
                      value={highCardThreshold}
                      onChange={handleHighCardThresholdChange}
                      helperText="Example: 50"
                    />
                  </FlexBox>
                )}

                {/* RESTORED: Encoding Inputs */}
                {encodingEnabled && (
                  <FlexBox sx={{ mt: 1.25 }}>
                    <InputFieldWithLabel
                      label="one_hot_max_levels"
                      value={oneHotMaxLevels}
                      onChange={handleOneHotMaxLevelsChange}
                      helperText="Up to this many unique levels → one-hot; otherwise label+freq."
                    />
                  </FlexBox>
                )}
              </FlexBox>
            )}

            {/* Numeric */}
            {selectedSummary.hasNum && (
              <FlexBox
                sx={{
                  mt: 2,
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 2,
                  padding: 1.5,
                }}
              >
                <FlexBox sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    Numeric preprocessing
                  </Typography>
                  <Badge text="Numeric" kind="num" />
                </FlexBox>

                <FlexBox sx={{ mt: 1.25, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                  <PillToggle
                    label="Impute missing values"
                    active={numMissingEnabled}
                    onClick={() => setNumMissingEnabled((v) => !v)}
                    disabled={!selectedSummary.hasNum}
                  />
                  <PillToggle
                    label="Scale"
                    active={scalingEnabled}
                    onClick={() => setScalingEnabled((v) => !v)}
                    disabled={!selectedSummary.hasNum}
                  />
                </FlexBox>

                {numMissingEnabled && (
                  <FlexBox
                    sx={{
                      mt: 1.25,
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                      gap: 1,
                    }}
                  >
                    <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                      <Typography variant="caption" color="textSecondary">
                        Imputation method
                      </Typography>
                      <select
                        value={numMissingMethod}
                        onChange={(e) => setNumMissingMethod(e.target.value)}
                        style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)" }}
                      >
                        <option value="numeric_median">Median</option>
                        <option value="numeric_mean">Mean</option>
                        <option value="numeric_constant">Constant</option>
                      </select>
                    </FlexBox>

                    <InputFieldWithLabel
                      label="constant value"
                      value={numConstant}
                      onChange={handleNumConstantChange}
                      helperText="Used only for Constant"
                      disabled={numMissingMethod !== "numeric_constant"}
                    />
                  </FlexBox>
                )}

                {scalingEnabled && (
                  <FlexBox sx={{ mt: 1.25, display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Typography variant="caption" color="textSecondary">
                      Scaling method
                    </Typography>
                    <select
                      value={scalingMethod}
                      onChange={(e) => setScalingMethod(e.target.value)}
                      style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)" }}
                    >
                      <option value="zscore">Z-score</option>
                      <option value="minmax">Min-max</option>
                      <option value="none">None</option>
                    </select>
                  </FlexBox>
                )}
              </FlexBox>
            )}

            <FlexBox sx={{ mt: 2, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="caption" color="textSecondary">
                Tip: After applying, selection clears. Re-select to apply different rules.
              </Typography>

              <Button variant="contained" color="primary" onClick={applyToSelected} disabled={!selectedCols?.length}>
                Apply to selected
              </Button>
            </FlexBox>
          </SectionCard>
        </FlexBox>
      )}

      {mode === "config" && (
        <PreprocessingConfigEditorPanel
          liveConfig={liveConfig}
          validateConfig={validatePreprocessingConfig}
          useCustomConfig={useCustomConfig}
          setUseCustomConfig={setUseCustomConfig}
          customConfigText={customConfigText}
          setCustomConfigText={setCustomConfigText}
          setCustomConfigParsed={setCustomConfigParsed}
          customConfigError={customConfigError}
          setCustomConfigError={setCustomConfigError}
        />
      )}
    </FlexBox>
  );
}

Step2PreprocessingOrchestrator.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.string).isRequired,
  columnTypes: PropTypes.object.isRequired,
  onTypeChange: PropTypes.func.isRequired,
  previewRows: PropTypes.array,
  filename: PropTypes.string,

  defaults: PropTypes.object.isRequired,
  setDefaults: PropTypes.func.isRequired,
  overrides: PropTypes.object.isRequired,
  setOverrides: PropTypes.func.isRequired,

  validatePreprocessingConfig: PropTypes.func.isRequired,

  liveConfig: PropTypes.object,
  useCustomConfig: PropTypes.bool.isRequired,
  setUseCustomConfig: PropTypes.func.isRequired,
  customConfigText: PropTypes.string.isRequired,
  setCustomConfigText: PropTypes.func.isRequired,
  setCustomConfigParsed: PropTypes.func.isRequired,
  customConfigError: PropTypes.string,
  setCustomConfigError: PropTypes.func.isRequired,
};

Step2PreprocessingOrchestrator.defaultProps = {
  liveConfig: null,
  previewRows: [],
  filename: "dataset.csv",
};

function oneHotMaxLevelsSafe(v) {
  const n = Number(v);
  if (Number.isFinite(n)) return n;
  return 10;
}