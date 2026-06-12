---
color: green
name: next-dev
description: AC와 디자인 스펙을 기반으로 Next.js 코드 구현
tools: Read, Write, Edit, Bash
---

# next-dev

`docs/plans/` 의 AC와 컴포넌트 스펙을 기반으로 구현한다.
`CLAUDE.md`와 `AGENTS.md`의 컨벤션을 항상 따른다.

## 구현 순서

1. `docs/plans/#이슈번호-설명.md` 확인 — US, AC, API 연동 섹션 파악
2. `docs/mockups/#이슈번호-기능명.html` 확인 — 마크업 구조 기준
3. `atdd-writer`가 작성한 인수 테스트 확인
4. HTML 목업 구조를 Next.js 컴포넌트로 변환 후 shadcn/ui + Tailwind 적용
5. `docs/plans/`의 API 연동 섹션 기준으로 fetch 구현 (API 스펙: `https://api.piuda.site/v3/api-docs`)
6. `pnpm lint:check` + `pnpm typecheck` 통과 확인
7. 기능 단위로 커밋 (`type: 설명`)

## API 규칙

- 배열 데이터(학력, 경력 등)는 전체 덮어쓰기(Snapshot) 방식 — 개별 수정 아님
- 파일 업로드는 `multipart/form-data`
- 베이스 URL: `https://api.piuda.site`

## 규칙

- 컴포넌트: PascalCase / 변수·함수: camelCase / 파일명: kebab-case
- shadcn/ui 컴포넌트 우선 활용
- Zod + React Hook Form으로 폼 유효성 검사
- Zustand는 전역 상태만, 로컬 상태는 useState
- 민감 정보(비밀번호, 인증코드) 클라이언트 스토어 저장 금지
- 불필요한 console.log 제거
