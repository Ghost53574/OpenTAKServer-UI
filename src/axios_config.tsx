import Axios, { AxiosError } from 'axios';

export const SESSION_EXPIRED_EVENT = 'opentak:session-expired';

const authenticationEndpoints = [
  '/api/login',
  '/api/ldap_login',
  '/api/me',
  '/api/password/reset',
  '/api/register',
  '/api/tf-',
];

const axios = Axios.create({
  withCredentials: true,
  withXSRFToken: true,
  maxRedirects: 0,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

axios.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const requestUrl = error.config?.url ?? '';
    const isAuthenticationRequest = authenticationEndpoints.some((endpoint) =>
      requestUrl.startsWith(endpoint)
    );

    if (error.response?.status === 401 && !isAuthenticationRequest) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }

    return Promise.reject(error);
  }
);

export function setCsrfToken(token?: string) {
  if (token) {
    axios.defaults.headers.common['X-XSRF-TOKEN'] = token;
    return;
  }

  delete axios.defaults.headers.common['X-XSRF-TOKEN'];
}

export function apiErrorMessage(error: unknown, fallback: string) {
  if (!Axios.isAxiosError(error)) {
    return fallback;
  }

  const data = error.response?.data as
    | { error?: unknown; message?: unknown; errors?: unknown; response?: { errors?: unknown } }
    | undefined;

  for (const candidate of [data?.error, data?.message, data?.errors, data?.response?.errors]) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
    if (Array.isArray(candidate)) {
      const message = candidate.find((entry) => typeof entry === 'string' && entry.trim());
      if (message) return message as string;
    }
  }
  return fallback;
}

export default axios;
