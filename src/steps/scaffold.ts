import { existsSync, renameSync, unlinkSync } from 'node:fs'
import path from 'node:path'

import { exists, readOptional, removeIfEmpty, writeText } from '../lib/fs.ts'
import type { ProjectContext } from '../lib/project.ts'
import { packageFile, srcFile } from '../lib/project.ts'
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
import { generatedE2eFiles } from '../templates/playwright.ts'

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
  const layoutPath = path.join(ctx.appRoot, ctx.appDir, 'layout.tsx')

  writeText(layoutPath, rootLayout(tpl, readOptional(layoutPath)))
  patchGeneratedCss(ctx)

  writeText(path.join(ctx.appRoot, ctx.appDir, '(app)/page.tsx'), homePage(tpl))
  writeText(
    path.join(ctx.appRoot, ctx.appDir, '(app)/_actions/getPublishedPosts.ts'),
    getPublishedPostsAction(tpl)
  )
  writeText(
    path.join(ctx.appRoot, ctx.appDir, '(app)/_components/PostList.tsx'),
    postListComponent(tpl)
  )
  writeText(path.join(ctx.appRoot, ctx.appDir, '(app)/login/page.tsx'), loginPage())
  writeText(
    path.join(ctx.appRoot, ctx.appDir, '(app)/login/_components/LoginForm/schema/index.ts'),
    loginSchema()
  )
  writeText(
    path.join(ctx.appRoot, ctx.appDir, '(app)/login/_components/LoginForm/index.tsx'),
    loginForm(tpl)
  )
  writeText(
    path.join(
      ctx.appRoot,
      ctx.appDir,
      '(app)/login/_components/LoginForm/actions/requestMagicLink.ts'
    ),
    requestMagicLinkAction(tpl)
  )
  writeText(
    path.join(ctx.appRoot, ctx.appDir, '(dashboard)/layout.tsx'),
    dashboardLayout(tpl)
  )
  writeText(
    path.join(ctx.appRoot, ctx.appDir, '(dashboard)/dashboard/page.tsx'),
    dashboardPage(tpl)
  )
  writeText(
    path.join(ctx.appRoot, ctx.appDir, '(dashboard)/dashboard/_actions/signOutAction.ts'),
    dashboardActions(tpl)
  )
  writeText(
    path.join(ctx.appRoot, ctx.appDir, '(dashboard)/dashboard/posts/page.tsx'),
    postsPage(tpl)
  )
  writeText(
    path.join(ctx.appRoot, ctx.appDir, '(dashboard)/dashboard/posts/new/page.tsx'),
    newPostPage()
  )
  writeText(
    path.join(ctx.appRoot, ctx.appDir, '(dashboard)/dashboard/posts/new/_components/PostForm/index.tsx'),
    postForm(tpl)
  )
  writeText(
    path.join(
      ctx.appRoot,
      ctx.appDir,
      '(dashboard)/dashboard/posts/new/_components/PostForm/schema/index.ts'
    ),
    postSchema()
  )
  writeText(
    path.join(
      ctx.appRoot,
      ctx.appDir,
      '(dashboard)/dashboard/posts/new/_components/PostForm/actions/createPost.ts'
    ),
    postActions(tpl)
  )
  writeText(path.join(ctx.appRoot, ctx.appDir, 'api/health/route.ts'), healthRoute())
  writeText(path.join(ctx.appRoot, ctx.appDir, 'api/posts/route.ts'), postsApi(tpl))

  writeText(packageFile(ctx, 'database', 'prisma/seed.ts'), seed(tpl))
  writeText(packageFile(ctx, 'database', 'prisma/reset.ts'), resetDatabase(tpl))

  for (const [relative, contents] of Object.entries({
    ...testSupportFiles(tpl),
    ...generatedTests(tpl),
    ...generatedE2eFiles(tpl),
  })) {
    if (relative.startsWith('packages/') || relative.startsWith('e2e/') || relative === 'playwright.config.ts') {
      writeText(path.join(ctx.projectDir, relative), contents)
    } else {
      writeText(srcFile(ctx, relative), contents)
    }
  }

  writeText(path.join(ctx.projectDir, '.vscode/settings.json'), vscodeSettings())
  writeText(path.join(ctx.projectDir, '.vscode/extensions.json'), vscodeExtensions())

  const nextConfigPath = path.join(ctx.appRoot, 'next.config.ts')
  const nextConfigJs = path.join(ctx.appRoot, 'next.config.js')
  const nextConfigMjs = path.join(ctx.appRoot, 'next.config.mjs')
  if (exists(nextConfigPath) || (!exists(nextConfigMjs) && !exists(nextConfigJs))) {
    writeText(nextConfigPath, nextConfigSnippet())
  }

  removeIfExists(path.join(ctx.appRoot, ctx.appDir, 'page.tsx'))
  removeIfExists(path.join(ctx.appRoot, ctx.appDir, 'page.module.css'))
  removeLegacyAuthFiles(ctx)

  patchGitignore(ctx.projectDir)
  appendReadme(ctx)
  writeAgentsMd(ctx)
}

