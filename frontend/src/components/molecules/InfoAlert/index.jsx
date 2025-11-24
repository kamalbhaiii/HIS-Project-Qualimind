import React from 'react';
import PropTypes from 'prop-types';
import Alert from '@mui/material/Alert';

const InfoAlert = ({ severity, children }) => {
  return <Alert severity={severity}>{children}</Alert>;
};

InfoAlert.propTypes = {
  severity: PropTypes.oneOf(['success', 'info', 'warning', 'error'])
    .isRequired,
  children: PropTypes.node.isRequired,
};

export default InfoAlert;
