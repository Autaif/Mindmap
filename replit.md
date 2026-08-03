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

- `artifacts/quiet-mindmap/src/pages/MindmapPage.tsx` — main page (canvas, viewport/zoom/pan, connection lines, filters, detail card)
- `artifacts/quiet-mindmap/src/components/` — NodeBubble, NodePanel, FilterBar, StarField, ZoomControls
- `artifacts/quiet-mindmap/src/hooks/useNodes.ts` — localStorage persistence + seed data
- `artifacts/quiet-mindmap/src/types.ts` — MindNode type, NodeKind, KIND_META color config, Viewport + scale clamps
- `lib/api-spec/openapi.yaml` — OpenAPI source of truth

## Architecture decisions

- Local-first (localStorage) for v1 — keeps the app private without requiring auth or a backend
- No backend routes for node data yet — the API server exists but is not connected to the mindmap
- **World coordinates**: node `x`/`y` are world-space, with the focus orb at origin (0, 0). A single transformed container applies `translate(view.x, view.y) scale(view.scale)`, so nodes and their SVG connection lines share one coordinate space and cannot drift apart. Screen→world is `(clientCoord - canvasRectOrigin - view.offset) / view.scale`.
- Nodes saved before world coordinates existed (no `parentId` field) are migrated once on load by subtracting the canvas centre from `x`/`y`
- Sub-items are modelled as `parentId` on the node, not a nested tree — flat storage keeps filtering and search trivial. A child's line anchors to its nearest *visible* ancestor, falling back to the focus orb, so filtering never leaves a line dangling.
- Deleting a node **promotes** its children to the deleted node's own parent rather than cascading — least destructive option for notes the user can't recover from anywhere else
- Dragging is handled via pointer events on each node without a library to avoid dependency overhead. Drag updates React state (rAF-throttled) so lines track live, and writes to localStorage only once on pointer-up.
- Seed nodes are generated at first load; clearing them sets a localStorage flag to prevent re-seeding

## Product

- Space-themed dark canvas with nodes orbiting a central hub
- Four node kinds: Urgent (orange), Concern (purple), Idea (green), Task (blue)
- Three statuses: open, handled, archived
- Filter bar: search, kind filter, status filter
- Click a node to see its detail card with quick-action buttons
- Sub-items: "Sub-item" on the detail card nests an entry under another; children render smaller with a dashed link to their parent, and parents show a child count
- Navigation: scroll/pinch to zoom around the cursor, drag empty space to pan, +/− buttons zoom around centre, and the percentage button fits the whole map on screen (floored at 75% so labels stay readable)
- Add/edit via slide-in panel; press `N` to add, `Esc` to close
- Privacy badge confirms data stays on device

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Seeding and legacy-coordinate migration are deferred until the ResizeObserver reports non-zero canvas dimensions, and are guarded by a ref so they run exactly once
- Node cards need an **explicit** `width`. Their containing block is the zero-sized world-space wrapper, so `max-width` alone collapses them to the width of their longest word.
- The connection-line `<svg>` must keep `overflow: visible` — nodes legitimately sit at negative world coordinates
- Do not run `pnpm dev` at workspace root — use the workflow tools or `pnpm --filter` targeting a specific artifact

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
