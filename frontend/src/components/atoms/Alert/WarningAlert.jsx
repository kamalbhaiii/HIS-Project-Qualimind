import React from 'react';
import AlertMessage from './index.jsx';

const WarningAlert = ({ message, sx }) => {
  return <AlertMessage severity="warning" message={message} sx={sx} />;
};

export default WarningAlert;
