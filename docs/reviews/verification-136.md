# #136 구현 검증

> 상태: 로컬 코드·인수 검증 완료. Preview·운영 배포, 실제 예약 CORS·저장은 미완료다. 운영 예약 API preflight 403으로 #136 전체 완료·병합 가능 상태로 판정하지 않는다.

## 구현과 인수 대응

- `next.config.ts`: 기존 `reactCompiler: true`를 유지하고 루트와 `/landing-assets/:path*`만 고정 HTTPS Oracle 원본으로 보내는 `beforeFiles`를 추가했다. catch-all·운영 destination override는 없다.
- 404의 홈 링크는 일반 anchor로 전체 문서 탐색한다. 기존 `replace` 대신 브라우저 기본 방문 기록을 사용한다. 별도 client 컴포넌트를 추가하지 않고 Next/Vite 경계 한 줄만 ESLint 예외를 둔다.
- #128의 빈 루트 기대는 #136 랜딩 검증으로 대체하고 로그인·인증 실패·역할 불일치 회귀를 보존했다. 보호 경로 새로고침 검증도 추가했다.
- 토스트 테스트는 본품 `/login`에서 시작하며 실제 회원가입 링크 이동 후 화면과 토스트 유지를 확인한다.
- `next.config.ts` 변경을 전체 E2E 실행 대상으로 등록했다.
- 단일 서브에이전트 코드 검토 PASS. 상세: [코드 리뷰](code-136-round1.md).

| AC      | 확인 방법                                                                                  | 결과/한계                                         |
| ------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| AC1     | 루트 HTTP 200·Location 부재·실제 heading·새로고침                                          | 로컬 production PASS                              |
| AC2     | 실제 서버 rewrite로 JS/CSS/favicon/OG 이미지 MIME·본문, 브라우저 이미지 decode             | 로컬 production PASS. 해시 파일명은 HTML에서 추출 |
| AC3·AC4 | 로그인 탭, signup, 보호 경로 직접 접근·새로고침, 재발급 401/500, 기존 역할 불일치          | 기존 API fixture로 production PASS                |
| AC5     | Next JS/CSS·RSC 내부 이동·미존재 API/페이지; 회원가입 route 실제 handler 및 HTTP 통합 확인 | PASS. 회원가입 백엔드는 격리 fake/MSW로 통제      |
| AC6     | 실제 배포 JS의 API origin 확인; 예약 POST origin/body/성공 화면 목                         | 목 PASS. 실제 CORS는 403, DB 저장 미검증          |
| AC7     | 예약 중복 409·500·네트워크 실패 화면 목                                                    | 목 PASS. 실제 API 오류 계약·배포 인수 대기        |
| AC8     | 격리 production 빌드 사본에서 원본 503·연결 실패·에셋 404·잘못된 MIME 재현                 | 4개 시나리오 PASS. 각 장애 중 `/login` 200 유지   |
| AC9     | 404 홈 클릭의 document navigation·HTTP 200·URL·실제 heading                                | production PASS                                   |

## 실행 결과

2026-10-13, Node/의존성은 기존 lockfile 기준 `pnpm install --frozen-lockfile`로 준비했다. 브랜치는 `feat/136-landing-oracle-rewrite`, 시작 HEAD `76eee58`은 조회한 최신 `origin/develop`의 `b157988`을 포함한다. 기존 Orca 작업 폴더의 main 통합 commit을 유지했다.

- ATDD Red: rewrite 구현 전 새 루트 HTTP·에셋 인수 2개가 실패함을 확인했다.
- `NEXT_PUBLIC_E2E_TEST=true pnpm build`: PASS. `next start`의 production 서버에서 검증했다.
- 테스트 플래그 없는 `pnpm build`도 PASS. 운영용 빌드 설정에서도 두 고정 rewrite가 생성됨을 확인했다.
- `pnpm typecheck`, `pnpm lint:check`: PASS.
- `pnpm test:coverage --run`: 단위 **335개/34개 파일 PASS**, 전역 70% 임계값 때문에 명령 종료 코드 1. 변경 전도 동일 임계값 미달이었다.
- `E2E_PORT=3136 E2E_EXTERNAL_SERVER=true pnpm exec playwright test --workers=2 --reporter=line`: **259개 PASS (2.4분)**.
- 전체 E2E 이후 토스트 이동 검증을 실제 링크·화면 확인으로 보강하고 해당 파일 **9개 PASS**로 재검증했다. 이 후속 변경은 테스트에만 해당한다.
- 관련 최초 E2E 39개 중 35개 PASS, 예약 4개는 `<output>`의 암묵적 `status` role까지 잡은 셀렉터 오류로 실패했다. 완료 문구로 status를 한정한 뒤 4개 및 전체 suite가 통과했다.
- 변경한 코드·테스트의 Prettier 검증을 수행했다. 신규 재사용 UI가 없어 Storybook 변경은 없다.

