// components/organisms/Step2PreprocessingOrchestrator.jsx
import React, { useCallback, useMemo, useState } from "react";
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
  return s === "numeric" || s === "number";
}

function isCategoricalType(t) {
  const s = String(t || "").toLowerCase();
  return s === "categorical" || s === "factor" || s === "character" || s === "string";
}

function prettyType(t) {
  if (isNumericType(t)) return "Numeric";
  if (isCategoricalType(t)) return "Categorical";
  return "Unknown";
}

/* --------------------------- small helpers --------------------------- */

function uniq(arr) {
  return Array.from(new Set(arr));
}

/**
 * Parse ranges like:
 * "1-5" -> [1,2,3,4,5]
 * "1-5, 8, 10-12" -> ...
 * "3" -> [3]
 * Invalid tokens are ignored.
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
        padding: "8px 10px",
        borderRadius: 999,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 12,
        fontWeight: 600,
        userSelect: "none",
      }}
    >
      {label}
    </button>
  );
}

function Badge({ text, kind }) {
  const bg =
    kind === "cat"
      ? "rgba(46,125,50,0.10)"
      : kind === "num"
        ? "rgba(156,39,176,0.10)"
        : "rgba(0,0,0,0.06)";
  const fg =
    kind === "cat"
      ? "rgba(46,125,50,0.90)"
      : kind === "num"
        ? "rgba(156,39,176,0.90)"
        : "rgba(0,0,0,0.65)";
  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: 999,
        background: bg,
        color: fg,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

function Chip({ text }) {
  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(0,0,0,0.06)",
        color: "rgba(0,0,0,0.8)",
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

/* ------------------------ mapping overrides -> labels ------------------------ */

