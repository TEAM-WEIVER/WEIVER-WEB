# [128] 루트 로그인 리다이렉트 제거

> 상태: 사용자 구현 승인 후 ATDD 구현 및 이슈 인수 검증 완료. 세 서브에이전트 기획·코드 검토 PASS. 신규 인수 17개·기존 토스트 9개와 단위 332개가 통과했다. 전역 단위 커버리지는 변경 전·후 모두 70% 미달이다. 실제 Claude·Gemini 교차 검토나 공개 도메인 배포 완료를 뜻하지 않는다. 상세: `docs/reviews/verification-128.md`, `docs/reviews/code-128-round1.md`.

## 배경과 범위

- 이슈: https://github.com/TEAM-WEIVER/WEIVER-WEB/issues/128
- 현재 `src/app/page.tsx`는 `/` 요청을 `redirect('/login')`으로 보낸다.
- 별도 레포에서 관리하는 랜딩과 이 앱의 진입 경로를 구분할 수 있도록, 이 앱 루트의 로그인 자동 이동을 제거한다.
- 포함: 앱 자체 루트 HTTP 응답·브라우저 URL·빈 본문, `/login` 직접 접근, 기존 보호 경로·토스트 회귀 확인.
- 제외: 별도 레포 랜딩 구현, 도메인·프록시·호스팅 설정, 로그인 API·토큰·역할 판정 변경, 기존 기업 개발 환경 가드 우회 제거.

## 운영 구조와 권장 구현안

- 사용자 확정: 별도 랜딩 레포가 `weiverai.com/`을 담당하고, 이 앱은 같은 도메인의 `/login`, `/corporate` 등 기존 앱 경로를 제공한다. 앱 서브도메인은 사용하지 않는다.
- 구현안: 앱 자체 `/`는 페이지 고유 콘텐츠 없이 HTTP `200`을 반환하고 자동 이동하지 않는다. HTML·스크립트·공통 레이아웃이 포함된 응답 전체를 0바이트로 만드는 의미가 아니다. 이 앱에 별도 랜딩·안내문·로그인 링크를 구현하지 않는다.
- 공개 도메인의 `/` 요청은 배포 단계의 경로 분기를 통해 랜딩 레포로 전달되어야 한다. 이번 앱 코드 변경만으로 랜딩이 연결되지는 않는다.
- 실제 경로 분기 설정·기술 방식은 이번 범위 밖이다. 아래 AC의 앱 자체 검증과 공개 도메인 배포 후속 검증을 구분한다.

## User Story

US: 서비스 방문자로서, 같은 도메인의 루트에서 별도 랜딩을 이용하고 기존 앱 경로에서 로그인·서비스를 이용하고 싶다. 왜냐하면 랜딩과 앱을 각각 운영하면서 앱 루트의 로그인 자동 이동이 진입 경로를 방해하지 않아야 하기 때문이다.

## Acceptance Criteria

### AC1. 앱 자체 루트 요청과 URL 유지

- Given: 배포 경로 분기를 거치지 않는 앱 origin 또는 로컬 production 서버가 실행 중이고, 사용자는 비로그인 상태이거나 기존 유효 인증 상태이다.
- When: 해당 앱 자체 `/`를 직접 요청하고 브라우저에서 접속·새로고침한다.
- Then: 리다이렉트를 따라가지 않은 HTTP 응답이 `200`이고 `Location` 헤더가 없다. 서버 응답·클라이언트 초기화에 의한 자동 이동 없이 브라우저 pathname이 `/`로 유지된다. 로그인 화면·보호 경로로 자동 이동하지 않는다.

### AC2. 앱 자체 루트의 빈 페이지

- Given: AC1을 만족하는 앱 자체 루트이다.
- When: 사용자가 앱 자체 `/`에 접속한다.
- Then: 루트 페이지 고유 콘텐츠는 없고 `/`에 머문다. 랜딩·안내문·로그인 링크를 추가하지 않으며 HTML·스크립트·공통 레이아웃 및 토스트 기능은 유지한다.

### AC3. 로그인 페이지 직접 접근 유지

- Given: 사용자가 비로그인 상태이다.
- When: `/login`을 직접 입력하거나 새로고침한다.
- Then: 기존 기본 탭의 로그인 폼이 표시되고 개인·기업 탭 선택 시 해당 폼이 표시된다. pathname은 `/login`으로 유지되며 루트 변경 때문에 404·루트 이동·리다이렉트 반복이 발생하지 않는다.

