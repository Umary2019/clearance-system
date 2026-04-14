const trimString = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeTargetBase = (rawValue) => {
  const value = trimString(rawValue);

  if (!value) {
    return '';
  }

  const cleaned = value.replace(/\/+$/, '');

  if (!/^https?:\/\//i.test(cleaned)) {
    return cleaned;
  }

  try {
    const parsed = new URL(cleaned);
    const path = parsed.pathname.replace(/\/+$/, '');

    if (!path || path === '/') {
      parsed.pathname = '/api';
    }

    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return cleaned;
  }
};

const getProxyTarget = () => {
  const candidates = [
    process.env.API_PROXY_TARGET,
    process.env.CLEARANCE_API_URL,
    process.env.VITE_API_URL,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeTargetBase(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return '';
};

const buildTargetUrl = (baseUrl, pathSegment, queryString) => {
  const safePath = trimString(pathSegment).replace(/^\/+/, '');
  const suffix = safePath ? `/${safePath}` : '';
  const query = trimString(queryString);
  return `${baseUrl}${suffix}${query ? `?${query}` : ''}`;
};

const getQueryString = (event) => {
  const rawQuery = trimString(event?.rawQuery);

  if (rawQuery) {
    return rawQuery;
  }

  if (event?.queryStringParameters && typeof event.queryStringParameters === 'object') {
    return new URLSearchParams(event.queryStringParameters).toString();
  }

  return '';
};

const getAllowedRequestHeaders = (headers) => {
  const passThrough = [
    'accept',
    'authorization',
    'content-type',
    'if-none-match',
    'if-match',
    'if-modified-since',
  ];

  const allowedHeaders = {};

  for (const name of passThrough) {
    const value = headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()];

    if (typeof value === 'string' && value.trim()) {
      allowedHeaders[name] = value;
    }
  }

  return allowedHeaders;
};

exports.handler = async (event) => {
  const targetBase = getProxyTarget();

  if (!targetBase) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message:
          'API proxy is not configured. Set API_PROXY_TARGET (recommended) or VITE_API_URL in Netlify environment variables.',
      }),
    };
  }

  const targetUrl = buildTargetUrl(
    targetBase,
    event.pathParameters?.splat || '',
    getQueryString(event)
  );

  const headers = getAllowedRequestHeaders(event.headers || {});
  const method = event.httpMethod || 'GET';
  const body = event.body
    ? Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8')
    : undefined;

  let upstream;
  try {
    upstream = await fetch(targetUrl, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : body,
      redirect: 'follow',
    });
  } catch {
    return {
      statusCode: 502,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Unable to reach API upstream.' }),
    };
  }

  const responseHeaders = {};
  const passBack = ['content-type', 'cache-control', 'etag', 'last-modified', 'location'];

  for (const name of passBack) {
    const value = upstream.headers.get(name);
    if (value) {
      responseHeaders[name] = value;
    }
  }

  const arrayBuffer = await upstream.arrayBuffer();
  const responseBody = Buffer.from(arrayBuffer);
  const contentType = String(responseHeaders['content-type'] || '').toLowerCase();
  const isTextLike =
    contentType.startsWith('text/') ||
    contentType.includes('application/json') ||
    contentType.includes('application/javascript') ||
    contentType.includes('application/xml') ||
    contentType.includes('application/x-www-form-urlencoded');
  const isBinary = !isTextLike;

  return {
    statusCode: upstream.status,
    headers: responseHeaders,
    body: isBinary ? responseBody.toString('base64') : responseBody.toString('utf8'),
    isBase64Encoded: isBinary,
  };
};
