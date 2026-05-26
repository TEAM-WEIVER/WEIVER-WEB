import { describe, expect, it } from 'vitest';

import { getProfileEditPath } from '../onboarding-flow';

describe('onboarding-flow', () => {
  it('프로필 수정 시 첫 미완료 온보딩 단계 경로를 반환한다', () => {
    expect(
      getProfileEditPath({
        resume: true,
        'cover-letter': false,
        portfolio: false,
      }),
    ).toBe('/onboarding/cover-letter');

    expect(
      getProfileEditPath({
        resume: true,
        'cover-letter': true,
        portfolio: false,
      }),
    ).toBe('/onboarding/portfolio');
  });

  it('모든 단계가 완료됐으면 이력서 편집부터 다시 시작한다', () => {
    expect(
      getProfileEditPath({
        resume: true,
        'cover-letter': true,
        portfolio: true,
      }),
    ).toBe('/onboarding/resume');
  });
});
