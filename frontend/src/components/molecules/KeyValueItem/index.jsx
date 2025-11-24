import React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '../../atoms/CustomTypography';

const KeyValueItem = ({ label, value }) => {
  return (
    <Box sx={{ mb: 1 }}>
      <Typography
        variant="caption"
        color="textSecondary"
        sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}
      >
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
};

KeyValueItem.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default KeyValueItem;
