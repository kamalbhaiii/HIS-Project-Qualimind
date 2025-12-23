// components/organisms/DatasetUploadWizard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Papa from 'papaparse';

import AppModal from '../../atoms/AppModal';
import FlexBox from '../../atoms/FlexBox';
import Typography from '../../atoms/CustomTypography';
import Button from '../../atoms/CustomButton';
import ColumnSelectionList from '../../molecules/ColumnSelectionList';
import InputFieldWithLabel from '../../molecules/InputFieldWithLabel';

import { uploadDataset } from '../../../services/modules/dataset.api';
import { useToast } from '../../organisms/ToastProvider';
import { excelToCsv, jsonFileToCsv } from '../../../lib/fileConverters';
import { inferColumnTypes } from '../../../helpers/type_inference.helper';

import Step2PreprocessingOrchestrator from '../Step2PreprocessingOrchestrator';
import { buildPreprocessingConfig } from '../../../lib/buildPreprocessingConfig';

// --- same registry keys you already use ---
export const TASK_REGISTRY = [
  { taskKey: 'handle_missing_categoricals', label: 'Handle missing categorical values' },
  { taskKey: 'numeric_imputation', label: 'Impute missing numeric values' },
  { taskKey: 'clean_category_labels', label: 'Clean & standardize categorical labels' },
  { taskKey: 'reduce_cardinality', label: 'Reduce high-cardinality & rare categories' },
  { taskKey: 'encode_categoricals', label: 'Encode categorical variables' },
  { taskKey: 'numeric_scaling', label: 'Scale numeric features' },
];

const TASK_CHIPS = TASK_REGISTRY.map((t) => ({ key: t.taskKey, label: t.label }));

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

// Ensure defaults exist whenever tasks are enabled (so nothing is unconfigured)
function ensureDefaults(defaults) {
  return {
    categoricalMissing: defaults?.categoricalMissing || 'categorical_unknown',
    unknownLevel: defaults?.unknownLevel || 'unknown',

    numericMissing: defaults?.numericMissing || 'numeric_median',
    numericConstant: Number.isFinite(Number(defaults?.numericConstant)) ? Number(defaults.numericConstant) : 0,

    scaling: defaults?.scaling || 'zscore',

    oneHotMaxLevels: Number.isFinite(Number(defaults?.oneHotMaxLevels)) ? Number(defaults.oneHotMaxLevels) : 10,

    rarePropThreshold: Number.isFinite(Number(defaults?.rarePropThreshold)) ? Number(defaults.rarePropThreshold) : 0.01,
    highCardinalityThreshold: Number.isFinite(Number(defaults?.highCardinalityThreshold)) ? Number(defaults.highCardinalityThreshold) : 50,
  };
}

