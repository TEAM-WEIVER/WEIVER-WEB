# 코드 리뷰 — #119 Round 1

## 판정: 수정 필요

> 검증 실행 결과: `pnpm typecheck` 통과, `pnpm lint:check` 통과, `pnpm test` 33 files / 266 tests 통과.
> e2e(`119-ai-stt-audio-upload`, `interview`, `118-ai-tts-audio-url`) 91건 중 85건 통과. 실패 6건은 모두 `118-ai-tts-audio-url.spec.ts`(speechSynthesis 호출 횟수, Safari 수동 재생)이며, HEAD(69f2577)를 깨끗한 worktree에 받아 실행해도 같은 6건이 실패한다. 이번 변경으로 생긴 회귀가 아니고 원래 있던 실패다(Minor 참고).
>
> 집중 검토 항목 요약
>
> - 업로드와 STOMP 도착 순서, 늦게 온 응답, 35초 deadline·AbortController: 요청 ID와 `isApplicable` 가드, 질문 키 단위 초기화, deadline에서 즉시 resolve하는 구조가 계획서와 맞다. 검증 시나리오 1~5는 단위 테스트와 e2e로 확인된다. 문제 없음.
> - 401 재발급, `isReissueFailure`, /login 이동과 disconnect: 순서(토스트 → `disconnect()` → `reset()` → `router.replace`)가 AC12와 같다. 다만 `reset()` 때문에 시작 화면이 잠깐 마운트되면서 카메라 스트림이 새는 문제가 있다(Major 2).
> - `reactivateClient()`: stompjs 7.3.0 소스로 확인했다. `reconnectDelay: 0`이면 소켓이 닫혀도 상태가 `ACTIVE`로 남아 `activate()`가 무시된다. 즉 이번 수정 전에는 재연결 재시도가 실제로 아무것도 하지 않았다. 고친 방향은 맞다. 남은 경계 상황은 Minor에 적었다.
> - `'cancelled'`/`'stopping'` 녹음기 상태, 질문이 바뀔 때의 추가 cancel, `answerAcceptedKey` 일치 시 submit no-op, AC12 content-type 단언 완화: 모두 타당하다. 계획서와 다른 부분은 문서를 맞추면 된다(Minor).
> - 민감 정보: 녹음 Blob과 업로드 phase는 ref/로컬 state에만 있고 store에는 `answerAcceptedKey`(질문 키 문자열)만 들어간다. 토큰 처리는 `api-client` 공통 경로를 그대로 쓴다. 문제 없음.

## Critical

- 없음

## Major

