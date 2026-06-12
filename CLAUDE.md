# CLAUDE.md

## 프로젝트 개요

**WEIVER** — 지원자(applicant)와 기업(corporate) 양쪽을 지원하는 AI 채용 매칭 플랫폼. → `docs/project-overview.md` 참고
Next.js 16 App Router + TypeScript + Tailwind CSS + shadcn/ui + Zustand + React Hook Form + Zod 스택.

### 주요 라우트

- `/login`, `/signup` — 인증
- `/onboarding` — 이력서, 포트폴리오, 자기소개서 작성
- `/applicant` — 지원자 대시보드, 마이페이지
- `/corporate` — 기업 대시보드

### 디렉토리

- `src/app` — 페이지 및 라우트
- `src/components/ui` — 재사용 원시 컴포넌트
- `src/components/common` — 레이아웃/공통 컴포넌트
- `src/hooks` — 클라이언트 훅
- `src/schemas` — Zod 스키마 및 타입
- `src/store` — Zustand 스토어
- `src/lib` — 순수 유틸 함수

---

## 명령어

패키지 매니저는 **pnpm** 사용.

```bash
pnpm dev          # 개발 서버
pnpm build        # 프로덕션 빌드
pnpm lint:check   # ESLint 검사
pnpm lint         # ESLint 자동 수정
pnpm typecheck    # TypeScript 검사
pnpm test         # Vitest 유닛 테스트
pnpm storybook    # Storybook (port 6006)
```

---

## 코딩 컨벤션

- 컴포넌트: `PascalCase` / 변수·함수: `camelCase` / 파일명: `kebab-case`
- Prettier: 2 spaces, single quotes, semicolons, printWidth 100, Tailwind class 정렬
- 비밀번호, 인증코드 등 민감 정보는 클라이언트 스토어에 저장 금지

---

## Git 워크플로우

→ `docs/git-strategy.md` 참고

---

## 테스트

- UI 컴포넌트는 `*.stories.tsx`로 작성 (Storybook 기반 테스트)
- 큰 UI 변경 전 `pnpm build-storybook` + `pnpm lint:check` 실행

---

## Claude 행동 원칙

- **모든 요청을 실행하기 전에** 적합한 서브에이전트(`.claude/agents/`)나 스킬이 있는지 확인하고, 있으면 반드시 사용한다.
- **워크플로우 진입 전에** `docs/ai-workflow.md`의 단계 파악 기준표를 확인하고 올바른 단계부터 시작한다.

## 에이전트 실행 규칙

메인 컨텍스트 사용을 최소화하기 위해 작업은 반드시 에이전트에게 위임한다. 컨텍스트 compact가 진행되면 맥락이 압축·손실되므로, 실제 작업은 독립 컨텍스트의 에이전트가 수행하고 메인 세션은 조율만 담당한다.

### 필수
- 모든 실질적 작업(파일 읽기·수정·생성, 명령 실행, 검토 등)은 `Agent()` 툴로 spawn한 에이전트에게 위임한다.
- 에이전트 프롬프트에는 해당 작업에 필요한 정보만 포함한다. 메인 세션의 대화 맥락을 불필요하게 넘기지 않는다.
- 에이전트 완료 후에는 결과 요약만 메인 세션으로 반환받는다.

### 금지
- 메인 세션에서 직접 파일을 다수 Read/Edit하는 것.
- "next-dev로 해줘" 같은 에이전트 위임 지시를 메인 Claude가 직접 수행하는 것.

---

## AI 개발 워크플로우

→ `docs/ai-workflow.md` 참고

핵심 루프: **US/AC → 테스트(ATDD) → 구현 → CI 자동 검증**

- 표준 경로: 브리핑 → 기획 → 개발 → 마무리
- 경량 경로: 브리핑 → 개발 → 마무리 (스타일·버그픽스·리팩토링)
- 인증·개인정보·라우팅·핵심 API 변경은 **반드시 표준 경로**

## 교차 리뷰 (Claude × Codex × Gemini)

→ `docs/discussion-guide.md` (토론 운영), `docs/cmux-guide.md` (pane 제어) 참고

- cmux 0.64+ / codex 0.138+ / gemini 0.45+ 설치 완료
- **매 이슈가 아닌** 인증·핵심 도메인·아키텍처 변경·마일스톤 시점에만 적용
