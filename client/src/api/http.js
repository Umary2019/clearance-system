import axios from 'axios';

const configuredApiUrl = String(import.meta.env.VITE_API_URL || '').trim();
const API_BASE_URL = configuredApiUrl || '/api';

if (import.meta.env.PROD && !configuredApiUrl) {
  // In production this usually means frontend is deployed without a backend API URL.
  // Requests to /api often return index.html on static hosts.
  // eslint-disable-next-line no-console
  console.warn('VITE_API_URL is not set in production. API calls may fail.');
}

const looksLikeHtmlDocument = (value) => {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.startsWith('<!doctype html') || normalized.startsWith('<html');
};

const buildApiConfigError = () => {
  const message =
    'API endpoint is misconfigured for this deployment. Set VITE_API_URL to your hosted backend URL (for example, https://your-api-domain.com/api).';
  const error = new Error(message);
  error.response = { data: { message } };
  return error;
};

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
  (response) => {
    const contentType = String(response?.headers?.['content-type'] || '').toLowerCase();
    const isHtmlResponse = contentType.includes('text/html') || looksLikeHtmlDocument(response?.data);

    if (isHtmlResponse) {
      throw buildApiConfigError();
    }

    return response;
  },
  (error) => {
    if (error?.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }

    return Promise.reject(error);
  }
);

export default http;
