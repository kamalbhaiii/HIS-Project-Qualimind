import React, { useMemo } from "react";
import PropTypes from "prop-types";

import SurfaceCard from "../../atoms/SurfaceCard";
import Typography from "../../atoms/CustomTypography";
import FlexBox from "../../atoms/FlexBox";
import StatusChip from "../../atoms/StatusChip";
import KeyValueItem from "../../molecules/KeyValueItem";

import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";

import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

function asArray(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (typeof x === "string") return [x];
  return [];
}

function humanizeStep(step) {
  const task = String(step?.task || "").toLowerCase();
  const method = String(step?.method || "").toLowerCase();

  if (task === "missing_values") {
    if (method === "numeric_median") return "Handle missing values (numeric median)";
    if (method === "numeric_mean") return "Handle missing values (numeric mean)";
    if (method === "numeric_constant") return "Handle missing values (numeric constant)";
    if (method === "categorical_mode") return "Handle missing values (categorical mode)";
    if (method === "categorical_unknown") return "Handle missing values (categorical unknown)";
    return `Handle missing values (${method || "unknown"})`;
  }

  if (task === "label_cleaning") return "Clean & standardize categorical labels";
  if (task === "scaling") {
    if (method === "zscore") return "Scale numeric features (z-score)";
    if (method === "minmax") return "Scale numeric features (min-max)";
    if (method === "none") return "Scale numeric features (none)";
    return `Scale numeric features (${method || "unknown"})`;
  }
  if (task === "reduce_cardinality") return "Reduce rare categories";
  if (task === "encoding") return "Encode categoricals (auto)";

  return `${task || "unknown task"}${method ? ` (${method})` : ""}`;
}

function normalizeColumnsFromAppliesTo(appliesTo) {
  const cols = appliesTo?.columns;
  if (Array.isArray(cols)) return cols.filter(Boolean).map(String);
  if (typeof cols === "string" && cols.trim()) return [cols.trim()];
  return [];
}

function normalizeTypesFromAppliesTo(appliesTo) {
  const types = appliesTo?.types;
  if (Array.isArray(types)) return types.filter(Boolean).map((t) => String(t).toLowerCase());
  return [];
}

function buildRequestedPlan(preprocessingConfig) {
  const steps = preprocessingConfig?.steps;
  if (!Array.isArray(steps) || steps.length === 0) return { ordered: [], byColumn: {} };

  const ordered = steps.map((s, idx) => {
    const appliesTo = s?.appliesTo || {};
    const columns = normalizeColumnsFromAppliesTo(appliesTo);
    const types = normalizeTypesFromAppliesTo(appliesTo);
    const params = s?.params || null;

    return {
      idx: idx + 1,
      label: humanizeStep(s),
      rawTask: s?.task,
      rawMethod: s?.method,
      columns,
      types,
      params,
    };
  });

  const byColumn = {};
  ordered.forEach((st) => {
    if (st.columns.length > 0) {
      st.columns.forEach((c) => {
        if (!byColumn[c]) byColumn[c] = [];
        byColumn[c].push(st);
      });
    } else {
      const key = st.types.length ? `types:${st.types.join("+")}` : "global";
      if (!byColumn[key]) byColumn[key] = [];
      byColumn[key].push(st);
    }
  });

  return { ordered, byColumn };
}

