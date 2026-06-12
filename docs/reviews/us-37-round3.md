# 코드 리뷰 — #37 Round 3

## 판정: PASS

---

## Round 2 Critical 해소 확인

### Critical #1 — 빈 배열 PUT (의도 명시)
- **resume/page.tsx:265** — `// 빈 배열 PUT = 전체 삭제 의도 (사용자가 항목을 모두 제거한 경우)` 주석 추가로 해소.
  동일 패턴이 careers(285), certifications(300), awards(315)에는 주석이 없으나, 265행 주석이 전체 패턴을 설명하는 것으로 읽힌다. 허용 범위.

### Critical #2 — Option B 재조회 실패 시 중복 POST
- **resume/page.tsx:334–338** — `catch` 블록에서 "페이지를 새로고침 후 다시 시도해주세요." 메시지 + `return`으로 즉시 탈출. ref 미갱신 상태에서 사용자 재시도를 차단함. 해소.

## Round 2 Major 해소 확인

### Major — portfolio onSubmit 가드
- **portfolio/page.tsx:97** — `if (!hasContent) return` 추가. 해소.

---

## Critical

없음.

---

## Major

없음.

---

## Minor

- **resume/page.tsx:326–339** — `hasFailure` 분기 내부 구조에 논리 불일치 잠재 가능성. 재조회 성공 시 `reset()`으로 폼을 덮어쓴 뒤 `setSubmitError('다시 시도해주세요.')` 를 노출하고 return한다. 이 경우 사용자는 이름·이메일 등 개인정보 필드도 재조회 값으로 덮어씌워진 상태에서 재시도하게 된다. ApplicantDTO가 null이면 `name: ''`로 reset되어 폼이 invalid 상태가 된다 (Round 2 Minor 지적 미해소). 머지 전 차단 필요성은 낮으나, 향후 서버 응답 이상 시 사용자에게 혼란이 발생할 수 있으므로 재조회 성공 분기에서 subRequests 실패 섹션만 부분 reset하거나 ApplicantDTO null 방어를 추가하는 것을 권장한다.

- **resume/page.tsx:41–55, 57–88** — `isEmptyXxx` 유틸 함수 및 enum 매핑 상수가 페이지 파일에 인라인으로 유지됨 (Round 1, Round 2 Minor 지적 미해소). 기능 동작에 영향은 없으나 테스트 가능성 및 가독성을 위해 `_utils.ts` 분리를 권장한다.

- **portfolio/page.tsx:91–93** — `hasContent` 계산 시 `githubUrl`, `notionUrl`, `otherUrl`을 `watch()`로 구독해 매 키 입력마다 리렌더를 유발한다. `isSubmitEnabled`도 동일 렌더 사이클에서 파생되므로 현재 수준에서는 허용 범위이나, URL 필드가 추가될 경우 `watch(['...'])` 배열 구독을 `useWatch`로 교체하는 것을 고려할 수 있다.

---

## Suggestion

- **resume/page.tsx:323–341** — `Promise.allSettled` 결과 중 어느 섹션이 실패했는지 사용자에게 전달되지 않는다. 현재는 "오류가 발생했습니다. 다시 시도해주세요." 단일 메시지. 향후 UX 개선 시 실패 섹션명을 메시지에 포함하면 사용자 재시도 부담을 줄일 수 있다.

- **resume/page.tsx:265, 285, 300, 315** — careers, certifications, awards 세 블록에도 Critical #1과 동일한 빈 배열 PUT 주석을 각각 추가하면 코드베이스 일관성이 높아진다.
