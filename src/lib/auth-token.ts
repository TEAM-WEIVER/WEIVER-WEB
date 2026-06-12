export type UserRole = 'APPLICANT' | 'COMPANY';

const AUTH_ROLE_STORAGE_KEY = 'weiver.auth.role';

let accessToken: string | null = null;

function getSessionStorage() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

function normalizeRole(role: unknown): UserRole | null {
  if (role === 'APPLICANT' || role === 'Applicant') return 'APPLICANT';
  if (role === 'COMPANY' || role === 'Company') return 'COMPANY';
  return null;
}

function setStoredAuthRole(role: UserRole) {
  getSessionStorage()?.setItem(AUTH_ROLE_STORAGE_KEY, role);
}

function getStoredAuthRole() {
  return normalizeRole(getSessionStorage()?.getItem(AUTH_ROLE_STORAGE_KEY));
}

function clearStoredAuthRole() {
  getSessionStorage()?.removeItem(AUTH_ROLE_STORAGE_KEY);
}

export function getAccessToken() {
  return accessToken;
}

export function getAuthRole() {
  return getStoredAuthRole();
}

export function setAccessToken(token: string) {
  accessToken = token;
}

export function setAuthRole(role: UserRole) {
  setStoredAuthRole(role);
}

export function setAuthSession(token: string, role: UserRole) {
  setAccessToken(token);
  setStoredAuthRole(role);
}

export function clearAccessToken() {
  accessToken = null;
  clearStoredAuthRole();
}
