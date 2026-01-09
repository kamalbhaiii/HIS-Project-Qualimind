// src/components/organisms/Step3CorrelationOrchestrator.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";

import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";
import Button from "../../atoms/CustomButton";
import CorrelationConfigForm from "../../molecules/CorrelationConfigForm";

/**
 * Step 3 Correlation Orchestrator
 *
 * Output contract (NEW, single-field, multi-run object):
 * correlationConfig = {
 *   version: "1.0",
 *   primaryId: string,
 *   analyses: [
 *     { id, name, enabled, columns, method, topK, minAbs, includeMatrix }
 *   ]
 * }
 *
 * Notes:
 * - UI source-of-truth is local analyses list; it does not collapse.
 * - Always emits the NEW correlationConfig object (even if only 1 analysis).
 * - Parent should send correlationConfig as-is to backend.
 */

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

function ensureAnalysisDefaults(a) {
  const base = isPlainObject(a) ? a : {};
  return {
    id: String(base.id || makeId()),
    name: safeName(base.name, "Correlation"),
    enabled: base.enabled === true,
    columns: Array.isArray(base.columns) ? base.columns.filter(Boolean) : [],
    method: base.method || "pearson",
    topK: Number.isFinite(Number(base.topK)) ? Number(base.topK) : 10,
    minAbs: Number.isFinite(Number(base.minAbs)) ? Number(base.minAbs) : 0.0,
    includeMatrix: base.includeMatrix !== false,
  };
}

/**
 * Normalize incoming correlationValue into local state:
 * localState = { analyses: [...], primaryId }
 *
 * Accepted incoming shapes:
 * - NEW: { version:"1.0", primaryId, analyses:[...] }
 * - LEGACY (still tolerated for hydration): { enabled, columns, method, ... }
 */
function normalizeFromProps(correlationValue) {
  // NEW multi-run object
  if (
    isPlainObject(correlationValue) &&
    String(correlationValue.version || "") === "1.0" &&
    Array.isArray(correlationValue.analyses)
  ) {
    const analyses = correlationValue.analyses.map((a, idx) => {
      const normalized = ensureAnalysisDefaults(a);
      return {
        ...normalized,
        name: safeName(normalized.name, `Correlation ${idx + 1}`),
      };
    });

    const primaryIdRaw = String(correlationValue.primaryId || "");
    const primaryId =
      primaryIdRaw && analyses.some((x) => x.id === primaryIdRaw) ? primaryIdRaw : analyses[0]?.id;

    return {
      analyses: analyses.length
        ? analyses
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
          ],
      primaryId: primaryId || analyses[0]?.id || "primary",
    };
  }

  // LEGACY single object (hydrate into one analysis)
  const legacy = isPlainObject(correlationValue) ? correlationValue : {};
  return {
    analyses: [
      ensureAnalysisDefaults({
        id: "primary",
        name: "Correlation 1",
        enabled: legacy.enabled === true,
        columns: legacy.columns,
        method: legacy.method,
        topK: legacy.topK,
        minAbs: legacy.minAbs,
        includeMatrix: legacy.includeMatrix,
      }),
    ],
    primaryId: "primary",
  };
}

/**
 * Build emitted correlationConfig object (single field) for parent/backend.
 * If NO analyses are enabled or no analysis has >=2 columns, caller can decide to send null.
 */
