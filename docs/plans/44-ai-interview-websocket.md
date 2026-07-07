# [#44] AI 면접 WebSocket 연동

## User Story

US: 지원자로서, AI 면접관과 실시간으로 질문을 주고받고 싶다. 왜냐하면 실제 면접과 유사한 환경에서 연습하고 피드백을 받아야 취업 역량을 키울 수 있기 때문이다.

---

## Acceptance Criteria

### AC1. WebSocket 연결 및 세션 시작

- Given: 지원자가 유효한 Bearer 토큰을 보유하고 있고, AI 면접 시작 화면에 진입한 상태이다.
- When: "면접 시작" 버튼을 클릭한다.
- Then:
  - 클라이언트 상태가 `IDLE → CONNECTING`으로 전이된다.
  - STOMP 클라이언트가 CONNECT 프레임의 `connectHeaders`에 `Authorization: Bearer {token}`을 포함하여 WebSocket 서버에 연결된다.
    <!-- 브라우저 WebSocket API는 HTTP 핸드셰이크 단계에서 커스텀 헤더를 주입할 수 없으므로, 토큰은 반드시 STOMP CONNECT 프레임의 connectHeaders로 전달해야 한다. -->
  - 연결 성공 후 `/user/queue/interviews` 경로를 구독한다. 상태가 `CONNECTING → SUBSCRIBED`로 전이된다.
  - `/app/interviews/start` 경로로 아래 JSON을 publish한다.
    ```json
    { "interview_type": "TECHNICAL" }
    ```
  - 서버로부터 `SESSION_STARTED` 타입 메시지를 수신하면 `interviewSessionId`를 클라이언트 상태에 저장하고, 상태가 `SUBSCRIBED → QUESTION`으로 전이된다.
    <!-- TODO(impl): start 발송 후 N초 내 SESSION_STARTED 미수신 시 ERROR 처리 필요 -->

### AC2. 질문 수신 및 표시

- Given: 세션이 시작되어 `SESSION_STARTED` 메시지가 수신된 상태이다.
- When: 서버로부터 `QUESTION_READY` 타입 메시지가 도착한다.
- Then:
  - 메시지에 포함된 질문 텍스트가 면접 화면에 표시된다.
  - 현재 질문 순서(sequence)가 진행 상태 UI(예: "질문 2")에 반영된다.
    <!-- QUESTION_READY 메시지에 total 필드가 없으므로 "질문 2/5" 형식의 전체 수 표기는 불가하다. SESSION_STARTED에서 total이 제공되는 경우에만 분모 표시를 활성화한다. 백엔드 협의 필요. -->
  - 지원자가 답변을 입력할 수 있는 텍스트 영역이 활성화된다. (텍스트 입력만 지원, 음성 입력은 범위 외)

### AC2-a. 중복 질문 메시지 방어

- Given: 클라이언트가 특정 `interview_session_id + sequence` 조합의 `QUESTION_READY`를 이미 수신하여 화면에 표시하고 있는 상태이다.
- When: 동일한 `interview_session_id + sequence` 조합을 가진 `QUESTION_READY` 메시지가 재전달되거나, 현재 sequence보다 작은 sequence 값을 가진 `QUESTION_READY` 메시지가 수신된다.
- Then:
  - 수신된 메시지를 무시한다(idempotent 처리).
  - 화면 상태 및 현재 표시 중인 질문이 변경되지 않는다.

### AC3. 답변 제출 및 다음 질문 루프

- Given: `QUESTION_READY` 메시지를 수신하여 질문이 화면에 표시된 상태이다.
- When: 지원자가 답변을 입력하고 "제출" 버튼을 클릭한다.
- Then:
  - `/app/interviews/{interviewSessionId}/answers` 경로로 아래 JSON을 publish한다.
    ```json
    { "question_code": "...", "sequence": N, "answer": "..." }
    ```
  - 제출 직후 입력 UI가 비활성화되고 로딩 상태가 표시된다. 상태가 `QUESTION → SUBMITTING`으로 전이된다.
  - 서버로부터 `ANSWER_ACCEPTED` 메시지를 수신하면 다음 `QUESTION_READY` 메시지를 기다린다.
  - 다음 `QUESTION_READY` 수신 시 AC2 흐름이 반복된다.

