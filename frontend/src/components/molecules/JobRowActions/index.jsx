import React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Button from '../../atoms/CustomButton';

const JobRowActions = ({ onView }) => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Button
        variant="text"
        size="small"
        color="primary"
        onClick={onView}
      >
        View
      </Button>
    </Box>
  );
};

JobRowActions.propTypes = {
  onView: PropTypes.func,
};

export default JobRowActions;
