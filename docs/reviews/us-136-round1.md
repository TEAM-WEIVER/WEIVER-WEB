# US 리뷰 — #136 Round 1

## 판정: PASS

- 검토일: 2026-10-13.
- 대상: `docs/plans/136-landing-assets-oracle-rewrite.md`의 AC1–AC9 및 구현·검증·배포 계획.
- 방식: 단일 Codex 서브에이전트의 정적 검토. 사용자의 명시적 지시에 따라 다자토론과 추가 서브에이전트는 진행하지 않았다.
- 기준: `.claude/agents/us-reviewer.md`, `docs/ai-workflow.md`, 이슈 #136 원문 및 현재 저장소 코드.
- Critical 0 / Major 0 / Minor 2. PASS는 기획의 완결성 판정이며 구현·테스트 실행·실제 화면·API 저장·배포 확인을 뜻하지 않는다.

## Critical

- 없음. US에 서비스 방문자가 명시되고 AC1–AC9에 Given/When/Then이 모두 있다. 요구한 두 external rewrite에 기술적으로 구현 불가능한 조건은 발견하지 않았다.

## Major

- 없음. 핵심 정상 흐름, 인증 실패, 예약 중복·서버·네트워크 오류, 원본 장애를 다룬다. 저장 확인·CORS와 브라우저 목 검증을 구분하고 선행 계약·배포 확인 전 전체 완료로 처리하지 않는다.
- 기존 빈 루트·toast facade 기대와 404 홈 복귀 테스트 영향을 반영했다. 서버 external rewrite를 브라우저 목으로 통제할 수 없다는 제약, production 인증 가드 검증, 서버 회원가입 route의 백엔드 통제 필요성을 계획에 명시했다.

## Minor

- [ ] AC5는 본품 정적 리소스·RSC 이동·회원가입 서버 route·알 수 없는 경로 보존을 한 번호로 묶는다. 각각 검증 가능하지만 ATDD 작성 때 별도 테스트로 나누고 AC5와의 대응을 기록하면 실패 원인을 읽기 쉽다. 근거: 기획 AC5 및 개발 순서 1·3.
- [ ] 본품 404 링크의 기존 `replace` 방문 기록 정책은 구현 시 확인으로 남아 있다. 일반 anchor와 `location.replace()` 중 어떤 동작이 필요한지 개발 전에 결정해 AC9의 브라우저 뒤로 가기 기대를 명확히 하면 좋다. 현재 요구사항은 랜딩으로 전체 문서 이동이므로 기획 PASS를 막는 결함은 아니다. 근거: `src/app/not-found.tsx:18`, 기획 구현안의 경계 이동 항목.

## 확인한 사실과 근거

- 이슈 #136을 `gh issue view`로 직접 읽었다. 루트·landing-assets 두 매핑, 본품 리소스·API 제외, Preview 후 병합 전 운영 확인, 예약 CORS·저장 확인 요구가 기획에 반영되어 있다. [이슈 원문](https://github.com/TEAM-WEIVER/WEIVER-WEB/issues/136).
- `next.config.ts`에 현재 `reactCompiler: true`가 있고 rewrite는 없다. [Next.js 공식 문서](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites)에서 `beforeFiles`가 파일 기반 경로보다 먼저 적용됨을 확인했다. 공식 문서는 현재 버전 기준이므로 프로젝트의 Next 16.1.6 실제 실행은 후속 build/E2E로 확인해야 한다.
- `src/app/not-found.tsx:18`에 루트 대상 Next `Link`가 있다. `e2e/not-found.spec.ts`의 홈 복귀 테스트는 현재 URL만 확인한다. AC9와 해당 테스트 보강 계획은 두 앱 사이 문서 이동을 검증할 수 있다.
- `e2e/128-root-login-redirect-removal.spec.ts`는 빈 루트와 `window.__toast`를 기대하고, `e2e/86-toast.spec.ts`는 루트에서 토스트를 호출한다. 두 기대는 외부 랜딩 HTML과 충돌하므로 기획의 수정 범위가 필요하다.
- `scripts/run-affected-e2e.mjs`는 현재 `next.config.ts`를 전체 E2E 트리거로 분류하지 않는다. `playwright.config.ts`는 외부 서버 모드를 지원하고, `src/app/corporate/layout.tsx`는 development에서 가드를 우회한다. 기획의 production 테스트 방식은 이 차이를 반영한다.
- `src/app/api/auth/signup/complete/route.ts`는 `API_BACKEND_URL`의 회원가입 동의 엔드포인트를 호출하고 성공 쿠키·백엔드 오류를 처리한다. 브라우저에서 로컬 route 자체를 목 처리한 검증으로 대체하지 않는 계획이 적절하다.
- 랜딩 후보 `codex/17-landing-domain-assets`의 `apps/web/src/api.js`를 GitHub API로 독립 확인했다. 예약은 `POST /api/v1/reservations`, JSON, `credentials: 'include'`이며 409는 `DUPLICATE_EMAIL`, 기타 비-ok는 `RESERVE_FAILED`다. [후보 코드](https://github.com/TEAM-WEIVER/weiver-landing/blob/codex/17-landing-domain-assets/apps/web/src/api.js). 이 확인은 현재 공개 원본이 해당 코드와 같은 빌드라는 증거는 아니다.
- [Vercel 공식 문서](https://vercel.com/docs/projects/deploy-from-cli)에서 `vercel deploy --prod`가 production 환경으로 빌드·배포하고 운영 도메인에 할당되는 동작을 확인했다. 기획은 Preview·프로젝트 확인·롤백 정보·운영 검증·병합 순서를 명시한다.

## 미검증 및 후속 실행 조건

- 이 검토에서는 코드 구현, 의존성 설치, 타입·lint·unit·coverage·build·E2E, Preview/운영 배포를 수행하지 않았다.
- 공개 원본 HTML·에셋의 HTTPS/MIME 확인은 메인 세션의 읽기 전용 조사 기록이며, 이 서브에이전트가 동일 요청을 재실행하지 않았다.
- Oracle 배포 SHA·배포 시각과 후보 일치, 배포 JS의 API base URL, API 서버 전체 계약, 실제 Origin 허용, credential CORS, DB 저장은 아직 인수 검증되지 않았다.
- 실원본 의존 테스트와 제어된 장애 테스트의 분리·격리 방법, 배포 계정·프로젝트·환경변수·롤백 가능 여부는 구현 단계에서 구체화·실행한다.
- 실제 저장 확인이 불가능하거나 예약/CORS 검증이 실패하면 rewrite 단독 성공과 전체 이슈 완료를 구분하고 운영 인수 완료로 표시하지 않는다.
