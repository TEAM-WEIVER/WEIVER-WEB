# [#119] US/AC 다자토론 리뷰 — Round 4

- 대상 문서: `docs/plans/119-ai-stt-audio-upload.md` (round 4 리뷰 대상 = round 3 반영 개정본)
- 일시: 2026-10-09
- 방식: 내부 Agent() 병렬 스폰 + 외부 CLI 독립 리뷰 (직교 렌즈, 반증 의무). round 3에서 새로 넣은 `answerAcceptedKey`가 우선순위 표·AC4·20초 지연 판정과 모순 없이 맞물리는지, 업로드 훅 소유 35초 deadline과 공유 재발급·CSRF promise 정책을 공격 대상으로 넣었다. 리뷰 프롬프트에 "미구현 코드는 결함 아님, 방어 동작이 정의된 확인 필요 항목은 결함 아님, 결정·기각 사항은 문서 내 모순이 없으면 재제기 금지"를 명시했다.
- 판정: **PASS** — Critical 0 / Major 0 / Minor 3 → **다자토론 종료, `designer` 단계 진행**

## 리뷰어

| 리뷰어      | 도구 / 버전                                                                      | 렌즈                          | Critical | Major | Minor | 원 판정 |
| ----------- | -------------------------------------------------------------------------------- | ----------------------------- | -------- | ----- | ----- | ------- |
| Claude      | `us-reviewer` 서브에이전트                                                       | 보안·엣지케이스·요구사항 충족 | 0        | 0     | 3     | PASS    |
| Codex       | codex-cli 0.159.3 (gpt-5.6-terra, read-only sandbox)                             | 정확성·논리 비약·반례         | 0        | 0     | 0     | PASS    |
| Antigravity | agy (gemini-cli `IneligibleTierError`로 Gemini 렌즈 대체 투입, round 1~3과 동일) | 외부 사실·도메인 접지·현실성  | 0        | 0     | 0     | PASS    |

- 위 개수는 리뷰어 원문(raw) 기준이며, 이번 라운드는 심각도 조정이 없었다.
- 3명 모두 독립적으로 PASS를 냈다. Minor 3건은 Claude만 제기했고, 문서 정합성 보완이므로 판정에 영향을 주지 않는다.
- 원본 출력
  - Codex: `.cmux/debates/119-ai-stt-audio-upload/codex-r4.md` (원본: 세션 임시 경로 `scratchpad/codex-round4.md`, 실행 헤더·프롬프트·최종 답변만 보존)
  - Antigravity: `.cmux/debates/119-ai-stt-audio-upload/agy-r4.txt` (원본: 세션 임시 경로 `scratchpad/agy-round4.txt`)
  - Claude(us-reviewer): 오케스트레이터에 인라인으로 반환됨(파일 미보존)
  - round 1~3 원본도 같은 디렉토리에 `codex-r{1,2,3}.md`, `agy-r{1,2,3}.txt`로 보존했다.

## Round 3 지적 사항 해소 현황

3명 모두 R3 Major 2건이 해소됐다고 판정했다(Claude·Codex·Antigravity 일치). Minor 5건도 모두 반영 확인되었다.

| R3 # | 심각도 | 내용 요약                                                   | Round 4 판정 | 근거                                                                                                                                                                                                                                                         |
| ---- | ------ | ----------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M1   | Major  | 재연결의 일시적 `SUBSCRIBED`가 답변 수락 동기화를 오발동    | 해소         | `answerAcceptedKey`는 실제 전이 시에만 기록, 동기화 트리거를 키 일치로 축소, 우선순위 2·`isWaitingNextQuestion`도 같은 기준, `onConnect`가 `prevStatus ?? 'SUBSCRIBED'`로 한 번에 복구, 검증 시나리오 5 추가                                                 |
| M2   | Major  | 35초 deadline이 공유 재발급 promise 대기를 덮지 못함        | 해소         | 업로드 훅이 CSRF·업로드·재발급·재시도 전체 체인의 deadline 소유, 만료 시 즉시 요청 ID 무효화 + `abort()` + `retryable`, 공유 promise는 abort하지 않음, AC10 재발급 지연 시나리오·MSW 추가. Codex가 `api-client.ts`의 재시도 `signal` 전달 구조와 대조해 확인 |
| m1   | Minor  | 동기화 대상에 `idle` + 녹음 중 누락                         | 해소         | 동기화 대상에 `idle`(녹음 중 포함) 추가, 화면이 `recorder.cancel()` 호출                                                                                                                                                                                     |
| m2   | Minor  | 늦은 409 ALREADY_COMPLETED가 오류 화면을 완료 화면으로 바꿈 | 해소         | 응답 무시 조건을 store `FINISHED`·`ERROR`·`IDLE`로 확장, AC7에도 명시                                                                                                                                                                                        |
| m3   | Minor  | 20초 지연 판정이 `RECONNECTING` 왕복에 풀림                 | 해소         | 판정 기준을 메시지 반영 여부(`answerAcceptedKey` / 질문 키 변경 / `FINISHED`·`ERROR`)로 변경                                                                                                                                                                 |
| m4   | Minor  | `setAnswerAccepted`가 sequence만 비교                       | 해소         | `interview_session_id`·`question_code`(있으면) 비교 추가                                                                                                                                                                                                     |
| m5   | Minor  | 화면 책임에 우선순위 2 누락                                 | 해소         | "우선순위 2(`isWaitingNextQuestion` 대기 화면) 및 3~6"으로 수정                                                                                                                                                                                              |

