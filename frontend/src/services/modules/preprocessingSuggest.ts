import api from '../apiClient';

export const suggestPreprocessing = async ({ datasetId, sampleRowCount = 20 }) => {
  const res = await api.post('/preprocessing/suggest', { datasetId, sampleRowCount });
  return res.data;
};
