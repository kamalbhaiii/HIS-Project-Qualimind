import React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '../../atoms/CustomTypography';

const JobTimeline = ({ createdAt, startedAt, finishedAt }) => {
  const items = [
    { label: 'Created', value: createdAt },
    { label: 'Started', value: startedAt || '—' },
    { label: 'Finished', value: finishedAt || '—' },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
      }}
    >
      {items.map((item) => (
        <Box key={item.label}>
          <Typography
            variant="caption"
            color="textSecondary"
            sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}
          >
            {item.label}
          </Typography>
          <Typography variant="body2">{item.value}</Typography>
        </Box>
      ))}
    </Box>
  );
};

JobTimeline.propTypes = {
  createdAt: PropTypes.string.isRequired,
  startedAt: PropTypes.string,
  finishedAt: PropTypes.string,
};

export default JobTimeline;
