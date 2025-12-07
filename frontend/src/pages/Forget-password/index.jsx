import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useToast } from '../../components/organisms/ToastProvider';
import { forgetPassword } from '../../services/modules/auth.api';
import ForgotPasswordTemplate from '../../components/templates/ForgetPasswordTemplate';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      showToast('Please enter your email address.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await forgetPassword({email:email.trim()});

      showToast(
        res?.message ||
          'If an account exists for this email, a password reset link has been sent.',
        'success'
      );

      setTimeout(() => {
        navigate('/sign-in');
      }, 1500);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        'Something went wrong while requesting password reset.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToSignIn = () => {
    navigate('/sign-in');
  };

  return (
    <ForgotPasswordTemplate handleBackToSignIn={handleBackToSignIn} handleSubmit={handleSubmit} email={email} setEmail={setEmail} submitting={submitting} />
  );
};

export default ForgotPasswordPage;
