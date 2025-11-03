import api from '../apiClient';

export const checkHealth = async () => {
  const res = await api.get('/health');
  return res.data;
};
