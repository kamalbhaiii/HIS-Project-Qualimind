import api from '../apiClient';

export async function generateDatasetInsights(payload) {
  const res = await api.post("/insights", payload);
  return res.data;
}