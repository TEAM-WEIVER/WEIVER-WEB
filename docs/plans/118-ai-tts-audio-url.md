# [#118] AI 면접 질문 TTS 연동 (QUESTION_READY audio_url 재생)

## User Story

US: 지원자로서, AI 면접관의 질문을 서버가 생성한 자연스러운 음성으로 듣고 싶다. 왜냐하면 브라우저 기본 TTS는 기술 용어 발음이 부자연스럽고 음질이 낮아 실제 면접 환경과 괴리가 있기 때문이다.

---

## Acceptance Criteria

### AC1. READY 상태 — 서버 TTS 오디오 재생

- Given: STOMP `QUESTION_READY` 메시지를 수신한 상태이고, `audio_status`가 `"READY"`, `audio_url`이 유효한 URL이다.
- When: 질문 화면이 렌더된다.
- Then:
  - 질문 텍스트가 화면에 즉시 표시된다.
  - `audio_url`을 소스로 하는 오디오가 텍스트 표시와 동시에 자동 재생된다.
  - AI 면접관 영상이 `questioning` 모드로 표시되며, 오디오 재생이 끝나면 `listening` 모드로 전환된다.
  - `ttsState.isPlaying`이 `true`로 시작해 재생 완료 시 `false`로 전이된다.

### AC2. UNAVAILABLE 상태 — 브라우저 TTS 폴백

- Given: `QUESTION_READY` 메시지의 `audio_status`가 `"UNAVAILABLE"` 또는 `null`이다.
- When: 질문 화면이 렌더된다.
- Then:
  - `window.speechSynthesis`를 사용해 질문 텍스트를 `lang: 'ko-KR'`, `rate: 0.9`로 읽어준다.
  - 기존 브라우저 TTS 폴백 흐름(onend/onerror fallbackTimer)이 정상 동작한다.
  - 면접 진행이 중단되지 않는다.

### AC3. 오디오 로드 실패 시 브라우저 TTS 폴백

- Given: `audio_status`가 `"READY"`이지만 오디오 로드가 실패한다(`Audio` 객체의 `error` 이벤트 발생, 또는 재생 시작 후 5초 이내 `canplay` 이벤트가 오지 않는 타임아웃).
- When: 오디오 로드 오류 또는 타임아웃이 감지된다.
- Then:
  - 재생 중이던 오디오를 즉시 중단한다(`pause()`).
  - `speechSynthesis.cancel()`을 선행 호출한 후 AC2와 동일하게 `window.speechSynthesis` 폴백을 실행한다.
  - `error` 이벤트와 5초 타임아웃 중 먼저 발화된 쪽이 나머지를 취소(`clearTimeout` / 리스너 제거)하여 폴백이 두 번 실행되지 않도록 한다.
  - 사용자에게 별도 오류 메시지를 표시하지 않는다.
  - 면접 진행이 중단되지 않는다.

### AC4. 다시 듣기 — 재생 경로별 재실행

- Given: 질문 TTS 재생이 완료된 상태이다.
- When: 지원자가 다시 듣기 버튼을 클릭한다.
- Then:
  - **READY 경로로 재생됐던 경우**: 기존 `Audio` 객체의 `currentTime`을 0으로 재설정하고 `play()`를 호출한다 (브라우저 캐시 활용, 단 Safari + 만료 URL 조합 시 AC3 오류 폴백으로 진입할 수 있음). 재생 중이었다면 먼저 중단 후 처음부터 재시작한다.
  - **UNAVAILABLE/폴백 경로로 재생됐던 경우**: `speechSynthesis.cancel()`을 선행 호출한 후 `speechSynthesis.speak()`를 재실행한다.
  - 재생 중에는 AI 면접관 영상이 다시 `questioning` 모드로 전환된다.
  - 컴포넌트 unmount 시 `pause()` 및 `src = ''`로 오디오 객체를 정리하여 메모리 누수를 방지한다.

### AC5. Safari 자동재생 차단 대응

- Given: Safari 등 브라우저가 자동재생 정책으로 `audio.play()`를 거부한다(`play()` Promise가 `NotAllowedError`로 reject).
- When: `play()` 호출이 실패한다.
- Then:
  - `ttsState.isPlaying`을 `false`로 유지한다 (재생이 시작되지 않았으므로 상태 변경 없음).
  - `isPlayBlocked: true` 상태로 전환되어 수동 재생 버튼이 화면에 표시된다.
  - 수동 재생 버튼 클릭 시 (사용자 제스처가 있으므로) 서버 TTS `audio.play()`를 재시도한다. 이 시도도 실패하면 `speechSynthesis` 폴백을 실행한다.
  - 다음 `QUESTION_READY` 메시지 수신 시 `isPlayBlocked`를 `false`로 초기화하고 수동 재생 버튼을 숨긴다.
  - 면접 진행이 중단되지 않는다(답변 버튼은 여전히 활성화 가능).

### AC6. 기존 speechSynthesis 코드 제거 및 타입 정의

