import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import DashboardSectionHeader from '../molecules/DashboardSectionHeader';
import FlexBox from '../atoms/FlexBox';

import AccountInfoPanel from '../organisms/AccountInfoPanel';
import PreferencesPanel from '../organisms/PreferencesPanel';
import ApiTokenPanel from '../organisms/ApiTokenPanel';
import ManageAccountDialog from '../organisms/ManageAccountDialog';

import { clearAuth, getToken, getUser } from '../../lib/authStorage';
import { useToast } from '../organisms/ToastProvider';
import { useAppTheme } from '../../theme/AppThemeProvider';

const SettingsPageTemplate = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { darkMode, setDarkMode } = useAppTheme();

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // Keep your other prefs local for now (you can persist later)
  const [compactMode, setCompactMode] = useState(true);
  const [defaultExportFormat, setDefaultExportFormat] = useState('csv');

  const [isManageAccountOpen, setIsManageAccountOpen] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setToken(getToken());
  }, []);

  const safeUser = useMemo(
    () => user || { name: '', email: '' },
    [user]
  );

  const handleLogout = () => {
    try {
      clearAuth();
      showToast('You have been logged out.', 'success');
      navigate('/sign-in', { replace: true });
    } catch {
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

  const handleUserUpdated = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <>
      <DashboardSectionHeader
        title="Settings"
        subtitle="Manage your account details and personal preferences"
      />

      <FlexBox
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1.2fr' },
          gap: { xs: 1.5, sm: 2 },
          alignItems: 'start',
        }}
      >
        <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 } }}>
          <AccountInfoPanel
            user={safeUser}
            onLogout={handleLogout}
            onManageAccount={handleManageAccount}
          />

          <PreferencesPanel
            darkMode={darkMode}
            onDarkModeChange={setDarkMode}
            compactMode={compactMode}
            onCompactModeChange={setCompactMode}
            defaultExportFormat={defaultExportFormat}
            onDefaultExportFormatChange={setDefaultExportFormat}
          />
        </FlexBox>

        <ApiTokenPanel token={token || ''} />
      </FlexBox>

      <ManageAccountDialog
        open={isManageAccountOpen}
        onClose={() => setIsManageAccountOpen(false)}
        user={user}
        onUserUpdated={handleUserUpdated}
      />
    </>
  );
};

export default SettingsPageTemplate;
