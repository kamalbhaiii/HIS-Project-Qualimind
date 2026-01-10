// src/components/molecules/CorrelationConfigForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";

import Box from "@mui/material/Box";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Divider from "@mui/material/Divider";
import Autocomplete from "@mui/material/Autocomplete";
import Tooltip from "@mui/material/Tooltip";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";

import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";
import Button from "../../atoms/CustomButton";

const asArray = (v) => (Array.isArray(v) ? v : []);

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

function normalizeBoolean(x, def = false) {
  if (x === true) return true;
  if (x === false) return false;
  return def;
}

function normalizeNumber(x, def) {
  const n = Number(x);
  return Number.isFinite(n) ? n : def;
}

function clamp(n, lo, hi) {
  if (!Number.isFinite(n)) return n;
  return Math.max(lo, Math.min(hi, n));
}

function typeLabelOf(t) {
  const v = String(t || "").toLowerCase();
  if (v === "numeric" || v === "number") return "numeric";
  if (v === "categorical" || v === "category" || v === "factor" || v === "string") return "categorical";
  if (v === "boolean" || v === "logical") return "categorical";
  return v || "unknown";
}

function typeChipSx(type) {
  const base = {
    fontWeight: 800,
    height: 20,
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(0,0,0,0.02)",
  };
  if (type === "numeric") return { ...base, background: "rgba(0,0,0,0.03)" };
  if (type === "categorical") return { ...base, background: "rgba(0,0,0,0.02)" };
  return base;
}

/**
 * CorrelationConfigForm
 * - Tab 1: form (enabled, method, columns, topK, minAbs, includeMatrix)
 * - Tab 2: Config Editor
 *   - PreprocessingConfig Editor (shared state with Step-2)
 *   - CorrelationConfig JSON editor (bi-directional with the form)
 */
