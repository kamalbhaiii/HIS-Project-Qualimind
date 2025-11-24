import React, { useState } from 'react';
import PropTypes from 'prop-types';

import AuthPageShell from './AuthPageShell';
import HeaderSection from '../organisms/HeaderSection';
import SocialLoginSection from '../organisms/SocialLoginSection';
import SignInForm from '../organisms/SignInForm';
import FooterLinks from '../organisms/FooterLinks';

const SignInPageTemplate = ({
  onGoogleSignIn,
  onSignIn,
  onForgotPassword,
  onSignUp,
}) => {
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
      await onSignIn(data); // { email, password }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell ariaLabel="Sign in to QualiMind">
      <HeaderSection />
      <SocialLoginSection
        onGoogleSignIn={handleGoogleSignIn}
        loading={loading}
      />
      <SignInForm onSubmit={handleSignIn} loading={loading} />
      <FooterLinks onForgotPassword={onForgotPassword} onSignUp={onSignUp} />
    </AuthPageShell>
  );
};

SignInPageTemplate.propTypes = {
  onGoogleSignIn: PropTypes.func.isRequired,
  onSignIn: PropTypes.func.isRequired,
  onForgotPassword: PropTypes.func.isRequired,
  onSignUp: PropTypes.func.isRequired,
};

export default SignInPageTemplate;
