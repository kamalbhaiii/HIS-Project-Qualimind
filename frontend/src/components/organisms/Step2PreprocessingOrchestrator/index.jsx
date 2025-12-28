// components/organisms/Step2PreprocessingOrchestrator.jsx
import React, { useMemo, useState } from "react";
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

  // label cleaning
  if (colOverride.label_cleaning?.method === "standard") out.push(LABELS.label_cleaning);

  // missing values
  if (colOverride.missing_values?.categorical?.method) out.push(LABELS.missing_cat);
  if (colOverride.missing_values?.numeric?.method) out.push(LABELS.missing_num);

  // reduce cardinality
  if (colOverride.reduce_cardinality?.method) out.push(LABELS.reduce_cardinality);

  // encoding
  if (colOverride.encoding?.method) out.push(LABELS.encoding);

  // scaling
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

  // IMPORTANT: ModeTabs often calls onChange(event, value)
  const handleModeChange = (arg1, arg2) => {
    const next =
      typeof arg2 === "string"
        ? arg2
        : typeof arg1 === "string"
          ? arg1
          : arg1?.target?.value;

    setMode(next === "config" || next === "bulk" ? next : "bulk");
  };

  const tabs = useMemo(
    () => [
      { key: "bulk", label: "Bulk Selection" },
      { key: "config", label: "Config Editor" },
    ],
    []
  );

  // multi-select rows
  const [selectedCols, setSelectedCols] = useState([]);
  const [colSearch, setColSearch] = useState("");

  const filteredColumns = useMemo(() => {
    const q = String(colSearch || "").trim().toLowerCase();
    if (!q) return columns || [];
    return (columns || []).filter((c) => String(c).toLowerCase().includes(q));
  }, [columns, colSearch]);

  const selectedSummary = useMemo(() => {
    const selected = selectedCols || [];
    const types = selected.map((c) => columnTypes?.[c]);
    const hasCat = types.some((t) => isCategoricalType(t));
    const hasNum = types.some((t) => isNumericType(t));
    return { hasCat, hasNum, count: selected.length };
  }, [selectedCols, columnTypes]);

  const configuredColumns = useMemo(() => Object.keys(overrides || {}), [overrides]);
  const configuredCount = configuredColumns.length;

  const toggleSelected = (col) => {
    setSelectedCols((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]));
  };

  const clearOverridesForColumn = (col) => {
    setOverrides((prev) => {
      const next = { ...(prev || {}) };
      delete next[col];
      return next;
    });
  };

  /* ------------------------- Right panel (group apply) ------------------------- */

  // local group selections (no vague checkboxes; use toggle pills)
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

  const applyToSelected = () => {
    const cols = selectedCols || [];
    if (!cols.length) return;

    setOverrides((prev) => {
      const next = { ...(prev || {}) };

      cols.forEach((col) => {
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

    // keep selection "reselected" (do NOT clear)
    setSelectedCols((prev) => prev);

    // keep defaults synchronized for better UX continuity
    setDefaults((prev) => ({
      ...(prev || {}),
      categoricalMissing: catMissingMethod,
      unknownLevel,
      numericMissing: numMissingMethod,
      numericConstant: Number.isFinite(Number(numConstant)) ? Number(numConstant) : 0,
      scaling: scalingMethod,
      oneHotMaxLevels: Number.isFinite(Number(oneHotMaxLevels)) ? Number(oneHotMaxLevels) : 10,
      rarePropThreshold: Number.isFinite(Number(rarePropThreshold)) ? Number(rarePropThreshold) : 0.01,
      highCardinalityThreshold: Number.isFinite(Number(highCardThreshold)) ? Number(highCardThreshold) : 50,
    }));
  };

  /* ------------------------------- AI Suggest ------------------------------- */

  const [aiConsoleOpen, setAiConsoleOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  function pickRandomSample(rows, n) {
    const arr = Array.isArray(rows) ? rows.slice() : [];
    if (arr.length <= n) return arr;
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr.slice(0, n);
  }

  function isMissing(v) {
    if (v === null || v === undefined) return true;
    if (typeof v === "string" && v.trim() === "") return true;
    return false;
  }

  function buildColumnProfiles({ cols, types, sampleRows }) {
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
  }

  const handleAiSuggest = async () => {
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
  };

  // NOTE: you already have conversion logic in older versions; keep your existing accept flow if you prefer.
  const handleAiAccept = () => {
    if (!aiSuggestion?.preprocessingConfig) return;

    setCustomConfigText(JSON.stringify(aiSuggestion.preprocessingConfig, null, 2));
    setCustomConfigParsed(aiSuggestion.preprocessingConfig);
    setCustomConfigError(null);
    setUseCustomConfig(true);

    setAiConsoleOpen(false);
  };

  const handleAiReject = () => setAiConsoleOpen(false);

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
    // stable sort by col
    out.sort((a, b) => String(a.col).localeCompare(String(b.col)));
    return out;
  }, [overrides, columnTypes]);

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

      {/* Header / tasks card */}
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
              Select one or more columns, configure on the right, then apply. Only applied choices are included in the preprocessingConfig.
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

      {/* Tabs */}
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
          {/* Left: Column multi-select (row UI) */}
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
                onChange={(e) => setColSearch(e.target.value)}
              />
            </FlexBox>

            <FlexBox sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
              {filteredColumns.map((col) => {
                const t = columnTypes?.[col];
                const selected = selectedCols.includes(col);
                const configured = !!overrides?.[col];

                const kind = isCategoricalType(t) ? "cat" : isNumericType(t) ? "num" : "unk";

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
                      <Typography variant="body2" sx={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {col}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {configured ? "Configured" : "Not configured"}
                      </Typography>
                    </FlexBox>

                    <FlexBox sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Badge text={prettyType(t)} kind={kind} />
                    </FlexBox>
                  </div>
                );
              })}
            </FlexBox>

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
                      {(item.labels || []).length ? item.labels.map((lbl) => <Chip key={lbl} text={lbl} />) : <Chip text="No actions" />}
                    </FlexBox>
                  </div>
                ))}
              </FlexBox>
            )}
          </SectionCard>

          {/* Right: friendly configuration panel (contextual) */}
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
                Only compatible options are shown for the current selection.
              </Typography>
            </FlexBox>

            {/* CATEGORICAL OPTIONS */}
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

                {/* Missing categoricals */}
                {catMissingEnabled && (
                  <FlexBox sx={{ mt: 1.25, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
                    <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                      <Typography variant="caption" color="textSecondary">
                        Missing method
                      </Typography>
                      <select value={catMissingMethod} onChange={(e) => setCatMissingMethod(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)" }}>
                        <option value="categorical_unknown">Fill with unknown</option>
                        <option value="categorical_mode">Fill with mode</option>
                      </select>
                    </FlexBox>

                    <InputFieldWithLabel
                      label="unknownLevel"
                      value={unknownLevel}
                      onChange={(e) => setUnknownLevel(e.target.value)}
                      helperText="Used only for “Fill with unknown”"
                      disabled={catMissingMethod !== "categorical_unknown"}
                    />
                  </FlexBox>
                )}

                {/* Reduce */}
                {reduceEnabled && (
                  <FlexBox sx={{ mt: 1.25, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
                    <InputFieldWithLabel
                      label="rare_prop_threshold"
                      value={rarePropThreshold}
                      onChange={(e) => setRarePropThreshold(e.target.value)}
                      helperText="Example: 0.01 (1%)"
                    />
                    <InputFieldWithLabel
                      label="high_cardinality_threshold"
                      value={highCardThreshold}
                      onChange={(e) => setHighCardThreshold(e.target.value)}
                      helperText="Example: 50"
                    />
                  </FlexBox>
                )}

                {/* Encoding */}
                {encodingEnabled && (
                  <FlexBox sx={{ mt: 1.25 }}>
                    <InputFieldWithLabel
                      label="one_hot_max_levels"
                      value={oneHotMaxLevels}
                      onChange={(e) => setOneHotMaxLevels(e.target.value)}
                      helperText="Up to this many unique levels → one-hot; otherwise label+freq."
                    />
                  </FlexBox>
                )}
              </FlexBox>
            )}

            {/* NUMERIC OPTIONS */}
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
                      <select value={numMissingMethod} onChange={(e) => setNumMissingMethod(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)" }}>
                        <option value="numeric_median">Median</option>
                        <option value="numeric_mean">Mean</option>
                        <option value="numeric_constant">Constant</option>
                      </select>
                    </FlexBox>

                    <InputFieldWithLabel
                      label="constant value"
                      value={numConstant}
                      onChange={(e) => setNumConstant(e.target.value)}
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
                    <select value={scalingMethod} onChange={(e) => setScalingMethod(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)" }}>
                      <option value="zscore">Z-score</option>
                      <option value="minmax">Min-max</option>
                      <option value="none">None</option>
                    </select>
                  </FlexBox>
                )}
              </FlexBox>
            )}

            {/* Apply */}
            <FlexBox sx={{ mt: 2, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="caption" color="textSecondary">
                Tip: Select multiple columns to apply the same preprocessing as a group.
              </Typography>

              <Button variant="contained" color="primary" onClick={applyToSelected} disabled={!selectedCols?.length}>
                Apply to selected
              </Button>
            </FlexBox>
          </SectionCard>
        </FlexBox>
      )}

      {/* Config editor */}
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
