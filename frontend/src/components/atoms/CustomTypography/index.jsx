import React from 'react';
import MuiTypography from '@mui/material/Typography';
import PropTypes from 'prop-types';

const CustomTypography = ({ variant = 'body1', children, color = 'textPrimary', align = 'inherit', fontWeight, ...rest }) => (
  <MuiTypography variant={variant} color={color} align={align} sx={{ fontWeight }} {...rest}>
    {children}
  </MuiTypography>
);

CustomTypography.propTypes = {
  variant: PropTypes.string,
  children: PropTypes.node.isRequired,
  color: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  align: PropTypes.string,
  fontWeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default CustomTypography;
