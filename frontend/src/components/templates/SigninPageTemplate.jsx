import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

import AuthPageShell from './AuthPageShell';
import HeaderSection from '../organisms/HeaderSection';
import SocialLoginSection from '../organisms/SocialLoginSection';
import SignInForm from '../organisms/SignInForm';
import FooterLinks from '../organisms/FooterLinks';

import { loginUser } from '../../services/modules/auth.api';
import { saveAuth } from '../../lib/authStorage';
import { useToast } from '../organisms/ToastProvider';

const SignInPageTemplate = ({
  onGoogleSignIn,
  onForgotPassword,
  onSignUp,
}) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await onGoogleSignIn();
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (credentials) => {
    setLoading(true);
    try {
      const res = await loginUser({
        email: credentials.email,
        password: credentials.password,
      });

      const { user, token } = res;

      saveAuth({ token, user });

      showToast(`Welcome ${user?.name || ''}!`, 'success');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        'Failed to sign in. Please try again.';

      showToast(apiMessage, 'error');
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
  onForgotPassword: PropTypes.func.isRequired,
  onSignUp: PropTypes.func.isRequired,
};

export default SignInPageTemplate;
