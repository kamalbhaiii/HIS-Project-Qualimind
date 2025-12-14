import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Papa from 'papaparse';

import AppModal from '../../atoms/AppModal';
import FlexBox from '../../atoms/FlexBox';
import Typography from '../../atoms/CustomTypography';
import Button from '../../atoms/CustomButton';
import ColumnSelectionList from '../../molecules/ColumnSelectionList';
import PreprocessingTaskSelector from '../../molecules/PreprocessingTaskSelector';
import PreprocessingConfigSelector from '../../molecules/PreprocessingConfigSelectorV2';
import InputFieldWithLabel from '../../molecules/InputFieldWithLabel';

import { uploadDataset } from '../../../services/modules/dataset.api';
import { useToast } from '../../organisms/ToastProvider';
import { excelToCsv, jsonFileToCsv } from '../../../lib/fileConverters';
import { inferColumnTypes } from '../../../helpers/type_inference.helper';
import AISuggestionConsoleModal from '../AISuggestionConsoleModal';

// --- Your registry unchanged ---
export const TASK_REGISTRY = [
  {
    taskKey: 'handle_missing_categoricals',
    configTask: 'missing_values',
    label: 'Handle missing categorical values',
    appliesTo: 'categorical',
    methods: [
      { key: 'categorical_unknown', label: 'Fill with "unknown"' },
      { key: 'categorical_mode', label: 'Fill with mode (most frequent)' },
    ],
  },
  {
    taskKey: 'numeric_imputation',
    configTask: 'missing_values',
    label: 'Impute missing numeric values',
    appliesTo: 'numeric',
    methods: [
      { key: 'numeric_median', label: 'Median' },
      { key: 'numeric_mean', label: 'Mean' },
      { key: 'numeric_constant', label: 'Constant value' },
    ],
  },
  {
    taskKey: 'clean_category_labels',
    configTask: 'label_cleaning',
    label: 'Clean & standardize categorical labels',
    appliesTo: 'categorical',
    methods: [{ key: 'standard', label: 'Standard cleaning' }],
  },
  {
    taskKey: 'reduce_cardinality',
    configTask: 'reduce_cardinality',
    label: 'Reduce high-cardinality & rare categories',
    appliesTo: 'categorical',
    methods: [{ key: 'rare_to_other', label: 'Convert rare levels to "other"' }],
  },
  {
    taskKey: 'encode_categoricals',
    configTask: 'encoding',
    label: 'Encode categorical variables',
    appliesTo: 'categorical',
    methods: [{ key: 'auto', label: 'Auto (one-hot ≤ max levels, else label + frequency)' }],
  },
  {
    taskKey: 'numeric_scaling',
    configTask: 'scaling',
    label: 'Scale numeric features',
    appliesTo: 'numeric',
    methods: [
      { key: 'zscore', label: 'Z-score standardization' },
      { key: 'minmax', label: 'Min-max scaling' },
      { key: 'none', label: 'No scaling' },
    ],
  },
];

const TASK_CHIPS = TASK_REGISTRY.map((t) => ({ key: t.taskKey, label: t.label }));

/**
 * Simple validator to prevent sending broken configs.
 * (Backend must still validate.)
 */
function validatePreprocessingConfig(cfg) {
  if (!cfg) return { ok: false, message: 'preprocessingConfig is missing' };
  if (cfg.version !== '1.0') return { ok: false, message: 'preprocessingConfig.version must be "1.0"' };
  if (!Array.isArray(cfg.steps)) return { ok: false, message: 'preprocessingConfig.steps must be an array' };

  for (let i = 0; i < cfg.steps.length; i += 1) {
    const s = cfg.steps[i];
    if (!s || typeof s !== 'object') return { ok: false, message: `steps[${i}] must be an object` };
    if (!s.task || typeof s.task !== 'string') return { ok: false, message: `steps[${i}].task is required` };
    if (!s.method || typeof s.method !== 'string') return { ok: false, message: `steps[${i}].method is required` };
    if (!s.appliesTo || typeof s.appliesTo !== 'object') return { ok: false, message: `steps[${i}].appliesTo is required` };
    const hasTypes = Array.isArray(s.appliesTo.types) && s.appliesTo.types.length > 0;
    const hasCols = Array.isArray(s.appliesTo.columns) && s.appliesTo.columns.length > 0;
    if (!hasTypes && !hasCols) return { ok: false, message: `steps[${i}].appliesTo must include types or columns` };
  }

  return { ok: true };
}

