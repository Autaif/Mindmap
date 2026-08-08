# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

AZM Mindmap — a private, space-themed mindmap for capturing workplace concerns. pnpm
workspace: 4 apps under `artifacts/`, 4 libraries under `lib/`, and `scripts/` — 9 packages
(pnpm reports "10 workspace projects", counting the root). Internal identifiers deliberately
keep the old `quiet-mindmap` spelling; do not rename them (see replit.md).

**Product behaviour, data model, and the mindmap app's own architecture decisions live in
[replit.md](replit.md) — read it before changing app logic.** This file covers workspace-wide
mechanics replit.md doesn't: how to run the project off Replit, the codegen pipeline linking
the API packages, testing, and which changes must not be reverted.

Deployment target is Replit (linux-x64). Development happens locally on Windows.

## Workspace layout

| Package | Path | Purpose |
|---|---|---|
| `@workspace/quiet-mindmap` | `artifacts/quiet-mindmap` | The web app (Vite + React). See replit.md. |
| `@workspace/api-server` | `artifacts/api-server` | Express 5 API: Clerk auth, `/api/nodes*` sync endpoints. |
| `@workspace/mindmap-mobile` | `artifacts/mindmap-mobile` | Expo companion app. See replit.md. |
| `@workspace/mockup-sandbox` | `artifacts/mockup-sandbox` | Replit-only component preview tool (`kind = "design"` in its `.replit-artifact/artifact.toml`, served at `/__mockup`). Not part of the shipped product. |
| `@workspace/db` | `lib/db` | Drizzle ORM schema (`nodesTable`) + Postgres client, consumed by api-server. |
| `@workspace/api-spec` | `lib/api-spec` | `openapi.yaml`, the source of truth for the API, plus the Orval codegen config. |
| `@workspace/api-client-react` | `lib/api-client-react` | Generated React Query hooks + fetch client, from `api-spec`. |
| `@workspace/api-zod` | `lib/api-zod` | Generated Zod schemas + TS types, from `api-spec`. Used by api-server to validate requests/responses. |
| `@workspace/scripts` | `scripts` | One-off workspace scripts (`tsx`-run). |

## Setting up a new machine

1. Install Node 24 LTS and enable pnpm: `corepack enable && corepack prepare pnpm@latest --activate`
2. On Windows, put Git's POSIX tools on PATH — `C:\Program Files\Git\usr\bin`. The root
   `preinstall` script is a `sh` one-liner and `pnpm install` fails without it.
3. `pnpm install`
4. `cp artifacts/quiet-mindmap/.env.example artifacts/quiet-mindmap/.env` and fill in the
   Clerk key (see **Secrets** below).

## Commands

- `pnpm --filter @workspace/quiet-mindmap run dev` — web app, http://localhost:5173
- `pnpm --filter @workspace/api-server run dev` — API server, port 8080 (see **Known gaps** —
  needs env wiring first to run locally)
- `pnpm run typecheck` — all projects (`tsc --build` for the `lib/*` project-reference graph,
  then per-artifact `tsc --noEmit`). Must pass before shipping.
- `pnpm run test` — `pnpm -r --if-present run test`, i.e. vitest in whichever packages have a
  `test` script (currently `quiet-mindmap`, `api-server`, `lib/api-zod`). DB integration tests
  skip themselves without `DATABASE_URL`.
- `pnpm run build` — typecheck + build everything
- `pnpm --filter @workspace/api-spec run codegen` — regenerate `api-client-react` and
  `api-zod` from `lib/api-spec/openapi.yaml` (runs `typecheck:libs` afterward automatically)
- `pnpm --filter @workspace/db run push` — push Drizzle schema changes to Postgres (dev only)

Never run `pnpm dev` at the workspace root — always `--filter` a specific artifact.

### Running a single test

Each package with tests has its own `vitest.config.ts` (`environment: "node"`,
`include: ["src/**/*.test.ts"]`) — invoke vitest directly through the package filter rather
than the workspace `test` script:

```
pnpm --filter @workspace/quiet-mindmap exec vitest run src/lib/color.test.ts
pnpm --filter @workspace/api-server exec vitest run -t "sync"
pnpm --filter @workspace/api-zod exec vitest run
```

