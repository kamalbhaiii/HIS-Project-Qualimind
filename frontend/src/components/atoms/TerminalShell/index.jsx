import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';

export default function TerminalShell({ children, height = 360 }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        border: `1px solid ${theme.palette.divider}`,
        background: isDark ? '#0B1020' : '#0B1020', // keep terminal feel in both modes
        color: '#E6EDF3',
        boxShadow: 1,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.25,
          py: 1,
          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)',
          borderBottom: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: 999, background: '#FF5F56' }} />
          <Box sx={{ width: 10, height: 10, borderRadius: 999, background: '#FFBD2E' }} />
          <Box sx={{ width: 10, height: 10, borderRadius: 999, background: '#27C93F' }} />
        </Box>
        <Box sx={{ fontSize: 12, opacity: 0.9, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
          AI Suggestion Console
        </Box>
      </Box>

      {/* Body */}
      <Box
        sx={{
          height,
          overflowY: 'auto',
          px: 1.5,
          py: 1.25,
          fontSize: 13,
          lineHeight: 1.6,
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

TerminalShell.propTypes = {
  children: PropTypes.node,
  height: PropTypes.number,
};
