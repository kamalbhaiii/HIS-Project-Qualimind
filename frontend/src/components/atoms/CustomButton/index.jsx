import React from 'react';
import MuiButton from '@mui/material/Button';
import PropTypes from 'prop-types';

const CustomButton = ({
  children,
  variant = 'contained',
  color = 'primary',
  fullWidth = false,
  disabled = false,
  startIcon = null,
  onClick = () => {},
  type = 'button',
  ...rest
}) => {
  return (
    <MuiButton
      variant={variant}
      color={color}
      fullWidth={fullWidth}
      disabled={disabled}
      startIcon={startIcon}
      onClick={onClick}
      type={type}
      {...rest}
      sx={{
        textTransform: 'none',
        borderRadius: 2,
        fontWeight: 600,
        fontSize: '1rem',
        py: 1.25,
      }}
    >
      {children}
    </MuiButton>
  );
};

CustomButton.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['text', 'outlined', 'contained']),
  color: PropTypes.string,
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  startIcon: PropTypes.node,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
};

export default CustomButton;