function patchGeneratedCss(ctx: ProjectContext) {
  const appCssDir = path.join(ctx.appRoot, ctx.appDir)
  const globalsPath = path.join(appCssDir, 'globals.css')
  const nxGlobalPath = path.join(appCssDir, 'global.css')

  // Nx next preset ships global.css; our templates use globals.css.
  if (!exists(globalsPath) && exists(nxGlobalPath)) {
    renameSync(nxGlobalPath, globalsPath)
  }

  const current = readOptional(globalsPath)
  if (!current) return
  writeText(globalsPath, patchGlobalsCss(current))
}

function removeLegacyAuthFiles(ctx: ProjectContext) {
  removeIfExists(path.join(ctx.appRoot, ctx.appDir, '(app)/register/page.tsx'))
  removeIfExists(path.join(ctx.appRoot, ctx.appDir, '(app)/register/register-form.tsx'))
  removeIfExists(path.join(ctx.appRoot, ctx.appDir, '(app)/login/login-form.tsx'))
  removeIfExists(path.join(ctx.appRoot, ctx.appDir, '(app)/login/schema.ts'))
  removeIfExists(path.join(ctx.appRoot, ctx.appDir, '(app)/login/_components/login-form.tsx'))
  removeIfExists(
    path.join(ctx.appRoot, ctx.appDir, '(app)/login/_actions/request-magic-link.ts')
  )
  removeIfExists(
    path.join(ctx.appRoot, ctx.appDir, '(app)/login/_actions/requestMagicLink.ts')
  )
  removeIfExists(
    path.join(
      ctx.appRoot,
      ctx.appDir,
      '(app)/login/_components/LoginForm/_actions/request-magic-link.ts'
    )
  )
  removeIfExists(
    path.join(
      ctx.appRoot,
      ctx.appDir,
      '(app)/login/_components/LoginForm/actions/request-magic-link.ts'
    )
  )
  removeIfExists(path.join(ctx.appRoot, ctx.appDir, '(app)/_actions/get-published-posts.ts'))
  removeIfExists(path.join(ctx.appRoot, ctx.appDir, '(app)/_components/post-list.tsx'))
  removeIfExists(path.join(ctx.appRoot, ctx.appDir, '(dashboard)/dashboard/actions.ts'))
  removeIfExists(
    path.join(ctx.appRoot, ctx.appDir, '(dashboard)/dashboard/_actions/sign-out.ts')
  )
  removeIfExists(
    path.join(ctx.appRoot, ctx.appDir, '(dashboard)/dashboard/posts/new/actions.ts')
  )
  removeIfExists(
    path.join(ctx.appRoot, ctx.appDir, '(dashboard)/dashboard/posts/new/schema.ts')
  )
  removeIfExists(
    path.join(ctx.appRoot, ctx.appDir, '(dashboard)/dashboard/posts/new/post-form.tsx')
  )
  removeIfExists(
    path.join(ctx.appRoot, ctx.appDir, '(dashboard)/dashboard/posts/new/_components/post-form.tsx')
  )
  removeIfExists(
    path.join(ctx.appRoot, ctx.appDir, '(dashboard)/dashboard/posts/new/_actions/create-post.ts')
  )
  removeIfExists(
    path.join(ctx.appRoot, ctx.appDir, '(dashboard)/dashboard/posts/new/_actions/createPost.ts')
  )
  removeIfExists(
    path.join(
      ctx.appRoot,
      ctx.appDir,
      '(dashboard)/dashboard/posts/new/_components/PostForm/_actions/create-post.ts'
    )
  )
  removeIfExists(
    path.join(
      ctx.appRoot,
      ctx.appDir,
      '(dashboard)/dashboard/posts/new/_components/PostForm/actions/create-post.ts'
    )
  )
  removeLegacyLibFiles(ctx)
}

