import type { PropsWithChildren } from 'react';
import { Box, CssBaseline, Drawer, AppBar, Toolbar, Typography } from '@mui/material';

const drawerWidth = 240;

export default function AppShell({ children }: PropsWithChildren) {
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', p: 2 }}>Sidebar Content</Box>
      </Drawer>

      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="fixed" sx={{ ml: `${drawerWidth}px` }}>
          <Toolbar>
            <Typography variant="h6" noWrap>
              QualiMind
            </Typography>
          </Toolbar>
        </AppBar>

        <Toolbar />
        <Box component="main" sx={{ p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
