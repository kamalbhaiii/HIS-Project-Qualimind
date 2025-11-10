import React from 'react';
import SocialSignInButton from '../../molecules/SocialSigninButton';
import DividerWithText from '../../atoms/DividerWithText';
import PropTypes from 'prop-types';

const SocialLoginSection = ({ onGoogleSignIn, loading }) => {
  return (
    <>
      <SocialSignInButton onClick={onGoogleSignIn} disabled={loading} loading={loading} />
      <DividerWithText text="OR" />
    </>
  );
};

SocialLoginSection.propTypes = {
  onGoogleSignIn: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default SocialLoginSection;
