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
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(token);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to copy mock token:', err);
    }
  };

  return (
    <SurfaceCard sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        API token
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Use this token to authenticate your scripts or tools with the
        QualiMind API (mock-only value).
      </Typography>

      <FlexBox
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1,
            borderRadius: 1,
            bgcolor: 'background.default',
            border: (theme) => `1px dashed ${theme.palette.divider}`,
            fontFamily: 'monospace',
            fontSize: 13,
            maxWidth: '100%',
            overflowX: 'auto',
          }}
        >
          {token}
        </Box>
        <Button
          variant="outlined"
          color="primary"
          size="small"
          onClick={handleCopy}
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </FlexBox>

      <Typography variant="caption" color="textSecondary" sx={{ mt: 1.5 }}>
        In a real app, you would be able to rotate and revoke tokens. Here,
        the value is static and for design only.
      </Typography>
    </SurfaceCard>
  );
};

ApiTokenPanel.propTypes = {
  token: PropTypes.string.isRequired,
};

export default ApiTokenPanel;
