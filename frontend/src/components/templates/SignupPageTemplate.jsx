import React, { useState } from 'react';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import HeaderSection from '../organisms/HeaderSection';
import SocialLoginSection from '../organisms/SocialLoginSection';
import InputFieldWithLabel from '../molecules/InputFieldWithLabel';
import Button from '../atoms/CustomButton';
import { EmailIcon, LockIcon } from '../atoms/Icon';
import LinkText from '../molecules/LinkText';
import Typography from '../atoms/CustomTypography';
import PropTypes from 'prop-types';

const SignUpPageTemplate = ({
  onGoogleSignUp,
  onSignUp,
  onSignInRedirect,
  loading: externalLoading = false,
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validate = () => {
    const newErrors = { email: '', password: '', confirmPassword: '' };

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);

    return !newErrors.email && !newErrors.password && !newErrors.confirmPassword;
  };

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleBlur = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validate();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validate()) {
      setLoading(true);
      try {
        await onSignUp({ email: formData.email, password: formData.password });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      await onGoogleSignUp();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
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
      <Paper
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
        aria-label="Sign up to DataPrep Pro"
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          {/* Icon from HeaderSection but you can import separately if needed */}
          <Box
            sx={{
              width: 64,
              height: 64,
              mx: 'auto',
              mb: 2,
              bgcolor: 'background.paper',
              borderRadius: '50%',
              boxShadow: 3,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            aria-label="DataPrep Pro Logo"
          >
            {/* Using original logo icon from atoms/Icon */}
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" fill="#1976D2" />
              <path fill="#fff" d="M9 7h2v10H9zM13 7h2v10h-2z" />
            </svg>
          </Box>
          <Typography variant="h5" fontWeight={700} color="textPrimary">
            Create your DataPrep Pro account
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
            Sign up to get started
          </Typography>
        </Box>

        <Button
          variant="outlined"
          fullWidth
          startIcon={<img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google icon" style={{ width: 20, height: 20 }} />}
          onClick={handleGoogleSignUp}
          disabled={loading || externalLoading}
          aria-label="Continue with Google"
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            py: 1.1,
            mb: 2,
          }}
        >
          {loading ? 'Loading...' : 'Continue with Google'}
        </Button>

        <Typography variant="body2" color="textSecondary" sx={{ mb: 1, textAlign: 'center' }}>
          OR
        </Typography>

        {/* Form Start */}
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <InputFieldWithLabel
            label="Email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange('email')}
            error={Boolean(errors.email)}
            helperText={errors.email}
            type="email"
            required
            icon={<EmailIcon sx={{ mr: 1, color: 'action.active' }} />}
            name="email"
            id="email"
            autoComplete="email"
            onBlur={handleBlur('email')}
            disabled={loading || externalLoading}
          />

          <Box mt={2}>
            <InputFieldWithLabel
              label="Password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange('password')}
              error={Boolean(errors.password)}
              helperText={errors.password}
              type="password"
              required
              icon={<LockIcon sx={{ mr: 1, color: 'action.active' }} />}
              name="password"
              id="password"
              autoComplete="new-password"
              onBlur={handleBlur('password')}
              disabled={loading || externalLoading}
            />
          </Box>

          <Box mt={2}>
            <InputFieldWithLabel
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              error={Boolean(errors.confirmPassword)}
              helperText={errors.confirmPassword}
              type="password"
              required
              icon={<LockIcon sx={{ mr: 1, color: 'action.active' }} />}
              name="confirmPassword"
              id="confirmPassword"
              autoComplete="new-password"
              onBlur={handleBlur('confirmPassword')}
              disabled={loading || externalLoading}
            />
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={loading || externalLoading}
            sx={{ mt: 3, mb: 2 }}
          >
            {loading ? 'Signing up...' : 'Sign up'}
          </Button>
        </Box>

        <Box
          sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}
          aria-label="Redirect to sign in page"
        >
          <Typography variant="body2" color="textSecondary">
            Already have an account?
          </Typography>
          <LinkText
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onSignInRedirect();
            }}
            variant="body2"
            color="primary"
          >
            Sign in
          </LinkText>
        </Box>
      </Paper>
    </Container>
  );
};

SignUpPageTemplate.propTypes = {
  onGoogleSignUp: PropTypes.func.isRequired,
  onSignUp: PropTypes.func.isRequired,
  onSignInRedirect: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default SignUpPageTemplate;
