import axios from 'axios';
import { API_BASE_URL, SERVER_TIMEOUT } from './config';
import { getToken, clearAuth } from '../lib/authStorage.js';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: SERVER_TIMEOUT,
});

const isAuthRoute = (url = '') =>
  url.includes('/auth/login') ||
  url.includes('/auth/signup') ||
  url.includes('/auth/google');

// Attach token for all requests EXCEPT auth routes
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token && !isAuthRoute(config.url || '')) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global error handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const url = err?.config?.url || '';

    if (status === 401 && !isAuthRoute(url)) {
      clearAuth();
      window.location.href = '/sign-in?reason=session-expired';
    }

    return Promise.reject(err);
  }
);

export default api;
