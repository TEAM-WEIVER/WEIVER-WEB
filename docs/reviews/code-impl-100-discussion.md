# 다자토론 칠판 — #100 구직자 온보딩 API 리팩토링 구현 코드 검토

> append-only. 형식: `## R{n} · {speaker}\n<발언>\n`
> 토론 주제 5개, 렌즈: codex=정확성·논리·반례 / gemini=외부사실·도메인접지 / claude=보안·엣지케이스·요구사항충족

---

## R1 · claude

### 주제 1. Snapshot PUT — FAIL (confidence 0.9)

**핵심 defects:**

1. `EducationUpdateDTO.educationId?: number` (optional) — AC1-a PUT 배열에 id 없는 항목이 섞일 수 있음. 기존 사용자가 새 학력 행을 추가하면 PUT payload에 educationId=undefined인 DTO가 포함됨.
2. 빈 배열 PUT: hasSavedEducationsRef=true + validEducations=[] 시 `putEducations([])` 호출 → 서버 전체 삭제. 기획문서의 "Zod 차단" 주석이 실제 schema 구현과 일치하는지 확인 필요.
3. hasSavedXxxRef 갱신: 성공 경로(line 384-387)에 구현됨 — Critical #1은 수정됨.

**재현:** 서버에 학력 1건 저장 상태에서 신규 학력 행 추가 → PUT에 id없는 DTO 포함.

---

### 주제 2. submission-status 전환 — FAIL (confidence 0.85)

**핵심 defects:**

1. hasOverviewError=true + overview=null 상태에서 ProfileOverviewCard가 syncStatus='PENDING' 기본값으로 렌더됨 → "대기 중" 배지가 에러 상황에서도 표시.
2. 대시보드 "프로필 제출" 버튼에 onClick 핸들러 없음 (profile-overview-card.tsx line 144-153). submitted=false && submittable=true && isProfileReady=true이면 활성 버튼으로 노출되나 클릭 시 무동작. (기획문서: 의도적 미구현이나 UX 문제)

---

### 주제 3. 포트폴리오→profile/submit 흐름 — FAIL (confidence 0.88)

**핵심 defects:**

1. portfolioId POST 성공 후 미갱신 — profile/submit 실패 시 재시도에서 PATCH 대신 POST 재호출 → 중복 포트폴리오 생성 가능.
2. 중첩 try/catch 구조 제어 흐름: 내부 catch에서 setSubmitError+return → finally의 setIsSubmitting(false) 정상 실행. AC12-b 기능상 충족.

---

### 주제 4. 폴링 — FAIL/Minor (confidence 0.75)

**핵심 defects:**

1. startPolling이 useCallback으로 감싸짐(line 93) — stale closure 해소됨.
2. isMountedRef 패턴으로 언마운트 후 setState 차단 정상.
3. 초기 `getApplicantProfileOverview` 요청에 세대 식별자(generation counter) 없음 — Strict Mode에서 A 요청이 B보다 늦게 resolve하면 stale 결과가 현재 상태를 덮어쓸 수 있음.
4. POLLING_INTERVALS 주석 오류 — 코드 동작 자체는 AC11 충족.

---

### 주제 5. 추가 이슈 — FAIL (confidence 0.85)

**code-reviewer가 놓친 신규 이슈:**

1. profile-overview-card.tsx line 144-153: submittable=true + submitted=false + isProfileReady=true 조합에서 onClick 없는 활성 버튼 노출 (UX 버그)
2. onboarding-api.ts, applicant-profile-api.ts: 'use client' 미명시 — 서버 컴포넌트 import 시 SSR 위험 (향후 대비)
3. essay POST/PUT mock handlers: `data: {}` 반환 — ApiResponse<null> 타입 불일치 (컴파일 오류 없으나 타입 계약 위반)

---

## R1 · codex

# R1 · Codex 판정

검토 기준은 현재 워크트리의 구현이다. 이전 리뷰에 적힌 `hasSavedXxxRef` 미갱신 및 `startPolling` 비-`useCallback` 문제는 현재 코드에서는 수정돼 있어 해당 사유만으로는 FAIL로 판정하지 않았다.

## 주제 1. Snapshot PUT 구현 AC 적합성

