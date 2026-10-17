# Mindmap

A private, space-themed mindmap for managers and directors to capture, classify, and clear workplace concerns and tasks, without routing sensitive notes through a secretary or shared inbox.

Entries live in a per-user Postgres store behind an API (Clerk auth), with an offline-first localStorage cache that syncs when the connection returns.

## Features

- Dark canvas with nodes orbiting a central hub; scroll/pinch to zoom, drag to pan
- Four kinds: **Urgent**, **Concern**, **Idea**, **Task**; three statuses: open, handled, archived
- Sub-items (nested entries), search, kind/status filters
- Offline-first sync with last-write-wins conflict resolution
- Web app plus an Expo mobile companion
- Guest mode: runs fully on localStorage with no backend

## Repo layout

pnpm workspace.

| Path | What |
|---|---|
| `artifacts/quiet-mindmap` | Web app (React, Vite, Tailwind v4, Framer Motion) |
| `artifacts/mindmap-mobile` | Mobile app (Expo, React Native) |
| `artifacts/api-server` | REST API (Express 5) |
| `artifacts/mockup-sandbox` | Component preview sandbox |
| `lib/api-spec` | OpenAPI spec (source of truth) and Orval codegen |
| `lib/api-zod`, `lib/api-client-react` | Generated Zod schemas and React hooks |
| `lib/db` | Drizzle ORM schema for Postgres |

`quiet-mindmap` is the app's original name. It is kept in package names, paths and localStorage keys so existing saved entries aren't orphaned.

## Quick start

Requires Node 24 and pnpm (`corepack enable`). On Windows, put Git's POSIX tools (`C:\Program Files\Git\usr\bin`) on `PATH`, because the `preinstall` script uses `sh`.

```bash
pnpm install
cp artifacts/quiet-mindmap/.env.example artifacts/quiet-mindmap/.env   # add a Clerk dev key
pnpm --filter @workspace/quiet-mindmap run dev                         # http://localhost:5173
```

Sign-in is optional by default (`REQUIRE_SIGN_IN` in `artifacts/quiet-mindmap/src/config.ts`), so the web app works offline in guest mode without any keys.

## Commands

| Command | Does |
|---|---|
| `pnpm --filter @workspace/quiet-mindmap run dev` | Web app |
| `pnpm --filter @workspace/api-server run dev` | API on port 8080 |
| `pnpm run typecheck` | Typecheck all projects |
| `pnpm run test` | Vitest (DB integration tests skip without `DATABASE_URL`) |
| `pnpm run build` | Typecheck and build everything |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API client and Zod schemas |
| `pnpm --filter @workspace/db run push` | Push DB schema (dev only) |

Don't run `pnpm dev` at the workspace root; always `--filter` one artifact.

## Configuration

Copy `.env.example` files and fill in. Never commit `.env`.

| Variable | Used by | Notes |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | web | Must be a dev key (`pk_test_...`) for localhost |
| `VITE_CLERK_PROXY_URL` | web | Leave empty locally |
| `DATABASE_URL` | api, db | Postgres connection string |
| `SESSION_SECRET` | api | Session signing |
| `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` | api | Clerk server keys |

The API server doesn't load `.env` itself yet; pass `--env-file` or add dotenv.

## How sync works

1. Edits apply locally first and are queued (`quiet-mindmap-pending:<userId>`).
2. A debounced flush POSTs batched upserts and deletes to `/api/nodes/sync`.
3. Conflicts resolve last-write-wins on client `updatedAt`, enforced in both the SQL (`onConflictDoUpdate ... WHERE updatedAt <=`) and the client merge.
4. IDs and timestamps are client-generated, so offline-created entries keep a stable identity across devices.

This is the riskiest code in the repo (`hooks/useNodes.ts`); add tests when changing it.

## More docs

- [replit.md](replit.md): architecture, product behavior, design decisions
- [CLAUDE.md](CLAUDE.md): running off Replit, and changes that must not be reverted

## License

MIT. See [LICENSE](LICENSE).
