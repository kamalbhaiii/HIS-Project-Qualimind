import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';

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
              component={NavLink}
              to={item.to}
              // NavLink adds "active" class when URL matches
              sx={{
                py: 1.2,
                '&.active': {
                  bgcolor: (theme) =>
                    theme.palette.action.selected,
                },
              }}
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
      to: PropTypes.string.isRequired, // path
    })
  ).isRequired,
  headerContent: PropTypes.node,
};

export const SIDEBAR_WIDTH = drawerWidth;

export default SidebarNav;