```json
{
  "verdict": "FAIL",
  "defects": [
    {
      "what": "기존 snapshot에 새 유효 행을 추가하면 PUT 배열에 id 없는 DTO가 포함된다.",
      "why": "AC1-a의 PUT DTO는 서버 발급 id를 포함해야 하지만 UpdateDTO의 id가 optional이고, payload 생성도 undefined를 그대로 전달한다. JSON 직렬화 시 해당 키는 사라진다.",
      "evidence": "src/lib/onboarding-api.ts:144-146, 172-174, 196-198, 220-222; src/app/onboarding/resume/page.tsx:283-321, 336-360; docs/plans/100-applicant-api-refactor.md:43-48, 171-178"
    }
  ],
  "confidence": 0.91
}
```

근거: POST 경로는 `educationId` 등만 구조 분해로 제거하므로 id를 보내지 않는 AC1-b를 충족한다(`resume/page.tsx:323-359`). 반대로 기존 데이터 여부만 ref로 판단하여 PUT을 선택하고(`:161-176`, `:336-360`), 새로 append한 폼 행의 optional id를 검증하지 않는다. 빈 배열 PUT도 `hasSaved === true`이면 의도대로 전송한다(`:167-170`); 이는 snapshot 삭제 의미와는 부합한다. 다만 기획의 “Zod가 빈 배열을 차단” 설명은 실제 schema에 배열 `min(1)`이 없고 빈 placeholder union이 허용되어 사실과 다르다(`schemas/onboarding.ts:21-30, 98-112`).

재현: 서버에 `educationId: 1`인 학력이 있는 사용자가 학력 행을 하나 추가하여 두 행 모두 유효하게 입력한다. 첫 행에는 1, 새 행에는 id가 없다. 저장은 `PUT /education`으로 선택되고 두 번째 `EducationUpdateDTO`에는 `educationId`가 없다. 서버가 AC 계약대로 update id를 요구하면 400; 허용해도 타입은 update/create 혼합을 표현하지 않아 계약 위반을 감춘다.

추가 확인: 기존 Critical #1은 현재 재현되지 않는다. 모든 sub-request가 성공한 뒤 각 ref를 payload 길이 기준으로 갱신한다(`resume/page.tsx:363-387`). 따라서 최초 POST 성공 후 같은 마운트에서 다시 저장하면 해당 비어 있지 않은 섹션은 PUT으로 분기한다.

## 주제 2. submission-status 전환 정확성

```json
{
  "verdict": "FAIL",
  "defects": [
    {
      "what": "overview 로드 실패 시 실제 상태를 알 수 없는데 PENDING 상태 배지를 렌더링한다.",
      "why": "null fallback은 syncStatus를 PENDING, submitted를 false, submittable을 false로 만들어 AC10의 오류 화면과 동시에 '대기 중'이라는 서버 상태처럼 보이는 정보를 표시한다.",
      "evidence": "src/app/applicant/dashboard/page.tsx:108-115, 123-124, 185-191; src/app/applicant/dashboard/_components/profile-overview-card.tsx:144-145, 68-84"
    }
  ],
  "confidence": 0.87
}
```

근거: `getApplicantProfileOverview` 자체는 submission-status의 `resumeCompleted`, `essayCompleted`, `portfolioCompleted`, `submitted`, `syncStatus`, `submittable`을 각각 1:1로 옮긴다(`applicant-profile-api.ts:21-47`). 따라서 API 변환은 정확하다. 하지만 dashboard는 실패 시 `overview=null`으로 만든 뒤(`dashboard/page.tsx:108-112`) nullish fallback으로 PENDING badge를 표시한다. 이는 “조회 실패”와 “서버가 PENDING을 반환”한 경우를 구분하지 못한다.

재현: `/submission-status` 또는 `/applicants` 요청을 500으로 만들고 dashboard를 연다. 오류 문구와 함께 ProfileOverviewCard는 `submitted || !submittable` 조건 때문에 '대기 중' badge를 렌더링한다. 사용자는 실제 제출/분석 상태가 PENDING이라고 오인할 수 있다.

## 주제 3. 포트폴리오 저장 → profile/submit 흐름 엣지케이스

