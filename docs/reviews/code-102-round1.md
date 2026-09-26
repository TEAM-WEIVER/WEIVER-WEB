# #102 계정 설정 코드 검토 — Round 1

## 결과

**PASS** — Critical 0, Major 0.

## 반영한 지적

1. 계정 설정 하단에 빨간 `회원 탈퇴` 버튼, 취소 가능한 확인 다이얼로그, `DELETE /api/auth/applicants/me` 호출을 추가했다.
2. 탈퇴 성공 시 `clearAccessToken()` 후 로그인 화면으로 이동하고, 실패 시 토스트와 현재 화면을 유지하도록 했다.
3. 탈퇴 취소·성공·실패 인수 테스트를 추가했다.

## 확인

- `pnpm build`
- `pnpm exec playwright test e2e/applicant/account-settings.spec.ts --project=chromium` (10 passed)
- `pnpm lint:check`
- `pnpm typecheck`
- `pnpm test` (139 passed)
