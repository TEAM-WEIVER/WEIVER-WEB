# E2E 테스트

- `signup/individual-signup.spec.ts`는 이메일 인증과 약관 동의, 직접 로그인, `/home` 새로고침을 검증한다.
- `auth/personal-auth.spec.ts`는 로그인 화면의 회원가입 이동, 접근 제한, 세션 재발급 실패를 검증한다.
- `oracle-landing.spec.ts`는 Oracle 랜딩과 정적 파일, 사전예약을 검증한다.
- `routing.spec.ts`는 Vite 정적 파일, HTTP 404, 404 화면에서 공개 랜딩으로 돌아가는 링크를 검증한다.

가입·로그인·사전예약 API는 모의 응답을 사용한다. 랜딩 HTML과 정적 파일은 Oracle 원본을 사용한다. 가입 폼과 알림의 세부 동작은 `pnpm test --run`으로 검증한다.

## 실행

```sh
pnpm exec playwright install chromium
pnpm test:e2e
```

Playwright가 Vite 개발 서버를 시작한다. 빌드 결과로 검사하려면 아래 명령을 실행한다. 기본 포트는 3000이며 `E2E_PORT`로 바꿀 수 있다.

```sh
pnpm build
CI=true pnpm test:e2e
```

PR과 `develop` 반영 및 `main` 승격 검증은 같은 빌드 명령으로 전체 E2E를 실행한다. 실제 테스트 계정을 생성하는 회원가입 검증은 `pnpm test:e2e:signup-live`로 따로 실행한다.