`artifacts/api-server/src/routes/routes.integration.test.ts` talks to a real Postgres
instance in a throwaway schema and is skipped entirely when `DATABASE_URL` is unset — expect
it to no-op locally unless you've pointed a DB at the env.

### Running pnpm from an agent shell on Windows

The root `preinstall` hook is a `sh` one-liner, and pnpm runs it on almost every command
(including `--filter … run typecheck`). From a **PowerShell** shell it fails with
`'sh' is not recognized`, aborting the whole command. Use the **Bash** tool, or prepend Git's
POSIX tools to PATH first:

```
export PATH="$PATH:/c/Program Files/Git/usr/bin"
```

## Verifying a change

**`pnpm run typecheck` and `pnpm run test` passing does not mean the app works.** The web app
has no component or browser tests — the suites cover pure functions only (`clampScale`,
`kindTint`, `hexToRgba`, the Zod schemas, the API routes). A UI change can typecheck, pass
every test, build cleanly, and still render a dead page.

For anything touching `artifacts/quiet-mindmap`, actually load it:

```
pnpm --filter @workspace/quiet-mindmap run dev    # http://localhost:5173
```

Two failure modes this repo has actually produced, neither of which surfaces an error anywhere:

- **An invalid CSS value silently disables a whole subsystem.** `view.scale` became `NaN`, so
  `transform: translate(…) scale(NaN)` was rejected and dropped *in full* — taking the
  translate with it. Pan, zoom, node dragging and connection-line alignment all broke at once,
  with a clean console, a clean build and green tests. Adding entries still worked, because
  that path never reads `scale`.
- **Work already in the tree may be broken before you start.** This repo carries large amounts
  of uncommitted work. Run `git status` and load the page *before* building on top of it,
  or a pre-existing breakage gets attributed to your change.

## API codegen pipeline

`lib/api-spec/openapi.yaml` is the single source of truth for the HTTP API. Orval
(`lib/api-spec/orval.config.ts`) generates two independent packages from it:

- **`lib/api-client-react`** — React Query hooks + a fetch client (`custom-fetch.ts`), for
  frontend consumption.
- **`lib/api-zod`** — Zod schemas and TS types, imported by `api-server`'s routes
  (`artifacts/api-server/src/routes/nodes.ts`) to validate request bodies and shape
  responses (e.g. `SyncNodesBody`, `ListNodesResponse`).

Edit `openapi.yaml`, then run the codegen command above — never hand-edit anything under a
package's `generated/` directory, it will be overwritten.

**Gotcha:** never use `type: integer` in `openapi.yaml` — use `type: number`. Orval emits
zod-4-only `z.int()` for `integer`, but the workspace pins zod 3, so `typecheck:libs` fails
immediately after codegen. Round server-side if integer semantics matter. (Full detail in
`.agents/memory/openapi-codegen-quirks.md`.)

## The web app now runs on Supabase, not the API server

`artifacts/quiet-mindmap` talks to **Supabase** directly from the browser for
accounts, data and file storage. It no longer uses Clerk or `artifacts/api-server`.
That is what lets it deploy as a static site with no server of its own — it is
live on Netlify, built from `netlify.toml`.

- **Setup lives in [supabase/setup.sql](supabase/setup.sql)** — tables, every
  row-level policy, the `return_shared_node` function, the storage bucket and the
  realtime publication. It is idempotent; re-run it to repair a drifted project.
- **The policies are the security boundary**, not the client. The anon key is
  public by design and ships in the bundle; Row Level Security is the only thing
  separating one account's entries from another's. Never put the `service_role`
  key anywhere the browser can reach.
- `src/lib/supabase.ts` (client), `src/lib/nodesTransport.ts` (queries, sharing,
  storage), `src/hooks/useAuth.ts` (session), `src/lib/people.ts` (who the demo
  accounts are — keyed by **email**, since a user id cannot be checked by eye and
  was once written down backwards).
- `useNodes`'s sync engine is unchanged: only its two transport calls moved.