- Given: 리팩토링 완료 후.
- When: 코드베이스를 확인한다.
- Then:
  - `interview-question-screen.tsx`에서 `window.speechSynthesis.speak()` 직접 호출 코드가 제거된다.
  - `audio_status: "UNAVAILABLE"` 및 `audio_status: null` 폴백 경로에서만 `speechSynthesis`가 사용된다.
  - `QuestionReadyPayload` 타입에 `audio_url: string | null`과 `audio_status: 'READY' | 'UNAVAILABLE' | null` 필드가 추가된다.

---

## API 연동

> STOMP `QUESTION_READY` 메시지 기반으로 동작하며, 해당 메시지 스키마는 OpenAPI 스펙에 등록되어 있지 않다.
> 아래는 이슈 기술 스펙 기준으로 작성하였으며, 현재 배포 완료된 서버(PR #157~#162)를 기준으로 한다.

| AC  | 프로토콜     | 경로                     | 수신 메시지 타입 | 관련 필드                                                        |
| --- | ------------ | ------------------------ | ---------------- | ---------------------------------------------------------------- |
| AC1 | STOMP SUB    | `/user/queue/interviews` | `QUESTION_READY` | `audio_status: "READY"`, `audio_url: string`                     |
| AC2 | STOMP SUB    | `/user/queue/interviews` | `QUESTION_READY` | `audio_status: "UNAVAILABLE"` 또는 `null`                        |
| AC3 | (클라이언트) | —                        | —                | `Audio` 객체 `error` 이벤트 또는 5초 타임아웃 → 폴백             |
| AC4 | (클라이언트) | —                        | —                | READY: `currentTime = 0; play()` 재사용 / 폴백: `speak()` 재실행 |
| AC5 | (클라이언트) | —                        | —                | `play()` Promise reject → `isPlayBlocked: true` → 수동 재생 버튼 |

### QUESTION_READY 메시지 스키마 (신규 필드)

```json
{
  "type": "QUESTION_READY",
  "interview_session_id": "...",
  "question_code": "...",
  "sequence": 1,
  "question": "...",
  "audio_url": "https://...",
  "audio_status": "READY"
}
```

> `audio_url` 유효 시간: 30분 (서버 재발급 없음)
> `audio_status` 가능 값: `"READY"` | `"UNAVAILABLE"` | `null`

### 재생 방식 결정 (CORS 고려)

- `<Audio src="...">` 방식 사용 → 추가 CORS 헤더 불필요
- `fetch/blob` 방식 사용 시 백엔드 CORS 설정 필요 → **백엔드 협의 필요**

[사람 검증 요청]
docs/plans/118-ai-tts-audio-url.md 의 "API 연동" 섹션을 검토해주세요.

- `audio_url` / `audio_status` 필드명 및 타입이 실제 서버 응답과 일치하는지
- `Audio src` 방식과 `fetch/blob` 방식 중 어느 것을 사용할지 (CORS 설정 여부)
- 다시 듣기 시 audio_url URL이 30분 내에는 재사용 가능한지 재확인

---

## 컴포넌트 스펙

- 변경 대상 파일:
  - `src/app/applicant/interview/_components/interview-question-screen.tsx` — TTS 로직 교체
  - `src/store/interview-store.ts` — `QuestionReadyPayload`에 `audio_url`, `audio_status` 필드 추가
- 사용할 Web API:
  - `new Audio(audio_url)` — 서버 TTS 재생
  - `window.speechSynthesis` — UNAVAILABLE / null / 로드 실패 폴백 전용
- 상태 관리:
  - 기존 `ttsState` (isPlaying, isDone) 유지
  - 현재 `Audio` 객체 ref (`audioRef`) 추가 — 다시 듣기 재사용, 질문 교체 시 정지 및 교체
  - Safari 자동재생 차단 감지 상태 (`isPlayBlocked`) 추가
  - 재생 경로 추적 (`playedVia: 'server' | 'fallback'`) — 다시 듣기 시 올바른 경로로 재실행
- 접근성 주의사항:
  - 다시 듣기 버튼: `aria-label="질문 다시 듣기"`
  - 자동재생 차단 시 표시되는 수동 재생 버튼: `aria-label="질문 음성 재생"`
  - 재생 중 AI 면접관 영상 모드 전환은 `aria-hidden="true"` 유지 (시각적 장식)

---

## 향후 고려사항

- `audio_url` 30분 만료 후 다시 듣기 시도 시(면접이 매우 길어진 경우): 현재 서버는 재발급을 지원하지 않으므로 만료된 URL로 로드 시 AC3(오류 폴백)으로 처리됨. 별도 만료 안내 UX는 이번 범위 제외.
- 오디오 재생 중 음소거(mute) 또는 볼륨 제어 UI: 이번 범위 제외.
- 다중 탭에서 동시에 면접 진행 시 Audio 객체 중복 재생 경쟁 조건: 이번 범위 제외.
- `audio_status` 필드가 누락된 구버전 서버 응답 호환: 필드 없을 경우 `UNAVAILABLE` 폴백으로 처리 (방어 코드 추가 권장).
- 질문 준비 중 상태 표시(음성 준비 약 7초 소요): SUBSCRIBED 상태에서 이미 스피너 표시 중이므로 추가 UX는 향후 검토.
