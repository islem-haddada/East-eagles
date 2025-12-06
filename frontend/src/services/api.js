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
  getAll: () => api.get('/admin/athletes'),
  getPending: () => api.get('/admin/athletes/pending'), // Assuming this endpoint exists or will be added
  getStats: () => api.get('/admin/athletes/stats'), // Assuming this exists
  getProfile: () => api.get('/athletes/profile'), // This is correct (athlete side)
  updateProfile: (data) => api.put('/athletes/profile', data), // This is correct
  getById: (id) => api.get(`/admin/athletes/${id}`),
  create: (data) => api.post('/admin/athletes', data), // Assuming admin creates athletes
  update: (id, data) => api.put(`/admin/athletes/${id}`, data),
  delete: (id) => api.delete(`/admin/athletes/${id}`),
  approve: (id) => api.post(`/admin/athletes/${id}/approve`),
  reject: (id, reason) => api.post(`/admin/athletes/${id}/reject`, { reason }),
};

export const trainingAPI = {
  getAll: () => api.get('/trainings'),
  getUpcoming: () => api.get('/trainings/upcoming'),
  getHistory: () => api.get('/trainings/history'),
  getById: (id) => api.get(`/trainings/${id}`),
  create: (data) => api.post('/trainings', data),
  update: (id, data) => api.put(`/trainings/${id}`, data),
  delete: (id) => api.delete(`/trainings/${id}`),
  markAttendance: (id, data) => api.post(`/trainings/${id}/attendance`, data),
  getAttendance: (id) => api.get(`/trainings/${id}/attendance`),
};

export const documentAPI = {
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getByAthlete: (id) => api.get(`/admin/documents/athlete/${id}`),
  getMyDocuments: () => api.get(`/documents/my`), // Uses auth context
  getPending: () => api.get('/admin/documents/pending'),
  validate: (id) => api.post(`/admin/documents/${id}/validate`),
  reject: (id, reason) => api.post(`/admin/documents/${id}/reject`, { reason }),
  download: (id) => api.get(`/documents/${id}/download`, { responseType: 'blob' })
};

export const paymentAPI = {
  create: (data) => api.post('/admin/payments', data),
  getRecent: () => api.get('/admin/payments/recent'),
  getByAthlete: (id) => api.get(`/admin/payments/athlete/${id}`),
  getMyPayments: () => api.get('/payments/my'),
  update: (id, data) => api.put(`/admin/payments/${id}`, data),
  delete: (id) => api.delete(`/admin/payments/${id}`)
};

export const scheduleAPI = {
  create: (data) => api.post('/admin/schedules', data),
  getAll: () => api.get('/schedules'), // Now shared route
  update: (id, data) => api.put(`/admin/schedules/${id}`, data),
  delete: (id) => api.delete(`/admin/schedules/${id}`)
};

export default api;