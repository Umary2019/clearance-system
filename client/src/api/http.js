import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('clearance_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }

    return Promise.reject(error);
  }
);

export default http;
