# #101 기획 다자토론 1라운드

## 참여 렌즈

- Claude: AC 완결성, 인증·세션, 오류·접근성·개인정보
- Codex: 정확성, 상태 전이, 중복 요청 반례
- Antigravity: API 계약 현실성, WebSocket 종료 및 운영 실패 시나리오

## 판정: FAIL — 기획 보완 후 API 계약 확인 필요

Critical/Major가 남아 있어 구현 단계로 진행하지 않는다. HTML 목업은 사용자 지시로 제외했다.

## 합의된 핵심 보완

1. `INTERVIEW_FINISHED`의 세션 ID가 활성 세션과 일치할 때만 종료 상태로 전이하고, 분석 요청을
   마칠 때까지 세션 ID를 보존한다.
2. analysis/error-report POST는 클라이언트 상태만으로 정확히 한 번을 보장할 수 없다. 401 자동
   재시도, 네트워크 결과 미확정, 새로고침·다중 탭까지 다루려면 서버 멱등성 계약이 필요하다.
3. remaining API의 0회·D-day 의미와 CTA 정책, error-report의 요청 스키마, 200/202/409의 의미는
   ATDD fixture를 작성하기 전에 확정해야 한다.
4. STOMP 오류 뒤에도 오류 신고 가능 상태를 유지하고, 401·재시도·다이얼로그 접근성의 AC를 명시한다.

## 근거 문서

- Codex 검토 원본: 자식 워크트리 `docs/reviews/101-plan-codex-review.md`
- Claude와 Antigravity 결과: Orca Run `run_f47ff33d9286`의 보관된 워커 보고
