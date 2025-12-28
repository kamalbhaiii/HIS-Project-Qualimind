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

import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";

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

/**
 * CorrelationConfigForm
 * - Tab 1: correlation form (enabled, method, columns, topK, minAbs, includeMatrix)
 * - Tab 2: Config Editor
 *   - PreprocessingConfig Editor (shared state with Step-2)
 *   - CorrelationConfig JSON editor (bi-directional with the form)
 */
const CorrelationConfigForm = ({
  numericColumns,

  // correlation form state
  value,
  onChange,

  // --- shared preprocessing config editor state (from DatasetUploadWizard) ---
  livePreprocessingConfig,           // the current live-generated config object
  preprocessingConfigEffective,      // the current effective config object (live OR custom)
  setPreprocessingConfigEffective,   // setter for effective config object (used mainly when custom parsed is valid)

  validatePreprocessingConfig,       // same validator you use in Step-2

  useCustomConfig,
  setUseCustomConfig,
  customConfigText,
  setCustomConfigText,
  setCustomConfigParsed,
  customConfigError,
  setCustomConfigError,
}) => {
  const safeNumericCols = useMemo(() => asArray(numericColumns), [numericColumns]);

  // Tabs: 0 = Form, 1 = Config Editor
  const [tab, setTab] = useState(0);

  // -------- Correlation JSON editor (bi-directional) --------
  const [corrEditorText, setCorrEditorText] = useState(() => safeJsonStringify(value));
  const [corrEditorError, setCorrEditorError] = useState(null);

  // Keep JSON editor in sync with form changes,
  // but only if user is not currently typing invalid JSON.
  useEffect(() => {
    // If current editor text parses OK, we can safely overwrite it from form changes.
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

  // -------- Preprocessing config editor wiring (shared with Step-2) --------

  // When Step-2 changes live config, keep the editor showing it ONLY if not in custom mode.
  useEffect(() => {
    if (!useCustomConfig) {
      // reflect live config in the editor text
      setCustomConfigText(safeJsonStringify(livePreprocessingConfig));
      setCustomConfigError(null);
      setCustomConfigParsed(null);
      // effective config should be live
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

    // validate against your existing schema rules
    const v = validatePreprocessingConfig(parsed.value);
    if (!v.ok) {
      setCustomConfigError(v.message || "Invalid preprocessingConfig.");
      setCustomConfigParsed(null);
      return;
    }

    // valid custom config
    setCustomConfigError(null);
    setCustomConfigParsed(parsed.value);
    setPreprocessingConfigEffective(parsed.value);
  };

  const handleToggleCustomPreprocessing = (checked) => {
    setUseCustomConfig(checked);

    if (!checked) {
      // revert back to live
      setCustomConfigText(safeJsonStringify(livePreprocessingConfig));
      setCustomConfigError(null);
      setCustomConfigParsed(null);
      setPreprocessingConfigEffective(livePreprocessingConfig);
    } else {
      // enable custom: seed editor with current effective config (usually live at this point)
      setCustomConfigText(safeJsonStringify(preprocessingConfigEffective ?? livePreprocessingConfig));
      setCustomConfigError(null);
      // parsed will be set on first edit or we can parse immediately:
      const parsed = tryParseJson(safeJsonStringify(preprocessingConfigEffective ?? livePreprocessingConfig));
      if (parsed.ok) setCustomConfigParsed(parsed.value);
    }
  };

  // -------- Correlation JSON editor logic --------
  const handleCorrEditorChange = (txt) => {
    setCorrEditorText(txt);
    const parsed = tryParseJson(txt);

    if (!parsed.ok) {
      setCorrEditorError(parsed.error);
      return;
    }

    // basic schema normalization: we accept partial but coerce expected fields
    const cfg = parsed.value || {};
    const normalized = {
      enabled: !!cfg.enabled,
      columns: Array.isArray(cfg.columns) ? cfg.columns : [],
      method: cfg.method === "spearman" ? "spearman" : "pearson",
      topK: Number.isFinite(Number(cfg.topK)) ? Number(cfg.topK) : 10,
      minAbs: Number.isFinite(Number(cfg.minAbs)) ? Number(cfg.minAbs) : 0,
      includeMatrix: cfg.includeMatrix !== false,
    };

    setCorrEditorError(null);
    onChange(normalized);
  };

  // UI helpers
  const sectionCardSx = {
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 2,
    padding: 1.5,
    background: "rgba(0,0,0,0.02)",
  };

  const editorSx = {
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 1.4,
  };

  return (
    <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 40 }}>
        <Tab label="Form" sx={{ minHeight: 40 }} />
        <Tab label="Config Editor" sx={{ minHeight: 40 }} />
      </Tabs>

      {tab === 0 && (
        <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <FormControlLabel
            control={
              <Switch
                checked={enabled}
                onChange={(e) => updateCorrelation({ enabled: e.target.checked })}
              />
            }
            label="Enable correlation analysis"
          />

          <Typography variant="body2" color="textSecondary">
            Correlation is computed pairwise between the selected numeric variables. If fewer than two
            numeric columns are selected, correlation will be skipped automatically by the backend.
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
              mt: 0.5,
            }}
          >
            <TextField
              select
              label="Method"
              size="small"
              value={value.method || "pearson"}
              onChange={(e) => updateCorrelation({ method: e.target.value })}
              disabled={!enabled}
              fullWidth
            >
              <MenuItem value="pearson">Pearson</MenuItem>
              <MenuItem value="spearman">Spearman</MenuItem>
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
              label="Min |r| threshold"
              size="small"
              type="number"
              value={value.minAbs ?? 0}
              onChange={(e) => updateCorrelation({ minAbs: e.target.value })}
              disabled={!enabled}
              fullWidth
              inputProps={{ min: 0, max: 1, step: 0.05 }}
              helperText="Filter weak correlations (0.0–1.0)."
            />

            <FormControlLabel
              control={
                <Switch
                  checked={value.includeMatrix !== false}
                  onChange={(e) => updateCorrelation({ includeMatrix: e.target.checked })}
                  disabled={!enabled}
                />
              }
              label="Include correlation matrix"
            />
          </Box>

          <TextField
            select
            label="Columns"
            size="small"
            disabled={!enabled}
            fullWidth
            SelectProps={{
              multiple: true,
              value: Array.isArray(value.columns) ? value.columns : [],
              onChange: (e) => updateCorrelation({ columns: e.target.value }),
              renderValue: (selected) => (
                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                  {selected.map((s) => (
                    <Chip key={s} size="small" label={s} />
                  ))}
                </Box>
              ),
            }}
            helperText={
              safeNumericCols.length
                ? "Select at least two numeric variables."
                : "No numeric columns detected in the selected dataset."
            }
          >
            {safeNumericCols.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
        </FlexBox>
      )}

      {tab === 1 && (
        <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* --- Preprocessing Config Editor (shared with Step-2) --- */}
          <FlexBox sx={sectionCardSx}>
            <FlexBox sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
              <FlexBox sx={{ flexDirection: "column", gap: 0.25 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Preprocessing Config (shared with Step 2)
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Editing here updates Step-2 instantly (and vice-versa). Turn on Custom to override the live config.
                </Typography>
              </FlexBox>

              <FormControlLabel
                control={
                  <Switch
                    checked={!!useCustomConfig}
                    onChange={(e) => handleToggleCustomPreprocessing(e.target.checked)}
                  />
                }
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

          {/* --- Correlation Config Editor (bi-directional with the form) --- */}
          <FlexBox sx={sectionCardSx}>
            <FlexBox sx={{ flexDirection: "column", gap: 0.25 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Correlation Config
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Editing this JSON updates the correlation form immediately. Changing the form updates this JSON.
              </Typography>
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
          </FlexBox>
        </FlexBox>
      )}
    </FlexBox>
  );
};

CorrelationConfigForm.propTypes = {
  numericColumns: PropTypes.arrayOf(PropTypes.string),

  value: PropTypes.shape({
    enabled: PropTypes.bool,
    columns: PropTypes.arrayOf(PropTypes.string),
    method: PropTypes.oneOf(["pearson", "spearman"]),
    topK: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    minAbs: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    includeMatrix: PropTypes.bool,
  }).isRequired,
  onChange: PropTypes.func.isRequired,

  // shared preprocessing config editor state
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
  livePreprocessingConfig: null,
  preprocessingConfigEffective: null,
  customConfigError: null,
};

export default CorrelationConfigForm;
