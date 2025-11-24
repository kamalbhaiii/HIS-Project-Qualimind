import React, { useState } from 'react';

import DashboardLayout from '../templates/DashboardLayout';
import DashboardSectionHeader from '../molecules/DashboardSectionHeader';
import FlexBox from '../atoms/FlexBox';

import AccountInfoPanel from '../organisms/AccountInfoPanel';
import PreferencesPanel from '../organisms/PreferencesPanel';
import ApiTokenPanel from '../organisms/ApiTokenPanel';

const SettingsPageTemplate = () => {
  // Mock user
  const user = {
    name: 'Alex Johnson',
    email: 'alex.johnson@example.com',
  };

  // Mock local state for preferences
  const [darkMode, setDarkMode] = useState(false);
  const [compactMode, setCompactMode] = useState(true);
  const [defaultExportFormat, setDefaultExportFormat] = useState('csv');

  const mockToken = 'qm_test_1234567890abcdef1234567890abcdef';

  const handleLogout = () => {
    // Later: call real logout / clear tokens
    // eslint-disable-next-line no-console
    console.log('Mock logout clicked');
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

        <ApiTokenPanel token={mockToken} />
      </FlexBox>
    </DashboardLayout>
  );
};

export default SettingsPageTemplate;
