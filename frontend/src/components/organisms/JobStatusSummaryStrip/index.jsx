import React from 'react';
import PropTypes from 'prop-types';

import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import FlexBox from '../../atoms/FlexBox';

const JobStatusSummaryStrip = ({ counts }) => {
  const { total, pending, running, success, failed } = counts;

  const items = [
    { label: 'Total', value: total },
    { label: 'Pending', value: pending },
    { label: 'Running', value: running },
    { label: 'Success', value: success },
    { label: 'Failed', value: failed },
  ];

  return (
    <SurfaceCard sx={{ p: 2, borderRadius: 2, mb: 2 }}>
      <FlexBox
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 3,
        }}
      >
        {items.map((item) => (
          <FlexBox key={item.label}>
            <Typography
              variant="caption"
              color="textSecondary"
              sx={{
                textTransform: 'uppercase',
                letterSpacing: 0.4,
              }}
            >
              {item.label}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {item.value}
            </Typography>
          </FlexBox>
        ))}
      </FlexBox>
    </SurfaceCard>
  );
};

JobStatusSummaryStrip.propTypes = {
  counts: PropTypes.shape({
    total: PropTypes.number.isRequired,
    pending: PropTypes.number.isRequired,
    running: PropTypes.number.isRequired,
    success: PropTypes.number.isRequired,
    failed: PropTypes.number.isRequired,
  }).isRequired,
};

export default JobStatusSummaryStrip;
