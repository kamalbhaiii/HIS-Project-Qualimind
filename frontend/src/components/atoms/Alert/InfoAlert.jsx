import React from 'react';
import AlertMessage from './index.jsx';

const InfoAlert = ({ message, sx }) => {
  return <AlertMessage severity="info" message={message} sx={sx} />;
};

export default InfoAlert;
