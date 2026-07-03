# 이메일 인증 E2E 테스트 정책

## 목적

회원가입 E2E 테스트에서 실제 메일 수신에 의존하지 않고, 사용자가 보는 이메일 인증 플로우는 그대로 검증한다.

대상 플로우:

```text
/signup/account-info
  -> 이메일 입력
  -> 인증번호 전송
  -> 인증번호 입력
  -> 확인
  -> 계정 정보 제출
  -> /signup/agreements
```

## 권장 방식

백엔드 E2E 환경에서만 지원자 이메일 인증번호를 CI secret 또는 환경변수 값으로 검증한다.

```text
E2E 인증번호: E2E_EMAIL_VERIFICATION_CODE 환경변수 값
허용 환경: e2e 또는 test 환경만
허용 이메일: 테스트 전용 이메일만
```

예시 테스트 이메일:

```text
e2e+applicant@example.com
e2e+applicant@weiver.test
```

프론트 테스트는 실제 사용자 플로우와 동일하게 진행한다.

1. 이메일 입력
2. "인증번호 전송" 클릭
3. CI secret에서 주입된 인증번호 입력
4. "확인" 클릭
5. "인증 완료" 확인
6. 다음 단계 진행

## 백엔드 요청사항

백엔드는 아래 조건을 모두 만족해야 한다.

- 운영 환경에서는 E2E 인증번호가 절대 동작하지 않는다.
- E2E/test 환경 플래그가 켜진 경우에만 E2E 인증번호를 허용한다.
- 테스트 전용 이메일 패턴에만 E2E 인증번호를 허용한다.
- 일반 사용자 이메일에는 E2E/test 환경에서도 기존 인증 정책을 유지한다.
- 인증 성공 시 기존과 동일한 응답 형식으로 `verificationToken`을 반환한다.
- 인증번호 전송 API와 검증 API의 엔드포인트는 운영 플로우와 동일하게 유지한다.
- `E2E_EMAIL_VERIFICATION_CODE` 값은 소스 코드와 문서에 기록하지 않고 CI secret 또는 백엔드 secret store에서 관리한다.

권장 백엔드 조건:

```text
if environment is e2e/test
and email matches allowed test email pattern
and code equals E2E_EMAIL_VERIFICATION_CODE
then verify email and issue verificationToken
```

## API 계약

기존 API를 그대로 사용한다.

| 단계          | 메서드 | 엔드포인트                          | 요청              | 응답                    |
| ------------- | ------ | ----------------------------------- | ----------------- | ----------------------- |
| 인증번호 전송 | POST   | `/api/auth/applicants/email/send`   | `{ email }`       | 기존 성공 응답          |
| 인증번호 검증 | POST   | `/api/auth/applicants/email/verify` | `{ email, code }` | `{ verificationToken }` |

테스트 전용 토큰 발급 API는 기본안으로 사용하지 않는다.

## 왜 이 방식인가

이 방식은 프론트가 실제 사용자 플로우를 유지하면서도 메일 수신 불안정성을 제거한다.

- Playwright가 실제 버튼, 입력 필드, 타이머, 인증 완료 UI를 검증할 수 있다.
- 실제 이메일 서버, 메일함, 인증번호 파싱에 의존하지 않는다.
- `page.route()` mock보다 백엔드 계약과 더 가깝다.
- 테스트 전용 토큰 발급 API보다 보안 표면이 작다.

## 사용하지 않는 대안

### 테스트 전용 verificationToken 발급 API

```text
POST /api/test/auth/applicants/email/verification-token
```

이 방식은 빠르지만 이메일 전송/입력/검증 UI를 건너뛴다. 회원가입 전체 E2E의 기본 방식으로는 사용하지 않는다.

단, 특정 후속 화면만 테스트해야 하고 이메일 인증 UI가 테스트 대상이 아닐 때 보조 수단으로 검토할 수 있다.

### Playwright API mock

`page.route()`로 인증 API 응답을 mock하면 백엔드 없이 빠르게 테스트할 수 있다. 하지만 실제 API 계약이 깨져도 테스트가 통과할 수 있으므로 단위/컴포넌트 테스트 보조용으로만 사용한다.

### 테스트 메일함 사용

MailHog, Mailpit, Mailosaur 같은 테스트 메일함은 실제 이메일 발송까지 검증할 수 있다. 그러나 CI 구성과 운영 비용이 커서 현재 1인 프론트엔드 프로젝트의 기본 방식으로는 과하다.

## 프론트 E2E 테스트 예시

```ts
await page.goto('/signup/account-info');

const verificationCode = process.env.E2E_EMAIL_VERIFICATION_CODE;
if (!verificationCode) throw new Error('E2E_EMAIL_VERIFICATION_CODE is required');

await page.getByLabel('이메일').fill('e2e+applicant@weiver.test');
await page.getByRole('button', { name: '인증번호 전송' }).click();

await page.getByLabel('이메일 인증번호').fill(verificationCode);
await page.getByRole('button', { name: '확인' }).click();

await expect(page.getByText('인증 완료')).toBeVisible();
```

## 보안 체크리스트

- [ ] 운영 환경에서 `E2E_EMAIL_VERIFICATION_CODE` 인증이 실패한다.
- [ ] 허용되지 않은 이메일 도메인에서 `E2E_EMAIL_VERIFICATION_CODE` 인증이 실패한다.
- [ ] E2E/test 환경 플래그 없이 E2E 인증번호가 동작하지 않는다.
- [ ] E2E 인증번호 성공 시에도 실제 `verificationToken` 발급 로직을 통과한다.
- [ ] 로그에 인증번호나 verificationToken이 평문으로 남지 않는다.
- [ ] `E2E_EMAIL_VERIFICATION_CODE` 값이 코드, 문서, 테스트 리포트, CI 로그에 출력되지 않는다.

## 백엔드 협의 메시지 초안

```text
회원가입 E2E 테스트 자동화를 위해 이메일 인증 테스트 정책이 필요합니다.

요청:
- E2E/test 환경에서만 테스트 전용 이메일에 대해 환경변수 E2E_EMAIL_VERIFICATION_CODE 값을 인증번호로 허용
- 운영 환경에서는 비활성화
- E2E_EMAIL_VERIFICATION_CODE 값은 CI secret 또는 백엔드 secret store에서 관리
- 기존 /api/auth/applicants/email/send, /api/auth/applicants/email/verify 엔드포인트 유지
- verify 성공 시 기존과 동일하게 verificationToken 반환

목적:
- 실제 이메일 수신 없이도 프론트 E2E에서 이메일 인증 UI와 가입 플로우를 검증하기 위함
- 테스트 전용 토큰 발급 API를 새로 만들지 않고 기존 사용자 플로우를 유지하기 위함
```
