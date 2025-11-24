import React from 'react';
import PropTypes from 'prop-types';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

const drawerWidth = 240;

const SidebarNav = ({ items, headerContent }) => {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
        display: { xs: 'none', md: 'block' },
      }}
    >
      {headerContent}
      <List sx={{ mt: 2 }}>
        {items.map((item) => (
          <ListItem key={item.key} disablePadding>
            <ListItemButton
              selected={item.active}
              onClick={item.onClick}
              sx={{ py: 1.2 }}
            >
              {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

SidebarNav.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.node,
      active: PropTypes.bool,
      onClick: PropTypes.func,
    })
  ).isRequired,
  headerContent: PropTypes.node,
};

export const SIDEBAR_WIDTH = drawerWidth;

export default SidebarNav;
