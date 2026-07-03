# 다자(多者) 토론 운영 가이드 — Claude × Codex × Gemini (+ N)

> **이 문서는 Claude Code 세션의 다자(多者) 토론 운영 매뉴얼**이다. Claude(오케스트레이터)가 codex·antigravity 등 외부 AI와 인터랙티브 토론을 시작·운영할 수 있어야 한다. **기본 참여자는 Claude + Codex + Gemini이며, 같은 패턴(pane 추가 + 시그널 네이밍)으로 N명까지 확장 가능**하다. 사용자가 언제든 같은 pane에 끼어들 수 있는 구조가 필수.
>
> **cmux 조작 기본기**(surface/pane, split, send/send-key, read-screen, identify)는 별도 문서 [`cmux-guide.md`](./cmux-guide.md)를 참조한다. 이 문서는 그 기본기 위에서 **토론을 어떻게 굴리는가**에 집중한다.
>
> **환경**: macOS · cmux 0.63+ · codex 0.120+ · antigravity 0.45+ · Claude Code (run_in_background 지원)

---

## 1. 한 그림 + 핵심 원칙

```
┌─────────────────────────── cmux window ──────────────────────────┐
│  ┌─── surface:CL (claude) ────┐  ┌── surface:CX (codex) ────┐   │
│  │  Claude Code (오케스트레이터) │  │  codex CLI (TUI)          │   │
│  │  - cmux send/send-key       │  │  - Claude/사용자 공용     │   │
│  │  - bg Bash로 시그널 대기     │  │  - 멀티턴 컨텍스트 유지   │   │
│  │  - 사용자와 직접 대화        │  └──────────────────────────┘   │
│  │                             │  ┌── surface:GM (antigravity) ┐   │
│  │                             │  │  Antigravity CLI (TUI)     │   │
│  │                             │  │  - Claude/사용자 공용      │   │
│  └─────────────────────────────┘  └───────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
        ↕ 양방향 통신 = cmux send + 파일 시그널 (codex/antigravity 동일 패턴)
```

**핵심 원칙**:

0. **역할 분리 — 토큰 낭비 방지**: 프롬프트 파일 작성·슬러그 생성·결과 파일 저장은 **Claude(오케스트레이터)가 직접** 처리한다. 서브에이전트에는 "디스패치 + 대기 + 화면 수집"만 위임한다. 오케스트레이션 전체를 서브에이전트에 넘기면 read-screen 반복·파일 I/O가 누적되어 불필요한 토큰이 소비된다.

1. codex/antigravity pane은 모두 **Claude + 사용자 공용 인터랙티브 세션**. Claude가 자동 디스패치하는 동시에 사용자가 직접 끼어들 수 있어야 함.
2. **인터랙티브 디폴트** — `codex` / `antigravity` TUI를 세션 내내 살려둠 (`exit` 금지, 컨텍스트 손실).
3. **처음부터 자동 권한 부여로 기동** — codex/antigravity를 권한 확인(approval) 없이 호출한다(§3). 토론의 응답 완료 시그널이 shell 명령이라 매번 승인이 뜨면 자동화가 깨지기 때문. 사용자 부담 0회.
4. Claude → 외부 AI: `cmux send --surface surface:XX '...'` + `cmux send-key --surface surface:XX enter`
5. 외부 AI → Claude: 응답 끝에 `touch .cmux/{model}-rN.done` + `cmux send --surface surface:CL '...'` 시그널 (§4.1)
6. Claude 측 대기: `run_in_background: true` Bash + `until [ -f signal ] && ! grep -qE '<작업중패턴>' ; do sleep 3; done` (자동 알림 푸시, 폴링 X)
7. **시그널·프롬프트·출력은 프로젝트 내부 `.cmux/` 폴더**에 둔다. `/tmp`처럼 OS tmp 영역을 쓰지 않는다 — 프로젝트별 격리 + git 추적 차단(`.gitignore`)이 목적.
8. **토론 ≠ 검증.** 참여 모델(claude·codex·antigravity…)은 모두 LLM이라 실패 모드가 **상관(correlated)**된다. 합의는 분산은 줄여도 편향은 못 줄인다 → 기본값이면 "서로 돕는 협력자"가 되어 *확신에 찬 오답*으로 수렴. **§9의 4대 장치로 토론을 협력에서 검증으로 전환**한다. 본 매뉴얼의 가장 중요한 품질 원칙.

---

## 2. 사전 준비 (세션 시작 시 1회)

