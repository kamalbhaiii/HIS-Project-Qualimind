import React from 'react';
import CustomButton from '../../atoms/CustomButton';
import GoogleIcon from '@mui/icons-material/Google';
import PropTypes from 'prop-types';

const SocialSignInButton = ({ onClick, disabled, loading }) => {
  return (
    <CustomButton
      variant="outlined"
      fullWidth
      onClick={onClick}
      disabled={disabled || loading}
      startIcon={<GoogleIcon color="error" />}
      aria-label="Continue with Google"
      sx={{
        textTransform: 'none',
        fontWeight: 600,
        py: 1.1,
      }}
    >
      {loading ? 'Loading...' : 'Continue with Google'}
    </CustomButton>
  );
};

SocialSignInButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
};

export default SocialSignInButton;
