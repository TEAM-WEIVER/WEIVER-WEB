const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.piuda.site';
const CSRF_HEADER_NAME = 'X-XSRF-TOKEN';
const CSRF_EXCLUDED_PATHS = new Set([
  '/api/auth/applicants/signup/init',
  '/api/auth/applicants/signup/agreements',
  '/api/auth/applicants/login',
  '/api/auth/applicants/email/verify',
  '/api/auth/applicants/email/send',
  '/api/auth/companies/login',
]);

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipCsrf?: boolean;
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

function isCsrfRequired(method: string) {
  return method.toUpperCase() !== 'GET';
}

function shouldSkipCsrf(path: string, skipCsrf: boolean) {
  return skipCsrf || CSRF_EXCLUDED_PATHS.has(path);
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
  csrfToken = result.data.csrfToken;
  return csrfToken;
}

async function getCsrfToken() {
  if (csrfToken) return csrfToken;

  csrfTokenPromise ??= fetchCsrfToken().finally(() => {
    csrfTokenPromise = null;
  });

  return csrfTokenPromise;
}

export async function apiRequest<TResponse>(
  path: string,
  { body, headers, skipCsrf = false, ...options }: ApiRequestOptions = {},
): Promise<TResponse> {
  const method = options.method ?? 'GET';
  const requestHeaders = new Headers(headers);

  if (body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (
    !shouldSkipCsrf(path, skipCsrf) &&
    isCsrfRequired(method) &&
    !requestHeaders.has(CSRF_HEADER_NAME)
  ) {
    requestHeaders.set(CSRF_HEADER_NAME, await getCsrfToken());
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    credentials: 'include',
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    throw new ApiError('API request failed', response.status);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return response.json() as Promise<TResponse>;
}