- src/hooks/use-audio-recorder.ts:218-224 — 녹음 중에 `MediaRecorder`가 스스로 멈추는 경우를 처리하지 않는다. 마이크 분리, 권한 철회, 트랙 `ended`, `onerror`가 여기에 해당한다. `onstop`은 `stopInternal()` 안에서만 걸고 `onerror`는 걸지 않는다. 그래서 브라우저가 녹음을 멈추면 훅 `status`가 계속 `'recording'`으로 남고 경과 시간 타이머도 계속 돈다. 이 상태에서 "제출하기"를 누르면 `stop()`이 `recorder.state !== 'recording'`이라 `null`을 반환하고, 화면(`interview-question-screen.tsx:513-514`)은 아무 안내 없이 끝난다. 120초 자동 종료도 같은 이유로 아무 일도 하지 않는다. 사용자는 녹음 중 화면에 갇히고 빠져나올 방법은 "오류가 있어요"뿐이다. 수정 방향은 두 가지다. (a) 녹음 시작 시 `recorder.onstop`/`onerror`와 `track.onended`를 걸어, 예상하지 못한 정지면 청크를 정리하고 `idle`로 돌린 뒤 화면에 AC13 (B)의 "마이크를 사용할 수 없어요" 안내와 "다시 시도"를 띄운다(예: `start()` 옵션의 `onInterrupted` 콜백). 이미 모은 청크로 업로드를 이어 가는 방식도 가능하다. (b) 최소한으로는 `handleSubmitRecording`에서 `stop()`이 `null`이고 녹음기가 `recording`이 아니면 `cancel()` 후 안내를 띄운다.
- src/app/applicant/interview/\_components/interview-start-screen.tsx:89-107 — 카메라 effect에 취소 플래그가 없다. `getUserMedia({ video: true })`가 resolve되기 전에 언마운트되면 cleanup 시점에는 `cameraStreamRef`가 아직 비어 있고, 나중에 resolve된 스트림은 아무도 멈추지 않는다. 카메라 표시등이 계속 켜져 있게 된다. 기존 코드에도 있던 문제지만 이번 변경으로 실제로 일어나는 경로가 생겼다. AC12의 `handleAuthFailure`(`use-answer-audio-upload.ts:258-265`)가 `reset()`을 부르면 store가 `IDLE`이 되고 page가 곧바로 시작 화면을 마운트한다. 시작 화면은 카메라와 마이크 `getUserMedia`를 호출하는데, 직후 `router.replace('/login')`로 언마운트된다. 마이크 쪽은 `micRequestIdRef`로 막혀 있지만 카메라 쪽은 막혀 있지 않다. 마이크 effect처럼 요청 순번이나 `cancelled` 플래그를 두고, 늦게 resolve된 스트림은 즉시 `stop()`해야 한다. 질문 화면의 카메라 effect(`interview-question-screen.tsx:352-372`)도 같은 패턴이니 함께 고친다.
- src/store/interview-store.ts:191-192 — `setAnswerAccepted`는 `questionCode !== null` / `sequence !== null`로 비교를 건너뛸지 판단한다. 그런데 서버 payload에 필드가 아예 없으면 JSON 파싱 결과가 `undefined`이므로 비교가 실행되고 메시지 전체가 무시된다. 계획서 "확인 필요 #11"의 방어 규칙("`null`이면 해당 비교 생략")을 지키지 못한다. 이렇게 되면 AC10 검증 시나리오 2(타임아웃 뒤 `ANSWER_ACCEPTED`로 대기 화면 전환)가 백엔드가 필드를 빼고 보내는 경우에 동작하지 않는다. `questionCode != null`, `sequence != null`(또는 `?? null` 정규화)로 바꾸고, 필드가 없는 payload 단위 테스트를 추가한다.

## Minor

- src/hooks/use-interview-websocket.ts:106-111 — `reactivateClient`의 경계 상황 두 가지.
  - (1) visibilitychange 경로(`:418-432`)에서 소켓이 아직 `CLOSED`가 아니면(연결 중이거나 반쯤 열린 상태) `deactivate()`가 소켓 close를 기다린다. 이때 사용자 `onWebSocketClose`가 실행되어 재연결 타이머를 하나 더 걸고 `retryCount`를 올린다. 대부분은 `onConnect`의 `clearRetryTimer()`로 회복되지만 재시도 예산을 불필요하게 쓴다.
  - (2) 언마운트 cleanup(`:446-453`)은 `finishedRef`를 세우지 않는다. 그래서 `deactivate()`를 기다리는 동안 언마운트되면 `.then`에서 `activate()`가 실행되어, 언마운트 뒤에 연결이 남을 수 있다. 언마운트 cleanup에서 `finishedRef.current = true`를 설정하거나 `disconnect()`를 재사용하는 것을 권장한다.
  - 단위 테스트(`use-interview-websocket.test.ts`)는 재연결 시 `deactivate → activate` 순서를 검증하지 않는다. e2e 검증 시나리오 3·4가 실제 stompjs로 덮고는 있다. 이번 수정은 "재연결 인프라는 그대로 쓴다"는 범위 밖의 버그 수정이므로 계획서 변경 이력이나 PR 본문에 남긴다.
