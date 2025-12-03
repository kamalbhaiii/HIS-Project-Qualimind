import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import FlexBox from '../atoms/FlexBox';
import SurfaceCard from '../atoms/SurfaceCard';
import AppTopBar from '../organisms/AppTopBar';
import SidebarNav, { SIDEBAR_WIDTH } from '../organisms/SideBarNav';

import DashboardIcon from '@mui/icons-material/Dashboard';
import StorageIcon from '@mui/icons-material/Storage';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import SettingsIcon from '@mui/icons-material/Settings';
import Logo from '../atoms/Logo';
import LogoImage from '../../assets/logo.png';

import { getAuth } from '../../lib/authStorage';
import AccountVerificationBar from '../molecules/AccountVerificationBar';
import { useToast } from '../organisms/ToastProvider';
import {resendVerificationMail} from '../../services/modules/auth.api'
// import { requestEmailVerification } from '../../services/modules/auth.api';

const DashboardLayout = ({ children }) => {
  const [showVerificationBar, setShowVerificationBar] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    const { user } = getAuth();
    if (user && user.verified === false) {
      setShowVerificationBar(true);
    } else {
      setShowVerificationBar(false);
    }
  }, []);

  const handleVerifyClick = async () => {
    try {
      setVerifyLoading(true);
      await resendVerificationMail();
      showToast('Verification email sent. Please check your inbox.', 'success');
    } catch (err) {
      const message =
        err?.response?.data?.message || 'Failed to send verification email.';
      showToast(message, 'error');
    } finally {
      setVerifyLoading(false);
    }
  };

  const navItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      to: '/dashboard',
    },
    {
      key: 'datasets',
      label: 'Datasets',
      icon: <StorageIcon />,
      to: '/datasets',
    },
    {
      key: 'jobs',
      label: 'Jobs',
      icon: <WorkHistoryIcon />,
      to: '/jobs',
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <SettingsIcon />,
      to: '/settings',
    },
  ];

  return (
    <FlexBox
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      {/* Sidebar */}
      <SidebarNav
        items={navItems}
        headerContent={
          <SurfaceCard
            elevation={0}
            sx={{
              mt: 1,
              mx: 2,
              px: 2,
              py: 1.5,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Logo size={32} src={LogoImage} />
          </SurfaceCard>
        }
      />

      {/* Main area */}
      <FlexBox sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AppTopBar title="QualiMind" />

        <FlexBox
          component="main"
          sx={{
            flex: 1,
            p: 3,
            mt: 8, // space for AppBar
            width: { md: `calc(115% - ${SIDEBAR_WIDTH}px)` },
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {showVerificationBar && (
            <AccountVerificationBar
              onVerifyClick={handleVerifyClick}
              loading={verifyLoading}
            />
          )}

          {children}
        </FlexBox>
      </FlexBox>
    </FlexBox>
  );
};

DashboardLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default DashboardLayout;
