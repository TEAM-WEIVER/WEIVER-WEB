# [#42] 자기소개서 온보딩 API 연동

## User Story

US: 구직자로서, 자기소개서 온보딩 페이지에서 작성한 내용을 저장하고 다시 돌아왔을 때 이전 내용을 불러올 수 있게 하고 싶다. 왜냐하면 온보딩을 여러 번에 나눠 완성할 수 있어야 하기 때문이다.

---

## Acceptance Criteria

### AC1. 기존 자기소개서 데이터 prefill

- Given: 사용자가 이미 자기소개서를 작성하여 서버에 저장된 상태이다.
- When: `/onboarding/cover-letter` 페이지에 진입한다.
- Then: GET `/api/essay-answers` 응답의 `answers` 배열을 `sequence` 오름차순으로 정렬하여 각 문항 textarea에 자동으로 채워진다. `sequence` 정렬 순서로 각 문항의 `answerId`를 `answerIdsRef` 배열에 보관한다. `essayCompletedRef`는 `true`로 설정된다.

### AC2. 첫 방문 시 빈 폼 표시 (GET 성공 + 빈 배열)

- Given: GET `/api/essay-answers` 요청이 성공하였으나 `answers` 배열이 `[]`(빈 배열)인 상태이다.
- When: `/onboarding/cover-letter` 페이지에 진입한다.
- Then: 모든 문항 textarea가 빈 값으로 표시된다. `essayCompletedRef`는 `false`로 설정된다.

### AC3. 자기소개서 최초 저장 (POST)

- Given: `essayCompletedRef`가 `false`인 상태(첫 방문, GET 성공 + 빈 배열, 또는 GET 실패)이다. Zod 스키마에서 각 answer 필드는 optional(빈 값 허용)로 처리된다.
- When: 사용자가 "다음" 버튼을 누른다.
- Then: POST `/api/essay-answers`에 `{ answers: [{ questionId, answer }, ...] }` 형태로 3개 문항을 모두 포함하여 요청한다. `questionId`는 GET 성공 응답의 `answers[i].questionId` 값을 우선 사용하고, GET 성공 + 빈 배열이거나 GET 실패인 경우 상수 `[1, 2, 3]`을 fallback으로 사용한다. 성공 시 다음 온보딩 단계(`/onboarding/complete` 또는 정해진 다음 경로)로 이동한다.

### AC4. 자기소개서 수정 저장 (PUT — 전체 덮어쓰기)

- Given: `essayCompletedRef`가 `true`인 상태(AC1에서 prefill 완료)이며, AC1에서 `sequence` 정렬된 `answerIdsRef[i]`(각 문항의 answerId)가 ref에 보관되어 있다.
- When: 사용자가 내용을 수정하고 "다음" 버튼을 누른다.
- Then: PUT `/api/essay-answers`에 `{ answers: [{ answerId: answerIdsRef[i], answer }, ...] }` 형태로 3개 문항을 모두 포함하여 요청한다. 작성하지 않은 문항은 `answer: ''`로 포함한다. `answer: ''`는 서버에서 빈 답변으로 저장되며 해당 문항 row를 삭제하지 않는 것으로 간주한다. 성공 시 다음 온보딩 단계로 이동한다.

### AC5. 저장 중 로딩 상태 표시

- Given: 사용자가 "다음" 버튼을 눌러 POST 또는 PUT API 요청이 진행 중이다.
- When: 응답을 기다리는 동안.
- Then: "다음" 버튼이 `aria-busy="true"` 상태로 비활성화되고 로딩 스피너(`Loader2`)가 표시된다. "이전 단계"와 "나중에 작성" 버튼도 함께 비활성화되어 중복 요청을 방지한다.

### AC6. 저장 실패 에러 처리

- Given: POST 또는 PUT 요청 중 네트워크 오류 또는 서버 오류(4xx/5xx)가 발생했다.
- When: API 호출이 실패한다.
- Then: 폼 하단에 `role="alert"` 에러 메시지("저장 중 오류가 발생했습니다. 다시 시도해주세요.")가 표시된다. 페이지 이동은 일어나지 않으며, 사용자가 다시 시도할 수 있는 상태를 유지한다. 단, 401(인증 만료) 발생 시에는 프로젝트 공통 인증 에러 처리 정책(예: 로그인 페이지 리다이렉트)을 따른다.

### AC7. 데이터 로드 실패 시 빈 폼 표시 (GET fallback)

- Given: 페이지 진입 시 GET `/api/essay-answers` 요청이 실패한 상태이다 (404 포함, 4xx/5xx/네트워크 오류 모두 해당).
- When: `loadEssayAnswer` 함수가 예외를 던진다.
- Then: 에러를 조용히 처리하고 모든 문항 textarea를 빈 값으로 표시한다. `essayCompletedRef`는 `false`로 설정된다. 사용자는 POST 경로(AC3)로 진행할 수 있다. `questionId`는 상수 `[1, 2, 3]` fallback을 사용한다.

### AC8. "나중에 작성" 스킵

- Given: 사용자가 자기소개서 작성을 원하지 않는다.
- When: "나중에 작성" 버튼을 누른다.
- Then: API 호출 없이 다음 온보딩 단계로 즉시 이동한다.

---

## API 연동