```json
{
  "verdict": "FAIL",
  "defects": [
    {
      "what": "POST 저장 성공 뒤 profile/submit이 실패한 상태에서 재시도하면 POST를 다시 선택할 수 있다.",
      "why": "성공한 POST의 응답을 사용해 portfolioId 또는 기존 파일 상태를 갱신하지 않는다. 화면은 그대로이고 portfolioId는 초기 null이라 서버에는 이미 포트폴리오가 있어도 다음 저장이 POST가 된다.",
      "evidence": "src/app/onboarding/portfolio/page.tsx:40-41, 70-87, 137-155; src/lib/onboarding-api.ts:238-246"
    }
  ],
  "confidence": 0.94
}
```

근거: 저장 API가 reject되면 첫 catch에서 error를 설정하고 return하므로 `postProfileSubmit`에는 도달하지 않는다(`portfolio/page.tsx:137-148`). submit API가 reject되면 내부 catch가 error를 설정하며 `push`는 try의 성공 경로에만 있으므로 AC12-b의 화면 잔류와 메시지는 충족한다(`:150-158`, `:178-185`). `finally`는 catch 뒤에도 `setIsSubmitting(false)`를 실행할 뿐이며, 외부 catch가 없어 내부 catch 뒤에 다시 실행되는 경로도 없다. 즉 이 중첩 구조는 읽기 어렵지만 이 사안의 제어 흐름 버그는 아니다.

재현: 신규 사용자가 링크를 입력한다. `POST /portfolios`는 200, 이어 `POST /profile/submit`은 500으로 응답한다. 오류가 표시된 뒤 재제출하면 `portfolioId`가 여전히 null이어서 또 `POST /portfolios`를 호출한다. 서버가 단일 포트폴리오만 허용하면 실패하고, 허용하면 중복 데이터가 생긴다.

## 주제 4. syncStatus 폴링 메모리 누수·경쟁 조건

```json
{
  "verdict": "FAIL",
  "defects": [
    {
      "what": "초기 overview 요청에는 요청 세대 식별자나 취소가 없어 Strict Mode/Fast Refresh에서 오래된 응답이 현재 화면 상태를 덮어쓸 수 있다.",
      "why": "isMountedRef는 cleanup 후 다음 effect setup에서 즉시 true가 된다. 이전 getApplicantProfileOverview promise가 그 뒤 resolve되면 현재 mount의 응답처럼 setOverview와 startPolling을 실행한다.",
      "evidence": "src/app/applicant/dashboard/page.tsx:95-121, 특히 :96, :98-106, :117-120"
    }
  ],
  "confidence": 0.84
}
```

근거: 타이머 콜백은 await 전(:48)과 후(:52)에 mounted를 확인한다. 따라서 언마운트 후 이미 실행 중이던 `getSubmissionStatus()`가 resolve해도 `setOverview`는 호출되지 않는다. `clearAllPollingTimers`가 in-flight fetch를 abort하지 못하는 것은 네트워크 낭비이지만, 이 경로만으로 React state-after-unmount 버그는 아니다(`dashboard/page.tsx:36-39, 47-86, 117-120`). `POLLING_INTERVALS=[10초,10초]`도 첫 poll이 최초 10초, 두 번째가 첫 poll 결과 후 추가 10초이므로 최초 기준 20초가 맞다. 코드는 맞고 주석만 “10초 간격, 최대 2회”로 고치는 편이 명확하다(`:25, :77-92`).

재현: 개발 Strict Mode 또는 Fast Refresh에서 effect A가 요청을 시작한 뒤 cleanup되고 effect B가 새 요청을 시작한다. B가 먼저 COMPLETED를 받아 표시한 후, A가 늦게 REQUESTED를 반환하면 A는 `isMountedRef.current === true`를 보고 overview를 REQUESTED로 되돌리고 polling을 시작한다. `useCallback` 적용과 dependency 포함(`:41-93, :121`)으로 과거 리뷰의 stale `startPolling` 지적은 해소됐지만, 요청 자체의 stale-result 경쟁은 남는다.

## 주제 5. 기존 code-reviewer가 놓친 추가 이슈

