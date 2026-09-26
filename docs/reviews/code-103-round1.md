# #103 코드 검토 — Round 1

## 결과

PASS — Critical 0, Major 0, Minor 0

## 수정 반영

- 서버에서 받은 성향 우선순위 순서를 정적 목록 순서로 바꾸지 않고 그대로 폼과 `updateDTO`에 유지한다.
- 삭제 API 실패 문구를 열린 확인 대화상자 안에 표시해 오버레이에 가려지지 않게 했다.
- 공통 select 버튼에 연결된 접근성 레이블을 추가했다.
- 수정 스냅샷의 성향 순서 및 삭제 실패 안내를 Playwright 테스트로 보강했다.

## 검증

- `pnpm test:e2e -- e2e/corporate/job-posting-edit.spec.ts` — 5 passed
- `pnpm lint:check` — passed
- `pnpm typecheck` — passed
- `pnpm build` — passed

## 커버리지

`pnpm test:coverage`는 전체 저장소 기준 34.53%로 기존 전역 70% 임계값을 충족하지 못한다. 이번 작업의 신규 FormData 유틸 단위 테스트와 E2E는 통과했으며, 전역 기준 달성은 별도 광범위한 테스트 보강이 필요하다.
