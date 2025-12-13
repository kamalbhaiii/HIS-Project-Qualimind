import React, { useEffect, useState } from 'react';
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

const DatasetUploadWizard = ({ open, file, onClose, onUploaded }) => {
  const [columnTypes, setColumnTypes] = useState({});
  const [preprocessingConfig, setPreprocessingConfig] = useState(null);
  const [step, setStep] = useState(0);
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [datasetName, setDatasetName] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    if (!file) return;

    const rawName = file.name || 'dataset';
    const lower = rawName.toLowerCase();

    const dotIndex = rawName.lastIndexOf('.');
    const baseName = dotIndex > 0 ? rawName.slice(0, dotIndex) : rawName;
    setDatasetName(baseName);

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

      const res = await uploadDataset({
        file: csvFile,
        name: finalName,
        preprocessingTasks: selectedTasks,
        preprocessingConfig,
      });

      showToast('Dataset uploaded successfully!', 'success');

      if (onUploaded) onUploaded(res);

      onClose();
    } catch (err) {
      console.error(err);
      showToast('Upload failed.', 'error');
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
              <FlexBox
                sx={{
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 2,
                  padding: 1.5,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Preprocessing tasks
                </Typography>

                <PreprocessingTaskSelector
                  tasks={TASK_CHIPS}
                  selectedTaskKeys={selectedTasks}
                  onToggleTask={handleToggleTask}
                />
              </FlexBox>

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
              <FlexBox sx={{ justifyContent: 'space-between', gap: 1, width: '100%', flexWrap: 'wrap', display: 'flex',
                justifyContent: 'space-between', }}>
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