```bash
cmux --version       # 0.63+   (cmux 기본기는 cmux-guide.md)
codex --version      # 0.120+
antigravity --version     # 0.45+
cmux identify        # 현재 Claude pane surface/workspace 확인 → surface:CL
# ★ 토론마다 전용 폴더 — 주제별 격리(다른 주제가 이전 기록을 덮어쓰지 않음) + 영구 보존
SLUG=<주제-kebab-슬러그>            # 예: tenth-man-independence
mkdir -p .cmux/debates/$SLUG       # 이 토론의 모든 산출물(board·프롬프트·시그널·per-model)이 여기 들어간다
```

- `cmux identify` 출력의 `surface_ref`/`workspace_ref` 기억. 이후 Claude=`surface:CL`로 추상 표기.
- **★ 경로 규약(중요)**: 이 문서에서 편의상 `.cmux/X`로 쓰는 모든 경로는 **실제로는 `.cmux/debates/$SLUG/X`** 다(board=`board.md`, 프롬프트=`{model}-prompt-rN.txt`, 시그널=`{model}-rN.done`, per-model=`{model}-rN.md`). **새 주제 = 새 SLUG = 새 폴더 → 덮어쓰기 없음, 이전 토론은 그대로 아카이브로 보존.**
- `.cmux/`는 `.gitignore`에 `.cmux/*` + `!.cmux/.gitignore`로 등록 → 디렉토리만 추적, 내용물은 무시.

---

## 3. 토론용 다중 pane Setup + **자동 권한 기동** (1회)

cmux 분할·이름 지정 명령의 의미는 [`cmux-guide.md`](./cmux-guide.md) 참조. 여기서는 토론 전용 배치 + **승인 없이 기동**이 핵심이다.

```bash
# 1) Claude 좌측 전체 + 우측을 codex/antigravity 위아래로 분할
cmux new-split right --workspace workspace:N                       # → surface:CX (codex)
cmux new-split down  --workspace workspace:N --surface surface:CX  # → surface:GM (antigravity)

# 2) 탭 이름
cmux rename-tab --surface surface:CL claude
cmux rename-tab --surface surface:CX codex
cmux rename-tab --surface surface:GM antigravity

# 3) ★ 자동 권한 부여로 TUI 기동 (승인 프롬프트 없음 = Claude 즉시 디스패치 가능) ★
#    codex: shell 포함 전부 자동, 단 워크스페이스 밖 쓰기는 sandbox로 차단
cmux send --surface surface:CX 'codex --sandbox workspace-write --ask-for-approval never' && cmux send-key --surface surface:CX enter
#    antigravity: YOLO (모든 도구 자동, shell 포함)
cmux send --surface surface:GM 'antigravity' && cmux send-key --surface surface:GM enter

# 4) 약 10~15초 후 부트스트랩 확인 (run_in_background 권장)
cmux read-screen --surface surface:CX --lines 20 | tail -10
cmux read-screen --surface surface:GM --lines 20 | tail -10
```

**왜 자동 권한이 기본인가**: 응답 완료 프로토콜(§4.1)이 `touch` + `cmux send`라는 **shell 명령**을 동반한다. shell까지 자동 통과되는 모드가 아니면 매 라운드 승인이 떠 토론 자동화가 깨진다. 따라서 토론에서는 위 옵션이 **사실상 필수 기본값**이다. (보안 우선 대안은 §6.)

**레이아웃 결과**:

```
┌───── claude (좌측) ────┐ ┌─── codex (우측 상단) ──┐
│                       │ ├──────────────────────┤
│                       │ │  antigravity (우측 하단) │
└───────────────────────┘ └──────────────────────┘
```

