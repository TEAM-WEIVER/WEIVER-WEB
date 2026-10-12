# [#119] AI 면접 답변 녹음 업로드 STT 연동

> **상태: 기획 확정 (Round 5 + Claude 재검증 PASS) (2026-10-12)** — `docs/reviews/us-#119-round5.md`, `docs/reviews/us-#119-round5-verify.md`. Round 4 PASS 뒤 사용자 결정을 반영해 개정했고, Round 5 집중 리뷰에서 Major 1건(녹음기 `cancel()` 호출 시점 충돌)과 Minor 6건이 나와 이번 개정에 반영했다. 이후 Claude 단독 재검증에서 PASS(C0/M0/m3)를 받았고 Minor 3건도 반영했다. 사용자 결정에 따라 텍스트 답변 폴백은 없다. 답변은 **녹음으로만** 할 수 있고, **마이크 권한과 녹음 지원은 면접 시작의 전제 조건**이다(시작 화면에서 확인). 백엔드 API 스펙이 확정되어 `question_code`/`sequence` 전송 방식(쿼리 파라미터)과 허용 MIME이 정해졌다. **개발 착수 전 필수 확인 항목은 없다.** 남은 확인 필요 항목은 모두 프론트가 방어적으로 대비했다.

## User Story

US1: 지원자로서, AI 면접 질문에 말로 답변하면 녹음된 음성이 서버에서 정확하게 텍스트로 변환되기를 원한다. 왜냐하면 브라우저 내장 음성 인식(`SpeechRecognition`)은 브라우저마다 지원 여부가 다르고(Firefox 미지원 등) 기술 용어 인식 정확도가 낮아, 내 답변이 왜곡된 채로 평가될 수 있기 때문이다.

US2: 지원자로서, 녹음 업로드가 실패하면 무엇을 해야 하는지(다시 제출, 다시 녹음) 안내받고 면접을 끝까지 이어가고 싶다. 또 면접을 시작하기 전에 마이크가 준비되었는지 확인받고 싶다. 왜냐하면 면접은 중간에 중단할 수 없는 구조라서, 오류 때문에 면접 기회를 잃으면 안 되기 때문이다.

---

## Acceptance Criteria

### 용어 및 공통 규칙

