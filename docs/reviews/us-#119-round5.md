# [#119] US/AC 다자토론 리뷰 — Round 5

- 대상 문서: `docs/plans/119-ai-stt-audio-upload.md` (round 5 리뷰 대상 = Round 4 PASS 이후 사용자 결정 반영 개정본)
- 일시: 2026-10-09
- 방식: 범위를 좁힌 집중 라운드. 내부 Agent() 병렬 스폰 + 외부 CLI 독립 리뷰(직교 렌즈, 반증 의무). Round 4 이후 사용자 결정 세 가지가 문서 전체에 일관되게 반영됐는지를 공격 대상으로 넣었다.
  1. 텍스트 답변 폴백 전면 제거(`text-fallback` phase, 502 카운터, 텍스트 제출 props·훅·UI 삭제, `retryable`에 "다시 녹음" 추가)
  2. 마이크 권한·녹음 지원을 면접 시작 전제 조건으로 변경(AC13 (A) 시작 화면 게이트, (B) 면접 도중 실패 시 단일 안내 + "다시 시도")
  3. API 확정(`question_code`/`sequence` 쿼리 파라미터, multipart는 `file`만, 확정 errorCode, 200 응답 타입)
  - 리뷰 프롬프트에 "미구현 코드는 결함 아님, 방어 동작이 정의된 확인 필요 항목은 결함 아님, 엣지케이스는 Critical 아님, 사용자 결정(텍스트 폴백 없음, 마이크 필수) 재제기 금지"를 명시했다.
- 판정: **FAIL** — Critical 0 / Major 1 / Minor 6 → **Major 수정 후 Claude(us-reviewer) 단독 재검증**

## 리뷰어

| 리뷰어      | 도구 / 버전                                                                      | 렌즈                          | Critical | Major | Minor | 원 판정 |
| ----------- | -------------------------------------------------------------------------------- | ----------------------------- | -------- | ----- | ----- | ------- |
| Claude      | `us-reviewer` 서브에이전트                                                       | 보안·엣지케이스·요구사항 충족 | 0        | 1     | 4     | FAIL    |
| Codex       | codex-cli 0.159.3 (gpt-5.6-terra, read-only sandbox)                             | 정확성·논리 비약·반례         | 0        | 0     | 0     | PASS    |
| Antigravity | agy (gemini-cli `IneligibleTierError`로 Gemini 렌즈 대체 투입, round 1~4와 동일) | 외부 사실·도메인 접지·현실성  | 0        | 0     | 2     | PASS    |

- 위 개수는 리뷰어 원문(raw) 기준이며, 이번 라운드는 심각도 조정이 없었다.
- Codex·Antigravity는 PASS였지만, Claude가 제기한 Major 1건(녹음기 `cancel()` 호출 시점 충돌)은 문서 내 두 규칙이 실제로 충돌하는 결함이라 수용했다. 따라서 통합 판정은 **FAIL**이다.
- 원본 출력
  - Codex: `.cmux/debates/119-ai-stt-audio-upload/codex-r5.md` (원본: 세션 임시 경로 `scratchpad/codex-round5.md`, 실행 헤더·프롬프트·최종 답변만 보존)
  - Antigravity: `.cmux/debates/119-ai-stt-audio-upload/agy-r5.txt` (원본: 세션 임시 경로 `scratchpad/agy-round5.txt`)
  - Claude(us-reviewer): 오케스트레이터에 인라인으로 반환됨(파일 미보존)
  - round 1~4 원본도 같은 디렉토리에 `codex-r{1,2,3,4}.md`, `agy-r{1,2,3,4}.txt`로 보존했다.

## 사용자 결정 반영 확인

3명 모두 아래 항목이 문서 전반에 일관되게 반영됐다고 판정했다.

| 항목              | Round 5 판정 | 근거                                                                                                                                                                                                                           |
| ----------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 텍스트 폴백 제거  | 반영         | phase 5종(`idle`/`recording`/`uploading`/`retryable`/`waiting`)으로 정리, 502 카운터 삭제, AC8~AC11이 모두 `retryable`("다시 제출" + "다시 녹음"). 변경 이력 외 본문에 잔존 참조 없음(Codex·Antigravity 확인)                  |
| 마이크 필수(AC13) | 반영         | 현재 `interview-start-screen.tsx`가 `allChecked`만으로 시작 가능한 점을 정확히 짚고 `micStatus === 'granted'` 게이트·`unsupported`·"다시 확인"으로 보완. `page.tsx`의 시작 화면 진입 조건(`IDLE`/`CONNECTING`, `ERROR`)과 일치 |
| API 확정          | 반영         | 쿼리 파라미터·`file` 단일 필드·200 DTO 일관. `api-client.ts`의 `errorCode` → `status` 문자열 → `apiStatus` 파싱, `FormData` 시 `Content-Type` 삭제, 재시도 `fetch`의 `signal` 전달과 부합(Codex·Antigravity 코드 대조)         |

