import React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '../../atoms/CustomTypography';

const FormRow = ({ label, description, children }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        mb: 2,
      }}
    >
      <Box sx={{ minWidth: 200, flex: '0 0 200px' }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
        {description && (
          <Typography
            variant="caption"
            color="textSecondary"
            sx={{ display: 'block', mt: 0.5 }}
          >
            {description}
          </Typography>
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 200 }}>{children}</Box>
    </Box>
  );
};

FormRow.propTypes = {
  label: PropTypes.string.isRequired,
  description: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default FormRow;
