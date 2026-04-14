import axios from 'axios';
import { getApiBaseUrl } from './baseUrl';

const API_BASE_URL = getApiBaseUrl();

const looksLikeHtmlDocument = (value) => {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.startsWith('<!doctype html') || normalized.startsWith('<html');
};

const buildApiConfigError = () => {
  const diagnosticMessage =
    'API endpoint is misconfigured for this deployment. Set VITE_API_URL to your hosted backend URL (for example, https://your-api-domain.com/api).';
  const userMessage = 'Unable to connect to the service right now. Please try again later.';
  const error = new Error(userMessage);
  error.isApiConfigError = true;
  error.response = { status: 404, data: { message: userMessage } };

  // Keep deployment diagnostics in logs only, not in end-user UI.
  // eslint-disable-next-line no-console
  console.error(diagnosticMessage);

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
    const contentType = String(error?.response?.headers?.['content-type'] || '').toLowerCase();
    const isHtmlError =
      contentType.includes('text/html') || looksLikeHtmlDocument(error?.response?.data);

    if (error?.response?.status === 404 && isHtmlError) {
      return Promise.reject(buildApiConfigError());
    }

    if (error?.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }

    return Promise.reject(error);
  }
);

export default http;
