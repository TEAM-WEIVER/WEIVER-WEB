import { describe, expect, it } from 'vitest';

import { getFirstStep, getNextStep, getPrevStep, getSignupFlow, getStepNumber } from '../signup-flow';

describe('signup-flow', () => {
  it('getSignupFlow()는 회원가입 단계 배열을 반환한다', () => {
    const flow = getSignupFlow();
    expect(Array.isArray(flow)).toBe(true);
    expect(flow.length).toBeGreaterThan(0);
    expect(flow).toContain('account-info');
    expect(flow).toContain('agreements');
  });

  it('getFirstStep()은 첫 번째 단계를 반환한다', () => {
    expect(getFirstStep()).toBe('account-info');
  });

  it('getNextStep에 현재 단계를 전달하면 다음 단계를 반환한다', () => {
    expect(getNextStep('account-info')).toBe('agreements');
  });

  it('getNextStep에 마지막 단계를 전달하면 null을 반환한다', () => {
    expect(getNextStep('agreements')).toBeNull();
  });

  it('getNextStep에 유효하지 않은 step을 전달하면 null을 반환한다', () => {
    expect(getNextStep('invalid-step')).toBeNull();
    expect(getNextStep('')).toBeNull();
  });

  it('getPrevStep에 두 번째 이후 단계를 전달하면 이전 단계를 반환한다', () => {
    expect(getPrevStep('agreements')).toBe('account-info');
  });

  it('getPrevStep에 첫 번째 단계를 전달하면 null을 반환한다', () => {
    expect(getPrevStep('account-info')).toBeNull();
  });

  it('getPrevStep에 유효하지 않은 step을 전달하면 null을 반환한다', () => {
    expect(getPrevStep('invalid-step')).toBeNull();
  });

  it('getStepNumber는 단계 번호(1-based)를 반환한다', () => {
    expect(getStepNumber('account-info')).toBe(1);
    expect(getStepNumber('agreements')).toBe(2);
  });

  it('getStepNumber에 유효하지 않은 step을 전달하면 0을 반환한다', () => {
    expect(getStepNumber('invalid-step')).toBe(0);
  });
});