`artifacts/api-server`, `lib/db`, `lib/api-spec`, `lib/api-client-react` and
`lib/api-zod` are now unused by the web app. They still build and typecheck, and
the mobile app still targets them — do not delete them, but do not assume the web
app goes through them either.

## Auth spans two packages (mobile app only — the web app moved to Supabase)

Clerk keys are resolved by hostname on both sides, not hardcoded, because the app runs on
Replit preview domains, localhost, and eventually a real domain:

- Frontend: `publishableKeyFromHost()` in `artifacts/quiet-mindmap/src/App.tsx` (see
  **Secrets** below for the dev-key requirement).
- Backend: `getClerkProxyHost()` / `clerkProxyMiddleware` in
  `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts`, feeding
  `publishableKeyFromHost()` again inside `clerkMiddleware(...)` in `app.ts`.

`requireAuth` (`artifacts/api-server/src/middlewares/requireAuth.ts`) is the gate on every
protected route; `authedUserId(res)` reads the id it sets and throws if called on a route
that isn't behind it — every query must be scoped to that id.

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
- `artifacts/mockup-sandbox` and `artifacts/mindmap-mobile` still hard-throw without
  `PORT`/`BASE_PATH`; both expect Replit's workflow runner to inject them (mockup-sandbox's
  are declared in its `.replit-artifact/artifact.toml`).

## Gotchas

- Sign-in is currently **optional** — `REQUIRE_SIGN_IN` in
  `artifacts/quiet-mindmap/src/config.ts` is `false`, so the app runs fully offline on
  localStorage with no backend or database. Signing in without the API running is expected to
  report `syncStatus: 'error'`.
- The sync layer in `artifacts/quiet-mindmap/src/hooks/useNodes.ts` (pending-op queue,
  last-write-wins merge, guest/account store switching) is the highest-risk code in the repo —
  mistakes there mean silent data loss for notes users cannot recover elsewhere. Change it
  carefully and prefer adding tests. The server-side half of that guard is
  `onConflictDoUpdate(...).setWhere(updatedAt <= ...)` in
  `artifacts/api-server/src/routes/nodes.ts`.
- **"My entries were deleted" is usually the store switch, not deletion.** Guest and account
  entries live under separate keys (`quiet-mindmap-nodes:guest` vs
  `quiet-mindmap-nodes:<clerkUserId>`) and are deliberately never merged, so signing in shows
  an empty map while the guest entries sit untouched. Off Replit there is no API or database
  behind the account store, so it stays empty and the badge reads "Sync paused — retrying".
  Signing out restores the guest map. Confirm before assuming loss:
  ```js
  Object.keys(localStorage).filter(k => k.startsWith('quiet-mindmap')).forEach(k => console.log(k))
  ```
  A failed sync never deletes: the merge only runs in the success path of `useNodes`, and the
  `catch` sets a status flag without writing.
- **Validate geometry read from localStorage.** Stored entries outlive any build, so one record
  written badly by an old version keeps breaking every future one. `loadStoredNodes` repairs
  non-finite `x`/`y` on read (and `clampScale` refuses to return a non-finite scale) precisely
  because a single bad coordinate propagated through `fitView` into `view.scale` and killed the
  viewport transform. Repair coordinates rather than dropping records — the note text is the
  part users cannot recover. Note `Math.min`/`Math.max` **propagate** `NaN` rather than
  clamping it, so a range clamp is not a guard on its own.
- Keep exactly one `@types/react` / `@types/react-dom` version workspace-wide (19.1.x, both
  `catalog:` in `pnpm-workspace.yaml` and its `overrides`) — a second hoisted copy produces
  baffling TS2322 "two different types with this name" errors in consumers like
  mockup-sandbox. A plain `pnpm install` won't clean up a stale duplicate; use
  `pnpm install --force`. (Full detail in `.agents/memory/react-types-single-version.md`.)
- Expo typed routes (`.expo/types/router.d.ts`, mindmap-mobile) go stale when routes are
  added while the Expo dev server is stopped — restart it before trusting route-string
  typecheck errors.
- More in replit.md's own Gotchas section (explicit node widths, `overflow: visible` on the
  connection-line SVG, one-shot seeding).
