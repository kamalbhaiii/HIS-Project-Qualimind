import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Papa from 'papaparse';

import AppModal from '../../atoms/AppModal';
import FlexBox from '../../atoms/FlexBox';
import Typography from '../../atoms/CustomTypography';
import Button from '../../atoms/CustomButton';
import ColumnSelectionList from '../../molecules/ColumnSelectionList';
import PreprocessingTaskSelector from '../../molecules/PreprocessingTaskSelector';
import InputFieldWithLabel from '../../molecules/InputFieldWithLabel';

import { uploadDataset } from '../../../services/modules/dataset.api';
import { useToast } from '../../organisms/ToastProvider';
import { excelToCsv, jsonFileToCsv } from '../../../lib/fileConverters';

const MOCK_TASKS = [
  { key: 'handle_missing_categoricals', label: 'Handle missing categorical values' },
  { key: 'encode_categoricals', label: 'Encode categorical variables' },
  { key: 'reduce_cardinality', label: 'Reduce high cardinality' },
  { key: 'clean_labels', label: 'Clean & standardize labels' },
  { key: 'feature_engineering', label: 'Feature engineering' },
  { key: 'handle_rare_categories', label: 'Handle rare categories' },
  { key: 'scale_numeric', label: 'Scale numeric features' },
];

// Helper: build a new CSV File that only has selected columns
const buildFilteredCsvFile = (file, selectedColumns) =>
  new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data || [];

        const filteredRows = rows.map((row) => {
          const newRow = {};
          selectedColumns.forEach((col) => {
            newRow[col] = row[col];
          });
          return newRow;
        });

        const csvString = Papa.unparse({
          fields: selectedColumns,
          data: filteredRows,
        });

        const newFile = new File(
          [csvString],
          file.name || 'dataset.csv',
          {
            type: file.type || 'text/csv',
          }
        );

        resolve(newFile);
      },
      error: (error) => {
        reject(error);
      },
    });
  });

const DatasetUploadWizard = ({ open, file, onClose, onUploaded }) => {
  const [step, setStep] = useState(0); // 0 = name + columns, 1 = tasks
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [datasetName, setDatasetName] = useState('');

  const { showToast } = useToast();

  // When file changes, set default dataset name and detect columns
useEffect(() => {
  if (!file) return;

  const rawName = file.name || 'dataset';
  const lower = rawName.toLowerCase();

  // default dataset name (you already have this logic)
  const dotIndex = rawName.lastIndexOf('.');
  const baseName = dotIndex > 0 ? rawName.slice(0, dotIndex) : rawName;
  setDatasetName(baseName);

  const setFromCsvString = (csvString) => {
    const parsed = Papa.parse(csvString, {
      header: true,
      preview: 1,
      skipEmptyLines: true,
    });
    const fields = parsed.meta?.fields || [];
    setColumns(fields);
    setSelectedColumns(fields); // default: all selected
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
}, [file]);

  const handleToggleColumn = (col) => {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleToggleTask = (taskKey) => {
    setSelectedTasks((prev) =>
      prev.includes(taskKey)
        ? prev.filter((k) => k !== taskKey)
        : [...prev, taskKey]
    );
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
    if (step === 1) {
      setStep(0);
    }
  };

const handleUpload = async () => {
  if (!file) return;

  setUploading(true);

  try {
    const finalName = (datasetName.trim() || "dataset") + ".csv";

    const lowerName = file.name.toLowerCase();

    let csvString;

    if (lowerName.endsWith(".csv")) {
      // Already CSV → skip to next step
      csvString = await file.text();
    }

    else if (lowerName.endsWith(".json")) {
      // Convert JSON → CSV
      csvString = await jsonFileToCsv(file);
    }

    else if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
      // Convert Excel → CSV
      csvString = await excelToCsv(file);
    }

    else {
      showToast("Unsupported file format.", "error");
      return;
    }

    // Parse CSV to apply column filtering
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

    const finalCsvString = Papa.unparse({
      fields: selectedColumns,
      data: filteredRows,
    });

    // Build final renamed CSV file
    const csvFile = new File(
      [finalCsvString],
      finalName,
      { type: "text/csv" }
    );

    // Upload to backend
    const res = await uploadDataset({
      file: csvFile,
      name: finalName,
      preprocessingTasks: selectedTasks
    });

    showToast("Dataset uploaded successfully!", "success");

    if (onUploaded) onUploaded(res);

    onClose();
  } catch (err) {
    console.error(err);
    showToast("File conversion failed.", "error");
  } finally {
    setUploading(false);
  }
};

  const title =
    step === 0 ? 'Name your dataset & select columns' : 'Choose preprocessing tasks';

  return (
    <AppModal open={open} title={title} onClose={onClose} maxWidth="md">
      {step === 0 && (
        <FlexBox sx={{ flexDirection: 'column', gap: 2 }}>
          {/* Dataset Name Input */}
          <InputFieldWithLabel
            label="Dataset name"
            placeholder="Enter a dataset name"
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            helperText="You can change how this dataset will be identified in QualiMind."
            name="datasetName"
            id="datasetName"
          />

          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            We detected the following columns in your dataset. Uncheck any
            columns you want to exclude before preprocessing.
          </Typography>

          <ColumnSelectionList
            columns={columns}
            selectedColumns={selectedColumns}
            onToggleColumn={handleToggleColumn}
          />

          <FlexBox sx={{ justifyContent: 'flex-end', mt: 2, gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleNext}
              disabled={columns.length === 0}
            >
              Next: Preprocessing
            </Button>
          </FlexBox>
        </FlexBox>
      )}

      {step === 1 && (
        <FlexBox sx={{ flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle1">
            Preprocessing tasks
          </Typography>

          <PreprocessingTaskSelector
            tasks={MOCK_TASKS}
            selectedTaskKeys={selectedTasks}
            onToggleTask={handleToggleTask}
          />

          <FlexBox sx={{ justifyContent: 'space-between', mt: 3 }}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={handleBack}
              disabled={uploading}
            >
              Back
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload dataset'}
            </Button>
          </FlexBox>
        </FlexBox>
      )}
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
