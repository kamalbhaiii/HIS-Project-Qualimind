import React from 'react';
import PropTypes from 'prop-types';

import DashboardLayout from '../../components/templates/DashboardLayout';
import FlexBox from '../../components/atoms/FlexBox';
import Typography from '../../components/atoms/CustomTypography';
import DragAndDropUploadArea from '../../components/organisms/DragAndDropUploadArea';

const UploadDatasetPageTemplate = ({ onNavigate }) => {
  const handleFilesSelected = (files) => {
    if (!files || files.length === 0) return;

    // Here you would later call your real upload API.
    // For now, we just log and navigate away.
    // eslint-disable-next-line no-console
    console.log('Mock upload dataset files:', files);

    // ✅ After upload, go to another page.
    // You said "for now just keep '/'", so we treat that as "home/dashboard".
    if (onNavigate) {
      onNavigate('dashboard'); // your routing layer can map this to '/'
    } else {
      // Fallback: hard redirect as a plain SPA route
      window.location.href = '/';
    }
  };

  return (
    <DashboardLayout activeKey="datasets" onNavigate={onNavigate}>
      <Typography variant="h5" sx={{ mb: 1.5, fontWeight: 700 }}>
        Upload a new dataset
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Provide a dataset file to prepare it for qualitative and
        quantitative preprocessing. This page currently uses mock upload
        behavior only.
      </Typography>

      <FlexBox
        sx={{
          maxWidth: 720,
        }}
      >
        <DragAndDropUploadArea
          onFilesSelected={handleFilesSelected}
          helperText="Max size ~100MB. In a future iteration, this will call the real /api/datasets endpoint."
        />
      </FlexBox>
    </DashboardLayout>
  );
};

UploadDatasetPageTemplate.propTypes = {
  onNavigate: PropTypes.func, // (key: string) => void — your existing router hook
};

export default UploadDatasetPageTemplate;