> ➕ **참여자 확장**: 4번째 이상도 동일 패턴 — `new-split`로 pane 추가 → 자동 권한으로 기동 → 시그널 파일명을 참여자별 `{model}`로 구분(`.cmux/{model}-rN.done`). 렌즈(§9.2)도 새 참여자에 직교로 배정.
> ⚠️ 16:9 미만 모니터에서 다중 pane(기본 3개)은 너무 좁아짐 → 참여자를 줄이거나 별도 워크스페이스로 분리.
> ⚠️ **antigravity 첫 기동 trust 프롬프트**: 신뢰 안 된 폴더면 "Do you trust the files in this folder?"가 뜨고 선택 시 CLI가 재시작될 수 있다(§7-#10). 자동화 전제라면 워크스페이스를 미리 trust 처리하거나, 첫 라운드는 시그널 누락을 가정하고 pane 직접 회수(§4.3).
> ⚠️ codex 자동 기동 옵션명은 버전(0.130+) 기준. 다르면 `~/.codex/config.toml`에 sandbox/approval을 미리 설정.

---

## 4. 토론 운영

### 4.1 응답 완료 프로토콜 (모든 프롬프트 말미에 강제)

````text
(본 질문/지시)

⚙️ 응답 완료 프로토콜 (필수)
답변을 **완전히 pane에 출력한 후에만** 다음 shell 명령을 순서대로 실행:

```bash
touch .cmux/{model}-r${TURN}.done
cmux send --surface surface:CL "[{model} → claude] R${TURN} 완료"
cmux send-key --surface surface:CL enter
````

````

`{model}` = `codex` 또는 `antigravity`. Claude 워처가 같은 시그널 파일을 감시.

⚠️ **codex 타이밍 버그** (antigravity는 덜 빈번): "답변 완료 후"로는 부족. codex가 reasoning 직후 시그널을 답변 print **전**에 보낼 수 있음. 반드시 **"답변 텍스트를 완전히 출력한 후"**라고 강조 + §4.2의 병행 감지 사용.

### 4.2 프롬프트 전송 + 응답 대기

```bash
# 작은 프롬프트는 직접 paste, 큰 프롬프트는 @<path> 첨부
cmux send --surface surface:CX "$(cat .cmux/codex-prompt-r${TURN}.txt)"
cmux send-key --surface surface:CX enter

# antigravity는 큰 paste 시 cmux send timeout 위험 → @path 패턴 강력 권장
cmux send --surface surface:GM "@.cmux/antigravity-prompt-r${TURN}.txt 의 지시대로 작업. 응답 완료 프로토콜 포함."
cmux send-key --surface surface:GM enter

# Claude 측 대기 (run_in_background: true 필수, 직접 sleep 차단)
# codex
until [ -f .cmux/codex-r${TURN}.done ] && ! cmux read-screen --surface surface:CX --lines 30 | grep -q 'Working ('; do
  sleep 3
done
# antigravity
until [ -f .cmux/antigravity-r${TURN}.done ] && ! cmux read-screen --surface surface:GM --lines 30 | grep -qE 'Thinking|esc to cancel'; do
  sleep 3
done
````

bg job 종료 시 Claude Code가 자동 `<task-notification>` 푸시. **Claude는 폴링 X**.

⚠️ **시그널 누락 대비 워처(권장)** — codex가 실행 누락하거나 antigravity가 재시작되면 `.done`이 안 생겨 무한 대기한다. 최대 대기 캡으로 탈출 → §4.3 직접 회수.

```bash
# done OR idle 지속 → 탈출. 5분(100*3s) 캡.
i=0
until { [ -f .cmux/codex-r${TURN}.done ] && ! cmux read-screen --surface surface:CX --lines 30 | grep -q 'Working ('; } || [ $i -ge 100 ]; do
  sleep 3; i=$((i+1))
done
# 탈출 후 .done 없으면 시그널 누락 → cmux read-screen으로 직접 회수 (§4.3)
```

⚠️ **`.done` 조기 오발신(premature signal) 대비 — pane idle-streak 워처(실측 권장)**: 모델이 _완료 전에_ 응답 완료 프로토콜 shell을 먼저 실행해 `.done`이 생겼는데 pane은 아직 `Working/Thinking`인 경우가 있다(실측: antigravity R2). `.done` 단독 신뢰 금지 → **작업중 패턴이 연속 N회 사라질 때만** 완료로 판정.

```bash
# .done 무시, pane idle이 연속 2회일 때 완료. 캡 140*4s≈9분.
idle=0; i=0
until [ $idle -ge 2 ] || [ $i -ge 140 ]; do
  if cmux read-screen --surface surface:CX --lines 30 | grep -qE 'Working \(|Thinking|esc to cancel'; then idle=0; else idle=$((idle+1)); fi
  sleep 4; i=$((i+1))
done
```

### 4.3 응답 읽기

```bash
# 외부 AI에게 .md로 저장 지시했다면 → 파일 직접 Read (가장 깔끔)
# Read('.cmux/codex-round3.md')

# 또는 pane scrollback 캡처 (TUI wrap 고려해 lines 넉넉히)
cmux read-screen --surface surface:CX --scrollback --lines 1500 | tail -200
```

시그널이 누락돼도 이 방법으로 응답 전문을 회수할 수 있다. 토론 신뢰성의 최종 안전망.

### 4.4 사용자 직접 대화 (인터랙티브의 핵심 효용)

Claude가 디스패치 안 한 시점에도 codex/antigravity pane은 살아있음. 사용자가 ⌘+숫자 또는 클릭으로 포커스 이동 후 직접 키 입력 → **같은 세션에 자유롭게 대화**, 컨텍스트 누적.

**충돌 방지**: Claude가 `cmux send` + enter 친 직후에 사용자가 끼어드는 게 안전. Claude는 send 시작 전 pane이 idle인지 `read-screen` 한 번 체크하면 더 안전.

### 4.5 공유 칠판 토론 모드 (blackboard + turn-token) — 권장

§4.1~4.3 기본형은 **Claude가 매 발화를 relay하는 별(star) 구조**다. Claude가 요약·재구성하므로 모델들이 서로의 **원문**에 반응하지 못하고, Claude가 단일 편향점이 된다. 진짜 다자 토론에 가깝게 하려면 **교환 매체를 "Claude 중계"에서 "공유 칠판 + 턴 토큰"으로** 바꾼다.

**역할 분리 (핵심)**:

- **내용(content)은 공유 칠판으로** — 모든 참여자가 `.cmux/board.md`를 직접 읽고 append → 서로의 원문을 본다(중계 왜곡 0).
- **흐름(flow)은 Claude가 통제** — 누가 다음에 말할지·언제 지정 반대자를 투입할지·언제 종료할지. Claude는 *relay*가 아니라 _진행자(moderator)_.
- **board는 단일 진실원천(append-only)** — 모든 턴은 반드시 board.md에 착지한다. per-model `{model}-rN.md`는 백업, **pane scrollback은 primary가 아니다**(TUI 버퍼 한계로 소실 가능). 동시 쓰기 충돌은 턴 토큰으로 방지.
- **★ 진행자는 매 턴 _착지 확인_ (기록 누락 방지 핵심)** — `.done` 신호만 믿지 말고(조기 오발신·산출 누락 가능, §7-#13), 다음 턴으로 넘기기 _전에_ board에 해당 턴이 실제로 들어왔는지 확인: `grep -q "R${TURN} · ${model}" .cmux/debates/$SLUG/board.md`. 누락이면 §4.3로 pane/파일에서 회수해 **진행자가 직접 board에 보정 기입** 후 진행.

**파일 2개**:

```bash
.cmux/board.md   # append-only 전사. 형식: "## R{n} · {speaker}\n<발언>\n"
.cmux/turn        # 현재 발언권 보유자 한 줄 (codex|antigravity|claude|done) — Claude가 세팅
```

**각 참여자에게 한 번 주는 규칙 프롬프트** (이후 Claude는 트리거만):

```text
[다자 토론 · 공유 칠판 모드]
1) 발언 전 .cmux/board.md를 끝까지 읽어라. 직전 발화의 *원문을 인용·직접 반박*하라(요약 금지).
2) 네 발언을 board.md에 append: "## R{n} · {you}\n<내용>\n"
3) 네 렌즈(§9.2)를 지켜라. '지정 반대자'로 호명되면 직전 합의를 전제부터 공격(§9.1).
4) 출력 완료 후에만: touch .cmux/{you}-rN.done ; cmux send --surface surface:CL "[{you}] R{n} 칠판 갱신" ; cmux send-key --surface surface:CL enter
```

**Claude(진행자) 루프**:

```bash
# 1) 다음 발언자 지정 + 트리거 (relay 아님 — 칠판 가리키기만)
echo "codex" > .cmux/turn
cmux send --surface surface:CX "네 차례다. .cmux/board.md 읽고 R${TURN} 발언 append. 규칙 프롬프트대로."
cmux send-key --surface surface:CX enter
# 2) done 대기(§4.2 캡 워처) → board.md를 Claude가 직접 Read (요약 아님, 흐름 판단용)
# 3) 다음 발언자 세팅. 빠른 만장일치면 turn을 '지정 반대자'로 돌려 한 번 더 공격(§9.1)
# 4) 무결함 K라운드면  echo "done" > .cmux/turn  로 종료(§9.4)
```

**옵션 — 피어 직접 트리거**: 지연을 더 줄이려면 발언자가 끝에 직접 다음 pane을 깨운다(`cmux send → 다른 surface`). 단 **턴 토큰 규율 필수** — 없으면 동시 쓰기로 〈월드워Z〉식 "아군 사격"(서로 덮어쓰기)이 난다. 토큰 보유자만 쓰게 강제.

> ⚠️ **인터랙티브성 ↑ = 상관 ↑**: 칠판으로 서로 원문을 실시간에 가깝게 보면 *앵커링·거짓 합의가 더 빨리 수렴*한다(고대역 에코챔버). 칠판 모드는 **반드시 §9 가드와 함께** — 턴 토큰(충돌 방지) + 지정 반대자(빠른 합의 차단) + 비-LLM 오라클 정박(말로 끝내지 않기). 칠판은 *반응성*을 주고, §9는 _수렴 속도를 늦춘다._

---

## 5. codex vs antigravity 차이 (토론 운영 시 알아야 할 것)

| 항목                   | codex                                                      | antigravity                                     |
| ---------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| 인터랙티브 진입        | `codex`                                                    | `antigravity`                                   |
| 자동 권한 기동         | `codex --sandbox workspace-write --ask-for-approval never` | `antigravity` (YOLO)                            |
| Headless               | `codex exec "..."`                                         | `antigravity -p "..."` (또는 `-i`로 인터랙티브) |
| 작업 중 패턴           | `Working (Ns • esc to interrupt)`                          | `Thinking... (Ns)` 또는 `esc to cancel`         |
| 멀티라인 paste         | 안정                                                       | **timeout 가능** → `@<path>` 첨부 필수          |
| 파일 첨부              | 도구 호출로 read                                           | `@<path>` 입력란 직접 (예: `@.cmux/...`)        |
| Reasoning ≠ print 버그 | **빈번**(시그널 조기 전송)                                 | 덜 빈번(대신 trust 재시작 이슈)                 |

**실전 권장**: 분량 큰 프롬프트는 두 모델 모두 **`@<file>` + 짧은 지시문**. antigravity는 필수, codex는 안정성 보강.

---

## 6. 승인 모드 (기본 = 자동, 보안 필요 시 대안)

| 옵션                           | 사용자 부담 | 위험                | 적합                     |
| ------------------------------ | ----------- | ------------------- | ------------------------ |
| **A. 처음부터 자동** (§3 기본) | **0회**     | 모든 작업 자동 통과 | 토론·리뷰 (기본값)       |
| B. 첫 1회만 승인               | 1회(~5초)   | 균형                | shell 자동이 꺼림칙할 때 |
| C. 매번 승인                   | 매 도구     | 최저                | sensitive 작업           |

**A (기본).** §3의 기동 명령이 그대로 옵션 A다. ⚠️ 모든 cmux send/shell이 자동 통과 → `rm -rf`·`git push --force` 같은 sensitive 작업도 자동 승인된다. 안전 가드:

- codex는 `--sandbox workspace-write`로 워크스페이스 밖 쓰기 차단.
- 사용자가 언제든 pane에 직접 끼어들어 진행 가로채기 가능 (§4.4).
- sensitive 운영이 필요하면 B/C로 전환.

**B (첫 1회만).** 기본 모드로 기동(`codex`/`antigravity`) → 첫 `cmux send` 때 pane에 approval → 사용자가 직접 `p` ("don't ask again for `cmux send`") → 세션 내내 allowlist. 그 후 자동.

**C (매번).** 기본 모드 + `p` 안 누름 → 매 `cmux send`마다 승인. 자동화 불가.

> **절충안 부적합**: `antigravity --approval-mode auto_edit`(shell만 묻기)는 응답 완료 프로토콜의 `touch`·`cmux send`가 shell이라 매 라운드 승인이 떠 토론 자동화가 깨진다. 단발 read/edit에만.
>
> **Claude의 권한 한계**: Claude가 `cmux send-key p`로 'p'를 대신 누르는 것은 이론상 가능하나 **비권장**(사용자 권한 부여를 AI가 대행 → 통제권 손상). 자동화 원하면 옵션 A.

---

## 7. 알려진 이슈 (운영 중 자주 hit)

1. **`sleep 60` 직접 실행 금지** — Claude Code 런타임 차단. 반드시 `run_in_background: true` + `until` 루프.
2. **antigravity 큰 paste timeout** — 수백 줄+ 프롬프트는 `@<path>` 첨부 필수.
3. **codex reasoning ≠ print 타이밍 버그** — 프롬프트에 "출력 완료 후에만" 강조 + 병행 감지(§4.2).
4. **`read-screen` 부족한 `--lines`** — TUI wrap으로 시각상 10줄이 60줄 저장. `--lines 1500~3000` 권장.
5. **TUI 종료 금지** — `exit` 시 컨텍스트 손실. 세션 내내 유지.
6. **첫 `cmux send` 승인 누락**(옵션 B/C 사용 시) — 외부 AI가 approval 대기로 정지. "pane에서 `p` 눌러주세요" 안내. (옵션 A면 발생 안 함)
7. **잔여 입력 + wrapper 송신 합쳐짐** — 송신 직전 빈 enter 또는 `clear`.
8. **Claude 디스패치 vs 사용자 직접 입력 충돌** — Claude의 send + enter 완료 후 사용자가 끼어들기.
9. **antigravity skill 충돌 경고**(0.41) — 첫 기동 시 표시돼도 무시 가능.
10. **antigravity 첫 기동 trust 프롬프트 → CLI 재시작** — 신뢰 안 된 폴더에서 "Do you trust the files in this folder?" → 선택 시 CLI 재시작(버전 갱신 포함)되며 진행 중 응답/시그널이 깨진다. 대응: 워크스페이스 미리 trust, 또는 첫 라운드는 시그널 누락 가정 + §4.3 직접 회수.
11. **antigravity가 엉뚱한 형제 파일을 읽음** — 비슷한 이름(`magazine.html` vs `magazine-draft.html`)이 있으면 지정 파일 대신 다른 걸 읽고 비평(실측됨). 대응: 프롬프트에 **정확한 경로를 못박고 "지정 파일만 읽어라"** 명시 + 회수 시 `ReadFile` 로그로 확인.
12. **외부 AI 시그널 누락으로 워처 무한 대기** — codex 실행 누락(#3) / antigravity 재시작(#10)이면 `.done` 미생성. §4.2 **최대 대기 캡 워처**로 방어 후 직접 회수.
13. **`.done` 조기 오발신(premature signal)** — 반대로, 모델이 _완료 전에_ 프로토콜 shell을 먼저 실행해 `.done`은 있는데 pane은 아직 작업중인 경우(실측: antigravity R2, `Thinking 9분+`인데 `.done` 존재). `.done` 단독 판정 금지 → §4.2 **idle-streak 워처**(작업중 패턴 연속 사라짐)로 판정. 산출물(파일/칠판) 존재도 함께 확인.

---

## 8. Headless (exec/`-p`) Fallback — 1-shot 자동화 시만 (부록)

인터랙티브가 디폴트지만, 컨텍스트 단절 OK + 사용자 끼어들기 불필요한 1-shot 자동화에는 headless가 빠르다.

```bash
# codex
cmux send --surface surface:CX 'codex exec "$(cat .cmux/p.txt)" > .cmux/out.txt 2>&1 ; touch .cmux/codex-r1.done ; cmux send --surface surface:CL "[codex → claude] R1 완료" ; cmux send-key --surface surface:CL enter'
cmux send-key --surface surface:CX enter

# antigravity
cmux send --surface surface:GM 'antigravity -p "$(cat .cmux/p.txt)" > .cmux/out.txt 2>&1 ; touch .cmux/antigravity-r1.done ; cmux send --surface surface:CL "[antigravity → claude] R1 완료" ; cmux send-key --surface surface:CL enter'
cmux send-key --surface surface:GM enter

# Claude 워처
until [ -f .cmux/{model}-r1.done ]; do sleep 2; done
cat .cmux/out.txt
```

**한계**: 매 호출 새 프로세스, 컨텍스트 단절, 사용자 끼어들기 불가. 멀티턴 토론에는 부적합.

---

## 9. 토론을 진짜 검증으로 만들기 — 거짓 합의(false consensus) 방지

> **문제 정의**: 참여 모델(claude·codex·antigravity…)은 모두 LLM이라 훈련 분포·추론 습관·실패 모드가 크게 겹친다. 다자 토론은 *N명의 독립 전문가*가 아니라 **상관계수 높은 N개의 샘플러**다. 어떤 오개념이 "LLM에게 자연스러운" 종류라면 전원이 자신 있게 동의하고, 그 합의가 **가짜 안심**을 준다. 합의는 분산을 줄이지 편향을 줄이지 않는다. 참여자를 늘려도 상관된 표본만 늘 뿐이므로, 아래 4개 장치로 토론을 *협력*에서 *검증*으로 전환한다.

### 9.1 적대적 인센티브 — 협력자(X) → 검사(prosecutor)(O)

기본값이면 외부 AI는 "도와주려" 한다(제안 추가·보강). 그게 가장 큰 누수다. 리뷰 프롬프트에 **반박을 의무화**한다.

```text
당신의 임무는 동의가 아니라 결함 발견이다.
- 이 산출물을 *반증(refute)* 하라. 통과시키지 말고 깨뜨려라.
- 불확실하면 기본 판정은 '결함 있음(FAIL)'. 확신할 때만 PASS.
- 모든 지적에 반례·근거·재현 경로를 붙여라. 근거 없는 칭찬 금지.
판정 형식(필수):
{ "verdict": "PASS|FAIL", "defects": [{ "what":"", "why":"", "evidence":"" }], "confidence": 0~1 }
```

**지정 반대자 — "10번째 사람(Tenth Man)" 규칙.** 〈월드워Z〉의 그 규칙으로 유명하지만, 실은 1973년 욤키푸르 정보 실패 후 이스라엘 군 정보국(AMAN)의 _악마의 변호인(Devil's Advocate)_ 제도에 뿌리. 교훈은 **"전원 합의가 가장 위험한 신호"**.

- 매 라운드 **참여자 1명을 로테이션으로 지정** → 현재 합의가 무엇이든 "그건 틀렸다"를 전제로 공격하게 한다.
- **빠른 전원 합의 = 멈춤 신호**: 즉시 만장일치면 '검증 완료'가 아니라 '의심 대상'으로 표시하고 지정 반대자를 한 번 더 투입한다.
- ⚠️ **LLM 한정 주의**: 강제 반대는 _동조·아첨·앵커링_(사회적 실패)만 깬다. 모델들의 _공유 훈련 편향_(상관된 실패)은 못 깬다 — 강제된 반대자도 같은 분포에서 "반대 모양" 텍스트를 낼 뿐("반대 연기"). 따라서 반대자의 반론은 반드시 **§9.3 비-LLM 오라클로 받아 검증**한다. 실제 정보기관도 악마의 변호인의 가설을 *첩보(현실 데이터)*로 검증했지 말로 끝내지 않았다.

### 9.2 관점 다양화 — 같은 질문(X) → 직교 렌즈(O)

같은 산출물을 여러 참여 모델에 줄 때 **같은 질문을 주지 마라**(중복 = 상관 강화). 각자 다른 렌즈를 배정해 직교시킨다.

| 검토자 | 렌즈                                | 주로 잡는 것                       |
| ------ | ----------------------------------- | ---------------------------------- |
| codex  | 정확성·논리 비약·반례               | 내적 모순, 깨지는 케이스           |
| gemini | 외부 사실·시장/도메인 접지·1차 출처 | 현실과 어긋난 주장, 출처 없는 단정 |
| claude | 보안·엣지케이스·요구사항 충족       | 빠진 요구, 위험 경로               |

라운드마다 렌즈를 로테이션하면 같은 사각을 다른 각도로 두 번 친다.

### 9.3 비-LLM 오라클에 정박 — 수사(rhetoric)(X) → 실행(execution)(O)

**가장 중요한 장치.** LLM 합의는 *정합성(coherence)*만 보증할 뿐 *현실과의 대응(correspondence)*은 보증하지 못한다. 토론 결론을 반드시 **비-LLM 검증**에 묶어라.

- 코드: 테스트 실행 / 컴파일 / 타입체크 / 린트 / 실제 실행 결과 diff. "돌려서 깨지는가"로 합의를 검증.
- 사실 주장: 1차 출처 fetch·grep, 실데이터 조회, 실제 API 응답 확인.
- 외부 AI에게 **"주장하지 말고 실행해서 증거(로그·테스트 결과·출처 링크)를 붙여라"**고 지시.
- 오라클로 검증 불가능한 항목(전략·카피·판단 등)은 결론에 **"미검증(unverified)"** 으로 명시 — 합의를 검증으로 착각하지 않게.
- ⚠️ **FAIL 판정도 오라클에 걸어라 (실측 교훈, 가장 중요)**: LLM 검토자(claude·codex 포함)는 _"출처 없는 정밀 수치 = 환각"_ 이라는 휴리스틱을 **공유**한다. 이 반사가 **참인 주장을 false-negative로 기각**할 수 있다. 실측: gemini가 댄 "350개 모델·60% 오류상관"을 codex와 claude가 _둘 다_ "환각/FAIL"로 기각했으나, 웹 검색 결과 **실재 논문**(Kim et al., _Correlated Errors in LLMs_, ICML 2025, arXiv 2506.07962)으로 확인됨. → **PASS만이 아니라 FAIL도 반드시 비-LLM 오라클로 검증**하라. 강제 반대(지정 반대자)는 정확도를 보장하지 않으며, 공유 편향으로 *참을 기각*할 수 있다 — dissent보다 **오라클 정박**이 우선이다.

### 9.4 정족수 + 끝까지(loop-until-dry)

- **단일 합의 신뢰 금지.** 독립 반박 N개 중 **다수결**(예: 3개 중 2개 이상 FAIL → 폐기).
- **새 결함이 K라운드 연속 안 나올 때까지** 반복(예: 2라운드 연속 무결함이면 종료). "1라운드 돌고 끝"은 꼬리 결함을 놓친다.
- 라운드마다 *직전 합의 결론*을 일부러 공격 대상으로 재투입(앵커링·아첨 방지).

### 9.5 인간 게이트는 마지막, 그러나 최소 이해는 환원 불가

- 읽기는 자동 레이어(9.1~9.4)가 거른 뒤로 최대한 미룬다 — **단, 책임(서명)은 위임 불가.** 최종 산출물에 대해 "소유할 만큼의 이해"는 인간이 확보.
- ⚠️ **유창하게 잘 다듬어진 산출물일수록 감사가 더 어렵다** — 매끄러움이 경계를 풀고 이음매를 가린다. 최종 읽기 때 "이음매·숨은 가정·외부 의존·미검증 항목"을 표적 점검.
- ⚠️ **self-approval 금지**: claude(메인 세션)가 자기 초안을 자기가 검토하면 상관 최댓값이다. 검토는 반드시 별도 lane(codex/antigravity/서브에이전트)으로 분리.

### 9.6 운영 체크리스트

```text
[ ] 토론마다 전용 폴더(.cmux/debates/$SLUG)를 썼나(이전 주제 덮어쓰기 방지)? (§2)
[ ] 매 턴이 board.md에 실제 착지했는지 확인했나(.done만 믿지 말 것)? (§4.5)
[ ] 리뷰 프롬프트에 "반증하라 + 기본 FAIL + 판정 스키마" 넣었나? (9.1)
[ ] 빠른 전원 합의가 나오면 '지정 반대자(10번째 사람)'로 한 번 더 깨봤나? (9.1)
[ ] 각 참여 모델에 같은 질문 대신 직교 렌즈를 줬나? (9.2)
[ ] 결론을 실행/테스트/출처 등 비-LLM 오라클에 묶었나? 미검증 항목 표시했나? (9.3)
[ ] 단일 합의가 아니라 다수결 + 무결함 K라운드로 종료했나? (9.4)
[ ] 자기 초안을 자기가 승인하지 않았나? 최종 인간 이해 확보했나? (9.5)
```

---

## 10. 컨텍스트 + 보조

본 프로젝트는 cmux로 **Claude 메인/서브 세션 + Codex + Gemini 인터랙티브** 병렬 운영 중. 메인 세션 = Claude(오케스트레이션/사용자 대화), 외부 AI = R1~R3 교차 리뷰 + 메타 토론.

관련 메모리:

- `~/.claude/projects/.../memory/reference_cmux.md`
- `~/.claude/projects/.../memory/feedback_codex_separate_terminal.md`
- `~/.claude/projects/.../memory/feedback_codex_panel_layout.md` (다자 협업 레이아웃)

---

## TL;DR (Claude가 5초 안에 봐야 할 것)

1. cmux 기본 조작은 [`cmux-guide.md`](./cmux-guide.md). 이 문서는 그 위에서 토론을 굴린다.
2. `cmux identify` → surface:CL → `new-split right`/`down`으로 CX/GM → `mkdir -p .cmux/debates/$SLUG`(주제별 격리·보존, §2) → **자동 권한 기동**: `codex --sandbox workspace-write --ask-for-approval never` + `antigravity` (승인 프롬프트 없음 = 기본값)
3. 프롬프트 끝에 **응답 완료 프로토콜**(`touch .cmux/{model}-rN.done` + `cmux send → CL`) 항상 포함. 진짜 토론은 **공유 칠판 모드(§4.5)** — relay 대신 `.cmux/board.md` 공유 + `.cmux/turn` 토큰, Claude는 진행자.
4. 큰 프롬프트는 **`@<path>` 첨부**(antigravity 필수, codex 보강).
5. 대기는 **`run_in_background: true` + 최대 대기 캡 워처**. codex 작업중=`Working (`, antigravity 작업중=`Thinking|esc to cancel`. 시그널 누락 시 §4.3 직접 회수.
6. 시그널·프롬프트·출력은 모두 **`.cmux/`** (OS `/tmp` 금지).
7. 사용자도 같은 pane에 직접 입력 가능 → Claude 디스패치 + enter 후 끼어들기.
8. **토론 ≠ 검증** — §9 4대 장치 필수: ① 반증 의무(기본 FAIL) ② 직교 렌즈 ③ **비-LLM 오라클 정박**(실행/테스트/출처) ④ 다수결+무결함 K라운드. self-approval 금지.
