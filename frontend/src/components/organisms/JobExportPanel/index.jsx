import React from 'react';
import PropTypes from 'prop-types';

import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import FlexBox from '../../atoms/FlexBox';
import ExportButtonsGroup from '../../molecules/ExportButtonsGroup';

const JobExportPanel = ({ onExport }) => {
  return (
    <SurfaceCard sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
        Export processed data
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Download the processed dataset in your preferred format. In a real
        setup, this will call the export APIs (JSON, CSV, TXT).
      </Typography>

      <FlexBox
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <ExportButtonsGroup onExport={onExport} />
        <Typography variant="caption" color="textSecondary">
          Exports currently mocked. No real network request is performed.
        </Typography>
      </FlexBox>
    </SurfaceCard>
  );
};

JobExportPanel.propTypes = {
  // format: 'json' | 'csv' | 'txt'
  onExport: PropTypes.func.isRequired,
};

export default JobExportPanel;
