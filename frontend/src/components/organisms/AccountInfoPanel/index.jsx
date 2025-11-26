import React from 'react';
import PropTypes from 'prop-types';

import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import FlexBox from '../../atoms/FlexBox';
import Button from '../../atoms/CustomButton';

const AccountInfoPanel = ({ user, onLogout }) => {
  return (
    <SurfaceCard sx={{ p: 3, borderRadius: 2, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Account
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Basic information about your QualiMind account.
      </Typography>

      <FlexBox sx={{ mb: 1 }}>
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{
            textTransform: 'uppercase',
            letterSpacing: 0.4,
          }}
        >
          Name
        </Typography>
        <Typography variant="body2">{user.name}</Typography>
      </FlexBox>

      <FlexBox sx={{ mb: 2 }}>
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{
            textTransform: 'uppercase',
            letterSpacing: 0.4,
          }}
        >
          Email
        </Typography>
        <Typography variant="body2">{user.email}</Typography>
      </FlexBox>

      <FlexBox
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Button variant="outlined" color="primary" size="small">
          Manage account
        </Button>
        <Button
          variant="text"
          color="error"
          size="small"
          onClick={onLogout}
        >
          Sign out
        </Button>
      </FlexBox>
    </SurfaceCard>
  );
};

AccountInfoPanel.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
  }).isRequired,
  onLogout: PropTypes.func, // () => void
};

export default AccountInfoPanel;
