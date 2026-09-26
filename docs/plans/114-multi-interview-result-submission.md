# [#114] 다회 AI 면접 결과 선택 제출 및 재지원 잠금

## 목표

지원자가 서버가 허용한 횟수의 AI 면접 중 종료된 최신 후보를 선택해 최종 제출할 수 있게 하고, 제출 이후
31일 동안 면접 진행과 결과 제출을 모두 잠근다.

## 범위

- 대상: `/applicant/dashboard`, `/applicant/interview`
- 포함: 다회 면접 진행 횟수 표기, 대시보드 최종 제출 모달, 분석 요청 시점 이동,
  제출 후 잠금·재지원 D-day, 관련 단위/E2E 테스트
- 제외: 면접 결과 리포트 화면, 과거 면접 회차 목록·선택 UI, WebSocket 질문/답변 규격 변경
- HTML 목업: 사용자 지시에 따라 생성하지 않는다.
- 디자인 기준:
  - [대시보드·다회 면접 상태](https://www.figma.com/design/usdxcZCS8IBMlBpVlDfeJ2/%EC%9C%84%EB%B2%84?node-id=1830-840&m=dev)
  - [면접 결과 제출 확인 모달](https://www.figma.com/design/usdxcZCS8IBMlBpVlDfeJ2/%EC%9C%84%EB%B2%84?node-id=1839-1530&m=dev)

## 확정 정책

1. 면접 가능 총횟수는 `totalCount`를 서버 응답에서 받는다. CTA의 `n/totalCount`에서 `n`은
   **완료한 면접 횟수**다.
2. 각 면접 종료는 최종 제출이 아니며, 사용자는 대시보드에서 다음 면접 진행 또는 결과 제출을 선택한다.
3. `pendingSubmissionSessionId`는 **가장 최근에 종료된 미제출 면접 세션**이다. 과거 회차를 다시
   고르는 목록 UI는 이번 범위에 포함하지 않는다.
4. 결과 제출은 `pendingSubmissionSessionId`를 대상으로 analysis API를 호출하는 최종 확정 동작이다.
5. 결과 제출 성공 시 31일 동안 면접 진행과 결과 제출이 모두 불가능하다.
6. 재지원 D-day는 최종 제출 뒤 잠금 기간에만 표시한다.

## 사용자 스토리 및 인수 기준

### US1. 다회 면접 진행

지원자로서 남은 횟수 안에서 AI 면접을 더 진행하고 싶다. 왜냐하면 더 나은 회차를 최종 결과로
선택할 수 있어야 하기 때문이다.

- Given: 프로필 제출 및 AI 서류 분석이 완료됐고 `remainingCount > 0`이며 잠금 상태가 아니다.
  When: 대시보드를 연다.
  Then: `AI 면접 진행하기 (n/totalCount)` CTA를 표시한다. `n = totalCount - remainingCount`이며 다음 면접을
  시작할 수 있다.
- Given: 종료됐지만 아직 최종 제출하지 않은 면접이 있다.
  When: 면접 종료 화면에 도달한다.
  Then: analysis API를 호출하지 않고 대시보드 복귀 동작을 제공한다.
- Given: `remainingCount = 0`이고 최종 제출 전이다.
  When: 대시보드를 연다.
  Then: 면접 진행 CTA는 비활성화하고 결과 제출 CTA는 유지한다.
- Given: 최종 제출 뒤 31일 잠금 기간이 끝났다.
  When: 대시보드를 연다.
  Then: 서버가 반환한 재지원 가능 상태를 기준으로 새 지원 주기의 면접 진행 CTA를 활성화하고 D-day
  안내를 숨긴다.

### US2. 면접 결과 최종 제출

지원자로서 가장 만족한 면접 결과를 최종 제출하고 싶다. 왜냐하면 제출 뒤에는 더 이상 면접을
진행하지 않는다는 결정을 명확히 할 수 있어야 하기 때문이다.

- Given: `pendingSubmissionSessionId`가 있고 제출 잠금 상태가 아니다.
  When: `면접 결과 제출하기`를 누른다.
  Then: Figma 기준 확인 모달을 열고 제목 `면접 결과를 제출하시겠습니까?`, 안내
  `제출한 뒤에는 다시 면접을 볼 수 없습니다.`를 표시한다. 31일 잠금 정책은 접근 가능한 보조 설명에도
  포함한다.
- Given: 결과 제출 확인 모달이 열려 있다.
  When: `계속 면접 보기`를 누른다.
  Then: API 요청 없이 모달을 닫는다.
- Given: 결과 제출 확인 모달이 열려 있다.
  When: `제출`을 누른다.
  Then: `POST /api/interviews/{pendingSubmissionSessionId}/analysis`를 한 번만 호출하고 로딩 중
  중복 클릭을 막는다.
- Given: `pendingSubmissionSessionId`가 없다.
  When: 대시보드를 연다.
  Then: `면접 결과 제출하기` CTA를 비활성화하고 모달을 열지 않는다.

### US3. 제출 후 잠금·재지원

지원자로서 최종 제출 뒤 다음 면접 가능 시점을 알고 싶다. 왜냐하면 잠금 기간 중 불필요한 행동을
시도하지 않아야 하기 때문이다.

- Given: analysis 요청이 성공했다.
  When: 최신 remaining 상태를 다시 조회한다.
  Then: 면접 진행 및 결과 제출 CTA를 모두 비활성화하고 재지원 D-day를 표시한다.
- Given: 31일 잠금 기간이다.
  When: 대시보드를 다시 열거나 새로고침한다.
  Then: 서버 `remainingCount = 0`, 제출 후보 없음 상태를 기준으로 두 CTA를 활성화하지 않는다.
- Given: analysis 요청이 실패한다.
  When: 오류 응답을 받는다.
  Then: 모달은 닫지 않고 `면접 결과 제출에 실패했습니다. 잠시 후 다시 시도해 주세요.`와 `다시 시도`를 표시하며
  후보와 면접 진행 가능 상태를 유지한다.
- Given: analysis 요청은 성공했지만 remaining 재조회가 실패한다.
  When: 성공 응답 직후 최신 잠금 상태를 확인한다.
  Then: 중복 POST를 막은 채 `제출 상태를 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.`를 안내한다.
  `다시 시도`는 POST를 반복하지 않고 remaining 상태만 재조회한다.
- Given: 제출 확인 모달이 열려 있다.
  When: Escape·배경 클릭·`계속 면접 보기`를 수행한다.
  Then: API 호출 없이 모달을 닫고 트리거 버튼으로 포커스를 되돌린다.

## API 매핑 및 상태 판별 규칙

| 목적                | API                                                          | 프론트 규칙                                                                                                                    |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 다회 상태·잠금 조회 | `GET /api/interviews/remaining`                              | `totalCount`, `remainingCount`, `pendingSubmissionSessionId`, `reapplyDDay`, `reapplyAvailableDate`로 CTA 및 D-day 상태를 결정 |
| 최종 결과 제출      | `POST /api/interviews/{pendingSubmissionSessionId}/analysis` | 대시보드 확인 모달의 `제출`에서만 호출; 성공 뒤 remaining 재조회                                                               |
| 면접 오류 신고      | `POST /api/interviews/{sessionId}/error-report`              | 기존 진행 중/종료 화면 신고 흐름 유지                                                                                          |

상태는 다음처럼 현재 응답 필드로 판별한다.

| remainingCount | pendingSubmissionSessionId | 화면 상태                                                 |
| -------------- | -------------------------- | --------------------------------------------------------- |
| `> 0`          | `null`                     | 다음 면접만 진행 가능                                     |
| `> 0`          | UUID                       | 다음 면접 진행 및 최신 완료 회차 결과 제출 가능           |
| `0`            | UUID                       | 면접 횟수 소진, 결과 제출만 가능                          |
| `0`            | `null`                     | 최종 제출 뒤 잠금; 면접·결과 제출 불가, 재지원 D-day 표시 |

전제 계약:

- `totalCount`는 서버가 허용한 총 면접 횟수다. 현재 기본 정책값은 1회이며, 프론트는 1·4 등 특정 값으로
  고정하지 않는다. Figma의 `1/4`는 다회 진행 상태의 예시다.
- `pendingSubmissionSessionId`는 가장 최근 종료된 미제출 세션을 반환한다.
- analysis 성공 뒤 다음 remaining 응답은 `remainingCount: 0`, `pendingSubmissionSessionId: null`을 반환한다.
- 31일이 지나 재지원 가능해지면 다음 remaining 응답은 새 주기의 면접 가능 상태(`remainingCount > 0`)를 반환한다.
- analysis의 `INTERVIEW_ANALYSIS_ALREADY_REQUESTED`는 중복·다중 탭 제출을 이미 제출된 상태로 처리하고 remaining을 재조회한다.

## 상태 전이

`면접 가능(후보 없음)` → `면접 가능(후보 있음)` → `횟수 소진·제출 대기` →
`최종 제출 모달` → `제출 중` → `31일 잠금(면접/제출 불가, D-day 표시)` → `새 주기 면접 가능`

`제출 중 → 실패`는 `면접 가능(후보 있음)`으로 복귀한다.

## 예상 변경 단위

- `src/app/applicant/dashboard/page.tsx`: remaining 상태를 대시보드 전역 제출 상태로 전달·재조회
- `src/app/applicant/dashboard/_components/interview-callout.tsx`: 회차 CTA·결과 제출 CTA·잠금 상태
- `src/app/applicant/dashboard/_components/interview-result-submit-modal.tsx`: Figma 확인 모달
- `src/app/applicant/dashboard/_components/reapply-notice.tsx`: 잠금 상태에서만 D-day 노출
- `src/app/applicant/interview/page.tsx`, `interview-finished-screen.tsx`: 종료 후 analysis 호출 제거·대시보드 복귀
- `src/lib/interview-api.ts`: 계약 타입을 다회 정책에 맞게 조정
- 대시보드·면접 E2E 및 단위 테스트: 위 AC의 정상·중복·실패·잠금 상태

## ATDD 순서

1. 후보 없음/후보 있음/소진 후 미제출/잠금/잠금 해제 상태와 `totalCount`가 1·4인 remaining 응답에 대한
   대시보드 E2E를 작성한다.
2. 확인 모달의 닫기·포커스 복귀·제출·중복 방지·실패·재조회 실패 E2E를 작성한다.
3. 종료 화면에서 analysis가 호출되지 않고 대시보드로 복귀하는 E2E를 작성한다.
4. 다중 탭·오래된 후보 ID가 서버 오류를 반환하면 remaining을 재조회해 권위 상태를 표시하는 단위/E2E를 작성한다.
5. UI → API·상태 전이 구현 순으로 테스트를 통과시킨다.
