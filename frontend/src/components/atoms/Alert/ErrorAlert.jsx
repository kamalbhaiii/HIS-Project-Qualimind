import React from 'react';
import AlertMessage from './index.jsx';

const ErrorAlert = ({ message, sx }) => {
  return <AlertMessage severity="error" message={message} sx={sx} />;
};

export default ErrorAlert;