/**
 * “AI suggestion” (Ticket 2 simplified version):
 * We generate a deterministic, good default suggestion based on detected types.
 *
 * Next ticket: call server /preprocessing/suggest to produce these defaults dynamically.
 */
function buildSuggestedDefaults({ columnTypes, selectedColumns }) {
  const cols = selectedColumns || [];
  const hasNumeric = cols.some((c) => columnTypes?.[c] === 'numeric');
  const hasCategorical = cols.some((c) => columnTypes?.[c] === 'categorical');

  return {
    // missing values
    categoricalMissing: hasCategorical ? 'categorical_unknown' : 'categorical_unknown',
    unknownLevel: 'unknown',
    numericMissing: hasNumeric ? 'numeric_median' : 'numeric_median',
    numericConstant: 0,

    // encoding / scaling / thresholds
    encoding: 'auto',
    oneHotMaxLevels: 8,
    scaling: hasNumeric ? 'minmax' : 'zscore',

    rarePropThreshold: 0.01,
    highCardinalityThreshold: 50,
  };
}

const DatasetUploadWizard = ({ open, file, onClose, onUploaded }) => {
  const [aiConsoleOpen, setAiConsoleOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  const [columnTypes, setColumnTypes] = useState({});
  const [preprocessingConfig, setPreprocessingConfig] = useState(null);

  const [step, setStep] = useState(0);
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [datasetName, setDatasetName] = useState('');

  // NEW: AI “seed defaults” passed into the selector (required for suggestion integration)
  const [seedDefaults, setSeedDefaults] = useState(null);

  // UI state for “suggest”
  const [suggesting, setSuggesting] = useState(false);
  const [suggestMeta, setSuggestMeta] = useState(null); // { rationale[], confidence, warnings[] }

  const { showToast } = useToast();

  const handleAiAccept = () => {
  if (!aiSuggestion) return;

  // Apply suggestion now
  setSeedDefaults(aiSuggestion._seedDefaults || null);
  setSelectedTasks(aiSuggestion._recommendedTasks || []);
  setSuggestMeta({
    confidence: aiSuggestion.confidence,
    rationale: aiSuggestion.rationale,
    warnings: aiSuggestion.warnings,
  });

  setAiConsoleOpen(false);
  showToast('AI suggestion accepted and applied.', 'success');
};

const handleAiReject = () => {
  setAiConsoleOpen(false);
  showToast('AI suggestion rejected. You can configure manually.', 'info');
};


  // Helper to auto-select recommended tasks when using suggestion
  const recommendedTaskKeys = useMemo(() => {
    const cols = selectedColumns || [];
    const hasNumeric = cols.some((c) => columnTypes?.[c] === 'numeric');
    const hasCategorical = cols.some((c) => columnTypes?.[c] === 'categorical');

    const base = [
      'clean_category_labels',
      'encode_categoricals',
      'reduce_cardinality',
      'handle_missing_categoricals',
    ];

    if (hasNumeric) base.push('numeric_imputation', 'numeric_scaling');
    // if no numeric, keep numeric tasks off

    // Keep only tasks that exist in registry
    const registryKeys = new Set(TASK_REGISTRY.map((t) => t.taskKey));
    return base.filter((k) => registryKeys.has(k));
  }, [selectedColumns, columnTypes]);

  useEffect(() => {
    if (!file) return;

    const rawName = file.name || 'dataset';
    const lower = rawName.toLowerCase();

    const dotIndex = rawName.lastIndexOf('.');
    const baseName = dotIndex > 0 ? rawName.slice(0, dotIndex) : rawName;
    setDatasetName(baseName);

    // Reset wizard states when new file selected
    setStep(0);
    setSelectedTasks([]);
    setPreprocessingConfig(null);
    setSeedDefaults(null);
    setSuggestMeta(null);

    const setFromCsvString = (csvString) => {
      const parsed = Papa.parse(csvString, {
        header: true,
        preview: 200,
        skipEmptyLines: true,
      });

      const fields = parsed.meta?.fields || [];
      setColumns(fields);
      setSelectedColumns(fields);

      const rows = parsed.data || [];
      const types = inferColumnTypes(rows, fields);
      setColumnTypes(types);
    };

    const detectColumns = async () => {
      try {
        if (lower.endsWith('.csv')) {
          const text = await file.text();
          setFromCsvString(text);
        } else if (lower.endsWith('.json')) {
          const csvString = await jsonFileToCsv(file);
          setFromCsvString(csvString);
        } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
          const csvString = await excelToCsv(file);
          setFromCsvString(csvString);
        } else {
          setColumns([]);
          setSelectedColumns([]);
          showToast('Unsupported file format.', 'warning');
        }
      } catch (error) {
        console.error('Column detection failed:', error);
        setColumns([]);
        setSelectedColumns([]);
        showToast('Failed to detect columns from file.', 'error');
      }
    };

    detectColumns();
  }, [file]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleColumn = (col) => {
    setSelectedColumns((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]));
  };

  const handleToggleTask = (taskKey) => {
    setSelectedTasks((prev) => (prev.includes(taskKey) ? prev.filter((k) => k !== taskKey) : [...prev, taskKey]));
  };

  const handleNext = () => {
    const trimmedName = datasetName.trim();
    if (!trimmedName) {
      showToast('Please provide a name for this dataset.', 'warning');
      return;
    }
    if (selectedColumns.length === 0) {
      showToast('Please keep at least one column.', 'warning');
      return;
    }
    setStep(1);
  };

  const handleBack = () => {
    if (step === 1) setStep(0);
  };

  const handleSuggestConfig = async () => {
  setAiConsoleOpen(true);
  setAiLoading(true);
  setAiError(null);
  setAiSuggestion(null);

  try {
    // For now: deterministic suggestion (later: call backend endpoint)
    const defaults = buildSuggestedDefaults({ columnTypes, selectedColumns });
    const suggestion = {
      preprocessingConfig: null, // optional – you can include later
     rationale: [
       'Clean categorical labels to standardize casing and whitespace.',
       'Encode categoricals using one-hot for low-cardinality columns; otherwise use label/frequency encoding.',
       'Scale numeric columns using min-max scaling to normalize ranges.',
      ],
      confidence: 0.75,
      warnings: [],
      _seedDefaults: defaults,
      _recommendedTasks: recommendedTaskKeys,
    };

    setAiSuggestion(suggestion);
  } catch (e) {
    console.error(e);
    setAiError(e?.message || 'Unknown error');
  } finally {
    setAiLoading(false);
  }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    try {
      const finalName = (datasetName.trim() || 'dataset') + '.csv';
      const lowerName = file.name.toLowerCase();

      let csvString;

      if (lowerName.endsWith('.csv')) {
        csvString = await file.text();
      } else if (lowerName.endsWith('.json')) {
        csvString = await jsonFileToCsv(file);
      } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        csvString = await excelToCsv(file);
      } else {
        showToast('Unsupported file format.', 'error');
        return;
      }

      const parsed = Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
      });

      const rows = parsed.data || [];
      const filteredRows = rows.map((row) => {
        const newRow = {};
        selectedColumns.forEach((col) => {
          newRow[col] = row[col];
        });
        return newRow;
      });

      const inferred = inferColumnTypes(filteredRows, selectedColumns);
      setColumnTypes(inferred); // optional (for UI display)

      const finalCsvString = Papa.unparse({
        fields: selectedColumns,
        data: filteredRows,
      });

      const csvFile = new File([finalCsvString], finalName, { type: 'text/csv' });

      // ---- Upload rule (important) ----
      // Prefer config if it exists and has steps; otherwise fall back to tasks.
      const cfg = preprocessingConfig;

      const hasCfg = cfg && Array.isArray(cfg.steps) && cfg.steps.length > 0;

      if (hasCfg) {
        const v = validatePreprocessingConfig(cfg);
        if (!v.ok) {
          showToast(v.message || 'Invalid preprocessingConfig.', 'error');
          return;
        }
      }

      const res = await uploadDataset({
        file: csvFile,
        name: finalName,
        preprocessingTasks: hasCfg ? [] : selectedTasks,
        preprocessingConfig: hasCfg ? cfg : null,
      });

      showToast('Dataset uploaded successfully!', 'success');

      if (onUploaded) onUploaded(res);

      onClose();
    } catch (err) {
      console.error(err);
      showToast(err?.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const title = step === 0 ? 'Upload dataset' : 'Preprocessing';
  const stepLabel = step === 0 ? '1 of 2 · Columns' : '2 of 2 · Preprocessing';

  return (
    <AppModal open={open} title={title} onClose={onClose} maxWidth="md">
      <FlexBox sx={{ flexDirection: 'column', gap: 2 }}>
        {/* Step header */}
        <FlexBox
          sx={{
            gap: 1,
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 2,
            padding: 1.5,
          }}
        >
          <FlexBox sx={{ flexDirection: 'column', gap: 0.25 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {step === 0 ? 'Name & columns' : 'Tasks & configuration'}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {stepLabel}
            </Typography>
          </FlexBox>

          {/* Simple progress indicator */}
          <FlexBox sx={{ gap: 1, alignItems: 'center', minWidth: 180 }}>
            <FlexBox
              sx={{
                height: 8,
                borderRadius: 999,
                background: 'rgba(0,0,0,0.08)',
                overflow: 'hidden',
                flex: 1,
                minWidth: 140,
              }}
            >
              <FlexBox
                sx={{
                  width: step === 0 ? '50%' : '100%',
                  background: 'rgba(0,0,0,0.35)',
                  height: '100%',
                }}
              />
            </FlexBox>
            <Typography variant="caption" color="textSecondary">
              {step === 0 ? '50%' : '100%'}
            </Typography>
          </FlexBox>
        </FlexBox>

        {/* Body */}
        {step === 0 && (
          <FlexBox sx={{ flexDirection: 'column', gap: 2 }}>
            <FlexBox
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 2,
                alignItems: 'start',
              }}
            >
              <FlexBox sx={{ flexDirection: 'column', gap: 1.25 }}>
                <InputFieldWithLabel
                  label="Dataset name"
                  placeholder="Enter a dataset name"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  helperText="You can change how this dataset will be identified in QualiMind."
                  name="datasetName"
                  id="datasetName"
                />

                <FlexBox
                  sx={{
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 2,
                    padding: 1.5,
                    background: 'rgba(0,0,0,0.02)',
                  }}
                >
                  <Typography variant="body2" color="textSecondary">
                    Review detected columns and deselect any you want to exclude before preprocessing.
                  </Typography>
                </FlexBox>
              </FlexBox>

              <FlexBox
                sx={{
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 2,
                  padding: 1.5,
                }}
              >
                <FlexBox sx={{ flexDirection: 'column', gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Columns
                  </Typography>
                  <ColumnSelectionList
                    columns={columns}
                    selectedColumns={selectedColumns}
                    onToggleColumn={handleToggleColumn}
                  />
                </FlexBox>
              </FlexBox>
            </FlexBox>

            {/* Sticky action bar */}
            <FlexBox
              sx={{
                position: { xs: 'sticky', md: 'static' },
                bottom: 0,
                borderTop: { xs: '1px solid rgba(0,0,0,0.08)', md: 'none' },
                paddingTop: { xs: 1.5, md: 0 },
                paddingBottom: { xs: 1, md: 0 },
                zIndex: 2,
              }}
            >
              <FlexBox sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, width: '100%' }}>
                <Button variant="contained" color="primary" onClick={handleNext} disabled={columns.length === 0}>
                  Next: Preprocessing
                </Button>
              </FlexBox>
            </FlexBox>
          </FlexBox>
        )}

        {step === 1 && (
          <FlexBox sx={{ flexDirection: 'column', gap: 2 }}>
            <FlexBox
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr' },
                gap: 2,
              }}
            >
              {/* Tasks */}
              <FlexBox
                sx={{
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 2,
                  padding: 1.5,
                }}
              >
                <FlexBox
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 1,
                    alignItems: { xs: 'flex-start', md: 'center' },
                    flexWrap: 'wrap',
                    mb: 1,
                  }}
                >
                  <FlexBox sx={{ flexDirection: 'column', gap: 0.25 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Preprocessing tasks
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Choose tasks manually or apply an AI suggested configuration.
                    </Typography>
                  </FlexBox>

                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSuggestConfig}
                    disabled={aiLoading}
                  >
                    {suggesting ? 'Suggesting...' : 'AI Suggest'}
                  </Button>
                </FlexBox>

                <AISuggestionConsoleModal
  open={aiConsoleOpen}
  onClose={() => setAiConsoleOpen(false)}
  suggestion={aiSuggestion}
  loading={aiLoading}
  error={aiError}
  onAccept={handleAiAccept}
  onReject={handleAiReject}
/>


                {suggestMeta?.rationale?.length ? (
                  <FlexBox
                    sx={{
                      border: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 2,
                      padding: 1,
                      background: 'rgba(0,0,0,0.02)',
                      mb: 1.25,
                      flexDirection: 'column',
                      gap: 0.5,
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      Suggestion rationale (confidence: {suggestMeta.confidence})
                    </Typography>
                    {suggestMeta.rationale.map((r, idx) => (
                      <Typography key={idx} variant="caption" color="textSecondary">
                        • {r}
                      </Typography>
                    ))}
                  </FlexBox>
                ) : null}

                <PreprocessingTaskSelector
                  tasks={TASK_CHIPS}
                  selectedTaskKeys={selectedTasks}
                  onToggleTask={handleToggleTask}
                />
              </FlexBox>

              {/* Configuration */}
              <FlexBox
                sx={{
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 2,
                  padding: 1.5,
                }}
              >
                <PreprocessingConfigSelector
                  selectedTaskKeys={selectedTasks}
                  columns={selectedColumns}
                  columnTypes={columnTypes}
                  onConfigChange={setPreprocessingConfig}
                  seedDefaults={seedDefaults}   // <-- NEW PROP (requires patch below)
                />
              </FlexBox>
            </FlexBox>

            {/* Sticky action bar */}
            <FlexBox
              sx={{
                position: { xs: 'sticky', md: 'static' },
                bottom: 0,
                borderTop: { xs: '1px solid rgba(0,0,0,0.08)', md: 'none' },
                paddingTop: { xs: 1.5, md: 0 },
                paddingBottom: { xs: 1, md: 0 },
                zIndex: 2,
              }}
            >
              <FlexBox
                sx={{
                  justifyContent: 'space-between',
                  gap: 1,
                  width: '100%',
                  flexWrap: 'wrap',
                  display: 'flex',
                }}
              >
                <Button variant="outlined" color="inherit" onClick={handleBack} disabled={uploading}>
                  Back
                </Button>
                <Button variant="contained" color="primary" onClick={handleUpload} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload dataset'}
                </Button>
              </FlexBox>
            </FlexBox>
          </FlexBox>
        )}
      </FlexBox>
    </AppModal>
  );
};

DatasetUploadWizard.propTypes = {
  open: PropTypes.bool.isRequired,
  file: PropTypes.instanceOf(File),
  onClose: PropTypes.func.isRequired,
  onUploaded: PropTypes.func,
};

export default DatasetUploadWizard;
