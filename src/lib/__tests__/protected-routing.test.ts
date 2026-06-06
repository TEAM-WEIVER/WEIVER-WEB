import { describe, expect, it } from 'vitest';

import {
  APPLICANT_DASHBOARD_PATH,
  CORPORATE_DASHBOARD_PATH,
  LOGIN_PATH,
  getOnboardingProgressRedirectPath,
  getProtectedArea,
  getRoleRedirectPath,
} from '../protected-routing';

describe('protected-routing', () => {
  it('보호 대상 라우트 영역을 구분한다', () => {
    expect(getProtectedArea('/onboarding/resume')).toBe('onboarding');
    expect(getProtectedArea('/corporate/dashboard')).toBe('corporate');
    expect(getProtectedArea('/applicant/dashboard')).toBe('applicant');
    expect(getProtectedArea('/login')).toBeNull();
  });

  it('미인증 사용자는 보호 라우트에서 로그인으로 보낸다', () => {
    expect(getRoleRedirectPath('/onboarding/resume', null)).toBe(LOGIN_PATH);
    expect(getRoleRedirectPath('/corporate/dashboard', null)).toBe(LOGIN_PATH);
    expect(getRoleRedirectPath('/applicant/dashboard', null)).toBe(LOGIN_PATH);
  });

  it('역할이 맞지 않는 보호 라우트 접근은 각 대시보드로 보정한다', () => {
    expect(getRoleRedirectPath('/onboarding/resume', 'COMPANY')).toBe(CORPORATE_DASHBOARD_PATH);
    expect(getRoleRedirectPath('/corporate/dashboard', 'APPLICANT')).toBe(APPLICANT_DASHBOARD_PATH);
    expect(getRoleRedirectPath('/applicant/dashboard', 'COMPANY')).toBe(CORPORATE_DASHBOARD_PATH);
  });

  it('역할이 맞으면 보호 라우트 접근을 허용한다', () => {
    expect(getRoleRedirectPath('/onboarding/resume', 'APPLICANT')).toBeNull();
    expect(getRoleRedirectPath('/corporate/dashboard', 'COMPANY')).toBeNull();
    expect(getRoleRedirectPath('/applicant/dashboard', 'APPLICANT')).toBeNull();
  });

  it('개인 온보딩 진행 상태에 맞는 첫 미완료 단계로 보정한다', () => {
    expect(
      getOnboardingProgressRedirectPath('/onboarding/resume', {
        resume: true,
        'cover-letter': false,
        portfolio: false,
      }),
    ).toBe('/onboarding/cover-letter');

    expect(
      getOnboardingProgressRedirectPath('/onboarding/resume', {
        resume: true,
        'cover-letter': true,
        portfolio: false,
      }),
    ).toBe('/onboarding/portfolio');
  });

  it('온보딩이 모두 완료되면 개인 대시보드로 보낸다', () => {
    expect(
      getOnboardingProgressRedirectPath('/onboarding/portfolio', {
        resume: true,
        'cover-letter': true,
        portfolio: true,
      }),
    ).toBe(APPLICANT_DASHBOARD_PATH);
  });
});
