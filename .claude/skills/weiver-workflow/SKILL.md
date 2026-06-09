---
name: weiver-workflow
description: 새 작업 요청 시 AI 워크플로우 단계를 자동 파악하고 해당 단계부터 진입하는 스킬. 이슈 생성, 기획(US/AC), 개발, PR까지 자동화.
---

# Weiver AI 워크플로우

요청이 들어오면 현재 단계를 파악하고 해당 에이전트를 호출한다.
전체 규칙은 `docs/ai-workflow.md` 참고.

## 단계 파악 및 진입

### 1단계 — 브리핑 (이슈 없음)

새 작업 요청이면 `git-ops` 에이전트 호출:

- `gh label list`로 라벨 확인
- 이슈 생성 (`[TYPE] 설명`)
- 브랜치 생성 (`type/#이슈번호`, develop 기준)

### 2단계 — 기획 (이슈 있음, AC 없음)

`planner` → `us-reviewer` 순서로 호출:

- US + Given/When/Then AC 작성
- `docs/plans/#이슈번호-설명.md` 저장
- Critical/Major 이슈 시 planner 재호출

### 3단계 — 개발 (브랜치 있음, 코드 작업)

순서대로 호출:

1. `atdd-writer` — AC → Playwright 인수 테스트
2. `next-dev` — 구현 (테스트 통과 목표)
3. `coverage-auditor` — Vitest 커버리지 확인
4. `design-reviewer` — 디자인 스펙 대조
5. `code-reviewer` — 코드 품질 검토

### 4단계 — 마무리 (PR 요청)

`git-ops` 에이전트 호출:

- PR 생성 (`Closes #이슈번호`)
- E2E 통과 확인 후 머지

## 단계 명시 시 직접 진입

- "PR 올려줘" → 4단계
- "테스트 작성해줘" → atdd-writer
- "코드 리뷰해줘" → code-reviewer
