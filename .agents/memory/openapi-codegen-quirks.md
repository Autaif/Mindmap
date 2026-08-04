---
name: OpenAPI codegen quirks
description: Pitfalls when editing lib/api-spec/openapi.yaml in this repo
---

**Rule:** Do not use `type: integer` in `lib/api-spec/openapi.yaml` — use `type: number`.

**Why:** Orval emits `zod.int()` for `integer`, but the workspace pins zod 3 (`z.int()` is zod 4 only), so `typecheck:libs` fails right after codegen with TS2339 on the generated `api.ts`.

**How to apply:** When adding numeric fields to the spec, declare them `type: number` and round server-side if integer semantics matter.
