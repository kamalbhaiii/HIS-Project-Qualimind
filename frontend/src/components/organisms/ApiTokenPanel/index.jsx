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
        QualiMind API.
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
    width: '100%',          // 🔥 Force full width of parent
    maxWidth: 300,          // 🔥 Prevent stretching
    whiteSpace: 'nowrap',   // 🔥 No line breaks
    overflow: 'hidden',     // 🔥 Hide full token
    textOverflow: 'ellipsis', // 🔥 Show "..."
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
    </SurfaceCard>
  );
};

ApiTokenPanel.propTypes = {
  token: PropTypes.string.isRequired,
};

export default ApiTokenPanel;
