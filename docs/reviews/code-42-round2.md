# 코드 리뷰 — #42 Round 2

## 판정: PASS

---

## Round 1 수정 사항 검증

### Critical 1 — AC7 재검토 (해소 확정)

Round 1 리뷰에서 AC7을 "에러 배너 노출 및 제출 버튼 비활성화 필요"로 해석하였으나, AC7 명세(docs/plans/42-자기소개서-온보딩-API-연동.md:47-51)는 "에러를 조용히 처리, 빈 폼 표시, essayCompletedRef=false, POST 경로 진행"을 요구합니다. 현재 코드 L84-89의 catch 처리가 AC7를 정확히 충족합니다. Round 1 리뷰의 해석 오류였음을 확인.

추가로 Round 2에서 `isLoading` 가드(L30, L89, L182, L190)가 추가되어 GET 응답 전 타이밍 해저드(데이터 유실 위험)도 함께 해소되었습니다.

### Critical 2 — 배열 인덱스 매핑 (AC 스펙 기준 준수 확인)

Round 1 리뷰에서 제기한 "중간 sequence 누락 시 데이터 왜곡" 우려는 AC 스펙(L85-90)이 "sequence 정렬 후 index 순서로 question1/2/3 매핑"을 명시적으로 의도하고 있으며, PUT 전체 덮어쓰기 모델에서 서버가 항상 3개를 반환하는 것이 전제이므로 AC 범위 내에서 준수로 판정합니다. 수정 불요.

### Major — essayCompletedRef 가드 추가 (해소 확인)

L108-110: `essayCompletedRef.current && answerIdsRef.current.length === 0` 조건 진입 시 `essayCompletedRef.current = false`로 전환하여 빈 answerIds로 PUT을 시도하는 경로가 차단됩니다. 해소 완료.

---

## Critical

없음

## Major

없음

## Minor

- page.tsx:165-173 — 이전 단계 버튼이 `isLoading` 중에는 비활성화되지 않습니다. isSubmitting 중 비활성화는 AC5 요구사항을 충족하지만, GET 로딩 중 이전 단계로 이동해도 데이터 유실 위험은 없으므로 UX 차원의 제안입니다. `disabled={isLoading || isSubmitting}`으로 통일하면 로딩 중 버튼 상태가 일관성을 갖습니다.
- page.tsx:35 — `questionIdsRef`는 실제로 POST 경로에서 `questionIdsRef.current.length > 0`인 경우에만 사용되는데, GET 성공 + answers 있음 경우에만 저장되고 이때는 `essayCompletedRef=true`로 PUT 경로를 타므로 이 ref가 비어있지 않을 때 POST로 진입하는 경우가 없습니다. Dead code에 가까우나 방어적 패턴으로 유지하는 의도라면 허용 가능합니다.
