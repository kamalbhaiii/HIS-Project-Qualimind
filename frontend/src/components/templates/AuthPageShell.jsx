import React from 'react';
import PropTypes from 'prop-types';
import LayoutContainer from '../atoms/LayoutContainer';
import SurfaceCard from '../atoms/SurfaceCard';

const AuthPageShell = ({ ariaLabel, children }) => {
  return (
    <LayoutContainer
      maxWidth="xs"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        py: 4,
      }}
    >
      <SurfaceCard
        elevation={6}
        sx={{
          p: 4,
          borderRadius: 3,
          boxShadow: (theme) =>
            `0 0 16px 2px ${
              theme.palette.mode === 'light'
                ? 'rgba(0,0,0,0.1)'
                : 'rgba(255,255,255,0.1)'
            }`,
          width: '100%',
          maxWidth: 400,
        }}
        role="main"
        aria-label={ariaLabel}
      >
        {children}
      </SurfaceCard>
    </LayoutContainer>
  );
};

AuthPageShell.propTypes = {
  ariaLabel: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export default AuthPageShell;
