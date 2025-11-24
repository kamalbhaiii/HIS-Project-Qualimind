import React from 'react';
import AlertMessage from './index.jsx';

const SuccessAlert = ({ message, sx }) => {
  return <AlertMessage severity="success" message={message} sx={sx} />;
};

export default SuccessAlert;
