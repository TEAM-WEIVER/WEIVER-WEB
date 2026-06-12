# 코드 리뷰 — #37 Round 2

## 판정: 수정 필요

---

## Critical

- **resume/page.tsx:265–266** — Round 1 Critical 미해소. `hasSavedEducationsRef.current` 가 true인 경우 `educationPayload`가 빈 배열이어도 `putEducations([])` 를 호출한다. 사용자가 교육 항목을 모두 비운 채 제출하면 서버가 빈 PUT을 "전체 삭제"로 처리할 경우 기존 데이터가 유실된다. careers(284–285), certifications(299–300), awards(314–315) 동일. 수정: `if (hasSavedEducationsRef.current && educationPayload.length > 0)` 가드를 추가하거나, 빈 배열 PUT을 서버가 no-op으로 처리함을 API 명세에서 명시적으로 확인해야 한다.

- **resume/page.tsx:333–335** — Option B 재조회 실패 시(`catch {}`) ref가 갱신되지 않아 중복 POST 버그 잔존. 시나리오: (1) 최초 로드 — hasSavedEducationsRef = false. (2) POST 호출 → 서버 저장 성공. (3) 다른 섹션 PUT 실패 → hasFailure = true 진입. (4) 재조회 실패 → catch 블록 진입, ref 미갱신(여전히 false). (5) 사용자 재시도 → 이미 저장된 섹션에 POST 재호출, 중복 데이터 생성. 최소 대응: catch 블록 내 `setSubmitError`를 "페이지를 새로고침 후 다시 시도해주세요."로 변경해 재시도를 유도하거나, ref를 보수적으로 true로 고정해야 한다.

---

## Major

- **resume/page.tsx:265–270** — PUT-as-replace-all 설계에서 `hasSavedXxxRef = true` 인데 `educationPayload`가 빈 배열인 경우의 의도가 코드에 명시되지 않았다. "전체 삭제 허용"이라면 현재 구조는 맞지만 주석이 없어 의도를 파악하기 어렵다. "빈 배열 무시"가 의도라면 Critical 항목처럼 가드가 필요하다. 명시적 주석 또는 가드 중 하나로 의도를 표현할 것.

- **portfolio/page.tsx:97** — `onSubmit` 함수 내 첫 번째 실행문(`setIsSubmitting(true)`) 바로 앞에 불필요한 빈 줄이 남아 있다. Round 1 Minor 지적 미수정.

---

## Minor

- **resume/page.tsx:333–334** — `catch {}` 빈 블록. 재조회 실패 시 사용자에게 "페이지를 새로고침 후 다시 시도해주세요." 수준의 구분된 메시지를 줄 수 없다. 현재는 바깥 `setSubmitError`(336행)가 동일 메시지를 노출하지만, 재조회 실패와 API 실패를 구분하지 못한다.

- **resume/page.tsx:95–154 (`mapApplicantsToResumeForm`)** — Option B 재조회 후 `ApplicantDTO`가 null이면 `name: ''` 로 reset되어 resumeSchema `name: z.string().min(1)` 검증 실패 → 폼이 invalid 상태로 남는다. 사용자 입장에서 이름이 사라진 것처럼 보일 수 있다. 재조회 실패와 성공을 구분해 이름 필드만 건드리지 않는 방어 처리를 고려한다.

- **resume/page.tsx:41–55, 57–88 (모듈 위치)** — Round 1 Minor 지적 미수정. `isEmptyXxx` 유틸 함수와 enum 매핑 상수가 페이지 컴포넌트 파일에 인라인으로 남아있다. 테스트 가능성을 위해 `_utils.ts` 분리를 고려한다.

---

## Suggestion

- **resume/page.tsx — Promise.allSettled race condition**: 각 섹션은 독립 엔드포인트를 사용하고 if/else 구조로 PUT 또는 POST 중 하나만 push되므로 동일 섹션 내 race condition은 없음. 설계상 안전.

- **resume/page.tsx — mapApplicantsToResumeForm null 안전성**: `ApplicantDTO`가 null, `XxxDTO`가 null/undefined인 경우 모두 optional chaining + `?? []` 조합으로 안전하게 처리됨. Option B 재조회 후 reset에도 타입 수준에서 문제없음.

- **onboarding-api.ts — getApplicantsAll 캐시 초기화**: 모듈 레벨 `applicantsAllPromise`는 `finally`에서 null로 초기화되므로, Option B에서 재조회 시 새 요청이 생성됨. 정상 동작.
