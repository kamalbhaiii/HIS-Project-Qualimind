import React from 'react';
import Box from '@mui/material/Box';
import Typography from '../../atoms/CustomTypography';
import { LogoIcon } from '../../atoms/Icon/index.jsx';

const HeaderSection = () => {
  return (
    <Box sx={{ textAlign: 'center', mb: 3 }}>
      <Box
        sx={{
          width: 64,
          height: 64,
          mx: 'auto',
          mb: 2,
          bgcolor: 'background.paper',
          borderRadius: '50%',
          boxShadow: 3,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        aria-label="DataPrep Pro Logo"
      >
        <LogoIcon sx={{ fontSize: 32, color: 'primary.main' }} />
      </Box>
      <Typography variant="h5" fontWeight={700} color="textPrimary">
        Welcome to Qualimind
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
        Sign in to continue
      </Typography>
    </Box>
  );
};

export default HeaderSection;
