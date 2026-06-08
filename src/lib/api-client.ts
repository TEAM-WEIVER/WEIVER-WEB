import { clearAccessToken, getAccessToken, setAccessToken } from './auth-token';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.piuda.site';
const CSRF_HEADER_NAME = 'X-XSRF-TOKEN';
const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const REISSUE_PATH = '/api/auth/reissue';
const CSRF_EXCLUDED_PATHS = new Set([
  '/api/auth/applicants/signup/init',
  '/api/auth/applicants/signup/agreements',
  '/api/auth/applicants/login',
  '/api/auth/applicants/email/verify',
  '/api/auth/applicants/email/send',
  '/api/auth/companies/login',
]);
const AUTHORIZATION_EXCLUDED_PATHS = new Set([...CSRF_EXCLUDED_PATHS, REISSUE_PATH]);

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipCsrf?: boolean;
  skipAuthorization?: boolean;
  skipAuthRetry?: boolean;
}

interface ApiResponse<TData> {
  status: string;
  code: number;
  data: TData;
  message: string;
}

interface CsrfData {
  csrfToken: string;
}

interface ReissueAccessTokenData {
  accessToken: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;
let accessTokenReissuePromise: Promise<string> | null = null;

function isCsrfRequired(method: string) {
  return method.toUpperCase() !== 'GET';
}

function shouldSkipCsrf(path: string, skipCsrf: boolean) {
  return skipCsrf || CSRF_EXCLUDED_PATHS.has(path);
}

function shouldAttachAuthorization(path: string, skipAuthorization: boolean) {
  return !skipAuthorization && !AUTHORIZATION_EXCLUDED_PATHS.has(path);
}

function shouldRetryAuthorization(path: string, skipAuthRetry: boolean) {
  return !skipAuthRetry && !AUTHORIZATION_EXCLUDED_PATHS.has(path);
}

function getCookieValue(name: string) {
  if (typeof document === 'undefined') return null;

  return (
    document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith(`${name}=`))
      ?.split('=')
      .slice(1)
      .join('=') ?? null
  );
}

function getXsrfCookieToken() {
  const token = getCookieValue(CSRF_COOKIE_NAME);
  return token ? decodeURIComponent(token) : null;
}

async function fetchCsrfToken() {
  const response = await fetch(`${API_BASE_URL}/api/auth/csrf`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new ApiError('CSRF token request failed', response.status);
  }

  const result = (await response.json()) as ApiResponse<CsrfData>;
  csrfToken = getXsrfCookieToken() ?? result.data.csrfToken;
  return csrfToken;
}

async function getCsrfToken() {
  const canReadCookie = typeof document !== 'undefined';
  const xsrfCookieToken = getXsrfCookieToken();
  if (csrfToken && (!canReadCookie || xsrfCookieToken === csrfToken)) return csrfToken;

  csrfTokenPromise ??= fetchCsrfToken().finally(() => {
    csrfTokenPromise = null;
  });

  return csrfTokenPromise;
}

async function fetchReissuedAccessToken() {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  headers.set(CSRF_HEADER_NAME, await getCsrfToken());

  const response = await fetch(`${API_BASE_URL}${REISSUE_PATH}`, {
    method: 'POST',
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    clearAccessToken();
    throw new ApiError('Access token reissue failed', response.status);
  }

  const result = (await response.json()) as ApiResponse<ReissueAccessTokenData>;
  setAccessToken(result.data.accessToken);
  return result.data.accessToken;
}

async function reissueAccessToken() {
  accessTokenReissuePromise ??= fetchReissuedAccessToken().finally(() => {
    accessTokenReissuePromise = null;
  });

  return accessTokenReissuePromise;
}

async function parseResponse<TResponse>(response: Response) {
  if (!response.ok) {
    throw new ApiError('API request failed', response.status);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return response.json() as Promise<TResponse>;
}

export async function apiRequest<TResponse>(
  path: string,
  {
    body,
    headers,
    skipCsrf = false,
    skipAuthorization = false,
    skipAuthRetry = false,
    ...options
  }: ApiRequestOptions = {},
): Promise<TResponse> {
  const method = options.method ?? 'GET';
  const requestHeaders = new Headers(headers);

  if (body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const accessToken = getAccessToken();
  if (
    accessToken &&
    shouldAttachAuthorization(path, skipAuthorization) &&
    !requestHeaders.has('Authorization')
  ) {
    requestHeaders.set('Authorization', `Bearer ${accessToken}`);
  }

  if (
    !shouldSkipCsrf(path, skipCsrf) &&
    isCsrfRequired(method) &&
    !requestHeaders.has(CSRF_HEADER_NAME)
  ) {
    requestHeaders.set(CSRF_HEADER_NAME, await getCsrfToken());
  }

  const requestBody = body === undefined ? undefined : JSON.stringify(body);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    credentials: 'include',
    headers: requestHeaders,
    body: requestBody,
  });

  if (response.status === 401 && shouldRetryAuthorization(path, skipAuthRetry)) {
    const nextAccessToken = await reissueAccessToken();
    const retryHeaders = new Headers(requestHeaders);
    retryHeaders.set('Authorization', `Bearer ${nextAccessToken}`);

    const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      method,
      credentials: 'include',
      headers: retryHeaders,
      body: requestBody,
    });

    return parseResponse<TResponse>(retryResponse);
  }

  return parseResponse<TResponse>(response);
}