function buildCorrelationConfigPayload({ analyses, primaryId }) {
  return {
    version: "1.0",
    primaryId: String(primaryId || analyses?.[0]?.id || "primary"),
    analyses: analyses.map((a) => ({
      id: a.id,
      name: a.name,
      enabled: a.enabled === true,
      columns: Array.isArray(a.columns) ? a.columns.filter(Boolean) : [],
      method: a.method || "pearson",
      topK: Number.isFinite(Number(a.topK)) ? Number(a.topK) : 10,
      minAbs: Number.isFinite(Number(a.minAbs)) ? Number(a.minAbs) : 0.0,
      includeMatrix: a.includeMatrix !== false,
    })),
  };
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
  const numericCols = useMemo(() => {
    if (!columnTypes || typeof columnTypes !== "object") return [];
    return Object.entries(columnTypes)
      .filter(([, t]) => String(t).toLowerCase() === "numeric")
      .map(([col]) => col)
      .sort((a, b) => String(a).localeCompare(String(b)));
  }, [columnTypes]);

  // Local source-of-truth
  const [localState, setLocalState] = useState(() => normalizeFromProps(correlationValue));
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

  // Sync local state ONLY when incoming is NEW multi-run shape (e.g., hydrate/edit existing job)
  const lastSyncSigRef = useRef("");

  useEffect(() => {
    const isNewShape =
      isPlainObject(correlationValue) &&
      String(correlationValue.version || "") === "1.0" &&
      Array.isArray(correlationValue.analyses);

    if (!isNewShape) return;

    const sig = JSON.stringify({
      v: correlationValue.version,
      primaryId: correlationValue.primaryId,
      analyses: correlationValue.analyses.map((a) => ({
        id: a?.id,
        name: a?.name,
        enabled: a?.enabled,
        colCount: Array.isArray(a?.columns) ? a.columns.length : 0,
        method: a?.method,
      })),
    });

    if (sig === lastSyncSigRef.current) return;
    lastSyncSigRef.current = sig;

    setLocalState(normalizeFromProps(correlationValue));
  }, [correlationValue]);

  const emitToParent = useCallback(
    (nextAnalyses, nextPrimaryId) => {
      const payload = buildCorrelationConfigPayload({ analyses: nextAnalyses, primaryId: nextPrimaryId });

      setLocalState({ analyses: nextAnalyses, primaryId: nextPrimaryId });

      // Parent stores this and later sends it as correlationConfig in request body.
      onCorrelationChange(payload);
    },
    [onCorrelationChange]
  );

  const addAnalysis = useCallback(() => {
    const next = [
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
    ];
    emitToParent(next, primaryId);
  }, [analyses, emitToParent, primaryId]);

  const removeAnalysis = useCallback(
    (id) => {
      const next = analyses.filter((a) => a.id !== id);

      if (!next.length) {
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
        emitToParent([only], only.id);
        return;
      }

      const nextPrimaryId = id === primaryId ? next[0].id : primaryId;
      emitToParent(next, nextPrimaryId);

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
      emitToParent(next, primaryId);
    },
    [analyses, emitToParent, primaryId]
  );

  const setPrimary = useCallback(
    (id) => {
      if (!analyses.some((a) => a.id === id)) return;
      emitToParent(analyses, id);
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
      const next = analyses.map((a) =>
        a.id === id ? { ...a, ...ensureAnalysisDefaults({ ...a, ...nextValFromForm, id: a.id, name: a.name }) } : a
      );

      // ensureAnalysisDefaults returns a full object; we want to preserve id/name from header
      const repaired = next.map((a) => ({
        ...a,
        id: a.id,
        name: a.name,
      }));

      emitToParent(repaired, primaryId);
    },
    [analyses, emitToParent, primaryId]
  );

  // UI summary
  const enabledCount = useMemo(() => analyses.filter((a) => a.enabled === true).length, [analyses]);
  const validEnabledCount = useMemo(() => analyses.filter(isAnalysisValidForCorrelation).length, [analyses]);

  return (
    <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Intro / actions */}
      <FlexBox
        sx={{
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 2,
          padding: 1.5,
          background: "rgba(0,0,0,0.02)",
        }}
      >
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
              Correlation is optional. You can create multiple correlation analyses with different numeric-column
              selections and parameters. All analyses will be included in the upload request under a single
              correlationConfig object.
            </Typography>

            <Typography variant="caption" color="textSecondary">
              Enabled: {enabledCount} · Valid (≥2 cols): {validEnabledCount}
            </Typography>
          </FlexBox>

          <Button variant="contained" color="primary" onClick={addAnalysis}>
            Add correlation analysis
          </Button>
        </FlexBox>
      </FlexBox>

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
                  // CorrelationConfigForm expects the old single-config shape.
                  // We pass the analysis fields as the "value" object.
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
    </FlexBox>
  );
};

Step3CorrelationOrchestrator.propTypes = {
  columnTypes: PropTypes.object,

  // NEW: correlationValue is expected to be correlationConfig-like object, but legacy is tolerated
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
