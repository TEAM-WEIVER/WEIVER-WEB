# E2E 테스트

- `signup/individual-signup.spec.ts`는 이메일 인증, 약관 동의, 가입 후 로그인과 `/home` 진입을 검증한다.
- `auth/personal-auth.spec.ts`는 개인 인증과 세션 재발급 실패를 검증한다.
- `136-landing-oracle-rewrite.spec.ts`는 Oracle에서 제공하는 공개 랜딩과 정적 리소스, 본품 경로를 확인한다. 예약 API는 모의 응답을 사용한다.
- `not-found.spec.ts`와 `86-toast.spec.ts`는 HTTP 404와 전역 알림을 검증한다.

회원가입과 로그인에는 `page.route()`로 백엔드 응답을 모의한다. 공통 응답은 `e2e/mocks`에서 관리한다. 별도의 실제 회원가입 테스트는 `playwright.live.config.ts`에서 실행한다.

## 실행

```sh
pnpm exec playwright install chromium
VITE_E2E_TEST=true pnpm build
CI=true pnpm test:e2e
```

`CI=true`를 생략하면 Playwright가 Vite 개발 서버를 시작한다. PR에서는 변경 파일을 기준으로 E2E 범위를 결정한다. 배포 전 검증에는 전체 E2E를 사용한다.
