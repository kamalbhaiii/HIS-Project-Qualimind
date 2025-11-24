import React from 'react';
import PropTypes from 'prop-types';
import MuiAlert from '@mui/material/Alert';

const ToastMessage = React.forwardRef(function ToastMessage(props, ref) {
  const { severity, message } = props;

  return (
    <MuiAlert
      ref={ref}
      severity={severity}
      variant="filled"
      sx={{
        borderRadius: 2,
        width: '100%',
        fontSize: '0.9rem',
      }}
    >
      {message}
    </MuiAlert>
  );
});

ToastMessage.propTypes = {
  severity: PropTypes.oneOf(['error', 'success', 'warning', 'info']).isRequired,
  message: PropTypes.string.isRequired,
};

export default ToastMessage;
