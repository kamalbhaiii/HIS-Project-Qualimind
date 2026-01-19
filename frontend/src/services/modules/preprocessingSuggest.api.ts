import api from '../apiClient';

export const suggestPreprocessing = async ({
  filename,
  columns,
  sampleRows,
  sampleRowCount,
}) => {
  const res = await api.post('/preprocessing/suggest', {
    filename,
    columns,
    sampleRows,
    sampleRowCount,
  });
  return res.data;
};