> **답변 경로** — 이 기능을 적용한 뒤 지원자의 답변 경로는 **녹음 업로드(REST) 하나뿐**이다. 텍스트 답변 입력 UI는 없다. 업로드가 실패하면 같은 녹음을 다시 제출하거나 다시 녹음한다.
>
> - **마이크 권한·녹음 지원은 면접 시작 전제 조건이다.** 시작 화면(`interview-start-screen.tsx`)에서 마이크 권한을 얻지 못했거나 브라우저가 녹음을 지원하지 않으면 면접을 시작할 수 없다(AC13). 질문 화면에는 마이크 거부용 대체 답변 흐름을 두지 않는다. 면접 도중 권한이 철회되거나 장치가 사라져 녹음을 시작하지 못하는 경우에만 최소 안내 + "다시 시도"를 보여준다(AC13).
> - `use-interview-websocket.ts`의 기존 STOMP 텍스트 publish 코드(`submitAnswer`, `/app/interviews/{interviewSessionId}/answers`)는 **이번 범위에서 코드를 건드리지 않고 그대로 둔다.** 다만 UI(page·질문 화면·업로드 훅)는 더 이상 이 함수를 호출하지 않는다. 제거 여부는 별도 이슈에서 다룬다(향후 고려사항).
> - STOMP 구독(`QUESTION_READY`, `INTERVIEW_FINISHED`, `ANSWER_ACCEPTED` 수신)과 재연결 인프라는 그대로 쓴다.
>
> **질문 키** — 질문 하나를 식별하는 값. `interviewSessionId` + `question_code` + `sequence` 조합이다(문자열 `{interviewSessionId}:{question_code}:{sequence}`). store `lastReceivedKey`(`sessionId:sequence`)에 `question_code`를 더한 기준이다. `sequence`만으로 비교하지 않는다. 면접을 `reset()` 후 다시 시작하면 새 세션도 `sequence` 1부터 시작하기 때문이다.
>
> **답변 수락 키(`answerAcceptedKey`)** — store 필드. `setAnswerAccepted`(STOMP `ANSWER_ACCEPTED`) 또는 `setAudioAnswerAccepted`(업로드 200 / 409 NOT_READY)가 **실제로 `SUBSCRIBED`로 전이했을 때만** 그 시점의 현재 질문 키를 기록한다. 가드에 걸려 no-op이면 기록하지 않는다. `reset()` 시 `null`이 된다. 새 질문을 받으면 현재 질문 키가 바뀌므로 이전 값은 자연히 일치하지 않는다. "현재 질문의 답변이 수락되었다"는 판정은 store `status`가 아니라 **`answerAcceptedKey === 현재 질문 키`**로 한다. store `status`는 재연결 과정 등에서 `SUBSCRIBED`가 될 수 있어 수락 여부를 나타내지 않기 때문이다.
>
> **화면 상태(phase)** — 질문 하나 안에서 답변 영역이 가지는 상태. 모두 **질문 키 단위**로 관리하고, 질문 키가 바뀌면 `idle`로 초기화한다.
>
> | phase       | 소유자                   | 의미                                                                             | 액션 버튼                                          |
> | ----------- | ------------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------- |
> | `idle`      | 업로드 훅                | 녹음 준비 상태. 질문 TTS가 끝나면 "답변하기"를 누를 수 있다.                     | "답변하기"(녹음 시작 실패 안내 중이면 "다시 시도") |
> | `recording` | 화면(`useAudioRecorder`) | 녹음 중                                                                          | "제출하기"                                         |
> | `uploading` | 업로드 훅                | 처리 중 상태. 업로드 요청을 보내고 응답을 기다린다.                              | "제출 중..." (`disabled`)                          |
> | `retryable` | 업로드 훅                | 재제출 가능 상태. 녹음 Blob을 보관한 채 "다시 제출" 또는 "다시 녹음"을 기다린다. | "다시 제출"(주 버튼), "다시 녹음"(보조 버튼)       |
> | `waiting`   | 업로드 훅                | 다음 질문 준비 중 상태. `QUESTION_READY`/`INTERVIEW_FINISHED`를 기다린다.        | 모든 답변 액션 버튼 숨김 또는 `disabled`           |
>
> 면접 도중 녹음 시작 실패(AC13 (B))는 별도 phase가 아니다. 업로드 phase는 `idle` 그대로이고, 화면의 녹음기 로컬 상태(`hasRecorderStartError`)로 안내 문구와 "다시 시도" 버튼을 보여준다.
>
> **녹음기 `cancel()` 호출 시점** — 화면이 `useAudioRecorder.cancel()`(정지 + 트랙 해제 + 청크 폐기 + 경과 시간 `0:00`)을 호출하는 경우는 아래 세 가지뿐이다. **업로드 phase 변화를 감시하는 effect로 `cancel()`을 호출하지 않는다.** (단, 3번은 이 규칙의 명시적 예외로 `isWaitingNextQuestion` 기반 effect를 쓴다.)
>
> 1. AC5(너무 짧은 녹음) 판정 시.
> 2. AC6(400/413/422)으로 `uploading` → `idle`이 되었을 때. 업로드 훅이 반환한 결과가 `'rerecord-required'`인 경우에만, 그 결과를 받은 지점(제출·다시 제출 핸들러, 120초 자동 종료(`onAutoStop`) 업로드 경로)에서 명시적으로 호출한다(컴포넌트 스펙 "업로드 결과 반환"). 예: 자동 제출 후 400 `INTERVIEW_ANSWER_TOO_LONG`을 받으면 경과 시간이 `0:00`으로 돌아가고 `2:00`에 머물지 않는다(AC3).
> 3. 답변 수락 동기화로 `isWaitingNextQuestion`이 `true`가 되었을 때 녹음기가 `recording`인 경우. 이 경우만 **`isWaitingNextQuestion`을 감시하는 effect**로 처리하며, 위 "phase 감시 effect 금지"의 **명시적 예외**이다. 이 effect는 녹음기가 `recording`일 때만 `cancel()`을 호출하고, 그 밖의 녹음기 상태에서는 아무것도 하지 않는다. `uploadPhase` 값 자체(`idle` 복귀 등)를 감시하지 않는다.
>
> **구현 예외 (코드 리뷰 Round 1 반영)** — 위 세 경우 외에 다음 두 경우에도 녹음기를 정리한다. 둘 다 업로드 phase를 감시하지 않으므로 금지 규칙에 걸리지 않는다.
>
> - **질문 키가 바뀔 때 녹음기가 `idle`이 아니면 `cancel()`을 호출한다.** 이전 질문의 녹음·경과 시간을 버려 AC4("다음 질문으로 넘어가면 경과 시간 초기화")를 만족하기 위해 필요하다. 질문 키 변경을 감시하는 effect로 처리한다.
> - **녹음 중 녹음이 예상치 않게 끊기면**(마이크 분리·권한 철회로 트랙 `ended`, `MediaRecorder` `error`/`stop`) 녹음 훅이 스스로 정리하고 `idle`로 돌아간 뒤 `onInterrupted`로 알린다. 화면은 AC13 (B) 안내와 "다시 시도"를 보여준다. "제출하기" 시 `stop()`이 `null`을 반환한 경우(이미 끊긴 녹음)도 화면이 `cancel()` 후 같은 안내를 보여준다.
>
> **`retryable` → `idle`("다시 녹음") 전이에서는 `cancel()`을 호출하지 않는다.** "다시 녹음"은 `discardAndRerecord()`로 phase를 `idle`로 바꾼 직후 화면이 비동기 `recorder.start()`를 실행하므로, 이 전이에 `cancel()`을 걸면 막 시작된 새 녹음을 끊을 수 있다. 새 녹음의 경과 시간은 `start()`가 `0:00`부터 시작한다.
>
> **화면 표시 우선순위** — store 상태와 로컬 phase가 서로 다른 화면을 가리키면 **위에 있는 행이 이긴다**. `RECONNECTING`은 이 순위에 영향을 주지 않는다(page의 재연결 배너만 위에 덧붙는다).
>
> | 순위 | 조건                                                                                            | 표시                                                           |
> | ---- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
> | 1    | store `status`가 `FINISHED` 또는 `ERROR`                                                        | 기존 완료 화면 / 기존 오류 화면                                |
> | 2    | (store `status === 'SUBSCRIBED'`이고 `answerAcceptedKey === 현재 질문 키`) 또는 phase `waiting` | 다음 질문 준비 중 상태                                         |
> | 3    | phase `uploading`                                                                               | 처리 중 상태                                                   |
> | 4    | phase `retryable`                                                                               | 재제출 가능 상태                                               |
> | 5    | 화면 녹음기가 `recording`                                                                       | 녹음 중                                                        |
> | 6    | 그 외                                                                                           | `idle`(녹음 시작 실패 안내 중이면 AC13 (B) 안내 + "다시 시도") |
>
> - **답변 수락 시 동기화**(순위 2가 store 쪽 조건으로 이겼을 때)
>   - 트리거: store `answerAcceptedKey`가 현재 질문 키와 같아지는 순간이다. store `status`가 `SUBSCRIBED`로 바뀌었다는 사실만으로는 동기화하지 않는다(재연결 `onConnect` 등에서 생기는 `SUBSCRIBED`를 무시하기 위함).
>   - 대상 phase: `idle`(화면 녹음기가 `recording`인 경우 포함), `uploading`, `retryable`.
>   - 업로드 훅 동작: phase를 `waiting`으로 맞추고, 녹음 Blob을 버리고, 안내 메시지를 지운다. 진행 중인 업로드 요청은 abort하지 않지만, 그 요청 ID를 무효화하고 35초 deadline 타이머를 정리한다. 그 응답은 아래 "업로드 응답 적용 규칙"에 따라 무시된다.
>   - 화면 동작: `isWaitingNextQuestion`이 `true`가 되면, 녹음기가 `recording`이면 `recorder.cancel()`을 호출한다(업로드하지 않음, "녹음기 `cancel()` 호출 시점" 3 — phase 감시 effect 금지의 명시적 예외).
> - **재연결 상태 복구 규칙**: 웹소켓 훅의 `onConnect`는 재연결일 때 `SUBSCRIBED`를 거치지 않고 이전 상태(`prevStatus`, 없으면 `SUBSCRIBED`)로 **한 번에** 설정한다. 최초 연결일 때만 `SUBSCRIBED`로 설정한다. 위 동기화 트리거가 `answerAcceptedKey` 기준이라 일시적 `SUBSCRIBED`가 생겨도 동기화는 일어나지 않지만, 화면 깜빡임과 다른 구독자의 오동작을 막기 위해 두 규칙을 함께 둔다.
> - **검증 시나리오**(상태 충돌 — 테스트 필수)
>   1. HTTP 200보다 `ANSWER_ACCEPTED`가 먼저 옴: store `SUBSCRIBED`(`answerAcceptedKey` = 현재 질문 키) + phase `uploading` → 대기 화면. 뒤이어 온 200은 무시된다.
>   2. 35초 타임아웃으로 `retryable`이 된 뒤 서버 처리 결과로 `ANSWER_ACCEPTED`가 옴: `answerAcceptedKey` = 현재 질문 키 + phase `retryable` → 대기 화면, Blob 폐기.
>   3. 업로드 중 STOMP 끊김(`RECONNECTING`) 상태에서 200 수신: `setAudioAnswerAccepted`는 no-op(`answerAcceptedKey` 기록 안 됨)이지만 phase는 `waiting`. 재연결 후 `onConnect`가 store를 `QUESTION`으로 복구해도 phase `waiting`이 순위 2로 이겨 대기 화면이 유지된다.
>   4. phase `retryable`(Blob 보관)에서 STOMP가 끊겼다가 재연결이 끝남: store는 `RECONNECTING` → `QUESTION`으로 바로 복구되고 중간에 `SUBSCRIBED`를 거치지 않는다. `answerAcceptedKey`는 바뀌지 않는다. phase와 녹음 Blob이 그대로 유지되고 "다시 제출" / "다시 녹음"을 계속 쓸 수 있다.
>   5. phase `retryable`에서 "다시 녹음" 클릭: phase가 `idle`이 되고 새 녹음이 시작되어 녹음기가 `recording`을 유지한다. `cancel()`이 호출되지 않아 새 녹음이 끊기지 않는다("녹음기 `cancel()` 호출 시점").
>
> **액션 버튼 비활성 조건** — 모든 답변 액션은 REST 또는 로컬 동작이므로 STOMP 재연결(`RECONNECTING`)로 막지 않는다.
>
> | 버튼                         | 노출 phase                            | `disabled` 조건                                                                                                   |
> | ---------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
> | "답변하기"(녹음 시작)        | `idle`(녹음 시작 실패 안내가 없을 때) | 질문 TTS 재생 중(#118). `RECONNECTING`과 무관                                                                     |
> | "다시 시도"(AC13 (B))        | `idle`(녹음 시작 실패 안내 중)        | 질문 TTS 재생 중(#118). `RECONNECTING`과 무관                                                                     |
> | "제출하기"(녹음 종료·업로드) | `recording`                           | 없음(누르면 즉시 `uploading`으로 바뀜). `RECONNECTING`과 무관                                                     |
> | "다시 제출"                  | `retryable`                           | 없음(누르면 즉시 `uploading`으로 바뀜). `RECONNECTING`과 무관                                                     |
> | "다시 녹음"                  | `retryable`                           | 질문 TTS 재생 중(#118). `RECONNECTING`과 무관                                                                     |
> | "다시 듣기"                  | `idle`, `retryable`                   | 기존 #118 조건(노출 조건·TTS 재생 중 `disabled` 등)을 그대로 따른다. `recording`/`uploading`/`waiting`에서는 숨김 |
>
> **처리 중 상태(`uploading`) 공통 표시**: "답변을 처리하고 있어요..." 문구(`role="status"`)와 스피너를 보여준다. 액션 버튼 라벨은 "제출 중..."이고 `disabled` + `aria-busy="true"`이다. 이 상태에서는 녹음 시작·다시 듣기·다시 제출·다시 녹음을 할 수 없고, 추가 `submit()`/`resubmit()` 호출은 무시된다.
>
> **재제출 가능 상태(`retryable`) 공통 규칙**: 녹음 Blob을 유지하고, 해당 AC의 안내 문구(`role="alert"`)와 "다시 제출"(주 버튼)·"다시 녹음"(보조 버튼)을 보여준다.
>
> - "다시 제출"은 바로 활성화된다. 누르면 **같은 Blob**으로 AC2와 같은 업로드 요청을 다시 보내고, 즉시 처리 중 상태로 바뀌므로 중복 클릭이 막힌다. 횟수 제한은 없다.
> - "다시 녹음"을 누르면 업로드 훅 `discardAndRerecord()`가 녹음 Blob을 버리고 안내 메시지를 지운 뒤 phase를 `idle`로 바꾸고, 화면은 이어서 AC1의 녹음 시작 흐름을 실행한다(같은 질문에서 새로 녹음). 녹음 시작에 실패하면 AC13 (B)를 따른다. **이 `retryable` → `idle` 전이에서는 `recorder.cancel()`을 호출하지 않는다**("녹음기 `cancel()` 호출 시점", 검증 시나리오 5).
> - "다시 듣기"는 #118 조건대로 노출된다(액션 버튼 비활성 조건 표).
>
> **다음 질문 준비 중 상태(`waiting`) 공통 표시**: 질문 화면을 그대로 두고 답변 영역에 "다음 질문을 준비하고 있어요." 문구(`role="status"`)와 스피너를 보여준다. "답변하기"/"제출하기"/"다시 듣기"/"다시 제출"/"다시 녹음" 버튼은 노출하지 않거나 `disabled`이다. "오류가 있어요" 버튼은 계속 쓸 수 있다. 표시 조건은 화면 표시 우선순위 2행이다.
>
> **안내 메시지 지우는 시점**: 업로드·녹음 관련 안내(`role="alert"`)는 "답변하기", "다시 시도", "다시 제출", "다시 녹음" 중 하나를 누를 때, 그리고 질문 키가 바뀔 때 지운다. phase가 바뀌어 새 안내가 생기면 새 안내로 바뀐다.
>
> **업로드 요청 규칙**
>
> - `submit()`/`resubmit()`을 호출할 때마다 **새 요청 ID, 새 `AbortController`, 새 35초 deadline 타이머**를 만든다. 이전 것을 재사용하지 않는다. 요청 ID에는 요청 시점의 질문 키를 묶어 둔다.
> - **35초 deadline은 업로드 훅이 소유한다.** `apiRequest` 호출 하나가 내부에서 수행하는 전체 체인(CSRF 토큰 조회 → 업로드 → 401이면 토큰 재발급 → 재시도)을 덮는다. deadline 판정은 `apiRequest`의 promise가 끝나기를 기다리지 않는다.
> - deadline이 만료되면(그 요청이 최신 요청이고 phase가 `uploading`일 때) **즉시** 아래를 수행한다.
>   1. 요청 ID를 무효화한다. 이후 이 요청에서 오는 응답·오류(인증 실패 포함)는 모두 무시된다.
>   2. 그 요청의 `AbortController.abort()`를 호출한다.
>   3. phase를 `retryable`로 바꾸고 AC10의 안내 문구를 표시한다.
> - `signal`은 업로드 `fetch`와 401 후 재시도 `fetch`에 함께 전달된다(현재 `apiRequest`는 `...options`로 재시도 `fetch`에도 같은 `signal`을 넘긴다, `api-client.ts:239-245`).
> - **공유 promise는 abort하지 않는다.** 토큰 재발급(`accessTokenReissuePromise`)과 CSRF 조회(`csrfTokenPromise`)는 여러 호출자가 같은 promise를 기다리므로, 업로드 요청 하나의 deadline 만료로 취소하지 않는다. 이 promise들은 백그라운드에서 계속 진행되고, 재발급이 성공하면 새 토큰이 저장되어 다음 "다시 제출"에 쓰인다. 이번 범위에서 `api-client`의 CSRF·재발급 경로에 `signal`을 추가하지 않는다.
> - deadline 안에 응답(성공·오류)이 오면 deadline 타이머를 정리한다.
>
> **업로드 응답 적용 규칙**: 응답(성공·오류)이 도착했을 때 아래 중 하나라도 해당하면 결과를 **조용히 무시한다**(문구 표시나 상태 전이 없음, AC7 `finishInterview`·AC12 로그인 이동도 하지 않음). 무시한 경우 업로드 결과는 `'none'`이다(AC6의 `cancel()`도 일어나지 않는다).
>
> - 요청 ID가 가장 최근 요청이 아니거나 무효화되었다(deadline 만료, 답변 수락 동기화 등).
> - store의 현재 질문 키가 요청 시점의 질문 키와 다르다(이미 STOMP로 다음 질문을 받음).
> - store `status`가 `FINISHED`, `ERROR`, `IDLE` 중 하나이다(완료 화면·오류 화면·`reset()` 이후).
> - phase가 `uploading`이 아니다(예: 화면 표시 우선순위 2로 이미 `waiting`이 됨).
>
> **업로드 오류 판정 순서**(단일 기준): HTTP 상태를 먼저 보고, errorCode(`ApiError.apiStatus`)는 400·409 안에서 세분화할 때만 쓴다.
>
> 1. 응답 없음(클라이언트 deadline 만료, `AbortError`, 네트워크 `TypeError`) → AC10
> 2. 인증 실패(재시도 후 최종 상태 401, 또는 토큰 재발급 실패 `ApiError`) → AC12
> 3. 400 / 413 / 422 → AC6
> 4. 409 → AC7
> 5. 429 → AC8 (errorCode 무관)
> 6. 502 → AC9 (errorCode 무관, 본문 없는 인프라 502 포함)
> 7. 그 외 모든 HTTP 오류(403, 404, 500, 503, 504, 기타 4xx/5xx) → AC11

### AC1. 녹음 시작 — 브라우저별 녹음 포맷 선택

- Given: 시작 화면에서 마이크 권한과 녹음 지원 확인(AC13 (A))을 통과해 면접을 시작했다. 질문 TTS 재생이 끝나 `idle` 상태이다.
  - TTS 재생 중(최초 재생·"다시 듣기" 재생 모두)에는 "답변하기"가 `disabled`이다(#118 동작 유지).
  - STOMP가 재연결 중(`RECONNECTING`)이어도 "답변하기"는 활성화되어 있다.
- When: "답변하기" 버튼을 클릭한다(AC13 (B)의 "다시 시도", `retryable`의 "다시 녹음"도 같은 녹음 시작 흐름을 쓴다).
- Then:
  - 이전 안내 메시지를 지운다.
  - 방어적 정리로 질문 오디오(`HTMLAudioElement.pause()`, `speechSynthesis.cancel()`)를 멈춘다.
  - `navigator.mediaDevices.getUserMedia({ audio: true })`로 오디오 스트림을 얻는다. 카메라 스트림과는 별개로 관리한다. (권한은 시작 화면에서 이미 허용되었으므로 보통 프롬프트 없이 바로 얻는다.)
  - 녹음 MIME 타입은 `getSupportedAudioMimeType()`(내부적으로 `MediaRecorder.isTypeSupported()`)으로 확인해, 아래 우선순위에서 처음 지원되는 값을 쓴다. 모두 서버 허용 형식(`audio/webm`, `audio/ogg`, `audio/mp4`)에 속한다.
    1. `audio/webm;codecs=opus`
    2. `audio/webm`
    3. `audio/ogg;codecs=opus`
    4. `audio/mp4` (Safari)
  - `MediaRecorder` 녹음을 시작하고 phase가 `recording`이 된다. 경과 시간은 `0:00`부터 센다.
  - 녹음 중 표시(`role="status"`, "지원자님이 답변을 하고 있어요.")와 경과 시간(예: `0:12 / 2:00`)이 보인다.
  - 액션 버튼 문구가 "제출하기"로 바뀌고 "다시 듣기" 버튼은 숨겨진다.

### AC2. 수동 녹음 종료 및 업로드 성공 (200)

- Given: `recording` 상태이고 녹음 경과 시간이 1초 이상이다.
- When: 지원자가 "제출하기" 버튼을 클릭한다(STOMP `RECONNECTING` 여부와 무관).
- Then:
  - `MediaRecorder.stop()`을 호출하고, `onstop` 이후 모은 청크를 `Blob` 하나로 합친다. 오디오 스트림의 모든 트랙을 `stop()`해 마이크를 해제한다.
  - 업로드용 `File`을 `new File([blob], 파일명, { type: 기본 MIME })`로 만든다.
    - 기본 MIME은 `;codecs=...` 파라미터를 뺀 값이다(`audio/webm` / `audio/ogg` / `audio/mp4`). 서버 허용 목록과 같다.
    - 파일명은 `answer.webm` / `answer.ogg` / `answer.mp4`이다.
  - phase가 `uploading`이 되고 처리 중 상태 공통 표시가 나온다. store `status`는 바꾸지 않는다(`QUESTION` 유지).
  - `POST /api/interviews/{interviewSessionId}/answers/audio?question_code={currentQuestionCode}&sequence={currentSequence}` 요청을 `multipart/form-data`로 보낸다.
    - `question_code`, `sequence`는 **쿼리 파라미터**로 보낸다(OpenAPI 파라미터 정의 `in: query` 기준). `FormData`에는 넣지 않는다.
    - `FormData`의 `file` 필드에 위 `File`을 담는다.
    - `Content-Type` 헤더는 직접 지정하지 않는다(브라우저가 boundary를 자동 설정).
    - `Authorization: Bearer {accessToken}`, `X-XSRF-TOKEN`은 `apiRequest` 공통 처리로 붙는다.
    - 이 요청을 위해 새로 만든 `AbortController`의 `signal`을 넘기고, 업로드 훅이 35초 deadline을 시작한다(업로드 요청 규칙).
  - 200 응답을 받으면 (업로드 응답 적용 규칙을 통과한 경우) 다음을 수행한다.
    - 녹음 Blob을 버리고 phase를 `waiting`으로 바꾼다.
    - store의 `setAudioAnswerAccepted({ sessionId, questionCode, sequence })`(요청 시점의 질문 키)를 호출한다. 이 액션은 질문 키가 store의 현재 질문 키와 같고 `status`가 `QUESTION` 또는 `SUBMITTING`일 때만 `SUBSCRIBED`로 바꾸고 `answerAcceptedKey`를 기록한다. 그 밖에는 아무것도 하지 않는다.
    - store가 `RECONNECTING`이면 이 호출은 no-op이지만 phase는 `waiting`으로 바뀐다. 재연결 후 store가 `QUESTION`으로 복구되어도 화면 표시 우선순위 2에 따라 대기 화면이 유지된다(검증 시나리오 3).
    - 다음 질문 준비 중 상태 공통 표시가 나온다.
  - 응답에 인식된 텍스트가 없으므로 답변 텍스트는 화면에 표시하지 않는다. 응답 `data`(`status: "WAITING_FOR_QUESTION"` 등)는 화면 전이에 쓰지 않는다(요청 시점의 질문 키를 기준으로 한다).

### AC3. 120초 자동 종료 후 업로드

- Given: `recording` 상태이다.
- When: 녹음 경과 시간이 120초에 도달한다.
- Then:
  - 녹음이 자동으로 끝나고(`MediaRecorder.stop()` + 트랙 해제), 사용자 조작 없이 AC2와 같은 업로드 흐름이 실행된다.
  - 자동 종료와 수동 "제출하기"가 겹쳐도 업로드는 한 번만 나간다. `useAudioRecorder.stop()`은 `MediaRecorder.state === 'recording'`일 때만 동작하고 그 밖에는 무시한다. phase가 `uploading`이 된 뒤의 추가 `submit()`도 무시한다.
  - "답변 시간(2분)이 끝나 자동으로 제출했어요." 안내가 `role="status"`로 표시된다. 이 안내는 `uploading` 동안 보이고 phase가 바뀌면 사라진다.
  - 200 응답이면 AC2와 같이 다음 질문 준비 중 상태로 바뀐다. 오류 응답이면 오류 판정 순서를 따른다.
  - 자동 종료(`onAutoStop`) 업로드 경로도 수동 제출과 같이 `onSubmitAudio`의 `UploadResult`를 받는다. 결과가 `'rerecord-required'`이면(예: 자동 제출 후 400 `INTERVIEW_ANSWER_TOO_LONG`) 화면이 `recorder.cancel()`을 명시적으로 호출해 경과 시간을 `0:00`으로 되돌린다. 경과 시간이 `2:00`에 머물지 않는다("녹음기 `cancel()` 호출 시점" 2, AC6).

### AC4. 다음 질문 / 면접 완료 / 답변 수락 수신 — STOMP 도착 순서 무관

- Given: 녹음 답변을 제출했다. phase가 `uploading`, `retryable` 또는 `waiting`이다(store는 `QUESTION`, `RECONNECTING` 또는 `SUBSCRIBED`).
- When: STOMP `/user/queue/interviews`로 `QUESTION_READY`(다음 sequence), `INTERVIEW_FINISHED`, `ANSWER_ACCEPTED` 중 하나가 도착한다. HTTP 200보다 먼저 도착할 수도 있다.
- Then:
  - `QUESTION_READY`: 기존 흐름(#44 AC2, #118)대로 새 질문 텍스트가 표시되고 질문 TTS가 재생된다. 질문 키가 바뀌므로 phase는 `idle`로 초기화되고, 이전 질문의 녹음 Blob·경과 시간·안내 메시지·녹음 시작 실패 안내도 초기화된다. 이후 이전 질문의 업로드 응답이 오면 응답 적용 규칙에 따라 무시한다.
  - `INTERVIEW_FINISHED`: 기존 면접 완료 화면(`FINISHED`)으로 바뀐다. 이후 도착하는 업로드 응답은 무시한다.
  - `ANSWER_ACCEPTED`: 핸들러는 `setAnswerAccepted({ sessionId: payload.interview_session_id, questionCode: payload.question_code, sequence: payload.sequence })`를 호출한다. 이 액션은 아래를 모두 만족할 때만 `SUBSCRIBED`로 바꾸고 `answerAcceptedKey`에 현재 질문 키를 기록한다. 그 밖에는 아무것도 하지 않는다.
    - `sessionId`가 store `interviewSessionId`와 같다.
    - `questionCode`가 `null`이 아니면 `currentQuestionCode`와 같다.
    - `sequence`가 `null`이 아니면 `currentSequence`와 같다.
    - `status`가 `QUESTION` 또는 `SUBMITTING`이다.
    - 이전 질문의 `ANSWER_ACCEPTED`가 다음 질문의 `QUESTION_READY`보다 늦게 오면(`sequence < currentSequence`) 무시되어, 새 질문 화면은 그대로 유지된다.
    - `answerAcceptedKey`가 현재 질문 키가 되면 화면 표시 우선순위 2에 따라 대기 화면이 나오고, 업로드 훅은 "답변 수락 시 동기화"에 따라 phase를 `waiting`으로 맞춘다.
    - 오디오 경로에서 이 메시지가 발행되든 안 되든 화면은 같게 동작한다.

### AC5. 너무 짧은 녹음 프론트 차단

- Given: `recording` 상태이다.
- When: 아래 중 하나에 해당한다.
  - (a) 녹음 경과 시간이 1초 미만일 때 "제출하기"를 클릭했다(클릭 시점에 판정).
  - (b) 녹음 종료(`onstop`) 후 만들어진 최종 Blob 크기가 0바이트이다.
- Then:
  - `useAudioRecorder.cancel()`로 진행 중인 `MediaRecorder`를 멈추고, 오디오 스트림의 모든 트랙을 `stop()`해 마이크를 해제하고, 모은 청크와 Blob을 버리고, 경과 시간을 `0:00`으로 되돌린다("녹음기 `cancel()` 호출 시점" 1).
  - 업로드 요청을 보내지 않는다.
  - "답변이 너무 짧아요. 다시 녹음해 주세요." 메시지가 `role="alert"`로 표시된다.
  - 녹음기 상태가 `idle`로 돌아가고(업로드 phase는 `idle`을 유지한다 — 녹음 상태는 화면 소유이며 업로드 훅은 호출되지 않는다) 같은 질문을 다시 녹음할 수 있다. 다음 녹음은 새 스트림으로 시작한다.

### AC6. 다시 녹음이 필요한 오류 — 400 / 413 / 422

- Given: `uploading` 상태이다.
- When: 서버가 400, 413, 422 중 하나로 응답한다.
- Then:
  - 녹음 Blob을 버리고 phase가 `idle`로 돌아간다(같은 질문에서 "답변하기"로 다시 녹음 가능).
  - 업로드 훅은 이 전이를 적용한 경우에만 업로드 결과 `'rerecord-required'`를 반환한다. 화면은 이 결과를 받은 제출(또는 다시 제출, 120초 자동 종료 업로드) 핸들러에서 **명시적으로** `useAudioRecorder.cancel()`을 호출해 녹음기 상태와 경과 시간을 `0:00`으로 되돌린다("녹음기 `cancel()` 호출 시점" 2). phase 변화 감시 effect로 처리하지 않는다.
  - 아래 문구가 `role="alert"`로 표시된다. errorCode가 없거나 표에 없는 값이면 HTTP 상태 기준 기본 문구를 쓴다.

  | 상태 | errorCode                                            | 서버 의미                    | 안내 문구                                                              |
  | ---- | ---------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------- |
  | 400  | `INTERVIEW_ANSWER_TOO_LONG`                          | 녹음이 120초(+여유 5초) 초과 | "답변은 최대 2분까지 가능해요. 2분 안으로 다시 녹음해 주세요."         |
  | 400  | `INTERVIEW_ANSWER_AUDIO_INVALID` / 그 외·없음 (기본) | 빈 파일 또는 허용 외 형식    | "녹음 파일을 처리할 수 없어요. 다시 녹음해 주세요."                    |
  | 413  | `INTERVIEW_ANSWER_AUDIO_TOO_LARGE` / 무관 (기본)     | 10MB 초과                    | "녹음 파일이 너무 커요(최대 10MB). 조금 더 짧게 다시 녹음해 주세요."   |
  | 422  | `INTERVIEW_ANSWER_NOT_RECOGNIZED` / 무관 (기본)      | 음성 인식 안 됨(재녹음 안내) | "음성이 인식되지 않았어요. 조용한 곳에서 또렷하게 다시 녹음해 주세요." |
  - 무음·잡음 녹음은 서버의 422로 걸러져, 잘못된 텍스트가 답변으로 저장되지 않는다(프론트는 AC5의 최소 길이 차단만 한다).

### AC7. 상태 충돌 오류 — 409

- Given: `uploading` 상태이다.
- When: 서버가 409로 응답한다.
- Then:
  - `INTERVIEW_ALREADY_COMPLETED`: 녹음 Blob을 버리고, page가 주입한 `finishInterview(interviewSessionId)`를 호출한다. 이 함수는 `setFinished` 호출과 `disconnect()`(종료 플래그 설정, 재연결 타이머 정리, STOMP `deactivate()`)를 수행하고, 화면은 면접 완료 화면(`FINISHED`)으로 바뀐다. 완료 화면의 분석 요청에 필요하므로 `interviewSessionId`는 유지한다. store가 이미 `ERROR`/`IDLE`이면 업로드 응답 적용 규칙에 따라 이 처리를 하지 않는다(오류 화면을 완료 화면으로 바꾸지 않음).
  - `INTERVIEW_QUESTION_NOT_READY` 또는 errorCode가 없거나 알 수 없는 409: 재시도하지 않는다. 녹음 Blob을 버리고 AC2의 200 처리와 같이 phase를 `waiting`으로 바꾸고 `setAudioAnswerAccepted({ sessionId, questionCode, sequence })`를 호출한다. 이후 STOMP 메시지를 기다린다(AC4).

### AC8. 음성 인식 제공자 한도 초과 — 429

- Given: `uploading` 상태이다.
- When: 서버가 429로 응답한다(`SPEECH_PROVIDER_RATE_LIMITED` 여부와 무관).
- Then:
  - 자동 재시도하지 않는다.
  - phase가 `retryable`이 되고 "요청이 많아 처리하지 못했어요. 잠시 후 다시 제출해 주세요." 안내가 `role="alert"`로 표시된다.
  - 재제출 가능 상태 공통 규칙을 따른다("다시 제출" 버튼 즉시 활성화, 카운트다운 없음, `RECONNECTING`이어도 활성, 클릭 시 같은 Blob과 새 `AbortController`로 재업로드, "다시 녹음"도 가능).

### AC9. 음성 변환 실패 — 502

- Given: `uploading` 상태이다.
- When: 서버가 502로 응답한다(`SPEECH_TRANSCRIPTION_FAILED` 여부와 무관하며, 본문 없는 인프라 502도 포함).
- Then:
  - 자동 재시도하지 않는다.
  - phase가 `retryable`이 되고 "음성 변환에 실패했어요. 다시 제출해 주세요. 계속 실패하면 다시 녹음해 주세요." 안내가 `role="alert"`로 표시된다.
  - 재제출 가능 상태 공통 규칙을 따른다. "다시 제출"은 **같은 Blob**으로 재업로드하고, "다시 녹음"은 Blob을 버리고 같은 질문에서 새로 녹음한다.
  - 502가 몇 번 반복되어도 같은 동작을 한다(연속 실패 횟수를 세지 않으며, 다른 답변 방식으로 전환하지 않는다).

### AC10. 클라이언트 타임아웃 및 네트워크 오류

- Given: `uploading` 상태이다.
- When: 아래 중 하나에 해당한다.
  - 업로드 훅의 35초 deadline이 만료되었다. 업로드 응답 대기뿐 아니라 CSRF 조회, 401 후 토큰 재발급 대기, 재시도 응답 대기 중 어느 단계에서 만료되어도 같다.
  - 네트워크 오류로 요청이 실패했다(`fetch` reject).
- Then:
  - deadline 만료이면 업로드 요청 규칙대로 **즉시**(진행 중인 재발급 등이 끝나기를 기다리지 않고) 요청 ID를 무효화하고 `abort()`한다. 공유 재발급·CSRF promise는 abort하지 않는다.
  - phase가 `retryable`이 된다. 업로드 시작부터 35초를 넘겨 `uploading`에 머물지 않는다.
  - "답변 전송에 실패했어요. 네트워크 상태를 확인한 뒤 다시 제출해 주세요." 안내가 `role="alert"`로 표시된다. 재제출 가능 상태 공통 규칙을 따른다.
  - "다시 제출"은 **새 요청 ID와 새 `AbortController`, 새 deadline**으로 요청한다. abort된 이전 `signal`을 재사용하지 않으므로 재제출 요청이 즉시 `AbortError`로 끝나지 않는다.
  - deadline 만료 뒤에 이전 요청의 결과(재발급 후 재시도 응답, 인증 실패 오류 등)가 도착하면 무효화된 요청이므로 무시한다.
  - 서버가 이미 처리를 마친 경우:
    - `ANSWER_ACCEPTED`가 오면 화면 표시 우선순위 2에 따라 대기 화면으로 바뀌고 Blob을 버린다(검증 시나리오 2).
    - 그 전에 재제출하면 409 `INTERVIEW_QUESTION_NOT_READY`를 받게 되고, AC7에 따라 다음 질문 준비 중 상태로 바뀐다.
  - **검증 시나리오(테스트 필수)**: 업로드가 401을 받고 토큰 재발급 응답이 35초 넘게 오지 않음 → 업로드 시작 후 35초에 phase `retryable` + 안내 표시. 이후 재발급이 끝나 재시도 결과(성공·오류)가 와도 화면이 바뀌지 않는다.

### AC11. 기타 서버 오류 — 5xx / 403 / 404 / 정의되지 않은 오류

- Given: `uploading` 상태이다.
- When: 서버가 오류 판정 순서 1~6에 해당하지 않는 HTTP 오류로 응답한다(예: 500, 503, 504, 403, 404).
- Then:
  - 자동 재시도하지 않는다. phase가 `retryable`이 되고 재제출 가능 상태 공통 규칙을 따른다.
  - 안내 문구(`role="alert"`)는 아래와 같다.

  | 상태                       | 안내 문구                                                                                          |
  | -------------------------- | -------------------------------------------------------------------------------------------------- |
  | 5xx (500, 503, 504 등)     | "서버에 일시적인 문제가 생겼어요. 잠시 후 다시 제출해 주세요."                                     |
  | 그 외 (403, 404, 기타 4xx) | "답변을 전송하지 못했어요. 다시 제출해 주시고, 계속 실패하면 '오류가 있어요' 버튼으로 알려주세요." |

### AC12. 인증 만료 — 401

- Given: 액세스 토큰이 만료된 상태에서 업로드 요청을 보냈다.
- When: 서버가 401로 응답한다.
- Then:
  - `apiRequest` 기본 동작대로 `/api/auth/reissue`로 토큰을 재발급받고, 같은 `FormData`(같은 Blob)로 업로드를 1회 재시도한다(`skipAuthRetry` 사용 안 함). 재발급 대기와 재시도는 업로드 훅의 35초 deadline 안에 들어간다. deadline이 먼저 만료되면 AC10으로 처리하고, 이후 도착하는 재시도 결과·인증 실패는 무시한다.
  - 재시도 응답은 오류 판정 순서에 따라 AC2, AC6~AC11대로 처리한다.
  - **인증 실패 판정**: 아래 중 하나에 해당하면 인증 실패로 본다. 메모리 토큰 값(`getAccessToken()`)으로는 판정하지 않는다(e2e는 메모리 토큰이 없는 채 localStorage 토큰을 쓰므로, 다른 오류가 인증 실패로 잘못 분류될 수 있다).
    - (a) 재시도 응답이 다시 401이다(`ApiError.status === 401`).
    - (b) 토큰 재발급에 실패했다. `api-client`가 재발급 실패 경로에서 던지는 `ApiError`에 `isReissueFailure = true`를 붙이고(또는 전용 서브클래스), 업로드 훅은 이 값으로 판정한다. 이 표시가 추가되기 전까지는 `error.message === 'Access token reissue failed'`로 판정한다.
  - 인증 실패이면 (업로드 응답 적용 규칙을 통과한 경우) 아래 순서로 처리한다.
    1. 녹음 Blob을 버린다.
    2. "로그인이 만료되었어요. 다시 로그인해 주세요." 안내를 전역 토스트(`toast.add({ type: 'error', ... })`)로 표시한다. 페이지를 벗어나도 보이게 하기 위함이다.
    3. page가 주입한 `disconnect()`를 호출한다. 종료 플래그를 세우고 재연결 타이머를 정리한 뒤 STOMP를 `deactivate()`하므로, 이후 `onWebSocketClose`가 재연결 타이머를 다시 걸지 않는다.
    4. store `reset()`을 호출한다.
    5. `router.replace('/login')`으로 이동한다(WebSocket 인증 오류 처리와 같은 목적지).

### AC13. 마이크 권한·녹음 지원은 면접 시작 전제 조건

#### (A) 시작 화면에서 확인 — 권한·지원이 없으면 면접을 시작할 수 없다

> 현재 `interview-start-screen.tsx`는 마운트 시 `getUserMedia({ audio: true })`로 마이크 권한을 확인해 `micStatus`(`checking`/`granted`/`denied`)와 "브라우저 설정에서 마이크 권한을 허용해주세요." 문구를 보여주지만, **"면접 시작하기" 버튼은 체크리스트 3개(`allChecked`)만으로 활성화되어 마이크가 거부되어도 면접을 시작할 수 있다.** 또 `MediaRecorder`·지원 MIME은 확인하지 않고, `navigator.mediaDevices`가 없으면 마이크·카메라 effect의 `getUserMedia` 호출에서 예외가 난다. 아래 AC대로 바꾼다.

- Given: 면접 시작 화면이다. 아래 두 경우 모두 해당한다.
  - store `IDLE`(또는 `CONNECTING`)의 시작 화면.
  - store `ERROR`의 오류 화면(오류 배너 + 시작 화면). 이 화면의 "면접 시작하기"는 `reset()`만 호출한다. store가 `IDLE`이 되면 page는 오류 화면 쪽 시작 화면을 내리고 `IDLE` 쪽 시작 화면을 새로 마운트하므로, **마이크 확인(`checking`부터)과 체크리스트(모두 해제)가 처음부터 다시 진행되고, 지원자는 확인을 마친 뒤 "면접 시작하기"를 한 번 더 누른다.** 이는 의도된 동작이다(오류 뒤에도 마이크 상태를 다시 확인한다).
- When: 시작 화면이 마이크 권한과 녹음 지원을 확인한다.
  - 녹음 지원 확인: `navigator.mediaDevices?.getUserMedia`와 `MediaRecorder`가 있고, `getSupportedAudioMimeType()`(AC1 우선순위)이 `null`이 아니다. 이 확인은 `getUserMedia` 호출 전에 동기적으로 한다.
  - 마이크 권한 확인: 기존처럼 `getUserMedia({ audio: true })`를 호출한다.
- Then:
  - 녹음을 지원하지 않으면 `micStatus`를 `unsupported`로 두고 `getUserMedia`를 호출하지 않는다. 마이크 카드에 "이 브라우저에서는 음성 답변을 녹음할 수 없어요. 최신 Chrome, Edge, Safari 또는 Firefox에서 접속해 주세요."를 표시한다.
  - 권한이 거부되거나 실패하면 `micStatus`는 기존대로 `denied`이고 "브라우저 설정에서 마이크 권한을 허용해주세요." 문구를 유지한다. 마이크 카드에 "다시 확인" 버튼을 두어, 누르면 `getUserMedia({ audio: true })`를 다시 호출해 상태를 갱신한다(설정에서 허용한 뒤 새로고침 없이 재확인). `NotFoundError`/`NotReadableError` 등 권한 외 실패도 이번 범위에서는 같은 `denied` 문구로 보여준다(오류 종류별 문구는 향후 고려사항).
  - 마이크 카드 표시
    - 상태 태그(`STATUS_TAG`)에 `unsupported: { label: '지원되지 않음', className: 'bg-slate-200 text-slate-600' }`를 추가한다. `checking`/`granted`/`denied`는 기존 값을 유지한다.
    - 마이크 테스트 영역은 `denied`와 `unsupported`일 때 음파 막대(`micBars`)와 "마이크에 대고 말해보세요" 문구 대신 경고 아이콘(`AlertCircle`)과 해당 상태 문구(`denied`: 권한 허용 안내 + "다시 확인", `unsupported`: 미지원 안내)를 보여준다. `checking`/`granted`는 기존 표시(음파 막대, `checking`이면 "마이크 권한 확인 중...")를 유지한다.
  - **"면접 시작하기"는 `allChecked && micStatus === 'granted'`일 때만 활성화된다.** 마이크가 `checking`/`denied`/`unsupported`이면 버튼은 `disabled`이다. 버튼 근처 사유 문구(`aria-describedby`로 버튼과 연결)는 상태별로 아래와 같다.
    - `checking`: "마이크 권한 확인 중..." (마이크 테스트 영역 문구와 같다. 권한 확인이 끝나기 전에 "허용해야 한다"는 문구를 미리 보여주지 않는다)
    - `denied`: "마이크 권한을 허용해야 면접을 시작할 수 있어요."
    - `unsupported`: "지원되는 브라우저에서 면접을 시작해 주세요."
    - `granted`: 사유 문구 없음(`aria-describedby` 제거)
  - 권한이 허용되면 기존 동작(음파 시각화, "정상 작동 중이예요" 태그)을 유지하고, 체크리스트를 모두 체크하면 면접을 시작할 수 있다.
  - **카메라 확인 effect도 같은 방식으로 가드한다.** `navigator.mediaDevices?.getUserMedia`가 없으면 `getUserMedia({ video: true })`를 호출하지 않고 `cameraStatus`를 `denied`로 둔다(예외로 화면이 깨지지 않게 함). 카메라 상태는 기존대로 "면접 시작하기" 활성 조건에 들어가지 않는다(카메라 게이트 규칙은 이번 범위에서 바꾸지 않음, 향후 고려사항).

#### (B) 면접 도중 녹음 시작 실패 — 최소 안내 + 다시 시도

- Given: 면접 중 질문 화면 `idle` 상태(또는 `retryable`에서 "다시 녹음"을 누른 직후)이다.
- When: "답변하기"(또는 "다시 녹음", "다시 시도")를 클릭했는데 `useAudioRecorder.start()`가 실패한다(면접 도중 권한 철회, 마이크 장치 분리·점유 등으로 `getUserMedia` 또는 `MediaRecorder` 시작이 실패).
- Then:
  - 녹음을 시작하지 않는다. 일부 얻은 스트림이 있으면 트랙을 `stop()`한다. 업로드 요청을 보내지 않고, 업로드 phase는 `idle`을 유지한다(업로드 훅은 호출되지 않는다).
  - 다른 답변 방식으로 전환하지 않는다. 녹음이 유일한 답변 방식이다.
  - 화면 로컬 `hasRecorderStartError`를 `true`로 두고 "마이크를 사용할 수 없어요. 마이크 연결과 브라우저 권한을 확인한 뒤 다시 시도해 주세요." 안내를 `role="alert"`로 표시한다. 오류 종류(`NotAllowedError`/`NotFoundError` 등)별 문구 구분은 하지 않는다(향후 고려사항).
  - "답변하기" 자리에 "다시 시도" 버튼이 보인다. 누르면 안내를 지우고 AC1의 녹음 시작 흐름을 다시 실행한다. 성공하면 AC1대로 녹음이 시작되고, 다시 실패하면 같은 안내를 다시 표시한다.
  - "다시 시도"는 질문 TTS 재생 중에만 `disabled`이고 `RECONNECTING`과 무관하다. "다시 듣기"는 #118 조건대로 노출된다. "오류가 있어요" 버튼은 계속 쓸 수 있다.
  - 질문 키가 바뀌면 `hasRecorderStartError`와 안내가 초기화된다.

### AC14. 기존 브라우저 STT 코드 제거

- Given: 구현을 마쳤다.
- When: 코드베이스를 확인한다.
- Then:
  - `interview-question-screen.tsx`에서 `SpeechRecognition` / `webkitSpeechRecognition` 관련 타입(`SpeechRecognitionLike` 등), `recognitionRef`, `onresult` 처리, `interimAnswer` 상태가 제거되어 있다.
  - `src/`, `e2e/` 및 테스트 코드 전체에서 `SpeechRecognition`을 검색하면 결과가 없다. 기존 e2e/단위 테스트의 `SpeechRecognition` 목은 `getUserMedia`/`MediaRecorder` 목으로 바뀌어 있다.
  - 질문 화면에 텍스트 답변 입력 UI(`Textarea` 등)가 없고, page·질문 화면·업로드 훅이 STOMP 텍스트 제출(`submitAnswer`)을 호출하지 않는다. `use-interview-websocket.ts`의 `submitAnswer` 정의 자체는 남아 있어도 된다.
  - 질문 TTS(`speechSynthesis` 폴백, #118)는 그대로 유지된다.

---

## API 연동

> OpenAPI 스펙(`https://api.piuda.site/v3/api-docs`)과 백엔드 확정 설명을 기준으로 한다. 스펙에는 200 응답만 스키마로 정의되어 있고, 오류 코드는 operation description에만 있다(오류 응답 본문 스키마 없음).

| AC                             | 프로토콜     | 메서드/경로                                                                                     | 요청                                                                              | 응답                                                                                                              |
| ------------------------------ | ------------ | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| AC2, AC3, AC8, AC9, AC10, AC11 | REST         | `POST /api/interviews/{interviewSessionId}/answers/audio?question_code={string}&sequence={int}` | `multipart/form-data`, `file` (binary, 필수, webm/ogg/mp4, 최대 10MB, 최대 120초) | 200 `ApiResponse<InterviewAnswerAudioResponseDTO>`                                                                |
| AC5                            | (클라이언트) | —                                                                                               | 1초 미만 또는 0바이트 녹음은 전송하지 않음                                        | —                                                                                                                 |
| AC6                            | REST         | 위와 동일                                                                                       | —                                                                                 | 400 `INTERVIEW_ANSWER_AUDIO_INVALID` / `INTERVIEW_ANSWER_TOO_LONG`, 413, 422                                      |
| AC7                            | REST         | 위와 동일                                                                                       | —                                                                                 | 409 `INTERVIEW_QUESTION_NOT_READY` / `INTERVIEW_ALREADY_COMPLETED`                                                |
| AC11                           | REST         | 위와 동일                                                                                       | —                                                                                 | 403 / 404 / 500 / 503 / 504 등 (스펙 미기재)                                                                      |
| AC12                           | REST         | `POST /api/auth/reissue` → 업로드 재시도                                                        | refresh 쿠키 + `X-XSRF-TOKEN`                                                     | `{ data: { accessToken } }`. 실패 시 `ApiError`(`isReissueFailure`). 업로드 35초 deadline 안에서만 반영           |
| AC4                            | STOMP SUB    | `/user/queue/interviews`                                                                        | —                                                                                 | `ANSWER_ACCEPTED`(`interview_session_id`·`question_code`·`sequence` 사용), `QUESTION_READY`, `INTERVIEW_FINISHED` |
| AC13                           | (브라우저)   | `navigator.mediaDevices.getUserMedia({ audio: true })`, `MediaRecorder.isTypeSupported()`       | —                                                                                 | (A) 시작 화면 권한·지원 확인 → 시작 버튼 게이트, (B) 도중 실패 시 안내 + "다시 시도". 서버 호출 없음              |

- STOMP SEND `/app/interviews/{interviewSessionId}/answers`(텍스트 답변)는 **이 기능에서 쓰지 않는다.** 스펙 설명상 서버는 이 경로를 계속 열어 두지만, 사용자 결정에 따라 UI에서 텍스트 답변을 제공하지 않는다. 웹소켓 훅의 기존 publish 코드는 수정하지 않고 남겨 둔다.

### 요청 상세

- 경로 파라미터: `interviewSessionId` (string, uuid, 필수)
- **쿼리 파라미터**: `question_code` (string, 필수, 예: `S_01_00`), `sequence` (int32, 필수, 예: `1`)
  - OpenAPI description 문구는 "multipart — file, question_code, sequence"라고 적었지만, 파라미터 정의는 `in: query`이다. **파라미터 정의를 따라 쿼리로 보낸다.** (Spring `@RequestParam`은 쿼리 문자열도 바인딩하므로 서버 구현과 충돌하지 않는다.) — 확인 필요 #1 해결.
- 본문: `multipart/form-data` — `file` (binary, 필수) 하나만 담는다.
  - 서버 허용 MIME: `audio/webm`, `audio/ogg`, `audio/mp4`. 최대 10MB, 최대 120초(서버는 +5초 여유).
  - `File.type`은 codecs 파라미터를 뺀 기본 MIME(`audio/webm` / `audio/ogg` / `audio/mp4`), 파일명은 `answer.{webm|ogg|mp4}`. — 확인 필요 #3 해결.
- 헤더: `Authorization: Bearer <token>`, `X-XSRF-TOKEN` (`Content-Type` 직접 지정 금지)
- 클라이언트 타임아웃: 35초 deadline. 업로드 훅이 소유하며, 요청(`submit`/`resubmit`)마다 새 요청 ID·`AbortController`·타이머를 만든다. CSRF 조회, 업로드, 401 후 재발급, 재시도까지 포함한 전체 시간이다. 만료되면 진행 중인 promise를 기다리지 않고 즉시 `retryable`로 바꾸고 요청 ID를 무효화한다. 공유 재발급·CSRF promise는 abort하지 않는다(업로드 요청 규칙).

### 200 응답 스키마

```json
{
  "status": "string",
  "code": 0,
  "data": {
    "interview_session_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "status": "WAITING_FOR_QUESTION",
    "question_code": "S_01_00",
    "sequence": 1
  },
  "message": "string"
}
```

```ts
// src/lib/interview-api.ts (신규 타입)
export interface InterviewAnswerAudioResponseDTO {
  interview_session_id: string; // uuid
  status: string; // 답변 반영 후 면접 세션 상태 (예: 'WAITING_FOR_QUESTION')
  question_code: string; // 예: 'S_01_00'
  sequence: number; // int32
}

// 응답 전체: ApiResponse<InterviewAnswerAudioResponseDTO>
// = { status: string; code: number; data: InterviewAnswerAudioResponseDTO; message: string }
```

- 인식된 텍스트(transcript)는 응답에 없다. 다음 질문은 기존처럼 STOMP `QUESTION_READY`로 온다.
- 프론트는 200 여부만 화면 전이에 쓰고, `data`의 값은 전이 판단에 쓰지 않는다(AC2).

### 오류 코드 및 화면 동작

> 화면 동작은 **HTTP 상태 기준**으로 정한다(AC 공통 규칙의 "업로드 오류 판정 순서"). errorCode는 400·409 안에서 세분화할 때만 쓰고, 없으면 기본 동작을 따른다.

| 상태                      | errorCode (백엔드 확정)                      | 의미                          | 화면 동작 (AC)                                                          |
| ------------------------- | -------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------- |
| 400                       | `INTERVIEW_ANSWER_AUDIO_INVALID` / 없음·기타 | 빈 파일 또는 허용 외 형식     | 재녹음 안내 (AC6, 400 기본 문구)                                        |
| 400                       | `INTERVIEW_ANSWER_TOO_LONG`                  | 녹음이 120초(+여유 5초) 초과  | 답변 시간 안내 후 재녹음 (AC6)                                          |
| 413                       | `INTERVIEW_ANSWER_AUDIO_TOO_LARGE`           | 10MB 초과                     | 파일 크기 안내 후 재녹음 (AC6)                                          |
| 409                       | `INTERVIEW_QUESTION_NOT_READY` / 없음·기타   | 현재 답변을 받을 수 없는 상태 | 재시도 없이 다음 질문 준비 중 (AC7)                                     |
| 409                       | `INTERVIEW_ALREADY_COMPLETED`                | 이미 완료된 면접              | `finishInterview` → 완료 화면 (AC7)                                     |
| 422                       | `INTERVIEW_ANSWER_NOT_RECOGNIZED`            | 음성 인식 안 됨               | 재녹음 안내 (AC6)                                                       |
| 429                       | `SPEECH_PROVIDER_RATE_LIMITED`               | 음성 인식 제공자 한도 초과    | 잠시 후 같은 Blob으로 다시 제출(또는 다시 녹음), 자동 재시도 없음 (AC8) |
| 502                       | `SPEECH_TRANSCRIPTION_FAILED` / 없음         | 음성 변환 실패, 인프라 502    | 같은 Blob으로 다시 제출(또는 다시 녹음), 횟수 제한·방식 전환 없음 (AC9) |
| 401                       | —                                            | 토큰 만료                     | 재발급 후 1회 재시도, 실패 시 `disconnect` → `/login` (AC12)            |
| 5xx·403·404·기타 (미기재) | —                                            | 정의되지 않은 오류            | 같은 Blob으로 다시 제출(또는 다시 녹음) (AC11)                          |
| (응답 없음)               | —                                            | deadline 만료·네트워크 오류   | 같은 Blob·새 `AbortController`로 다시 제출(또는 다시 녹음) (AC10)       |

- **errorCode 파싱(가정)**: 오류 응답 본문 스키마가 스펙에 없어 errorCode가 담기는 필드명이 확정되지 않았다. 현재 `src/lib/api-client.ts`의 `parseResponse`는 오류 본문에서 **`errorCode`(문자열)를 먼저**, 없으면 **`status`(문자열)**를 읽어 `ApiError.apiStatus`에 넣고, `code`는 **숫자일 때만** `ApiError.code`에 넣는다. 이 문서는 백엔드 errorCode가 **`errorCode` 또는 `status` 문자열 필드**로 온다고 가정하고 `ApiError.apiStatus`로 비교한다(성공 응답 envelope `{ status, code, data, message }`와 같은 모양이면 `status`에 들어온다고 본다).
  - 이 가정이 틀려도(예: 문자열 errorCode가 `code`에 옴, 본문이 JSON이 아님) `apiStatus`가 `undefined`가 될 뿐이고, HTTP 상태 기준 기본 동작으로 처리된다. 영향은 400 `INTERVIEW_ANSWER_TOO_LONG`의 전용 문구와 409 `INTERVIEW_ALREADY_COMPLETED`의 완료 화면 전환뿐이다(후자는 `waiting`으로 처리된 뒤 STOMP `INTERVIEW_FINISHED`로 보완 가능). 따라서 착수 차단 항목이 아니다(확인 필요 #2).
- 프론트는 `ApiError.status`(HTTP 상태)로 먼저 분기하고, 필요하면 `ApiError.apiStatus`로 세분화한다.
- 재발급 실패는 HTTP 상태와 별개로 `ApiError.isReissueFailure`로 먼저 식별한다(재발급 응답의 status가 401이 아닐 수 있다).

### 확인 필요 사항 (백엔드 협의)

> 아래 남은 항목은 모두 프론트가 어느 쪽 답이든 동작하도록 방어적으로 설계했다. **개발 착수 전 필수 항목은 없다.** 번호는 이전 라운드와의 대조를 위해 유지한다.

1. ~~`question_code`, `sequence`를 쿼리 파라미터로 보낼지 multipart 필드로 보낼지~~ — **해결**: OpenAPI 파라미터 정의(`in: query`)대로 쿼리 파라미터로 보낸다.
2. 오류 응답 본문의 errorCode 필드명(`errorCode` / `status` / `code`). 스펙에 오류 스키마가 없다. (프론트는 `errorCode` → `status` 문자열 순으로 읽고, 없으면 HTTP 상태 기준 기본 동작으로 대비했다 — 위 "errorCode 파싱(가정)".)
3. ~~서버가 허용하는 MIME 타입~~ — **해결**: `audio/webm`, `audio/ogg`, `audio/mp4` 허용. 프론트는 codecs 없는 기본 MIME으로 보낸다. (서버가 MIME을 `Content-Type`과 확장자 중 무엇으로 판별하는지는 미확정이지만 둘 다 일치시켜 보낸다.)
4. 오디오 업로드 경로에서도 STOMP `ANSWER_ACCEPTED`가 발행되는지. (프론트는 발행 여부와 상관없이 같은 화면으로 동작한다 — AC4.)
5. STOMP `QUESTION_READY` / `INTERVIEW_FINISHED`가 HTTP 200 응답보다 먼저 발행될 수 있는지. (프론트는 질문 키 일치 규칙과 화면 표시 우선순위로 대비했다 — AC4.)
6. 마지막 질문에 오디오로 답했을 때 STOMP `INTERVIEW_FINISHED`가 정상 발행되는지.
7. ~~오디오 실패 후 STOMP 텍스트 답변 허용 여부~~ — **해결(불필요)**: 사용자 결정으로 텍스트 답변 폴백을 쓰지 않는다.
8. 서버 처리 시간 상한. 클라이언트 deadline 35초가 충분한지.
9. 409에 `INTERVIEW_QUESTION_NOT_READY`, `INTERVIEW_ALREADY_COMPLETED` 외의 errorCode가 있는지. errorCode 없는 409가 올 수 있는지.
10. 403 / 404가 발생하는 조건(세션 소유자 불일치, 세션 없음 등)과, 그때 재제출이 의미가 있는지.
11. STOMP `ANSWER_ACCEPTED` payload에 `sequence`(와 `question_code`)가 **항상** 들어오는지. (프론트 방어: `sequence`/`question_code`가 `null`이면 해당 비교를 생략하고 세션 ID와 상태 조건만 본다. 이 경우 늦게 온 이전 질문의 메시지를 막지 못하므로, 항상 포함되기를 요청한다 — AC4.)
12. 같은 Blob 재제출의 서버 멱등성: 타임아웃(AC10) 후 서버가 이미 처리한 답변을 다시 제출하면 409 `INTERVIEW_QUESTION_NOT_READY`가 오는지(현재 AC7·AC10의 가정). 502/429 후 재제출이 중복 답변을 만들지 않는지.

[사람 검증 요청]
docs/plans/119-ai-stt-audio-upload.md 의 "API 연동" 섹션을 검토해주세요.

- 엔드포인트 매핑이 맞는지 (`question_code`/`sequence`를 쿼리 파라미터로, 본문은 `file`만 보내는 결정)
- 빠진 조건부 요구사항이 없는지 (오류 응답 errorCode 필드명 가정, 오디오 경로의 `ANSWER_ACCEPTED` 발행 여부와 `sequence` 포함 여부, STOMP와 HTTP 응답 순서, 재제출 멱등성)

---

## 컴포넌트 스펙

### 책임 분리

| 위치                                                                    | 역할                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/hooks/use-audio-recorder.ts` (신규, 화면 내부 사용)                | `MediaRecorder` 래퍼. 순수 함수 `getSupportedAudioMimeType(): string \| null`(AC1 우선순위, `MediaRecorder`·`isTypeSupported`가 없으면 `null`)과 `isAudioRecordingSupported(): boolean`(`navigator.mediaDevices?.getUserMedia` 존재 && MIME 지원)을 함께 export해 시작 화면에서도 쓴다(또는 `src/lib/audio-recording.ts`로 분리). 훅은 시작(`start(): Promise<'started' \| 'failed'>` — AC13 (B), 경과 시간은 `0:00`부터), 종료(`stop(): Promise<{ blob, mimeType, durationMs }>` — `MediaRecorder.state === 'recording'`일 때만 동작, 그 밖에는 무시), 취소(`cancel()`: 정지 + 트랙 해제 + 청크 폐기 + 경과 시간 0, 여러 번 호출해도 안전), 경과 시간, 120초 자동 종료 콜백(`onAutoStop`), 언마운트 시 트랙 정리를 담당한다.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/hooks/use-answer-audio-upload.ts` (신규, `page.tsx`에서 사용)      | 업로드·상태 전이 담당. 옵션으로 `{ finishInterview, disconnect }`를 page에서 주입받는다(훅 안에서 `useInterviewWebSocket()`을 다시 호출하지 않는다 — 별도 `clientRef`가 생겨 `deactivate`가 no-op이 됨). store에서 `interviewSessionId`, `currentQuestionCode`, `currentSequence`, `status`, `answerAcceptedKey`를 읽는다. 로컬 상태 `{ questionKey, phase, message, blob, mimeType, requestId }`. 노출: `submit(blob, mimeType): Promise<UploadResult>`, `resubmit(): Promise<UploadResult>`, `discardAndRerecord()`(Blob 폐기 + 안내 지움 + phase `idle`, `retryable`에서만 동작), `clearMessage()`, `phase`, `message`. **업로드 결과 반환**: `type UploadResult = 'rerecord-required' \| 'none'`. AC6 전이(`uploading` → `idle`)를 실제로 적용한 경우에만 `'rerecord-required'`로 resolve하고, 그 밖(200, 409, `retryable` 전이, AC12, 응답 무시, deadline 만료, 무시된 중복 호출)은 `'none'`으로 resolve한다. reject하지 않는다. deadline 만료 시에는 `apiRequest` promise를 기다리지 않고 그 시점에 `'none'`으로 resolve한다. 요청마다 새 요청 ID·`AbortController`·35초 deadline 타이머를 만들고, deadline 만료 시 `apiRequest` 완료를 기다리지 않고 즉시 요청 ID 무효화 + `abort()` + `retryable` 전환(공유 재발급·CSRF promise는 abort하지 않음). 오류 판정 순서, 업로드 응답 적용 규칙, 답변 수락 시 동기화(`answerAcceptedKey === 현재 질문 키`일 때만 — store `status`의 `SUBSCRIBED` 전이만으로는 동기화하지 않음), AC12 처리 순서를 담당한다. 질문 키가 바뀌면 초기화한다. STOMP 텍스트 제출은 하지 않는다.                        |
| `src/lib/interview-api.ts`                                              | `InterviewAnswerAudioResponseDTO` 타입과 `submitInterviewAnswerAudio(sessionId, { questionCode, sequence, file, signal })` 추가. `question_code`·`sequence`는 쿼리 파라미터(`URLSearchParams`)로, `file`만 `FormData`로 구성한다. `AbortController`는 훅이 요청마다 만들어 `signal`로 넘긴다.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/lib/api-client.ts`                                                 | 재발급 실패 경로에서 던지는 `ApiError`에 `isReissueFailure = true`를 붙인다(또는 `ReissueFailedError extends ApiError`). 기존 메시지 `'Access token reissue failed'`는 유지한다. CSRF·재발급 경로에는 `signal`을 추가하지 않는다(공유 promise이므로 개별 요청이 취소하면 안 됨). 재시도 `fetch`가 `...options`로 원 요청의 `signal`을 이어받는 현재 동작을 유지한다. 오류 본문 파싱(`errorCode` → `status` 문자열 → `apiStatus`)은 바꾸지 않는다.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `src/hooks/use-interview-websocket.ts`                                  | `disconnect()` 노출(`finishedRef = true` + 재연결·구독 receipt·시작 응답 타이머 정리 + `deactivate`). `finishInterview(sessionId)` 노출(`setFinished` 성공 시 `disconnect()`). `INTERVIEW_FINISHED` 핸들러도 `finishInterview`를 재사용한다. `ANSWER_ACCEPTED` 핸들러는 `setAnswerAccepted({ sessionId: payload.interview_session_id, questionCode: payload.question_code, sequence: payload.sequence })`를 호출한다. `onConnect`는 재연결이면 `SUBSCRIBED`를 거치지 않고 `prevStatus ?? 'SUBSCRIBED'`로 한 번에 설정하고, 최초 연결일 때만 `SUBSCRIBED`로 설정한다(현재 `setStatus('SUBSCRIBED')` 후 `setStatus(prev)` 하는 순서를 바꿈). 기존 텍스트 제출 `submitAnswer`는 **코드를 수정하지 않고 남겨 두지만 UI에서 호출하지 않는다**(범위 밖).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `src/store/interview-store.ts`                                          | `answerAcceptedKey: string \| null` 필드 추가(초기값·`reset()` 시 `null`). `setAnswerAccepted({ sessionId, questionCode, sequence })`: `sessionId === interviewSessionId` && (`questionCode === null` \|\| `questionCode === currentQuestionCode`) && (`sequence === null` \|\| `sequence === currentSequence`) && `status ∈ {QUESTION, SUBMITTING}`일 때만 `SUBSCRIBED` + `answerAcceptedKey = 현재 질문 키`. `setAudioAnswerAccepted({ sessionId, questionCode, sequence })`: 세 값이 모두 현재 질문 키와 같고 `status ∈ {QUESTION, SUBMITTING}`일 때만 `SUBSCRIBED` + `answerAcceptedKey = 현재 질문 키`. (`SUBMITTING`은 텍스트 제출 경로에서만 생기므로 이 기능에서는 사실상 `QUESTION`만 해당하지만, 기존 상태 모델과의 호환을 위해 가드에 남겨 둔다.) 이전 세션 메시지는 세션 ID 비교로 걸러지고, `reset()` 후에는 `currentSequence`가 `null`이라 `sequence` 비교에서도 걸러진다. 업로드 중 상태는 store에 넣지 않는다(`QUESTION` 유지).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `src/app/applicant/interview/_components/interview-start-screen.tsx`    | AC13 (A). 마이크 상태 타입에 `unsupported`를 추가한다(카메라와 공유하는 `PermissionStatus`를 그대로 넓히거나 마이크 전용 타입으로 분리). `STATUS_TAG`에 `unsupported: { label: '지원되지 않음', className: 'bg-slate-200 text-slate-600' }`를 추가한다. 마운트 시 `isAudioRecordingSupported()`가 `false`면 `getUserMedia`를 호출하지 않고 `unsupported`로 둔다(`navigator.mediaDevices` 미존재 시 예외 방지). **카메라 effect(현재 `navigator.mediaDevices.getUserMedia({ video: true })`를 가드 없이 호출)도 `navigator.mediaDevices?.getUserMedia`가 없으면 호출하지 않고 `cameraStatus`를 `denied`로 둔다.** 카메라 상태는 시작 버튼 조건에 넣지 않는다. 마이크 테스트 영역은 `denied`·`unsupported`일 때 음파 막대 대신 `AlertCircle` 경고 아이콘 + 상태 문구(`denied`면 "다시 확인" 버튼 포함)를 보여준다. `denied`이면 "다시 확인" 버튼으로 `getUserMedia({ audio: true })`를 재호출한다(재호출 전 이전 스트림·`AudioContext`·애니메이션 프레임 정리). "면접 시작하기" `disabled` 조건을 `!allChecked`에서 `!allChecked \|\| micStatus !== 'granted'`로 바꾸고, 마이크 미충족 사유 문구(`checking`: "마이크 권한 확인 중..." — 마이크 테스트 영역과 같은 문구, `denied`/`unsupported`: AC13 (A) 문구)를 `aria-describedby`로 연결한다.                                                                                                                                                                                                                                                                                                    |
| `src/app/applicant/interview/page.tsx`                                  | `useInterviewWebSocket()`에서 `finishInterview`, `disconnect`를 받아 `useAnswerAudioUpload`에 주입한다. 기존 `submitAnswer`/`handleSubmitAnswer` 사용과 질문 화면의 `isSubmitting`·`onSubmit` 전달을 제거한다. 화면 표시 우선순위 2를 계산해 `isWaitingNextQuestion`(`(status === 'SUBSCRIBED' && answerAcceptedKey === 현재 질문 키) \|\| uploadPhase === 'waiting'`)으로 넘긴다. `onSubmitAudio`/`onResubmit`에는 업로드 훅의 `submit`/`resubmit`을 그대로 넘겨 `UploadResult`가 화면까지 전달되게 한다. 재연결 배너(`InterviewReconnectingBanner`)는 기존대로 page에서 표시한다. 오류 화면의 시작 화면 `onStart`(`reset()`)는 기존대로 둔다(AC13 (A) Given).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `src/app/applicant/interview/_components/interview-question-screen.tsx` | `SpeechRecognition`과 텍스트 답변 입력 UI 제거. `useAudioRecorder`로 녹음하고 AC5 판정을 한다. 화면 표시 우선순위 2(`isWaitingNextQuestion` 대기 화면) 및 3~6과 버튼 비활성 조건에 따라 UI를 그린다("다시 듣기"는 `idle`/`retryable`에서 #118 조건대로 노출). `recorder.cancel()`은 "녹음기 `cancel()` 호출 시점"의 세 경우에만 호출한다: (1) AC5 판정, (2) 제출·다시 제출 핸들러와 120초 자동 종료(`onAutoStop`) 업로드 경로에서 `await onSubmitAudio(...)` / `await onResubmit()` 결과가 `'rerecord-required'`일 때(AC6, AC3 — 예: 자동 제출 후 400 `INTERVIEW_ANSWER_TOO_LONG`이면 경과 시간이 `0:00`으로 돌아가고 `2:00`에 머물지 않음), (3) `isWaitingNextQuestion`이 `true`가 될 때 녹음기가 `recording`이면(`isWaitingNextQuestion` 기반 effect로 처리 — 아래 금지 규칙의 명시적 예외이며, 녹음기가 `recording`일 때만 동작). **`uploadPhase` 변화를 감시하는 effect로 `cancel()`을 호출하지 않으며, 특히 `retryable` → `idle`("다시 녹음") 전이에서는 호출하지 않는다.** `start()`가 `'failed'`이면 `hasRecorderStartError`를 세우고 AC13 (B) 안내와 "다시 시도"를 보여준다. "다시 녹음"은 `onRerecord()` 후 녹음 시작 흐름을 실행한다. 자동 제출 안내 여부(`isAutoSubmitted`)는 화면 로컬 상태다.                                                                                                                                                                                                                                                                                                                                       |
| `src/mocks/handlers/interview.ts`                                       | `POST /api/interviews/:id/answers/audio` 핸들러(쿼리 `question_code`·`sequence` 검증 포함): 200, 400×2(`INTERVIEW_ANSWER_AUDIO_INVALID`, `INTERVIEW_ANSWER_TOO_LONG`), 409×2(`INTERVIEW_QUESTION_NOT_READY`, `INTERVIEW_ALREADY_COMPLETED`), 409 본문 없음(AC7 기본 처리), 403(AC11 4xx 문구), 413 `INTERVIEW_ANSWER_AUDIO_TOO_LARGE`, 422 `INTERVIEW_ANSWER_NOT_RECOGNIZED`, 429 `SPEECH_PROVIDER_RATE_LIMITED`, 502(`SPEECH_TRANSCRIPTION_FAILED` 있음/없음), 500, 네트워크 오류(`HttpResponse.error()`, AC10), 401→재발급 후 200, 401→재발급 성공→재시도도 401(AC12 (a)), 401→재발급 실패(AC12 (b)), 401→재발급 지연(35초 초과) 시나리오.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `e2e/` 및 단위 테스트                                                   | `SpeechRecognition` 목을 `getUserMedia`(audio) / `MediaRecorder` 목으로 교체(AC14). 화면 표시 우선순위 검증 시나리오 1~5, 늦게 온 `ANSWER_ACCEPTED`(AC4, 다른 세션 ID 포함), AC10 재발급 지연 deadline 시나리오를 추가한다. 위 MSW 분기별로 AC7 본문 없는 409 → `waiting`, AC11 403 → 4xx 문구 + `retryable`, AC12 (a) 재시도 401 → 토스트·`disconnect()`·`reset()`·`/login` 이동, AC10 네트워크 오류 → `retryable` 테스트를 포함한다. AC9 502 연속 2회 → 두 번 모두 `retryable` + "다시 제출"·"다시 녹음" 노출(텍스트 입력 UI 없음), "다시 녹음" → Blob 폐기 후 녹음 시작, **녹음기가 `recording`을 유지하고 `cancel()`이 호출되지 않음**(검증 시나리오 5). AC6 400/422 → 경과 시간 `0:00` + phase `idle`. **AC3 120초 자동 종료 → 자동 제출이 400 `INTERVIEW_ANSWER_TOO_LONG` → `recorder.cancel()` 호출, 경과 시간 `0:00` + phase `idle`(`2:00`에 머물지 않음).** AC13 (A) 시작 화면: 마이크 `NotAllowedError` → 체크리스트를 모두 체크해도 "면접 시작하기" `disabled` + 사유 문구, "다시 확인" 후 허용 → 활성화, `MediaRecorder` 미지원 → `unsupported` 태그·경고 아이콘·문구 + `disabled`, `checking` 동안 마이크 테스트 영역과 사유 문구 모두 "마이크 권한 확인 중..." 표시, **`navigator.mediaDevices` 미존재 → 예외 없이 마이크 `unsupported` + 카메라 `denied`**, 오류 화면 "면접 시작하기" → `reset()` 후 시작 화면이 다시 마운트되어 마이크 확인·체크리스트가 초기화됨. AC13 (B) 질문 화면: "답변하기" 시 `getUserMedia` 실패 → 안내 + "다시 시도" → 재시도 성공 시 녹음 시작. 기존 시작 화면 e2e는 마이크 허용 목을 전제로 갱신한다. |

### `InterviewQuestionScreenProps` 변경안

```ts
type UploadResult = 'rerecord-required' | 'none';

interface InterviewQuestionScreenProps {
  question: string;
  sequence: number;
  roundLabel: string;
  isWaitingNextQuestion: boolean; // (store SUBSCRIBED && answerAcceptedKey === 현재 질문 키) || uploadPhase === 'waiting'
  uploadPhase: 'idle' | 'uploading' | 'retryable' | 'waiting';
  uploadMessage: string | null; // 업로드 관련 안내(role=alert/status)
  audioUrl?: string | null;
  audioStatus?: 'READY' | 'UNAVAILABLE' | null;
  onSubmitAudio: (blob: Blob, mimeType: string) => Promise<UploadResult>; // 'rerecord-required'(AC6)이면 화면이 recorder.cancel() — 수동 제출·120초 자동 종료(onAutoStop) 공통
  onResubmit: () => Promise<UploadResult>; // "다시 제출" — 같은 Blob 재업로드, 결과 처리는 onSubmitAudio와 동일
  onRerecord: () => void; // "다시 녹음" — 업로드 훅 discardAndRerecord(), 이후 화면이 녹음 시작 (cancel() 호출 안 함)
  onClearMessage: () => void; // "답변하기"/"다시 시도" 클릭 시 안내 지우기
  onReportError?: () => void;
  // isFinished, onFinish 기존 유지
  // 제거: isSubmitting, onSubmit(텍스트 STOMP 제출)
}
```

- `questionCode`/`interviewSessionId`는 화면에 넘기지 않는다. 업로드 훅이 store에서 직접 읽는다.
- `RECONNECTING`은 답변 버튼에 영향을 주지 않으므로 화면에 넘기지 않는다(재연결 배너는 page 담당).
- 화면 내부 로컬 상태는 녹음기 상태(`recording` 여부, 경과 시간), 녹음 시작 실패 여부(`hasRecorderStartError`, 질문 키가 바뀌면 `false`), 자동 제출 여부(`isAutoSubmitted` — `onAutoStop` 시 `true`, `uploadPhase`가 `uploading`을 벗어나면 `false`), AC5 오류 메시지뿐이다. 나머지 phase는 `uploadPhase` prop을 따른다.

### UI

- 사용할 shadcn/ui 컴포넌트:
  - `Button` — 답변하기 / 제출하기 / 제출 중... / 다시 제출 / 다시 녹음(보조, `variant="outline"`) / 다시 시도 / 시작 화면 "다시 확인"
  - `Alert` / `AlertDescription` — 오류·안내 문구(또는 기존 `role="alert"` 텍스트 재사용)
  - 전역 토스트(`toast-store`) — AC12 로그인 만료 안내
- 상태 관리:
  - 훅·컴포넌트 로컬: phase, 녹음 Blob, 경과 시간, 안내 메시지, `hasRecorderStartError`, 요청 ID, deadline 타이머(질문 키 단위 초기화). 시작 화면 `micStatus`(`checking`/`granted`/`denied`/`unsupported`), `cameraStatus`(`checking`/`granted`/`denied`).
  - Zustand: 기존 `status`(`QUESTION`/`SUBMITTING`/`SUBSCRIBED`/`RECONNECTING`/`FINISHED`/`ERROR`/`IDLE`)와 신규 `answerAcceptedKey`만 쓴다. 녹음 Blob과 업로드 phase는 store에 넣지 않는다.
- 접근성 주의사항:
  - 녹음 중 표시: `role="status"` + `aria-live="polite"`(기존 유지). 경과 시간은 매초 읽히지 않도록 `aria-live` 영역 밖에 둔다.
  - 처리 중 / 다음 질문 준비 중 / 자동 제출 안내: `role="status"`.
  - 오류·녹음 시작 실패 안내: `role="alert"`.
  - 처리 중 액션 버튼: `disabled` + `aria-busy="true"`, 라벨 "제출 중...".
  - `retryable` 진입 시 포커스를 "다시 제출" 버튼으로, AC13 (B) 안내 표시 시 "다시 시도" 버튼으로 옮긴다.
  - 시작 화면: "면접 시작하기"가 마이크 조건으로 `disabled`일 때 사유 문구(`checking`이면 "마이크 권한 확인 중...")를 `aria-describedby`로 연결한다.
  - 키보드만으로 답변하기 → 제출하기 → 다시 제출 / 다시 녹음 / 다시 시도를 진행할 수 있어야 한다.

---

## 향후 고려사항

- **무음 감지(RMS 기반) 프론트 필터링**: `AnalyserNode`로 녹음 중 평균 음량을 재고, 기준 이하이면 업로드 전에 막는다. 이슈에서 "권장"으로 언급됐지만 기준값 튜닝이 필요해, 이번 AC는 최소 길이(1초) 차단과 서버 422로 처리한다.
- **업로드 전 클라이언트 10MB 사전 검사**: opus 기준 120초 녹음은 약 2MB 미만이라 실제로 넘기 어렵다. 필요하면 업로드 전에 `blob.size`를 검사해 413 문구를 미리 보여준다.
- **녹음 종료 임박 안내**: 1:50 시점에 "10초 남았어요" 안내.
- **같은 오류 반복 시 안내 강화**: 502·5xx·네트워크 오류가 같은 질문에서 N회 반복되면 "다시 녹음" 또는 "오류가 있어요"를 더 강조하는 문구로 바꿀지 검토(현재는 횟수와 무관하게 같은 안내).
- **STOMP 텍스트 제출 코드 정리**: UI에서 더 이상 쓰지 않는 `use-interview-websocket.ts`의 `submitAnswer`와 store `SUBMITTING` 상태를 제거할지 별도 이슈로 검토.
- **마이크 오류 종류별 문구(시작 화면·면접 도중 공통)**: 현재 시작 화면(AC13 (A))은 `NotFoundError`(장치 없음)·`NotReadableError`(다른 앱 점유) 등 권한 외 실패도 `denied`로 보고 "브라우저 설정에서 마이크 권한을 허용해주세요."를 보여주며, 면접 도중(AC13 (B))도 단일 안내 + "다시 시도"만 한다. 오류 종류별 문구(`NotAllowedError` → 브라우저 권한 재설정 방법, `NotFoundError`/`NotReadableError` → 장치 연결·다른 앱 점유 확인), Permissions API(`navigator.permissions.query({ name: 'microphone' })`)로 영구 거부 감지(영구 거부 시 "다시 확인"/"다시 시도"만으로는 프롬프트가 다시 뜨지 않음), `devicechange` 이벤트로 재연결 자동 감지를 검토.
- **녹음 중 마이크 장치 분리/트랙 종료(`track.onended`)**: 녹음 도중 이어폰 분리 등으로 스트림이 끊기는 경우.
- **녹음 중 탭 전환·화면 잠금**: 모바일 Safari가 백그라운드로 갈 때 `MediaRecorder` 중단 처리.
- **시작 화면 카메라 권한 게이트**: 현재 카메라 거부(및 `navigator.mediaDevices` 미존재로 인한 `denied`)는 면접 시작을 막지 않는다(이번 범위에서 변경 없음). 카메라도 전제 조건으로 할지 검토.
- **시작 화면 마이크 장치 선택**: 기본 장치가 아닌 마이크를 고르는 UI("시스템 설정 : Default - Macbook Mic" 고정 문구 대체).
- **`ANSWER_ACCEPTED.sequence`가 `null`일 때의 대안**: 클라이언트가 "마지막으로 제출한 질문 키"를 따로 기억해 비교하는 방식(확인 필요 #11 결과에 따라).
- **CSRF·재발급 경로의 개별 취소**: 현재는 공유 promise를 abort하지 않고 업로드 훅 deadline으로만 화면을 보장한다. 재발급이 자주 멈춘다면 공유 promise 자체에 타임아웃을 두는 방안을 검토.
- **deadline 만료 뒤 늦게 도착한 인증 실패**: 무시되므로 사용자는 `retryable`에 머물고, "다시 제출" 시 다시 인증 실패를 받아 AC12로 처리된다. 첫 실패 시점에 바로 로그인으로 보낼지 검토.
- **업로드 중 STOMP 재연결 장기화·실패**: 재연결 실패(`ERROR`)와 업로드 200이 겹칠 때의 최종 화면.
- **재연결 중 `QUESTION_READY` 유실**: 재연결 동안 발행된 다음 질문을 받지 못하면 phase `waiting`에 머문다. 재연결 후 현재 질문 재요청 API가 필요한지 검토.
- **409 NOT_READY 후 `QUESTION_READY`가 오지 않는 경우**: 일정 시간 기다린 뒤 안내하거나 오류 리포트를 유도.
- **재발급 요청 자체의 네트워크 오류**: 현재는 AC10(네트워크 오류)으로 분류된다.
- **업로드 중 페이지 이탈**: 언마운트 시 `abort()` 처리와 서버 측 중복 처리 여부.
- **다시 녹음 전 미리듣기(재생) 기능**: 녹음을 확인한 뒤 제출하는 UX.
- **녹음 일시정지/재개**: 이번 범위에서 제외.
- **카메라 스트림과 녹음 스트림 통합**: 현재 카메라(`video: true`)와 녹음(`audio: true`)을 따로 요청한다. 권한 프롬프트 횟수를 줄이려면 통합 검토.

---

## 변경 이력

- **코드 리뷰 Round 1 반영 — 구현 예외 문서화** (2026-10-12, `docs/reviews/code-119-round1.md`)
  - "녹음기 `cancel()` 호출 시점"에 구현 예외를 추가했다: (1) 질문 키가 바뀔 때 녹음기가 `idle`이 아니면 `cancel()`(AC4 경과 시간 초기화에 필요), (2) 녹음 중 예상치 않은 정지(트랙 `ended`, `MediaRecorder` `error`/`stop`) 시 녹음 훅이 `idle`로 돌아가고 화면이 AC13 (B) 안내 + "다시 시도"를 표시, "제출하기"에서 `stop()`이 `null`이면 `cancel()` 후 같은 안내.
  - 범위 밖 버그 수정 기록: 재연결 `reactivateClient()`(stompjs `reconnectDelay: 0`에서 `deactivate()` 후 `activate()`), STOMP ERROR 뒤 소켓 close가 `ERROR`를 `IDLE`로 덮어쓰던 문제(#44), 언마운트 후 재연결, 재시도 소진 시 클라이언트 비활성화, 탭 복귀 재연결 시 기존 재시도 타이머 정리.
  - store: `QUESTION_READY`는 활성 세션과 세션 ID가 다르면 무시하고, 중복 판정 키(`lastReceivedKey`)를 질문 키(`sessionId:question_code:sequence`)로 바꿨다. `ANSWER_ACCEPTED`의 `question_code`/`sequence`가 `undefined`(필드 누락)여도 비교를 생략한다(확인 필요 #11).

- **Round 5 Claude 재검증 반영 — 기획 확정** (2026-10-12, `docs/reviews/us-#119-round5-verify.md`)
  - Claude(us-reviewer) 단독 재검증 판정 **PASS**(C0/M0/m3). Round 5 Major M1(녹음기 `cancel()` 호출 시점 충돌) 해소를 확인했다. 문서 상태를 **기획 확정**으로 바꿨다. AC 번호와 기존 문구는 바꾸지 않고 아래 Minor 3건만 보완했다.
  - Minor(120초 자동 종료 경로의 `cancel()`): 자동 종료(`onAutoStop`) 업로드 경로도 `UploadResult`를 받아 `'rerecord-required'`이면 `recorder.cancel()`을 호출한다고 "녹음기 `cancel()` 호출 시점" 2·AC3·AC6·질문 화면 책임·props 주석에 명시했다(자동 제출 후 400 `INTERVIEW_ANSWER_TOO_LONG` → 경과 시간 `0:00`, `2:00`에 머물지 않음). 테스트 목록에 해당 케이스를 추가했다.
  - Minor(`isWaitingNextQuestion` effect 예외): "녹음기 `cancel()` 호출 시점" 3(답변 수락 동기화 중 녹음)은 `isWaitingNextQuestion` 기반 effect로 처리하며 "phase 감시 effect 금지"의 명시적 예외이고, 녹음기가 `recording`일 때만 동작한다고 공통 규칙·동기화 규칙·질문 화면 책임에 적었다.
  - Minor(`checking` 문구 통일): 마이크 테스트 영역과 "면접 시작하기" 사유 문구 모두 "마이크 권한 확인 중..."으로 통일했다(AC13 (A), 시작 화면 책임, 접근성, 테스트 목록).
- **Round 5 리뷰 반영** (2026-10-09, `docs/reviews/us-#119-round5.md`)
  - 다자토론 판정 **FAIL**(Claude C0/M1/m4 FAIL, Codex C0/M0/m0 PASS, Antigravity C0/M0/m2 PASS → 통합 Major 1). Major 1건과 Minor 6건을 반영했다. 다음 검증은 Claude(us-reviewer) 단독으로 한다.
  - Major M1(녹음기 `cancel()` 호출 시점 충돌): 질문 화면 규칙 "`uploadPhase`가 `idle`로 돌아오면 `recorder.cancel()`"이 "다시 녹음"(`onRerecord()`로 `retryable` → `idle` 후 화면이 비동기 `recorder.start()`)과 겹쳐 새 녹음을 끊을 수 있었다.
    - 공통 규칙에 **"녹음기 `cancel()` 호출 시점"**을 신설해 호출 경우를 AC5 판정, AC6(`uploading` → `idle`), 답변 수락 동기화 중 녹음 세 가지로 한정했다. phase 변화 감시 effect로는 호출하지 않는다.
    - AC6의 `cancel()`은 업로드 훅이 반환하는 `UploadResult`(`'rerecord-required' | 'none'`)를 받아 제출·다시 제출 핸들러에서 **명시적으로** 호출한다. `submit`/`resubmit`, `onSubmitAudio`/`onResubmit` 시그니처를 `Promise<UploadResult>`로 바꿨다.
    - "**`retryable` → `idle`(다시 녹음) 전이에서는 `cancel()`을 호출하지 않는다**"를 공통 규칙·재제출 가능 상태 공통 규칙·질문 화면 책임·props 주석에 명시했다. 새 녹음의 경과 시간은 `start()`가 `0:00`부터 센다(AC1·녹음 훅).
    - 검증 시나리오 5("다시 녹음" 후 녹음 유지)와 관련 테스트 항목을 추가했다. `cancel()`을 언급하는 모든 위치(동기화 규칙, AC5, AC6, 질문 화면 책임, props)를 새 규칙에 맞췄다.
  - Minor(시작 화면 카메라 effect 가드): 카메라 effect도 `navigator.mediaDevices.getUserMedia`를 가드 없이 호출한다. `navigator.mediaDevices?.getUserMedia`가 없으면 호출하지 않고 카메라 `denied`로 둔다(카메라 게이트 규칙은 변경 없음). AC13 (A)·시작 화면 책임에 반영하고 "`navigator.mediaDevices` 미존재" 테스트를 추가했다.
  - Minor(AC13 (A) `checking` 문구): `checking` 동안에는 "마이크 권한을 허용해야..." 대신 "마이크 확인 중..."을 사유 문구로 보여준다. 상태별 사유 문구를 목록으로 정리했다.
  - Minor(권한 외 마이크 오류 문구): 시작 화면에서 `NotFoundError`/`NotReadableError`도 권한 거부 문구로 보여주는 현재 방식을 유지하고, 오류 종류별 문구를 향후 고려사항에 시작 화면까지 포함하도록 고쳤다.
  - Minor(오류 화면 재시작): 오류 화면 "면접 시작하기" → `reset()` → 시작 화면 재마운트 → 마이크 확인·체크리스트를 다시 거치는 흐름을 AC13 (A) Given에 의도된 동작으로 적었다.
  - Minor(Antigravity m1, `STATUS_TAG`): `unsupported: { label: '지원되지 않음', className: 'bg-slate-200 text-slate-600' }`를 명시했다.
  - Minor(Antigravity m2, 마이크 테스트 영역): `denied`·`unsupported`일 때 음파 막대 대신 경고 아이콘 + 상태 문구를 보여준다고 명시했다.
- **Round 4 이후 사용자 결정 반영: 텍스트 폴백 제거, API 스펙 확정** (2026-10-09)
  - 사용자 결정 1("음성 업로드가 실패했으면 다시 보내야지. 텍스트로 보내는 건 별로이고, 그렇게 받고 있지도 않다")에 따라 **텍스트 답변 폴백을 전부 제거**했다. 답변 경로는 녹음 업로드 하나다.
    - phase `text-fallback`, `enterTextFallback`, `onEnterTextFallback`, `submitText`/`onSubmitText`, `isTextSubmitting`·`isReconnecting` prop, page의 `submitAnswer` 주입, 텍스트 "제출하기" 버튼, `Textarea`, 텍스트 20초 무응답 안내, "텍스트 답변 모드 공통 동작" 절을 삭제했다. 화면 표시 우선순위 4행, 버튼 표, 동기화 대상, 검증 시나리오(구 3번 삭제, 구 4·5번 → 3·4번), AC4 Given(텍스트 경로), MSW·테스트 항목을 함께 정리했다.
    - `use-interview-websocket.ts`의 STOMP 텍스트 publish(`submitAnswer`)는 코드를 수정하지 않고 남겨 두되 UI에서 호출하지 않는다고 명시했다. STOMP 수신(`QUESTION_READY`/`INTERVIEW_FINISHED`/`ANSWER_ACCEPTED`)과 재연결은 그대로 쓴다.
    - AC9(502): 502 연속 카운트와 텍스트 전환을 없앴다. 502는 횟수와 무관하게 `retryable`("다시 제출" 같은 Blob + "다시 녹음")이다. 관련 "502 카운트" 문장을 AC2·AC4·AC8·AC10·AC11·동기화 규칙·훅 로컬 상태에서 삭제했다.
    - `retryable` 공통 규칙에 **"다시 녹음"**(보조 버튼, `discardAndRerecord()` → `idle` → 녹음 시작)을 추가했다. 이전의 "재제출 가능 상태에서 다시 녹음 허용" 향후 고려사항은 이번 범위로 들어왔다. AC8·AC10·AC11의 `retryable`에도 공통 규칙으로 함께 적용된다.
    - AC14: 텍스트 입력 UI와 `submitAnswer` 호출이 없어야 한다는 확인 항목을 추가했다.
  - 사용자 결정 2("마이크 권한을 허용해주지 않으면 면접 시작이 어렵다")에 따라 **AC13을 "마이크 권한·녹음 지원은 면접 시작 전제 조건"으로 재작성**했다.
    - (A) 시작 화면: 현재 `interview-start-screen.tsx`는 마이크 거부 시에도 체크리스트만으로 시작할 수 있다. "면접 시작하기"를 `allChecked && micStatus === 'granted'`로 게이트하고, `MediaRecorder`·지원 MIME 확인(`unsupported`)과 거부 시 "다시 확인" 버튼을 추가한다. `interview-start-screen.tsx`를 컴포넌트 스펙에 추가했다.
    - (B) 면접 도중 녹음 시작 실패(권한 철회·장치 분리): 질문 화면에서 대체 답변 흐름 없이 단일 안내 + "다시 시도"만 둔다. `useAudioRecorder.start()` 결과를 `'started' | 'failed'`로 단순화하고, 화면 로컬 상태를 `hasRecorderStartError`로 했다. 오류 종류별 문구·Permissions API 등 상세 처리는 향후 고려사항으로 옮겼다.
    - `getSupportedAudioMimeType()`/`isAudioRecordingSupported()`를 시작 화면과 녹음 훅이 함께 쓰도록 했다.
  - 백엔드 API 스펙 확정 반영:
    - `question_code`·`sequence`는 OpenAPI 파라미터 정의(`in: query`)대로 쿼리 파라미터로 보낸다(description의 "multipart" 문구와의 차이를 명시). 확인 필요 #1 해결.
    - 허용 MIME(`audio/webm`, `audio/ogg`, `audio/mp4`)·10MB·120초(+5초) 확정. 확인 필요 #3 해결.
    - 200 응답 예시(`code: 0`)와 `InterviewAnswerAudioResponseDTO` 타입을 추가했다.
    - 오류 코드 표와 AC6을 확정 errorCode(`INTERVIEW_ANSWER_AUDIO_INVALID`, `INTERVIEW_ANSWER_TOO_LONG`, `INTERVIEW_ANSWER_AUDIO_TOO_LARGE`, `INTERVIEW_QUESTION_NOT_READY`, `INTERVIEW_ALREADY_COMPLETED`, `INTERVIEW_ANSWER_NOT_RECOGNIZED`, `SPEECH_PROVIDER_RATE_LIMITED`, `SPEECH_TRANSCRIPTION_FAILED`)로 갱신했다.
    - errorCode 필드명 가정을 명시했다: `api-client.ts` `parseResponse`는 `errorCode` → `status` 문자열 순으로 `ApiError.apiStatus`를 채우고 `code`는 숫자일 때만 읽는다. 가정이 틀려도 HTTP 상태 기준 기본 동작으로 처리되므로 착수 차단 항목이 아니다.
  - 확인 필요: #1·#3 해결, #7 제거(불필요), #12(재제출 멱등성) 추가. **개발 착수 전 필수 항목 없음.**
  - 향후 고려사항: "AC11 반복 시 텍스트 폴백 전환", "텍스트 20초 지연 이후 복구", "텍스트 폴백 STOMP 미연결", "텍스트 폴백 이후 다음 질문 모드", "재제출 상태 다시 녹음 허용", "시작 화면에서 마이크 거부 시 시작을 막을지"를 삭제했고, "같은 오류 반복 시 안내 강화", "STOMP 텍스트 제출 코드 정리", "면접 도중 마이크 권한 철회·장치 분리의 상세 처리", "시작 화면 카메라 권한 게이트", "시작 화면 마이크 장치 선택"을 추가했다.
- **Round 4 리뷰 반영 — 기획 확정** (2026-10-09, `docs/reviews/us-#119-round4.md`)
  - 다자토론 판정 **PASS**(Claude C0/M0/m3, Codex C0/M0/m0, Antigravity C0/M0/m0). Round 3 지적(M1, M2, m1~m5)은 모두 해소 확인되었다. 문서 상태를 **기획 확정**으로 바꿨다. 백엔드 확인 필요 #1, #7은 여전히 개발 착수 전 필수이다.
  - Minor m1: MSW 핸들러·테스트 목록에 빠진 분기를 추가했다 — 401→재발급 성공→재시도 401(AC12 (a)), 본문 없는 409(AC7 기본 처리), 403(AC11 4xx 문구), 네트워크 오류(`HttpResponse.error()`, AC10).
  - Minor m2: AC5 Then의 "phase가 `idle`로 돌아가"를 "녹음기 상태가 `idle`로 돌아가고(업로드 phase는 `idle` 유지)"로 고쳤다. 녹음 상태는 화면 소유이고 AC5에서는 업로드 훅이 호출되지 않기 때문이다.
  - Minor m3: 액션 버튼 비활성 조건 표에서 "다시 듣기"를 `idle`/`retryable`/`text-fallback`에서 #118 조건대로 노출한다고 정의했다. 재제출 가능 상태 공통 규칙, 텍스트 답변 모드 공통 동작, 화면 컴포넌트 책임에도 같은 내용을 적었다.
- **Round 3 리뷰 반영** (2026-10-09, `docs/reviews/us-#119-round3.md`)
  - 공통 규칙(Major M1): **답변 수락 키 `answerAcceptedKey`**를 도입했다. `setAnswerAccepted`/`setAudioAnswerAccepted`가 실제로 전이할 때만 현재 질문 키를 기록한다. "답변 수락 시 동기화"(phase `waiting` + Blob 폐기)의 트리거를 store `SUBSCRIBED` 전이에서 `answerAcceptedKey === 현재 질문 키`로 좁혔고, 화면 표시 우선순위 2와 `isWaitingNextQuestion`도 같은 기준으로 바꿨다. 재연결 `onConnect`는 `SUBSCRIBED`를 거치지 않고 이전 상태를 한 번에 복구한다. 검증 시나리오 5(`retryable`/`text-fallback` + 재연결 완료 → phase·Blob·입력 유지)를 추가했다.
  - 업로드 요청 규칙·AC10·AC12·API 요청 상세(Major M2): 35초 deadline을 업로드 훅이 소유하고 CSRF·업로드·재발급·재시도 전체를 덮도록 했다. 만료 시 promise를 기다리지 않고 즉시 요청 ID 무효화 + `abort()` + `retryable`. 공유 재발급·CSRF promise는 abort하지 않는다고 명시했다. 재발급 지연 검증 시나리오와 MSW 핸들러를 추가했다.
  - Minor: 동기화 대상에 `idle` + 녹음 중 추가(화면이 `recorder.cancel()`), 업로드 응답 무시 조건에 store `ERROR`/`IDLE`과 무효화된 요청 추가(AC7에도 명시), 텍스트 20초 지연 판정을 상태값이 아닌 메시지 반영 기준으로 바꿔 `RECONNECTING` 왕복을 응답으로 보지 않음, `setAnswerAccepted`에 `interview_session_id`·`question_code` 비교 추가(확인 필요 #11 문구 갱신), 컴포넌트 스펙의 화면 책임을 "우선순위 2 및 3~6"으로 수정.
  - 질문 키 정의를 store `lastReceivedKey`(`sessionId:sequence`)와 구분해 적었다(`question_code` 포함).
  - 향후 고려사항: CSRF·재발급 공유 promise 타임아웃, deadline 만료 뒤 늦게 도착한 인증 실패 처리 추가.
- **Round 2 리뷰 반영** (2026-10-09, `docs/reviews/us-#119-round2.md`)
  - AC4(Critical): `setAnswerAccepted(sequence: number | null)`로 바꾸고 `setAudioAnswerAccepted`와 같은 sequence·상태 가드를 둔다. 핸들러는 `payload.sequence`를 넘긴다. 이전 질문의 늦은 `ANSWER_ACCEPTED`가 새 질문을 대기 화면으로 되돌리지 않는다. 확인 필요 #11(`ANSWER_ACCEPTED.sequence` 보장) 추가.
  - 공통 규칙: **화면 표시 우선순위 표**(FINISHED/ERROR > waiting > uploading > retryable·text-fallback > recording > idle)와 store `SUBSCRIBED` 시 phase `waiting` 동기화(Blob 폐기)를 정의했다. 상태 충돌 검증 시나리오 4개(200 전 `ANSWER_ACCEPTED`, 타임아웃 후 `ANSWER_ACCEPTED`, 텍스트 + `SUBSCRIBED`, `RECONNECTING` 중 200)를 추가했다. AC2에 `RECONNECTING` 중 200이면 로컬 phase가 `waiting`이 된다는 문장을 넣었다.
  - 공통 규칙: **모드별 버튼 비활성 조건**을 정의했다. REST 경로 버튼은 `RECONNECTING`으로 막지 않고, 텍스트 STOMP "제출하기"만 막는다. props의 `isSubmitting`을 `isTextSubmitting`/`isReconnecting`으로 나눴다.
  - AC12: 인증 실패 판정 (b)를 `getAccessToken() === null`에서 `ApiError.isReissueFailure`(임시: message 비교)로 바꿨다. 처리 순서를 Blob 폐기 → 토스트 → `disconnect()` → `reset()` → `router.replace('/login')`으로 정하고, 웹소켓 훅에 `disconnect()`를 추가해 재연결 타이머가 남지 않게 했다.
  - 텍스트 폴백: 확인 필요 #7을 [개발 착수 전 필수]로 올렸다. 텍스트 답변 모드 공통 동작에 20초 응답 지연 안내를 추가했다.
  - 업로드 요청마다 새 `AbortController`와 새 타이머를 만든다(AC10 재제출).
  - 텍스트 폴백 소유자를 업로드 훅 하나로 합쳤다(`enterTextFallback(reason)`, AC13도 사용).
  - Minor: 질문 키(`interviewSessionId` + `question_code` + `sequence`) 도입, AC4 Given을 오디오/텍스트 경로로 분리, `isAutoSubmitted`를 화면 로컬 상태로 이동, `finishInterview`/`disconnect`/`submitAnswer`를 page에서 업로드 훅으로 주입, 안내 메시지 지우는 시점 정의, AC3 자동 종료·수동 제출 이중 제출 방지, AC5·AC6에서 `recorder.cancel()`로 경과 시간 초기화.
  - 향후 고려사항: 20초 지연 이후 복구 수단, `ANSWER_ACCEPTED.sequence` null 대안, 재연결 중 `QUESTION_READY` 유실 추가.
- **Round 1 리뷰 반영** (2026-10-09, `docs/reviews/us-#119-round1.md`)
  - 공통 규칙 신설: phase 정의, 처리 중 / 재제출 가능 / 다음 질문 준비 중 공통 표시, 업로드 응답과 sequence 일치 규칙, 업로드 오류 판정 순서(HTTP 상태 우선).
  - 상태 설계 확정: 업로드 중에는 store를 `QUESTION`으로 두고 로컬 phase를 쓴다. 200 / 409 NOT_READY에서는 guarded `setAudioAnswerAccepted(sequence)`를 호출한다. `setAnswerAccepted`는 멱등화한다. 대기 화면 표시 조건을 정의했다.
  - AC4: STOMP 메시지가 HTTP 200보다 먼저 와도 되도록 순서 무관으로 재정의했다. `ANSWER_ACCEPTED`는 멱등 처리한다.
  - AC5: 판정 시점을 (a) 클릭 시 1초 미만, (b) `onstop` 후 0바이트로 나누고, 레코더 정지·트랙 해제·청크 폐기를 명시했다.
  - AC6: errorCode가 없을 때 쓸 HTTP 상태별 기본 문구를 추가했다.
  - AC7: 알 수 없는 409는 NOT_READY로 처리한다. ALREADY_COMPLETED는 `finishInterview`(STOMP `deactivate` 포함)를 호출한다.
  - AC8: 문구를 "잠시 후 다시 제출해 주세요"로 바꾸고, 즉시 활성화하며 카운트다운이 없음을 명시했다.
  - AC9: errorCode와 상관없이 모든 502에 적용한다. 카운트 규칙을 명시하고, 텍스트 전환 Then을 완결형으로 썼다.
  - AC11(신규): 5xx / 403 / 404 / 정의되지 않은 오류 처리.
  - AC12(구 AC10): 인증 실패 판정 기준(재시도 401 또는 `getAccessToken() === null`)을 정하고, `/login` 리다이렉트로 WebSocket과 맞췄다.
  - AC13(구 AC11): 범위를 마이크 거부/미지원으로 한정했다.
  - AC14(구 AC13): 제거 범위에 e2e/테스트 목을 포함했다.
  - AC1: TTS 재생 중 비활성(#118) 유지를 명시하고, 녹음 시작 후 "다시 듣기"를 숨긴다.
  - AC2: `File` type은 codecs를 뺀 기본 MIME으로 정했다. query vs multipart는 개발 착수 전 필수 확인으로 표시했다.
  - AC 순서 재배치: 정상 흐름(AC1~4) → 오류(AC5~12) → 마이크 폴백(AC13) → 코드 제거(AC14).
  - 컴포넌트 스펙: `use-audio-recorder` / `use-answer-audio-upload` 책임을 나누고, `InterviewQuestionScreenProps` 변경안을 추가했다.
  - 확인 필요 사항: #5(STOMP와 HTTP 순서), #7(텍스트 폴백 허용), #9(409 errorCode), #10(403/404) 추가.
