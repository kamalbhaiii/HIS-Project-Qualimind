import type { PropsWithChildren } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from '../theme/AppThemeProvider';

export default function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
