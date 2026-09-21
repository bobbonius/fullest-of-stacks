# fullest-of-stacks

CLI starter that scaffolds a full-stack Next.js app by running the **official** Next.js, shadcn, and Prisma 8 wizards, then layering on Better Auth (magic links), Zod, Vitest, factory-js, ESLint, and Prettier.

The generated app uses `src/`, route groups, colocated route-level `_actions` / `_components`, form-owned `schema/` and `actions/`, and a `shared/` folder for anything used across routes.

The CLI asks for a **PostgreSQL** port and database name (Postgres only), then writes:

`postgresql://postgres:postgres@localhost:[PORT]/[DATABASE_NAME]?schema=public`

into `.env.local`. `--yes` still asks for those; it only applies recommended answers to Next.js, shadcn, and Prisma.

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
| `--yes` / `-y` | Recommended answers for Next.js, shadcn, and Prisma. Still asks for Postgres port and database name |
| `--pnpm` `--npm` `--yarn` `--bun` | Package manager used for create/dlx/install |
| `--help` | Show help |

## What it runs

It first asks for package manager, project name, PostgreSQL port, and database name (Postgres only; user/password `postgres`/`postgres` on localhost). `--yes` still asks for port and database name.

1. **`create-next-app@latest`** — you go through the Next.js menu
2. **`shadcn@latest init`** — you go through the shadcn menu, then aliases are retargeted to `shared/`
3. **`npx prisma@latest orm init --yes`** — Postgres + TypeScript contract (the interactive Prisma wizard is skipped; it hangs and breaks under pnpm)
4. Installs **Prettier, ESLint extras, Vitest, Zod, Better Auth**
5. Adds shadcn components (`button`, `input`, `label`, `card`, `sonner`, `textarea`, `form`)
6. Writes routes, Zod schemas, factory-js fixtures, colocated Vitest tests, and coverage config

Latest versions are used (`@latest` on every CLI and package).

### Recommended wizard answers

These match a typical `src/` + `~/*` App Router project:

**Next.js**
- TypeScript: Yes
- Linter: ESLint
- Tailwind: Yes
- App Router: Yes
- `src/` directory: Yes
- Import alias: `~/*`
- Turbopack: Yes

**shadcn**
- Base color: Neutral
- CSS variables: Yes
- Icon library: lucide

**Prisma 8** (passed as flags, not a menu)
- Database: PostgreSQL
- Authoring: TypeScript
- Schema path: `src/prisma/contract.ts` or `prisma/contract.ts`

## What gets scaffolded

```
src/
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
    (dashboard)/dashboard/_actions/
    (dashboard)/dashboard/posts/new/_components/PostForm/
      schema/                      Zod for the post form
      actions/                     create post
    api/auth/[...all]/             Better Auth handler
    api/health/                    health check
    api/posts/                     authenticated JSON list
  shared/
    components/ui/                 shadcn
    libs/
      auth/                        Better Auth server + client
      database/                    db, models, db-error
      env/                         process.env boundary
      magic-link/                  starter-only URL store
      server/                      getServerSideSession
      utils/                       cn (shadcn) + slugify
    hooks/
  prisma/                          User/Session/Account/Verification + Post
  test/factories/                  factory-js user, session, post, form input
  test/mocks/                      db, session, navigation, auth-client
vitest.config.ts
eslint.config.ts
.prettierrc
```

Better Auth uses a `pg` Pool against the same `DATABASE_URL` as Prisma 8, because the Prisma adapter does not officially support Prisma 8 yet. Auth tables live in the Prisma contract so one schema owns the database.

The login page **prints the magic-link URL** so you can sign in without an email provider. That preview is starter-only — remove it before production.

## After generate

```bash
cd my-app
pnpm db:init
pnpm db:seed
pnpm db:reset   # optional: wipe local data, recreate tables, and re-seed
pnpm dev
pnpm test
pnpm test:coverage
```

Requires **Node.js 24+**. The CLI exits immediately on older versions.

## Requirements

- Node.js 24+
- A package manager (pnpm preferred)
- PostgreSQL when you are ready to run the app
