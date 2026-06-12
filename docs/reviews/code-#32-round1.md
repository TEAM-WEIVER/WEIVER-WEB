# 코드 리뷰 — #32 Round 1

## 판정: 수정 필요

---

## Critical

- `src/lib/auth-token.ts`:35 — `accessToken`을 모듈 레벨 변수(`let accessToken`)에 저장한다. 이는 인메모리지만 Next.js App Router의 서버/클라이언트 혼합 환경에서 모듈이 서버에서 공유될 경우 세션 간 토큰 누출이 발생할 수 있다. AC4 및 CLAUDE.md 정책은 `accessToken`을 httpOnly cookie에 저장하도록 명시하고 있으나, 현재 구현은 인메모리 변수에 저장 후 cookie 처리 없이 종료된다. Next.js Route Handler에서 `Set-Cookie` 응답 헤더로 처리하거나, `cookies()` API로 명시적으로 저장해야 한다.

- `src/lib/auth-token.ts`:1 — AC4: "응답의 `accessToken`을 httpOnly cookie에 저장한다 (Zustand 전역 상태에 직접 저장 금지)" — httpOnly cookie 설정 로직이 전혀 없다. `setAuthSession`은 인메모리 변수와 sessionStorage에만 저장한다. 페이지 새로고침 시 accessToken이 소멸되며, 이는 인증 플로우를 깨뜨리는 AC 미구현이다.

---

## Major

- `src/app/signup/account-info/_hooks/use-email-verification.ts`:22 — `sendCount`가 5분 타이머 기준으로 리셋되지 않는다. AC7은 "5분 이내에 3회 초과" 제한인데, 현재 구현은 페이지 생존 기간 동안 누적 카운트만 관리한다. 타이머 만료·재시작 시점에 `sendCount`를 리셋하거나, 타이머 시작 시각 기준으로 윈도우를 관리해야 한다.

- `src/app/signup/agreements/page.tsx`:22 — `useEffect`로 `signupToken` 미존재 시 리다이렉트하지만, 리다이렉트 전 짧은 시간 동안 약관 폼이 렌더링된다. 조건부 early return(`if (!account.signupToken) return null`)을 useEffect와 병행해 플리커를 방지해야 한다.

- `src/app/signup/account-info/_components/email-verification-section.tsx`:32 — 이메일 입력 필드에 `aria-describedby`가 없어 에러 메시지와 연결되지 않는다. AC 접근성 주의사항에 `aria-describedby` 연결이 명시되어 있다.

- `src/app/signup/account-info/_components/password-fields-section.tsx` — 비밀번호 필드에 에러 표시용 `FieldError`가 없다. `errors.password?.message`가 렌더링되지 않아 Zod 유효성 에러가 사용자에게 표시되지 않는다 (`passwordConfirm`은 `FieldError`가 있으나 `password`는 누락).

---

## Minor

- `src/app/signup/agreements/page.tsx`:35 — `defaultValues`를 `Object.fromEntries`로 구성할 때 타입이 `Record<string, boolean>`으로 추론되어 `IndividualTermsData`와 일치하지 않을 수 있다. `useForm<IndividualTermsData>`의 `defaultValues`에 명시적 타입 캐스팅을 추가하면 타입 안전성이 높아진다.

- `src/lib/signup-terms.ts`:전체 — 약관 본문(`content`)이 소스 코드에 하드코딩되어 있다. 추후 유지보수를 위해 별도 상수 파일이나 CMS 관리를 고려할 수 있다.

- `src/app/signup/account-info/page.tsx`:45 — `savedAccount.email`을 `defaultValues`에 사용하지만 이메일 인증 완료 여부는 저장하지 않는다. 새로고침 후 이메일은 복원되나 인증 상태는 소멸되어 재인증이 필요하다. 이는 AC2에서 의도된 동작이나, 사용자에게 재인증 필요 안내가 없다.
