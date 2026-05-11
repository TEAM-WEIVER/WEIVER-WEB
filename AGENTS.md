# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js App Router project using TypeScript, React 19, Tailwind CSS, Zustand, React Hook Form, and Zod.

- `src/app`: route segments and pages, including `login`, `signup/[type]`, `onboarding`, and `corporate`.
- `src/components`: shared UI and common components. Put reusable primitives in `components/ui` and layout/shared pieces in `components/common`.
- `src/hooks`: reusable client hooks such as timers or form helpers.
- `src/lib`: route flow utilities and shared pure functions.
- `src/schemas`: Zod schemas and inferred form types.
- `src/store`: Zustand stores.
- `public`: static assets.
- `.storybook` and `*.stories.tsx`: Storybook configuration and component stories.

## Build, Test, and Development Commands

Use `pnpm` because the repository includes `pnpm-lock.yaml`.

- `pnpm dev`: start the local Next.js dev server.
- `pnpm build`: create a production build.
- `pnpm start`: run the built app.
- `pnpm lint:check`: run ESLint without writing changes.
- `pnpm lint`: run ESLint with autofix.
- `pnpm format:check`: check Prettier formatting.
- `pnpm format`: format files with Prettier.
- `pnpm storybook`: run Storybook on port `6006`.
- `pnpm build-storybook`: build static Storybook output.

## Coding Style & Naming Conventions

Prettier uses 2 spaces, semicolons, single quotes, trailing commas, `printWidth: 100`, and Tailwind class sorting. ESLint extends Next core web vitals, TypeScript, Storybook rules, and removes unused imports.

Use `PascalCase` for React components, `camelCase` for variables/functions, and kebab-case filenames for non-component utilities where practical. Keep route folders aligned with Next conventions, for example `src/app/signup/[type]/account/page.tsx`.

## Testing Guidelines

Vitest is configured through Storybook’s test addon with Playwright Chromium in headless mode. Prefer adding or updating `*.stories.tsx` for reusable UI components so interaction and accessibility checks can run through Storybook-based tests. Run `pnpm build-storybook` and `pnpm lint:check` before opening larger UI changes.

## Issue, Branch, Commit & Pull Request Guidelines

Recent history uses short type prefixes such as `feat`, `fix`, `refactor`, `cicd`, and occasional `temp`. Prefer concise messages like `feat: add signup terms flow` or `fix: correct button story state`.

When asked to recommend a commit message, answer with a concise Korean message using the existing prefix style, for example `docs: 이슈 기반 git flow 가이드 추가`. Include 2-3 alternatives only when useful.

Start work from an issue. Create or link the issue first, then create a branch that includes the issue number and purpose, for example `feat/123-signup-flow` or `fix/124-button-story`. Keep each branch scoped to one issue.

Keep issue and PR descriptions brief and practical. Prefer plain bullet lists over long checklists unless completion tracking is useful. For issues, write only the task, background, scope, completion criteria, and references that help implementation.

Pull requests should link the issue with `Closes #123` or `Refs #123`, include a short summary, main changes, verification commands, and screenshots or Storybook links only for visual changes. Call out known follow-up work only when it affects review or release decisions.

## Security & Configuration Tips

Do not persist passwords, verification codes, or other sensitive signup data in client stores. Keep secrets out of source files and use environment variables for service configuration.
