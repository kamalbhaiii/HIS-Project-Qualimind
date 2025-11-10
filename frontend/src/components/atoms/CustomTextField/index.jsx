import React from 'react';
import MuiTextField from '@mui/material/TextField';
import PropTypes from 'prop-types';

const CustomTextField = ({
  label,
  placeholder,
  value,
  onChange,
  error = false,
  helperText = '',
  type = 'text',
  required = false,
  InputProps = {},
  name,
  id,
  autoComplete,
  onBlur,
  disabled = false,
}) => {
  return (
    <MuiTextField
      fullWidth
      variant="outlined"
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      error={error}
      helperText={helperText}
      type={type}
      required={required}
      InputProps={InputProps}
      name={name}
      id={id}
      autoComplete={autoComplete}
      onBlur={onBlur}
      disabled={disabled}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 2,
        },
      }}
    />
  );
};

CustomTextField.propTypes = {
  label: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  type: PropTypes.string,
  required: PropTypes.bool,
  InputProps: PropTypes.object,
  name: PropTypes.string,
  id: PropTypes.string,
  autoComplete: PropTypes.string,
  onBlur: PropTypes.func,
  disabled: PropTypes.bool,
};

export default CustomTextField;
