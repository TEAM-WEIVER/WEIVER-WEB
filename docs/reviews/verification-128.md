# #128 구현 검증

## 결과

- 변경: `src/app/page.tsx`에서 `redirect('/login')`을 제거하고 서버 컴포넌트가 `null`을 반환한다.
- 루트 페이지 고유 콘텐츠가 없으며 공통 레이아웃·로그인·인증 가드·배포 설정은 변경하지 않았다.
- 검증 서버: `NEXT_PUBLIC_E2E_TEST=true pnpm build` 후 `pnpm start --port 3128`, production 환경.

## ATDD 증거

1. 구현 전에 `e2e/128-root-login-redirect-removal.spec.ts` 및 실제 소비하는 `e2e/mocks/root-routing.ts`를 작성했다.
2. 구현 전 루트 HTTP 테스트 실행: expected `200`, received `307`로 실패했다.
3. 루트 페이지를 수정한 뒤 production 빌드와 동일 테스트를 포함한 인수 검증을 실행했다.
4. 신규 17개와 기존 토스트 9개, 총 **26개 통과**.

```sh
E2E_EXTERNAL_SERVER=true E2E_PORT=3128 pnpm exec playwright test \
  e2e/128-root-login-redirect-removal.spec.ts e2e/86-toast.spec.ts \
  --workers=2 --reporter=line --output=.cmux/128-green-results
```

- AC1: 리다이렉트 비추종 HTTP `200`, `Location` 없음. 브라우저 초기화 이후 직접 접근·새로고침 시 `/` 유지.
- AC2: 페이지 고유 콘텐츠 없음. HTML·공통 레이아웃·스크립트를 포함하는 응답 자체가 0바이트라는 의미는 아니다.
- AC3: `/login` 직접 접근·새로고침, 개인·기업 탭별 폼 확인.
- AC4: 기업·개인·온보딩의 저장 역할과 실제 목 재발급 성공 후 페이지 콘텐츠 렌더링.
- AC5: 세 보호 경로에서 재발급 `401`·`500` 응답을 보류해 인증 확인 중 페이지 콘텐츠가 없는지 확인한 뒤, 실패 후 `/login` 및 로그인 폼 확인.
- AC6: 세 보호 경로의 역할 불일치 시 허용 대시보드 이동·금지 페이지 콘텐츠 비노출.
- AC7: 루트의 실제 토스트 표시·닫기 및 기존 #86 표시·타입·자동 소멸·스택·history 기반 이동 회귀 통과.
- 루트의 역할별 케이스는 기존 sessionStorage 역할과 재발급 성공 목을 준비한다. 루트 자체는 인증 API를 호출하지 않으므로 유효 메모리 토큰을 복원하거나 실제 백엔드 로그인 세션을 만드는 테스트는 아니다.
- 테스트 API 요청은 기존 Playwright `page.route` 전략으로 모두 가로채며, 미등록 API 요청은 실패로 처리한다. 제품의 MSW 런타임에는 새 핸들러를 등록하지 않았다.

## 품질 및 화면 검증

| 항목                                     | 결과                            |
| ---------------------------------------- | ------------------------------- |
| `NEXT_PUBLIC_E2E_TEST=true pnpm build`   | PASS                            |
| `pnpm lint:check`                        | PASS                            |
| `pnpm typecheck`                         | PASS                            |
| `pnpm test:coverage --run`의 단위 테스트 | 33개 파일·332개 테스트 PASS     |
| 동일 명령의 전역 커버리지 임계값         | FAIL — 변경 전·후 모두 70% 미달 |

- 전역 커버리지: statements 46.28%, branches 44.3%, functions 40.54%, lines 47.11%. 변경 전과 동일하다. 기준 완화나 수치용 단위 테스트를 추가하지 않았다. 상세: `docs/reviews/coverage-128.md`.
- 별도 Playwright Chromium 화면 확인: 빈 `/`, 루트 성공 토스트, 기업 기본 탭의 `/login` 화면을 캡처하고 이미지를 직접 확인했다. 페이지 고유 콘텐츠가 없는 루트, 정상 토스트, 기존 로그인 폼의 표시를 확인했다.
- 화면 원본은 `.cmux/128-root.png`, `.cmux/128-root-toast.png`, `.cmux/128-login.png`, 실행 로그는 `.cmux/128-e2e.log`, `.cmux/128-final-coverage.log`에 로컬 보관한다.
- 워크플로우의 `verify` 스킬은 제공된 스킬 목록과 저장소에 없어 Playwright 실제 브라우저 실행과 화면 캡처 확인으로 수행했다.
- 이번 변경은 신규 비즈니스 로직·폼·상호작용을 추가하지 않는다. `return null`을 반복 확인하는 수치용 단위 테스트 대신 실제 HTTP·URL·공통 토스트 회귀를 인수 테스트로 검증했다.

## 범위와 남은 검증

- `weiverai.com/`에 별도 레포의 랜딩이 제공되는 것은 경로 분기 배포 후속 작업이다. 이번 로컬 앱 검증으로 공개 도메인 연결 완료를 주장하지 않는다.
- 기업 development 가드 우회가 검증에 영향을 주지 않도록 production 서버를 사용했다.
- 실제 백엔드 인증, 공개 도메인 경로·자산·RSC 분기, 외부 레포의 랜딩은 이번 구현 검증 범위 밖이다.
- 저장소 전체 커버리지 70% 회복은 기존 미테스트 영역의 후속 작업으로 남는다.
