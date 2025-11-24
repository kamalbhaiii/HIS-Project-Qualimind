import React, { useState } from 'react';
import PropTypes from 'prop-types';

import AuthPageShell from './AuthPageShell';
import FlexBox from '../atoms/FlexBox';
import InputFieldWithLabel from '../molecules/InputFieldWithLabel';
import Button from '../atoms/CustomButton';
import { EmailIcon, LockIcon } from '../atoms/Icon';
import LinkText from '../molecules/LinkText';
import Typography from '../atoms/CustomTypography';
import SocialSignInButton from '../molecules/SocialSigninButton';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const validate = () => {
    const newErrors = {
      email: '',
      password: '',
      confirmPassword: '',
    };

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

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
        await onSignUp({
          email: formData.email,
          password: formData.password,
        });
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

  const isBusy = loading || externalLoading;

  return (
    <AuthPageShell ariaLabel="Sign up to QualiMind">
      {/* Header */}
      <FlexBox sx={{ textAlign: 'center', mb: 3 }}>
        <FlexBox
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
          aria-label="QualiMind Logo"
        >
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
        </FlexBox>
        <Typography variant="h5" fontWeight={700} color="textPrimary">
          Create your QualiMind account
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
          Sign up to get started
        </Typography>
      </FlexBox>

      {/* Social sign up */}
      <SocialSignInButton onClick={handleGoogleSignUp} loading={isBusy} />

      <Typography
        variant="body2"
        color="textSecondary"
        sx={{ mb: 1, textAlign: 'center' }}
      >
        OR
      </Typography>

      {/* Form */}
      <FlexBox component="form" onSubmit={handleSubmit} noValidate>
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
          disabled={isBusy}
        />

        <FlexBox mt={2}>
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
            disabled={isBusy}
          />
        </FlexBox>

        <FlexBox mt={2}>
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
            disabled={isBusy}
          />
        </FlexBox>

        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          disabled={isBusy}
          sx={{ mt: 3, mb: 2 }}
        >
          {isBusy ? 'Signing up...' : 'Sign up'}
        </Button>
      </FlexBox>

      {/* Footer */}
      <FlexBox
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
      </FlexBox>
    </AuthPageShell>
  );
};

SignUpPageTemplate.propTypes = {
  onGoogleSignUp: PropTypes.func.isRequired,
  onSignUp: PropTypes.func.isRequired, // { email, password }
  onSignInRedirect: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default SignUpPageTemplate;
