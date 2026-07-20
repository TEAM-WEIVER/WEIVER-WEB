# 코드 리뷰 — #42 Round 1

## 판정: 수정 필요

> 도메인 접지 및 현실성 검증 관점에서 구현된 코드를 리뷰한 결과, 기획서의 핵심 요구사항(AC7)이 미구현된 상태이며, 배열 인덱스 기반 매핑으로 인한 심각한 데이터 왜곡 및 유실 버그가 발견되었습니다. 또한 핵심 코드 설계 관점에 대한 분석을 기술하였습니다.

---

## 핵심 코드 설계 검증 의견 (4대 검토 관점)

### 1. PUT 전체 덮어쓰기 설계에서 `answer: ''` 전송의 안전성

- **안전성 분석 (주의 필요)**:
  - 미작성 문항을 `''`로 보내 전체를 교체하는 구조 자체는 간결하지만, **화면 로딩(초기 진입) 시점의 클라이언트 타이밍 해저드(Timing Hazard)**가 존재합니다.
  - 페이지에 최초 진입하면 API 데이터가 수신되기 전까지 React Hook Form의 초기 상태는 `''`입니다.
  - 만약 API 응답이 지연되는 상황에서 유저가 빠르게 "다음" 버튼을 클릭하면, 데이터가 채워지지 않은 빈 폼 상태로 `PUT` 요청이 날아가 **기존 서버에 온전히 저장되어 있던 자기소개서 내용이 전부 빈 값(`''`)으로 유실(Data Loss)**될 수 있습니다.
- **보완 권고**:
  - 마운트 직후 GET API 로드가 완료되기 전까지는 전체 화면에 로딩 인디케이터(Spinner/Skeleton)를 제공하고 제출 버튼을 비활성화(`disabled={isLoading}`)하는 가드 로직을 추가해야 유실 사고를 방지할 수 있습니다.

### 2. sequence 기반 정렬 접근이 React + Next.js 환경에서 올바르게 동작하는지 여부

- **동작 분석 (심각한 버그 존재)**:
  - 현재 정렬 후 배열 인덱스 `sorted[0], sorted[1], sorted[2]`로 폼 값을 주입하는 구조는 **데이터 정합성이 보장되지 않습니다.**
  - 만약 서버 데이터베이스에 특정 문항(예: sequence 2번)의 답변이 저장되지 않아 GET 응답 배열의 길이가 2(`[seq1, seq3]`)인 경우, 정렬 후 `sorted[1]`에 3번 문항 데이터가 위치하게 됩니다.
  - 이로 인해 3번 문항 내용이 `question2` 필드에 바인딩되고, `onSubmit` 시 `answerIdsRef.current[1]`인 `3`번 ID에 `question2` 필드의 텍스트가 바인딩되는 **데이터 왜곡 및 덮어쓰기 유실 장애**가 발생합니다.
- **보완 권고**:
  - 배열 인덱스 `0, 1, 2` 대입법을 전면 배제하고, `sequence` 값(1, 2, 3)을 매치하는 `find` 검색을 사용하여 개별 폼 필드와 `answerId`를 매핑해야 합니다.

### 3. questionIdsRef fallback [1,2,3] 상수의 실제 서비스 안전성

- **안전성 분석 (위험성 높음)**:
  - 최초 가입자 제출 시 `[1, 2, 3]`을 사용하는 방식은 현재 기획 스펙이 고정되어 있을 때는 동작하나, **문항 개편(템플릿 변경) 시 치명적인 장애 요인**이 됩니다.
  - 가령 공통 자기소개서 문항이 개편되어 1~3번 ID가 서비스 만료되고 4~6번 ID로 신규 배포되었을 때, 클라이언트 코드가 하드코딩된 `[1, 2, 3]`으로 POST 요청을 보내면 백엔드에서 FK(외래키) 제약 조건 위반 등으로 인해 저장이 차단됩니다.
- **보완 권고**:
  - 신규 유저라도 GET `/api/essay-answers` API가 내용이 빈 문자열일지언정 문항 자체 메타데이터(`questionId`, `sequence`, `question` 내용 등)를 함께 담은 껍데기 리스트로 응답하게 하고, 프론트엔드는 이 동적 questionId를 참조하도록 백엔드 개발자와 논의하여 개선하는 것이 가장 안전합니다.

### 4. 전반적 코드 품질 및 패턴 일관성

- **로딩 상태 관리 누락**: GET API 호출 중 페이지에 폼이나 버튼이 그대로 노출되어 빠른 클릭 시 데이터 유실이 발생할 수 있는 초기 로딩 가드 상태(`isLoading`)가 없습니다.
- **Dead Code 존재**: `questionIdsRef`는 GET 성공 시 저장되지만, 이때는 무조건 `essayCompletedRef = true`가 되므로 PUT 경로를 타게 되어 해당 ref를 읽는 일이 없습니다. 실제 POST 경로에서는 `questionIdsRef.current`가 빈 배열이 되어 무조건 상수가 적용되므로 무의미한 ref가 선언되어 있습니다.
- **API 인터페이스 중복**: `src/lib/onboarding-api.ts` 내부의 `ApiResponse<TData>` 정의가 `api-client.ts`와 중복되어 리팩토링이 권장됩니다.

---

## Critical

### 1. AC7 (GET 실패 에러 처리) 정책 완전 미구현

- **위치**: `page.tsx` ([page.tsx:83-87](file:///Users/minchae/Desktop/WEIVER-WEB/src/app/onboarding/cover-letter/page.tsx#L83-L87))
- **현상**: `loadEssayAnswer` 내 `catch` 블록에서 에러 시 에러 배너 노출 및 제출 버튼 비활성화를 수행하지 않고, 조용히 빈 폼 상태로 POST 경로를 타도록 방치하여 기획서의 AC7 정책을 어겼습니다.
- **해결 방안**: `loadError` 상태와 JSX 에러 배너를 추가하고 실패 시 저장 버튼을 비활성화해야 합니다.

### 2. 데이터 왜곡 및 유실을 유발하는 배열 인덱스 매핑 버그

- **위치**: `page.tsx` ([page.tsx:69-79](file:///Users/minchae/Desktop/WEIVER-WEB/src/app/onboarding/cover-letter/page.tsx#L69-L79)), `onSubmit` ([page.tsx:106-110](file:///Users/minchae/Desktop/WEIVER-WEB/src/app/onboarding/cover-letter/page.tsx#L106-L110))
- **현상**: sequence 정렬 후 index `0, 1, 2`로 `setValue` 및 `answerIdsRef` 바인딩을 진행하여, 중간 sequence 누락 시 데이터가 꼬여 다른 문항을 덮어쓰고 일부 문항이 소실되는 중대 버그가 있습니다.
- **해결 방안**: `sequence` (1, 2, 3) 매칭 기반의 1:1 `find` 조회를 사용해야 합니다.

---

## Major

### 3. PUT API 요청 시 3개 문항 필수 전송 보장 부족

- **위치**: `onSubmit` ([page.tsx:106-110](file:///Users/minchae/Desktop/WEIVER-WEB/src/app/onboarding/cover-letter/page.tsx#L106-L110))
- **현상**: 조회된 answers 개수만큼만 PUT 요청을 작성하므로, 3개 미만 유입 시 3개 미만으로 PUT 요청이 날아가 API의 "3개 필수" 규격을 위반합니다.
