# 코드 리뷰 — #136 Round 1

## 판정: PASS

- 검토일: 2026-10-13.
- 단일 Codex 서브에이전트 정적 코드 검토. 사용자의 지시에 따라 다자토론·추가 에이전트 없이 `.claude/agents/code-reviewer.md`와 `vercel-react-best-practices` 기준을 적용했다.
- 범위: 작업 트리 diff, `e2e/136-landing-oracle-rewrite.spec.ts`, `e2e/mocks/landing-api.ts`, `src/app/api/auth/signup/complete/route.test.ts`, 관련 기존 fixture·Playwright·CI 설정.
- Critical 0 / Major 0 / 미해소 Minor 1. **PASS는 현재 코드 변경 범위의 판정이다. 전체 AC 인수·운영 배포·병합 준비 완료 판정이 아니다.**

## Critical

- 없음. 고정 Oracle destination 두 개만 추가하며 본품 API·Next 리소스의 catch-all rewrite나 운영 destination override를 도입하지 않았다. 본품 인증·토큰·서버 API 계약 변경, 새 민감 데이터 저장, `any` 남용을 발견하지 않았다.

## Major

- 없음. 루트 파일보다 먼저 적용되는 `beforeFiles`에 요구한 두 매핑을 구현했고 기존 `reactCompiler`를 유지한다. 404 홈 링크는 서버 컴포넌트의 일반 anchor로 전체 문서 이동을 수행하며 해당 경계 한 줄에만 ESLint 예외를 둔다. 신규 client 컴포넌트·불필요한 상태·re-render를 추가하지 않았다.
- AC8은 메인의 격리 실행 스크립트·로그를 후속 확인했다. 원본 장애 중 본품 독립성을 로컬 production에서 확인한 범위이며 Vercel 운영 동작 검증을 뜻하지 않는다. AC6의 실제 CORS·DB 저장 및 Preview·운영 인수는 미완료다. 이를 완료한 AC로 보고해서는 안 된다.

## Minor

- `e2e/136-landing-oracle-rewrite.spec.ts:25` — 에셋 탐색 regex는 현재 후보 HTML의 큰따옴표·현재 파일 suffix 형식에 맞춰져 있다. 해시 파일명을 고정하지 않은 점은 적절하다. 향후 query가 붙은 에셋이나 HTML 출력 형식 변경 시 정상 빌드가 테스트를 실패시킬 수 있으므로 후보 갱신 시 MIME 검증과 경로 탐색 규칙을 함께 점검한다.

### 해소한 Minor

- `e2e/86-toast.spec.ts:233` — 개인 탭 선택 후 실제 회원가입 링크를 클릭하고 URL·이메일 폼·토스트 유지까지 확인하도록 개선했다. 변경된 코드와 해당 파일 9개 PASS 로그를 후속 확인했다.

## 코드 및 테스트 근거

- `next.config.ts:7` — `/`와 `/landing-assets/:path*`만 Oracle로 보낸다. 빈 `afterFiles`·`fallback`은 다른 본품 페이지·API가 원래 라우팅을 유지하도록 한다.
- `src/app/not-found.tsx:17` — 일반 anchor는 Next RSC 탐색과 외부 Vite HTML의 경계를 분리한다. 링크 텍스트와 기존 Button 스타일을 유지한다. 이전 `replace` 대신 일반 문서 탐색을 선택한 변화는 방문 기록 동작 차이가 있으나 인수 요구에 모순되지 않는다.
- `e2e/128-root-login-redirect-removal.spec.ts` — 현재 동작과 양립하지 않는 빈 루트·본품 toast facade 기대만 제거했다. 로그인 탭·401/500 인증 실패·역할 불일치 회귀를 보존하고 보호 경로 새로고침을 추가했다.
- `e2e/not-found.spec.ts:73` — navigation request 응답·루트 URL·실제 랜딩 heading을 검사하여 URL만 바뀌는 경계 오류를 보완한다.
- `e2e/136-landing-oracle-rewrite.spec.ts` — 루트 HTML 200/리다이렉트 부재, 실원본 rewrite를 통한 에셋 MIME, 이미지 decode, 본품 Next 리소스·RSC·미존재 경로를 독립 테스트한다. AC5의 여러 행동을 각각 테스트로 분리했다.
- `e2e/mocks/landing-api.ts` — 브라우저 API만 intercept하고 HTML·에셋의 서버 external rewrite는 실제 원본을 사용한다. 예약 요청은 정확한 API origin·POST를 검사하고 예상 밖 API를 중단·기록한다. 201/409/500/네트워크 실패를 제어한다. 이 목의 성공은 preflight·credential CORS·실제 저장을 입증하지 않는다.
- `src/app/api/auth/signup/complete/route.test.ts` — 실제 `POST` handler를 호출하고 서버 fetch만 MSW로 통제한다. body 전달·성공 JSON·HttpOnly/secure/sameSite 쿠키 설정 및 400/500 오류 전달·쿠키 미설정을 검사한다. 후속 격리 HTTP 검증에서 실제 Set-Cookie 직렬화도 추가 확인했다.
- `scripts/run-affected-e2e.mjs:39` — `next.config.ts` 변경이 전체 E2E를 실행하도록 등록했다. `.gitignore`에는 생성되는 Playwright 결과만 추가했다.

