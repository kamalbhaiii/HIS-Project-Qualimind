// src/components/templates/SettingsPageTemplate.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import DashboardLayout from '../templates/DashboardLayout';
import DashboardSectionHeader from '../molecules/DashboardSectionHeader';
import FlexBox from '../atoms/FlexBox';

import AccountInfoPanel from '../organisms/AccountInfoPanel';
import PreferencesPanel from '../organisms/PreferencesPanel';
import ApiTokenPanel from '../organisms/ApiTokenPanel';
import ManageAccountDialog from '../organisms/ManageAccountDialog';

import { clearAuth, getToken, getUser } from '../../lib/authStorage';
import { useToast } from '../organisms/ToastProvider';
// optional: you could also use getMe() here instead of getUser()

const SettingsPageTemplate = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const [darkMode, setDarkMode] = useState(false);
  const [compactMode, setCompactMode] = useState(true);
  const [defaultExportFormat, setDefaultExportFormat] = useState('csv');

  const [isManageAccountOpen, setIsManageAccountOpen] = useState(false);

  useEffect(() => {
    const storedUser = getUser();
    const storedToken = getToken();
    setUser(storedUser);
    setToken(storedToken);
  }, []);

  const handleLogout = () => {
    try {
      clearAuth();
      showToast('You have been logged out.', 'success');
      navigate('/sign-in', { replace: true });
    } catch (err) {
      showToast('Error during logout. Please try again.', 'error');
    }
  };

  const handleManageAccount = () => {
    if (!user) {
      showToast('User information not available.', 'warning');
      return;
    }
    setIsManageAccountOpen(true);
  };

  const handleManageAccountClose = () => {
    setIsManageAccountOpen(false);
  };

  const handleUserUpdated = (updatedUser) => {
    setUser(updatedUser);
    // TODO: also update user in local storage/authStorage if you store it there
    // e.g. setAuth({ user: updatedUser, token })
  };

  const handleDarkModeChange = (val) => {
    setDarkMode(val);
  };

  const handleCompactModeChange = (val) => {
    setCompactMode(val);
  };

  const handleDefaultExportFormatChange = (val) => {
    setDefaultExportFormat(val);
  };

  return (
    <DashboardLayout activeKey="settings">
      <DashboardSectionHeader
        title="Settings"
        subtitle="Manage your account details and personal preferences"
      />

      <FlexBox
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1.5fr' },
          gap: 2,
        }}
      >
        <FlexBox sx={{ display: 'flex', flexDirection: 'column' }}>
          <AccountInfoPanel
            user={user || { name: '', email: '' }}
            onLogout={handleLogout}
            onManageAccount={handleManageAccount}
          />

          <PreferencesPanel
            darkMode={darkMode}
            onDarkModeChange={handleDarkModeChange}
            compactMode={compactMode}
            onCompactModeChange={handleCompactModeChange}
            defaultExportFormat={defaultExportFormat}
            onDefaultExportFormatChange={handleDefaultExportFormatChange}
          />
        </FlexBox>

        <ApiTokenPanel token={token || ''} />
      </FlexBox>

      <ManageAccountDialog
        open={isManageAccountOpen}
        onClose={handleManageAccountClose}
        user={user}
        onUserUpdated={handleUserUpdated}
      />
    </DashboardLayout>
  );
};

export default SettingsPageTemplate;
