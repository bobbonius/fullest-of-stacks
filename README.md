# fullest-of-stacks

CLI starter that scaffolds an **Nx + pnpm monorepo** with a Next.js app by running the **official** Nx, shadcn, and Prisma 8 wizards, then layering on Better Auth (magic links), Zod, Vitest, factory-js, ESLint, and Prettier.

Generated layout:

```
apps/web/                 Next.js App Router — routes, feature slices, shadcn, Next adapters
packages/
  env/                    @scope/env — process.env boundary
  database/               @scope/database — Prisma contract, db, models, dbError
  auth/                   @scope/auth — Better Auth server + client
  utils/                  @scope/utils — cn, slugify
```

Feature work stays in vertical slices under `apps/web`. Shared packages hold capabilities with a distinct owner and public API (no barrel re-exports). See `docs/adr/001-nx-monorepo.md` and the generated `AGENTS.md`.

The CLI asks for a **PostgreSQL** port and database name (Postgres only), then writes:

`postgresql://postgres:postgres@localhost:[PORT]/[DATABASE_NAME]?schema=public`

into `.env.local`. `--yes` still asks for those; it only applies recommended answers to Nx, shadcn, and Prisma.

## Usage

```bash
npx github:bobbonius/fullest-of-stacks
npx github:bobbonius/fullest-of-stacks my-app
```

Locally, from this directory:

```bash
pnpm install
node ./bin/fullest-of-stacks.js my-app
```

Recommended answers for the official CLIs (still prompts for Postgres port and database name):

```bash
node ./bin/fullest-of-stacks.js my-app --yes --pnpm
```

### Options

| Flag | Meaning |
| --- | --- |
| `--yes` / `-y` | Recommended answers for Nx, shadcn, and Prisma. Still asks for Postgres port and database name |
| `--pnpm` `--npm` `--yarn` `--bun` | Package manager used for create/dlx/install (`pnpm` recommended) |
| `--help` | Show help |

## What it runs

It first asks for package manager, workspace name, PostgreSQL port, and database name (Postgres only; user/password `postgres`/`postgres` on localhost). `--yes` still asks for port and database name.

1. **`create-nx-workspace@latest --preset=next`** — `apps/web` with App Router + `src/`
2. **Workspace packages** — `env`, `database`, `auth`, `utils` under `packages/`
3. **`shadcn@latest init`** in `apps/web` — aliases retargeted to `shared/` + utils package
4. **`npx prisma@latest orm init --yes`** — Postgres + TypeScript contract at `packages/database/prisma/contract.ts`
5. Installs **Prettier, ESLint extras, Vitest, Zod, Better Auth**
6. Adds shadcn components (`button`, `input`, `label`, `card`, `sonner`, `textarea`, `form`)
7. Writes routes, Zod schemas, factory-js fixtures, colocated Vitest tests, and coverage config

Latest versions are used (`@latest` on every CLI and package).

### Recommended wizard answers

**Nx** (passed as flags when using `--yes`)
- Preset: next
- App name: web
- App Router + `src/`: Yes
- Package manager: pnpm
- Nx Cloud: skip

**shadcn**
- Base color: Neutral
- CSS variables: Yes
- Icon library: lucide

**Prisma 8** (passed as flags, not a menu)
- Database: PostgreSQL
- Authoring: TypeScript
- Schema path: `packages/database/prisma/contract.ts`

## What gets scaffolded

```
apps/web/src/
  app/
    (app)/page.tsx                 public home (seeded posts)
    (app)/_actions/                homepage data
    (app)/_components/             homepage UI
    (app)/login/                   magic-link sign-in
    (app)/login/_components/LoginForm/
      schema/                      Zod for the login form
      actions/                     request magic link
    (dashboard)/layout.tsx         session gate
    (dashboard)/dashboard/         signed-in home
    (dashboard)/dashboard/posts/new/_components/PostForm/
      schema/                      Zod for the post form
      actions/                     create post
    api/auth/[...all]/             Better Auth handler
    api/health/                    health check
    api/posts/                     authenticated JSON list
  shared/
    components/ui/                 shadcn
    libs/server/                   getSession (Next headers)
    hooks/
  test/factories/                  factory-js user, session, post, form input
  test/mocks/                      db, session, navigation, authClient
packages/
  env/src/env.ts
  database/
    prisma/contract.ts             User/Session/Account/Verification + Post
    prisma/seed.ts / reset.ts
    src/db.ts, models.ts, dbError.ts
  auth/src/auth.ts, authClient.ts, devMagicLink.ts
  utils/src/cn.ts, slugify.ts
vitest.config.ts
playwright.config.ts
e2e/
  home.spec.ts
  auth.spec.ts
  posts.spec.ts
  helpers/auth.ts
eslint.config.ts
.prettierrc
nx.json
```

Better Auth uses a `pg` Pool against the same `DATABASE_URL` as Prisma 8, because the Prisma adapter does not officially support Prisma 8 yet. Auth tables live in the Prisma contract so one schema owns the database.

The login page **prints the magic-link URL** so you can sign in without an email provider. That preview is starter-only — remove it before production.

## After generate

```bash
cd my-app
pnpm db:init
pnpm db:seed
pnpm dev
```

Root scripts also include `db:reset`, `db:studio`, `test`, `test:coverage`, `test:e2e`, `lint`, and `format:write`. Dev/build/start go through Nx (`nx dev web`).

Playwright covers the critical journeys (home, magic-link auth, create post). After `db:init` / `db:seed`:

```bash
pnpm test:e2e:install   # once
pnpm test:e2e
```

Agent guidance lives in `AGENTS.md` (context efficiency, vertical slices, naming, Prisma 8, package boundaries, e2e). Architecture decision: `docs/adr/001-nx-monorepo.md`.
