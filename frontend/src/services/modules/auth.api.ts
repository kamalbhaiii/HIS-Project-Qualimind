import api from "../apiClient";

export const loginUser = async ({ email, password }) => {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
};

export const signupUser = async ({ name, email, password }) => {
  const res = await api.post('/auth/signup', { name, email, password });
  return res.data;
};

export const getGoogleAuthUrl = async () => {
  const res = await api.get('/auth/google/url');
  return res.data;
};

export const handleGoogleCallback = async (code) => {
  const res = await api.get(`/auth/google/callback?code=${code}`);
  return res.data;
};