function removeLegacyLibFiles(ctx: ProjectContext) {
  const sharedRoot = path.join(ctx.appRoot, ctx.sharedRoot)
  const legacyLibFiles = [
    'lib/env.ts',
    'lib/auth.ts',
    'lib/auth-client.ts',
    'lib/authClient.ts',
    'lib/db.ts',
    'lib/dev-magic-link.ts',
    'lib/devMagicLink.ts',
    'lib/server/get-session.ts',
    'lib/server/getSession.ts',
    'lib/env.test.ts',
    'lib/auth.test.ts',
    'lib/auth-client.test.ts',
    'lib/authClient.test.ts',
    'lib/db.test.ts',
    'lib/dev-magic-link.test.ts',
    'lib/devMagicLink.test.ts',
    'lib/server/get-session.test.ts',
    'lib/server/getSession.test.ts',
    'utils/slugify.ts',
    'utils/slugify.test.ts',
    'libs/auth/auth-client.ts',
    'libs/auth/auth-client.test.ts',
    'libs/magic-link/dev-magic-link.ts',
    'libs/magic-link/dev-magic-link.test.ts',
    'libs/server/get-session.ts',
    'libs/server/get-session.test.ts',
    'libs/database/db-error.ts',
    'libs/database/db-error.test.ts',
  ]

  for (const relative of legacyLibFiles) {
    removeIfExists(path.join(sharedRoot, relative))
  }

  removeIfEmpty(path.join(sharedRoot, 'lib/server'))
  removeIfEmpty(path.join(sharedRoot, 'lib'))
  removeIfEmpty(path.join(sharedRoot, 'utils'))
}

function patchGitignore(projectDir: string) {
  const gitignorePath = path.join(projectDir, '.gitignore')
  const current = readOptional(gitignorePath) ?? ''
  const extras = [
    '!.env.example',
    '/test-results/',
    '/playwright-report/',
    '/blob-report/',
    '/playwright/.cache/',
  ]
  let next = current
  for (const line of extras) {
    if (!next.includes(line)) {
      next = `${next.trimEnd()}\n${line}\n`
    }
  }
  if (next !== current) {
    writeText(gitignorePath, next.endsWith('\n') ? next : `${next}\n`)
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

Browse tables in Prisma Studio:

\`\`\`bash
${ctx.packageManager} db:studio
\`\`\`

3. Run the app:

\`\`\`bash
${ctx.packageManager} dev
\`\`\`

Open \`/login\`, request a magic link, and click the highlighted URL on the page. That preview is for local testing — remove it before production.

### What's included

- Nx monorepo with \`apps/web\` and workspace packages (\`env\`, \`database\`, \`auth\`, \`utils\`)
- Next.js App Router with \`(app)\` and \`(dashboard)\` route groups
- App-local UI under \`apps/web/src/shared/\` (shadcn); domain libs in \`packages/\`
- Route-specific UI next to the page; each form folder owns \`schema/\` and \`actions/\`
- Better Auth magic links at \`/api/auth/*\` and \`/login\`
- Prisma 8 contract in \`packages/database/prisma\` plus seeded homepage posts
- Zod-validated createPost server action
- Vitest + Testing Library + factory-js, with coverage on generated files (\`pnpm test:coverage\`)
- Playwright e2e for home, magic-link auth, and create-post journeys (\`pnpm test:e2e\`)
- ESLint (type-checked TypeScript, import sort, no \`process.env\` outside \`packages/env\`) and Prettier (no semicolons, single quotes, Tailwind class sort)
`
  if (!current.includes('fullest-of-stacks')) {
    writeText(readmePath, `${current.trimEnd()}\n${extra}`)
  }
}
