import React, { useState } from 'react';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '../atoms/CustomTypography';
import Button from '../atoms/CustomButton';
import TextField from '../atoms/CustomTextField';
import DividerWithText from '../atoms/DividerWithText';
import { EmailIcon, LockIcon, LogoIcon } from '../atoms/Icon';
import SocialSignInButton from '../molecules/SocialSigninButton';
import InputFieldWithLabel from '../molecules/InputFieldWithLabel';
import LinkText from '../molecules/LinkText';
import SignInForm from '../organisms/SignInForm';
import HeaderSection from '../organisms/HeaderSection';
import SocialLoginSection from '../organisms/SocialLoginSection';
import FooterLinks from '../organisms/FooterLinks';
import SignInPageTemplate from './SigninPageTemplate';
import SignUpPageTemplate from './SignupPageTemplate';

const TestPageTemplate = () => {
  // State for demonstrating button loading states and disabling
  const [btnLoading, setBtnLoading] = useState(false);

  // For SignInForm submission state
  const [signInLoading, setSignInLoading] = useState(false);

  // For SignUpForm submission and loading
  const [signUpLoading, setSignUpLoading] = useState(false);

  // Handlers demonstrating asynchronous actions (mocks)
  const simulateAsyncAction = (delay = 1500) =>
    new Promise((res) => setTimeout(res, delay));

  // Button click demonstrating loading & disabled state
  const handleButtonClick = async () => {
    setBtnLoading(true);
    await simulateAsyncAction();
    setBtnLoading(false);
  };

  // Social sign in handler
  const handleGoogleSignIn = async () => {
    alert('Google sign-in triggered!');
    await simulateAsyncAction();
  };

  // Sign in form submit
  const handleSignInSubmit = async (data) => {
    setSignInLoading(true);
    alert(`Sign in with: Email: ${data.email}, Password: ${data.password}`);
    await simulateAsyncAction();
    setSignInLoading(false);
  };

  // Forgot password handler
  const handleForgotPassword = () => {
    alert('Forgot password link clicked!');
  };

  // Sign up redirect handler
  const handleSignUpRedirect = () => {
    alert('Redirect to Sign Up page!');
  };

  // Sign up form submit
  const handleSignUpSubmit = async (data) => {
    setSignUpLoading(true);
    alert(`Sign up with: Email: ${data.email}, Password: ${data.password}`);
    await simulateAsyncAction();
    setSignUpLoading(false);
  };

  // Google sign up handler
  const handleGoogleSignUp = async () => {
    alert('Google sign-up triggered!');
    await simulateAsyncAction();
  };

  // Sign in redirect
  const handleSignInRedirect = () => {
    alert('Redirect to Sign In page!');
  };

  return (
    <Container maxWidth="md" sx={{ py: 6, bgcolor: '#f8faff' }}>
      <Paper sx={{ p: 4, borderRadius: 3, mb: 6 }} elevation={4}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Atoms - Buttons and TextFields
        </Typography>
        <Typography variant="body1" paragraph>
          This section demonstrates basic atom components with loading, disabled, and normal states.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button onClick={handleButtonClick} loading={btnLoading} disabled={btnLoading} fullWidth={false}>
            {btnLoading ? 'Loading...' : 'Default Button'}
          </Button>
          <Button variant="outlined" color="secondary" disabled>
            Disabled Outlined Button
          </Button>
          <Button variant="text" color="error">
            Text Button
          </Button>
        </Box>

        <Box sx={{ mt: 4, maxWidth: 400 }}>
          <TextField
            label="Email Input"
            placeholder="you@example.com"
            value=""
            onChange={() => {}}
            helperText="Helper text example"
            required
            InputProps={{ startAdornment: <EmailIcon sx={{ mr: 1 }} /> }}
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 4, borderRadius: 3, mb: 6 }} elevation={4}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Molecules - SocialSignInButton, InputFieldWithLabel, LinkText
        </Typography>
        <Typography variant="body1" paragraph>
          This section shows the combination of atoms into molecules with icons, start adornments, and clickable links.
        </Typography>

        <SocialSignInButton onClick={() => alert('Google Sign-In Clicked')} />
        <Box sx={{ mt: 2, maxWidth: 400 }}>
          <InputFieldWithLabel
            label="Email"
            placeholder="you@example.com"
            value=""
            onChange={() => {}}
            icon={<EmailIcon sx={{ mr: 1, color: 'action.active' }} />}
            required
          />
        </Box>
        <Box sx={{ mt: 2, maxWidth: 400 }}>
          <InputFieldWithLabel
            label="Password"
            placeholder="Enter your password"
            value=""
            onChange={() => {}}
            icon={<LockIcon sx={{ mr: 1, color: 'action.active' }} />}
            required
            type="password"
          />
        </Box>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', maxWidth: 400 }}>
          <LinkText href="#" onClick={() => alert('Clicked Forgot Password')}>
            Forgot password?
          </LinkText>
          <LinkText href="#" onClick={() => alert('Clicked Sign up')}>
            Sign up
          </LinkText>
        </Box>
      </Paper>

      <Paper sx={{ p: 4, borderRadius: 3, mb: 6 }} elevation={4}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Organisms - SignInForm, HeaderSection, SocialLoginSection, FooterLinks
        </Typography>
        <Typography variant="body1" paragraph>
          Complex grouped components combining molecules and atoms. Includes validation and loading states.
        </Typography>

        <Box sx={{ maxWidth: 400, mx: 'auto' }}>
          <HeaderSection />
          <SocialLoginSection onGoogleSignIn={handleGoogleSignIn} loading={signInLoading} />
          <SignInForm onSubmit={handleSignInSubmit} loading={signInLoading} />
          <FooterLinks onForgotPassword={handleForgotPassword} onSignUp={handleSignUpRedirect} />
        </Box>
      </Paper>

      <Paper sx={{ p: 4, borderRadius: 3 }} elevation={4}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Templates - SignInPageTemplate and SignUpPageTemplate
        </Typography>
        <Typography variant="body1" paragraph>
          Full page templates including header, forms, social login, and footers fully integrated with loading states and callbacks.
        </Typography>

        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
          Sign In Page Template
        </Typography>
        <Paper sx={{ maxWidth: 400, mx: 'auto', p: 3, mb: 4 }} elevation={3}>
          <SignInPageTemplate
            onGoogleSignIn={handleGoogleSignIn}
            onSignIn={handleSignInSubmit}
            onForgotPassword={handleForgotPassword}
            onSignUp={handleSignUpRedirect}
          />
        </Paper>

        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
          Sign Up Page Template
        </Typography>
        <Paper sx={{ maxWidth: 400, mx: 'auto', p: 3 }} elevation={3}>
          <SignUpPageTemplate
            onGoogleSignUp={handleGoogleSignUp}
            onSignUp={handleSignUpSubmit}
            onSignInRedirect={handleSignInRedirect}
            loading={signUpLoading}
          />
        </Paper>
      </Paper>
    </Container>
  );
};

export default TestPageTemplate;
