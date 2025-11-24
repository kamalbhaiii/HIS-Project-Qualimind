import React from 'react';
import PropTypes from 'prop-types';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import Box from '@mui/material/Box';
import Typography from '../../atoms/CustomTypography';

const DatasetViewToggle = ({ mode, onChange }) => {
  const handleChange = (event, newMode) => {
    if (!newMode) return; // ignore deselect
    if (onChange) {
      onChange(newMode);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2,
        gap: 2,
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        Dataset view
      </Typography>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={mode}
        onChange={handleChange}
      >
        <ToggleButton value="original">Original dataset</ToggleButton>
        <ToggleButton value="processed">Preprocessed dataset</ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};

DatasetViewToggle.propTypes = {
  mode: PropTypes.oneOf(['original', 'processed']).isRequired,
  onChange: PropTypes.func.isRequired, // (mode: 'original' | 'processed') => void
};

export default DatasetViewToggle;
