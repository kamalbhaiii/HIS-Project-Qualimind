import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

import AuthPageShell from './AuthPageShell';
import FlexBox from '../atoms/FlexBox';
import InputFieldWithLabel from '../molecules/InputFieldWithLabel';
import Button from '../atoms/CustomButton';
import Icon from '../atoms/Icon';
import LinkText from '../molecules/LinkText';
import Typography from '../atoms/CustomTypography';
import SocialSignInButton from '../molecules/SocialSigninButton';

import { signupUser } from '../../services/modules/auth.api';
import { saveAuth } from '../../lib/authStorage';
import { useToast } from '../organisms/ToastProvider';
import { faMessage, faUser, faLock } from '@fortawesome/free-solid-svg-icons';
import logoImage from '../../assets/logo.png';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SignUpPageTemplate = ({
  onGoogleSignUp,
  onSignInRedirect,
  loading: externalLoading = false,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    form: '',
  });

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { showToast } = useToast();

  // -----------------------
  // VALIDATION
  // -----------------------
  const validate = () => {
    const newErrors = {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      form: '',
    };

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

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

    return (
      !newErrors.name &&
      !newErrors.email &&
      !newErrors.password &&
      !newErrors.confirmPassword
    );
  };

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: '', form: '' }));
    }
  };

  const handleBlur = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validate();
  };

  // -----------------------
  // SUBMIT HANDLER
  // -----------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const res = await signupUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      const { name } = res;

      showToast(`You're in ${name}! Let's get started.`, 'success');

      navigate('/sign-in', { replace: true });
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        'Failed to sign up. Please try again.';

      setErrors((prev) => ({ ...prev, form: apiMessage }));
      showToast(apiMessage, 'error');
    } finally {
      setLoading(false);
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
            alignItems: 'center',
            justifyContent: 'center',
            display: 'flex',
          }}
        >
          <img
            src={logoImage}
            alt="QualiMind Logo"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </FlexBox>

        <Typography variant="h5" fontWeight={700}>
          Create your QualiMind account
        </Typography>

        <Typography variant="body2" color="textSecondary">
          Sign up to get started
        </Typography>
      </FlexBox>

      {/* Google Sign Up */}
      <SocialSignInButton onClick={handleGoogleSignUp} loading={isBusy} />

      <Typography
        variant="body2"
        textAlign="center"
        sx={{ my: 1.5 }}
        color="textSecondary"
      >
        OR
      </Typography>

      {/* Form */}
      <FlexBox component="form" onSubmit={handleSubmit} noValidate>
        
        {/* Name */}
        <InputFieldWithLabel
          label="Full Name"
          placeholder="John Doe"
          value={formData.name}
          onChange={handleChange('name')}
          onBlur={handleBlur('name')}
          error={Boolean(errors.name)}
          helperText={errors.name}
          icon={<Icon icon={faUser} size='sm'/>}
          name="name"
          id="name"
          required
          disabled={isBusy}
        />

        {/* Email */}
        <FlexBox mt={2}>
          <InputFieldWithLabel
            label="Email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange('email')}
            onBlur={handleBlur('email')}
            error={Boolean(errors.email)}
            helperText={errors.email}
            //icon={<Icon icon={faMessage} size='sm' />}
            type="email"
            name="email"
            id="email"
            autoComplete="email"
            required
            disabled={isBusy}
          />
        </FlexBox>

        {/* Password */}
        <FlexBox mt={2}>
          <InputFieldWithLabel
            label="Password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange('password')}
            onBlur={handleBlur('password')}
            error={Boolean(errors.password)}
            helperText={errors.password}
            icon={<Icon icon={faLock} size='sm' />}
            type="password"
            name="password"
            required
            disabled={isBusy}
          />
        </FlexBox>

        {/* Confirm Password */}          
        <FlexBox mt={2} mb={2}>
          <InputFieldWithLabel
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={formData.confirmPassword}
            onChange={handleChange('confirmPassword')}
            onBlur={handleBlur('confirmPassword')}
            error={Boolean(errors.confirmPassword)}
            helperText={errors.confirmPassword}
            icon={<Icon icon={faLock} size='sm' />}
            type="password"
            name="confirmPassword"
            required
            disabled={isBusy}
          />
        </FlexBox>

        {/* Form-level error */}
        {errors.form && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {errors.form}
          </Typography>
        )}

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={isBusy}
          sx={{ mt: 3 }}
        >
          {isBusy ? 'Signing up...' : 'Sign up'}
        </Button>
      </FlexBox>

      {/* Footer */}
      <FlexBox sx={{ justifyContent: 'center', mt: 2 }}>
        <Typography variant="body2" color="textSecondary">
          Already have an account?
        </Typography>

        <LinkText
          href="#"
          color="primary"
          onClick={(e) => {
            e.preventDefault();
            onSignInRedirect();
          }}
          sx={{ ml: 1 }}
        >
          Sign in
        </LinkText>
      </FlexBox>
    </AuthPageShell>
  );
};

SignUpPageTemplate.propTypes = {
  onGoogleSignUp: PropTypes.func.isRequired,
  onSignInRedirect: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default SignUpPageTemplate;
