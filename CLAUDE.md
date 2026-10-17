# CLAUDE.md

Architecture, product behaviour, and design decisions live in **[replit.md](replit.md)** — read
it before changing app logic. This file covers only what that file cannot: how to run the
project off Replit, and which changes must not be reverted.

## What this is

Mindmap — a private, space-themed mindmap for capturing workplace concerns. pnpm
workspace, 10 projects. Internal identifiers deliberately keep the old `quiet-mindmap`
spelling; do not rename them (see replit.md).

Deployment target is Replit (linux-x64). Development happens locally on Windows.

## Setting up a new machine

1. Install Node 24 LTS and enable pnpm: `corepack enable && corepack prepare pnpm@latest --activate`
2. On Windows, put Git's POSIX tools on PATH — `C:\Program Files\Git\usr\bin`. The root
   `preinstall` script is a `sh` one-liner and `pnpm install` fails without it.
3. `pnpm install`
4. `cp artifacts/quiet-mindmap/.env.example artifacts/quiet-mindmap/.env` and fill in the
   Clerk key (see **Secrets** below).

## Commands

- `pnpm --filter @workspace/quiet-mindmap run dev` — web app, http://localhost:5173
- `pnpm run typecheck` — all projects. Must pass before shipping.
- `pnpm run test` — vitest. DB integration tests skip themselves without `DATABASE_URL`.
- `pnpm run build` — typecheck + build everything

Never run `pnpm dev` at the workspace root — always `--filter` a specific artifact.

## Secrets

`.env` files are gitignored; `.env.example` is the committed template. Nothing is checked in.

The original values lived in the **Replit Secrets panel**, not in git: `DATABASE_URL`,
`SESSION_SECRET`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`.
The Postgres database and its rows also stayed on Replit.

`VITE_CLERK_PUBLISHABLE_KEY` **must be a development key** (`pk_test_…`).
`publishableKeyFromHost()` in `artifacts/quiet-mindmap/src/App.tsx` returns the supplied key
verbatim only when it is a dev key; given a `pk_live_` key or nothing, it derives one from
the browser hostname, which on localhost becomes the nonexistent `clerk.localhost` and fails
with `failed_to_load_clerk_js`. Leave `VITE_CLERK_PROXY_URL` empty locally.

The Clerk instance was **Replit-managed** (provisioned inside Replit's own Clerk org), so it
is not fully owned by this project. Migrating to a self-owned Clerk account is unfinished work.

## Off-Replit changes — do not revert

Replit supplied things a normal machine does not. These edits deliberately contradict nearby
comments and exist so the project runs locally. Each is marked in-place; do not "clean them up".

- **`pnpm-workspace.yaml` `overrides`** strips non-linux-x64 native binaries to keep Replit
  installs small. `win32-x64` is deliberately **kept** for rollup, esbuild, lightningcss and
  `@tailwindcss/oxide`. Removing it makes vite unable to start on Windows at all
  (`Cannot find module '@rollup/rollup-win32-x64-msvc'`). A newly added native dependency
  will need the same exception.
- **`pnpm-workspace.yaml` `allowBuilds`** must hold real booleans. It once contained the
  literal placeholder `set this to true or false`, which made *every* pnpm command fail with
  `ERR_PNPM_IGNORED_BUILDS`.
- **`artifacts/quiet-mindmap/vite.config.ts`** defaults `PORT` (5173) and `BASE_PATH` (`/`)
  instead of throwing. Replit's workflow runner injects both; nothing local does. Replit still
  sets them, so deployed behaviour is unchanged.

## Known gaps off Replit

- `artifacts/api-server` and `lib/db` read `process.env` directly and **load no `.env` file** —
  Replit injected variables into the process. Running the API locally needs `--env-file` or
  dotenv wiring first.
- `api-server`'s `dev` script starts with `export NODE_ENV=development &&`, which is bash and
  fails on Windows `cmd`.
- Other artifacts (`mockup-sandbox`, `mindmap-mobile`) still hard-throw without `PORT`/`BASE_PATH`.

## Gotchas

- Sign-in is currently **optional** — `REQUIRE_SIGN_IN` in
  `artifacts/quiet-mindmap/src/config.ts` is `false`, so the app runs fully offline on
  localStorage with no backend or database. Signing in without the API running is expected to
  report `syncStatus: 'error'`.
- The sync layer in `artifacts/quiet-mindmap/src/hooks/useNodes.ts` (pending-op queue,
  last-write-wins merge, guest/account store switching) is the highest-risk code in the repo —
  mistakes there mean silent data loss for notes users cannot recover elsewhere. Change it
  carefully and prefer adding tests.
- More in replit.md's own Gotchas section (explicit node widths, `overflow: visible` on the
  connection-line SVG, one-shot seeding).