## 통합 지적 사항 (중복 제거)

> 제기자 표기: Claude 원문은 보존되지 않아 "Claude M1, m1~m4"로 오케스트레이터 요약 기준 번호를 적었다. Antigravity는 원문 번호(Minor 1·2)를 따른다.

| #   | 심각도 | AC                                                    | 지적 내용                                                                                                                                                                                                                                                                                                                                                                                        | 제기자              | 합의/판정  | 해결 방안                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Major  | 공통(재제출 가능 상태), AC6, 컴포넌트 스펙(질문 화면) | 질문 화면 규칙 "`uploadPhase`가 `idle`로 돌아오면 `recorder.cancel()`로 경과 시간을 되돌린다"가 "다시 녹음" 흐름과 충돌한다. "다시 녹음"은 `onRerecord()`로 phase를 `retryable` → `idle`로 바꾼 뒤 화면이 비동기 `recorder.start()`를 실행한다. phase 변화 감시로 `cancel()`이 늦게 실행되면 막 시작된 새 녹음을 끊는다. AC6(`uploading` → `idle`)만을 위한 규칙이 모든 `idle` 복귀에 걸려 있다. | Claude M1           | 수용       | 공통 규칙에 "녹음기 `cancel()` 호출 시점"을 신설해 호출 경우를 AC5 판정, AC6(`uploading` → `idle`), 답변 수락 동기화 중 녹음으로 한정했다. AC6의 `cancel()`은 phase 변화 effect가 아니라, 업로드 훅이 반환하는 `UploadResult`(`'rerecord-required' \| 'none'`)를 받아 제출·다시 제출 핸들러에서 명시적으로 호출한다(`submit`/`resubmit`, `onSubmitAudio`/`onResubmit` → `Promise<UploadResult>`). "`retryable` → `idle`(다시 녹음) 전이에서는 `cancel()`을 호출하지 않는다"를 명시하고, `cancel()`을 언급하는 모든 위치(동기화 규칙, AC5, AC6, 질문 화면 책임, props)를 맞췄다. 검증 시나리오 5와 테스트를 추가했다. |
| m1  | Minor  | AC13 (A), 컴포넌트 스펙(시작 화면)                    | 시작 화면의 카메라 effect(`interview-start-screen.tsx` L47-48)도 `navigator.mediaDevices.getUserMedia`를 가드 없이 호출한다. 마이크만 가드하면 `navigator.mediaDevices`가 없는 환경에서 카메라 쪽 예외로 화면이 깨질 수 있다.                                                                                                                                                                    | Claude m1           | 수용       | `navigator.mediaDevices?.getUserMedia`가 없으면 카메라 `getUserMedia`를 호출하지 않고 `cameraStatus`를 `denied`로 둔다. 카메라 게이트 규칙(시작 조건에 포함 안 함)은 바꾸지 않는다. 테스트 "`navigator.mediaDevices` 미존재 → 예외 없이 마이크 `unsupported` + 카메라 `denied`"를 추가했다.                                                                                                                                                                                                                                                                                                                          |
| m2  | Minor  | AC13 (A)                                              | 마이크 `checking` 동안에도 "마이크 권한을 허용해야 면접을 시작할 수 있어요."가 보여, 아직 거부되지 않은 사용자에게 오해를 준다.                                                                                                                                                                                                                                                                  | Claude m2           | 수용       | `checking`이면 사유 문구를 "마이크 확인 중..."으로 보여준다. 상태별(`checking`/`denied`/`unsupported`/`granted`) 사유 문구를 목록으로 정리했다.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| m3  | Minor  | AC13 (A), 향후 고려사항                               | 시작 화면에서 `NotFoundError`(장치 없음)·`NotReadableError`(다른 앱 점유)도 `denied`로 처리되어 "브라우저 설정에서 마이크 권한을 허용해주세요."가 표시된다. 원인과 문구가 맞지 않는다.                                                                                                                                                                                                           | Claude m3           | 수용(보류) | 이번 범위에서는 현재 방식(권한 거부 문구)을 유지하고 AC13 (A)에 명시했다. 오류 종류별 문구를 향후 고려사항 "마이크 오류 종류별 문구(시작 화면·면접 도중 공통)"로 옮겼다.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| m4  | Minor  | AC13 (A)                                              | 오류 화면의 "면접 시작하기"는 `reset()`만 호출한다. store가 `IDLE`이 되면 오류 화면 쪽 시작 화면이 내려가고 `IDLE` 쪽 시작 화면이 새로 마운트되어, 마이크 확인과 체크리스트가 처음부터 다시 진행된다. 이 동작이 의도인지 문서에 없다.                                                                                                                                                            | Claude m4           | 수용       | AC13 (A) Given에 이 흐름(재마운트 → 마이크 `checking`부터 재확인 → 체크리스트 초기화 → "면접 시작하기" 재클릭)을 의도된 동작으로 적었다. 테스트 항목을 추가했다.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| m5  | Minor  | AC13 (A), 컴포넌트 스펙(시작 화면)                    | `STATUS_TAG[micStatus]`에 `unsupported` 항목의 라벨·스타일이 정의되어 있지 않아 구현 누락이나 타입 오류가 생길 수 있다.                                                                                                                                                                                                                                                                          | Antigravity Minor 1 | 수용       | `unsupported: { label: '지원되지 않음', className: 'bg-slate-200 text-slate-600' }`를 명시했다. 카메라와 공유하는 `PermissionStatus` 타입을 넓히거나 마이크 전용 타입으로 분리한다고 적었다.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| m6  | Minor  | AC13 (A), 컴포넌트 스펙(시작 화면)                    | 마이크 테스트 영역은 현재 `denied`일 때만 경고 아이콘을 보여주고 그 외에는 음파 막대를 그린다. `unsupported`는 `getUserMedia`를 호출하지 않으므로 음파 막대가 의미 없다.                                                                                                                                                                                                                         | Antigravity Minor 2 | 수용       | `denied`·`unsupported`일 때 음파 막대 대신 `AlertCircle` 경고 아이콘 + 상태 문구(`denied`면 "다시 확인" 포함)를 보여준다고 명시했다. `checking`/`granted`는 기존 표시를 유지한다.                                                                                                                                                                                                                                                                                                                                                                                                                                    |