#### AC3-a. 마지막 답변 후 INTERVIEW_FINISHED 직접 수신

- Given: 마지막 질문에 대한 답변을 제출하고 `SUBMITTING` 상태인 상황이다.
- When: 서버에서 `ANSWER_ACCEPTED` 없이 `INTERVIEW_FINISHED` 메시지가 도착한다.
- Then:
  - 답변 수락 여부 확인 없이 바로 면접 종료 화면으로 전환된다.
  - AC4의 종료 처리 흐름이 동일하게 적용된다.

### AC4. 면접 종료 처리

- Given: 모든 질문에 대한 답변 루프가 완료된 상태이다.
- When: 서버로부터 `INTERVIEW_FINISHED` 타입 메시지가 수신된다.
- Then:
  - WebSocket 구독이 해제되고 연결이 정상 종료된다.
  - 면접 결과 또는 완료 화면으로 전환된다.
  - 클라이언트 상태가 `FINISHED`로 전이되며 세션 ID가 초기화된다.

### AC5. 연결 실패 및 인증 오류

- Given: 지원자가 AI 면접 시작 화면에 진입했지만 토큰이 만료되었거나 네트워크 이상이 있다.
- When: "면접 시작" 버튼을 클릭하여 WebSocket 연결을 시도한다.
- Then:
  - STOMP ERROR 프레임 또는 WebSocket 연결 오류 이벤트 수신 시 "면접을 시작할 수 없습니다. 다시 시도해 주세요." 에러 메시지가 표시된다.
    <!-- 브라우저 WebSocket API는 HTTP 401 상태 코드를 JS에서 직접 감지할 수 없다. 인증 오류는 STOMP ERROR 프레임의 message/headers 필드로 판별한다. -->
  - STOMP ERROR 프레임의 headers 또는 message에서 인증 오류가 확인된 경우 `/login`으로 리다이렉트된다.
  - WebSocket 연결이 완전히 닫히고 클라이언트 상태가 `ERROR → IDLE`로 복귀한다.

### AC5-a. STOMP ERROR 프레임 처리

- Given: 면접 진행 중(SUBSCRIBED 이후 어느 상태에서든) 서버가 STOMP ERROR 프레임을 전송한 경우이다.
- When: `@stomp/stompjs`의 `onStompError` 콜백이 발생한다.
- Then:
  - 클라이언트 상태가 `ERROR`로 전이된다.
  - ERROR 프레임의 `message` 또는 `headers`에서 추출한 에러 내용이 화면에 표시된다.
    <!-- TODO(impl): ERROR 프레임 header key 우선순위 및 fallback 문구 백엔드 협의 필요 -->
  - WebSocket 소켓 close 이벤트와 구별하여 처리한다(소켓 close는 AC6 재연결 흐름 적용, STOMP ERROR는 즉시 ERROR 상태 전이).
  - `onStompError` 발생 시 stompjs 클라이언트를 `deactivate()`하여 이후 소켓 close 이벤트가 AC6 재연결 흐름을 트리거하지 않도록 차단한다.

### AC6. 답변 제출 중 연결 끊김 및 재연결

- Given: 지원자가 답변을 제출하고 `ANSWER_ACCEPTED`를 기다리는 중이다.
- When: 네트워크 단절로 WebSocket 연결이 끊긴다.
- Then:
  - 클라이언트 상태가 `RECONNECTING`으로 전이되고, 재연결 중임을 알리는 배너 또는 스피너가 표시된다.
  - 단, STOMP ERROR 프레임에 의한 소켓 종료(onStompError 이후 close)는 재연결 대상에서 제외한다.
  - `@stomp/stompjs`의 `reconnectDelay`는 단순 고정 간격 재연결만 지원하므로, 지수 백오프와 재시도 횟수 카운팅은 `beforeConnect` / `onDisconnect` 콜백에서 직접 구현한다.
    <!-- 최대 3회 시도, 대기 시간은 1s → 2s → 4s 순으로 증가. 3회 초과 시 재연결 루프를 중단해야 한다. -->
  - 재연결 성공 시 이전 클라이언트 상태(SUBSCRIBED 또는 SUBMITTING)로 복구한다.
    <!-- TODO(impl): 재연결 성공 시 onConnect 내에서 /user/queue/interviews 재구독 필요 -->
    <!-- TODO(impl): 재연결 성공 시 재시도 카운터와 대기시간 초기화 필요 -->
  - 3회 재연결 실패 시 "연결이 끊겼습니다. 면접이 중단되었습니다." 메시지와 함께 `ERROR` 상태로 전이되고 초기 화면으로 복귀한다.
  - <!-- 재연결 성공 시 서버 측 세션 복구 가능 여부(이전 질문 재표시 vs 새 질문 대기)는 백엔드 협의 후 결정 예정 -->