## 통합 지적 사항 (중복 제거)

> 제기자 표기: Claude 원문은 보존되지 않아 "Claude m1~m3"로 오케스트레이터 요약 기준 번호를 적었다.

| #   | 심각도 | AC                                               | 지적 내용                                                                                                                                                                                                                                                  | 제기자    | 합의/판정 | 해결 방안                                                                                                                                                                                                                                                             |
| --- | ------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| m1  | Minor  | 컴포넌트 스펙(MSW·테스트), AC7, AC10, AC11, AC12 | MSW 핸들러·테스트 목록에 AC가 정의한 분기 일부가 빠져 있다. `401 → 재발급 성공 → 재시도도 401`(AC12 (a)), 본문 없는 409(AC7 기본 처리), 403(AC11 4xx 문구), 네트워크 오류(AC10). 이 분기들은 ATDD 기준이 되므로 목록에서 누락되면 테스트도 누락될 수 있다. | Claude m1 | 수용      | MSW 핸들러에 409 본문 없음, 403, 네트워크 오류(`HttpResponse.error()`), 401→재발급 성공→재시도 401을 추가한다. 테스트 목록에 각 분기의 기대 결과(AC7 `waiting`, AC11 4xx 문구 + `retryable`, AC12 (a) 로그인 이동 순서, AC10 `retryable` + 502 카운트 유지)를 적는다. |
| m2  | Minor  | AC5                                              | AC5 Then이 "phase가 `idle`로 돌아가"라고 쓰지만, 녹음 중 상태는 화면(`useAudioRecorder`) 소유이고 업로드 phase는 녹음 내내 `idle`이다. AC5에서는 업로드 훅이 호출되지도 않는다. phase 소유자 정의와 표현이 어긋난다.                                       | Claude m2 | 수용      | "녹음기 상태가 `idle`로 돌아가고(업로드 phase는 `idle` 유지) 같은 질문을 다시 녹음할 수 있다"로 고친다.                                                                                                                                                               |
| m3  | Minor  | 공통(액션 버튼 비활성 조건)                      | 버튼 표의 "다시 듣기" 행은 `recording`/`uploading`/`waiting`에서 숨긴다고만 적고, `retryable`/`text-fallback`에서 노출 여부를 정의하지 않았다.                                                                                                             | Claude m3 | 수용      | `idle`/`retryable`/`text-fallback`에서는 노출하고 #118 조건(노출 조건, TTS 재생 중 `disabled`)을 그대로 따른다고 정의한다. 재제출 가능 상태 공통 규칙, 텍스트 답변 모드 공통 동작, 화면 컴포넌트 책임에도 반영한다.                                                   |

## 기각 / 보류

- 없음. Minor 3건은 모두 수용해 기획 문서에 반영했다(최종 수용 여부는 사용자가 결정).
- Codex·Antigravity는 신규 지적이 없었다. 두 리뷰어 모두 미구현 코드(`answerAcceptedKey`, 오디오 업로드 훅, `disconnect()` 등)와 방어 동작이 정의된 확인 필요 항목을 결함으로 보지 않았다.

## 비-LLM 오라클 정박 상태

- 코드 대조(Read)
  - Codex가 `src/lib/api-client.ts`에서 재시도 `fetch`가 원 요청의 `signal`을 이어받고, CSRF·재발급은 공유 promise라는 점을 확인했다(M2 해결안의 전제와 일치).
  - Antigravity가 store 스펙(`setAnswerAccepted`/`setAudioAnswerAccepted`)과 `AnswerAcceptedPayload` 필드(`interview_session_id`, `question_code`, `sequence`), props(`isWaitingNextQuestion`, `uploadPhase`, `isTextSubmitting`/`isReconnecting`)의 1:1 매핑을 확인했다.
- 백엔드 계약(`ANSWER_ACCEPTED.sequence` 보장, 오디오 실패 후 텍스트 답변 허용, query vs multipart)은 여전히 **미검증**이다. 확인 필요 **#1·#7은 개발 착수 전 필수**로 유지한다. 다자토론 PASS는 문서 내부 정합성에 대한 판정이며 백엔드 계약을 보증하지 않는다.

## 다음 단계

1. 다자토론을 종료한다. 기획 문서 상태는 **기획 확정(다자토론 PASS)**이다. Minor 3건은 이번 라운드에서 기획 문서에 반영했다(재리뷰 불필요).
2. 사람 검증: 기획 문서의 "API 연동" 섹션(엔드포인트 매핑, 조건부 요구사항)을 사용자가 확인한다.
3. 백엔드 확인 필요 #1(쿼리 파라미터 vs multipart 필드), #7(오디오 실패 후 STOMP 텍스트 답변 허용)을 개발 착수 전에 확인한다.
4. `designer` 목업 단계로 진행한다.
