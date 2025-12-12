import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';

import SurfaceCard from '../../components/atoms/SurfaceCard';
import SidebarNav from '../../components/organisms/SideBarNav';

import DashboardIcon from '@mui/icons-material/Dashboard';
import StorageIcon from '@mui/icons-material/Storage';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import SettingsIcon from '@mui/icons-material/Settings';

import Logo from '../../components/atoms/Logo';
import LogoImage from '../../assets/logo.png';

import { getToken, saveAuth } from '../../lib/authStorage';
import AccountVerificationBar from '../../components/molecules/AccountVerificationBar';
import { useToast } from '../../components/organisms/ToastProvider';

import { getMe, resendVerificationMail } from '../../services/modules/auth.api';
import { getJobs } from '../../services/modules/job.api';
import { getDatasets } from '../../services/modules/dataset.api';

export const DashboardContext = createContext(null);
export const useDashboard = () => useContext(DashboardContext);

const LS_KEYS = {
  collapsed: 'qm.sidebar.collapsed',
};

const readLSBool = (key, fallback = false) => {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === 'true';
  } catch {
    return fallback;
  }
};

const DashboardLayout = ({ children }) => {
  const [showVerificationBar, setShowVerificationBar] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [me, setMe] = useState();
  const [jobs, setJobs] = useState([]);
  const [datasets, setDatasets] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sidebar: collapsed by default, persisted
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    readLSBool(LS_KEYS.collapsed, true)
  );

  const { showToast } = useToast();
  const showToastRef = useRef(showToast);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.collapsed, String(sidebarCollapsed));
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed]);

  // Fetch user once
  useEffect(() => {
    let cancelled = false;

    const fetchMe = async () => {
      try {
        const token = getToken();
        const user = await getMe();
        if (cancelled) return;

        setMe((prev) => {
          if (prev?.id === user?.id && prev?.emailVerified === user?.emailVerified) return prev;
          return user;
        });

        if (user && user.emailVerified === false) {
          saveAuth({ token, user });
          setShowVerificationBar(true);
        } else {
          setShowVerificationBar(false);
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err?.message || 'Failed to load user information';
        setError(msg);
        showToastRef.current?.(msg, 'error');
      }
    };

    fetchMe();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    if (!me?.id) return;

    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [jobsRes, datasetsRes] = await Promise.all([getJobs(), getDatasets()]);

        if (!cancelled) {
          setJobs(jobsRes || []);
          setDatasets(datasetsRes || []);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err?.message || 'Failed to load dashboard data';
          setError(msg);
          showToastRef.current?.(msg, 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [me?.id]);

  const handleVerifyClick = async () => {
    try {
      setVerifyLoading(true);
      await resendVerificationMail();
      showToastRef.current?.('Verification email sent. Please check your inbox.', 'success');
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to send verification email.';
      showToastRef.current?.(message, 'error');
    } finally {
      setVerifyLoading(false);
    }
  };

  const navItems = useMemo(
    () => [
      { key: 'dashboard', label: 'Dashboard', icon: <DashboardIcon />, to: '/dashboard' },
      { key: 'datasets', label: 'Datasets', icon: <StorageIcon />, to: '/datasets' },
      { key: 'jobs', label: 'Jobs', icon: <WorkHistoryIcon />, to: '/jobs' },
      { key: 'settings', label: 'Settings', icon: <SettingsIcon />, to: '/settings' },
    ],
    []
  );

  return (
    <DashboardContext.Provider
      value={{
        me,
        setMe,
        jobs,
        setJobs,
        datasets,
        setDatasets,
        loading,
        setLoading,
        error,
        setError,
        sidebarCollapsed,
        setSidebarCollapsed,
      }}
    >
      <CssBaseline />
      {/* Ensure the browser window doesn't scroll; only the Page region does */}
      <GlobalStyles
        styles={{
          'html, body, #root': {
            height: '100%',
            overflow: 'hidden',
          },
        }}
      />

      {/* Root: full viewport, no browser scroll */}
      <Box
        sx={{
          display: 'flex',
          height: '100vh',
          overflow: 'hidden',
          bgcolor: 'background.default',
        }}
      >
        {/* Sidebar: fixed (no scroll) */}
        <SidebarNav
          items={navItems}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          headerContentExpanded={<Logo size={32} src={LogoImage} />}
        />

        {/* Page: the ONLY scroll container */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            height: '100vh',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {/* Page padding + max width inside the scroller */}
          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              py: { xs: 2, sm: 3 },
              maxWidth: 1200,
              mx: 'auto',
              width: '100%',
            }}
          >
            {showVerificationBar && (
              <AccountVerificationBar onVerifyClick={handleVerifyClick} loading={verifyLoading} />
            )}

            <SurfaceCard
              elevation={0}
              sx={{
                borderRadius: 3,
                border: (t) => `1px solid ${t.palette.divider}`,
                bgcolor: 'background.paper',
                p: { xs: 2, sm: 3 },
              }}
            >
              {children}
            </SurfaceCard>
          </Box>
        </Box>
      </Box>
    </DashboardContext.Provider>
  );
};

DashboardLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default DashboardLayout;
