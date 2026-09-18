import { existsSync, unlinkSync } from 'node:fs'
import path from 'node:path'

import { exists, readOptional, writeText } from '../lib/fs.ts'
import type { ProjectContext } from '../lib/project.ts'
import { srcFile } from '../lib/project.ts'
import { toTemplateContext } from '../lib/template.ts'
import {
  dashboardActions,
  dashboardLayout,
  dashboardPage,
  getPublishedPostsAction,
  healthRoute,
  homePage,
  loginForm,
  loginPage,
  loginSchema,
  newPostPage,
  nextConfigSnippet,
  patchGlobalsCss,
  postActions,
  postForm,
  postListComponent,
  postSchema,
  postsApi,
  postsPage,
  requestMagicLinkAction,
  resetDatabase,
  rootLayout,
  seed,
  vscodeExtensions,
  vscodeSettings,
} from '../templates/app.ts'
import {
  AGENTS_MARK_END,
  AGENTS_MARK_START,
  agentsGuide,
} from '../templates/agents.ts'
import { generatedTests } from '../templates/tests.ts'
import { testSupportFiles } from '../templates/test-support.ts'

function asTemplate(ctx: ProjectContext) {
  return toTemplateContext(ctx)
}

function removeIfExists(filePath: string) {
  if (existsSync(filePath)) {
    unlinkSync(filePath)
  }
}

export function writeScaffold(ctx: ProjectContext) {
  const tpl = asTemplate(ctx)
  const layoutPath = path.join(ctx.projectDir, ctx.appDir, 'layout.tsx')

  writeText(layoutPath, rootLayout(tpl, readOptional(layoutPath)))
  patchGeneratedCss(ctx)

  writeText(path.join(ctx.projectDir, ctx.appDir, '(app)/page.tsx'), homePage(tpl))
  writeText(
    path.join(ctx.projectDir, ctx.appDir, '(app)/_actions/get-published-posts.ts'),
    getPublishedPostsAction(tpl)
  )
  writeText(
    path.join(ctx.projectDir, ctx.appDir, '(app)/_components/post-list.tsx'),
    postListComponent(tpl)
  )
  writeText(path.join(ctx.projectDir, ctx.appDir, '(app)/login/page.tsx'), loginPage())
  writeText(path.join(ctx.projectDir, ctx.appDir, '(app)/login/schema.ts'), loginSchema())
  writeText(
    path.join(ctx.projectDir, ctx.appDir, '(app)/login/_components/login-form.tsx'),
    loginForm(tpl)
  )
  writeText(
    path.join(ctx.projectDir, ctx.appDir, '(app)/login/_actions/request-magic-link.ts'),
    requestMagicLinkAction(tpl)
  )
  writeText(
    path.join(ctx.projectDir, ctx.appDir, '(dashboard)/layout.tsx'),
    dashboardLayout(tpl)
  )
  writeText(
    path.join(ctx.projectDir, ctx.appDir, '(dashboard)/dashboard/page.tsx'),
    dashboardPage(tpl)
  )
  writeText(
    path.join(ctx.projectDir, ctx.appDir, '(dashboard)/dashboard/_actions/sign-out.ts'),
    dashboardActions(tpl)
  )
  writeText(
    path.join(ctx.projectDir, ctx.appDir, '(dashboard)/dashboard/posts/page.tsx'),
    postsPage(tpl)
  )
  writeText(
    path.join(ctx.projectDir, ctx.appDir, '(dashboard)/dashboard/posts/new/page.tsx'),
    newPostPage()
  )
  writeText(
    path.join(ctx.projectDir, ctx.appDir, '(dashboard)/dashboard/posts/new/_components/post-form.tsx'),
    postForm(tpl)
  )
  writeText(
    path.join(ctx.projectDir, ctx.appDir, '(dashboard)/dashboard/posts/new/schema.ts'),
    postSchema()
  )
  writeText(
    path.join(ctx.projectDir, ctx.appDir, '(dashboard)/dashboard/posts/new/_actions/create-post.ts'),
    postActions(tpl)
  )
  writeText(path.join(ctx.projectDir, ctx.appDir, 'api/health/route.ts'), healthRoute())
  writeText(path.join(ctx.projectDir, ctx.appDir, 'api/posts/route.ts'), postsApi(tpl))

  writeText(srcFile(ctx, 'prisma/seed.ts'), seed(tpl))
  writeText(srcFile(ctx, 'prisma/reset.ts'), resetDatabase(tpl))

  for (const [relative, contents] of Object.entries({
    ...testSupportFiles(tpl),
    ...generatedTests(tpl),
  })) {
    writeText(srcFile(ctx, relative), contents)
  }

  writeText(path.join(ctx.projectDir, '.vscode/settings.json'), vscodeSettings())
  writeText(path.join(ctx.projectDir, '.vscode/extensions.json'), vscodeExtensions())

  const nextConfigPath = path.join(ctx.projectDir, 'next.config.ts')
  const nextConfigMjs = path.join(ctx.projectDir, 'next.config.mjs')
  if (exists(nextConfigPath) || !exists(nextConfigMjs)) {
    writeText(nextConfigPath, nextConfigSnippet())
  }

  removeIfExists(path.join(ctx.projectDir, ctx.appDir, 'page.tsx'))
  removeIfExists(path.join(ctx.projectDir, ctx.appDir, 'page.module.css'))
  removeLegacyAuthFiles(ctx)

  patchGitignore(ctx.projectDir)
  appendReadme(ctx)
  writeAgentsMd(ctx)
}