```json
{
  "verdict": "FAIL",
  "defects": [
    {
      "what": "dashboard의 활성 '프로필 제출' 버튼은 onClick이 없어 아무 요청도 하지 않는다.",
      "why": "submitted=false 및 submittable=true인 정상 상태에서 활성 버튼을 보여 주지만 postProfileSubmit 또는 어떤 동작도 연결하지 않았다.",
      "evidence": "src/app/applicant/dashboard/_components/profile-overview-card.tsx:144-154; src/lib/onboarding-api.ts:100-102"
    },
    {
      "what": "overview의 병렬 요청 하나만 실패해도 정상 submission-status 결과를 폐기하여 REQUESTED 폴링을 시작하지 못한다.",
      "why": "Promise.all은 applicants 정보 조회 실패도 전체 overview 실패로 전파한다. 상태 API가 REQUESTED여도 dashboard는 null/error fallback으로 전환된다.",
      "evidence": "src/lib/applicant-profile-api.ts:21-27; src/app/applicant/dashboard/page.tsx:98-115"
    },
    {
      "what": "mock의 essay 성공 응답 data는 API 타입과 다르다.",
      "why": "API 함수는 ApiResponse<null>을 약속하지만 mock은 {}를 반환한다. MSW handler 자체는 제네릭으로 API 반환 타입에 묶여 있지 않아 lint에서 잡히지 않으며, 소비자가 data를 사용하거나 타입된 fixture로 바꾸면 계약 불일치가 드러난다.",
      "evidence": "src/lib/onboarding-api.ts:112-124; src/mocks/handlers/onboarding.ts:142-145, 503-513, 525-534"
    }
  ],
  "confidence": 0.9
}
```

근거 및 반례: 첫 번째 문제는 포트폴리오 자동 제출 흐름과 별개로, UI가 사용 가능한 제출 행위를 제시하면서 무동작이다. 완료된 세 항목과 `submitted:false, submittable:true` 상태로 dashboard를 열어 버튼을 눌러도 아무 네트워크 요청/상태 변화가 없다. 두 번째 문제는 `/submission-status`=REQUESTED, `/applicants`=500 조합에서 재현된다. AC11은 마운트 시 REQUESTED이면 polling을 요구하지만 Promise.all reject로 polling 진입 자체가 사라진다. 마지막 문제는 `pnpm lint:check`가 통과해도 runtime mock JSON은 static API generic과 연결되지 않는다는 반례다.

`EducationUpdateDTO.educationId` optional 문제는 주제 1의 첫 결함으로 재현했고, `Promise.all` 실패 UX는 위 두 번째 결함으로 재현했다. 한편 essay mock 불일치는 현재 mock 선언 방식에서는 직접 TypeScript 컴파일 오류를 일으키지 않는다. 또한 현 코드의 ref 갱신은 성공 경로에 존재하므로 “두 번째 저장도 POST” 추가 버그는 재현되지 않는다(`resume/page.tsx:383-387`).

## 검증

`pnpm lint:check` 통과 (2026-09-26).

---

## R1 · gemini-lens (외부사실·도메인접지 렌즈 — antigravity 미설치로 서브에이전트 대체)

### 주제 1. Zod 빈 배열 차단 — FAIL (confidence 0.97)

**직접 확인:** `schemas/onboarding.ts:108-111` — education/careers/certifications/awards 배열 모두 `z.array(z.union([...]))` 이며 `.min(1)` 없음.
기획문서(100-applicant-api-refactor.md:190, 237행) "빈 배열 전송은 Zod로 사전 차단됨" 주석은 **실제 구현과 불일치**.
실제 방어는 `resume/page.tsx` `isEmptyXxx` filter — Zod 검증 통과 후 onSubmit 내부에서만 작동. 폼 제출 자체가 막히지 않음.
**재현:** `resumeSchema.safeParse({ ..., education: [] })` → 성공(통과).

### 주제 2. React 18 Strict Mode 경쟁 조건 — FAIL (confidence 0.72)

isMountedRef 재사용으로 effect A/B 요청 generation 구분 불가.
`let ignore = false` 패턴(React 공식 권장) 미적용.
프로덕션(Strict Mode 비활성)에서는 발생 확률 낮아 심각도 Medium.

