// API configuration for different environments
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  upload: `${API_BASE_URL}/upload`,
  dashboard: `${API_BASE_URL}/dashboard`,
  chat: `${API_BASE_URL}/chat`,
};

export default API_BASE_URL;