import React from 'react';
import PropTypes from 'prop-types';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import MuiTypography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

const AppTopBar = ({ title, onMenuClick, onProfileClick }) => {
  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: '#00000061', 
        border: '3px solid black',
      }}
      color="normal"
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
          
        </MuiTypography>
        <IconButton
          edge="end"
          color="inherit"
          aria-label="user menu"
          onClick={onProfileClick}
        >
          <AccountCircleIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

AppTopBar.propTypes = {
  title: PropTypes.string.isRequired,
  onMenuClick: PropTypes.func,
  onProfileClick: PropTypes.func,
};

export default AppTopBar;
