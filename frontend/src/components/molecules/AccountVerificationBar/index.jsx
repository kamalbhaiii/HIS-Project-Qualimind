import React from 'react';
import PropTypes from 'prop-types';

import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import FlexBox from '../../atoms/FlexBox';
import Button from '../../atoms/CustomButton';

const AccountVerificationBar = ({ onVerifyClick, loading }) => {
  return (
    <SurfaceCard
      sx={{
        mb: 2,
        px: 2,
        py: 1,
        borderRadius: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,

        // 🔴 RED DANGER BACKGROUND
        background: 'rgb(220, 38, 38)', // Tailwind red-600
        border: '1px solid rgba(0,0,0,0.15)',
        color: '#fff', // make all text default to white

        // subtle shadow for visibility
        boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
      }}
    >
      <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: '#fff' }} // white text
        >
          Your account is not verified
        </Typography>

        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
          Verify your email to unlock the full experience and keep your account secure.
        </Typography>
      </FlexBox>

      <Button
        size="small"
        variant="contained"
        color="secondary"
        onClick={onVerifyClick}
        disabled={loading}
        sx={{
          backgroundColor: '#fff !important',
          color: '#dc2626 !important', // red text on white button
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.9) !important',
          },
          fontWeight: 600,
        }}
      >
        {loading ? 'Sending…' : 'Verify now'}
      </Button>
    </SurfaceCard>
  );
};

AccountVerificationBar.propTypes = {
  onVerifyClick: PropTypes.func.isRequired, // () => void
  loading: PropTypes.bool, // optional
};

AccountVerificationBar.defaultProps = {
  loading: false,
};

export default AccountVerificationBar;