## 기각 / 보류

- 기각: 없음.
- 보류: m3(오류 종류별 문구)는 사용자 지시에 따라 이번 범위에서는 현재 문구를 유지하고 향후 고려사항으로 옮겼다.
- Codex는 신규 지적이 없었다. Antigravity의 Minor 2건은 Claude 지적과 겹치지 않아 별도 항목(m5, m6)으로 반영했다.

## 비-LLM 오라클 정박 상태

- 코드 대조(Read)
  - Codex·Antigravity가 `src/lib/api-client.ts`의 오류 본문 파싱(`errorCode` → `status` 문자열 → `apiStatus`), `FormData` 시 `Content-Type` 삭제, 재시도 `fetch`의 `signal` 전달, 재발급 실패 메시지(`'Access token reissue failed'`)를 확인했다.
  - Antigravity가 `src/app/applicant/interview/page.tsx`의 시작 화면 진입 조건(`IDLE`/`CONNECTING`, `ERROR && errorMessage`)과 AC13 (A) Given이 일치함을 확인했다.
  - 오케스트레이터가 `interview-start-screen.tsx`를 확인했다: 카메라 effect(L47-48)와 마이크 effect(L75-76)가 모두 `navigator.mediaDevices.getUserMedia`를 가드 없이 호출하고, 카메라·마이크가 `PermissionStatus`·`STATUS_TAG`를 공유하며, 마이크 테스트 영역은 `denied`일 때만 `AlertCircle`을 보여준다(m1·m5·m6의 전제와 일치). `page.tsx`에서 오류 화면의 `InterviewStartScreen`은 `onStart={handleRetryFromError}`(`reset()`만 호출)이고 `IDLE` 분기와 다른 위치에 렌더되어 재마운트된다(m4의 전제와 일치).
- 백엔드 계약: API 스펙 확정으로 확인 필요 #1·#3이 해결되었고 #7은 불필요해졌다. 남은 항목(#2, #4~#6, #8~#12)은 모두 프론트 방어 동작이 정의되어 있어 개발 착수 전 필수 항목이 아니다.

## 다음 단계

1. M1과 Minor 6건을 기획 문서에 반영했다(`docs/plans/119-ai-stt-audio-upload.md` 변경 이력 "Round 5 리뷰 반영").
2. **Claude(us-reviewer) 단독 재검증**: M1 해소 여부(`cancel()` 호출 시점 세 경우 한정, `UploadResult` 반환 경로, "다시 녹음" 전이에서 `cancel()` 미호출, 관련 섹션 일관성)와 Minor 반영 여부를 확인한다. Codex·Antigravity는 이번 라운드에서 PASS였으므로 재투입하지 않는다.
3. 재검증 PASS 후 사람 검증(API 연동 섹션)을 거쳐 `designer` 목업 단계로 진행한다.
