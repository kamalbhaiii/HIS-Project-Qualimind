// src/components/molecules/CorrelationConfigForm.jsx
import React, { useMemo, useState, useCallback } from "react";
import PropTypes from "prop-types";

import Box from "@mui/material/Box";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Autocomplete from "@mui/material/Autocomplete";
import Tooltip from "@mui/material/Tooltip";

import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";
import Button from "../../atoms/CustomButton";

const asArray = (v) => (Array.isArray(v) ? v : []);

function normalizeMethod(m) {
  const v = String(m || "").toLowerCase().trim();
  if (v === "spearman") return "spearman";
  if (v === "kendall") return "kendall";
  return "pearson";
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

/* ---------------------- range helpers (Step2-like) ---------------------- */
const uniq = (arr) => Array.from(new Set(arr));

/**
 * Parse ranges like:
 * - "1-5" => [1,2,3,4,5]
 * - "1-3, 7, 10-12" => [...]
 * - "3" => [3]
 * Invalid tokens are ignored.
 */
function parseNumberRanges(text) {
  const raw = String(text ?? "").trim();
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
    if (/^\d+$/.test(part)) nums.push(Number(part));
  }

  return uniq(nums).filter((n) => Number.isFinite(n) && n > 0);
}

function buildIndexToColMap(columns) {
  const map = {};
  (Array.isArray(columns) ? columns : []).forEach((c, idx) => {
    map[idx + 1] = c;
  });
  return map;
}

function validateRange(rangeText, indexToCol) {
  const nums = parseNumberRanges(rangeText);
  if (!nums.length) {
    return { ok: false, message: "Enter a range like 1-5 or 1-3, 7, 10-12." };
  }
  const validCols = nums.map((n) => indexToCol[n]).filter(Boolean);
  if (!validCols.length) {
    return { ok: false, message: "No valid indices matched. Check the numbering of the column list." };
  }
  const unknown = nums.filter((n) => !indexToCol[n]);
  if (unknown.length) {
    return {
      ok: true,
      message: `Some indices are out of range and ignored: ${unknown.slice(0, 8).join(", ")}${
        unknown.length > 8 ? ", ..." : ""
      }`,
    };
  }
  return { ok: true, message: null };
}

/**
 * CorrelationConfigForm (FORM ONLY)
 * - No preprocessingConfig editor here.
 * - No per-analysis JSON editor here.
 * - Step3 orchestrator provides the global "Form vs Config Editor" modes.
 */
const CorrelationConfigForm = ({ numericColumns, allColumns, columnTypes, value, onChange }) => {
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

  const updateCorrelation = (patch) => {
    onChange({ ...value, ...patch });
  };

  const enabled = !!value.enabled;
  const selectedColumns = useMemo(() => (Array.isArray(value.columns) ? value.columns.filter(Boolean) : []), [value.columns]);
  const selectedCount = selectedColumns.length;
  const hasMinCols = selectedCount >= 2;

  const validationHint = useMemo(() => {
    if (!enabled) return null;
    if (!hasMinCols) return "Select at least 2 columns to run an analysis.";
    return null;
  }, [enabled, hasMinCols]);

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

  /* ---------------------- NEW: range selection state + actions ---------------------- */
  const [rangeText, setRangeText] = useState("");
  const [rangeHint, setRangeHint] = useState(null);

  const indexToCol = useMemo(() => buildIndexToColMap(safeAllCols), [safeAllCols]);

  const applyRange = useCallback(
    (mode) => {
      const v = validateRange(rangeText, indexToCol);
      setRangeHint(v.message);
      if (!v.ok) return;

      const nums = parseNumberRanges(rangeText);
      const pickedCols = nums.map((n) => indexToCol[n]).filter(Boolean);

      if (!pickedCols.length) return;

      if (mode === "replace") {
        setColumns(uniq(pickedCols));
        return;
      }

      if (mode === "remove") {
        const toRemove = new Set(pickedCols);
        setColumns(selectedColumns.filter((c) => !toRemove.has(c)));
        return;
      }

      // add
      setColumns(uniq([...selectedColumns, ...pickedCols]));
    },
    [indexToCol, rangeText, selectedColumns]
  );

  return (
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
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              onClick={handleSelectAll}
              disabled={!enabled || !safeAllCols.length}
            >
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

        {/* NEW: Range over columns (uses existing TextField) */}
        <FlexBox sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr auto" }, gap: 1 }}>
          <TextField
            label="Select by range"
            size="small"
            value={rangeText}
            onChange={(e) => setRangeText(e.target.value)}
            disabled={!enabled || !safeAllCols.length}
            placeholder="e.g. 1-5, 8, 10-12"
            helperText={
              safeAllCols.length
                ? rangeHint || `Uses the same ordering as the picker options (1–${safeAllCols.length}).`
                : "No columns detected."
            }
          />

          <FlexBox sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              onClick={() => applyRange("remove")}
              disabled={!enabled || !safeAllCols.length}
            >
              Remove
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              onClick={() => applyRange("replace")}
              disabled={!enabled || !safeAllCols.length}
            >
              Replace
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={() => applyRange("add")}
              disabled={!enabled || !safeAllCols.length}
            >
              Add
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
            />
          )}
        />

        <Typography variant="caption" color="textSecondary">
          Backend will skip gracefully if fewer than two columns are selected or if columns are unusable (e.g., constant).
        </Typography>
      </FlexBox>
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
};

CorrelationConfigForm.defaultProps = {
  numericColumns: [],
  allColumns: [],
  columnTypes: {},
};

export default CorrelationConfigForm;
