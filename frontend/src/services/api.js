import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Auto logout on 401
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Optional: Redirect to login
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export const athleteAPI = {
  getAll: () => api.get('/athletes'),
  getById: (id) => api.get(`/athletes/${id}`),
  create: (data) => api.post('/athletes', data),
  update: (id, data) => api.put(`/athletes/${id}`, data),
  delete: (id) => api.delete(`/athletes/${id}`),
  getPending: () => api.get('/athletes/pending'),
  approve: (id) => api.post(`/athletes/${id}/approve`),
  reject: (id, reason) => api.post(`/athletes/${id}/reject`, { reason }),
};

export const trainingAPI = {
  getAll: () => api.get('/trainings'),
  getUpcoming: () => api.get('/trainings/upcoming'),
  getById: (id) => api.get(`/trainings/${id}`),
  create: (data) => api.post('/trainings', data),
  update: (id, data) => api.put(`/trainings/${id}`, data),
  delete: (id) => api.delete(`/trainings/${id}`),
  markAttendance: (id, data) => api.post(`/trainings/${id}/attendance`, data),
  getAttendance: (id) => api.get(`/trainings/${id}/attendance`),
};

export const documentAPI = {
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getByAthlete: (id) => api.get(`/documents/athlete/${id}`),
  getPending: () => api.get('/documents/pending'),
  validate: (id) => api.post(`/documents/${id}/validate`),
  reject: (id, reason) => api.post(`/documents/${id}/reject`, { reason }),
  download: (id) => `${API_BASE_URL}/documents/${id}/download`, // Helper for download URL
};

export default api;