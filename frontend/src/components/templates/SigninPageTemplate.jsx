import React, { useState } from 'react';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import HeaderSection from '../organisms/HeaderSection';
import SocialLoginSection from '../organisms/SocialLoginSection';
import SignInForm from '../organisms/SignInForm';
import FooterLinks from '../organisms/FooterLinks';
import PropTypes from 'prop-types';

const SignInPageTemplate = ({ onGoogleSignIn, onSignIn, onForgotPassword, onSignUp }) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await onGoogleSignIn();
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (data) => {
    setLoading(true);
    try {
      await onSignIn(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      maxWidth="xs"
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 4,
          borderRadius: 3,
          boxShadow: (theme) =>
            `0 0 16px 2px ${theme.palette.mode === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
          width: '100%',
          maxWidth: 400,
        }}
        role="main"
        aria-label="Sign in to Qualimind"
      >
        <HeaderSection />
        <SocialLoginSection onGoogleSignIn={handleGoogleSignIn} loading={loading} />
        <SignInForm onSubmit={handleSignIn} loading={loading} />
        <FooterLinks onForgotPassword={onForgotPassword} onSignUp={onSignUp} />
      </Paper>
    </Container>
  );
};

SignInPageTemplate.propTypes = {
  onGoogleSignIn: PropTypes.func.isRequired,
  onSignIn: PropTypes.func.isRequired,
  onForgotPassword: PropTypes.func.isRequired,
  onSignUp: PropTypes.func.isRequired,
};

export default SignInPageTemplate;
