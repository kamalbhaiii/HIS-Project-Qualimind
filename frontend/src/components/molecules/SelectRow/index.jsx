import React from 'react';
import PropTypes from 'prop-types';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormRow from '../FormRow';

const SelectRow = ({
  label,
  description,
  value,
  onChange,
  options,
  selectLabel,
}) => {
  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <FormRow label={label} description={description}>
      <FormControl fullWidth size="small">
        {selectLabel && <InputLabel>{selectLabel}</InputLabel>}
        <Select
          value={value}
          onChange={handleChange}
          label={selectLabel}
        >
          {options.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </FormRow>
  );
};

SelectRow.propTypes = {
  label: PropTypes.string.isRequired,
  description: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired, // (value: string) => void
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  selectLabel: PropTypes.string,
};

export default SelectRow;
