---
name: Single @types/react version
description: Why the workspace pins @types/react to 19.1.x via catalog + pnpm overrides
---
Rule: keep exactly one `@types/react` / `@types/react-dom` version workspace-wide, on 19.1.x (matching the expo-pinned react 19.1.0). Both the catalog and pnpm `overrides` in `pnpm-workspace.yaml` enforce this.

**Why:** the mobile app pinned `~19.1.x` while the catalog had `^19.2.0`, producing two hoisted `@types/react` copies. Radix/shadcn packages then mixed them, causing baffling TS2322 "Two different types with this name exist" ref errors in mockup-sandbox.

**How to apply:** if the lockfile shows one version but `node_modules/.pnpm` still contains a second `@types/react` (plain `pnpm install` won't clean it), run `pnpm install --force` to purge the stale copy. All packages should use `"@types/react": "catalog:"`. When bumping react types, change catalog AND the override together. Also: expo typed-routes (`.expo/types/router.d.ts`) goes stale when routes are added while the expo dev server isn't running — restart the expo workflow to regenerate before trusting typecheck errors about route strings.
