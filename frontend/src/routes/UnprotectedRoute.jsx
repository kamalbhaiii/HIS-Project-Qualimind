import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';

import { isAuthenticated } from '../lib/authStorage';
import { useToast } from '../components/organisms/ToastProvider';

const UnprotectedRoute = ({ children }) => {
  const { showToast } = useToast();
  const authed = isAuthenticated();

  useEffect(() => {
    if (authed) {
      showToast("You are already signed in.", "info");
    }
  }, [authed]);

  if (authed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

UnprotectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default UnprotectedRoute;
