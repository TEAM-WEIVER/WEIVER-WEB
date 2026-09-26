# 코드 리뷰 — #100 Round 1 (구현 코드)

> 대상: `src/lib/onboarding-api.ts`, `src/lib/applicant-profile-api.ts`,
> `src/app/onboarding/portfolio/page.tsx`, `src/app/onboarding/resume/page.tsx`,
> `src/app/applicant/dashboard/page.tsx`,
> `src/app/applicant/dashboard/_components/profile-overview-card.tsx`,
> `src/mocks/handlers/onboarding.ts`

## 판정: 수정 필요

---

## Critical

- `onboarding-api.ts`:96 — 모듈 수준 `let applicantsAllPromise` 변수는 Next.js App Router의 서버 컴포넌트 환경에서 요청 간 상태가 공유될 수 있다. 현재 파일 상단에 `'use client'` 지시어가 없으므로 이 모듈이 서버 측에서 import될 경우 서로 다른 사용자 요청이 동일 Promise를 참조하는 데이터 오염 위험이 존재한다. 클라이언트 전용 사용임을 파일 상단에 `'use client'` 또는 명시적 주석으로 보장하거나, 클라이언트 훅 레이어로 이동 필요.

- `resume/page.tsx`:276-329 — `hasSavedXxxRef.current` 플래그가 `useEffect` 초기 로드 시 한 번만 설정되고, 이후 `onSubmit` 성공 후 갱신되지 않는다. 학력/경력/자격증/수상 모두 POST로 최초 저장 성공 시 ref가 여전히 `false`이므로 다음 제출 시 POST가 재호출되어 중복 생성된다. `Promise.allSettled` 성공 분기 이후에도 ref를 갱신해야 한다.

---

## Major

- `onboarding-api.ts`:142-244 — `EducationDTO`, `EducationUpdateDTO`, `WorkExperienceDTO`, `WorkExperienceUpdateDTO`, `CertificateDTO`, `CertificateUpdateDTO`, `AwardDTO`, `AwardUpdateDTO` 인터페이스가 모두 파일 내부에 로컬 선언(`interface`)되어 외부에서 재사용할 수 없다. `ApplicantsAllData`의 각 DTO 배열 타입과 중복 정의되어 있어 타입 불일치 가능성도 있다. `export`하거나 `ApplicantsAllData` 내부 인라인 타입과 일치시켜야 한다.

- `dashboard/page.tsx`:70 — `startPolling` 함수가 `useEffect` 바깥에서 일반 함수로 정의되어 있고, `pollingTimersRef`·`isMountedRef`를 클로저로 캡처한다. React Fast Refresh(HMR) 환경에서 컴포넌트가 재실행될 때 이전 클로저 참조가 갱신되지 않을 수 있다. `startPolling`을 `useCallback`으로 감싸거나 `useEffect` 내부로 이동하여 참조 안전성을 확보 필요.

- `dashboard/page.tsx`:45-63 — 초기 `getApplicantProfileOverview()` 호출이 `syncStatus === 'REQUESTED'`일 때만 폴링을 시작하지만, `'PENDING'` 이외에 서버가 즉시 `'REQUESTED'`를 반환하는 케이스 외 `'COMPLETED'`/`'FAILED'`일 때는 폴링 불필요가 맞다. 그러나 `'PENDING'` 상태에서 백그라운드 처리가 시작되는 도중 첫 폴링 결과 전에 컴포넌트가 언마운트되면 `clearAllPollingTimers`가 실행되지만 이미 등록된 `setTimeout` 내부에서 `isMountedRef.current`를 확인하므로 안전하다. 다만 `startPolling` 함수 참조가 `useEffect` 의존성 배열에서 제외된 점이 eslint-disable 주석으로 억제되어 있다. 의도적 제외라면 주석에 이유를 기재해야 한다.

- `resume/page.tsx`:262-329 — `onSubmit` 내부에서 학력·경력·자격증·수상 4개 섹션의 payload 생성 및 POST/PUT 분기 로직이 동일한 패턴으로 반복된다(각 ~12줄). 공통 헬퍼 함수 `buildSnapshotRequest(items, idKey, hasSavedRef, postFn, putFn)` 등으로 추출하면 가독성·유지보수성 향상 및 버그 재발 방지 가능.

