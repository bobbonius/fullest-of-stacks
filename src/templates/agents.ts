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
- Colocate a feature on its route: \`page.tsx\`, \`schema.ts\`, \`_components/\`, \`_actions/\`, and \`*.test.ts\`.
- Server actions belong in \`_actions/\` on that route. Do not put route-specific actions in \`shared/\`.
- Shared UI, lib, utils, and hooks live under \`shared/\`. Route-only code does not.

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

- Validate every mutation at the server boundary with a Zod schema colocated as \`schema.ts\`.
- Infer form/action types with \`z.infer<typeof Schema>\`. Do not declare parallel handwritten types.
- Use the same schema from the client form (\`zodResolver\`) and the server action (\`safeParse\`).
- Return field errors from \`safeParse\`; do not throw for expected validation failures.

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
- ESLint: type-checked TypeScript, unused imports, simple-import-sort, and no \`process.env\` outside \`shared/lib/env.ts\`. Default exports are only for Next.js pages, layouts, routes, and config files.
- Import alias is \`{{importPrefix}}\`. Do not introduce \`@/\` if the project uses \`~/\` (or the reverse).

${AGENTS_MARK_END}
`,
    ctx
  )
}
