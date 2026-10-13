# US 리뷰 — #128 Round 2

## 판정: PASS — 사용자 요청에 따른 서브에이전트 대체 검토

- 사용자 요청: “너가 서브 에이전트로 검증 한 번 돌려봐.”
- 수정된 기획 `docs/plans/128-root-login-redirect-removal.md`를 세 서브에이전트가 다른 리뷰를 읽지 않고 독립 정적 검토했다.
- 세 검토자는 모두 현재 Codex 세션의 서브에이전트다. 실제 Claude·Gemini 참여나 서로 다른 모델의 교차 검토 완료로 기록하지 않는다.
- 결과: 3개 렌즈 모두 PASS. Critical 0 / Major 0 / 중복을 제외한 Minor 3.
- 이전 Round 1의 온보딩 진행 가드 Major는 수정된 AC4가 현재 인증·역할 가드와 일치하므로 해소된 것으로 확인했다.
- 이 판정은 기획 검토 결과다. 코드 구현, 실행 테스트, 공개 도메인 배포, 사람 검증 완료를 뜻하지 않는다.

## 렌즈별 결과

| 렌즈                               | 결과 | Critical | Major | Minor | 원문                                                   |
| ---------------------------------- | ---- | -------- | ----- | ----- | ------------------------------------------------------ |
| 요구사항·보안 (`us-reviewer` 기준) | PASS | 0        | 0     | 2     | `.cmux/debates/128-subagent-review/requirements-r1.md` |
| 정확성·논리·반례                   | PASS | 0        | 0     | 2     | `.cmux/debates/128-subagent-review/correctness-r1.md`  |
| 배포 현실성·외부 사실              | PASS | 0        | 0     | 0     | `.cmux/debates/128-subagent-review/deployment-r1.md`   |

## Critical

없음.

## Major

없음.

## Minor — 사람 판단 대기

1. **빈 본문의 검증 범위**: 루트 페이지 고유 콘텐츠가 없다는 뜻으로 표현을 통일한다. HTTP 응답 body 0바이트나 공통 레이아웃 DOM 제거를 요구하지 않는다. 두 렌즈가 동일한 사항을 지적했다. 근거: `src/app/layout.tsx:27`의 HTML·공통 진행 표시·토스트 렌더링.
2. **로그인 폼의 탭별 표시**: AC3는 두 폼의 동시 표시가 아닌 기본 탭의 폼과 개인·기업 탭 선택 시 해당 폼 표시로 구체화한다. 근거: `src/app/login/_components/login-form.tsx:31`의 탭 선택.
3. **보호 콘텐츠 비노출의 범위**: AC5·AC6의 검증 대상을 가드 내부의 페이지 고유 콘텐츠·데이터로 한정하고, 가드 밖의 기존 헤더·사이드바는 보존한다. 근거: `src/app/corporate/_components/corporate-shell.tsx:24`, `src/app/onboarding/layout.tsx:7`, `src/components/common/protected-route-guard.tsx:53`.

위 사항은 현재 AC를 올바르게 해석할 때 구현을 막는 결함이 아니다. 이번 검토에서 자동 수용·기각하거나 기존 인증 동작을 변경하지 않았다. Round 1의 CSRF 매핑 보강 제안 역시 당시의 경미한 제안으로 남으며 신규 API 요구가 아니다.

## 확인한 범위와 한계

- 같은 도메인의 `/` 랜딩과 `/login`, `/corporate` 등 앱 경로 구성은 사용자 확정 사항이다.
- 앱 origin에서 자동 이동 없는 루트와 공개 도메인의 랜딩 표시를 구분한다. 리다이렉트 제거만으로 별도 레포의 랜딩이 연결된다고 주장하지 않는다.
- 재발급의 저장 역할 전제, 인증 실패 처리, 역할별 이동, 기업 development 가드 우회에 따른 production 검증 계획은 현재 소스와 일치한다.
- 배포 렌즈는 Next.js 공식 [Multi-zones 가이드](https://nextjs.org/docs/app/guides/multi-zones)를 확인했다. 실제 랜딩 프레임워크·배포 경로 설정은 미확인이다.
- 테스트·빌드·브라우저 실행은 수행하지 않았다. 후속 ATDD에서 동작을 검증해야 한다.
- 빈 루트 구현안·API 변경 없음·Minor 수용 여부에 대한 사람 검증은 아직 남아 있다. 원래의 Claude/Gemini 접근 제한은 이번 사용자 요청에 따른 대체 검토의 완료를 막는 조건으로 취급하지 않는다.