const LABELS = {
  label_cleaning: "Clean & standardize labels",
  missing_cat: "Handle missing values (categorical)",
  missing_num: "Impute missing values (numeric)",
  reduce_cardinality: "Reduce rare / high-cardinality",
  encoding: "Encode categorical variables",
  scaling: "Scale numeric features",
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

/* ------------------------------ main component ------------------------------ */

export default function Step2PreprocessingOrchestrator({
  columns,
  columnTypes,
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

  // selection
  const [selectedCols, setSelectedCols] = useState([]);
  const [colSearch, setColSearch] = useState("");

  const handleSearchChange = useCallback((e) => setColSearch(e.target.value), []);

  const filteredColumns = useMemo(() => {
    const q = String(colSearch || "").trim().toLowerCase();
    if (!q) return columns || [];
    return (columns || []).filter((c) => String(c).toLowerCase().includes(q));
  }, [columns, colSearch]);

  // Split into lists
  const { categoricalColumns, numericColumns, unknownColumns } = useMemo(() => {
    const cats = [];
    const nums = [];
    const unk = [];

    for (const col of filteredColumns || []) {
      const t = columnTypes?.[col];
      if (isCategoricalType(t)) cats.push(col);
      else if (isNumericType(t)) nums.push(col);
      else unk.push(col);
    }

    cats.sort((a, b) => String(a).localeCompare(String(b)));
    nums.sort((a, b) => String(a).localeCompare(String(b)));
    unk.sort((a, b) => String(a).localeCompare(String(b)));

    return { categoricalColumns: cats, numericColumns: nums, unknownColumns: unk };
  }, [filteredColumns, columnTypes]);

  // list-local index maps
  const catIndexToCol = useMemo(() => {
    const map = {};
    (categoricalColumns || []).forEach((c, idx) => {
      map[idx + 1] = c;
    });
    return map;
  }, [categoricalColumns]);

  const numIndexToCol = useMemo(() => {
    const map = {};
    (numericColumns || []).forEach((c, idx) => {
      map[idx + 1] = c;
    });
    return map;
  }, [numericColumns]);

  const unkIndexToCol = useMemo(() => {
    const map = {};
    (unknownColumns || []).forEach((c, idx) => {
      map[idx + 1] = c;
    });
    return map;
  }, [unknownColumns]);

  const selectedSummary = useMemo(() => {
    const selected = selectedCols || [];
    const types = selected.map((c) => columnTypes?.[c]);
    const hasCat = types.some((t) => isCategoricalType(t));
    const hasNum = types.some((t) => isNumericType(t));
    return { hasCat, hasNum, count: selected.length };
  }, [selectedCols, columnTypes]);

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

  /* --------------------- Range-based selection per list --------------------- */

  const [catRange, setCatRange] = useState("");
  const [numRange, setNumRange] = useState("");
  const [unkRange, setUnkRange] = useState("");

  const handleCatRangeChange = useCallback((e) => setCatRange(e.target.value), []);
  const handleNumRangeChange = useCallback((e) => setNumRange(e.target.value), []);
  const handleUnkRangeChange = useCallback((e) => setUnkRange(e.target.value), []);

  const [catRangeHint, setCatRangeHint] = useState(null);
  const [numRangeHint, setNumRangeHint] = useState(null);
  const [unkRangeHint, setUnkRangeHint] = useState(null);

  const validateRange = useCallback(({ rangeText, indexToCol }) => {
    const nums = parseNumberRanges(rangeText);
    if (!nums.length) {
      return { ok: false, message: "Enter a range like “1-5” or “1-3, 7, 10-12”." };
    }

    const validCols = nums.map((n) => indexToCol[n]).filter(Boolean);
    if (!validCols.length) {
      return { ok: false, message: "No valid indices matched in this list. Check the numbers shown in the list." };
    }

    const unknown = nums.filter((n) => !indexToCol[n]);
    if (unknown.length) {
      return {
        ok: true,
        message: `Some indices are out of range and ignored: ${unknown.slice(0, 8).join(", ")}${
          unknown.length > 8 ? "…" : ""
        }`,
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

  /**
   * NEW REQUIREMENT:
   * When user clicks "Apply to selected", apply overrides AND clear the selection afterwards.
   *
   * Implementation detail:
   * - We take a snapshot of current selected columns (colsSnapshot) so we can safely clear selection
   *   while still applying config to those columns.
   * - We also clear range input text boxes & hints for a clean UX.
   */
  const applyToSelected = useCallback(() => {
    const colsSnapshot = Array.isArray(selectedCols) ? [...selectedCols] : [];
    if (!colsSnapshot.length) return;

    setOverrides((prev) => {
      const next = { ...(prev || {}) };

      colsSnapshot.forEach((col) => {
        const t = columnTypes?.[col];
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

        // cleanup empty missing_values
        if (cur.missing_values && !cur.missing_values.categorical && !cur.missing_values.numeric) {
          delete cur.missing_values;
        }

        // cleanup empty override
        const isEmpty =
          !cur.missing_values && !cur.label_cleaning && !cur.reduce_cardinality && !cur.encoding && !cur.scaling;

        if (isEmpty) delete next[col];
        else next[col] = cur;
      });

      return next;
    });

    // sync defaults (same as before)
    setDefaults((prev) => ({
      ...(prev || {}),
      categoricalMissing: catMissingMethod,
      unknownLevel,
      numericMissing: numMissingMethod,
      numericConstant: Number.isFinite(Number(numConstant)) ? Number(numConstant) : 0,
      scaling: scalingMethod,
      oneHotMaxLevels: Number.isFinite(Number(oneHotMaxMaxLevelsSafe(oneHotMaxLevels))) ? Number(oneHotMaxLevels) : 10,
      rarePropThreshold: Number.isFinite(Number(rarePropThreshold)) ? Number(rarePropThreshold) : 0.01,
      highCardinalityThreshold: Number.isFinite(Number(highCardThreshold)) ? Number(highCardThreshold) : 50,
    }));

    // NEW: clear selection
    setSelectedCols([]);

    // NEW: clear range inputs and hints (optional but aligns with "remove the selection" UX)
    setCatRange("");
    setNumRange("");
    setUnkRange("");
    setCatRangeHint(null);
    setNumRangeHint(null);
    setUnkRangeHint(null);
  }, [
    selectedCols,
    setOverrides,
    setDefaults,
    columnTypes,
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
        types: columnTypes,
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
  }, [previewRows, pickRandomSample, buildColumnProfiles, columns, columnTypes, filename]);

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
        type: prettyType(columnTypes?.[col]),
        labels,
      });
    }
    out.sort((a, b) => String(a.col).localeCompare(String(b.col)));
    return out;
  }, [overrides, columnTypes]);

  /* ------------------------------ Column row renderer ------------------------------ */

  const renderColumnRow = useCallback(
    ({ col, index, listKind }) => {
      const t = columnTypes?.[col];
      const selected = selectedCols.includes(col);
      const configured = !!overrides?.[col];

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
            borderRadius: 12,
            padding: 12,
            cursor: "pointer",
            outline: "none",
            background: selected ? "rgba(25,118,210,0.08)" : "white",
            boxShadow: selected ? "0 0 0 2px rgba(25,118,210,0.15) inset" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis" }}>
              <span style={{ opacity: 0.75, marginRight: 8 }}>{`${index}.`}</span>
              {col}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {configured ? "Configured" : "Not configured"}
            </Typography>
          </FlexBox>

          <FlexBox sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Badge text={prettyType(t)} kind={listKind} />
          </FlexBox>
        </div>
      );
    },
    [columnTypes, overrides, selectedCols, toggleSelected]
  );

  const SelectionRangeBar = useCallback(
    ({ title, value, onChange, hint, onAdd, onReplace, onRemove }) => (
      <FlexBox
        sx={{
          mt: 1,
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 2,
          padding: 1,
          background: "rgba(0,0,0,0.015)",
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 800 }}>
          Select by range — {title}
        </Typography>

        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "rgba(0,0,0,0.7)" }}>Range</div>
          <input
            value={value}
            onChange={onChange}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="e.g. 1-5, 8, 10-12"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              outline: "none",
              fontSize: 13,
            }}
          />
          <div style={{ marginTop: 6, fontSize: 12, color: hint ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.35)" }}>
            {hint || " "}
          </div>
        </div>

        <FlexBox sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Button variant="outlined" color="inherit" onClick={onRemove}>
            Remove
          </Button>
          <Button variant="outlined" color="inherit" onClick={onReplace}>
            Replace
          </Button>
          <Button variant="contained" color="primary" onClick={onAdd}>
            Add
          </Button>
        </FlexBox>
      </FlexBox>
    ),
    []
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
              Column preprocessing
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Each list has its own numbering starting from 1. Use ranges per list, apply settings, then select a different range and apply different settings. After applying, selection is cleared automatically.
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Configured columns: {configuredCount}
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

            <FlexBox sx={{ mt: 1 }}>
              <InputFieldWithLabel
                label="Search"
                placeholder="Search columns"
                value={colSearch}
                onChange={handleSearchChange}
              />
            </FlexBox>

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
              onAdd={() => {
                const v = validateRange({ rangeText: catRange, indexToCol: catIndexToCol });
                setCatRangeHint(v.message);
                if (!v.ok) return;
                applyRangeToSelection({
                  rangeText: catRange,
                  indexToCol: catIndexToCol,
                  allowedCols: categoricalColumns,
                  mode: "add",
                });
              }}
              onReplace={() => {
                const v = validateRange({ rangeText: catRange, indexToCol: catIndexToCol });
                setCatRangeHint(v.message);
                if (!v.ok) return;
                applyRangeToSelection({
                  rangeText: catRange,
                  indexToCol: catIndexToCol,
                  allowedCols: categoricalColumns,
                  mode: "replace",
                });
              }}
              onRemove={() => {
                const v = validateRange({ rangeText: catRange, indexToCol: catIndexToCol });
                setCatRangeHint(v.message);
                if (!v.ok) return;
                applyRangeToSelection({
                  rangeText: catRange,
                  indexToCol: catIndexToCol,
                  allowedCols: categoricalColumns,
                  mode: "remove",
                });
              }}
            />

            <FlexBox sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", maxHeight: 300 }}>
              {catRows.length ? (
                catRows.map(renderColumnRow)
              ) : (
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
              onAdd={() => {
                const v = validateRange({ rangeText: numRange, indexToCol: numIndexToCol });
                setNumRangeHint(v.message);
                if (!v.ok) return;
                applyRangeToSelection({
                  rangeText: numRange,
                  indexToCol: numIndexToCol,
                  allowedCols: numericColumns,
                  mode: "add",
                });
              }}
              onReplace={() => {
                const v = validateRange({ rangeText: numRange, indexToCol: numIndexToCol });
                setNumRangeHint(v.message);
                if (!v.ok) return;
                applyRangeToSelection({
                  rangeText: numRange,
                  indexToCol: numIndexToCol,
                  allowedCols: numericColumns,
                  mode: "replace",
                });
              }}
              onRemove={() => {
                const v = validateRange({ rangeText: numRange, indexToCol: numIndexToCol });
                setNumRangeHint(v.message);
                if (!v.ok) return;
                applyRangeToSelection({
                  rangeText: numRange,
                  indexToCol: numIndexToCol,
                  allowedCols: numericColumns,
                  mode: "remove",
                });
              }}
            />

            <FlexBox sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", maxHeight: 300 }}>
              {numRows.length ? (
                numRows.map(renderColumnRow)
              ) : (
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
                  onAdd={() => {
                    const v = validateRange({ rangeText: unkRange, indexToCol: unkIndexToCol });
                    setUnkRangeHint(v.message);
                    if (!v.ok) return;
                    applyRangeToSelection({
                      rangeText: unkRange,
                      indexToCol: unkIndexToCol,
                      allowedCols: unknownColumns,
                      mode: "add",
                    });
                  }}
                  onReplace={() => {
                    const v = validateRange({ rangeText: unkRange, indexToCol: unkIndexToCol });
                    setUnkRangeHint(v.message);
                    if (!v.ok) return;
                    applyRangeToSelection({
                      rangeText: unkRange,
                      indexToCol: unkIndexToCol,
                      allowedCols: unknownColumns,
                      mode: "replace",
                    });
                  }}
                  onRemove={() => {
                    const v = validateRange({ rangeText: unkRange, indexToCol: unkIndexToCol });
                    setUnkRangeHint(v.message);
                    if (!v.ok) return;
                    applyRangeToSelection({
                      rangeText: unkRange,
                      indexToCol: unkIndexToCol,
                      allowedCols: unknownColumns,
                      mode: "remove",
                    });
                  }}
                />

                <FlexBox sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", maxHeight: 300 }}>
                  {unkRows.map(renderColumnRow)}
                </FlexBox>
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
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Applied preprocessing
                </Typography>

                {appliedList.map((item) => (
                  <div
                    key={item.col}
                    style={{
                      border: "1px solid rgba(0,0,0,0.08)",
                      borderRadius: 12,
                      padding: 12,
                      background: "rgba(0,0,0,0.02)",
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
                  </div>
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
                After you click “Apply to selected”, the selection is cleared automatically.
              </Typography>
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
                  <FlexBox sx={{ mt: 1.25, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
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

                {reduceEnabled && (
                  <FlexBox sx={{ mt: 1.25, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
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
                  <FlexBox sx={{ mt: 1.25, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
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
                Tip: After applying, you can immediately select a new range and apply different settings.
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

/**
 * Small safeguard helper used above (prevents accidental NaN in defaults).
 * Kept outside component to avoid re-creation each render.
 */
function oneHotMaxMaxLevelsSafe(v) {
  const n = Number(v);
  if (Number.isFinite(n)) return n;
  return 10;
}
