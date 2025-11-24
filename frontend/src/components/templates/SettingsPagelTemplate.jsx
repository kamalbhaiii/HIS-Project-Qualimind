import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import DashboardLayout from '../templates/DashboardLayout';
import DashboardSectionHeader from '../molecules/DashboardSectionHeader';
import FlexBox from '../atoms/FlexBox';

import AccountInfoPanel from '../organisms/AccountInfoPanel';
import PreferencesPanel from '../organisms/PreferencesPanel';
import ApiTokenPanel from '../organisms/ApiTokenPanel';
import { clearAuth, getToken, getUser } from '../../lib/authStorage';
import { useToast } from '../organisms/ToastProvider';

const SettingsPageTemplate = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, setUser] = useState('Loading...')
  const [token, setToken] = useState('Loading...')

  useEffect(()=>{
    setUser(getUser())
    setToken(getToken())
  },[])


  // Mock local state for preferences
  const [darkMode, setDarkMode] = useState(false);
  const [compactMode, setCompactMode] = useState(true);
  const [defaultExportFormat, setDefaultExportFormat] = useState('csv');

  const handleLogout = () => {
    try{
      clearAuth();
      showToast('You have been logged out.', 'success');
      navigate('/sign-in', { replace: true });
    }
    catch(err){
      showToast('Error during logout. Please try again.', 'error');
    }
  };

  const handleDarkModeChange = (val) => {
    setDarkMode(val);
    // Later: persist in user profile / theme context
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
          <AccountInfoPanel user={user} onLogout={handleLogout} />

          <PreferencesPanel
            darkMode={darkMode}
            onDarkModeChange={handleDarkModeChange}
            compactMode={compactMode}
            onCompactModeChange={handleCompactModeChange}
            defaultExportFormat={defaultExportFormat}
            onDefaultExportFormatChange={handleDefaultExportFormatChange}
          />
        </FlexBox>

        <ApiTokenPanel token={token} />
      </FlexBox>
    </DashboardLayout>
  );
};

export default SettingsPageTemplate;
