# 코드 리뷰 — #119 Round 2

## 판정: PASS

> 검증 실행 결과: `pnpm typecheck` 통과, `pnpm lint:check` 통과, `pnpm test` 33 files / 328 tests 통과.
> 범위: Round 1 Major M1~M6과 Minor 수정분(m1, m2, m4, m6, m10, m11, `normalizeBrokerUrl` export)이 제대로 고쳐졌는지, 그리고 수정 때문에 새로 생긴 문제가 없는지 확인했다.

### Round 1 지적 사항 재확인

| #   | 항목                                                        | 결과 | 근거                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | ----------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | 녹음기 비정상 정지 `onInterrupted`, 질문 화면 `stop()` null | 해결 | `use-audio-recorder.ts:236-248` — `recorder.onstop`·`onerror`와 트랙 `ended`에 `handleInterrupted`를 건다. generation과 `statusRef === 'recording'` 가드가 있어 정상 `stop()`(`stopInternal`이 `onstop`을 덮어씀, `:168`)이나 `cancel()`(generation 증가) 뒤에는 실행되지 않는다. `track.stop()`은 명세상 `ended`를 발생시키지 않으므로 자체 정리 때 잘못 실행되지 않는다. 질문 화면 `:499-501`, `:534-540`에서 AC13 (B) 안내와 "다시 시도" 포커스(`:220-222`)로 이어진다. 단위 테스트 있음. |
| M2  | 카메라 `cancelled` 가드                                     | 해결 | `interview-start-screen.tsx:95-118`, `interview-question-screen.tsx:361-384` — 늦게 온 스트림은 즉시 `stop()`하고, `denied` 갱신도 생략한다.                                                                                                                                                                                                                                                                                                                                                 |
| M3  | `setAnswerAccepted`의 `!= null`과 optional 필드             | 해결 | `interview-store.ts:85-90`, `:198-199`. store 테스트(`interview-store.test.ts:328`)와 훅 테스트(`use-interview-websocket.test.ts:324`) 있음.                                                                                                                                                                                                                                                                                                                                                 |
| M4  | 언마운트 cleanup에서 `disconnect()` 호출                    | 해결 | `use-interview-websocket.ts:466-469`. `finishedRef`를 세우므로 `reactivateClient`의 `.then`(`:108`)이 `activate()`를 하지 않는다. StrictMode에서 mount→cleanup→mount가 일어나도 `connect()`가 `finishedRef`를 다시 false로 돌리므로(`:206`) 영향이 없다. 테스트 `:796`, `:809` 있음.                                                                                                                                                                                                         |
| M5  | `setQuestion` 세션 가드와 `session:code:sequence` 중복 제거 | 해결 | `interview-store.ts:172-179`. `SESSION_STARTED` 전(세션 ID가 null일 때)에는 그대로 반영한다. 테스트 `:135`, `:157`, `:171` 있음.                                                                                                                                                                                                                                                                                                                                                             |
| M6  | STOMP ERROR 뒤 close가 ERROR를 덮어쓰지 않음                | 해결 | `use-interview-websocket.ts:318-321`. 테스트 `:421` 있음.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| m1  | 재시도 타이머를 걸기 전에 `clearRetryTimer()`               | 해결 | close 경로 `:343`, visibility 경로 `:445`. 테스트 `:752` 있음.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| m2  | `giveUpReconnect`에서 deactivate                            | 해결 | `:117-125`. close, 타이머, visibility 세 경로가 모두 이 함수를 쓴다. deactivate 뒤 close가 와도 status가 ERROR라 `isActiveStatus()`에서 걸러진다.                                                                                                                                                                                                                                                                                                                                            |
| m10 | `handleResubmit`에서 안내 지우기                            | 해결 | `interview-question-screen.tsx:545-553`.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| m11 | `finishInterview` 반환 타입 boolean                         | 해결 | `use-interview-websocket.ts:141-148`, `use-answer-audio-upload.ts:106`.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| m6  | 세션 ID `encodeURIComponent`                                | 해결 | `interview-api.ts:46`, `:57`, `:83`.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -   | `normalizeBrokerUrl` export                                 | 해결 | `use-interview-websocket.ts:14`. 테스트 `use-interview-websocket.test.ts:165` 있음.                                                                                                                                                                                                                                                                                                                                                                                                          |

## Critical

- 없음

## Major

- 없음

## Minor

- src/hooks/use-interview-websocket.ts:106-111, 449-452 — Round 1 m1 (1)의 일부가 남아 있다. visibility 경로에서 소켓이 아직 `CLOSED`가 아니면 `reactivateClient`의 `deactivate()`가 close를 일으킨다. 이때 `onWebSocketClose`(status `RECONNECTING`)가 재시도 타이머를 하나 더 걸고 `retryCount`를 올린다. `.then`의 `activate()`로 시작한 연결이 그 타이머 delay(1~4초) 안에 맺어지지 않으면, 타이머의 `reactivateClient`가 진행 중인 연결을 끊고 다시 시작한다. 대부분은 `onConnect`의 `clearRetryTimer()`로 회복되므로 Minor로 둔다. 필요하면 `reactivateClient` 진행 중 플래그를 두어 close 경로의 재시도 타이머를 건너뛰게 한다.
- src/hooks/use-audio-recorder.ts:246-248 — 트랙 `ended` 리스너를 `teardown`에서 제거하지 않는다. generation 가드 덕분에 동작상 문제는 없고, 트랙도 곧 해제된다. 정리 차원에서 `removeEventListener`를 고려한다.
- src/hooks/use-interview-websocket.ts:390-415 — page가 더 이상 `submitAnswer`(STOMP 텍스트 답변)를 쓰지 않는다. 텍스트 답변 경로를 남겨 둘 의도가 아니라면 이후 정리 대상이다.
- Round 1 m7(화면 로컬 질문 키와 store 질문 키의 기준 불일치)과 m9(`118-ai-tts-audio-url` dev 서버 6건 실패)는 Round 1 판단대로 보류·별도 추적한다.

## Minor 정리

- `void client.deactivate()` 통일: `use-interview-websocket.ts`의 bare 호출 3곳에 `void`를 붙였다. 해결.
- 트랙 `ended` 리스너 해제: `use-audio-recorder.ts`에서 핸들러 ref를 두고 `teardown`(cancel·unmount), 정상 `stop()`의 `onstop`, 시작 실패 경로에서 `removeEventListener`로 해제한다. 해결.
- `submitAnswer` 제거: src/·e2e/에 사용처가 없어(e2e는 미호출 단언만 있음) 훅 구현·반환값·전용 단위 테스트를 삭제했다. 해결.

## 보류/후속

- m7 질문 화면 로컬 질문 키와 store 질문 키 기준 불일치 — 이번 PR에서 다루지 않고 후속 이슈로 보류한다.
- m9 `118-ai-tts-audio-url` dev 서버 모드 6건 실패 — 프로덕션 빌드(CI) 기준은 통과하므로 후속 이슈로 보류한다.