const CorrelationConfigForm = ({
  numericColumns,
  allColumns,
  columnTypes,

  value,
  onChange,

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
  const safeNumericCols = useMemo(() => asArray(numericColumns), [numericColumns]);
  const safeAllCols = useMemo(() => {
    const cols = asArray(allColumns);
    if (cols.length) return cols;
    return safeNumericCols;
  }, [allColumns, safeNumericCols]);

  const categoricalCols = useMemo(() => {
    if (!columnTypes || typeof columnTypes !== "object") return [];
    return Object.entries(columnTypes)
      .filter(([, t]) => typeLabelOf(t) !== "numeric")
      .map(([c]) => String(c))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [columnTypes]);

  const [tab, setTab] = useState(0);

  // JSON editor for correlation (bi-directional)
  const [corrEditorText, setCorrEditorText] = useState(() => safeJsonStringify(value));
  const [corrEditorError, setCorrEditorError] = useState(null);

  // Keep editor synced when value changes (only if editor content is valid JSON)
  useEffect(() => {
    const parsed = tryParseJson(corrEditorText);
    if (parsed.ok) {
      setCorrEditorText(safeJsonStringify(value));
      setCorrEditorError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const updateCorrelation = (patch) => {
    onChange({ ...value, ...patch });
  };

  const enabled = !!value.enabled;
  const selectedColumns = useMemo(
    () => (Array.isArray(value.columns) ? value.columns.filter(Boolean) : []),
    [value.columns]
  );
  const selectedCount = selectedColumns.length;
  const hasMinCols = selectedCount >= 2;

  const validationHint = useMemo(() => {
    if (!enabled) return null;
    if (!hasMinCols) return "Select at least 2 columns to run an analysis.";
    return null;
  }, [enabled, hasMinCols]);

  // Shared preprocessing config editor wiring
  useEffect(() => {
    if (!useCustomConfig) {
      setCustomConfigText(safeJsonStringify(livePreprocessingConfig));
      setCustomConfigError(null);
      setCustomConfigParsed(null);
      setPreprocessingConfigEffective(livePreprocessingConfig);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCustomConfig, livePreprocessingConfig]);

  const handlePreprocessingEditorChange = (txt) => {
    setCustomConfigText(txt);

    const parsed = tryParseJson(txt);
    if (!parsed.ok) {
      setCustomConfigError(parsed.error);
      setCustomConfigParsed(null);
      return;
    }

    const v = validatePreprocessingConfig(parsed.value);
    if (!v.ok) {
      setCustomConfigError(v.message || "Invalid preprocessingConfig.");
      setCustomConfigParsed(null);
      return;
    }

    setCustomConfigError(null);
    setCustomConfigParsed(parsed.value);
    setPreprocessingConfigEffective(parsed.value);
  };

  const handleToggleCustomPreprocessing = (checked) => {
    setUseCustomConfig(checked);

    if (!checked) {
      setCustomConfigText(safeJsonStringify(livePreprocessingConfig));
      setCustomConfigError(null);
      setCustomConfigParsed(null);
      setPreprocessingConfigEffective(livePreprocessingConfig);
      return;
    }

    setCustomConfigText(safeJsonStringify(preprocessingConfigEffective ?? livePreprocessingConfig));
    setCustomConfigError(null);

    const parsed = tryParseJson(safeJsonStringify(preprocessingConfigEffective ?? livePreprocessingConfig));
    if (parsed.ok) setCustomConfigParsed(parsed.value);
  };

  // Correlation JSON editor: parse -> normalize -> onChange
  const handleCorrEditorChange = (txt) => {
    setCorrEditorText(txt);
    const parsed = tryParseJson(txt);

    if (!parsed.ok) {
      setCorrEditorError(parsed.error);
      return;
    }

    const cfg = parsed.value;
    const obj = cfg && typeof cfg === "object" && !Array.isArray(cfg) ? cfg : {};

    const normalized = {
      enabled: normalizeBoolean(obj.enabled, false),
      columns: Array.isArray(obj.columns) ? obj.columns.filter(Boolean).map(String) : [],
      method: normalizeMethod(obj.method),
      topK: clamp(normalizeNumber(obj.topK, 10), 1, 200),
      minAbs: clamp(normalizeNumber(obj.minAbs, 0), 0, 1),
      includeMatrix: normalizeBoolean(obj.includeMatrix, true),
    };

    setCorrEditorError(null);
    onChange(normalized);
  };

  const handleFormatCorrJson = () => {
    const parsed = tryParseJson(corrEditorText);
    if (!parsed.ok) {
      setCorrEditorError(parsed.error);
      return;
    }
    setCorrEditorError(null);
    setCorrEditorText(safeJsonStringify(parsed.value));
  };

  const handleCopy = async (txt) => {
    try {
      await navigator.clipboard.writeText(txt || "");
    } catch {
      // ignore
    }
  };

  const sectionCardSx = {
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 2,
    padding: 1.5,
    background: "rgba(0,0,0,0.02)",
  };

  const editorSx = {
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 1.45,
  };

  const compactRowSx = {
    display: "grid",
    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
    gap: 2,
    mt: 0.25,
  };

  const renderColumnOption = (props, option) => {
    const t = typeLabelOf(columnTypes?.[option]);
    return (
      <li {...props} key={option}>
        <FlexBox sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 1 }}>
          <Typography variant="body2" sx={{ fontSize: 13 }}>
            {option}
          </Typography>
          <Chip size="small" label={t} sx={typeChipSx(t)} />
        </FlexBox>
      </li>
    );
  };

  const renderSelectedTags = (tagValue, getTagProps) => (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
      {tagValue.map((option, index) => {
        const t = typeLabelOf(columnTypes?.[option]);
        return (
          <Chip
            {...getTagProps({ index })}
            key={option}
            size="small"
            label={`${option}${t && t !== "unknown" ? ` · ${t}` : ""}`}
            sx={{
              borderRadius: 999,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "rgba(0,0,0,0.02)",
              fontWeight: 700,
            }}
          />
        );
      })}
    </Box>
  );

  const setColumns = (cols) => updateCorrelation({ columns: cols });
  const handleSelectAll = () => setColumns(safeAllCols);
  const handleClear = () => setColumns([]);
  const handleSelectNumericOnly = () => setColumns(safeNumericCols);
  const handleSelectCategoricalOnly = () => setColumns(categoricalCols);

  return (
    <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 40 }}>
        <Tab label="Form" sx={{ minHeight: 40 }} />
        <Tab label="Config Editor" sx={{ minHeight: 40 }} />
      </Tabs>

      {tab === 0 && (
        <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <FlexBox sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
            <FormControlLabel
              control={<Switch checked={enabled} onChange={(e) => updateCorrelation({ enabled: e.target.checked })} />}
              label="Enable correlation / association analysis"
            />

            <Typography variant="caption" color="textSecondary">
              Selected: {selectedCount} column{selectedCount === 1 ? "" : "s"}
            </Typography>
          </FlexBox>

          <Typography variant="body2" color="textSecondary">
            Associations are computed pairwise across the selected columns. Numeric×numeric uses Pearson/Spearman/Kendall.
            Numeric×categorical and categorical×categorical use appropriate association metrics automatically.
          </Typography>

          <Box sx={compactRowSx}>
            <TextField
              select
              label="Numeric method"
              size="small"
              value={normalizeMethod(value.method || "pearson")}
              onChange={(e) => updateCorrelation({ method: e.target.value })}
              disabled={!enabled}
              fullWidth
              helperText="Applies only to numeric×numeric pairs."
            >
              <MenuItem value="pearson">Pearson</MenuItem>
              <MenuItem value="spearman">Spearman</MenuItem>
              <MenuItem value="kendall">Kendall</MenuItem>
            </TextField>

            <TextField
              label="Top K pairs"
              size="small"
              type="number"
              value={value.topK ?? 10}
              onChange={(e) => updateCorrelation({ topK: e.target.value })}
              disabled={!enabled}
              fullWidth
              inputProps={{ min: 1, max: 200 }}
              helperText="Number of strongest pairs to return."
            />

            <TextField
              label="Min strength threshold"
              size="small"
              type="number"
              value={value.minAbs ?? 0}
              onChange={(e) => updateCorrelation({ minAbs: e.target.value })}
              disabled={!enabled}
              fullWidth
              inputProps={{ min: 0, max: 1, step: 0.05 }}
              helperText="Filter weak associations (0.0–1.0)."
            />

            <FormControlLabel
              control={
                <Switch
                  checked={value.includeMatrix !== false}
                  onChange={(e) => updateCorrelation({ includeMatrix: e.target.checked })}
                  disabled={!enabled}
                />
              }
              label={
                <Tooltip title="Matrix is returned only for numeric columns (numeric-only correlation matrix).">
                  <span>Include numeric matrix</span>
                </Tooltip>
              }
            />
          </Box>

          {/* Column picker */}
          <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <FlexBox sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Columns
              </Typography>

              <FlexBox sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button variant="outlined" color="inherit" size="small" onClick={handleSelectAll} disabled={!enabled || !safeAllCols.length}>
                  Select all
                </Button>
                <Button variant="outlined" color="inherit" size="small" onClick={handleClear} disabled={!enabled}>
                  Clear
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  onClick={handleSelectNumericOnly}
                  disabled={!enabled || !safeNumericCols.length}
                >
                  Numeric only
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  onClick={handleSelectCategoricalOnly}
                  disabled={!enabled || !categoricalCols.length}
                >
                  Categorical only
                </Button>
              </FlexBox>
            </FlexBox>

            <Autocomplete
              multiple
              disableCloseOnSelect
              options={safeAllCols}
              value={selectedColumns}
              onChange={(_, next) => updateCorrelation({ columns: Array.isArray(next) ? next : [] })}
              disabled={!enabled}
              renderOption={renderColumnOption}
              renderTags={renderSelectedTags}
              filterSelectedOptions={false}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search & select columns"
                  size="small"
                  placeholder={enabled ? "Type to filter columns..." : "Enable analysis to select columns"}
                  helperText={
                    validationHint
                      ? validationHint
                      : safeAllCols.length
                      ? "Tip: You can mix numeric and categorical columns."
                      : "No columns detected."
                  }
                  error={!!validationHint}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start" sx={{ mr: 0.5, color: "rgba(0,0,0,0.55)" }}>
                          {" "}
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            <Typography variant="caption" color="textSecondary">
              Backend will skip gracefully if fewer than two columns are selected or if columns are unusable (e.g., constant).
            </Typography>
          </FlexBox>
        </FlexBox>
      )}

      {tab === 1 && (
        <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Preprocessing config (shared) */}
          <FlexBox sx={sectionCardSx}>
            <FlexBox sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
              <FlexBox sx={{ flexDirection: "column", gap: 0.25 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Preprocessing Config (shared with Step 2)
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Turn on Custom to override the live config. This editor is shared across Step 2 and Step 3.
                </Typography>
              </FlexBox>

              <FormControlLabel
                control={<Switch checked={!!useCustomConfig} onChange={(e) => handleToggleCustomPreprocessing(e.target.checked)} />}
                label="Custom"
              />
            </FlexBox>

            <Divider sx={{ my: 1.5 }} />

            <TextField
              value={customConfigText || ""}
              onChange={(e) => handlePreprocessingEditorChange(e.target.value)}
              placeholder='{"version":"1.0","steps":[...]}'
              multiline
              minRows={10}
              fullWidth
              sx={{ mt: 0.5 }}
              inputProps={{ style: editorSx }}
              error={!!customConfigError}
              helperText={
                customConfigError
                  ? `Invalid preprocessingConfig: ${customConfigError}`
                  : useCustomConfig
                  ? "Custom preprocessingConfig is active."
                  : "Live preprocessingConfig (auto-generated) is active."
              }
            />
          </FlexBox>

          {/* Correlation config JSON editor */}
          <FlexBox sx={sectionCardSx}>
            <FlexBox sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
              <FlexBox sx={{ flexDirection: "column", gap: 0.25 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Correlation Config (this analysis)
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Editing JSON updates the form immediately. Changing the form updates this JSON.
                </Typography>
              </FlexBox>

              <FlexBox sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                <Tooltip title="Format JSON">
                  <span>
                    <IconButton size="small" onClick={handleFormatCorrJson}>
                      <AutoFixHighIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Copy JSON">
                  <span>
                    <IconButton size="small" onClick={() => handleCopy(corrEditorText)}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </FlexBox>
            </FlexBox>

            <Divider sx={{ my: 1.5 }} />

            <TextField
              value={corrEditorText}
              onChange={(e) => handleCorrEditorChange(e.target.value)}
              multiline
              minRows={10}
              fullWidth
              inputProps={{ style: editorSx }}
              error={!!corrEditorError}
              helperText={corrEditorError ? `Invalid correlationConfig: ${corrEditorError}` : "Valid correlationConfig JSON."}
            />

            {enabled && !hasMinCols ? (
              <Alert severity="warning" variant="outlined" sx={{ mt: 1.25 }}>
                Enabled analyses should select at least 2 columns to run.
              </Alert>
            ) : null}
          </FlexBox>
        </FlexBox>
      )}
    </FlexBox>
  );
};

CorrelationConfigForm.propTypes = {
  numericColumns: PropTypes.arrayOf(PropTypes.string),
  allColumns: PropTypes.arrayOf(PropTypes.string),
  columnTypes: PropTypes.object,

  value: PropTypes.shape({
    enabled: PropTypes.bool,
    columns: PropTypes.arrayOf(PropTypes.string),
    method: PropTypes.oneOf(["pearson", "spearman", "kendall"]),
    topK: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    minAbs: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    includeMatrix: PropTypes.bool,
  }).isRequired,
  onChange: PropTypes.func.isRequired,

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

CorrelationConfigForm.defaultProps = {
  numericColumns: [],
  allColumns: [],
  columnTypes: {},
  livePreprocessingConfig: null,
  preprocessingConfigEffective: null,
  customConfigError: null,
};

export default CorrelationConfigForm;
