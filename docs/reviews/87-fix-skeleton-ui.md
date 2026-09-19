# 코드 리뷰 — #87 Round 1

## 판정: PASS

## Critical

- 없음

## Major

- 없음

## Minor

- corporate-dashboard-view.tsx:127–134 — `NotificationSkeleton`은 `animate-pulse`를 개별 요소에 선언하는 반면, `JobPostingListSkeleton`은 래퍼 div에 한 번 선언하는 `CompanySummarySkeleton` 패턴을 따름. 동작 차이는 없으나 같은 파일 내 두 가지 방식이 혼재함. 향후 `NotificationSkeleton`도 래퍼 단일 선언으로 통일하는 것을 고려.
- corporate-dashboard-view.tsx:94 — `key={index}` 사용. `NotificationSkeleton`과 동일한 관행이고 정적 스켈레톤에서 실질적 문제는 없으나, 코드베이스 전체적으로 인덱스 키 사용을 지양하는 방향이라면 `key={`card-${index}`}` 처럼 명시적 prefix 부여도 고려할 수 있음.