| AC            | 메서드 | 엔드포인트         | 요청                                                                                      | 응답                           |
| ------------- | ------ | ------------------ | ----------------------------------------------------------------------------------------- | ------------------------------ |
| AC1, AC2, AC7 | GET    | /api/essay-answers | —                                                                                         | `{ data: { answers: [...] } }` |
| AC3           | POST   | /api/essay-answers | `{ answers: [{ questionId: number, answer: string }, ...] }` (3개 문항 필수)              | `{ data: {} }`                 |
| AC4           | PUT    | /api/essay-answers | `{ answers: [{ answerId: number, answer: string }, ...] }` (3개 문항 필수, 전체 덮어쓰기) | `{ data: {} }`                 |

### 주의: 현재 코드와 실제 API 스펙 불일치

현재 `onboarding-api.ts`는 다음 패턴으로 구현되어 있으나 **실제 API 스펙과 다르다.**

| 항목                         | 현재 코드 (잘못됨)                                         | 실제 API 스펙 (수정 필요)                                                        |
| ---------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| GET 응답 파싱                | `essayRes.data.answer` (단일 문자열, `\n\n---\n\n` 구분)   | `essayRes.data.answers` (배열, `answerId`·`questionId`·`sequence`·`answer` 포함) |
| POST 요청 body               | `{ answer: string }` (단일 문자열)                         | `{ answers: [{ questionId, answer }] }` (배열, 3개 필수)                         |
| 수정 API                     | `PATCH /api/essay-answers/:answerId` (단일 문항 개별 수정) | `PUT /api/essay-answers` (배열 전체 덮어쓰기, answerId 포함)                     |
| `EssayAnswerData` 인터페이스 | `{ answerId: string \| null, answer: string \| null }`     | `{ answers: [{ answerId, questionId, sequence, question, maxLength, answer }] }` |

**이번 이슈(#42)의 핵심 작업은 위 불일치를 수정하는 것이다.**

### GET 응답 배열 처리 방식

```
answers 배열을 sequence 오름차순으로 정렬 후:
  sequence 1 → question1 필드
  sequence 2 → question2 필드
  sequence 3 → question3 필드

answerId 보관: [answerId_seq1, answerId_seq2, answerId_seq3] 형태로 ref에 저장
```

### POST 요청 시 questionId 매핑

GET 응답의 `answers[i].questionId`를 그대로 참조한다. GET 성공 + 빈 배열이거나 GET 실패인 경우 상수 `[1, 2, 3]`을 fallback으로 사용한다.

```
GET 성공 + answers 있음 → answers를 sequence 정렬 후 answers[i].questionId 사용
GET 성공 + 빈 배열     → questionId: 1, 2, 3 (상수 fallback)
GET 실패 (AC7)         → 빈 폼 표시, essayCompletedRef=false, POST 허용, questionId: 1, 2, 3 (상수 fallback)
```

---

## 컴포넌트 스펙

- 사용할 shadcn/ui 컴포넌트: `Button` (기존 사용 중)
- 상태 관리 필요 여부:
  - `isSubmitting` (useState) — 로딩 상태
  - `submitError` (useState) — 저장 실패 에러 메시지
  - `essayCompletedRef` (useRef) — POST/PUT 분기 판단
  - `answerIdsRef` (useRef) — PUT 요청 시 각 문항의 answerId 보관 (기존 `answerIdRef`를 배열로 교체)
- Zod 스키마:
  - 자기소개서 각 answer 필드는 `z.string().optional()` 또는 `z.string()` (min(1) 제거) 처리 — 일부 문항만 작성한 상태에서도 임시저장이 가능해야 함
- 접근성 주의사항:
  - 저장 실패 에러 메시지: `role="alert"` + `aria-live="assertive"` 유지
  - 저장 버튼: `aria-busy={isSubmitting}` + `disabled={isSubmitting}` 적용
  - 각 textarea: `maxLength` 속성을 `maxLength` API 응답값 기준으로 설정 (현재는 스키마 상수값 사용 중, 추후 동적 적용 검토)

---

## 기존 패턴과 달라지는 점 요약

1. **단일 문자열 → 배열 구조**: 기존에는 `\n\n---\n\n` 구분자로 3개 답변을 하나의 문자열로 합쳐 저장했으나, 신규 API는 `answers[]` 배열로 각 문항을 독립 관리한다.

2. **PATCH(개별) → PUT(전체 덮어쓰기)**: 기존 `PATCH /api/essay-answers/:answerId`는 단일 답변을 수정하는 방식이었으나, 신규 API는 `PUT /api/essay-answers`로 전체를 덮어쓴다. 미작성 문항은 `answer: ''`로 포함하여 전송한다.

3. **answerId 관리 단위**: 기존에는 단일 `answerId`(string)를 ref로 관리했으나, 신규 API에서는 문항별 `answerId`(number)를 배열로 관리해야 한다.

4. **`EssayAnswerData` 인터페이스 전면 교체**: `onboarding-api.ts`의 인터페이스와 함수 시그니처를 모두 수정해야 한다.

5. **GET 실패 시 POST fallback 허용**: GET 실패(404 포함, 5xx, 네트워크 오류 모두) 시 에러를 조용히 처리하고 빈 폼을 표시한다. `essayCompletedRef=false`로 POST 분기를 유지하며, `questionId`는 상수 `[1, 2, 3]`을 fallback으로 사용한다.

---

## 사람 검증 결과

- questionId: GET 응답 배열의 `answers[i].questionId` 우선 참조, 첫 방문 및 GET 실패 시 상수 `[1,2,3]` fallback 사용
- PUT 미작성 문항: `answer: ''`로 포함하여 전송 (3개 필수 아님)
- GET 실패 시 POST fallback 허용 (AC7 설계 확정)
- 추가 요구사항 없음 → 다자토론 진행
