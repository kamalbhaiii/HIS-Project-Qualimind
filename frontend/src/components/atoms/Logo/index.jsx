import React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';

const Logo = ({ src, size = 32, alt = 'Logo' }) => {
  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      sx={{
        width: size,
        height: size,
        objectFit: 'contain',
      }}
    />
  );
};

Logo.propTypes = {
  src: PropTypes.string.isRequired,
  size: PropTypes.number,
  alt: PropTypes.string,
};

export default Logo;