### AC7. 빈 답변 제출 방지

- Given: `QUESTION_READY` 메시지를 수신하여 질문이 화면에 표시된 상태이다.
- When: 답변 입력 없이(공백 포함) "제출" 버튼을 클릭한다.
- Then:
  - WebSocket 메시지가 전송되지 않는다.
  - "답변을 입력해 주세요." 유효성 검사 메시지가 입력 영역 하단에 표시된다.

### AC8. 브라우저 탭 비활성화 복귀 시 소켓 상태 확인

- Given: 면접이 활성 진행 중(SUBSCRIBED, QUESTION, SUBMITTING 상태 중 하나)인 상황에서 사용자가 다른 탭 또는 다른 창으로 전환한 경우이다. FINISHED, ERROR, IDLE 상태에서는 이 AC의 재연결 흐름이 적용되지 않는다.
- When: `visibilitychange` 이벤트로 탭이 다시 활성화(foreground 진입)됨이 감지된다.
- Then:
  - 현재 STOMP 클라이언트의 연결 상태를 확인한다.
  - 연결이 살아 있으면 기존 상태를 유지하고 별도 동작을 수행하지 않는다.
  - SUBSCRIBED, QUESTION, SUBMITTING 상태에서 소켓이 끊긴 경우 AC6의 재연결 흐름을 시작한다(`RECONNECTING` 상태로 전이).
    <!-- TODO(impl): visibilitychange 복귀 시 stompjs heartbeat와 중복 연결 방지 플래그 필요 -->

---

## API 연동

> WebSocket STOMP 기반으로 동작하며, REST 엔드포인트는 OpenAPI 스펙에 등록되어 있지 않습니다.
> 아래는 이슈 기술 스펙 기준으로 작성하였으며, **백엔드 협의를 통해 확정 필요**합니다.

| AC    | 프로토콜        | 경로                                            | 송신 payload                                                 | 수신 메시지 타입                            |
| ----- | --------------- | ----------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------- |
| AC1   | STOMP CONNECT   | (서버 WS 주소)                                  | connectHeaders: `{ Authorization: "Bearer {token}" }`        | —                                           |
| AC1   | STOMP SEND      | `/app/interviews/start`                         | `{ "interview_type": "TECHNICAL" }`                          | `SESSION_STARTED`                           |
| AC2   | STOMP SUB       | `/user/queue/interviews`                        | —                                                            | `QUESTION_READY`                            |
| AC3   | STOMP SEND      | `/app/interviews/{interviewSessionId}/answers`  | `{ "question_code": "...", "sequence": N, "answer": "..." }` | `ANSWER_ACCEPTED`, `QUESTION_READY`         |
| AC3-a | STOMP SUB       | `/user/queue/interviews`                        | —                                                            | `INTERVIEW_FINISHED` (ANSWER_ACCEPTED 생략) |
| AC4   | STOMP SUB       | `/user/queue/interviews`                        | —                                                            | `INTERVIEW_FINISHED`                        |
| AC5   | STOMP ERROR     | —                                               | —                                                            | STOMP ERROR 프레임 (onStompError 콜백)      |
| AC5-a | STOMP ERROR     | —                                               | —                                                            | STOMP ERROR 프레임 (onStompError 콜백)      |
| AC6   | STOMP Reconnect | beforeConnect / onDisconnect 콜백으로 직접 구현 | —                                                            | —                                           |

### 인증

- STOMP CONNECT 프레임의 `connectHeaders`에 `Authorization: Bearer {token}` 포함
- 브라우저 WebSocket API는 HTTP 핸드셰이크에 커스텀 헤더를 주입할 수 없으므로, HTTP 수준 인증 헤더 방식은 사용 불가

### 메시지 타입 흐름

