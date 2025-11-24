import React from 'react';
import PropTypes from 'prop-types';

import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import FlexBox from '../../atoms/FlexBox';
import StatusChip from '../../atoms/StatusChip';
import Button from '../../atoms/CustomButton';

const JobHeaderPanel = ({ job, onRetry }) => {
  return (
    <SurfaceCard sx={{ p: 3, borderRadius: 2, mb: 2 }}>
      <FlexBox
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          mb: 1,
        }}
      >
        <FlexBox>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Job {job.id}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Dataset: {job.datasetName}
          </Typography>
        </FlexBox>
        <StatusChip status={job.status} />
      </FlexBox>

      <FlexBox
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography variant="body2" color="textSecondary">
          Duration: {job.duration || '—'}
        </Typography>
        {job.status === 'FAILED' && onRetry && (
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            onClick={() => onRetry(job)}
          >
            Retry job
          </Button>
        )}
      </FlexBox>
    </SurfaceCard>
  );
};

JobHeaderPanel.propTypes = {
  job: PropTypes.shape({
    id: PropTypes.string.isRequired,
    datasetName: PropTypes.string.isRequired,
    status: PropTypes.oneOf(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED'])
      .isRequired,
    duration: PropTypes.string,
  }).isRequired,
  onRetry: PropTypes.func, // (job) => void
};

export default JobHeaderPanel;
