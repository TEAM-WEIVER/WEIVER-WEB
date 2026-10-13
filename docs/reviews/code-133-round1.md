# #133 라우트 로딩 E2E 검토

- 경량 경로: 테스트 동기화 수정이며 제품 라우팅·인증·표시 임계값은 변경하지 않는다.
- 별도 code-reviewer 에이전트가 diff를 읽기 검토했고 신규 결함을 발견하지 않았다.
- 모든 느린 전환은 RSC 보류 → 바 표시 확인 → 응답 해제 → URL·숨김 확인 순서다.
- 인터럽션에서는 두 요청을 해제하고 최종 이력서 URL을 확인한다.
- 기존 인터럽션 테스트의 두 번째 바 재노출 검증 한계는 이번 수정 범위 밖이다.

## 검증

- `NEXT_PUBLIC_E2E_TEST=true pnpm build`: PASS
- `CI=true E2E_PORT=3128 pnpm exec playwright test e2e/79-global-route-loading.spec.ts --workers=2 --repeat-each=5 --reporter=line --output=.cmux/133-route-loading-results`: 60 PASS
- `pnpm lint:check`: PASS
- `pnpm typecheck`: PASS

CI 실패의 타이밍 경쟁 설명은 기존 300ms 지연과 200ms 표시 임계값에 근거한 추론이다. 고정 지연으로 자동 해제하지 않고 assertion 이후 해제하여 짧은 표시 구간 의존을 제거했다. CI 확인은 PR에서 진행한다.