### AC4. 보호 경로의 정상 인증 접근 유지

- Given: 해당 경로에서 허용하는 역할과 유효한 access token이 있거나, 해당 역할이 기존 sessionStorage에 있고 토큰 재발급이 성공한다.
- When: 기업 사용자가 `/corporate/dashboard`에, 개인 사용자가 `/applicant/dashboard` 또는 `/onboarding/resume`에 접속한다.
- Then: 기존 인증·역할 가드가 접근을 허용하고 해당 페이지의 기존 렌더링 동작이 유지된다. 루트·로그인 페이지로 새로운 자동 이동이 발생하지 않는다. 온보딩 진행 단계 가드는 이번 요구사항에 포함하지 않는다.

### AC5. 보호 경로의 인증 실패 처리 유지

- Given: 사용자가 유효한 인증 상태를 갖지 못하고, 토큰 재발급이 인증 거절 또는 API 오류로 실패한다.
- When: `/corporate/dashboard`, `/applicant/dashboard`, `/onboarding/resume`에 직접 접속한다.
- Then: 기존 가드가 `/login`으로 이동시킨다. 인증 확인 중·실패 후에는 가드 내부의 페이지 고유 콘텐츠·데이터가 표시되지 않으며, 루트로 보내거나 반복 이동하지 않는다. 가드 밖의 기존 헤더·사이드바는 보존한다.

### AC6. 보호 경로의 역할 불일치 처리 유지

- Given: 유효한 인증 상태가 있으나 접속 경로의 허용 역할과 다르다.
- When: 개인 사용자가 `/corporate/dashboard`에 접속하거나, 기업 사용자가 `/applicant/dashboard` 또는 `/onboarding/resume`에 접속한다.
- Then: 기존 역할 판정대로 개인은 `/applicant/dashboard`, 기업은 `/corporate/dashboard`로 이동한다. 허용되지 않은 경로의 가드 내부 페이지 고유 콘텐츠·데이터는 표시되지 않는다. 가드 밖의 기존 헤더·사이드바는 보존한다.

### AC7. 루트 레이아웃의 토스트 회귀

- Given: E2E용 토스트 facade가 활성화된 앱에서 `/`에 접속한다.
- When: `e2e/86-toast.spec.ts`의 토스트 표시·타입·자동 소멸·수동 닫기·스택·이동 유지 흐름을 실행한다.
- Then: `e2e/86-toast.spec.ts`의 기존 검증이 모두 통과하고 앱 루트에서도 토스트가 정상 표시된다. 빈 본문 때문에 공통 토스트가 제거되거나 초기화되지 않는다.
- 기존 이동 유지 테스트는 `history.pushState`를 사용한다. 실제 `Link` 전환을 통한 검증 강화는 이번 수정의 새 요구사항으로 확대하지 않고 후속으로 기록한다.

## API 연동

최신 OpenAPI 조회: 2026-10-13, https://api.piuda.site/v3/api-docs, OpenAPI 3.1.0.

신규 API 연동·요청·응답 변경은 없다. 아래 엔드포인트는 기존 로그인·가드 회귀의 참조이며 루트에서 호출할 API가 아니다.

| AC / 회귀 대상        | 메서드 | 엔드포인트                   | 기존 요청                               | 응답 / 처리                                    |
| --------------------- | ------ | ---------------------------- | --------------------------------------- | ---------------------------------------------- |
| AC1–AC3, AC7          | 없음   | 없음                         | 루트·공개 페이지 렌더링                 | API 연동 불필요                                |
| AC4–AC6               | POST   | `/api/auth/reissue`          | 기존 refresh cookie와 CSRF 처리 유지    | `data.accessToken`; 실패 시 기존 `/login` 이동 |
| 기존 기업 로그인 회귀 | POST   | `/api/auth/companies/login`  | 기존 클라이언트의 `loginId`, `password` | `data.accessToken`, `data.role`                |
| 기존 개인 로그인 회귀 | POST   | `/api/auth/applicants/login` | `email`, `password`                     | `data.accessToken`, `data.role`                |