```
SESSION_STARTED → QUESTION_READY → (ANSWER_ACCEPTED → QUESTION_READY) × N → INTERVIEW_FINISHED

또는 마지막 답변 시:
SESSION_STARTED → QUESTION_READY → ... → ANSWER (제출) → INTERVIEW_FINISHED (ANSWER_ACCEPTED 생략 가능)
```

### 확인 필요 사항 (백엔드 협의)

- WebSocket 서버 엔드포인트 URL
- 각 메시지의 페이로드 스키마 (필드명, 타입) — 특히 `question_code`, `sequence` 필드명 확인
- `SESSION_STARTED` 메시지에 total(전체 질문 수) 필드 포함 여부
- `interviewSessionId` 발급 위치 (SESSION_STARTED 메시지 내 포함 여부)
- STOMP ERROR 프레임에서 인증 오류를 식별할 수 있는 headers/message 규약
- 재연결 시 세션 복구 가능 여부 및 재연결 성공 후 동작(이전 질문 재표시 vs 새 질문 대기)
- 면접 종료 후 결과 조회 REST API 존재 여부
- 마지막 답변 후 `ANSWER_ACCEPTED` 생략 여부 (INTERVIEW_FINISHED 직접 수신 여부)

---

## 컴포넌트 스펙

- 사용할 shadcn/ui 컴포넌트:
  - `Button` — 면접 시작 / 답변 제출
  - `Textarea` — 답변 입력
  - `Progress` — 질문 진행률 표시 (total 필드 제공 시에만 활성화)
  - `Badge` — 현재 상태(연결 중 / 질문 대기 / 재연결 중 / 종료) 표시
  - `Alert` / `AlertDescription` — 에러 메시지 및 재연결 배너
  - `Skeleton` — 질문 로딩 대기 상태

- 상태 관리:
  - Zustand 스토어(`useInterviewStore`)로 클라이언트 상태 머신 관리
  - 상태 열거형: `IDLE | CONNECTING | SUBSCRIBED | QUESTION | SUBMITTING | RECONNECTING | FINISHED | ERROR`
  - `interviewSessionId`, 현재 질문 텍스트, 질문 순서(sequence), 에러 메시지 관리
  - 중복 메시지 방어를 위해 마지막 수신 `interview_session_id + sequence` 조합을 상태로 유지

- 접근성 주의사항:
  - 질문 텍스트 수신 시 `aria-live="polite"` 영역으로 스크린 리더에 알림
  - 제출 버튼 비활성화 상태에 `aria-disabled`와 시각적 disabled 스타일 동시 적용
  - 재연결 배너에 `role="status"` 적용
  - 면접 완료 화면 전환 시 포커스를 결과 영역 헤딩으로 이동

---

## 구현 참고

### 클라이언트 상태 머신 전이

```
IDLE
 └─[시작 클릭]→ CONNECTING
                 ├─[연결 실패 / STOMP ERROR]→ ERROR → IDLE
                 └─[연결 성공 + 구독 완료]→ SUBSCRIBED
                                              ├─[소켓 끊김]→ RECONNECTING
                                              │              ├─[재연결 성공]→ 이전 상태 복구
                                              │              └─[3회 실패]→ ERROR
                                              └─[SESSION_STARTED]→ QUESTION
                                                                    ├─[소켓 끊김]→ RECONNECTING
                                                                    │              ├─[재연결 성공]→ 이전 상태 복구
                                                                    │              └─[3회 실패]→ ERROR
                                                                    ├─[QUESTION_READY]→ QUESTION
                                                                    └─[답변 제출]→ SUBMITTING
                                                                                   ├─[ANSWER_ACCEPTED]→ QUESTION
                                                                                   ├─[소켓 끊김]→ RECONNECTING
                                                                                   │              ├─[재연결 성공]→ 이전 상태 복구
                                                                                   │              └─[3회 실패]→ ERROR
                                                                                   ├─[STOMP ERROR]→ ERROR
                                                                                   └─[INTERVIEW_FINISHED]→ FINISHED
```

### 사용 라이브러리

- `@stomp/stompjs` — STOMP over WebSocket 클라이언트
  - 인증: `new Client({ connectHeaders: { Authorization: "Bearer {token}" } })`
  - 재연결: `reconnectDelay` 기본값은 단순 고정 간격이므로, 지수 백오프는 `beforeConnect` / `onDisconnect` 콜백에서 직접 구현
