import { http, HttpResponse } from 'msw';

const successResponse = { status: 'OK', code: 200, data: null, message: 'OK' };

/** 계정 설정의 기본 성공 시나리오. */
export const accountSettingsHandlers = [
  http.patch('https://api.piuda.site/api/auth/applicants/me/password', () => {
    return HttpResponse.json(successResponse);
  }),
];

/** 현재 비밀번호 불일치 등 실패 상태를 검증할 때 명시적으로 교체해 사용한다. */
export const accountSettingsErrorHandlers = [
  http.patch('https://api.piuda.site/api/auth/applicants/me/password', () => {
    return HttpResponse.json(
      {
        status: 'BAD_REQUEST',
        code: 400,
        data: null,
        message: '현재 비밀번호가 일치하지 않습니다.',
      },
      { status: 400 },
    );
  }),
];
