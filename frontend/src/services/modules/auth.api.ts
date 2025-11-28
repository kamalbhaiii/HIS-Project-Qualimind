// src/services/modules/auth.api.ts
import api from '../apiClient';

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

export const getMe = async () => {
  const res = await api.get('/auth/me');
  return res.data;
};

export const deleteMe = async () => {
  const res = await api.delete('/auth/me');
  return res.data;
};

// 🔹 NEW: accept payloads for updates

export const updateMyName = async ({ name }) => {
  const res = await api.put('/auth/me/name', { name });
  return res.data; // { id, email, name }
};

export const updateMyEmail = async ({ newEmail, currentPassword }) => {
  const res = await api.put('/auth/me/email', { newEmail, currentPassword });
  return res.data; // { id, email, name }
};

export const updateMyPassword = async ({ currentPassword, newPassword }) => {
  const res = await api.put('/auth/me/password', {
    currentPassword,
    newPassword,
  });
  return res.data; // 204 No Content -> usually empty, but axios gives {}
};
