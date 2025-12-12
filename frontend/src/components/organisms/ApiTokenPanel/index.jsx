import React, { useState } from 'react';
import PropTypes from 'prop-types';

import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import FlexBox from '../../atoms/FlexBox';
import Button from '../../atoms/CustomButton';
import Box from '@mui/material/Box';

const ApiTokenPanel = ({ token }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(token);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      // ignore
    }
  };

  return (
    <SurfaceCard sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 1.25 }}>
        API token
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Use this token to authenticate your scripts or tools with the QualiMind API.
      </Typography>

      <FlexBox
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr auto' },
          gap: 1.25,
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1,
            borderRadius: 1,
            bgcolor: 'background.default',
            border: (t) => `1px dashed ${t.palette.divider}`,
            fontFamily: 'monospace',
            fontSize: 13,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            width: '100%',
            minWidth: 0,
          }}
          title={token}
        >
          {token}
        </Box>

        <Button variant="outlined" color="primary" size="small" onClick={handleCopy} fullWidth>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </FlexBox>
    </SurfaceCard>
  );
};

ApiTokenPanel.propTypes = {
  token: PropTypes.string.isRequired,
};

export default ApiTokenPanel;
