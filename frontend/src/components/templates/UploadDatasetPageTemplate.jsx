import React, { useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";

import FlexBox from "../../components/atoms/FlexBox";
import Typography from "../../components/atoms/CustomTypography";
import DragAndDropUploadArea from "../../components/organisms/DragAndDropUploadArea";
import DatasetUploadWizard from "../../components/organisms/DatasetUploadWizard";
import { useToast } from "../../components/organisms/ToastProvider";

const UploadDatasetPageTemplate = ({ onNavigate }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const helperText = useMemo(
    () =>
      "Max size ~10MB. You will be able to choose columns & preprocessing steps before upload.",
    []
  );

  const handleFilesSelected = useCallback(
    (files) => {
      if (!files || files.length === 0) return;
      const file = files[0];

      // Basic guard: avoid opening wizard for empty files
      if (file?.size === 0) {
        showToast("Selected file is empty.", "warning");
        return;
      }

      setSelectedFile(file);
      setWizardOpen(true);
    },
    [showToast]
  );

  const handleWizardClose = useCallback(() => {
    setWizardOpen(false);
    setSelectedFile(null);
  }, []);

  const handleUploaded = useCallback(
    (res) => {
      // Decide where to go after upload
      if (onNavigate) {
        onNavigate("dashboard");
      } else {
        // default: datasets list
        navigate("/datasets");
      }
    },
    [navigate, onNavigate]
  );

  return (
    <>
      <Typography variant="h5" sx={{ mb: 1.5, fontWeight: 700 }}>
        Upload a new dataset
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Provide a dataset file to prepare it for qualitative and quantitative preprocessing.
      </Typography>

      <FlexBox sx={{ maxWidth: 720 }}>
        <DragAndDropUploadArea onFilesSelected={handleFilesSelected} helperText={helperText} />
      </FlexBox>

      <DatasetUploadWizard
        open={wizardOpen}
        file={selectedFile}
        onClose={handleWizardClose}
        onUploaded={handleUploaded}
      />
    </>
  );
};

UploadDatasetPageTemplate.propTypes = {
  onNavigate: PropTypes.func,
};

export default UploadDatasetPageTemplate;
