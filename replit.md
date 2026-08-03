# Quiet Mindmap

A private, space-inspired mindmap for directors and managers to capture, classify, explore, complete, and remove workplace concerns and tasks without exposing sensitive notes to a secretary or shared inbox. Everything stays on the device (localStorage).

## Run & Operate

- `pnpm --filter @workspace/quiet-mindmap run dev` — run the mindmap frontend (port assigned by workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session signing

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, Framer Motion, Wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (not yet wired to frontend — localStorage only for now)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `artifacts/quiet-mindmap/src/pages/MindmapPage.tsx` — main page (canvas, filters, detail card)
- `artifacts/quiet-mindmap/src/components/` — NodeBubble, NodePanel, FilterBar, StarField
- `artifacts/quiet-mindmap/src/hooks/useNodes.ts` — localStorage persistence + seed data
- `artifacts/quiet-mindmap/src/types.ts` — MindNode type, NodeKind, KIND_META color config
- `lib/api-spec/openapi.yaml` — OpenAPI source of truth

## Architecture decisions

- Local-first (localStorage) for v1 — keeps the app private without requiring auth or a backend
- No backend routes for node data yet — the API server exists but is not connected to the mindmap
- Seed nodes are generated at first load using canvas dimensions for radial positioning; clearing them sets a localStorage flag to prevent re-seeding
- Dragging is handled via pointer events on each node without a library to avoid dependency overhead

## Product

- Space-themed dark canvas with nodes orbiting a central hub
- Four node kinds: Urgent (orange), Concern (purple), Idea (green), Task (blue)
- Three statuses: open, handled, archived
- Filter bar: search, kind filter, status filter
- Click a node to see its detail card with quick-action buttons
- Add/edit via slide-in panel
- Privacy badge confirms data stays on device

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Seed nodes are placed using canvas dimensions; if canvasWidth/canvasHeight is 0 at mount time, seeding is deferred until the ResizeObserver fires
- Do not run `pnpm dev` at workspace root — use the workflow tools or `pnpm --filter` targeting a specific artifact

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
