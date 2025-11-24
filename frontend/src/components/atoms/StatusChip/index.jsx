import React from 'react';
import PropTypes from 'prop-types';
import Chip from '@mui/material/Chip';

const STATUS_COLOR_MAP = {
  PENDING: 'default',
  RUNNING: 'info',
  SUCCESS: 'success',
  FAILED: 'error',
};

const STATUS_LABEL_MAP = {
  PENDING: 'Pending',
  RUNNING: 'Running',
  SUCCESS: 'Success',
  FAILED: 'Failed',
};

const StatusChip = ({ status, ...rest }) => {
  const color = STATUS_COLOR_MAP[status] || 'default';
  const label = STATUS_LABEL_MAP[status] || status;

  return <Chip size="small" color={color} label={label} {...rest} />;
};

StatusChip.propTypes = {
  status: PropTypes.oneOf(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED'])
    .isRequired,
};

export default StatusChip;
