import axios from 'axios';
import { API_BASE_URL, SERVER_TIMEOUT } from './config';
import { getToken, clearAuth } from '../lib/authStorage.js';
import {useToast} from "../components/organisms/ToastProvider";

const {showToast} = useToast();

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
    const status = err?.response?.status;

    if (status === 401) {
      // clear stored auth (tokens, user, etc.)
      clearAuth();

      showToast('Your session is expried. Please sign-in again.')

      // hard redirect to sign-in page
      window.location.href = '/sign-in';
    }

    return Promise.reject(err);
  }
);

export default api;