- `portfolio/page.tsx`:141-153 — 포트폴리오 저장 실패 시 `setSubmitError`가 호출되고 함수가 반환되지만 `finally` 블록에서 `setIsSubmitting(false)`가 실행되므로 이중 `return`이 불필요하게 생긴다. 더 큰 문제는 `postProfileSubmit` 실패 시 144행에서 `setSubmitError`를 설정하고 `return`하는데, `finally` 블록의 `setIsSubmitting(false)`는 항상 실행되므로 제어 흐름이 명확하지 않다. `try/catch/finally` 구조를 단일 try 블록으로 평탄화하거나 내부 try를 제거하고 에러를 구분할 수 있는 커스텀 에러 타입을 사용 권고.

- `profile-overview-card.tsx`:35-36 — `<img>` 태그에 `// eslint-disable-next-line @next/next/no-img-element` 주석으로 Next.js Image 최적화를 우회하고 있다. `photoUrl`은 외부 CDN 이미지일 수 있으며 이 경우 LCP, CLS 측면에서 `next/image`를 사용해야 한다. 억제가 의도적이라면 이유(예: 동적 도메인 미지원)를 주석으로 명시 필요.

- `onboarding-api.ts`:157-243 — `postEducations`/`putEducations` 등 8개 함수의 반환 타입이 `ApiResponse<string>`으로 선언되어 있으나, mock 핸들러(`onboarding.ts`:208 등)는 `data: 'OK'`(문자열)과 `data: null` 양쪽 모두를 반환한다. 실제 서버 스펙에 맞춰 `ApiResponse<string | null>` 또는 `ApiResponse<void>`로 통일 필요.

---

## Minor

- `onboarding-api.ts`:45-94 — `ApplicantsAllData` 인터페이스의 키가 `ApplicantDTO`, `EducationDTO` 등 PascalCase + DTO 접미사로 명명되어 있다. 프로젝트 컨벤션(camelCase)과 불일치하며, 서버 응답 키를 직접 매핑한 것이라면 별도 `Raw` 타입으로 분리하고 가공된 클라이언트 타입은 컨벤션을 따르도록 구조 분리를 고려.

- `dashboard/page.tsx`:25 — `POLLING_INTERVALS = [10_000, 10_000] as const` 주석에 "10초 후 1회, 20초 후 1회"라고 적혀 있으나 실제 동작은 "10초 후 1회 폴, 그 결과가 미완료이면 추가 10초 후 1회 폴"이다. 누적 20초 후 종료가 맞지만 주석이 오해를 유발할 수 있음. "10초 간격, 최대 2회" 형태로 수정 권고.

- `resume/page.tsx`:58-78 — `mapEnum` 유틸이 `resume/page.tsx` 내부에 로컬 정의되어 있다. 동일한 enum 매핑 테이블(`DEGREE_ENUM_TO_LABEL` 등)이 다른 온보딩 관련 파일에서도 필요해질 경우 중복이 발생한다. `src/lib/` 또는 `src/schemas/`로 이동을 고려.

- `mocks/handlers/onboarding.ts`:144 — `essayPostSuccessHandlers`에서 `data: {}`로 반환하는 반면 `onboardingNewUserHandlers` 내 essay POST 핸들러(144행)도 `data: {}`를 반환한다. 그러나 실제 API 함수 `postEssayAnswers`의 반환 타입은 `ApiResponse<null>`이므로 mock과 타입 선언이 불일치. `data: null`로 통일 권고.

- `applicant-profile-api.ts` 전체 — 에러 처리가 없다. `Promise.all` 내 두 요청 중 하나라도 실패하면 호출 측(dashboard/page.tsx)의 `.catch()`로 전파되어 `hasOverviewError`가 설정된다. 이 동작은 의도적으로 보이나, 문서화(주석) 없이 암묵적 에러 위임 패턴이 사용되고 있어 유지보수 시 혼동 가능성이 있다.
