# cmux 운영 가이드 — pane/surface 제어 기본기

> cmux로 여러 CLI(TUI 포함)를 pane으로 띄우고 **Claude Code가 프로그램적으로 제어**하기 위한 조작 매뉴얼이다. 순수 cmux 기본기만 다룬다.
>
> codex/antigravity 다자 토론 같은 **구체 활용**은 별도 문서 [`discussion-guide.md`](./discussion-guide.md)를 참조한다 — 토론을 위해 pane을 활용하는 모든 절차(자동 권한 기동, 응답 완료 프로토콜, 워처, 검증 방법론)는 거기에 있다.
>
> **환경**: macOS · cmux 0.63+ · Claude Code (run_in_background 지원)

---

## 1. 핵심 개념

- **surface vs pane**: 명령은 항상 **`--surface surface:N`** 으로 대상을 지정한다. `--pane pane:N`은 focused 리다이렉트 위험이 있어 비권장.
- 계층: `window > workspace > tab > surface(=pane 콘텐츠)`. 각 surface가 하나의 터미널 화면.
- Claude Code 자신도 하나의 surface에서 돈다 → `cmux identify`로 자기 surface를 먼저 파악.

---

## 2. 환경 확인 & identify

```bash
cmux --version       # 0.63+
cmux identify        # 현재 호출 pane의 surface_ref / workspace_ref / window_ref 등
```

`cmux identify` 출력에서 `surface_ref`(예: `surface:29`)와 `workspace_ref`(예: `workspace:10`)를 기억해 둔다. 이후 명령의 기준점이 된다.

---

## 3. pane 분할 & 탭 이름

```bash
# 분할 — 방향(right/down/left/up) + 기준 workspace, 필요 시 기준 surface 지정
cmux new-split right --workspace workspace:N                       # 우측에 새 surface 생성 → "OK surface:M" 반환
cmux new-split down  --workspace workspace:N --surface surface:M   # 특정 surface 기준 아래로 분할

# 탭 이름 지정 (가독성)
cmux rename-tab --surface surface:N <name>
```

- `new-split`은 생성된 새 surface 번호를 반환한다(`OK surface:M ...`) → 그 번호를 변수처럼 기억해 다음 명령에 사용.

---

## 4. 입력 보내기 — send / send-key

```bash
cmux send     --surface surface:N '<텍스트>'     # 입력란에 텍스트 붙여넣기
cmux send-key --surface surface:N enter           # 키 입력(enter 등). 텍스트 전송 후 별도로 enter

# 큰 멀티라인은 셸 치환으로
cmux send --surface surface:N "$(cat path/to/prompt.txt)"
cmux send-key --surface surface:N enter
```

- `send`(텍스트)와 `send-key enter`(실행)는 **분리**해서 호출한다.
- ⚠️ **멀티라인 paste 한계**: 일부 TUI는 수백 줄 paste 시 timeout/깨짐 → 파일 첨부 입력(`@<path>`)을 지원하는 TUI면 그쪽이 안전.
- ⚠️ **잔여 입력 + 다음 송신 합쳐짐**: 직전 입력이 남아 있으면 다음 송신과 섞인다 → 송신 직전 빈 `enter` 또는 `clear`로 입력란 비우기.

---

## 5. 화면 읽기 — read-screen

```bash
cmux read-screen --surface surface:N --lines 30                       # 현재 화면 하단 N줄
cmux read-screen --surface surface:N --scrollback --lines 1500 | tail -200   # 스크롤백 포함
```

- ⚠️ **`--lines`를 넉넉히**: TUI 줄바꿈(wrap) 때문에 시각상 10줄이 실제 수십 줄로 저장된다. 응답 전문 회수엔 `--lines 1500~3000` 권장.
- 화면 상태를 조건으로 대기 루프를 만들 때도 read-screen을 쓴다(§6).

---

## 6. 대기 — Claude Code 런타임 주의

```bash
# ❌ 직접 sleep 금지 (Claude Code 런타임이 foreground sleep 차단)
# ✅ run_in_background: true Bash + until 루프
until <조건>; do sleep 3; done
```

- **`sleep 60` 같은 foreground 대기 금지** → 반드시 `run_in_background: true`로 돌리고, bg job 종료 시 자동 `<task-notification>` 푸시를 받는다(Claude는 폴링하지 않음).
- 조건 예: 특정 파일 존재(`[ -f signal ]`), 또는 화면에 작업중 패턴이 사라짐(`! cmux read-screen ... | grep -q '<패턴>'`).
- **무한 대기 방지**: 외부 신호가 안 올 수 있으면 최대 반복 캡(`[ $i -ge 100 ]`)을 같이 둔다.

---

## 7. 레이아웃 & 일반 주의

- **16:9 미만 모니터에서 다중 pane(예: 3개)은 좁다** → pane 수를 줄이거나 별도 워크스페이스로 분리.
- **장수(long-lived) TUI는 `exit` 금지** — 종료하면 그 세션의 컨텍스트가 사라진다. 세션 내내 살려둔다.
- 항상 `--surface`로 대상을 명시 — focused 리다이렉트로 엉뚱한 pane에 입력되는 사고 방지.

---

## TL;DR

1. `cmux identify`로 내 surface/workspace 파악.
2. `cmux new-split right/down --workspace W [--surface S]` → 반환된 `surface:M` 기억 → `rename-tab`.
3. 입력: `cmux send --surface S '...'` **그리고** `cmux send-key --surface S enter` (분리). 큰 입력은 `"$(cat file)"` 또는 `@<path>`.
4. 읽기: `cmux read-screen --surface S --scrollback --lines 1500` (lines 넉넉히).
5. 대기: foreground `sleep` 금지 → `run_in_background: true` + `until` (+ 최대 반복 캡).
6. 항상 `--surface`(=`--pane` 비권장), TUI `exit` 금지.
7. **codex/antigravity 토론 등 구체 활용 → [`discussion-guide.md`](./discussion-guide.md).**
