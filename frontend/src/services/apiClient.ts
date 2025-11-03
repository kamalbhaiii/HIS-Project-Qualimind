import axios from 'axios';
import { API_BASE_URL, SERVER_TIMEOUT } from './config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: SERVER_TIMEOUT,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('API Error:', err);
    return Promise.reject(err);
  }
);

export default api;
