import axios from 'axios';

const BASE_URL = 'https://stridecoach-production.up.railway.app';

const api = axios.create({ baseURL: BASE_URL });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stride_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getMe = () => api.get('/auth/me').then(r => r.data);
export const logout = () => {
  localStorage.removeItem('stride_token');
  return Promise.resolve();
};

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