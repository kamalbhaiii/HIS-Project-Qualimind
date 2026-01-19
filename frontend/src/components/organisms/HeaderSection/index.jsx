import React from 'react';
import Box from '@mui/material/Box';
import Typography from '../../atoms/CustomTypography';
import Logo from '../../../assets/logo.png'
import LogoMark from '../../atoms/LogoMark';
import PageLogo from '../../molecules/PageLogo';

const HeaderSection = () => {
  return (
    <Box sx={{ textAlign: 'center', mb: 3 }}>
      <PageLogo  />
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
