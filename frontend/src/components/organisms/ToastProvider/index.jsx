import React from 'react';
import PropTypes from 'prop-types';
import { SnackbarProvider, enqueueSnackbar } from 'notistack';
import ToastMessage from '../../atoms/ToastMessage';

export const useToast = () => {
  return {
    showToast: (message, severity = 'info') => {
      enqueueSnackbar(message, {
        content: (key, msg) => (
          <ToastMessage severity={severity} message={msg} />
        ),
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 3000,
      });
    },
  };
};

const ToastProvider = ({ children }) => {
  return (
    <SnackbarProvider maxSnack={4}>
      {children}
    </SnackbarProvider>
  );
};

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ToastProvider;
