import api from "../apiClient";

export const uploadDataset = async ({file, name}) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', name);

  const res = await api.post('/datasets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return res.data;
};