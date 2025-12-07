import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useToast } from '../../components/organisms/ToastProvider';
import { resetPassword } from '../../services/modules/auth.api';
import ResetPasswordTemplate from '../../components/templates/ResetPasswordTemplate';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tokenError, setTokenError] = useState(null);

  // Read token from query on mount
  useEffect(() => {
    const t = searchParams.get('token');
    if (!t) {
      setTokenError('Missing reset token.');
    } else {
      setToken(t);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      showToast('Missing reset token.', 'error');
      return;
    }

    if (!newPassword || !confirmPassword) {
      showToast('Please fill in both password fields.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters long.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await resetPassword({ token, newPassword });

      showToast('Your password has been reset. You can now sign in.', 'success');

      setTimeout(() => {
        navigate('/sign-in', { replace: true });
      }, 1500);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        'Something went wrong while resetting your password.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToSignIn = () => {
    navigate('/sign-in');
  };

  const hasTokenProblem = !!tokenError;

  return (
    <ResetPasswordTemplate
      hasTokenProblem={hasTokenProblem}
      tokenError={tokenError}
      newPassword={newPassword}
      setNewPassword={setNewPassword}
      confirmPassword={confirmPassword}
      setConfirmPassword={setConfirmPassword}
      submitting={submitting}
      handleSubmit={handleSubmit}
      handleBackToSignIn={handleBackToSignIn}
    />
  );
};

export default ResetPasswordPage;
