// API configuration for different environments
const API_BASE_URL = import.meta.env.PROD 
  ? (import.meta.env.VITE_API_URL || 'https://your-backend-url.onrender.com')  // Update with your Render URL after deployment
  : 'http://localhost:5000';

export const API_ENDPOINTS = {
  upload: `${API_BASE_URL}/upload`,
  dashboard: `${API_BASE_URL}/dashboard`,
  chat: `${API_BASE_URL}/chat`,
  advancedAnalytics: `${API_BASE_URL}/advanced-analytics`,
};

export default API_BASE_URL;