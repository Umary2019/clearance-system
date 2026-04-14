const getTrimmedString = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const getInjectedApiUrl = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return '';
  }

  const runtimeOverride =
    getTrimmedString(window.__CLEARANCE_API_URL__) || getTrimmedString(window.__VITE_API_URL__);

  if (runtimeOverride) {
    return runtimeOverride;
  }

  const metaTag = document.querySelector('meta[name="clearance-api-url"]');
  return getTrimmedString(metaTag?.content);
};

export const normalizeApiBaseUrl = (rawUrl) => {
  if (!rawUrl) {
    return '/api';
  }

  const cleaned = String(rawUrl).trim().replace(/\/+$/, '');

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

export const getConfiguredApiUrl = () => {
  const runtimeOverride = getInjectedApiUrl();

  if (runtimeOverride) {
    return runtimeOverride;
  }

  return getTrimmedString(import.meta.env.VITE_API_URL);
};

export const getApiBaseUrl = () => normalizeApiBaseUrl(getConfiguredApiUrl());
