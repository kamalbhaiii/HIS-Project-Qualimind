import React, { useState } from 'react';
import PropTypes from 'prop-types';

import DashboardLayout from '../../components/templates/DashboardLayout';
import FlexBox from '../../components/atoms/FlexBox';
import Typography from '../../components/atoms/CustomTypography';
import DragAndDropUploadArea from '../../components/organisms/DragAndDropUploadArea';
import DatasetUploadWizard from '../../components/organisms/DatasetUploadWizard';
import { useToast } from '../../components/organisms/ToastProvider';
import { useNavigate } from 'react-router-dom';

const UploadDatasetPageTemplate = ({ onNavigate }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleFilesSelected = (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    setSelectedFile(file);
    setWizardOpen(true);
  };

  const handleWizardClose = () => {
    setWizardOpen(false);
    setSelectedFile(null);
  };

  const handleUploaded = (res) => {
    // You can decide where to go: dashboard, datasets list, or dataset-view
    // For now, we go to dashboard as you mentioned.
    if (onNavigate) {
      onNavigate('dashboard');
    } else {
      navigate('/datasets');
    }
  };

  return (
    <DashboardLayout activeKey="datasets" onNavigate={onNavigate}>
      <Typography variant="h5" sx={{ mb: 1.5, fontWeight: 700 }}>
        Upload a new dataset
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Provide a dataset file to prepare it for qualitative and
        quantitative preprocessing.
      </Typography>

      <FlexBox sx={{ maxWidth: 720 }}>
        <DragAndDropUploadArea
          onFilesSelected={handleFilesSelected}
          helperText="Max size ~100MB. You will be able to choose columns & preprocessing steps before upload."
        />
      </FlexBox>

      <DatasetUploadWizard
        open={wizardOpen}
        file={selectedFile}
        onClose={handleWizardClose}
        onUploaded={handleUploaded}
      />
    </DashboardLayout>
  );
};

UploadDatasetPageTemplate.propTypes = {
  onNavigate: PropTypes.func,
};

export default UploadDatasetPageTemplate;
