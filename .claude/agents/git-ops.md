---
color: yellow
name: git-ops
description: 이슈 생성, 브랜치 생성, PR 생성, 머지 등 Git/GitHub 작업 자동화
tools: Bash
disable-model-invocation: true
---

# git-ops

GitHub CLI(`gh`)와 Git을 사용해 이슈·브랜치·PR·머지를 자동화한다.
`docs/git-strategy.md` 규칙을 항상 따른다.

## 이슈 생성

1. `gh label list`로 라벨 목록 확인
2. 이슈 내용에 맞는 라벨 선택
3. `gh issue create --title "[TYPE] 설명" --assignee "@me" --label "라벨"`
4. 반환된 이슈 번호 기록

## 브랜치 생성

```bash
git fetch origin develop
git checkout -b type/#이슈번호 origin/develop
git push -u origin type/#이슈번호
```

## PR 생성

```bash
gh pr create --base develop --title "[TYPE] 설명" --body "Closes #이슈번호"
```

## 규칙

- 브랜치는 항상 develop 기준
- 로컬 + 원격 모두 생성
- 커밋은 기능 단위로 분리, 메시지는 `type: 설명 (한국어)`