### 커버리지

| 지표       | 변경 전(332개) | 변경 후(335개) | 기준 |
| ---------- | -------------- | -------------- | ---- |
| Statements | 46.28%         | 46.58%         | 70%  |
| Branches   | 44.30%         | 44.46%         | 70%  |
| Functions  | 40.54%         | 40.63%         | 70%  |
| Lines      | 47.11%         | 47.44%         | 70%  |

회원가입 완료 route는 추가한 정상·400·500 테스트로 statements/branches/functions/lines 100%다. 전체 기준은 통과하지 않았으며 무관한 기존 기능을 이 이슈에서 보완하지 않았다.

### 격리 HTTP 검증

- `.next`를 임시 디렉터리에 복사하고, **복사본의** `routes-manifest.json`에 있는 두 destination만 로컬 fake origin으로 대체했다. 저장소 설정·원본 build·공유 Oracle은 변경하지 않았다.
- 복사 전 production manifest의 두 source/destination와 빈 `afterFiles`/`fallback`을 검증했다.
- 별도 `next start` 서버에서 원본 HTML 503, asset 404, asset 200/text-html, 원본 연결 실패를 재현했다. 장애가 관찰되고 본품 `/login`은 각각 200이었다. 특정 Vercel 오류 코드·사용자 fallback UI를 요구하는 검증은 아니다.
- 같은 서버에서 `API_BACKEND_URL`만 로컬 fake로 지정해 실제 `POST /api/auth/signup/complete` HTTP 요청을 수행했다. 정상 JSON 전달·응답·실제 `Set-Cookie`의 HttpOnly/Secure/SameSite와 400/500 오류 전달·쿠키 미설정을 확인했다.
- 임시 서버·복사본은 검증 후 정리했다. 실행 스크립트와 로그는 세션의 `/tmp/weiver-136-isolation.mjs`, `/tmp/weiver-136-isolation.log`에 있다. CI에 등록된 검증을 뜻하지 않는다.

### 화면 확인

- Playwright Chromium으로 1440×900 및 390×844에서 랜딩 주요 콘텐츠·예약 폼, 본품 로그인 화면을 캡처하고 확인했다. 예약 브라우저 API는 목 처리했다.
- 이미지·콘텐츠·예약 필드·본품 로그인 폼은 표시된다. 원본과 프록시 화면을 비교했다. 애니메이션에 따라 일시적으로 모바일 scrollWidth가 viewport보다 커지는 측정도 있었다. 후보 랜딩 자체의 동적 레이아웃 확인은 배포 인수에 포함한다.
- 세션 이미지: `/tmp/weiver-136-screenshots/landing-{desktop,mobile}-content.png`, `landing-{desktop,mobile}-reservation.png`, `login-{desktop,mobile}.png`. 저장소·외부 서비스에 게시하지 않았다.

## 외부 원본과 API 확인

- 랜딩 PR #18은 OPEN이고 후보 HEAD는 `cc26b1659f82b514c75def9c57add537eb360385`였다. Oracle 실제 배포 SHA·배포 시각은 아직 확인하지 못했다.
- 원본 HTML은 `/landing-assets/` JS·CSS·favicon 및 공개 도메인의 OG 이미지 주소를 참조한다. 실제 배포 JS에 `https://landing-api.weiverai.com`이 있고 `http://localhost:8080` fallback 문자열은 없었다.
- 2026-10-13 04:34 UTC 운영 Origin을 지정한 예약 OPTIONS 요청은 **403 `Invalid CORS request`**였다. 본품 rewrite가 아닌 랜딩 API CORS 설정/배포의 후속 확인이 필요하다. 목 성공을 실제 예약 성공으로 기록하지 않는다.
- Preview URL·운영 변경·실예약 데이터 생성·이슈/PR 게시·병합은 이번 로컬 검증에서 수행하지 않았다.
- 배포 인수 체크리스트와 재현 요청: [수동 인수 확인](../manual-tests/136-landing-oracle-rewrite.md).

## 세션 로그

`/tmp/weiver-136-{build-red,build,build-production,typecheck,lint,red,e2e-targeted,e2e-reservation,e2e-full,e2e-toast,coverage-before,coverage-after,isolation}.log`.
