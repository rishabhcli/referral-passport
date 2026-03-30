# Repository Guidelines

## Project Structure & Module Organization
This project is a Vite + React + TypeScript app with a feature-first frontend structure.

- src/main.tsx: app entry.
- src/App.tsx: route setup and global providers.
- src/pages/*: route screens such as src/pages/WorkspaceHomePage.tsx and src/pages/PatientPage.tsx.
- src/features/*: domain features and feature-level components or state (auth, etc.).
- src/components/* and src/components/ui/*: shared UI and shadcn-style primitives.
- src/services/*: API/data orchestration for Supabase and domain workflows.
- src/lib/*, src/hooks/*, src/types/*: utilities, custom hooks, and shared types.
- src/test/*: global test setup and test specs.
- public/*: static assets.
- supabase/*: local database config and migration files.

## Build, Test, and Development Commands
- npm install (or bun install): install dependencies.
- npm run dev: start local dev server on port 8080.
- npm run build: production build via Vite.
- npm run build:dev: development-mode Vite build.
- npm run lint: run ESLint checks configured in eslint.config.js.
- npm run test: run the Vitest suite (jsdom environment).
- npm run test:watch: continuous testing mode.
- npm run preview: preview the production bundle locally.

## Coding Style & Naming Conventions
- Primary stack: TypeScript and React functional components.
- Use 2-space indentation, semicolons, and clean imports.
- Import from src via the @/ alias.
- Use PascalCase for components/pages.
- Use camelCase for hooks, services, and utility helpers.
- Keep reusable UI controls in src/components/ui/* instead of creating duplicates.
- Run npm run lint when modifying TypeScript or JSX logic.

## Testing Guidelines
- Unit and component tests use Vitest with jsdom.
- Test files follow *.test.ts, *.test.tsx, *.spec.ts, *.spec.tsx under src/.
- src/test/setup.ts is loaded globally in test runs.
- Add or update tests for new behaviors, service methods, and state transitions.
- Example command: npm run test -- src/services/patientContextService.test.ts

## Commit & Pull Request Guidelines
Recent commits are short, imperative titles such as Add patient creation dialog and Refactor real data flow. Use concise, action-oriented commit messages.
- PRs should include: a clear summary, changed modules, test results, and schema/migration impact.
- For visible UI changes, include before/after screenshots or short walkthrough notes.
- For DB changes, mention the specific files in supabase/migrations and setup implications.

## Security & Configuration Notes
- Do not commit real Supabase secrets or service tokens.
- Keep local values in environment files excluded from source control.
- Validate environment-sensitive settings before sharing logs or screenshots.