function patchGeneratedCss(ctx: ProjectContext) {
  const cssPath = path.join(ctx.projectDir, ctx.appDir, 'globals.css')
  const current = readOptional(cssPath)
  if (!current) return
  writeText(cssPath, patchGlobalsCss(current))
}

function removeLegacyAuthFiles(ctx: ProjectContext) {
  removeIfExists(path.join(ctx.projectDir, ctx.appDir, '(app)/register/page.tsx'))
  removeIfExists(path.join(ctx.projectDir, ctx.appDir, '(app)/register/register-form.tsx'))
  removeIfExists(path.join(ctx.projectDir, ctx.appDir, '(app)/login/login-form.tsx'))
  removeIfExists(path.join(ctx.projectDir, ctx.appDir, '(dashboard)/dashboard/actions.ts'))
  removeIfExists(
    path.join(ctx.projectDir, ctx.appDir, '(dashboard)/dashboard/posts/new/actions.ts')
  )
  removeIfExists(
    path.join(ctx.projectDir, ctx.appDir, '(dashboard)/dashboard/posts/new/post-form.tsx')
  )
}

function patchGitignore(projectDir: string) {
  const gitignorePath = path.join(projectDir, '.gitignore')
  const current = readOptional(gitignorePath) ?? ''
  if (!current.includes('!.env.example')) {
    writeText(gitignorePath, `${current.trimEnd()}\n\n!.env.example\n`)
  }
}

function writeAgentsMd(ctx: ProjectContext) {
  const agentsPath = path.join(ctx.projectDir, 'AGENTS.md')
  const existing = readOptional(agentsPath) ?? ''
  const section = agentsGuide(asTemplate(ctx)).trim()

  if (existing.includes(AGENTS_MARK_START) && existing.includes(AGENTS_MARK_END)) {
    const next = existing.replace(
      new RegExp(`${AGENTS_MARK_START}[\\s\\S]*?${AGENTS_MARK_END}`),
      section
    )
    writeText(agentsPath, next.endsWith('\n') ? next : `${next}\n`)
    return
  }

  const combined = [existing.trimEnd(), section].filter(Boolean).join('\n\n')
  writeText(agentsPath, `${combined}\n`)
}

function appendReadme(ctx: ProjectContext) {
  const readmePath = path.join(ctx.projectDir, 'README.md')
  const current = readOptional(readmePath) ?? ''
  const extra = `
## fullest-of-stacks

This app was scaffolded with [fullest-of-stacks](https://github.com).

### After generate

1. Start Postgres on port \`${ctx.databasePort}\` with a database named \`${ctx.databaseName}\`. \`DATABASE_URL\` is already in \`.env.local\`:

\`\`\`
${ctx.databaseUrl}
\`\`\`

2. Apply the Prisma 8 contract and seed posts:

\`\`\`bash
${ctx.packageManager} db:init
${ctx.packageManager} db:seed
\`\`\`

To wipe local data, recreate tables, and re-seed:

\`\`\`bash
${ctx.packageManager} db:reset
\`\`\`

3. Run the app:

\`\`\`bash
${ctx.packageManager} dev
\`\`\`

Open \`/login\`, request a magic link, and click the highlighted URL on the page. That preview is for local testing — remove it before production.

### What's included

- Next.js App Router with \`(app)\` and \`(dashboard)\` route groups
- Shared code under \`shared/\` (shadcn UI, lib, utils, hooks)
- Route-specific components next to the page; server actions in \`_actions/\`
- Better Auth magic links at \`/api/auth/*\` and \`/login\`
- Prisma 8 contract in \`src/prisma\` (or \`prisma/\`) plus seeded homepage posts
- Zod-validated create-post server action
- Vitest + Testing Library + factory-js, with coverage on generated files (\`pnpm test:coverage\`)
- ESLint (type-checked TypeScript, import sort, no \`process.env\` outside \`shared/lib/env.ts\`) and Prettier (no semicolons, single quotes, Tailwind class sort)
`
  if (!current.includes('fullest-of-stacks')) {
    writeText(readmePath, `${current.trimEnd()}\n${extra}`)
  }
}