export default function DatasetUploadWizard({ open, file, onClose, onUploaded }) {
  const { showToast } = useToast();

  const [previewRows, setPreviewRows] = useState([]);
  const [columnTypes, setColumnTypes] = useState({});

  const [step, setStep] = useState(0);
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);

  const [datasetName, setDatasetName] = useState('');
  const [uploading, setUploading] = useState(false);

  // Step-2 state
  const [selectedTasks, setSelectedTasks] = useState([]);

  const [defaults, setDefaults] = useState(() =>
    ensureDefaults({
      categoricalMissing: 'categorical_unknown',
      unknownLevel: 'unknown',
      numericMissing: 'numeric_median',
      numericConstant: 0,
      scaling: 'zscore',
      oneHotMaxLevels: 10,
      rarePropThreshold: 0.01,
      highCardinalityThreshold: 50,
    })
  );

  const [overrides, setOverrides] = useState({});

  const [preprocessingConfig, setPreprocessingConfig] = useState(null);

  // Config editor state
  const [useCustomConfig, setUseCustomConfig] = useState(false);
  const [customConfigText, setCustomConfigText] = useState('');
  const [customConfigParsed, setCustomConfigParsed] = useState(null);
  const [customConfigError, setCustomConfigError] = useState(null);

  // Detect columns (Step-1 unchanged)
  useEffect(() => {
    if (!file) return;

    const rawName = file.name || 'dataset';
    const lower = rawName.toLowerCase();

    const dotIndex = rawName.lastIndexOf('.');
    const baseName = dotIndex > 0 ? rawName.slice(0, dotIndex) : rawName;
    setDatasetName(baseName);

    // reset wizard
    setStep(0);
    setSelectedTasks([]);
    setDefaults((d) => ensureDefaults(d));
    setOverrides({});
    setPreprocessingConfig(null);

    setUseCustomConfig(false);
    setCustomConfigText('');
    setCustomConfigParsed(null);
    setCustomConfigError(null);

    const setFromCsvString = (csvString) => {
      const parsed = Papa.parse(csvString, { header: true, preview: 200, skipEmptyLines: true });
      const fields = parsed.meta?.fields || [];
      setColumns(fields);
      setSelectedColumns(fields);

      const rows = parsed.data || [];
      setPreviewRows(rows);

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
        // eslint-disable-next-line no-console
        console.error('Column detection failed:', error);
        setColumns([]);
        setSelectedColumns([]);
        showToast('Failed to detect columns from file.', 'error');
      }
    };

    detectColumns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // LIVE config generation: whenever tasks/defaults/overrides/columns/types change
  useEffect(() => {
    const safeDefaults = ensureDefaults(defaults);

    const cfg = buildPreprocessingConfig({
      selectedTaskKeys: selectedTasks,
      columns: selectedColumns,
      columnTypes,
      defaults: safeDefaults,
      overrides,
    });

    setDefaults(safeDefaults);
    setPreprocessingConfig(cfg);
  }, [selectedTasks, selectedColumns, columnTypes, defaults, overrides]);

  const handleToggleColumn = (col) => {
    setSelectedColumns((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]));
  };

  const handleNext = () => {
    const trimmedName = datasetName.trim();
    if (!trimmedName) return showToast('Please provide a name for this dataset.', 'warning');
    if (selectedColumns.length === 0) return showToast('Please keep at least one column.', 'warning');
    setStep(1);
  };

  const handleBack = () => {
    if (step === 1) setStep(0);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    try {
      const finalName = (datasetName.trim() || 'dataset') + '.csv';
      const lowerName = file.name.toLowerCase();

      let csvString;
      if (lowerName.endsWith('.csv')) csvString = await file.text();
      else if (lowerName.endsWith('.json')) csvString = await jsonFileToCsv(file);
      else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) csvString = await excelToCsv(file);
      else {
        showToast('Unsupported file format.', 'error');
        return;
      }

      const parsed = Papa.parse(csvString, { header: true, skipEmptyLines: true });
      const rows = parsed.data || [];

      const filteredRows = rows.map((row) => {
        const newRow = {};
        selectedColumns.forEach((col) => {
          newRow[col] = row[col];
        });
        return newRow;
      });

      const finalCsvString = Papa.unparse({ fields: selectedColumns, data: filteredRows });
      const csvFile = new File([finalCsvString], finalName, { type: 'text/csv' });

      // Decide which config to send:
      // - if custom config enabled -> validate and send it
      // - else send the live-generated config
      let cfgToSend = preprocessingConfig;

      if (useCustomConfig) {
        if (!customConfigParsed) {
          showToast('Custom config is enabled but not valid. Fix the JSON first.', 'error');
          return;
        }
        const v = validatePreprocessingConfig(customConfigParsed);
        if (!v.ok) {
          showToast(v.message || 'Invalid custom preprocessingConfig.', 'error');
          return;
        }
        cfgToSend = customConfigParsed;
      } else {
        const v = validatePreprocessingConfig(preprocessingConfig);
        if (!v.ok) {
          showToast(v.message || 'Invalid preprocessingConfig.', 'error');
          return;
        }
      }

      const res = await uploadDataset({
        file: csvFile,
        name: finalName,
        preprocessingTasks: [], // we always send config now (clean + deterministic)
        preprocessingConfig: cfgToSend,
      });

      showToast('Dataset uploaded successfully!', 'success');
      if (onUploaded) onUploaded(res);
      onClose();
    } catch (err) {
      // eslint-disable-next-line no-console
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
      <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Header (unchanged) */}
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

        {/* Step 1 unchanged */}
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

              <FlexBox sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, padding: 1.5 }}>
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

            <FlexBox sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, width: '100%' }}>
              <Button variant="contained" color="primary" onClick={handleNext} disabled={columns.length === 0}>
                Next: Preprocessing
              </Button>
            </FlexBox>
          </FlexBox>
        )}

        {/* Step 2: new perfect UX */}
        {step === 1 && (
          <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Step2PreprocessingOrchestrator
              liveConfig={preprocessingConfig}
              tasks={TASK_CHIPS}
              selectedTaskKeys={selectedTasks}
              setSelectedTaskKeys={setSelectedTasks}
              columns={selectedColumns}
              columnTypes={columnTypes}
              previewRows={previewRows}
              filename={file?.name || 'dataset.csv'}
              defaults={defaults}
              setDefaults={setDefaults}
              overrides={overrides}
              setOverrides={setOverrides}
              onConfigChange={setPreprocessingConfig}
              validatePreprocessingConfig={validatePreprocessingConfig}
              useCustomConfig={useCustomConfig}
              setUseCustomConfig={setUseCustomConfig}
              customConfigText={customConfigText}
              setCustomConfigText={setCustomConfigText}
              setCustomConfigParsed={setCustomConfigParsed}
              customConfigError={customConfigError}
              setCustomConfigError={setCustomConfigError}
            />

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
              <FlexBox sx={{ justifyContent: 'space-between', gap: 1, width: '100%', flexWrap: 'wrap', display: 'flex' }}>
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
}

DatasetUploadWizard.propTypes = {
  open: PropTypes.bool.isRequired,
  file: PropTypes.instanceOf(File),
  onClose: PropTypes.func.isRequired,
  onUploaded: PropTypes.func,
};
