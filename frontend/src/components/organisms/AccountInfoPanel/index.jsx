import React from 'react';
import PropTypes from 'prop-types';

import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import FlexBox from '../../atoms/FlexBox';
import Button from '../../atoms/CustomButton';

const AccountInfoPanel = ({ user, onLogout, onManageAccount }) => {
  return (
    <SurfaceCard sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 1.25 }}>
        Account
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Basic information about your QualiMind account.
      </Typography>

      <FlexBox sx={{ mb: 1 }}>
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}
        >
          Name
        </Typography>
        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
          {user?.name}
        </Typography>
      </FlexBox>

      <FlexBox sx={{ mb: 2 }}>
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}
        >
          Email
        </Typography>
        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
          {user?.email}
        </Typography>
      </FlexBox>

      <FlexBox
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'auto auto' },
          justifyContent: { xs: 'stretch', sm: 'space-between' },
          gap: 1.25,
        }}
      >
        <Button variant="outlined" color="primary" size="small" onClick={onManageAccount} fullWidth>
          Manage account
        </Button>

        <Button variant="text" color="error" size="small" onClick={onLogout} fullWidth>
          Sign out
        </Button>
      </FlexBox>
    </SurfaceCard>
  );
};

AccountInfoPanel.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
  }),
  onLogout: PropTypes.func,
  onManageAccount: PropTypes.func,
};

export default AccountInfoPanel;
