import React from 'react';
import PropTypes from 'prop-types';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormRow from '../FormRow';

const ToggleRow = ({ label, description, checked, onChange }) => {
  const handleToggle = (e) => {
    if (onChange) {
      onChange(e.target.checked);
    }
  };

  return (
    <FormRow label={label} description={description}>
      <FormControlLabel
        control={
          <Switch
            checked={checked}
            onChange={handleToggle}
            color="primary"
          />
        }
        label=""
      />
    </FormRow>
  );
};

ToggleRow.propTypes = {
  label: PropTypes.string.isRequired,
  description: PropTypes.string,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired, // (checked: boolean) => void
};

export default ToggleRow;