## 실행 결과의 출처와 미검증

- 이 서브에이전트는 빌드·테스트·배포를 독립 실행하지 않았다. 메인이 생성한 로컬 검증 문서·실행 스크립트와 `/tmp` 로그를 읽어 후속 확인했다. 다른 모델 검증이나 CI 결과라고 주장하지 않는다.
- 변경 전 unit 332개 → 변경 후 335개 통과. typecheck·lint·일반 production build·E2E 플래그 build 완료 결과를 문서·로그에서 확인했다. global coverage는 개선되었으나 기존 70% 임계값 미달 상태가 계속되며 coverage 명령 종료 코드는 1이다. 커버리지 검사를 통과했다고 표시해서는 안 된다.
- 최초 관련 E2E 39개 중 예약 selector 충돌로 4개 실패했고, status role을 완료 문구로 제한한 수정 후 전체 production E2E **259개 PASS** 로그를 확인했다. 전체 실행 이후 테스트에만 해당하는 토스트 검증 보강이 있었으며 해당 파일 **9개 PASS** 로그도 확인했다.
- 운영 Origin 예약 preflight가 `403 Invalid CORS request`로 실패했다고 메인에서 보고했다. 이는 Oracle API 인수 차단 사유이며 브라우저 API 목 성공으로 상쇄되지 않는다. API 담당 연계·실브라우저 CORS·실제 저장 확인 전 #136 전체 완료/운영 인수 완료 판정은 불가하다.
- `/tmp/weiver-136-isolation.mjs`와 `.log`를 읽었다. 원본 build를 임시 디렉터리에 복사하고 복사본 manifest의 목적지 두 개만 fake origin으로 치환해 실행한다. 저장소의 생산 설정에는 override를 추가하지 않는다. 원본 HTML 503·연결 실패·에셋 404·잘못된 MIME 네 경우와 각각 `/login` 200을 assertion으로 확인한다.
- 동일 격리 production HTTP 서버에서 fake 백엔드로 실제 회원가입 route를 검증한다. 200 JSON/body·실제 HttpOnly/Secure/SameSite Set-Cookie, 400/500 전달·쿠키 미설정 세 경우 PASS 로그를 확인했다. 공유 Oracle 중단이나 실제 회원가입 데이터 생성으로 검증하지 않는다.
- [구현 검증](verification-136.md)과 [배포 인수 체크리스트](../manual-tests/136-landing-oracle-rewrite.md)는 로컬 PASS와 CORS403·실제 저장·Preview/운영 대기를 구분한다. 모바일/desktop 화면 확인은 메인의 기록이며 이 서브에이전트가 이미지들을 별도 육안 검증하지 않았다.
- 실제 Oracle 배포 SHA와 후보 일치, Preview·운영 배포·실제 저장·이슈/PR 게시·병합 결과는 확인하지 않았다. 체크리스트 미완료 상태를 유지한다.
