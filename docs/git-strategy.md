# Git Strategy

## 브랜치 구조

```
main
 └── develop
      └── type/#이슈번호
```

| 브랜치           | 역할                                    |
| ---------------- | --------------------------------------- |
| `main`           | 배포 브랜치. 항상 배포 가능한 상태 유지 |
| `develop`        | 통합 브랜치. 작업 브랜치의 PR 대상      |
| `type/#이슈번호` | 작업 브랜치. develop 기준으로 생성      |

---

## 브랜치 네이밍

```
type/#이슈번호
```

| type       | 용도                  |
| ---------- | --------------------- |
| `feature`  | 기능 개발             |
| `fix`      | 버그 수정             |
| `refactor` | 코드 리팩토링         |
| `chore`    | 환경 설정, 빌드, 기타 |
| `docs`     | 문서 작성 및 수정     |

**예시**

```
feature/#12
fix/#20
chore/#25
```

---

## 커밋 메시지 컨벤션

```
type: 설명 (한국어)   예) feat: 로그인 폼 유효성 검사 추가
```

### 커밋 단위

- 기능/변경 단위로 쪼개서 커밋 (하나의 커밋 = 하나의 맥락)
- 여러 파일을 수정했더라도 관련 없는 변경은 별도 커밋으로 분리

```
type: 설명
```

| type       | 용도               |
| ---------- | ------------------ |
| `feat`     | 새로운 기능        |
| `fix`      | 버그 수정          |
| `refactor` | 리팩토링           |
| `style`    | 마크업 & 스타일링  |
| `chore`    | 설정, 빌드, 패키지 |
| `docs`     | 문서               |
| `test`     | 테스트             |

**예시**

```
feat: 로그인 폼 유효성 검사 추가
fix: 이력서 온보딩 입력 검증 오류 수정
chore: GitHub Actions CI 설정
```

---

## 이슈 전략

### 이슈 제목 형식

```
[TYPE] 설명
```

**예시**

```
[FEATURE] 로그인 기능 추가
[FIX] 이력서 온보딩 입력 검증 오류 수정
[CHORE] AI workflow 구성
```

### 라벨

| 라벨             | 설명              |
| ---------------- | ----------------- |
| ✨ Feature       | 기능 개발         |
| 🐞 BugFix        | 버그 수정         |
| 🔨 Refactor      | 코드 리팩토링     |
| ⚙ Setting        | 개발 환경 세팅    |
| 📃 Docs          | 문서 작성 및 수정 |
| 📬 API           | 서버 API 통신     |
| 🎨 Html&css      | 마크업 & 스타일링 |
| ✅ Test          | 테스트 관련       |
| 🌏 Deploy        | 배포 관련         |
| 💻 CrossBrowsing | 브라우저 호환성   |
| 🥰 Accessibility | 웹 접근성         |

---

## 작업 흐름

```
1. 이슈 생성 (gh issue create)
   - 제목: [TYPE] 설명
   - 라벨: 내용에 맞는 라벨 자동 부착
   - 담당자: 본인 자동 지정

2. 작업 브랜치 생성 (develop 기준)
   git fetch origin develop
   git checkout -b type/#이슈번호 origin/develop
   git push -u origin type/#이슈번호

3. 작업 후 develop으로 PR 생성
   gh pr create --base develop --body "Closes #이슈번호"
   → CI (lint, typecheck, unit test) 통과 필수
   → PR 머지 시 이슈 자동 종료

4. develop → main PR
   → CI + Playwright E2E 테스트 전체 통과 필수
   → 통과 시 머지 & 자동 배포
```

---

## CI/CD (GitHub Actions)

### develop PR 시

- ESLint
- TypeScript typecheck
- Vitest unit test

### main PR 시 (develop → main)

- 위 항목 전체 +
- Playwright E2E 테스트
- 전체 통과해야만 머지 가능

---

## 브랜치 보호 규칙

| 브랜치    | 규칙                                         |
| --------- | -------------------------------------------- |
| `main`    | 직접 push 금지 / PR 필수 / CI 전체 통과 필수 |
| `develop` | 직접 push 금지 / PR 필수 / CI 통과 필수      |

> 프론트엔드 1인 개발 체제이므로 PR 리뷰 승인 조건은 적용하지 않음

---

## PR 템플릿

> `.github/pull_request_template.md`에 정의

```markdown
## 관련 이슈

Closes #

## 작업 내용

-

## 스크린샷 (UI 변경 시)

## 체크리스트

- [ ] 셀프 코드 리뷰 완료
- [ ] 불필요한 console.log 제거
- [ ] 타입 에러 없음
```

---

## 브랜치 정리 루틴

PR 머지 후 또는 주기적으로 upstream이 삭제된 로컬 브랜치를 정리한다.

```bash
# 원격 삭제된 브랜치 정보 동기화 + gone 브랜치 일괄 삭제
git fetch --prune && git branch -vv | grep ': gone]' | awk '{print $1}' | xargs git branch -d
```

- `--prune`: 원격에서 삭제된 브랜치 추적 정보 제거
- `-d`: 머지된 브랜치만 삭제 (미머지 브랜치는 보호됨)
- 미머지 브랜치를 강제 삭제하려면 `-D` 사용 (주의)

---

## 사용 도구

- **GitHub CLI (`gh`)**: 이슈 생성, 라벨 관리, PR 생성
- **Git**: 브랜치 생성 및 원격 푸시
- **GitHub Actions**: CI/CD 자동화
- **Playwright**: E2E 테스트
- **Vitest**: 유닛 테스트
