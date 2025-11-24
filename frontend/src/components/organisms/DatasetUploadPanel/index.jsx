import React from 'react';
import PropTypes from 'prop-types';
import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import FlexBox from '../../atoms/FlexBox';
import Button from '../../atoms/CustomButton';
import { useNavigate } from 'react-router-dom';

const DatasetUploadPanel = ({ onNavigate }) => {
  const navigate = useNavigate();
  const handleGoToUploadPage = () => {
    navigate('/upload-dataset');
  };

  return (
    <SurfaceCard sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Upload new dataset
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Supported formats: CSV (recommended), JSON, TXT. The file will be
        validated and prepared for preprocessing.
      </Typography>

      <FlexBox sx={{ mb: 1.5 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleGoToUploadPage}
        >
          Upload dataset
        </Button>
      </FlexBox>

      <Typography variant="caption" color="textSecondary">
        Tip: Use well-structured column headers for better categorical
        preprocessing.
      </Typography>
    </SurfaceCard>
  );
};

DatasetUploadPanel.propTypes = {
  onNavigate: PropTypes.func,
};

export default DatasetUploadPanel;
