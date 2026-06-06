import { afterEach, describe, expect, it } from 'vitest';

import { clearAccessToken, getAccessToken, getAuthRole, setAuthSession } from '../auth-token';

describe('auth-token', () => {
  afterEach(() => {
    clearAccessToken();
    window.sessionStorage.clear();
  });

  it('accessToken은 메모리에 저장하고 role은 sessionStorage에 저장한다', () => {
    setAuthSession('access-token', 'APPLICANT');

    expect(getAccessToken()).toBe('access-token');
    expect(getAuthRole()).toBe('APPLICANT');
    expect(window.sessionStorage.getItem('weiver.auth.role')).toBe('APPLICANT');
  });

  it('메모리 토큰이 없어도 sessionStorage의 role을 라우팅 힌트로 사용한다', () => {
    window.sessionStorage.setItem('weiver.auth.role', 'COMPANY');

    expect(getAuthRole()).toBe('COMPANY');
  });

  it('토큰을 삭제하면 role도 함께 삭제한다', () => {
    setAuthSession('access-token', 'APPLICANT');
    clearAccessToken();

    expect(getAccessToken()).toBeNull();
    expect(getAuthRole()).toBeNull();
  });
});
