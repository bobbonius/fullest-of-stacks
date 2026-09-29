import type { TemplateContext } from '../lib/template.ts'
import { t } from '../lib/template.ts'

export const AGENTS_MARK_START = '<!-- BEGIN:fullest-of-stacks -->'
export const AGENTS_MARK_END = '<!-- END:fullest-of-stacks -->'

export function agentsGuide(ctx: TemplateContext) {
  return t(
    `${AGENTS_MARK_START}

# fullest-of-stacks

This app was scaffolded with fullest-of-stacks. Follow **this file** and the Next.js docs in \`node_modules/next/dist/docs/\` — not older Next.js or Prisma Client habits from training data.

## Philosophy

- **KISS (Keep It Simple, Stupid).** Prefer the smallest clear solution. Do not invent setup wizards, special-case "database not ready" flows, or defensive UI for problems you fix with \`db:init\` / \`db:seed\`.
- When a server action or loader hits the database and fails, \`return getDatabaseError(error)\`. Do not branch on \`.kind === 'unready'\`, build long setup messages, or invent a parallel \`setupError\` field.
- Optimize for readable code over hypothetical edge cases.

### Context efficiency

AI makes writing code cheap. The expensive part is describing intent, finding the right place to change, and verifying the result. Design so engineers and agents need as little of the system as possible to change something safely.

- **Change-context surface** — the domain concepts, rules, existing behavior, dependencies, constraints, and verification needed for one change.
- **Context efficiency** — how well the architecture keeps that knowledge small, relevant, and explicit.

Prefer vertical slices (capability / use case) over deep technical layering for feature work. A slice like \`createPost\` or \`requestMagicLink\` should be the unit of change: colocated UI, schema, action, and tests. Shared packages hold genuinely reused capabilities (auth, database, env), not premature abstractions. Verify user journeys with Playwright e2e; Vitest covers units and components.

When a change needs a structured description, package it as intent — capability, domain language, rules, and how to verify — rather than a vague prompt. Keep specs connected to tests so they do not drift. Do not model every detail twice; make explicit only what reduces more uncertainty than it costs to maintain.

Give agents **bounded autonomy**: clear ownership of what may change, expected behavior, and verification. Autonomy without boundaries is not a goal.

## Architecture

Dependency direction (enforce it; do not bypass layers):

1. **App / routes** — compose features. Pages and layouts stay thin.
2. **Feature slices** — route-colocated UI, Zod schemas, server actions, focused tests.
3. **Shared packages / libs** — auth, database, env, utils. Explicit public APIs; no circular imports.
4. **Adapters** — Prisma, Better Auth, \`pg\`, HTTP. Own vendor and I/O details.

Lower layers must not import from the app or from UI frameworks unless their job requires it. Prefer named exports. Avoid barrel \`index.ts\` re-export files that hide dependency graphs (framework entrypoints excepted).

### Next.js composition

- App Router and Server Components by default. \`use client\` only for browser APIs or local interaction; keep those boundaries narrow.
- Route files are compositional. Put real behavior in colocated components/actions or shared libs — not in fat \`page.tsx\` files.
- Avoid request-specific APIs in root layouts unless the whole tree is intentionally dynamic.
- Keep general-purpose shared code free of Next.js imports. Put \`next/headers\`, cookies, and navigation at the app or thin adapter edge (\`getSession\`, route handlers).
- Validate every untrusted boundary (forms, route handlers, server actions). Load session on the server; never trust a client-sent user id.
- Server actions are for form/mutation flows with clear auth and error semantics — not a general-purpose RPC API.

### Data and failures

- Talk to Postgres through \`{{databaseImport}}/db\` and typed models from \`{{databaseImport}}/models\`. Business rules that grow beyond a single action belong in a service/module, not scattered in JSX.
- Map DB failures with \`return getDatabaseError(error)\`. Distinguish expected domain/action errors from unexpected throws (let the framework error boundary handle the latter).
- Cache only with an explicit key, lifetime, and invalidation story. Do not share personalized data across users.

### Lint as architecture

ESLint, TypeScript, Prettier, and Vitest are the executable contract. No \`eslint-disable\` to sneak past boundaries. Unused lint-disable directives are errors. Default exports only where Next.js or tooling requires them.

### Monorepo packages

| Package | Import | Owns |
| --- | --- | --- |
| \`apps/web\` | \`~/\` | Routes, feature slices, shadcn, \`getSession\` |
| \`packages/env\` | \`{{envImport}}\` | \`process.env\` boundary |
| \`packages/database\` | \`{{databaseImport}}/*\` | Prisma contract, \`db\`, models, \`dbError\` |
| \`packages/auth\` | \`{{authImport}}/*\` | Better Auth server + client (+ starter magic-link helper) |
| \`packages/utils\` | \`{{utilsImport}}\` | \`cn\`, \`slugify\` |

Apps depend on packages. Packages must not import from apps. Prefer package subpath exports over barrel \`index.ts\` files.

## Naming

Use these verb prefixes. Do not invent parallel verbs (\`fetch\`, \`make\`, \`generate\`, \`process\`, \`do\`, \`run\`, \`map\` for object shaping).

| Prefix | Use for | Example |
| --- | --- | --- |
| \`get\` | Read/fetch (DB, session, API, cache) | \`getPosts()\`, \`getPostById(id)\`, \`getServerSideSession()\` |
| \`create\` / \`update\` / \`delete\` | Persist writes | \`createPost({ data })\`, \`updatePost(id, data)\`, \`deletePost(id)\` |
| \`build\` | Assemble a value from inputs (URL, options, DTO, query) | \`buildPaginationUrl(params)\`, \`buildPostCreateInput(data)\` |
| \`adapt\` | Transform shape A → shape B (rows → UI, lists, API payloads) | \`adaptPosts(posts)\`, \`adaptUser(row)\` |
| \`to\` | Cheap scalar/format converts (lighter than \`adapt\`) | \`toSlug(title)\`, \`toIsoDate(value)\` — tiny shared utils like \`slugify\` may keep their established name |
| \`parse\` | Validate/decode input when you wrap Zod or search params | \`parsePostForm(data)\` — prefer schema \`.safeParse\` directly when a wrapper adds nothing |
| \`is\` / \`has\` / \`can\` | Booleans only | \`isPublished(post)\`, \`hasSession(session)\` |
| \`handle\` | Client event/UI callbacks | \`handleSubmit\`, \`handleSignOut\` |
| \`use\` | React hooks only | \`usePostForm\` |

Shape rules:

- Collections are plural; a single record uses singular + \`By…\`: \`getPosts\`, \`getPostById\`, \`getPostBySlug\`.
- Server actions stay verb-first and domain-clear: \`createPost\`, \`requestMagicLink\`. Add an \`Action\` suffix only when the export would clash with a UI handler (\`signOutAction\`).
- Factories stay \`*Factory\` (\`postFactory\`). Types stay nouns (\`Post\`, \`PostFormData\`) — never \`IPost\`.
- **Our files are never kebab-case.** React components (and component folders) use PascalCase matching the export: \`FilterMenu.tsx\`, \`LoginForm/\`. Non-component modules use camelCase matching the main export: \`getPublishedPosts.ts\`, \`createPost.ts\`, \`dbError.ts\`. Colocated tests follow the same stem: \`FilterMenu.test.tsx\`, \`getPublishedPosts.test.ts\`.
- **Exception — third-party / generated code:** leave shadcn (and similar) output as-is (\`button.tsx\`, \`use-mobile.ts\`). Do not rename upstream files to PascalCase.
- Next.js route conventions stay lowercase: \`page.tsx\`, \`layout.tsx\`, \`route.ts\`.

## Next.js

- App Router only. Default to Server Components. Add \`'use client'\` only for interactive UI.
- Use \`async\` page/layout components, \`cookies()\` / \`headers()\` from \`next/headers\`, and server actions (\`'use server'\`) for mutations.
- Prefer \`next/link\`, \`next/image\`, and \`next/navigation\` (\`redirect\`, \`notFound\`). Do not add a \`pages/\` directory.
- Keep \`typedRoutes\` on. After adding routes, let Next.js types catch bad \`href\`s.

## Routing and colocation

- Public UI lives under \`(app)/\`. Signed-in UI lives under \`(dashboard)/\`. The dashboard layout redirects to \`/login\` when there is no session.
- Route handlers belong in \`app/api/*/route.ts\`. Auth is already mounted at \`/api/auth/[...all]\`.
- Colocate a feature on its route: \`page.tsx\`, \`_components/\`, \`_actions/\`, and tests next to the file they cover. That colocated slice is the preferred **unit of change**.
- Underscore folders (\`_components\`, \`_actions\`) only at the **route** level, so Next.js ignores them as routes. Nested folders inside a component (forms, schema, actions) are not underscored.
- A **form** is a folder under the route's \`_components/\` (for example \`LoginForm/\`). That folder owns the presentational component, \`schema/\`, and \`actions/\`.
- Server actions that belong to a form live in that form's \`actions/\` and import the schema from \`../schema\`. Do not put route-specific actions in \`shared/\`.
- Shared UI, libs, and hooks live under \`shared/\` (or workspace packages when this repo is an Nx monorepo). Route-only code does not.

## Components

- Follow **ESLint** and the patterns already in this repo. Do not add \`eslint-disable\` to make new code pass. Match existing naming, colocation, and imports.
- Prefer abstractions when repetition is real. Extract helpers, shared UI, and repeated logic instead of growing one file — but do not invent packages or layers "for later."
- When a component is too large or hard to read, split it. Route-only pieces go in \`_components/\` on that route. Reusable pieces go in \`shared/\` or a workspace UI package.
- Keep components presentational. A component file should contain imports, the \`Props\` type, and the exported component — nothing else.
- Put everything else in a colocated folder: extra UI in the route's \`_components/\`, form Zod schemas in that form's \`schema/\`, form server actions in that form's \`actions/\`, shared code in \`shared/\`. Route-level data loaders (not tied to a form) stay in the route's \`_actions/\`.
- Name the props type \`Props\` and declare it as an \`interface\` immediately above the exported component. Destructure in the parameter list (\`({ children }: Props)\`), not via a \`props\` variable.
- In JSX, prefer ternaries over \`&&\`. When the false branch renders nothing, use \`undefined\` — not \`null\` (\`condition ? <El /> : undefined\`). There is no dedicated React ESLint rule for preferring \`undefined\` over \`null\` (\`react/jsx-no-leaked-render\` even autofixes to \`null\`), so this starter encodes both checks with \`no-restricted-syntax\`.
- Prefer semantic HTML and accessible names/roles. Query tests through role, label, and text — not brittle CSS selectors.
- Make loading, empty, and error states deliberate.
- Next.js route conventions stay in the route file: default page/layout exports, \`metadata\`, and root-layout font setup.

## Shared

- App UI (shadcn): \`{{uiImport}}\`
- Workspace packages (import these — do not reach into \`packages/*/src\` via relative paths from the app):
  - \`{{envImport}}\` — \`process.env\` boundary
  - \`{{databaseImport}}/db\`, \`/models\`, \`/dbError\` — Prisma client and DB helpers
  - \`{{authImport}}/auth\`, \`/authClient\` — Better Auth (delete \`{{authImport}}/devMagicLink\` before production)
  - \`{{utilsImport}}\` — \`cn\`, \`slugify\`
- App-local Next adapters: \`{{libImport}}/server/getSession\`
- App hooks: \`{{importPrefix}}shared/hooks\`
- Add more shadcn components with \`pnpm dlx shadcn@latest add <name>\` from \`apps/web\` — aliases already point at \`shared/\` and the utils package.
- Extract another workspace package only when the code is reused across apps or has a distinct owner/API — not because a folder exists.

## Prisma 8

This is **not** Prisma 7. There is no \`PrismaClient\`, \`findMany\`, or \`prisma.user.create\`.

- Contract: \`packages/database/prisma/contract.ts\` (or \`.prisma\`)
- Client: \`{{databaseImport}}/db\` → \`db.orm.public.Model\`
- Model row types: \`Post\`, \`User\`, … from \`{{databaseImport}}/models\` (\`NonNullable<(typeof db.orm.public.Model)['_row']>\`). Do not hand-roll local copies of those shapes.
- Database errors: \`getDatabaseError\` from \`{{databaseImport}}/dbError\`. In \`catch\`, \`return getDatabaseError(error)\` — that is enough.
- Reads: \`await db.orm.public.Post.where({ authorId }).all()\` or \`.first()\`
- Writes: \`await db.orm.public.Post.create({ ... })\`
- Primary keys are CUID2 values stored as \`text\` (\`@default(cuid(2))\`), so they match Better Auth. Prisma generates them on create; Better Auth uses the same generator via \`advanced.database.generateId\`. Do not use \`field.id.cuid2()\` — that maps to \`character(24)\`, which \`db init\` cannot alter from existing \`text\` columns.
- Auth \`email\` / \`session.token\` uniqueness is a unique index (\`user_email_key\`, \`session_token_key\`), not \`field.text().unique()\`. Better Auth creates indexes; Prisma unique constraints reuse those names and \`db init\` then fails.
- After contract changes: \`prisma contract emit\`, then \`{{packageManager}} db:init\` or \`prisma db update\`
- Database scripts: \`{{packageManager}} db:init\` (create tables), \`{{packageManager}} db:seed\` (homepage posts), \`{{packageManager}} db:reset\` (drop public schema, recreate tables, re-seed), \`{{packageManager}} db:studio\` (Prisma Studio).
- \`DATABASE_URL\` is written at scaffold time from the CLI Postgres port and database name: \`{{databaseUrl}}\`.
- Do not add Prisma agent skill files. \`prisma.config.ts\` disables the skills check on purpose.

### Adding a model

When you add or change a Prisma model, update **every** dependent surface — do not leave local duplicate types behind.

1. **Contract** — add the model (and relations) in \`packages/database/prisma/contract.ts\`. Prefer \`text\` + \`cuid(2)\` ids and \`timestamp(3)\` datetimes as above.
2. **Emit + DB** — run \`prisma contract emit\`, then \`{{packageManager}} db:init\` (or \`prisma db update\`).
3. **Shared row type** — add \`export type ModelName = NonNullable<(typeof db.orm.public.ModelName)['_row']>\` in \`{{databaseImport}}/models\`. Import that type everywhere you need the row shape (actions, components, API routes). Never redefine the fields locally.
4. **Unique constraint messages** — if the model has a unique field users can collide on, map its constraint name in \`UNIQUE_CONSTRAINT_MESSAGES\` inside \`{{databaseImport}}/dbError\`.
5. **Factories** — add or extend a factory in \`{{importPrefix}}test/factories\` typed with the shared model type, including every required column (defaults, timestamps, optionals as \`null\` when appropriate).
6. **Mocks** — extend \`{{importPrefix}}test/mocks/db\` with the new model's \`create\` / \`where\` / query helpers used by tests.
7. **Seed / reset** — update \`packages/database/prisma/seed.ts\` if the homepage or demos need sample rows; keep \`db:reset\` able to recreate a working DB.
8. **Tests** — cover new actions, pages, and helpers next to the code. Run \`{{packageManager}} test:coverage\` and keep thresholds at **90%** (lines, functions, branches, statements).

## Zod

- Every form owns its Zod schema at \`_components/FormName/schema/index.ts\`. Export \`FormNameSchema\` and \`FormNameData\` (\`z.infer<typeof FormNameSchema>\`).
- Never define a form schema inside the component file or as a route-level \`schema.ts\`.
- The form and its server action share that schema: the client uses \`zodResolver(FormNameSchema)\`; the action \`safeParse\`s \`props.data\`.
- Form actions take \`({ data }: Props)\` where \`Props\` is an \`interface\` with \`data: FormNameData\` (plus any extra server-only fields). Load the session on the server — do not trust a user id from the client.
- Check authentication before \`safeParse\`. If there is no session, redirect or return early; do not parse the schema first.
- Return field/action errors from \`safeParse\`; do not throw for expected validation failures. Map database failures with \`return getDatabaseError(error)\`.

## Auth

- Magic links only. There is no password sign-up.
- Server session: \`getServerSideSession\` from \`{{libImport}}/server/getSession\`
- Client: \`signIn.magicLink\` / \`useSession\` from \`{{authImport}}/authClient\`
- Better Auth uses a \`pg\` Pool on \`DATABASE_URL\`. Do not wire \`prismaAdapter\` (Prisma 8 is not supported there yet).
- Auth tables live in the Prisma contract (\`User\`, \`Session\`, \`Account\`, \`Verification\`). Datetime columns are \`timestamp(3)\` (\`field.temporal.timestampString(3)\`), not Prisma \`DateTime\` / \`timestamptz\`, so they match Better Auth and \`db init\` can stay additive.
- The login page prints the magic-link URL for local testing. **Remove that preview, \`{{authImport}}/devMagicLink.ts\`, and the store-and-print \`sendMagicLink\` callback before production.** Send the URL by email instead.

## Tests

Vitest covers units and components. **Playwright e2e tests are the primary proof the app works** — real browser journeys against Next.js + Postgres. New product behavior should land with both levels when it affects a user journey.

### Unit / component (Vitest)

- **New code ships with tests.** Every new page, layout, route handler, server action, shared lib, and non-trivial helper gets a colocated \`*.test.ts\` / \`*.test.tsx\` next to the file it covers. Do not leave behavior untested.
- Vitest + Testing Library + \`@factory-js/factory\`. Prefer factories in \`{{importPrefix}}test/factories\` (\`.build()\`, \`.buildList()\`, \`.props()\`, \`.use(trait)\`) over hand-rolled fixtures.
- Reuse \`{{importPrefix}}test/mocks\` for \`db\`, session, \`next/navigation\`, and the Better Auth client.
- Test observable behavior and outcomes, not incidental implementation details. Prefer accessible role/name/label queries; use test ids only when no semantic query works.
- Mock as little as practical, at the lowest useful boundary (\`db\`, session, navigation). Do not mock internal modules just to assert call order.
- \`vi.mock\` calls must stay at module top level (they are hoisted). Use \`vi.hoisted\` when a mock factory needs a shared \`vi.fn()\`.
- Mock \`redirect\` must throw (\`NEXT_REDIRECT:\`) so App Router control flow matches production.
- Coverage thresholds are enforced in \`vitest.config.ts\`: **90%** lines, functions, branches, and statements for app code, workspace packages, \`packages/database/prisma/seed.ts\`, and \`packages/database/prisma/reset.ts\`. Run \`{{packageManager}} test:coverage\` before finishing work and treat a threshold failure as a failing change.
- Only add tests that assert real behavior. For CLI entrypoints, starter-only dead ends, or other paths that are awkward to exercise meaningfully, prefer a focused \`/* v8 ignore … */\` (or a coverage exclude) over a pointless test.
- Vitest must not pick up Playwright files — keep e2e under \`e2e/\` (already excluded).

### End-to-end (Playwright)

- Specs live in \`e2e/*.spec.ts\`. Shared flows go in \`e2e/helpers/\` (for example \`signInWithMagicLink\`).
- Cover critical journeys: homepage + seeded data, magic-link sign-in / sign-out, auth gate on \`/dashboard\`, create post → appears on home.
- Prefer accessible queries (\`getByRole\`, \`getByLabel\`, \`getByText\`) — same rule as Vitest.
- Do not mock the app. Hitting real Postgres and Better Auth is the point. Use unique emails/titles per run so tests stay isolated.
- Prerequisites: Postgres running, \`{{packageManager}} db:init\`, \`{{packageManager}} db:seed\`, browsers via \`{{packageManager}} test:e2e:install\` (once).
- Commands: \`{{packageManager}} test:e2e\` (CI), \`{{packageManager}} test:e2e:ui\` (debug). Playwright starts \`next dev\` via \`webServer\` unless a server is already on port 3000.
- When you add a user-facing feature, add or extend an e2e spec that would fail if that feature broke. Treat a red e2e suite as a broken app.

## Style

- Prettier 3 defaults, with two TypeScript-community choices: no semicolons and single quotes. Print width 80, trailing commas, always wrap arrow-function parameters, LF line endings. \`prettier-plugin-tailwindcss\` sorts \`className\` lists.
- ESLint: type-checked TypeScript, unused imports, simple-import-sort, no \`process.env\` outside \`packages/env\`, object shapes as \`interface\` (not \`type\`), and JSX ternaries that render nothing must use \`undefined\` (not \`null\` or \`&&\`). Default exports are only for Next.js pages, layouts, routes, and config files. Treat the linter as part of the contract — new code must pass it the same way existing files do.
- Import alias is \`{{importPrefix}}\`. Do not introduce \`@/\` if the project uses \`~/\` (or the reverse).

${AGENTS_MARK_END}
`,
    ctx
  )
}
