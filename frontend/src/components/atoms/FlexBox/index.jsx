import React from 'react';
import Box from '@mui/material/Box';
import PropTypes from 'prop-types';

const FlexBox = ({ children, ...rest }) => {
  return <Box {...rest}>{children}</Box>;
};

FlexBox.propTypes = {
  children: PropTypes.node,
};

export default FlexBox;
