import React, { useState } from 'react';
import Box from '@mui/material/Box';
import InputFieldWithLabel from '../../molecules/InputFieldWithLabel';
import Button from '../../atoms/CustomButton';
import Icon from '../../atoms/Icon';
import PropTypes from 'prop-types';
import { faLock, faMessage } from '@fortawesome/free-solid-svg-icons';


const SignInForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });

  const validateEmail = (email) => {
    // Basic email regex for validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validate = () => {
    const newErrors = { email: '', password: '' };
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
      <InputFieldWithLabel
        label="Email"
        placeholder="you@example.com"
        value={formData.email}
        onChange={handleChange('email')}
        error={Boolean(errors.email)}
        helperText={errors.email}
        type="email"
        required
        icon={<Icon icon={faMessage} size='sm'/>}
        name="email"
        id="email"
        autoComplete="email"
        onBlur={handleBlur('email')}
        disabled={loading}
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
          icon={<Icon icon={faLock} size='sm' />}
          name="password"
          id="password"
          autoComplete="current-password"
          onBlur={handleBlur('password')}
          disabled={loading}
        />
      </Box>
      <Button
        type="submit"
        fullWidth
        variant="contained"
        color="primary"
        disabled={loading}
        sx={{ mt: 3, mb: 2 }}
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </Button>
    </Box>
  );
};

SignInForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default SignInForm;
