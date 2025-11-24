import React from 'react';
import Container from '@mui/material/Container';
import PropTypes from 'prop-types';

const LayoutContainer = ({ children, maxWidth = 'xs', ...rest }) => {
  return (
    <Container maxWidth={maxWidth} {...rest}>
      {children}
    </Container>
  );
};

LayoutContainer.propTypes = {
  children: PropTypes.node.isRequired,
  maxWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
};

export default LayoutContainer;
