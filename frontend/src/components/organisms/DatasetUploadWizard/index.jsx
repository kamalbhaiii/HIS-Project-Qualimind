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

    // default dataset name from file name (without extension)
    const rawName = file.name || 'dataset.csv';
    const dotIndex = rawName.lastIndexOf('.');
    const baseName = dotIndex > 0 ? rawName.slice(0, dotIndex) : rawName;
    setDatasetName(baseName);

    const fileName = rawName.toLowerCase();
    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        preview: 1,
        skipEmptyLines: true,
        complete: (results) => {
          const fields = results.meta?.fields || [];
          setColumns(fields);
          setSelectedColumns(fields); // default: keep all
        },
        error: (error) => {
          console.error('CSV parse error:', error);
          showToast('Failed to read columns from CSV.', 'error');
        },
      });
    } else {
      setColumns([]);
      setSelectedColumns([]);
      showToast(
        'Column detection is currently only supported for CSV files.',
        'info'
      );
    }
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
      const finalName = datasetName.trim() || file.name || 'dataset.csv';
      let fileToUpload = file;

      const lowerName = (file.name || '').toLowerCase();
      const isCsv = lowerName.endsWith('.csv');

      if (isCsv && selectedColumns.length > 0) {
        // 🔥 Build a new CSV file with only selected columns
        fileToUpload = await buildFilteredCsvFile(file, selectedColumns);
      } else {
        showToast(
          'Column filtering is only applied for CSV files. Uploading original file.',
          'info'
        );
      }

      // Note: selectedTasks are not yet sent to API (API currently accepts only file + name)
      const res = await uploadDataset({
        file: fileToUpload,
        name: finalName,
      });

      showToast('Dataset uploaded successfully.', 'success');

      if (onUploaded) {
        onUploaded(res);
      }
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to upload dataset.', 'error');
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
