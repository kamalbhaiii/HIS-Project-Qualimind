import React from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import WbSunnyRoundedIcon from '@mui/icons-material/WbSunnyRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';

const ThemeModeSwitch = ({ checked, onChange, collapsed }) => {
  // checked === true => Dark mode ON => show Sun
  // checked === false => Light mode ON => show Moon
  const label = checked ? 'Switch to light mode' : 'Switch to dark mode';

  const handleToggle = () => onChange(!checked);

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 1,
        px: collapsed ? 0 : 1,
        py: 0.5,
      }}
    >
      {!collapsed && (
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          Theme
        </Typography>
      )}

      <Tooltip title={label} placement={collapsed ? 'right' : 'top'} arrow>
        <IconButton
          onClick={handleToggle}
          aria-label={label}
          size="small"
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            border: (t) => `1px solid ${t.palette.divider}`,
            bgcolor: (t) =>
              t.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(0,0,0,0.04)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Sun (visible when dark mode is ON) */}
          <Box
            component="span"
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              transition: (t) =>
                t.transitions.create(['opacity', 'transform'], {
                  duration: t.transitions.duration.shorter,
                  easing: t.transitions.easing.easeInOut,
                }),
              opacity: checked ? 1 : 0,
              transform: checked ? 'scale(1) rotate(0deg)' : 'scale(0.7) rotate(-40deg)',
              pointerEvents: 'none',
            }}
          >
            <WbSunnyRoundedIcon sx={{ color: '#FFD54F', fontSize: 20 }} />
          </Box>

          {/* Moon (visible when light mode is ON) */}
          <Box
            component="span"
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              transition: (t) =>
                t.transitions.create(['opacity', 'transform'], {
                  duration: t.transitions.duration.shorter,
                  easing: t.transitions.easing.easeInOut,
                }),
              opacity: checked ? 0 : 1,
              transform: checked ? 'scale(0.7) rotate(40deg)' : 'scale(1) rotate(0deg)',
              pointerEvents: 'none',
            }}
          >
            <DarkModeRoundedIcon sx={{ fontSize: 20 }} />
          </Box>
        </IconButton>
      </Tooltip>
    </Box>
  );
};

ThemeModeSwitch.propTypes = {
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  collapsed: PropTypes.bool,
};

ThemeModeSwitch.defaultProps = {
  collapsed: false,
};

export default ThemeModeSwitch;
