import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';

import { isAuthenticated } from '../lib/authStorage';
import { useToast } from '../components/organisms/ToastProvider';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const { showToast } = useToast();
  const authed = isAuthenticated();

  useEffect(() => {
    if (!authed) {
      showToast("Please sign in to continue.", "error");
    }
  }, [authed]);

  if (!authed) {
    return (
      <Navigate
        to="/sign-in"
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ProtectedRoute;
