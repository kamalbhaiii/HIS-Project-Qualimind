import React from 'react';
import PropTypes from 'prop-types';
import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import Button from '../../atoms/CustomButton';
import FlexBox from '../../atoms/FlexBox';

const QuickActionsPanel = ({ onUploadDataset, onViewJobs }) => {
  return (
    <SurfaceCard sx={{ p: 3, borderRadius: 2, mt: 6
 }}>
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Get started
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Upload a new dataset to start preprocessing with QualiMind, or review
        your recent processing jobs.
      </Typography>

      <FlexBox
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Button
          variant="contained"
          color="primary"
          onClick={onUploadDataset}
        >
          Upload dataset
        </Button>
        <Button
          variant="outlined"
          color="primary"
          onClick={onViewJobs}
        >
          View all jobs
        </Button>
      </FlexBox>
    </SurfaceCard>
  );
};

QuickActionsPanel.propTypes = {
  onUploadDataset: PropTypes.func.isRequired, // () => void
  onViewJobs: PropTypes.func.isRequired, // () => void
};

export default QuickActionsPanel;