const DatasetMetaPanel = ({ dataset, requestedPreprocessingConfig, executedSteps }) => {
  const safeNumber = (value) => (typeof value === "number" ? value.toLocaleString() : "—");
  const safeValue = (value) => (value !== null && value !== undefined && value !== "" ? value : "—");

  if (!dataset) return null;

  const requestedTasksLegacy = Array.isArray(dataset.preprocessingTasks)
    ? dataset.preprocessingTasks.join(", ")
    : "—";

  const requestedPlan = useMemo(() => buildRequestedPlan(requestedPreprocessingConfig), [requestedPreprocessingConfig]);
  const hasRequestedConfig = requestedPlan.ordered.length > 0;

  // Collapsible summary chips
  const requestedSummary = useMemo(() => {
    if (!hasRequestedConfig) return { steps: 0, groups: 0, cols: 0 };
    const groups = Object.keys(requestedPlan.byColumn || {}).length;
    const explicitCols = Object.keys(requestedPlan.byColumn || {}).filter((k) => !k.startsWith("types:") && k !== "global").length;
    return { steps: requestedPlan.ordered.length, groups, cols: explicitCols };
  }, [hasRequestedConfig, requestedPlan]);

  return (
    <SurfaceCard
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
        minWidth: 0,
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      {/* Responsive header: name + status */}
      <FlexBox
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          mb: 2,
          gap: 1.5,
          minWidth: 0,
          flexDirection: { xs: "column", sm: "row" },
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            minWidth: 0,
            width: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={safeValue(dataset.name)}
        >
          {safeValue(dataset.name)}
        </Typography>

        <Box
          sx={{
            flex: "0 0 auto",
            width: { xs: "100%", sm: "auto" },
            display: "flex",
            justifyContent: { xs: "flex-start", sm: "flex-end" },
          }}
        >
          {dataset.lastJobStatus ? (
            <StatusChip status={dataset.lastJobStatus} />
          ) : (
            <Typography variant="caption" color="textSecondary">
              No jobs yet
            </Typography>
          )}
        </Box>
      </FlexBox>

      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Dataset metadata and preprocessing overview.
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <KeyValueItem label="Size" value={safeValue(dataset.size)} />
        </Grid>

        <Grid item xs={12} md={6}>
          <KeyValueItem label="Uploaded at" value={safeValue(dataset.uploadedAt)} />
        </Grid>

        <Grid item xs={12} md={6}>
          <KeyValueItem label="Total rows" value={safeNumber(dataset.totalRows)} />
        </Grid>

        <Grid item xs={12} md={6}>
          <KeyValueItem label="Total columns" value={safeNumber(dataset.totalColumns)} />
        </Grid>

        <Grid item xs={12} md={6}>
          <KeyValueItem label="Categorical features" value={safeNumber(dataset.categoricalColumns)} />
        </Grid>

        <Grid item xs={12} md={6}>
          <KeyValueItem label="Numeric features" value={safeNumber(dataset.numericColumns)} />
        </Grid>

        <Grid item xs={12} md={6}>
          <KeyValueItem label="Last job ID" value={safeValue(dataset.lastJobId)} />
        </Grid>

        <Grid item xs={12} md={6}>
          <KeyValueItem label="Last processed at" value={safeValue(dataset.lastProcessedAt)} />
        </Grid>

        <Grid item xs={12}>
          <KeyValueItem label="Requested tasks (legacy)" value={requestedTasksLegacy || "—"} />
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Requested preprocessing (COLLAPSIBLE) */}
      <Accordion
        defaultExpanded={false}
        disableGutters
        sx={{
          "&:before": { display: "none" },
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 2,
          overflow: "hidden",
          background: "rgba(0,0,0,0.02)",
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <FlexBox sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, width: "100%" }}>
            <FlexBox sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Requested preprocessing
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Human-readable plan based on the config sent for the latest job.
              </Typography>
            </FlexBox>

            <FlexBox sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Chip size="small" label={`${requestedSummary.steps} steps`} />
              <Chip size="small" variant="outlined" label={`${requestedSummary.groups} groups`} />
              <Chip size="small" variant="outlined" label={`${requestedSummary.cols} cols`} />
            </FlexBox>
          </FlexBox>
        </AccordionSummary>

        <AccordionDetails>
          {!hasRequestedConfig ? (
            <Typography variant="body2" color="textSecondary">
              No preprocessing config was provided for this job.
            </Typography>
          ) : (
            <FlexBox sx={{ flexDirection: "column", gap: 1.25 }}>
              {/* Column-centric summary */}
              <FlexBox sx={{ flexDirection: "column", gap: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  By column
                </Typography>

                <FlexBox sx={{ flexDirection: "column", gap: 1 }}>
                  {Object.entries(requestedPlan.byColumn).map(([col, items]) => (
                    <FlexBox
                      key={col}
                      sx={{
                        border: "1px solid rgba(0,0,0,0.08)",
                        borderRadius: 2,
                        p: 1.25,
                        background: "rgba(255,255,255,0.6)",
                        flexDirection: "column",
                        gap: 0.75,
                      }}
                    >
                      <FlexBox sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {col}
                        </Typography>
                        <Chip size="small" label={`${items.length} step${items.length === 1 ? "" : "s"}`} />
                      </FlexBox>

                      <FlexBox sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                        {items.map((it) => (
                          <Chip key={`${col}-${it.idx}-${it.label}`} size="small" variant="outlined" label={it.label} />
                        ))}
                      </FlexBox>
                    </FlexBox>
                  ))}
                </FlexBox>
              </FlexBox>

              {/* Ordered steps */}
              <FlexBox sx={{ flexDirection: "column", gap: 0.75, mt: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  In execution order
                </Typography>

                <FlexBox sx={{ flexDirection: "column", gap: 0.5 }}>
                  {requestedPlan.ordered.map((st) => (
                    <Typography key={st.idx} variant="body2" color="textSecondary">
                      <strong>Step {st.idx}:</strong> {st.label}
                      {st.columns?.length ? ` • columns: ${st.columns.join(", ")}` : ""}
                      {st.types?.length ? ` • types: ${st.types.join(", ")}` : ""}
                    </Typography>
                  ))}
                </FlexBox>
              </FlexBox>
            </FlexBox>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Executed steps (from metadata) */}
      {Array.isArray(executedSteps) && executedSteps.length > 0 && (
        <FlexBox sx={{ flexDirection: "column", gap: 0.5, mt: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Executed steps
          </Typography>
          <FlexBox sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {executedSteps.slice(0, 24).map((s, idx) => (
              <Chip key={`${s}-${idx}`} size="small" label={String(s)} />
            ))}
            {executedSteps.length > 24 && <Chip size="small" variant="outlined" label={`+${executedSteps.length - 24} more`} />}
          </FlexBox>
        </FlexBox>
      )}
    </SurfaceCard>
  );
};

DatasetMetaPanel.propTypes = {
  dataset: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    size: PropTypes.string,
    uploadedAt: PropTypes.string,
    totalRows: PropTypes.number,
    totalColumns: PropTypes.number,
    categoricalColumns: PropTypes.number,
    numericColumns: PropTypes.number,
    lastJobStatus: PropTypes.oneOf(["PENDING", "RUNNING", "SUCCESS", "FAILED", null]),
    lastJobId: PropTypes.string,
    lastProcessedAt: PropTypes.string,
    preprocessingTasks: PropTypes.arrayOf(PropTypes.string),
  }),
  requestedPreprocessingConfig: PropTypes.object,
  executedSteps: PropTypes.arrayOf(PropTypes.string),
};

DatasetMetaPanel.defaultProps = {
  requestedPreprocessingConfig: null,
  executedSteps: [],
};

export default DatasetMetaPanel;
