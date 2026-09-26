# #114 기획 교차 검토 — Round 1

## 결과

**보완 완료 — 현재 `remaining` 응답 필드 기반으로 ATDD 진입 가능**

## Critical

1. ~~`pendingSubmissionSessionId`만으로는 상태를 구별할 수 없다.~~
   `remainingCount`와 `pendingSubmissionSessionId` 조합으로 상태를 판별하도록 확정했다.
2. ~~analysis 요청의 원자적 멱등성 계약이 없다.~~
   `INTERVIEW_ANALYSIS_ALREADY_REQUESTED`를 이미 제출된 권위 상태로 처리하고 remaining을 재조회한다.

## Major

1. 면접 시작 API의 잠금·잔여 횟수·활성 세션 거절 계약이 필요하다.
2. 최종 제출 성공 뒤 remaining 재조회 실패 시 권위 상태를 안전하게 보여줄 처리 규칙이 필요하다.
3. 재지원 가능 시 새 지원 주기에서 어떤 값으로 재설정되는지 확인이 필요하다.
4. Figma의 결과 제출 모달 문구와 31일 잠금 정책을 접근 가능한 보조 설명으로 함께 제공해야 한다.

## 보완 반영

- `n/4`를 완료 횟수(`totalCount - remainingCount`)로 고정했다.
- 제출 후보를 가장 최근 종료된 미제출 세션으로 명시했다.
- 모달 닫기·오류·재조회 실패·잠금 해제 AC를 추가했다.

## ATDD 진입 조건

동적 `totalCount`, analysis 성공 뒤 `remainingCount: 0`·`pendingSubmissionSessionId: null`, 재지원 가능 시
`remainingCount > 0`이라는 응답 전제를 기준으로 ATDD에 진입한다. 기본 정책값은 1회이며 Figma의 `1/4`는
다회 진행 상태 예시로 처리한다.
