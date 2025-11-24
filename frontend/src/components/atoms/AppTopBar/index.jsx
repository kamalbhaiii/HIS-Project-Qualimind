import React from 'react';
import PropTypes from 'prop-types';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import MuiTypography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';

const AppTopBar = ({ title, onMenuClick, rightContent }) => {
  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
      color="primary"
      elevation={1}
    >
      <Toolbar>
        {onMenuClick && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open navigation"
            onClick={onMenuClick}
            sx={{ mr: 2, display: { xs: 'inline-flex', md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
        )}
        <MuiTypography
          variant="h6"
          noWrap
          component="div"
          sx={{ flexGrow: 1, fontWeight: 600 }}
        >
          {title}
        </MuiTypography>
        {rightContent}
      </Toolbar>
    </AppBar>
  );
};

AppTopBar.propTypes = {
  title: PropTypes.string.isRequired,
  onMenuClick: PropTypes.func,
  rightContent: PropTypes.node,
};

export default AppTopBar;
