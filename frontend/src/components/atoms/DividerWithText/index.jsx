import React from 'react';
import MuiDivider from '@mui/material/Divider';
import Typography from '../CustomTypography';
import Box from '@mui/material/Box';
import PropTypes from 'prop-types';

const DividerWithText = ({ text }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
    <MuiDivider sx={{ flexGrow: 1, borderColor: 'divider' }} />
    <Typography variant="body2" color="textSecondary" sx={{ mx: 2 }}>
      {text}
    </Typography>
    <MuiDivider sx={{ flexGrow: 1, borderColor: 'divider' }} />
  </Box>
);

DividerWithText.propTypes = {
  text: PropTypes.string.isRequired,
};

export default DividerWithText;
