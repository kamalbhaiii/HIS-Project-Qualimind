import React from 'react';
import PropTypes from 'prop-types';

import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import JobTimeline from '../../molecules/JobTimeline';

const JobTimelinePanel = ({ createdAt, startedAt, finishedAt }) => {
  return (
    <SurfaceCard sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
        Job timeline
      </Typography>
      <JobTimeline
        createdAt={createdAt}
        startedAt={startedAt}
        finishedAt={finishedAt}
      />
    </SurfaceCard>
  );
};

JobTimelinePanel.propTypes = {
  createdAt: PropTypes.string.isRequired,
  startedAt: PropTypes.string,
  finishedAt: PropTypes.string,
};

export default JobTimelinePanel;
