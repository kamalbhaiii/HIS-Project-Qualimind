import React from 'react';
import Box from '@mui/material/Box';
import LogoMark from '../../atoms/LogoMark';

export default function PageLogo() {
  return (
    <Box
        sx={{
          width: 64,
          height: 64,
          mx: 'auto',
          mb: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: '50%',
        }}
        aria-label="DataPrep Pro Logo"
      >
        <LogoMark size={64}/>
      </Box>
  )
}