- src/app/applicant/interview/\_components/interview-question-screen.tsx:206-210 — 질문 키가 바뀔 때 `cancelRecorder()`를 부르는 곳은 계획서 "녹음기 `cancel()` 호출 시점"의 세 경우에 없는 네 번째 호출 지점이다. AC4("경과 시간 초기화")를 만족하려면 필요하고, phase를 감시하는 effect가 아니므로 금지 규칙에도 걸리지 않는다. 계획서에 예외로 추가해 문서와 코드를 맞춘다.
- src/hooks/use-answer-audio-upload.ts:393-396 — `answerAcceptedKey === target.key`일 때의 submit no-op은 실제로는 중복 가드다. 이 경우 sync effect가 이미 phase를 `waiting`으로 바꿔 `:386`에서 먼저 반환된다. 해는 없으니 "sync 이전 경계 방어용"이라는 주석만 보강하면 된다.
- src/hooks/use-answer-audio-upload.ts:66 — `error.status === 401`이면 모두 인증 실패로 본다. 그래서 업로드 전 CSRF 조회(`/api/auth/csrf`)가 401을 반환해도 로그아웃 처리된다. 계획서 판정 기준((a) 재시도 응답 401, (b) 재발급 실패)보다 넓다. 실제로 일어날 가능성은 낮으니 현행을 유지하되 주석으로 의도를 남긴다.
- src/lib/interview-api.ts:79 — 경로에 넣는 `interviewSessionId`를 `encodeURIComponent` 하지 않는다. 서버가 주는 uuid라 위험은 낮고 기존 `reportInterviewError`도 같은 방식이다. 일관성 차원에서 함께 정리하는 것을 고려한다.
- src/app/applicant/interview/\_components/interview-question-screen.tsx:113 — 화면 로컬 질문 키(`${sequence}:${question}`)가 store 질문 키(`session:code:sequence`)와 기준이 다르다. `reset()`하면 화면이 언마운트되므로 실제 문제는 없지만, 나중을 위해 page에서 store 질문 키를 prop으로 받는 방식을 고려한다.
- e2e/applicant/119-ai-stt-audio-upload.spec.ts:1723-1728 — AC12 재시도의 content-type 단언을 "multipart + boundary"로 완화한 것은 타당하다. 브라우저는 fetch마다 boundary를 새로 만든다. `formKeys`와 `file` 동일성 단언이 같은 Blob이라는 점을 보완하고 있다. 조치 불필요.
- e2e/applicant/118-ai-tts-audio-url.spec.ts:399, 448, 669, 788, 895, 1048 — dev 서버(`next dev`)에서 6건이 실패한다(speak 호출 횟수 1→2, Safari 수동 재생 시나리오에서 "답변하기" 비활성). HEAD에서도 같은 6건이 실패하므로 #119 회귀는 아니다. StrictMode에서 effect가 두 번 실행되는 것으로 보인다. 별도 이슈로 추적한다.

---

## 다자토론 통합 (Claude × Codex × Antigravity)

> Codex·Antigravity 원문 리포트는 저장소에 없다. 아래 지적 수는 조율 세션이 통합해 전달한 목록 기준이다(Minor 수는 Claude 것만 확인 가능).

| 리뷰어      | Critical | Major                                                                 | Minor  | 판정      |
| ----------- | -------- | --------------------------------------------------------------------- | ------ | --------- |
| Claude      | 0        | 3 (녹음기 비정상 정지, 카메라 스트림 누수, ANSWER_ACCEPTED 누락 필드) | 8      | 수정 필요 |
| Codex       | 0        | 2 (카메라 스트림 누수, setQuestion 세션 가드·중복 키)                 | 미전달 | 수정 필요 |
| Antigravity | 0        | 3 (카메라 스트림 누수, 언마운트 후 재연결, ERROR→IDLE 덮어쓰기)       | 미전달 | 수정 필요 |

### 통합 지적 사항과 조치 상태

