# E2E Test Guide

## 목적

E2E 테스트는 사용자가 실제 브라우저에서 수행하는 핵심 플로우가 깨지지 않는지 확인한다. 모든 validation, 버튼 상태, API 실패 분기를 E2E로 검증하지 않는다. 세부 로직은 unit/component 테스트에서 검증하고, E2E는 서비스 관점의 smoke/regression 흐름에 집중한다.

## 현재 담당 범위

- `signup/individual-signup.spec.ts`: 개인 회원가입, 이메일 인증, 약관 동의, 온보딩 진입
- `34-onboarding.spec.ts`: 이력서, 자기소개서, 포트폴리오 온보딩 흐름
- `cover-letter/cover-letter.spec.ts`: 자기소개서 prefill, 저장 흐름
- `applicant/interview.spec.ts`: AI 면접 WebSocket/STOMP 흐름

## 정리 원칙

- 유지: 회원가입, 로그인, 온보딩, 공고 작성, 지원자 리스트/리포트 접근처럼 제품 핵심 경로
- 축소: 필수 입력 validation, 버튼 disabled, 세부 에러 문구처럼 unit/component 테스트로 충분한 케이스
- 제거 또는 이관: 중복 플로우, 구현 세부에 강하게 결합된 테스트, 불안정한 타이머/재시도 세부 케이스
- API 응답 shape은 실제 프론트 API wrapper가 받는 구조와 동일하게 유지한다.
- 인증 mock 방식은 모든 spec에서 동일하게 사용한다.

## 우선 작업 순서

1. 실패 목록 수집
   - `pnpm build`
   - `pnpm test:e2e`
   - 실패 spec, 실패 step, 에러 메시지를 기록한다.

2. 인증 헬퍼 재정의
   - 기존 `localStorage.setItem('accessToken')` 방식은 현재 인증 구조와 맞지 않는다.
   - 현재 구조에 맞게 access token, role, cookie/reissue 흐름을 일관되게 주입한다.
   - 가능한 방식:
     - 실제 로그인 API를 `page.route()`로 mock하고 로그인 플로우를 통과한다.
     - 테스트 전용 헬퍼로 `sessionStorage` role과 reissue API mock을 함께 설정한다.
     - 보호 라우트 진입 테스트는 미인증/인증 상태를 명확히 나눠 작성한다.

3. 회원가입 E2E 복구
   - 필수 약관 기준을 최신 정책과 맞춘다.
   - 약관 완료 응답은 `{ data: { accessToken, role } }` 형태로 맞춘다.
   - 가입 완료 후 `/onboarding/resume` 이동을 검증한다.

4. 로그인/보호 라우트 E2E 정리
   - 개인 로그인 후 `/applicant/dashboard`
   - 기업 로그인 후 `/corporate/dashboard`
   - 미인증 사용자가 보호 라우트 접근 시 `/login`

5. 온보딩 E2E 축소
   - 유지:
     - 이력서 작성 후 자기소개서 이동
     - 자기소개서 작성 후 포트폴리오 이동
     - 포트폴리오 완료 후 대시보드 이동
   - unit/component로 이관:
     - 필드별 validation
     - 중복 제출 버튼 상태
     - 세부 API 부분 실패
     - 글자 수 제한

6. 자기소개서 단독 E2E 정리
   - `cover-letter.spec.ts`와 `34-onboarding.spec.ts`의 중복을 줄인다.
   - prefill과 저장 happy path 정도만 E2E로 유지한다.

7. AI 면접 E2E 안정화
   - 최소 유지:
     - 면접 시작
     - WebSocket CONNECT
     - `QUESTION_READY` 표시
     - 답변 제출
   - 재연결, 타임아웃, STOMP ERROR 세부 케이스는 flaky 가능성을 보고 유지 여부를 결정한다.

8. API mock 전략 통일
   - `page.route()` 기반 mock을 기본으로 사용한다.
   - 공통 fixture는 `e2e/mocks`에 둔다.
   - 테스트별 mock 응답은 실제 API 응답 wrapper와 동일한 형태를 사용한다.

9. CI 실행 기준 정리
   - PR에서는 smoke E2E만 실행한다.
   - `develop` 또는 `main` 병합 전에는 전체 E2E를 실행한다.
   - flaky 테스트는 바로 retry 수를 늘리지 말고 원인과 mock 안정성을 먼저 점검한다.

## 새 E2E 추가 기준

새 E2E는 아래 조건 중 하나를 만족할 때 추가한다.

- 사용자가 결제, 가입, 지원, 제출, 생성, 삭제처럼 되돌리기 어려운 작업을 수행한다.
- 여러 페이지와 API가 연결된 핵심 업무 흐름이다.
- unit/component 테스트로는 라우팅, 인증, 브라우저 동작까지 검증하기 어렵다.

아래 케이스는 우선 unit/component 테스트를 고려한다.

- 단일 컴포넌트 validation
- 단순 버튼 disabled 상태
- 텍스트 렌더링
- API 응답 데이터 매핑
- 순수 함수 또는 hook 로직

## 검증 명령

```bash
pnpm lint:check
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

## 주의사항

- E2E에서 직접 storage/cookie를 조작할 경우 현재 인증 구조와 일치해야 한다.
- mock API가 실제 response wrapper와 다르면 테스트는 통과해도 실제 앱이 깨질 수 있다.
- 같은 사용자 흐름을 여러 spec에서 반복하지 않는다.
- 불안정한 타이머, WebSocket, 재시도 테스트는 최소 범위만 유지한다.
