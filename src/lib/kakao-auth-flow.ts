import { ApiError } from './api-client';
import { setAuthSession } from './auth-token';
import {
  exchangeKakaoOAuth,
  startKakaoOAuth,
  type KakaoExchangeResult,
  type KakaoSession,
} from './kakao-auth-api';

export const KAKAO_FLOW_KEY = 'weiver.kakao.login.flow';
const SIGNUP_LIFETIME_MS = 10 * 60 * 1000;
class KakaoFlowError extends Error {}

export interface PendingKakaoSignup {
  signupToken: string;
  verifiedEmail?: string;
  expiresAt: number;
}

// Only the flow ID survives OAuth navigation. Signup credentials stay in memory.
let pendingSignup: PendingKakaoSignup | null = null;
let exchangePromise: Promise<KakaoExchangeResult> | null = null;
let startPromise: Promise<void> | null = null;

export function clearKakaoSignup() {
  pendingSignup = null;
}

export function saveKakaoSignup(
  result: Extract<KakaoExchangeResult, { status: 'SIGNUP_REQUIRED' }>,
) {
  if (!result.signupToken) throw new KakaoFlowError('카카오 가입 정보를 확인할 수 없습니다.');
  pendingSignup = {
    signupToken: result.signupToken,
    verifiedEmail: result.verifiedEmail,
    expiresAt: Date.now() + SIGNUP_LIFETIME_MS,
  };
}

export function getKakaoSignup() {
  if (pendingSignup && pendingSignup.expiresAt <= Date.now()) clearKakaoSignup();
  return pendingSignup;
}

export function consumeKakaoSignup(signupToken: string) {
  const signup = getKakaoSignup();
  if (!signup || signup.signupToken !== signupToken) {
    throw new KakaoFlowError(
      '카카오 가입 정보가 만료되었습니다. 로그인 화면에서 다시 시작해주세요.',
    );
  }
  // A lost response may still mean the server consumed the token. Never replay it.
  clearKakaoSignup();
  return signup;
}

export function beginKakaoLogin() {
  if (startPromise) return startPromise;
  startPromise = (async () => {
    clearKakaoSignup();
    window.sessionStorage.removeItem(KAKAO_FLOW_KEY);
    // Fail before creating a server flow if tab storage is unavailable.
    window.sessionStorage.setItem(KAKAO_FLOW_KEY, '');
    window.sessionStorage.removeItem(KAKAO_FLOW_KEY);
    const { authorizationUrl, flowId } = await startKakaoOAuth();
    if (!flowId || new URL(authorizationUrl).protocol !== 'https:') {
      throw new KakaoFlowError('카카오 인증 주소를 확인할 수 없습니다.');
    }
    window.sessionStorage.setItem(KAKAO_FLOW_KEY, flowId);
    window.location.assign(authorizationUrl);
  })().finally(() => {
    startPromise = null;
  });
  return startPromise;
}

export function exchangeKakaoLogin() {
  // Share the in-flight mutation across React effect replays and remounts.
  if (exchangePromise) return exchangePromise;
  exchangePromise = (async () => {
    const flowId = window.sessionStorage.getItem(KAKAO_FLOW_KEY);
    window.sessionStorage.removeItem(KAKAO_FLOW_KEY);
    if (!flowId) throw new KakaoFlowError('로그인 화면에서 카카오로 다시 시작해주세요.');
    return exchangeKakaoOAuth(flowId);
  })().finally(() => {
    exchangePromise = null;
  });
  return exchangePromise;
}

export function applyKakaoSession(session: KakaoSession) {
  if (session.role !== 'APPLICANT' || !session.accessToken) {
    throw new KakaoFlowError('구직자 로그인 정보를 확인할 수 없습니다.');
  }
  clearKakaoSignup();
  setAuthSession(session.accessToken, session.role);
}

export function getKakaoErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    switch (error.apiStatus) {
      case 'KAKAO_OAUTH_CANCELLED':
        return '카카오 로그인을 취소했습니다. 다시 시작할 수 있습니다.';
      case 'INVALID_KAKAO_OAUTH_TICKET':
      case 'INVALID_SIGNUP_TOKEN':
        return '카카오 인증 정보가 만료되었거나 이미 사용되었습니다. 다시 시작해주세요.';
      case 'EMAIL_NOT_VERIFIED':
        return '이메일 인증을 확인할 수 없습니다. 카카오 가입을 다시 시작해주세요.';
      case 'KAKAO_ACCOUNT_ALREADY_LINKED':
        return '이미 연결된 카카오 계정입니다. 기존 로그인 수단으로 로그인해주세요.';
      case 'KAKAO_PROVIDER_ERROR':
      case 'KAKAO_OAUTH_UNAVAILABLE':
        return '카카오 인증을 완료하지 못했습니다. 잠시 후 다시 시작해주세요.';
    }
    return '카카오 인증 요청에 실패했습니다. 로그인 화면에서 다시 시작해주세요.';
  }
  return error instanceof KakaoFlowError
    ? error.message
    : '카카오 인증에 연결하지 못했습니다. 로그인 화면에서 다시 시작해주세요.';
}