- 재발급 응답에는 role이 없다. 정상 재발급 AC는 기존 저장 role을 전제로 하며 새로운 role 복구 기능을 요구하지 않는다.
- 기존 fixture처럼 XSRF cookie가 없는 경우 선행 `GET /api/auth/csrf`와 `POST /api/auth/reissue`를 함께 목 처리한다.
- OpenAPI는 로그인·재발급에 성공 응답만 기술한다. 실패 상태·조건은 기존 구현과 기존 테스트를 기준으로 보존하며, 이 문서에서 새 백엔드 계약을 확정하지 않는다.
- 사용자 구현 승인에 따라 기존 API 계약을 유지한다. 신규 API 변경 없이 목 기반 회귀를 검증했으며 실제 백엔드 계약·공개 도메인 배포는 별도 검증 대상이다.

## 컴포넌트 스펙

- 변경 대상: `src/app/page.tsx`의 루트 자동 이동 제거와 빈 본문 반환.
- 사용할 shadcn/ui 컴포넌트: 없음. 빈 루트 본문에 신규 UI를 추가하지 않는다.
- 상태 관리: 루트에 신규 client state·Zustand store·인증 API 호출을 추가할 필요가 없다.
- 접근성: 신규 상호작용 요소는 없으며 기존 공통 레이아웃·토스트의 접근성을 유지한다.
- 공통 레이아웃: `src/app/layout.tsx`의 토스트 등 기존 공통 기능을 유지한다.

## 검증 계획

아래 계획에 따라 구현·테스트를 수행했다. production 인수 테스트 26개, 단위 테스트 332개, build·lint·typecheck가 통과했다. 전역 커버리지는 기존 70% 임계값에 미달하며 상세 실행 결과는 `docs/reviews/verification-128.md`를 참조한다.

- ATDD: 확정된 AC로 루트 HTTP 응답·초기화 후 URL·로그인 접근·보호 경로의 허용/거절/역할 이동을 검증한다. API 정상·실패 응답은 기존 목 전략을 따른다.
- 회귀: `e2e/86-toast.spec.ts`, 기존 `src/app/login/__tests__/login.test.tsx`, `src/lib/__tests__/login-api.test.ts`, `src/lib/__tests__/protected-routing.test.ts`를 실행한다. 로그인 입력검증·API 네트워크 흐름의 신규 요구사항은 추가하지 않는다.
- 기업 레이아웃은 현재 `NODE_ENV === 'development'`일 때 가드를 우회한다. 따라서 개발 서버 결과만으로 AC4–AC6 통과를 판정하지 않는다.
- 최종 보호 경로 검증은 `NEXT_PUBLIC_E2E_TEST=true pnpm build` 후 `pnpm start`의 production 서버에서, Playwright `E2E_EXTERNAL_SERVER=true` 설정으로 수행한다. 루트 HTTP 응답과 토스트 회귀도 해당 빌드에서 확인한다.
- 후속 개발의 필수 품질 확인은 `pnpm lint:check`, `pnpm typecheck` 및 워크플로우의 인수·단위·커버리지·화면 검증을 따른다.

## 향후 고려사항

- 공개 도메인 배포 후속: `weiverai.com/`은 별도 랜딩을 표시하고 `/login`, `/signup`, `/onboarding`, `/corporate`, `/applicant` 및 하위 경로는 기존 앱으로 전달되는지 확인한다. 이 검증은 AC1의 앱 origin 검증과 별개이며 이번 이슈의 앱 코드 변경만으로 완료할 수 없다.
- 경로 분기는 앱의 관련 API·정적 asset·RSC 요청도 지원해야 한다. 같은 도메인에서 두 Next 앱을 운영할 경우 `/_next` asset 충돌, public asset 경로, RSC 및 클라이언트 전환을 배포 작업에서 확인한다. 이 문서는 프록시·rewrite·asset prefix 등 특정 기술 방식을 확정하지 않는다.
- Next.js 공식 [Multi-zones 가이드](https://nextjs.org/docs/app/guides/multi-zones)는 앱별 경로 분기·정적 asset 충돌 방지와 zone 간 hard navigation을 설명한다. 실제 랜딩·앱 배포가 이 구조를 사용하는지 확인하고, 두 앱 사이 전환과 앱 내부 클라이언트 전환을 구분해 후속 검증한다. 참조는 배포 기술 방식을 확정하는 의미가 아니다.
- 실제 `Link` 전환에서 토스트가 유지되는지 확인하는 #86 검증 강화는 후속으로 다룬다.
- 동시 재발급·브라우저 복원·인증 저장 상태 변조 등 드문 인증 경계 사례는 이번 루트 수정의 새 AC로 확대하지 않는다.
