# [#101] 구직자 대시보드·AI 면접 API 연동

## 목표

정적 값으로 표시되는 대시보드의 면접 가능 상태를 서버 데이터로 대체하고, WebSocket으로
진행된 AI 면접을 REST 기반의 분석 요청과 오류 신고까지 끊김 없이 연결한다.

## 범위와 경로

- 경로: 표준 경로 — 신규 REST API 연동과 핵심 면접 종료 흐름을 포함한다.
- 대상 화면: `/applicant/dashboard`, `/applicant/interview`
- 포함: 잔여 면접/재지원 D-day 조회, 종료 분석 요청, 오류 신고, 중복 제출 방지,
  로딩·네트워크·세션 오류 상태, 인수·단위 테스트.
- 제외: 면접 분석 결과를 조회·표시하는 별도 결과 화면, WebSocket 질문/답변 프로토콜 변경,
  카메라·음성 인식 기능 변경.
- HTML 목업: 사용자 지시로 생성하지 않는다.
- 완료 화면 디자인 기준: [Figma node 1830:3968](https://www.figma.com/design/usdxcZCS8IBMlBpVlDfeJ2/%EC%9C%84%EB%B2%84?node-id=1830-3968&m=dev).
- 오류 신고 모달 디자인 기준: [Figma node 1831:4397](https://www.figma.com/design/usdxcZCS8IBMlBpVlDfeJ2/%EC%9C%84%EB%B2%84?node-id=1831-4397&m=dev).

## 사용자 스토리

1. **US1**: 지원자로서 남은 AI 면접 횟수와 재지원 가능일까지 남은 기간을 보고 싶다.
   왜냐하면 현재 지원 가능한지 판단하고 다음 행동을 정할 수 있어야 하기 때문이다.
2. **US2**: 지원자로서 AI 면접을 마치면 내 면접 데이터가 한 번만 분석 요청되었음을 알고 싶다.
   왜냐하면 종료 처리의 누락·중복 없이 결과 분석을 신뢰할 수 있어야 하기 때문이다.
3. **US3**: 지원자로서 면접 도중 발생한 오류를 신고하고 접수 여부를 확인하고 싶다.
   왜냐하면 문제가 발생해도 지원 과정에서 도움을 요청할 수 있어야 하기 때문이다.

## Acceptance Criteria

### AC1. 대시보드 면접 가능 상태 조회

- Given: 인증된 지원자가 `/applicant/dashboard`에 진입한다.
- When: 화면이 초기 데이터를 불러온다.
- Then: `GET /api/interviews/remaining` 응답의 잔여 면접 횟수와 재지원 D-day를 표시한다.
- Then: 기존 프로필 조회 실패와 독립적으로 면접 가능 상태의 로딩·오류 상태를 표시한다.
- Then: 면접 시작 CTA는 프로필 작성이 완료됐고 `remainingCount > 0`일 때만 활성화한다.
  `remainingCount = 0`이면 비활성화하고 재지원 D-day 안내를 표시한다.

### AC2. 대시보드 조회 실패

- Given: 지원자가 대시보드에 진입했다.
- When: 잔여 면접 조회가 네트워크 오류 또는 서버 오류로 실패한다.
- Then: 프로필·온보딩 UI는 계속 사용할 수 있고, 면접 카드와 재지원 안내에는 재시도 가능한 오류
  안내 또는 안전한 미확인 상태가 표시된다.
- Then: 401이 토큰 갱신으로 해결되지 않으면 기존 인증 정책에 따라 로그인으로 이동한다.

### AC3. 면접 종료 후 분석 요청

- Given: WebSocket에서 `INTERVIEW_FINISHED`를 수신했고 유효한 `interviewSessionId`가 있다.
- When: 종료 화면의 "면접 완료" 버튼을 누른다.
- Then: `POST /api/interviews/{interviewSessionId}/analysis`를 한 번 호출해 분석을 요청하고,
  종료 화면에는 요청 중·성공·실패 상태가 명확히 표시된다.
- Then: 200 응답의 `status: TRANSCRIPT_SAVE_REQUESTED`를 "분석 접수 완료"로 표시하고,
  `next_available_interview_at`을 재응시 가능 시각으로 사용한다. 분석 결과 조회는 범위 밖이다.
- Then: 사용자는 분석 요청 성공 후 대시보드로 돌아갈 수 있다.
- Then: 분석 요청의 진행·접수 완료·실패 상태는 `role="status"` 또는 `aria-live="polite"`로 알리고,
  실패 상태는 `role="alert"`로 알린다. 종료 화면 전환 시 결과 헤딩으로 포커스를 이동한다.

### AC4. 분석 요청의 중복 및 세션 오류 방지

- Given: 분석 요청이 시작됐거나 성공한 상태이다.
- When: 같은 종료 이벤트가 재수신되거나 사용자가 종료 UI를 반복 조작한다.
- Then: 같은 세션에 대한 분석 API는 추가 호출되지 않는다.
- Given: `INTERVIEW_FINISHED` 이벤트가 도착한다.
- When: 이벤트의 `interview_session_id`가 현재 활성 세션 ID와 일치하지 않거나 누락됐다.
- Then: 상태를 `FINISHED`로 전이하거나 분석 API를 호출하지 않고, 이벤트를 무시하거나 세션 오류로
  기록한다. 일치할 때만 세션 ID를 보존한 원자적 `FINISHED` 전이를 수행한다.
- Then: 새로고침·다중 탭·네트워크 결과 미확정·401 자동 재시도에서도 중복 분석이 되지 않도록,
  서버의 `INTERVIEW_ANALYSIS_ALREADY_REQUESTED` 거절을 이미 접수된 상태로 처리한다. 클라이언트의
  `submitting/success` 상태 차단과 `skipAuthRetry`는 같은 사용자 동작 중 추가 POST를 막는 보조 수단이다.
- Given: 종료 이벤트에 세션 ID가 없거나 요청 전에 세션이 유실됐다.
- When: 분석을 요청하려 한다.
- Then: API를 호출하지 않고, 사용자가 안전하게 대시보드로 돌아갈 수 있는 세션 오류 안내를 표시한다.

### AC5. 분석 요청 실패

- Given: 면접이 종료되고 분석 요청을 보낼 수 있는 상태이다.
- When: 분석 API가 네트워크·5xx·인증 오류로 실패한다.
- Then: 사용자에게 안전한 오류 문구와 단일 사용자 주도 재시도 동작을 제공한다. 인증 만료인 경우
  기존 인증 갱신/로그인 정책을 따르며, 서버 원문 오류는 사용자에게 그대로 노출하지 않는다.
- Then: `INTERVIEW_NOT_FINISHED`는 종료되지 않은 세션 오류로, `INTERVIEW_ANALYSIS_ALREADY_REQUESTED`는
  이미 접수된 상태로 각각 안내한다. 후자의 경우 `GET /api/interviews/remaining`을 다시 조회한다.

### AC6. 면접 오류 신고

- Given: 면접 진행 또는 종료 화면에 있는 지원자이다.
- When: "오류 신고"를 선택하고 필수 정보를 입력해 제출한다.
- Then: `POST /api/interviews/{interviewSessionId}/error-report`가 한 번 호출되고, 접수 완료 상태를
  확인할 수 있다.
- Given: 오류 신고가 진행 중이거나 완료됐다.
- When: 사용자가 다시 제출을 시도한다.
- Then: 중복 요청을 보내지 않는다.

### AC7. 오류 신고 검증·실패

- Given: 오류 신고 양식이 열려 있다.
- When: 필수 입력이 비어 있거나 신고 API가 실패한다.
- Then: 빈 값은 요청 없이 필드 오류를 표시하고, 서버 실패는 입력값을 보존한 채 재시도 안내를 표시한다.
- Given: 세션 ID가 없다.
- When: 오류 신고를 제출한다.
- Then: 요청하지 않고 세션 오류 안내를 표시한다.
- Then: 401이 토큰 갱신으로 해결되지 않으면 기존 인증 정책에 따라 로그인으로 이동한다.
- Then: 오류 신고 다이얼로그는 열릴 때 첫 상호작용 요소에 포커스를 옮기고, 닫힐 때 트리거에
  되돌린다. 로딩·오류·접수 결과는 스크린 리더가 인식할 수 있어야 한다.
- Then: `content`는 앞뒤 공백을 제거한 1~500자 자유 텍스트로 검증하며, 첨부 파일은 지원하지 않는다.
  신고 내용은 컴포넌트 로컬 상태에만 보관하고 접수·닫기·언마운트 시 폐기한다.

## UI·상태 설계

| 영역                 | 정상 상태                                            | 로딩/제출 상태                           | 실패·예외 상태                 |
| -------------------- | ---------------------------------------------------- | ---------------------------------------- | ------------------------------ |
| `InterviewCallout`   | 잔여 횟수와 면접 시작 CTA 표시                       | 초기 조회 중에는 스켈레톤/읽기 전용 상태 | 조회 실패 안내와 재시도        |
| `ReapplyNotice`      | API D-day로 원형 배지·문구 표시                      | D-day 자리표시자                         | 미확인 안내와 재시도           |
| 면접 종료 화면       | 분석 접수 완료와 대시보드 이동                       | 분석 요청 중 CTA 비활성화                | 실패 문구·재시도·대시보드 이동 |
| 오류 신고 다이얼로그 | Figma node 1831:4397 기준의 신고 입력·접수 완료 표시 | 제출 버튼 비활성화                       | 검증/서버/세션 오류와 재시도   |

면접 종료 시에는 `INTERVIEW_FINISHED.interview_session_id`와 활성 세션 ID가 일치할 때만 세션 ID를
보존한 `FINISHED` 전이를 수행한다. 분석 요청 완료 또는 대시보드 이탈 시에만 인터뷰 상태를 초기화한다.
STOMP 오류 뒤에는 `ERROR` 상태를 유지해 오류 신고 진입점을 보존하며, 종료 처리 중에는 재연결이
시작되지 않도록 종료 가드를 둔다. API 호출 상태는 세션 단위로 `idle → submitting → success | error`로
관리하고 `submitting`·`success`에서 중복 클릭을 막는다. 네트워크·새로고침·다중 탭을 아우르는 최종
중복 방지는 서버 멱등성 계약으로 처리한다.

## API 연동 매핑

| 목적           | 메서드·경로                              | 화면 동작                                      | 확정 계약                                                                                                                                                                                               | 후속 확인                                                       |
| -------------- | ---------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 면접 가능 상태 | `GET /api/interviews/remaining`          | 잔여 횟수·재지원 D-day 표시                    | `{ totalCount, remainingCount, reapplyDDay, reapplyAvailableDate, pendingSubmissionSessionId }`; 총 1회, 완료 후 31일 뒤 재지원 가능, CTA는 `remainingCount > 0`                                        | `pendingSubmissionSessionId`의 null 가능 여부와 대기 상태 UI    |
| 분석 요청      | `POST /api/interviews/{id}/analysis`     | 종료 후 세션별 한 번 요청                      | body 없음, FINISHED 세션만 요청 가능, 200 data `{ interview_session_id, status: 'TRANSCRIPT_SAVE_REQUESTED', next_available_interview_at }`, 재요청·복구 불가 시 `INTERVIEW_ANALYSIS_ALREADY_REQUESTED` | 비즈니스 오류 코드의 HTTP status·envelope `code`, 401 처리 정책 |
| 오류 신고      | `POST /api/interviews/{id}/error-report` | Figma 기준의 자유 텍스트 신고와 접수 결과 표시 | JSON body `{ content: string }`, 로그인 구직자 신고, 200 응답 `data: string`                                                                                                                            | 서버의 content 최대 길이·공백 검증                              |

세 엔드포인트 모두 기존 `apiRequest`를 사용해 Authorization, CSRF 정책을 일관되게 적용한다. analysis는
`skipAuthRetry`로 같은 사용자 동작 안의 자동 POST 재전송을 막고, 재요청은 서버의
`INTERVIEW_ANALYSIS_ALREADY_REQUESTED` 규약을 이미 접수된 상태로 처리한다. error-report는 중복 클릭을
클라이언트의 제출 상태로 막는다. 스키마가 확정되기 전에는 필드명이나 POST body를 추정하여 구현하지 않는다.

## 예상 변경 단위

- `src/lib/interview-api.ts`: REST 타입과 세 API 래퍼.
- `src/app/applicant/dashboard/page.tsx`: 프로필 데이터와 독립적인 면접 가능 상태 조회·재시도.
- `src/app/applicant/dashboard/_components/interview-callout.tsx`: 잔여 횟수와 CTA 상태.
- `src/app/applicant/dashboard/_components/reapply-notice.tsx`: 서버 D-day 및 오류 상태.
- `src/store/interview-store.ts`: 종료 후 세션 ID 보존, 분석/신고 요청 상태.
- `src/hooks/use-interview-websocket.ts`: 종료 이벤트에서 세션 ID를 보존하는 상태 전이.
- `src/app/applicant/interview/page.tsx`와 하위 컴포넌트: 분석 결과 상태와 오류 신고 UI 연결.
- `e2e/applicant/*.spec.ts`, `src/lib/__tests__/*`, 컴포넌트 테스트: AC 기반 HTTP·WebSocket 결합 검증.
- `src/mocks/handlers/interview.ts`: 세 REST API의 정상·실패 MSW 핸들러.

## ATDD 및 검증 계획

1. AC1~2: remaining API 정상·401·실패 응답에서 대시보드 값, 로딩, 재시도, 기존 프로필 UI 유지 검증.
2. AC3~5: 일치/불일치 종료 이벤트, `INTERVIEW_FINISHED` 후 body 없는 analysis 요청, 200의
   `TRANSCRIPT_SAVE_REQUESTED`, `INTERVIEW_NOT_FINISHED`, `INTERVIEW_ANALYSIS_ALREADY_REQUESTED`, 실패·재시도,
   세션 ID 보존, 종료 중 재연결 차단을 검증.
3. AC6~7: 신고 입력 검증, 성공/기존 접수, 중복 차단, 401·서버·세션 오류 및 다이얼로그 포커스를 검증.
4. API 래퍼와 상태 전이 단위 테스트, Playwright 인수 테스트, MSW 정상·오류 핸들러를 작성한다.
5. `pnpm lint:check`, `pnpm typecheck`, 관련 단위/E2E 테스트 및 커버리지 70%를 실행한다.
6. 분석 요청 뒤 대시보드로 복귀하면 remaining 데이터를 다시 조회해 CTA·D-day가 최신 상태로 보이는지
   검증한다.

## 개발 진입 판단

analysis·remaining·error-report의 기본 계약이 확정되어 ATDD·구현 단계에 진입할 수 있다.

- analysis의 재요청은 서버가 `INTERVIEW_ANALYSIS_ALREADY_REQUESTED`로 차단한다. 프론트는 이를
  이미 접수된 상태로 표현한다.
- `content`는 프론트에서 trim 기준 1~500자로 제한한다. 세션 발급 전 장애 신고 경로는 후속 항목으로
  관리한다. 현재 세션 ID 기반 API만으로는 세션 발급 전 오류를 신고할 수 없다.
