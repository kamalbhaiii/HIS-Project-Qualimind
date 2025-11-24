import React from 'react';
import Paper from '@mui/material/Paper';
import PropTypes from 'prop-types';

const SurfaceCard = ({ children, elevation = 6, ...rest }) => {
  return (
    <Paper elevation={elevation} {...rest}>
      {children}
    </Paper>
  );
};

SurfaceCard.propTypes = {
  children: PropTypes.node.isRequired,
  elevation: PropTypes.number,
};

export default SurfaceCard;
