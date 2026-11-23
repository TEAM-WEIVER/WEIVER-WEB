# 카카오 로그인 검증

관련 이슈: [#193](https://github.com/TEAM-WEIVER/WEIVER-WEB/issues/193)

## 구현 범위

- `/login`의 카카오 버튼 → 백엔드 start → 카카오 인증 → 백엔드 callback → `/auth/kakao/return` → exchange
- 기존 카카오 회원은 `/home`, 신규 회원은 `/signup/kakao`에서 이메일 인증(필요한 경우) 및 약관 동의 후 `/home`
- 기존 이메일 계정과 가입 미완료 계정은 기존 로그인/이메일 가입 경로 안내
- 마이페이지 계정 연결·재인증·최초 비밀번호 설정은 후속 범위

기존 `AuthCard`, `Button`, `TermSection`, `EmailVerificationSection`, `useEmailVerification`을 재사용한다. 이메일 가입과 카카오 가입은 `SignupAgreementsForm`과 동의 필드 매핑을 공유한다. 기존 이메일 가입 완료 후 로그인 이동은 유지한다.

## 일회용 상태

- `sessionStorage`에는 `weiver.kakao.login.flow`의 flow ID만 보관한다. 복귀 교환을 요청하기 전에 지우며, 진행 중인 교환 Promise만 공유해 effect 재실행의 중복 POST를 막는다.
- 가입 토큰과 이메일 인증 토큰은 메모리에만 둔다. 새로고침 시 로그인부터 다시 시작한다. 가입 토큰은 교환 후 최대 10분 동안 사용한다.
- 가입 완료를 요청하기 전에 메모리의 토큰을 소비한다. 네트워크 오류를 포함해 결과가 불확실하면 같은 토큰으로 재전송하지 않는다. 요청 중 화면을 떠난 경우 늦은 응답이 화면 이동이나 메모리 로그인 상태를 바꾸지 않는다.
- 공개 카카오 POST에도 쿠키와 CSRF 헤더를 보낸다. Authorization 첨부 및 401 자동 재발급·재시도는 사용하지 않는다.

## 자동 검증

```sh
pnpm typecheck
pnpm test --run
pnpm lint:check
pnpm build
pnpm build-storybook
pnpm test:storybook --run src/pages/login/_components/login-form.stories.tsx src/pages/signup/_components/signup-agreements-form.stories.tsx
pnpm test:e2e e2e/auth/kakao-auth.spec.ts
```

단위·화면 테스트는 공개 API의 CSRF/401 계약, StrictMode 중복 교환, 신규/기존 회원 분기, 이메일 미제공 계정의 인증, 선택 동의 거부, 오류 후 토큰 재사용 방지를 확인한다. E2E는 백엔드와 카카오 이동을 모의 처리하며 실제 서비스 계정을 생성하지 않는다.

## 검증 결과 (2026-11-22)

- 전체 단위·화면 테스트 316개, 모의 카카오 E2E 3개, 관련 Storybook 상호작용·접근성 테스트 9개 통과
- 타입 검사, ESLint, 프로덕션 빌드, Storybook 빌드 및 변경 파일 Prettier 검사 통과
- 브라우저에서 데스크톱 로그인 버튼, 390px 모바일 약관 화면의 가로 넘침 없음, 가입 화면 새로고침 후 재시작 안내 확인
- 기존 의존성을 잠금 파일에 맞춰 다시 설치했으며 `package.json`과 `pnpm-lock.yaml` 변경 없음
- 실제 카카오 왕복은 사용자 확인 완료

## 실제 카카오 왕복 전 확인

전달 계약은 2026-11-22 백엔드 `feat/#212-kakao-auth` 작업본 기준이다. 자동 테스트 통과는 배포 서버의 카카오 가입 성공을 의미하지 않는다.

2026-11-22 배포 서버의 `/v3/api-docs`에서 start·exchange·signup/complete 경로와 상태 enum, 가입 완료 필드를 확인했다. 카카오 앱 설정과 실제 쿠키 왕복은 별도 확인이 필요하다.

- API: `https://api.weiverai.com`. 카카오 REST 키와 클라이언트 시크릿은 백엔드 설정이다.
- 백엔드 `KAKAO_REDIRECT_URI`: `https://api.weiverai.com/api/auth/applicants/kakao/callback`
- 백엔드 `KAKAO_FRONTEND_RETURN_URI`: 실제 프론트 origin의 `/auth/kakao/return`. 시작 화면과 정확히 같은 origin이어야 탭의 flow ID를 읽을 수 있다.
- 허용 origin: `https://weiverai.com`, `https://www.weiverai.com`, `https://weiver.local.weiverai.com:3000`. HTTPS 로컬 실행은 [로컬 설정](../local-https.md)을 따른다. 기본 localhost에서 배포 API를 직접 호출하면 CORS에 막힌다.
- 실제 브라우저에서 첫 가입, 로그아웃 후 재로그인, 카카오 동의 취소, 이메일 미제공 계정, 복귀 화면 새로고침을 확인한다. 인증 5분·콜백 후 교환 2분 제한 및 `Secure`/`HttpOnly`/`SameSite=Lax` 쿠키 유지 여부를 확인한다.
- state가 만료되어 백엔드 callback 자체가 실패하면 프론트 복귀 화면에 도달하지 않을 수 있다. 이 경우 로그인 화면으로 돌아가 새로 시작해야 한다.

참고: [백엔드 #212](https://github.com/TEAM-WEIVER/WEIVER-SERVER/issues/212), [연결 해제·탈퇴 후속 #215](https://github.com/TEAM-WEIVER/WEIVER-SERVER/issues/215)