### 주제 3. FormData+Blob 호환성 — PASS (confidence 0.85)

현대 브라우저에서 표준 동작. iOS Safari 14+ 정상. PASS.

### 주제 4. Promise.all → AC11 폴링 미시작 경로 — FAIL (confidence 0.91)

`applicant-profile-api.ts:22` Promise.all: /applicants 500 + /submission-status REQUESTED 조합에서 catch가 overview=null 처리만 하고 startPolling 미호출 → AC11 요건 미충족.
수정 방향: `Promise.allSettled`로 전환 → submission-status 성공 시 syncStatus 기반 폴링 시작, applicants 실패는 applicant=undefined 폴백.

### 주제 5. 추가 이슈 — FAIL (confidence 0.88)

**신규 발견:**

- `postPortfolio`/`patchPortfolio` 반환 타입 3자 불일치: `ApiResponse<string>` vs mock `data: null` vs 기획 `ApiResponseVoid`
- `buildSnapshotRequest` 로직 일관성: PASS (의도된 전체 삭제 동작)
- `next/image` 미사용: PASS (next.config.js 미등록 도메인으로 의도적 회피, 주석 명시)

---

## R2 · devils-advocate (지정 반대자 — R1 FAIL 합의 공격)

### 항목 A. UpdateDTO.id optional

**R1 FAIL → Ambiguous/Minor로 재분류**
`resume/page.tsx:324-334`: PUT 경로의 `educationPayload`에 id=undefined 항목이 포함되나, 이것이 서버의 Snapshot PUT 패턴("id 없으면 신규 생성")과 부합할 수 있음. 코드 주석(`// 빈 배열 PUT = 전체 삭제 의도`)에서 의도적 Snapshot 설계가 확인됨. 서버 계약이 명확하지 않아 프론트엔드 단독 버그로 판정 불가.

### 항목 B. Promise.all AC11 미충족

**R1 FAIL → FAIL이지만 Minor로 재분류**
AC11은 정상 흐름 명세. /applicants 500 + /submission-status REQUESTED 동시 발생은 에러 시나리오로 AC 범위 밖. 단, 코드 개선 여지(Promise.allSettled)는 실재.

### 항목 C. portfolioId 미갱신

**R1 FAIL → FAIL이지만 Minor로 재분류**
`onboarding-api.ts:239`: `postPortfolio` 반환 타입 `ApiResponse<string>` — portfolioId(number) 미포함. 서버 API가 portfolioId를 반환하지 않으므로 클라이언트 단독 수정 불가. 원인의 절반은 서버 설계.

### 항목 D. Strict Mode Stale Request

**R1 FAIL → Minor(개발환경 전용)로 재분류**
프로덕션 빌드에서 React Strict Mode 이중 마운트 미발생. 두 요청 모두 동일 API 호출 → 동일 데이터 반환 → 실제 "잘못된 데이터" 없음.

---

## R2 비-LLM 오라클 검증 결과 (pnpm typecheck + lint:check + 코드 직접 확인)

```
pnpm typecheck → 0 errors
pnpm lint:check → 0 errors
```

| 검증 대상                                          | 결과                                                          |
| -------------------------------------------------- | ------------------------------------------------------------- |
| schemas/onboarding.ts:108-111 배열 min 제약        | `.min(1)` 없음 — Zod 차단 주장 허위 **확인됨**                |
| resume/page.tsx:325-334 POST createPayload         | id 제거된 별도 payload 존재 — Snapshot 패턴 의도적 **확인됨** |
| resume/page.tsx:384-387 성공 후 ref 갱신           | 갱신 코드 있음 — Critical #1 수정 **확인됨**                  |
| dashboard/page.tsx:93 startPolling useCallback     | `}, [clearAllPollingTimers])` — Major #3 수정 **확인됨**      |
| applicant-profile-api.ts:22 Promise.all            | 수정 안 됨 — /applicants 500 시 폴링 미시작 경로 잔존         |
| profile-overview-card.tsx:144-153 제출버튼 onClick | onClick 없음 — 활성 버튼 무동작 **확인됨**                    |

---

## 최종 진단 (진행자 종합 — §9.4 다수결 + 무결함 K라운드)

