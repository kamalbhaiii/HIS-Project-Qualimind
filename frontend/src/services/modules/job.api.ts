import api from '../apiClient';

export const getJobResult = async (id) => {
    const res = await api.get(`/jobs/${id}/result`)
    return res?.data;
}

export const getJobs = async () => {
    const res = await api.get('/jobs')
    return res?.data;
}

export const getJobStatus = async (id) => {
    const res= await api.get(`/jobs/${id}/status`)
    return res?.data;
}