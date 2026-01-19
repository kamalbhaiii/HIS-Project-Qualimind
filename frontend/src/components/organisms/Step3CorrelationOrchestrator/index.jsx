// src/components/organisms/Step3CorrelationOrchestrator.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";

import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";
import Button from "../../atoms/CustomButton";
import ModeTabs from "../../atoms/ModeTabs";
import SectionCard from "../../atoms/SectionCard";
import CorrelationConfigForm from "../../molecules/CorrelationConfigForm";

/* ----------------------- helpers ----------------------- */

function isPlainObject(x) {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function safeName(s, fallback) {
  const t = String(s || "").trim();
  return t || fallback;
}

function makeId() {
  return `corr_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function safeJsonStringify(obj) {
  try {
    return JSON.stringify(obj ?? null, null, 2);
  } catch (e) {
    return "";
  }
}

function tryParseJson(txt) {
  try {
    const parsed = JSON.parse(txt);
    return { ok: true, value: parsed, error: null };
  } catch (e) {
    return { ok: false, value: null, error: e?.message || "Invalid JSON" };
  }
}

function normalizeMethod(m) {
  const v = String(m || "").toLowerCase().trim();
  if (v === "spearman") return "spearman";
  if (v === "kendall") return "kendall";
  return "pearson";
}

function normalizeNumber(x, def) {
  const n = Number(x);
  return Number.isFinite(n) ? n : def;
}

function clamp(n, lo, hi) {
  if (!Number.isFinite(n)) return n;
  return Math.max(lo, Math.min(hi, n));
}

function ensureAnalysisDefaults(a) {
  const base = isPlainObject(a) ? a : {};
  return {
    id: String(base.id || makeId()),
    name: safeName(base.name, "Correlation"),
    enabled: base.enabled === true,
    columns: Array.isArray(base.columns) ? base.columns.filter(Boolean) : [],
    method: normalizeMethod(base.method || "pearson"),
    topK: clamp(normalizeNumber(base.topK, 10), 1, 200),
    minAbs: clamp(normalizeNumber(base.minAbs, 0.0), 0, 1),
    includeMatrix: base.includeMatrix !== false,
  };
}

function validateCorrelationConfig(cfg) {
  if (!isPlainObject(cfg)) return { ok: false, message: "correlationConfig must be an object" };
  if (String(cfg.version || "") !== "1.0") return { ok: false, message: 'correlationConfig.version must be "1.0"' };
  if (!Array.isArray(cfg.analyses)) return { ok: false, message: "correlationConfig.analyses must be an array" };
  if (cfg.analyses.length === 0) return { ok: false, message: "correlationConfig.analyses must not be empty" };

  const ids = new Set();
  for (let i = 0; i < cfg.analyses.length; i += 1) {
    const a = cfg.analyses[i];
    if (!isPlainObject(a)) return { ok: false, message: `analyses[${i}] must be an object` };
    if (!a.id || typeof a.id !== "string") return { ok: false, message: `analyses[${i}].id is required` };
    if (ids.has(a.id)) return { ok: false, message: `Duplicate analyses id: ${a.id}` };
    ids.add(a.id);

    const cols = Array.isArray(a.columns) ? a.columns.filter(Boolean) : [];
    if (a.enabled === true && cols.length < 2) {
      return { ok: false, message: `analyses[${i}] is enabled but has fewer than 2 columns` };
    }
  }

  const primaryId = String(cfg.primaryId || "");
  if (primaryId && !ids.has(primaryId)) {
    return { ok: false, message: "correlationConfig.primaryId must match an existing analysis id" };
  }

  return { ok: true };
}

function normalizeCorrelationConfig(cfg) {
  const obj = isPlainObject(cfg) ? cfg : {};
  const analysesRaw = Array.isArray(obj.analyses) ? obj.analyses : [];
  const analyses = analysesRaw.length
    ? analysesRaw.map((a, idx) => {
        const normalized = ensureAnalysisDefaults(a);
        return { ...normalized, name: safeName(normalized.name, `Correlation ${idx + 1}`) };
      })
    : [
        ensureAnalysisDefaults({
          id: "primary",
          name: "Correlation 1",
          enabled: false,
          columns: [],
          method: "pearson",
          topK: 10,
          minAbs: 0.0,
          includeMatrix: true,
        }),
      ];

  const primaryIdRaw = String(obj.primaryId || "");
  const primaryId = primaryIdRaw && analyses.some((x) => x.id === primaryIdRaw) ? primaryIdRaw : analyses[0]?.id;

  return { version: "1.0", primaryId: primaryId || "primary", analyses };
}

function isAnalysisValidForCorrelation(a) {
  if (!a || a.enabled !== true) return false;
  const cols = Array.isArray(a.columns) ? a.columns.filter(Boolean) : [];
  return cols.length >= 2;
}

/* ----------------------- component ----------------------- */

const Step3CorrelationOrchestrator = ({
  columnTypes,

  correlationValue,
  onCorrelationChange,

  // preprocessing editor shared props
  livePreprocessingConfig,
  preprocessingConfigEffective,
  setPreprocessingConfigEffective,
  validatePreprocessingConfig,
  useCustomConfig,
  setUseCustomConfig,
  customConfigText,
  setCustomConfigText,
  setCustomConfigParsed,
  customConfigError,
  setCustomConfigError,
}) => {
  // tabs: builder vs json
  const [mode, setMode] = useState("builder");
  const tabs = useMemo(
    () => [
      { key: "builder", label: "Builder" },
      { key: "json", label: "JSON Editor" },
    ],
    []
  );

  const handleModeChange = useCallback((arg1, arg2) => {
    const next =
      typeof arg2 === "string" ? arg2 : typeof arg1 === "string" ? arg1 : arg1?.target?.value;
    setMode(next === "json" || next === "builder" ? next : "builder");
  }, []);

  // All columns (sorted)
  const allColumns = useMemo(() => {
    if (!columnTypes || typeof columnTypes !== "object") return [];
    return Object.keys(columnTypes)
      .map((c) => String(c))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [columnTypes]);

  // Numeric columns (convenience)
  const numericCols = useMemo(() => {
    if (!columnTypes || typeof columnTypes !== "object") return [];
    return Object.entries(columnTypes)
      .filter(([, t]) => String(t).toLowerCase() === "numeric" || String(t).toLowerCase() === "number")
      .map(([col]) => String(col))
      .sort((a, b) => a.localeCompare(b));
  }, [columnTypes]);

  // Local state mirrors incoming multi-run object
  const [localState, setLocalState] = useState(() => normalizeCorrelationConfig(correlationValue));
  const { analyses, primaryId } = localState;

  // Expand/collapse panels
  const [expandedIds, setExpandedIds] = useState(() => new Set([primaryId]));
  useEffect(() => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(primaryId);
      return next;
    });
  }, [primaryId]);

  const toggleExpanded = useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Keep local state in sync with parent value, but only when meaningful changes occur
  const lastSyncSigRef = useRef("");
  useEffect(() => {
    const sig = JSON.stringify({
      v: correlationValue?.version,
      primaryId: correlationValue?.primaryId,
      analyses: Array.isArray(correlationValue?.analyses)
        ? correlationValue.analyses.map((a) => ({
            id: a?.id,
            name: a?.name,
            enabled: a?.enabled,
            cols: Array.isArray(a?.columns) ? a.columns.length : 0,
            method: a?.method,
            topK: a?.topK,
            minAbs: a?.minAbs,
            includeMatrix: a?.includeMatrix,
          }))
        : [],
    });

    if (sig === lastSyncSigRef.current) return;
    lastSyncSigRef.current = sig;

    setLocalState(normalizeCorrelationConfig(correlationValue));
  }, [correlationValue]);

  const emitToParent = useCallback(
    (nextState) => {
      const payload = normalizeCorrelationConfig(nextState);
      setLocalState(payload);
      onCorrelationChange(payload);
    },
    [onCorrelationChange]
  );

  const addAnalysis = useCallback(() => {
    const next = {
      ...localState,
      analyses: [
        ...analyses,
        ensureAnalysisDefaults({
          name: `Correlation ${analyses.length + 1}`,
          enabled: true,
          columns: [],
          method: "pearson",
          topK: 10,
          minAbs: 0.0,
          includeMatrix: true,
        }),
      ],
    };
    emitToParent(next);
  }, [analyses, emitToParent, localState]);

  const removeAnalysis = useCallback(
    (id) => {
      const remaining = analyses.filter((a) => a.id !== id);

      if (!remaining.length) {
        const only = ensureAnalysisDefaults({
          id: "primary",
          name: "Correlation 1",
          enabled: false,
          columns: [],
          method: "pearson",
          topK: 10,
          minAbs: 0.0,
          includeMatrix: true,
        });
        emitToParent({ version: "1.0", primaryId: only.id, analyses: [only] });
        return;
      }

      const nextPrimaryId = id === primaryId ? remaining[0].id : primaryId;
      emitToParent({ version: "1.0", primaryId: nextPrimaryId, analyses: remaining });

      setExpandedIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        n.add(nextPrimaryId);
        return n;
      });
    },
    [analyses, emitToParent, primaryId]
  );

  const renameAnalysis = useCallback(
    (id, name) => {
      const next = analyses.map((a) => (a.id === id ? { ...a, name: safeName(name, a.name) } : a));
      emitToParent({ version: "1.0", primaryId, analyses: next });
    },
    [analyses, emitToParent, primaryId]
  );

  const setPrimary = useCallback(
    (id) => {
      if (!analyses.some((a) => a.id === id)) return;
      emitToParent({ version: "1.0", primaryId: id, analyses });
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    },
    [analyses, emitToParent]
  );

  const updateAnalysisValue = useCallback(
    (id, nextValFromForm) => {
      const nextAnalyses = analyses.map((a) =>
        a.id === id ? ensureAnalysisDefaults({ ...a, ...nextValFromForm, id: a.id, name: a.name }) : a
      );
      emitToParent({ version: "1.0", primaryId, analyses: nextAnalyses });
    },
    [analyses, emitToParent, primaryId]
  );

  // UI summary
  const enabledCount = useMemo(() => analyses.filter((a) => a.enabled === true).length, [analyses]);
  const validEnabledCount = useMemo(() => analyses.filter(isAnalysisValidForCorrelation).length, [analyses]);

  /* ----------------------- JSON editor (full object) ----------------------- */

  const [jsonText, setJsonText] = useState(() => safeJsonStringify(localState));
  const [jsonError, setJsonError] = useState(null);
  const [jsonValidatedAt, setJsonValidatedAt] = useState(null);

  // keep JSON editor updated from state unless user is currently in invalid JSON
  useEffect(() => {
    const parsed = tryParseJson(jsonText);
    if (!parsed.ok) return; // user is typing invalid JSON, do not overwrite
    setJsonText(safeJsonStringify(localState));
    setJsonError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localState]);

  const copyToClipboard = useCallback(async (txt) => {
    try {
      await navigator.clipboard.writeText(String(txt || ""));
    } catch {
      // ignore
    }
  }, []);

  const handleFormat = useCallback(() => {
    const parsed = tryParseJson(jsonText);
    if (!parsed.ok) {
      setJsonError(parsed.error);
      return;
    }
    setJsonText(safeJsonStringify(parsed.value));
    setJsonError(null);
  }, [jsonText]);

  const handleNormalize = useCallback(() => {
    const parsed = tryParseJson(jsonText);
    if (!parsed.ok) {
      setJsonError(parsed.error);
      return;
    }
    const normalized = normalizeCorrelationConfig(parsed.value);
    setJsonText(safeJsonStringify(normalized));
    setJsonError(null);
  }, [jsonText]);

  const handleValidateAndApply = useCallback(() => {
    const parsed = tryParseJson(jsonText);
    if (!parsed.ok) {
      setJsonError(parsed.error);
      return;
    }
    const normalized = normalizeCorrelationConfig(parsed.value);
    const v = validateCorrelationConfig(normalized);
    if (!v.ok) {
      setJsonError(v.message || "Invalid correlationConfig.");
      return;
    }

    setJsonError(null);
    setJsonValidatedAt(new Date().toISOString());
    emitToParent(normalized);

    // ensure UI expands primary
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(normalized.primaryId);
      return next;
    });
  }, [emitToParent, jsonText]);

  return (
    <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <SectionCard sx={{ padding: 0 }}>
        <ModeTabs value={mode} onChange={handleModeChange} tabs={tabs} />
      </SectionCard>

      {mode === "builder" && (
        <>
          <SectionCard>
            <FlexBox
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 0.5, flex: 1, minWidth: 260 }}>
                <Typography variant="body2" color="textSecondary">
                  Correlation/association is optional. Create multiple analyses with different column selections and parameters.
                  Mixed types are supported. The selected method applies only to numeric×numeric pairs.
                </Typography>

                <Typography variant="caption" color="textSecondary">
                  Enabled: {enabledCount} · Valid (≥2 cols): {validEnabledCount}
                </Typography>
              </FlexBox>

              <Button variant="contained" color="primary" onClick={addAnalysis}>
                Add correlation analysis
              </Button>
            </FlexBox>
          </SectionCard>

          {/* Analyses list */}
          <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {analyses.map((a, idx) => {
              const isPrimary = a.id === primaryId;
              const selectedCount = Array.isArray(a.columns) ? a.columns.length : 0;
              const methodLabel = a.method || "pearson";
              const isExpanded = expandedIds.has(a.id);
              const isValid = isAnalysisValidForCorrelation(a);

              return (
                <FlexBox
                  key={a.id}
                  sx={{
                    border: "1px solid rgba(0,0,0,0.10)",
                    borderRadius: 2,
                    padding: 1.5,
                    background: "white",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.25,
                  }}
                >
                  {/* Header */}
                  <FlexBox
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 260, flex: 1 }}>
                      <FlexBox sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          {`Analysis ${idx + 1}`}
                        </Typography>

                        {isPrimary && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 800,
                              padding: "3px 10px",
                              borderRadius: 999,
                              border: "1px solid rgba(0,0,0,0.15)",
                              background: "rgba(0,0,0,0.03)",
                            }}
                          >
                            Primary
                          </Typography>
                        )}

                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: 999,
                            border: "1px solid rgba(0,0,0,0.12)",
                            background: a.enabled ? "rgba(0,0,0,0.03)" : "rgba(0,0,0,0.01)",
                            opacity: a.enabled ? 1 : 0.65,
                          }}
                        >
                          {a.enabled ? "Enabled" : "Disabled"}
                        </Typography>

                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: 999,
                            border: "1px solid rgba(0,0,0,0.12)",
                            background: "rgba(0,0,0,0.02)",
                          }}
                        >
                          {selectedCount} cols · {String(methodLabel).toUpperCase()}
                        </Typography>

                        {a.enabled && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 800,
                              padding: "3px 10px",
                              borderRadius: 999,
                              border: "1px solid rgba(0,0,0,0.12)",
                              background: isValid ? "rgba(0,0,0,0.02)" : "rgba(0,0,0,0.01)",
                              opacity: isValid ? 1 : 0.65,
                            }}
                          >
                            {isValid ? "Valid" : "Needs ≥2 cols"}
                          </Typography>
                        )}
                      </FlexBox>

                      <input
                        value={a.name}
                        onChange={(e) => renameAnalysis(a.id, e.target.value)}
                        placeholder={`Correlation ${idx + 1}`}
                        style={{
                          marginTop: 6,
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid rgba(0,0,0,0.15)",
                          outline: "none",
                          fontSize: 13,
                        }}
                      />
                    </FlexBox>

                    <FlexBox sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                      <Button variant="outlined" color="inherit" onClick={() => toggleExpanded(a.id)}>
                        {isExpanded ? "Collapse" : "Expand"}
                      </Button>

                      {!isPrimary && (
                        <Button variant="outlined" color="inherit" onClick={() => setPrimary(a.id)}>
                          Set primary
                        </Button>
                      )}

                      <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => removeAnalysis(a.id)}
                        disabled={analyses.length === 1}
                      >
                        Remove
                      </Button>
                    </FlexBox>
                  </FlexBox>

                  {/* Form */}
                  {isExpanded && (
                    <CorrelationConfigForm
                      numericColumns={numericCols}
                      allColumns={allColumns}
                      columnTypes={columnTypes || {}}
                      value={{
                        enabled: a.enabled,
                        columns: a.columns,
                        method: a.method,
                        topK: a.topK,
                        minAbs: a.minAbs,
                        includeMatrix: a.includeMatrix,
                      }}
                      onChange={(nextVal) =>
                        updateAnalysisValue(a.id, {
                          ...a,
                          enabled: nextVal?.enabled === true,
                          columns: nextVal?.columns,
                          method: nextVal?.method,
                          topK: nextVal?.topK,
                          minAbs: nextVal?.minAbs,
                          includeMatrix: nextVal?.includeMatrix,
                        })
                      }
                      livePreprocessingConfig={livePreprocessingConfig}
                      preprocessingConfigEffective={preprocessingConfigEffective}
                      setPreprocessingConfigEffective={setPreprocessingConfigEffective}
                      validatePreprocessingConfig={validatePreprocessingConfig}
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
            })}
          </FlexBox>
        </>
      )}

      {mode === "json" && (
        <SectionCard>
          <FlexBox sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap", alignItems: "baseline" }}>
            <FlexBox sx={{ flexDirection: "column", gap: 0.25 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                correlationConfig (multi-run)
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Edit the full object used for upload. Use Normalize to repair missing fields. Validate applies it to the builder.
                {jsonValidatedAt ? ` Last applied: ${jsonValidatedAt}` : ""}
              </Typography>
            </FlexBox>

            <FlexBox sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button variant="outlined" color="inherit" onClick={handleFormat}>
                Format
              </Button>
              <Button variant="outlined" color="inherit" onClick={handleNormalize}>
                Normalize
              </Button>
              <Button variant="outlined" color="inherit" onClick={() => copyToClipboard(jsonText)}>
                Copy
              </Button>
              <Button variant="contained" color="primary" onClick={handleValidateAndApply}>
                Validate & Apply
              </Button>
            </FlexBox>
          </FlexBox>

          <FlexBox sx={{ mt: 1 }}>
            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                const parsed = tryParseJson(e.target.value);
                if (!parsed.ok) setJsonError(parsed.error);
                else setJsonError(null);
              }}
              style={{
                width: "100%",
                minHeight: 420,
                padding: 12,
                borderRadius: 12,
                border: `1px solid ${jsonError ? "rgba(211,47,47,0.55)" : "rgba(0,0,0,0.15)"}`,
                outline: "none",
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: 12,
                background: "white",
              }}
            />
          </FlexBox>

          {jsonError && (
            <Typography variant="caption" sx={{ mt: 1 }} color="error">
              {jsonError}
            </Typography>
          )}
        </SectionCard>
      )}
    </FlexBox>
  );
};

Step3CorrelationOrchestrator.propTypes = {
  columnTypes: PropTypes.object,
  correlationValue: PropTypes.object.isRequired,
  onCorrelationChange: PropTypes.func.isRequired,

  livePreprocessingConfig: PropTypes.object,
  preprocessingConfigEffective: PropTypes.object,
  setPreprocessingConfigEffective: PropTypes.func.isRequired,
  validatePreprocessingConfig: PropTypes.func.isRequired,

  useCustomConfig: PropTypes.bool.isRequired,
  setUseCustomConfig: PropTypes.func.isRequired,
  customConfigText: PropTypes.string.isRequired,
  setCustomConfigText: PropTypes.func.isRequired,
  setCustomConfigParsed: PropTypes.func.isRequired,
  customConfigError: PropTypes.string,
  setCustomConfigError: PropTypes.func.isRequired,
};

Step3CorrelationOrchestrator.defaultProps = {
  columnTypes: {},
  livePreprocessingConfig: null,
  preprocessingConfigEffective: null,
  customConfigError: null,
};

export default Step3CorrelationOrchestrator;