### 수정 확인된 항목 (code-reviewer Critical/Major → 이미 수정됨)

| 항목                                               | 상태                                 |
| -------------------------------------------------- | ------------------------------------ |
| Critical #1: hasSavedXxxRef 성공 후 미갱신         | **수정됨** (resume/page.tsx:384-387) |
| Major #3: startPolling useCallback 미적용          | **수정됨** (dashboard/page.tsx:93)   |
| Major #5: 반복 패턴 buildSnapshotRequest 헬퍼 추출 | **수정됨** (resume/page.tsx:161-176) |

### 신규 발견 — 다수결 FAIL (3자 중 2자 이상 동의)

| 우선순위 | 파일:줄                                    | 내용                                                                                                                        | 심각도                                         |
| -------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| P1       | `applicant-profile-api.ts:22`              | Promise.all → /applicants 500 시 syncStatus=REQUESTED여도 폴링 미시작(AC11 미충족 경로)                                     | **Major**                                      |
| P2       | `portfolio/page.tsx:40,136`                | portfolioId POST 성공 후 미갱신 → profile/submit 실패 시 재시도에서 중복 POST (서버 API가 portfolioId 미반환하는 한계 공존) | **Major**                                      |
| P3       | `dashboard/page.tsx:186-193`               | overview=null(에러) 시 SyncStatusBadge 'PENDING' 렌더 → 에러 상황에서 "대기 중" 오표현                                      | **Minor**                                      |
| P4       | `profile-overview-card.tsx:144-153`        | submitted=false && submittable=true && isProfileReady=true 조합에서 onClick 없는 활성 버튼 노출                             | **Minor** (기획문서 의도적 미구현이나 UX 버그) |
| P5       | `schemas/onboarding.ts:108-111`            | `.min(1)` 없음 — 기획문서 "Zod 차단" 주석과 실제 구현 불일치 (빈 배열 PUT → 서버 전체 삭제 가능)                            | **Minor**                                      |
| P6       | `onboarding-api.ts:238-247`                | postPortfolio/patchPortfolio 반환 타입 `ApiResponse<string>` vs mock `data: null` vs 기획 `ApiResponseVoid` — 3자 불일치    | **Minor**                                      |
| P7       | `mocks/handlers/onboarding.ts:144,509,531` | essay POST/PUT 핸들러 `data: {}` — `ApiResponse<null>` 타입 계약 위반                                                       | **Minor**                                      |

### 지정 반대자 반론으로 심각도 조정된 항목

| 항목                                   | R1 판정    | 최종 판정                                           | 근거                                                           |
| -------------------------------------- | ---------- | --------------------------------------------------- | -------------------------------------------------------------- |
| UpdateDTO.id optional (PUT + 신규항목) | FAIL Major | **Ambiguous** — 서버 Snapshot 패턴 지원 여부에 달림 | createPayload(id 제거)와 updatePayload(id 포함) 경로 분리 확인 |
| Strict Mode stale request              | FAIL Major | **Minor** (개발환경 전용)                           | 프로덕션 Strict Mode 이중 마운트 미발생, 동일 API 호출         |
| Promise.all AC11                       | FAIL       | **FAIL(Minor)** — 에러 시나리오                     | AC11 정상 흐름은 충족, /applicants 단독 500은 예외적 케이스    |
| portfolioId 미갱신                     | FAIL       | **FAIL(Minor)** — 서버 API 공동 책임                | postPortfolio 응답에 portfolioId 미포함(서버 설계 한계)        |

### §9.5 인간 게이트 — 확인 필요 항목 (미검증)

- **P1 Promise.allSettled 전환**: 서버가 /submission-status와 /applicants를 같은 인스턴스에서 서비스하는지 여부에 따라 실용적 가치가 달라짐
- **항목 A UpdateDTO.id optional**: 서버 Snapshot PUT 스펙 — "educationId 없는 항목을 신규 생성으로 처리하는가"를 백엔드 팀에 확인 필요 (코드 계약 불명확)
- **P2 portfolioId 미갱신**: postPortfolio 서버 응답에 portfolioId 추가 여부를 백엔드 팀과 협의 필요
