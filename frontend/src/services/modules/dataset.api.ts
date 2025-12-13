import api from "../apiClient";

export const uploadDataset = async ({ file, name, preprocessingTasks, preprocessingConfig }) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', name);

  // Best practice for arrays in multipart: append each value
  (preprocessingTasks || []).forEach((t) => formData.append('preprocessingTasks', t));

  // NEW: send full config as JSON string
  if (preprocessingConfig) {
    formData.append('preprocessingConfig', JSON.stringify(preprocessingConfig));
  }

  const res = await api.post('/datasets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return res.data;
};

export const getDatasets = async () => {
  const res = await api.get('/datasets')

  return res.data;
}

export const getDatasetByID = async (id) => {
  const res = await api.get(`/datasets/${id}`)
  return res.data;
}

export const deleteDatasetByID = async (id) => {
  const res = await api.delete(`/datasets/${id}`)
  console.log(res)
  return res.status;
}