import api from "../apiClient";

export const uploadDataset = async ({file, name, preprocessingTasks}) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', name);
  formData.append('preprocessingTasks', preprocessingTasks)

  const res = await api.post('/datasets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return res.data;
};

export const getDatasets = async () => {
  const res = await api.get('/datasets')

  return res.data;
}