import React from 'react';
import PropTypes from 'prop-types';
import Chip from '@mui/material/Chip';

const ToggleChip = ({ label, selected, onClick }) => {
  return (
    <Chip
      label={label}
      color={selected ? 'primary' : 'default'}
      variant={selected ? 'filled' : 'outlined'}
      onClick={onClick}
      sx={{ mr: 1, mb: 1 }}
    />
  );
};

ToggleChip.propTypes = {
  label: PropTypes.node.isRequired,
  selected: PropTypes.bool,
  onClick: PropTypes.func,
};

export default ToggleChip;
