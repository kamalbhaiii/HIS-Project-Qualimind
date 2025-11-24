import React from 'react';
import PropTypes from 'prop-types';
import MuiAlert from '@mui/material/Alert';
import Box from '@mui/material/Box';

const Alert = ({ severity, message, sx = {} }) => {
  return (
    <Box sx={{ width: '100%', mb: 2, ...sx }}>
      <MuiAlert
        variant="filled"
        severity={severity}
        sx={{
          borderRadius: 2,
          fontSize: '0.9rem',
        }}
      >
        {message}
      </MuiAlert>
    </Box>
  );
};

Alert.propTypes = {
  severity: PropTypes.oneOf(['success', 'error', 'warning', 'info'])
    .isRequired,
  message: PropTypes.node.isRequired,
  sx: PropTypes.object,
};

export default Alert;
