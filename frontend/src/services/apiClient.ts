import axios from 'axios';
import { API_BASE_URL, SERVER_TIMEOUT } from './config';
import { getToken } from '../lib/authStorage.js';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: SERVER_TIMEOUT,
});

// Attach token for all requests EXCEPT auth routes
api.interceptors.request.use(
  (config) => {
    const token = getToken();

    // ignore if calling login/signup routes
    const isAuthRoute =
      config.url?.includes('/auth/login') ||
      config.url?.includes('/auth/signup') ||
      config.url?.includes('/auth/google');

    if (token && !isAuthRoute) {
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
    console.error('API Error:', err?.response || err);
    return Promise.reject(err);
  }
);

export default api;
