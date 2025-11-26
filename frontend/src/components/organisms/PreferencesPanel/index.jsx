import React from 'react';
import PropTypes from 'prop-types';

import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import ToggleRow from '../../molecules/ToggleRow';
import SelectRow from '../../molecules/SelectRow';

const PreferencesPanel = ({
  darkMode,
  onDarkModeChange,
  compactMode,
  onCompactModeChange,
  defaultExportFormat,
  onDefaultExportFormatChange,
}) => {
  return (
    <SurfaceCard sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Preferences
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Control how QualiMind looks and behaves for you.
      </Typography>

      <ToggleRow
        label="Dark mode"
        description="Use a dark theme for the dashboard."
        checked={darkMode}
        onChange={onDarkModeChange}
      />

      <ToggleRow
        label="Compact table rows"
        description="Reduce spacing in tables to see more rows at once."
        checked={compactMode}
        onChange={onCompactModeChange}
      />

      <SelectRow
        label="Default export format"
        description="Format used when exporting processed datasets by default."
        value={defaultExportFormat}
        onChange={onDefaultExportFormatChange}
        selectLabel="Export format"
        options={[
          { value: 'json', label: 'JSON' },
          { value: 'csv', label: 'CSV' },
          { value: 'txt', label: 'TXT' },
        ]}
      />
    </SurfaceCard>
  );
};

PreferencesPanel.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  onDarkModeChange: PropTypes.func.isRequired, // (bool) => void
  compactMode: PropTypes.bool.isRequired,
  onCompactModeChange: PropTypes.func.isRequired, // (bool) => void
  defaultExportFormat: PropTypes.string.isRequired,
  onDefaultExportFormatChange: PropTypes.func.isRequired, // (string) => void
};

export default PreferencesPanel;
