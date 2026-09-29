# ADR 001: Nx monorepo scaffold

- **Status:** Accepted
- **Date:** 2026-09-29

## Context

The CLI previously ran `create-next-app` and kept auth, database, env, and utils inside the Next.js app under `shared/libs/`. As the starter grows, and as agents make more of the changes, we need clearer package boundaries, a single lockfile, and a task graph — without inventing packages that nothing reuses yet.

## Decision

Scaffold an **Nx + pnpm workspace** with one Next.js app and a small set of workspace packages. Feature work stays in vertical slices under the app; shared packages hold capabilities with a distinct owner and API.

### Layout

```
/
  apps/web/                 # Next.js App Router — routes, feature slices, shadcn, Next adapters
  packages/
    env/                    # @scope/env — process.env boundary (Zod later if needed)
    database/               # @scope/database — Prisma contract, db, models, dbError
    auth/                   # @scope/auth — Better Auth server + client (peer: next)
    utils/                  # @scope/utils — cn, slugify (no Next / React required)
  AGENTS.md
  nx.json
  pnpm-workspace.yaml
```

`@scope` is derived from the workspace name (Nx root package `@name/source` → `@name`).

### Dependency direction

1. `apps/web` may depend on any workspace package.
2. `auth` may depend on `env` (and peer `next` for `nextCookies` / React client).
3. `database` may depend on `env`.
4. `utils` and `env` depend on nothing in the workspace.
5. Packages must not import from `apps/web`.
6. No barrel `index.ts` re-exports. Use package `exports` subpaths (`@scope/database/db`, `@scope/auth/authClient`).

### Stays in the app (Next / starter adapters)

- Route feature slices (`_components`, `_actions`, form `schema` / `actions`)
- shadcn UI under `apps/web/src/shared/components`
- `shared/libs/server/getSession` — uses `next/headers`
- `shared/libs/magic-link/devMagicLink` — starter-only; wired into auth from the app or a thin auth callback

### Tooling

- Root owns ESLint, Prettier, Vitest config, and Nx task orchestration.
- Prefer `pnpm` workspaces (`apps/*`, `packages/*`).
- Nx is the task runner (cache, project graph, `@nx/enforce-module-boundaries`); it does not replace package-manager workspaces.

## Consequences

- Scaffold flow switches from `create-next-app` to `create-nx-workspace --preset=next`, then repairs pnpm `allowBuilds` (Nx writes placeholder values that break install) and adds packages.
- Import paths in generated code use `@scope/...` for packages and `~/` (retargeted from Nx's `@/`) for app-local modules.
- Adding a second app can share env/database/auth/utils without moving folders again.
- Cost: more moving parts at generate time; agents must respect package boundaries (lint + AGENTS).

## Alternatives considered

- **Keep single Next app, add Nx later** — simpler short term; package extraction becomes a migration tax for every consumer.
- **Many packages from the example map (cache, i18n, analytics, …)** — rejected for a starter; add when a concrete need appears.
- **Turborepo instead of Nx** — viable; Nx chosen for Next plugin, module-boundary lint, and generators already aligned with this stack.
