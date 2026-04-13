import axios from 'axios';

const configuredApiUrl = String(import.meta.env.VITE_API_URL || '').trim();

const normalizeApiBaseUrl = (rawUrl) => {
  if (!rawUrl) {
    return '/api';
  }

  const cleaned = rawUrl.replace(/\/+$/, '');

  if (!/^https?:\/\//i.test(cleaned)) {
    return cleaned;
  }

  try {
    const parsed = new URL(cleaned);
    const path = parsed.pathname.replace(/\/+$/, '');

    // Most deployments set only a host (for example https://api.example.com).
    // The backend routes are under /api, so default root paths to /api automatically.
    if (!path || path === '/') {
      parsed.pathname = '/api';
    }

    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return cleaned;
  }
};

const API_BASE_URL = normalizeApiBaseUrl(configuredApiUrl);

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
  error.isApiConfigError = true;
  error.response = { status: 404, data: {} };

  // Keep deployment diagnostics in logs only, not in end-user UI.
  // eslint-disable-next-line no-console
  console.error(message);

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
