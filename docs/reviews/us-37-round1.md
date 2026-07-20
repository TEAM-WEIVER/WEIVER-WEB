# 코드 리뷰 — #37 Round 1

## 판정: 수정 필요

---

## Critical

- **resume/page.tsx:278–285** — `hasSavedEducationsRef.current` 가 true일 때 `educationsToUpdate`가 빈 배열이어도 `putEducations([])` 를 무조건 호출한다. 서버가 빈 PUT을 "전체 삭제"로 해석할 경우 기존 데이터가 유실된다. `educationsToUpdate.length > 0` 가드가 없다. careers(311–318), certifications(336–343), awards(361–368) 모두 동일한 패턴.
  - 수정 예시: `if (hasSavedEducationsRef.current && educationsToUpdate.length > 0) { subRequests.push(putEducations(educationsToUpdate)); }`

---

## Major

- **resume/page.tsx:278–285 (논리 중복)** — `hasSavedEducationsRef.current` 분기가 두 블록으로 분리되어 있어(278행 if/else-if, 283행 독립 if) 코드 흐름이 직관적이지 않다. 두 블록을 하나로 합쳐 가독성과 유지보수성을 높여야 한다. 같은 패턴이 careers, certifications, awards에도 반복됨.

  ```ts
  // 권장 구조
  if (hasSavedEducationsRef.current) {
    if (educationsToUpdate.length > 0) subRequests.push(putEducations(educationsToUpdate));
    if (educationsToCreate.length > 0) subRequests.push(postEducations(educationsToCreate));
  } else if (educationsToCreate.length > 0) {
    subRequests.push(postEducations(educationsToCreate));
  }
  ```

- **career-section.tsx:31 / certification-section.tsx:28 / education-section.tsx:31 / award-section.tsx:22** — `useWatch({ control, name: 'careers' })` 는 배열 전체를 구독한다. 경력 항목이 N개일 때 한 항목만 수정해도 N개 항목을 포함한 배열 전체가 리렌더를 유발한다. 삭제 버튼 노출 조건만 필요하므로 `useWatch({ control, name: \`careers.${index}.company\` })`형태로 인덱스별 구독으로 교체하거나`Controller`를 활용하면 렌더 범위를 최소화할 수 있다. (AC 정확성에는 영향 없으나 항목이 많아질 때 체감 성능 저하 가능)

- **portfolio/page.tsx:90** — `isSubmitEnabled = isValid && !portfolioFile.fileError`. `portfolioSchema`에 `agreement: z.literal(true)` 가 포함되어 있어 동의 체크 없이는 `isValid`가 false가 된다. 링크-only 저장 허용 버그 수정 자체는 올바르나, 동의 체크를 하지 않은 상태에서 링크만 입력해도 여전히 제출이 막히는 것이 의도된 동작인지 AC 관점에서 명시적으로 검증 필요.

---

## Minor

- **resume/page.tsx:258** — `e.educationId as number` 캐스팅은 바로 위 `.filter((e) => e.educationId != null)` 에서 null/undefined를 걸렀으므로 런타임 안전하다. 단, TypeScript가 narrowing을 자동 추론하지 못하는 이유는 `educationId`의 스키마 타입이 `z.number().optional()`(→ `number | undefined`)이기 때문이다. 스키마 수준에서 분리 타입을 두거나 타입 단언 대신 `e.educationId!` 를 쓰는 것이 의도를 더 명확히 전달한다. (동일 패턴: workExperienceId, certificateId, awardId)

- **resume/page.tsx:41–55 (모듈 위치)** — `isEmptyEducation`, `isEmptyCareer` 등 유틸 함수와 enum 매핑 상수가 페이지 컴포넌트 파일에 인라인으로 작성되어 있다. 테스트 가능성과 관심사 분리를 위해 `src/lib/resume-utils.ts` 또는 동일 디렉토리 `_utils.ts`로 분리를 고려한다.

- **portfolio/page.tsx:93** — `onSubmit` 함수 본문 앞에 빈 줄이 있다(93행). Prettier 설정 기준 불필요한 공백.

- **api-client.ts:170–173** — FormData 분기 처리가 명확히 개선되었다. `requestHeaders.delete('Content-Type')` 이 먼저 실행되어 기존에 호출부가 헤더를 넘겨도 안전하게 제거된다. 의도대로 동작함을 확인.

---

## Suggestion

- **resume/page.tsx — `hasSavedXxxRef` 패턴 일관성**: 현재 구현은 최초 로드 시점의 서버 데이터 유무를 ref로 캡처한다. 사용자가 페이지를 이탈하지 않고 다중 저장(예: 빠른 연속 제출)을 시도할 경우 ref 값이 갱신되지 않아 두 번째 제출부터 항상 PUT만 호출된다. 현재 UX 흐름(제출 후 페이지 이동)에서는 문제없으나, 후속 기능 확장 시 주의 필요.
