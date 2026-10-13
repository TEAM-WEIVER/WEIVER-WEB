# #128 커버리지 검토

- 역할: `coverage-auditor` (`.claude/agents/coverage-auditor.md` 기준)
- 판정: **FAIL — 전역 커버리지 70% 임계값 미달**
- 자료: 메인 세션에서 구현 전에 실행한 `pnpm test:coverage --run`의 출력과 `coverage/coverage-final.json`, `coverage/index.html`.
- 시점: 구현 전 baseline. 당시 `src/app/page.tsx`는 `redirect('/login')` 구현이다. 최종 구현의 커버리지 측정으로 해석하지 않는다.
- 이 감사에서는 테스트를 재실행하거나 코드·테스트·커버리지 설정을 변경하지 않았다.

## 구현 후 실행 결과

메인 세션이 최종 `return null` 구현에서 `pnpm test:coverage --run`을 실행했다. 33개 파일·332개 단위 테스트는 모두 통과했고, 전역 네 지표는 아래 baseline과 동일하여 명령은 임계값 미달로 실패했다. 별도 production 인수 테스트 신규 17개와 기존 토스트 9개(총 26개)는 통과했다. 인수 테스트 통과는 전역 단위 커버리지 FAIL 판정을 바꾸지 않는다. 상세 실행 기록은 `docs/reviews/verification-128.md`와 `.cmux/128-final-coverage.log`를 참조한다.

## 전역 결과

단위 테스트는 통과했지만 커버리지 명령은 전역 임계값 미달로 실패했다. E2E 성공 여부와 전역 단위 커버리지 판정을 별도로 다룬다.

| 지표       | 실행 출력 | 요구 임계값 | 판정 |
| ---------- | --------- | ----------- | ---- |
| Statements | 46.28%    | 70%         | FAIL |
| Branches   | 44.3%     | 70%         | FAIL |
| Functions  | 40.54%    | 70%         | FAIL |
| Lines      | 47.11%    | 70%         | FAIL |

JSON 집계는 statements 1,687/3,645, branches 1,160/2,618, functions 446/1,100이다. branches와 functions를 소수 둘째 자리에서 반올림하면 각각 44.31%, 40.55%이며 표에는 실행 출력의 절삭값을 유지했다.

## 기존 미테스트 영역

측정 대상은 `vitest.config.ts`의 `src/**/*.{ts,tsx}` 전체다. Storybook stories와 단위 테스트 파일은 제외된다. `--project unit` 실행으로 Storybook interaction과 Playwright E2E의 실행 커버리지가 합산되지는 않는다.

168개 측정 파일 중 statement 실행이 전혀 없는 파일은 87개이며, 해당 파일의 statement 합은 1,664개다. 주요 미실행 영역은 다음과 같다.

| 파일                                                                       | 미실행 statements / 전체 |
| -------------------------------------------------------------------------- | ------------------------ |
| `src/app/applicant/interview/_components/interview-question-screen.tsx`    | 265/265                  |
| `src/app/corporate/recruitment/[jdId]/_components/applicant-list-view.tsx` | 125/125                  |
| `src/app/applicant/interview/_components/interview-start-screen.tsx`       | 110/110                  |
| `src/app/corporate/recruitment/new/_components/job-posting-form.tsx`       | 87/87                    |
| `src/hooks/corporate/use-dashboard.ts`                                     | 75/75                    |
| `src/hooks/corporate/use-job-posting.ts`                                   | 61/61                    |
| `src/hooks/corporate/use-applicant.ts`                                     | 57/57                    |

따라서 전역 미달은 루트 페이지의 단일 redirect 제거 전부터 존재하는 광범위한 단위 미테스트 영역과 연결된다. 이슈 범위의 검증이 성공하더라도 전역 커버리지 PASS로 표시할 수 없다. 기준 완화·파일 제외·무의미한 테스트로 수치를 보정하지 않는다.

## 이슈 관련 핵심 로직과 한계

| 파일                                              | Statements | Branches  | Functions | 검토                                                                                                     |
| ------------------------------------------------- | ---------- | --------- | --------- | -------------------------------------------------------------------------------------------------------- |
| `src/app/page.tsx`                                | 0/1        | 분기 없음 | 0/1       | 구현 전 루트 redirect. HTTP·URL·초기화 동작은 인수 테스트로 확인해야 한다.                               |
| `src/lib/protected-routing.ts`                    | 24/25      | 30/32     | 3/3       | 기존 단위 테스트가 세 보호 영역의 인증 실패·역할 불일치·정상 역할을 검증한다.                            |
| `src/components/common/protected-route-guard.tsx` | 0/24       | 0/10      | 0/4       | 실제 가드의 토큰 재발급·실패·가드 내부 콘텐츠 차단은 이 단위 측정으로 입증되지 않는다.                   |
| `src/app/login/page.tsx`                          | 2/2        | 분기 없음 | 1/1       | 기존 로그인 단위 테스트는 개인·기업 성공/실패 흐름을 검증한다. 직접 URL·새로고침은 인수 테스트 대상이다. |
| `src/lib/auth-api.ts`                             | 4/4        | 분기 없음 | 2/2       | 재발급 위임과 로그아웃 성공/실패는 기존 단위 테스트로 확인한다.                                          |
| `src/store/toast-store.ts`                        | 12/15      | 분기 없음 | 7/8       | facade 추가·실패 처리가 기존 단위 테스트에 있다. 실제 표시·닫기·소멸·스택은 기존 토스트 E2E 대상이다.    |

`protected-routing.ts`의 미커버 항목은 공개 경로에 대한 `getRoleRedirectPath` 조기 반환(20행)과 이미 올바른 온보딩 단계에 있는 경우의 무이동 분기(43행)다. 전자는 공개 경로 분기, 후자는 기존 온보딩 진행 유틸이며 이번 변경은 두 함수를 수정하지 않는다.

예정된 `Home`의 `return null`에는 신규 비즈니스 로직·오류 처리·조건 분기가 없다. 단순히 반환값을 확인하는 단위 테스트를 커버리지 수치 목적으로 추가할 필요는 없다. 대신 AC1–AC2의 HTTP 200·Location 없음·로그인 자동 이동 없음·빈 페이지 고유 콘텐츠를 production 인수 테스트에서 확인해야 한다.

가드 회귀에 필요한 별도 증거는 production 서버에서 세 보호 경로 각각의 정상 토큰 접근, 저장 역할+재발급 성공, 인증 거절/API 오류, 역할 불일치, 확인 중·실패 후 내부 콘텐츠 비노출이다. 기업 개발 환경은 가드를 우회하므로 dev 서버 결과만으로 해당 회귀를 충족했다고 판정할 수 없다. E2E 성공은 의미 있는 동작 증거지만 이 단위 커버리지의 0%를 변경하지는 않는다.

## 후속 상태

- 메인 세션에서 최종 인수·회귀 결과를 별도 기록해야 한다. 본 보고서는 해당 실행의 성공을 선제적으로 주장하지 않는다.
- 전역 70%를 충족하려면 위 기존 광범위 미테스트 영역의 사용자 상호작용·API 실패·핵심 분기를 의미 있는 단위/컴포넌트 테스트로 보완해야 한다. 이는 루트 redirect 제거보다 넓은 작업이다.
- 이 보고서만으로 워크플로우의 커버리지 gate를 통과했다고 판단할 수 없다.
