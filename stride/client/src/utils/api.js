import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/',
  withCredentials: true,
});

export const getMe = () => api.get('/auth/me').then(r => r.data);
export const logout = () => api.post('/auth/logout');

export const getActivities = (refresh = false) =>
  api.get('/activities', { params: { refresh } }).then(r => r.data);
export const getActivity = (id) =>
  api.get(`/activities/${id}`).then(r => r.data);

export const chatWithCoach = (activityId, message, history, coachMode) =>
  api.post(`/coach/chat/${activityId}`, { message, history, coachMode }).then(r => r.data);
export const generateOneliner = (activityId, coachMode) =>
  api.post(`/coach/oneliner/${activityId}`, { coachMode }).then(r => r.data);

export const getReports = () => api.get('/reports').then(r => r.data);
export const generateReport = (coachMode) =>
  api.post('/reports/generate', { coachMode }).then(r => r.data);
export const getPredictor = () => api.get('/reports/predictor').then(r => r.data);