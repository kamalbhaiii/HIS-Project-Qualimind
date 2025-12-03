import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import SurfaceCard from '../../components/atoms/SurfaceCard';
import FlexBox from '../../components/atoms/FlexBox';
import Typography from '../../components/atoms/CustomTypography';
import Button from '../../components/atoms/CustomButton';
import { useToast } from '../../components/organisms/ToastProvider';
import { verifyEmail } from '../../components/../services/modules/auth.api';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('Verifying your email…');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }

    const run = async () => {
      try {
        setStatus('loading');
        setMessage('Verifying your email…');

        const res = await verifyEmail(token);

        setStatus('success');
        setMessage(res?.message || 'Email verified successfully.');

        showToast('Your email has been verified. You can now sign up or sign in.', 'success');

        // Navigate to sign-up page after a short delay
        setTimeout(() => {
          navigate('/sign-up', { replace: true });
        }, 1500);
      } catch (err) {
        const apiMessage =
          err?.response?.data?.message || 'Verification link is invalid or has expired.';
        setStatus('error');
        setMessage(apiMessage);
        showToast(apiMessage, 'error');
      }
    };

    run();
  }, [searchParams]);

  const handleGoToSignup = () => {
    navigate('/sign-in', { replace: true });
  };

  return (
    <FlexBox
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <SurfaceCard
        sx={{
          maxWidth: 420,
          width: '100%',
          p: 3,
          borderRadius: 3,
          textAlign: 'center',
        }}
      >
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          Email verification
        </Typography>

        <Typography
          variant="body2"
          color={status === 'error' ? 'error.main' : 'textSecondary'}
          sx={{ mb: 3 }}
        >
          {message}
        </Typography>

        {status === 'loading' && (
          <Typography variant="caption" color="textSecondary">
            Please wait…
          </Typography>
        )}

        {status === 'error' && (
          <Button
            fullWidth
            variant="contained"
            color="primary"
            sx={{ mt: 1 }}
            onClick={handleGoToSignup}
          >
            Go to sign-in
          </Button>
        )}

        {status === 'success' && (
          <Typography variant="caption" color="textSecondary">
            Redirecting you to sign-up…
          </Typography>
        )}
      </SurfaceCard>
    </FlexBox>
  );
};

export default VerifyEmailPage;
