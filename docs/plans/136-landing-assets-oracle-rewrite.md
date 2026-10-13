# [136] 루트 랜딩 및 landing-assets Oracle rewrite 연결

> 상태: 사용자 구현 승인 후 로컬 구현·검증 완료. 단일 서브에이전트 기획·코드 검토 PASS. E2E 259개, 단위 335개, 타입·lint·프로덕션 빌드 통과. 전역 커버리지는 기존 70% 미달이며 실제 예약 CORS는 403이다. Preview·운영 인수·실제 저장은 대기. [검증 기록](../reviews/verification-136.md).

## 브리핑과 범위

- 이슈: [WEIVER-WEB #136](https://github.com/TEAM-WEIVER/WEIVER-WEB/issues/136).
- 표준 경로: 라우팅 변경이므로 `docs/ai-workflow.md`의 기획 단계로 진입한다. 사용자 지시에 따라 다자토론 대신 서브에이전트 1개가 검토한다.
- 최초 요청에서 기획·단일 검토를 작성한 뒤 사용자가 구현 시작을 승인했다. 개발 브랜치는 `feat/136-landing-oracle-rewrite`이며 시작 HEAD에 조회한 최신 `origin/develop` 변경이 포함되어 있다.
- 현재 `next.config.ts`는 `reactCompiler: true`만 설정하고, `src/app/page.tsx`는 `null`을 반환한다. #128의 루트 리다이렉트 제거에 이어 실제 랜딩 연결을 담당한다.
- 포함: 루트·랜딩 에셋 external rewrite, 404 홈 링크의 랜딩 경계 이동, 기존 본품 경로 회귀, 테스트 기대값 조정, Preview/운영 인수 검증 계획과 결과 기록.
- 제외: 랜딩 UI·예약 API 구현, Oracle Nginx·DNS·인증서 변경, 본품 인증·쿠키 계약 변경, 모든 경로/API를 Oracle로 전달하는 규칙.
- 운영 인수에는 랜딩 예약 API의 CORS·저장 확인도 포함한다. 필요한 Oracle/API 수정은 랜딩 저장소 #17과 연계하고 본품 설정 변경만으로 완료 처리하지 않는다.

## 확인된 사실과 선행 조건

2026-10-13 읽기 전용 확인:

- [랜딩 PR #18](https://github.com/TEAM-WEIVER/weiver-landing/pull/18)은 OPEN이며 후보 브랜치는 `codex/17-landing-domain-assets`다.
- 공개 원본 HTML은 `/landing-assets/favicon.png`, `/landing-assets/assets/index-Cuuvh6q2.js`, `/landing-assets/assets/index-Zd6lf8vC.css`를 참조한다. `curl`로 JS·CSS·favicon의 HTTPS 200과 각각의 MIME 타입을 확인했다. Python의 로컬 인증서 저장소 오류는 별도로 있었으나 TLS 검증을 끄지 않은 `curl`은 성공했다.
- HTML의 OG/Twitter 이미지 주소는 `https://weiverai.com/landing-assets/weiver-og.png`다. 이미지 전체·JS 내부 API 주소·실제 예약 저장은 아직 검증하지 않았다.
- 후속 개발 시작 때 후보 commit SHA, 배포 시각, HTML이 참조하는 에셋 파일을 다시 확인·기록한다. 원본은 외부에서 갱신될 수 있으므로 위 파일명을 테스트에 영구 고정하지 않는다.
- 랜딩 Deploy workflow가 미병합 후보를 이전 main 빌드로 덮어쓰지 않도록 배포 담당자가 실행 순서를 맞춘다. 본품 PR 병합과 랜딩 PR 병합·배포는 별개다.
- API의 운영 허용 Origin `https://weiverai.com` 및 저장 기능 준비를 확인한다. Preview Origin 허용 여부는 별도로 확인하며 미허용 Preview에서 실제 예약 API가 실패한 것을 rewrite 실패로 해석하지 않는다.

## User Story

US: 서비스 방문자로서, `weiverai.com/`에서 랜딩을 보고 예약을 신청하며 같은 도메인의 `/login`에서 본품을 이용하고 싶다. 왜냐하면 소개·예약과 실제 서비스를 하나의 도메인에서 끊김 없이 이용해야 하기 때문이다.

## Acceptance Criteria

### AC1. 루트 랜딩 제공과 URL 유지

- Given: `/landing-assets/` 에셋을 사용하는 Oracle 후보 빌드가 정상 서비스되고 rewrite가 배포되어 있다.
- When: 사용자가 Preview 또는 `https://weiverai.com/`을 직접 열거나 새로고침한다.
- Then: 루트 HTML은 200으로 제공되고 랜딩 고유 제목·주요 콘텐츠가 표시된다. 브라우저는 접속한 도메인의 `/`에 머무르며 원본 도메인이나 `/login`으로 자동 이동하지 않는다.

### AC2. 랜딩 에셋 정상 제공

- Given: AC1의 루트가 제공되고 HTML·JS·CSS가 `/landing-assets/`를 참조한다.
- When: 브라우저가 랜딩의 이미지·favicon·JS·CSS를 로드한다.
- Then: 해당 에셋은 같은 공개 도메인의 `/landing-assets/*`에서 200과 적합한 MIME 타입으로 제공되고 실제 이미지·스타일·상호작용이 동작한다. `/landing-assets/*`에서 본품 HTML이 반환되거나 경로 접두사가 중복되지 않는다. HTML의 공유 이미지 URL도 정상 로드된다.

### AC3. 본품 페이지 직접 접근·새로고침 유지

- Given: 비로그인 사용자가 `/login`, `/signup/account-info`에 접근하거나, 기존 역할·인증 조건을 만족하는 사용자가 본품 보호 경로에 접근한다.
- When: `/login`, `/signup/account-info`, `/onboarding/resume`, `/applicant/dashboard`, `/corporate/dashboard`를 각각 직접 열고 새로고침한다.
- Then: 각 본품 페이지가 기존 폼·콘텐츠와 인증 규칙대로 동작한다. 랜딩 HTML로 대체되지 않고 새 404·루트 이동·리다이렉트 반복이 발생하지 않는다. 로그인 기본 기업 탭과 개인 탭 전환도 유지된다.

### AC4. 본품 인증 실패 처리 유지

- Given: 보호 경로 접근 시 기존 토큰 재발급이 401 또는 서버 오류로 실패한다.
- When: 사용자가 `/onboarding/resume`, `/applicant/dashboard`, `/corporate/dashboard` 중 하나에 접근한다.
- Then: 기존 가드가 `/login`으로 이동시킨다. 가드 내부 보호 콘텐츠는 인증 확인 중·실패 후 표시되지 않고 랜딩으로 이동하거나 반복 이동하지 않는다. 가드 밖 기존 공통 UI는 보존한다.

### AC5. 본품 리소스·API route와 내부 이동 유지

- Given: 본품 페이지와 기존 회원가입 완료 route가 제공되고 정상/오류 백엔드 응답을 제어할 수 있는 검증 환경이다.
- When: 본품을 로드하고 본품 내부 클라이언트 이동·회원가입 완료 요청을 수행한다.
- Then: 실제 참조된 `/_next/*` JS/CSS와 본품 내부 이동의 RSC 요청이 정상 처리된다. `POST /api/auth/signup/complete`는 기존 Next route에서 처리되어 정상 응답·쿠키 설정 및 백엔드 오류 전달을 유지한다. `/_next/*`, `/api/auth/*`, 기타 `/api/*`를 Oracle로 보내는 규칙은 없다. 존재하지 않는 API/페이지도 Oracle 랜딩으로 대체하지 않는다.

### AC6. 예약 API 직접 요청과 실제 저장

- Given: 랜딩 API 배포·DB가 준비되고 검증 대상 브라우저 Origin이 허용되어 있다.
- When: 사용자가 유효한 예약 정보를 입력하고 필수 동의 후 기존 예약 동작을 실행한다.
- Then: 브라우저 요청은 `https://landing-api.weiverai.com`의 기존 예약 엔드포인트로 직접 전송된다. 필요한 preflight와 실제 응답이 CORS를 통과하며 기존 성공 UI가 표시된다. 응답 식별자와 서버 저장 결과를 연결해 실제 저장을 확인한다. 본품 `/api/*`를 경유하지 않는다.

### AC7. 예약 API 오류 처리 유지

- Given: 랜딩 예약 API가 중복 이메일 409·서버 오류 응답을 반환하거나 네트워크 요청이 실패한다.
- When: 사용자가 기존 예약 제출을 수행한다.
- Then: 409는 기존 중복 이메일 안내로, 기타 API/네트워크 실패는 기존 예약 실패 안내로 처리되고 성공·저장 완료로 표시되지 않는다. 새 오류 UI를 본품에 추가하지 않으며 CORS/Origin 설정 실패는 배포 검증 실패로 기록한다. DB 저장 여부는 응답만으로 추정하지 않는다.

### AC8. 원본 HTML·에셋 장애의 검증과 배포 차단

- Given: 원본이 5xx/연결 실패 상태이거나 필수 에셋이 404·잘못된 MIME 타입으로 응답한다.
- When: 검증자가 해당 상태에서 루트·에셋 요청과 `/login` 요청을 확인한다.
- Then: 랜딩 인수 검증은 실패로 기록하고 운영 배포·병합을 진행하지 않는다. `/login` 등 본품 경로는 원본 장애와 독립적으로 기존 응답을 유지한다. 새 fallback 화면이나 특정 프록시 오류 상태 코드는 요구하지 않으며 배포 후 장애에는 이전 정상 Vercel 배포로 롤백한다.

### AC9. 404에서 랜딩으로 전체 문서 이동

- Given: 사용자가 본품의 존재하지 않는 경로에서 기존 404 화면을 보고 있다.
- When: 사용자가 “홈으로 돌아가기” 링크를 누른다.
- Then: 전체 문서 탐색으로 `/`의 랜딩 콘텐츠가 표시된다. URL만 `/`로 바뀌고 빈 화면이 되거나 랜딩 HTML을 RSC로 해석하는 오류가 발생하지 않는다. 링크 이름·키보드 접근은 유지한다.

## 구현안과 컴포넌트 스펙

`next.config.ts`에 아래 `rewrites()`만 추가하는 것을 기본안으로 한다.

```ts
async rewrites() {
  return {
    beforeFiles: [
      {
        source: '/',
        destination: 'https://landing-origin.weiverai.com/',
      },
      {
        source: '/landing-assets/:path*',
        destination: 'https://landing-origin.weiverai.com/landing-assets/:path*',
      },
    ],
    afterFiles: [],
    fallback: [],
  };
}
```

- `reactCompiler: true`를 유지한다. 본품 루트 컴포넌트·layout·인증 가드·API route 수정은 필요하지 않다.
- `beforeFiles`는 파일 기반 루트보다 먼저 적용되어 기존 `null` 페이지 대신 원본을 제공한다. 근거: [Next.js rewrites 공식 문서](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites).
- 신규 shadcn/ui 컴포넌트·상태 저장소·클라이언트 API 코드는 없다. 접근성·키보드 동작은 기존 랜딩과 본품을 회귀 확인한다.
- 랜딩과 본품은 Vite HTML/Next 앱으로 나뉜다. 기존 `src/app/not-found.tsx`의 `<Link href="/" replace>`가 경계 이동 대상이다. 이 링크만 일반 anchor로 전체 문서 탐색하게 구현했다. 기존 `replace` 대신 브라우저 기본 방문 기록을 사용하며 별도 client 코드를 추가하지 않는다. 본품 내부 Next `Link` 이동은 유지한다.
- HTML 목업은 신규 화면 설계가 없어 이 기획의 산출물에서 제외한다. 기존 후보 랜딩의 초기·성공·오류 화면을 후속 브라우저 검증 대상으로 사용한다.

## API 연동

2026-10-13 `https://api.weiverai.com/v3/api-docs`의 OpenAPI 3.1.0과 현재 본품 소스를 확인했다. 본품 신규 API 계약은 없다. 랜딩 예약 API는 별도 서비스이므로 본품 OpenAPI로 계약을 확정하지 않는다.

| AC          | 메서드   | 대상                                                             | 검증/계약                                                                                                                         |
| ----------- | -------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| AC1·AC2·AC8 | GET      | Oracle `/`, `/landing-assets/:path*`                             | 외부 rewrite 대상. HTML·정적 파일 제공                                                                                            |
| AC3·AC4     | GET/POST | 기존 본품 `/api/auth/csrf`, `/api/auth/reissue`, 개인·기업 login | 기존 요청·역할·실패 동작 유지. 신규 연동 없음                                                                                     |
| AC5         | POST     | 본품 `/api/auth/signup/complete`                                 | 로컬 Next route → `API_BACKEND_URL`의 `/api/auth/applicants/signup/agreements`. 기존 body·응답·HttpOnly cookie 처리 유지          |
| AC6·AC7     | POST     | `https://landing-api.weiverai.com/api/v1/reservations`           | 후보 `apps/web/src/api.js`의 기존 JSON·`credentials: 'include'` 유지. 409는 `DUPLICATE_EMAIL`, 기타 비-ok는 `RESERVE_FAILED` 처리 |

- 후보 프런트 코드에서 확인한 예약 JSON은 `visitorId`, `sessionId`, `name`, `email`, `reservationType`, `privacyConsent`, `jobFamily`, `applicantType`, `primaryRole`, `utm`이다. 반환 JSON은 이어쓰기에 `id`, `surveyAccessToken`을 사용한다. 이는 프런트 코드 근거이며 필수 필드·전체 서버 응답 계약·현재 배포 API와의 일치는 개발 전 랜딩/API 담당자와 확인한다.
- 방문자 bootstrap은 `POST /api/v1/visitors/bootstrap`, 이벤트는 `POST /api/v1/events`이며 같은 API origin으로 직접 요청한다. 본품에 해당 API를 추가하지 않는다.
- `credentials: 'include'` 요청이므로 정확한 허용 Origin과 `Access-Control-Allow-Credentials: true` 및 필요한 method/header의 preflight 허용을 실브라우저에서 확인한다. `Access-Control-Allow-Origin: *`를 성공 조건으로 인정하지 않는다([MDN CORS 문서](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)).
- 랜딩 계약과 실제 배포 확인이 끝나기 전 rewrite 자체의 독립 테스트는 가능하지만 AC6·AC7 완료 판정은 불가하다.
- API 검증 기록에는 Origin, path/method, status, 허용 Origin 응답, 저장 확인 여부를 남긴다. 예약 개인정보·인증 쿠키·토큰은 문서와 스크린샷에서 제거한다.

## 개발 순서와 검증 계획

### 1. 선행 확인과 ATDD

- 개발 전 이슈 #136 연계 브랜치·기준 develop, Oracle 후보 SHA·에셋 목록, 랜딩 예약 계약·Origin 설정을 확인한다.
- AC 기반 `e2e/136-landing-oracle-rewrite.spec.ts`를 구현 전에 작성한다. UI 검증은 role/label/text를 사용한다.
- 서버 external rewrite는 브라우저 `page.route()`나 브라우저 MSW로 가로챌 수 없다. 고정 HTTPS 원본을 로컬 fake로 바꾸는 검증용 설정이 필요하다면 테스트 범위에서만 명시적으로 구성하고 운영 destination을 바꾸지 않는다. AC8의 제어된 장애 테스트에는 이 방식 또는 격리된 검증 환경을 사용하며 공유 Oracle 원본을 중단하지 않는다.
- 자동 검증은 설정의 두 매핑·catch-all 부재, production 서버의 루트·실제 에셋·본문/MIME 확인, 본품 회귀를 조합한다. 실원본 의존 테스트와 목 기반 본품 테스트의 결과를 구분한다.
- 기존 본품 API의 정상·401·500은 기존 `e2e/mocks`·인증 fixture를 재사용한다. 예약 성공·실패 UI 목은 실제 랜딩 계약 확인 후 구성하며 실제 CORS·저장은 별도 실연동으로 확인한다.

### 2. 기존 테스트 기대값 정리 후 설정 구현

- `e2e/128-root-login-redirect-removal.spec.ts`의 빈 루트·루트 toast facade 기대는 external HTML과 양립하지 않는다. #136에서 빈 루트 검증을 랜딩 검증으로 대체하고 `/login`·보호 경로·역할 불일치 회귀는 보존한다. 원본 랜딩에서 본품 `window.__toast`를 기다리지 않는다.
- `e2e/86-toast.spec.ts`의 시작 경로 `/`를 본품 `/login`으로 옮기고 기존 toast 이동 검증의 목적을 유지한다. 변경 전에 현재 목적지 `/login`과의 중복을 해소하도록 본품 내 다른 목적지(예: `/signup/account-info`)를 검토한다.
- `e2e/not-found.spec.ts`의 홈 복귀 테스트를 URL뿐 아니라 전체 문서 이동 후 랜딩 콘텐츠 표시까지 검증하도록 보강하고, `src/app/not-found.tsx`의 홈 링크를 AC9에 맞춘다.
- `scripts/run-affected-e2e.mjs`는 현재 `next.config.ts`만 바뀌면 E2E를 생략한다. 공유 라우팅 설정 변경을 전체 E2E 대상으로 등록한다.
- 위 인수 기대값·fixture를 먼저 정리하고 `next.config.ts`의 두 rewrite를 구현한다. 신규 UI/비즈니스 로직은 만들지 않는다.

### 3. 로컬 production 검증

- `pnpm typecheck`, `pnpm lint:check`, `pnpm test --run`, `pnpm test:coverage`, `pnpm build`를 실행한다. 커버리지가 기존 임계값 미달이면 변경 전후를 구분하여 기록하고 config 변경을 위해 의미 없는 테스트를 늘리지 않는다.
- 인증 가드 검증은 development 우회 때문에 `next dev`로 완료 판정하지 않는다. `NEXT_PUBLIC_E2E_TEST=true pnpm build` → `pnpm start` → `E2E_EXTERNAL_SERVER=true pnpm test:e2e`로 production 인수 검증한다.
- 회원가입 API route는 서버 측 백엔드를 통제하는 테스트에서 정상 응답·cookie와 오류 전달을 확인한다. 브라우저에서 로컬 route 자체를 목 처리한 결과는 서버 route 회귀 검증으로 인정하지 않는다.
- 신규 재사용 UI가 없으므로 Storybook 추가는 필요하지 않다. 실제 화면·Network·console로 루트와 본품 페이지를 확인한다.

### 4. Preview → 운영 → 병합

1. 기존 본품 Vercel 프로젝트 ID·연결·Preview 환경변수를 확인한다. 새 프로젝트를 만들지 않는다.
2. 변경 브랜치 Preview에서 AC1–AC5와 에셋·경계 이동을 검증한다. 예약은 허용된 Preview Origin에서 확인하거나 미허용 사유와 운영 검증 대기를 기록한다.
3. Preview 성공 후 운영 배포를 진행한다. 이번 기획 요청은 운영 배포 실행 승인이 아니다. 실행 시 대상 프로젝트, commit, 기존 정상 deployment ID와 롤백 경로를 확인한다. 이슈가 요구하는 병합 전 공개 도메인 확인에는 필요 시 동일 브랜치 `vercel deploy --prod`를 사용한다. 이는 운영 도메인에 반영된다([Vercel 공식 문서](https://vercel.com/docs/projects/deploy-from-cli)).
4. `https://weiverai.com/`와 `/login`을 재검증하고 운영 Origin의 예약 요청·CORS·실제 저장까지 AC6·AC7을 확인한다. 오류는 제어된 요청/목으로 검증하고 운영 데이터 장애를 유발하지 않는다.
5. 결과를 `docs/reviews/verification-136.md`와 이슈/PR에 기록한다. 배포 URL·commit·원본 후보 SHA·검증 시각·AC별 성공/실패/미검증·로그/스크린샷을 포함한다. 자동화가 어려운 저장 확인은 `docs/manual-tests/136-landing-oracle-rewrite.md`에 남긴다.
6. 모든 이슈 체크리스트와 CI, 사람 검수를 마친 뒤 `Closes #136`으로 병합한다. 병합에 따른 재배포가 운영 설정·검증 후보를 바꾸지 않는지도 확인한다.

## 완료 기준과 남은 사람 검증

- 두 rewrite와 기존 `reactCompiler` 유지, 타입·lint·빌드 및 기존 본품 회귀 통과.
- Preview에서 루트·이미지·favicon·CSS·JS 정상 제공, 본품 직접 접근·새로고침·API route 회귀 확인.
- 운영 공개 도메인 루트와 로그인 정상 동작, 랜딩 API 직접 전송·CORS·실제 저장 확인.
- 검증 결과를 기록하고 이슈 체크리스트 완료 후 병합한다. API/Oracle 담당 후속이 남으면 전체 완료로 표시하지 않는다.
- 사람 검증 대상: API 연동 표의 서비스 경계·예약 계약 확인 범위, Preview Origin 허용 여부, 운영 배포 순서. 기획 검토 PASS는 구현·배포 인수 완료를 뜻하지 않는다.
- 기획 검토 Minor는 구현 승인 이후 AC5를 별도 테스트로 분리하고 404 홈 링크에 일반 문서 탐색·기본 방문 기록을 적용하는 방식으로 정리했다.

## 향후 고려사항

- Oracle 원본 장애의 자동 fallback/모니터링·캐시 무효화 전략은 후속 이슈로 다룬다.
- origin 변경 전 저장한 랜딩 이어쓰기 토큰의 이전은 랜딩 저장소 정책에 따른다.
- 공유 미리보기 크롤러 캐시와 드문 브라우저 복원·동시 요청은 핵심 인수와 분리한다.
- `/landing-assets` 자체의 빈 suffix·후행 slash·쿼리 등은 Next 정규화 동작을 확인하되 새 catch-all 규칙으로 해결하지 않는다.

## 참고

- [AI 개발 워크플로우](../ai-workflow.md)
- [통합 추적: 랜딩 #17](https://github.com/TEAM-WEIVER/weiver-landing/issues/17)
- [랜딩 에셋 분리 PR #18](https://github.com/TEAM-WEIVER/weiver-landing/pull/18)
- [#128 선행 기획](128-root-login-redirect-removal.md)
