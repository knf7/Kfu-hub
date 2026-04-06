export const DASHBOARD_DIRTY_KEY = 'dashboard-dirty';

type QueryParams = Record<string, string | number | boolean | undefined | null>;

const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    const normalized = envUrl.replace(/\/$/, '');
    return /\/api(\/|$)/.test(normalized) ? normalized : `${normalized}/api`;
  }
  return '/api';
};

const buildUrl = (path: string, params?: QueryParams) => {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${base}${normalizedPath}`, typeof window === 'undefined' ? 'http://localhost' : window.location.origin);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });

  if (typeof window === 'undefined') {
    return `${url.pathname}${url.search}`;
  }
  return `${url.pathname}${url.search}`;
};

const authHeaders = () => {
  let headers: HeadersInit = {
    Accept: 'application/json',
  };
  if (typeof window === 'undefined') return headers;
  try {
    const token = localStorage.getItem('token');
    if (token) {
      headers = {
        ...headers,
        Authorization: `Bearer ${token}`,
      };
    }
  } catch {
    // ignore localStorage issues
  }
  return headers;
};

const fetchJson = async <T>(path: string, params?: QueryParams): Promise<T> => {
  const response = await fetch(buildUrl(path, params), {
    method: 'GET',
    credentials: 'include',
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return (await response.json()) as T;
};

export const dashboardAPI = {
  getDashboard: <T = unknown>(params?: QueryParams) => fetchJson<T>('/reports/dashboard', params),
  getAnalytics: <T = unknown>(params?: QueryParams) => fetchJson<T>('/reports/analytics', params),
  getAIAnalysis: <T = unknown>(params?: QueryParams) => fetchJson<T>('/reports/ai-analysis', params),
  getLoans: <T = unknown>(params?: QueryParams) => fetchJson<T>('/loans', params),
};
