import React from 'react';
import FlexBox from '../FlexBox';
import Typography from '../CustomTypography';
import LogoMark from '../LogoMark';

const Logo = () => {
  return (
            <FlexBox sx={{ display: "flex", gap: 2 , alignItems: "center", minWidth: 0 }}>
              <LogoMark />
             <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                QualiMind
              </Typography>
            </FlexBox>
  );
};

export default Logo;
