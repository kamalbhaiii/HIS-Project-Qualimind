import React from 'react';
import TextField from '../../atoms/CustomTextField';
import PropTypes from 'prop-types';

const InputFieldWithLabel = ({
  label,
  placeholder,
  value,
  onChange,
  error,
  helperText,
  type,
  required,
  icon,
  name,
  id,
  autoComplete,
  onBlur,
  disabled,
}) => {
  return (
    <TextField
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      error={error}
      helperText={helperText}
      type={type}
      required={required}
      InputProps={{
        startAdornment: icon ? icon : null,
        'aria-label': label,
      }}
      name={name}
      id={id}
      autoComplete={autoComplete}
      onBlur={onBlur}
      disabled={disabled}
    />
  );
};

InputFieldWithLabel.propTypes = {
  label: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  type: PropTypes.string,
  required: PropTypes.bool,
  icon: PropTypes.node,
  name: PropTypes.string,
  id: PropTypes.string,
  autoComplete: PropTypes.string,
  onBlur: PropTypes.func,
  disabled: PropTypes.bool,
};

export default InputFieldWithLabel;
