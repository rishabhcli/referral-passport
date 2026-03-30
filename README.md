# Referral Passport

Vite + React + TypeScript app for assembling, submitting, and replaying nephrology referral packets against a local Supabase backend.

## Local setup

Install dependencies with `npm ci`.

The automated test stack assumes:
- Docker is running locally.
- Supabase CLI is installed and on your `PATH`.

The Playwright and reset scripts use local Supabase as the only automated backend target.

## Test commands

- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run test:coverage`
- `npm run db:reset:test`
- `npm run test:e2e`
- `npm run test:e2e:headed`
- `npm run test:e2e:all`
- `npm run test:ci`

## Database reset

Run `npm run db:reset:test` before local E2E work if you need a clean fixture set. The reset script will:

- start local Supabase if it is not already running,
- reset the local database and reseed deterministic destinations, patients, requirement profiles, and FHIR resources,
- recreate the demo auth user.

Demo credentials used by the automated flows:

- email: `demo@consultpassport.dev`
- password: `demo-passport-2025`

## Test pyramid

The repo now uses three layers:

- Vitest service and auth tests with mocked Supabase/service dependencies
- Vitest page and component tests with mocked auth and feature services
- Playwright E2E flows against the real app plus local Supabase

Key automated flows cover:

- unauthenticated `/app` redirect and demo login,
- patient create/edit flows,
- referral repair-to-accepted and repair-to-blocked flows,
- replay accepted and blocked read-only screens,
- mobile replay smoke.

## CI

`npm run test:ci` is the canonical verification path. It runs:

1. `npm run lint`
2. `npm run build`
3. `npm run test:coverage`
4. `npm run test:e2e`

GitHub Actions also includes a nightly browser matrix job via `npm run test:e2e:all`.
