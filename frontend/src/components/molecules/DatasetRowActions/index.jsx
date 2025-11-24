import React from 'react';
import PropTypes from 'prop-types';
import Button from '../../atoms/CustomButton';
import Box from '@mui/material/Box';

const DatasetRowActions = ({ onView, onStartJob }) => {
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button
        variant="text"
        size="small"
        color="primary"
        onClick={onView}
      >
        View
      </Button>
      <Button
        variant="text"
        size="small"
        color="secondary"
        onClick={onStartJob}
      >
        New job
      </Button>
    </Box>
  );
};

DatasetRowActions.propTypes = {
  onView: PropTypes.func,
  onStartJob: PropTypes.func,
};

export default DatasetRowActions;
