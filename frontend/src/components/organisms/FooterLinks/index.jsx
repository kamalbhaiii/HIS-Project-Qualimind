import React from 'react';
import Box from '@mui/material/Box';
import LinkText from '../../molecules/LinkText';
import Typography from '../../atoms/CustomTypography';
import PropTypes from 'prop-types';

const FooterLinks = ({ onForgotPassword, onSignUp }) => {
  return (
    <Box
      sx={{ display: 'flex', justifyContent: 'space-between', px: 1, mb: 1 }}
      aria-label="Additional authentication links"
    >
      <LinkText onClick={onForgotPassword} href="#" variant="body2" color="textSecondary">
        Forgot password?
      </LinkText>
      <Typography variant="body2" color="textSecondary">
        Need an account?{' '}
        <LinkText onClick={onSignUp} href="#" variant="body2" color="primary">
          Sign up
        </LinkText>
      </Typography>
    </Box>
  );
};

FooterLinks.propTypes = {
  onForgotPassword: PropTypes.func.isRequired,
  onSignUp: PropTypes.func.isRequired,
};

export default FooterLinks;