| #   | 지적                                                                                                   | 제기                         | 상태                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | 녹음 중 `MediaRecorder` 비정상 정지(트랙 `ended`, `onerror`, 자체 `stop`) 시 화면이 `recording`에 갇힘 | Claude                       | 수정. `useAudioRecorder`에 `onInterrupted` 옵션 추가 — 예상치 않은 정지면 정리 후 `idle` + 경과 시간 0 + 콜백. 질문 화면은 AC13 (B) 안내 + "다시 시도" 표시. "제출하기"에서 `stop()`이 `null`이면 `cancel()` + 같은 안내. 단위 테스트 6건 |
| M2  | 시작 화면·질문 화면 카메라 `getUserMedia`가 언마운트 뒤 resolve되면 스트림 누수                        | Claude · Codex · Antigravity | 수정. 두 화면 카메라 effect에 `cancelled` 플래그 — 늦게 온 스트림은 즉시 `stop()`, `denied` 갱신도 생략                                                                                                                                   |
| M3  | `setAnswerAccepted`가 `undefined`(필드 누락)를 값으로 비교해 수락 전체를 버림                          | Claude                       | 수정. `!= null` 비교 + `AnswerAcceptedParams` 필드를 optional로. store·훅 단위 테스트 추가                                                                                                                                                |
| M4  | 언마운트 cleanup이 `finishedRef`를 세우지 않아 `deactivate` 대기 중 언마운트되면 재연결                | Antigravity · Claude(Minor)  | 수정. 언마운트 cleanup을 `disconnect()`로 교체(종료 플래그 → 타이머 정리 → `deactivate`). 테스트 3건                                                                                                                                      |
| M5  | `setQuestion`이 활성 세션 ID를 확인하지 않고, 중복 키에 `question_code`가 없음                         | Codex                        | 수정. 활성 세션을 알 때 다른 세션 `QUESTION_READY` 무시, `lastReceivedKey`를 질문 키(`session:code:sequence`)로 변경. 기존 형식 단언 테스트 1건을 새 형식으로 갱신, 테스트 3건 추가                                                       |
| M6  | STOMP ERROR 뒤 소켓 close가 `ERROR`를 `IDLE`로 덮어써 오류 배너가 사라짐(#44 기존 버그)                | Antigravity                  | 수정. close 경로에서 상태를 바꾸지 않음. 테스트 추가                                                                                                                                                                                      |
| m1  | visibilitychange 재연결이 기존 재시도 타이머와 겹쳐 재시도 예산 중복 소비                              | Claude                       | 수정. 타이머 등록 전 `clearRetryTimer()`(close 경로도 동일). 테스트 추가                                                                                                                                                                  |
| m2  | 재시도 소진 → ERROR 시 클라이언트가 ACTIVE로 남음                                                      | 통합                         | 수정. `giveUpReconnect()`로 ERROR + `deactivate()` (close·타이머·visibility 세 경로 공통)                                                                                                                                                 |
| m3  | 질문 키 변경 시 `cancelRecorder()`가 계획서 "cancel() 호출 시점"에 없음                                | Claude                       | 문서화. 계획서에 구현 예외(질문 키 변경, 비정상 정지)와 변경 이력 추가                                                                                                                                                                    |
| m4  | `answerAcceptedKey === target.key` submit no-op은 중복 가드                                            | Claude                       | 주석 보강                                                                                                                                                                                                                                 |
| m5  | 업로드 체인의 모든 401(CSRF 포함)을 인증 실패로 처리                                                   | Claude                       | 현행 유지 + 의도 주석                                                                                                                                                                                                                     |
| m6  | 경로의 `interviewSessionId` 미인코딩                                                                   | Claude                       | 수정. `interview-api.ts` 세 함수 모두 `encodeURIComponent`                                                                                                                                                                                |
| m7  | 화면 로컬 질문 키(`sequence:question`)와 store 질문 키 기준 불일치                                     | Claude                       | 보류. 실제 문제 없음(`reset()` 시 화면 언마운트). prop 계약 변경이 필요해 별도 정리로 미룸                                                                                                                                                |
| m8  | AC12 재시도 content-type 단언 완화                                                                     | Claude                       | 조치 불필요                                                                                                                                                                                                                               |
| m9  | `118-ai-tts-audio-url` 6건 실패                                                                        | Claude                       | dev 서버(StrictMode) 전용. 프로덕션 빌드(`next start`, CI와 동일)에서는 91건 모두 통과. 별도 이슈로 추적                                                                                                                                  |
| m10 | "다시 제출" 시 안내 지우기                                                                             | 통합                         | 수정. `handleResubmit`이 `onClearMessage()` + 로컬 안내·마이크 오류 상태를 지움(계획서 "안내 메시지 지우는 시점")                                                                                                                         |
| m11 | `finishInterview` 옵션 반환 타입 `unknown`                                                             | 통합                         | 수정. `boolean`                                                                                                                                                                                                                           |

### 검증 (Round 1 반영 후)

- `pnpm typecheck`, `pnpm lint:check` 통과. `pnpm test` 33 files / 328 tests 통과.
- 단위 커버리지(#119 대상 7개 파일, lines / branches / funcs, v8 JSON 기준): `use-interview-websocket.ts` 98.9 / 92.8 / 100, `use-audio-recorder.ts` 96.6 / 78.4 / 100, `use-answer-audio-upload.ts` 95.7 / 84.4 / 100, `interview-store.ts` 100 / 94.3 / 100, `interview-api.ts` 100 / 100 / 100, `audio-recording.ts` 100 / 81.0 / 100, `api-client.ts` 97.6 / 91.3 / 100. 저장소 전체 임계값(70%)은 이번 이슈와 무관하게 약 46%로 미달.
- e2e(프로덕션 빌드 `NEXT_PUBLIC_E2E_TEST=true pnpm build` + `next start`): `119-ai-stt-audio-upload`, `interview`, `118-ai-tts-audio-url` 91건 모두 통과.
