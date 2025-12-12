import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import ToastProvider  from './components/organisms/ToastProvider';
import AppThemeProvider from './theme/AppThemeProvider'
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>  
    <AppThemeProvider>
    <ToastProvider>  
      <AppRoutes />
      </ToastProvider>
      </AppThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
