import type { TemplateContext } from '../lib/template.ts'
import { t } from '../lib/template.ts'

export const AGENTS_MARK_START = '<!-- BEGIN:fullest-of-stacks -->'
export const AGENTS_MARK_END = '<!-- END:fullest-of-stacks -->'

export function agentsGuide(ctx: TemplateContext) {
  return t(
    `${AGENTS_MARK_START}

# fullest-of-stacks

This app was scaffolded with fullest-of-stacks. Follow **this file** and the Next.js docs in \`node_modules/next/dist/docs/\` — not older Next.js or Prisma Client habits from training data.

## Next.js

- App Router only. Default to Server Components. Add \`'use client'\` only for interactive UI.
- Use \`async\` page/layout components, \`cookies()\` / \`headers()\` from \`next/headers\`, and server actions (\`'use server'\`) for mutations.
- Prefer \`next/link\`, \`next/image\`, and \`next/navigation\` (\`redirect\`, \`notFound\`). Do not add a \`pages/\` directory.
- Keep \`typedRoutes\` on. After adding routes, let Next.js types catch bad \`href\`s.

## Routing and colocation

- Public UI lives under \`(app)/\`. Signed-in UI lives under \`(dashboard)/\`. The dashboard layout redirects to \`/login\` when there is no session.
- Route handlers belong in \`app/api/*/route.ts\`. Auth is already mounted at \`/api/auth/[...all]\`.
- Colocate a feature on its route: \`page.tsx\`, \`_components/\`, \`_actions/\`, and tests next to the file they cover.
- Underscore folders (\`_components\`, \`_actions\`) only at the **route** level, so Next.js ignores them as routes. Nested folders inside a component (forms, schema, actions) are not underscored.
- A **form** is a folder under the route's \`_components/\` (for example \`LoginForm/\`). That folder owns the presentational component, \`schema/\`, and \`actions/\`.
- Server actions that belong to a form live in that form's \`actions/\` and import the schema from \`../schema\`. Do not put route-specific actions in \`shared/\`.
- Shared UI, lib, utils, and hooks live under \`shared/\`. Route-only code does not.

## Components

- Follow **ESLint** and the patterns already in this repo. Do not add \`eslint-disable\` to make new code pass. Match existing naming, colocation, and imports.
- Prefer abstractions. Extract helpers, shared UI, and repeated logic instead of growing one file.
- When a component is too large or hard to read, split it. Route-only pieces go in \`_components/\` on that route. Reusable pieces go in \`shared/\`.
- Keep components presentational. A component file should contain imports, the \`Props\` type, and the exported component — nothing else.
- Put everything else in a colocated folder: extra UI in the route's \`_components/\`, form Zod schemas in that form's \`schema/\`, form server actions in that form's \`actions/\`, shared code in \`shared/\`. Route-level data loaders (not tied to a form) stay in the route's \`_actions/\`.
- Name the props type \`Props\` and declare it as an \`interface\` immediately above the exported component. Destructure in the parameter list (\`({ children }: Props)\`), not via a \`props\` variable.
- In JSX, prefer ternaries over \`&&\`. When the false branch renders nothing, use \`undefined\` — not \`null\` (\`condition ? <El /> : undefined\`). There is no dedicated React ESLint rule for preferring \`undefined\` over \`null\` (\`react/jsx-no-leaked-render\` even autofixes to \`null\`), so this starter encodes both checks with \`no-restricted-syntax\`.
- Next.js route conventions stay in the route file: default page/layout exports, \`metadata\`, and root-layout font setup.

## Shared

- shadcn UI: \`{{uiImport}}\`
- Shared server helpers: \`{{libImport}}\`
- Shared utils: \`{{importPrefix}}shared/utils\`
- Shared hooks: \`{{importPrefix}}shared/hooks\`
- Add more shadcn components with \`pnpm dlx shadcn@latest add <name>\` — aliases already point at \`shared/\`.

## Prisma 8

This is **not** Prisma 7. There is no \`PrismaClient\`, \`findMany\`, or \`prisma.user.create\`.

- Contract: \`src/prisma/contract.ts\` or \`src/prisma/contract.prisma\`
- Client: \`{{libImport}}/db\` → \`db.orm.public.Model\`
- Reads: \`await db.orm.public.Post.where({ authorId }).all()\` or \`.first()\`
- Writes: \`await db.orm.public.Post.create({ ... })\`
- Primary keys are CUID2 values stored as \`text\` (\`@default(cuid(2))\`), so they match Better Auth. Prisma generates them on create; Better Auth uses the same generator via \`advanced.database.generateId\`. Do not use \`field.id.cuid2()\` — that maps to \`character(24)\`, which \`db init\` cannot alter from existing \`text\` columns.
- Auth \`email\` / \`session.token\` uniqueness is a unique index (\`user_email_key\`, \`session_token_key\`), not \`field.text().unique()\`. Better Auth creates indexes; Prisma unique constraints reuse those names and \`db init\` then fails.
- After contract changes: \`prisma contract emit\`, then \`{{packageManager}} db:init\` or \`prisma db update\`
- Database scripts: \`{{packageManager}} db:init\` (create tables), \`{{packageManager}} db:seed\` (homepage posts), \`{{packageManager}} db:reset\` (drop public schema, recreate tables, re-seed).
- \`DATABASE_URL\` is written at scaffold time from the CLI Postgres port and database name: \`{{databaseUrl}}\`.
- Do not add Prisma agent skill files. \`prisma.config.ts\` disables the skills check on purpose.

## Zod

- Every form owns its Zod schema at \`_components/FormName/schema/index.ts\`. Export \`FormNameSchema\` and \`FormNameData\` (\`z.infer<typeof FormNameSchema>\`).
- Never define a form schema inside the component file or as a route-level \`schema.ts\`.
- The form and its server action share that schema: the client uses \`zodResolver(FormNameSchema)\`; the action \`safeParse\`s \`props.data\`.
- Form actions take \`({ data }: Props)\` where \`Props\` is an \`interface\` with \`data: FormNameData\` (plus any extra server-only fields). Load the session on the server — do not trust a user id from the client.
- Return field/action errors from \`safeParse\`; do not throw for expected validation failures.

## Auth

- Magic links only. There is no password sign-up.
- Server session: \`getServerSideSession\` from \`{{libImport}}/server/get-session\`
- Client: \`signIn.magicLink\` / \`useSession\` from \`{{libImport}}/auth-client\`
- Better Auth uses a \`pg\` Pool on \`DATABASE_URL\`. Do not wire \`prismaAdapter\` (Prisma 8 is not supported there yet).
- Auth tables live in the Prisma contract (\`User\`, \`Session\`, \`Account\`, \`Verification\`). Datetime columns are \`timestamp(3)\` (\`field.temporal.timestampString(3)\`), not Prisma \`DateTime\` / \`timestamptz\`, so they match Better Auth and \`db init\` can stay additive.
- The login page prints the magic-link URL for local testing. **Remove that preview, \`{{libImport}}/dev-magic-link.ts\`, and the store-and-print \`sendMagicLink\` callback before production.** Send the URL by email instead.

## Tests

- Vitest + Testing Library + \`@factory-js/factory\`. Name files \`*.test.ts\` / \`*.test.tsx\` next to the code they cover.
- Build test data with factories in \`{{importPrefix}}test/factories\` (\`.build()\`, \`.buildList()\`, \`.props()\`, \`.use(trait)\`). Do not hand-roll fixture objects when a factory exists.
- Reuse \`{{importPrefix}}test/mocks\` for \`db\`, session, \`next/navigation\`, and the Better Auth client.
- \`vi.mock\` calls must stay at module top level (they are hoisted). Use \`vi.hoisted\` when a mock factory needs a shared \`vi.fn()\`.
- Mock \`redirect\` must throw (\`NEXT_REDIRECT:\`) so App Router control flow matches production.
- Keep coverage above the Vitest thresholds: generated app, \`shared/lib\`, \`shared/utils\`, \`prisma/seed.ts\`, and \`prisma/reset.ts\`. Run the \`test:coverage\` script.

## Style

- Prettier 3 defaults, with two TypeScript-community choices: no semicolons and single quotes. Print width 80, trailing commas, always wrap arrow-function parameters, LF line endings. \`prettier-plugin-tailwindcss\` sorts \`className\` lists.
- ESLint: type-checked TypeScript, unused imports, simple-import-sort, no \`process.env\` outside \`shared/lib/env.ts\`, object shapes as \`interface\` (not \`type\`), and JSX ternaries that render nothing must use \`undefined\` (not \`null\` or \`&&\`). Default exports are only for Next.js pages, layouts, routes, and config files. Treat the linter as part of the contract — new code must pass it the same way existing files do.
- Import alias is \`{{importPrefix}}\`. Do not introduce \`@/\` if the project uses \`~/\` (or the reverse).

${AGENTS_MARK_END}
`,
    ctx
  )
}
