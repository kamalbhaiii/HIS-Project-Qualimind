import React from 'react';
import PropTypes from 'prop-types';

import FlexBox from '../atoms/FlexBox';
import SurfaceCard from '../atoms/SurfaceCard';
import Typography from '../atoms/CustomTypography';

import AppTopBar from '../organisms/AppTopBar';
import SidebarNav, { SIDEBAR_WIDTH } from '../organisms/SideBarNav';

import DashboardIcon from '@mui/icons-material/Dashboard';
import StorageIcon from '@mui/icons-material/Storage';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import SettingsIcon from '@mui/icons-material/Settings';
import Logo from '../atoms/Logo';
import LogoImage from "../../assets/logo.png"
import Box from '@mui/material/Box';

const DashboardLayout = ({ children }) => {
  // 🔧 IMPORTANT: adjust these paths to match your auto-routed URLs
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
        mt: 0,
        mx: 2,
        p: 0,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <Box
        component="img"
        src={LogoImage}
        alt="Logo"
        sx={{
          width: 120,
          height: 64,
          objectFit: 'contain',   // preserve aspect ratio
          display: 'block',
          mx: 'auto'
        }}
      />
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
          }}
        >
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
