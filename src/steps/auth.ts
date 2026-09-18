import { randomBytes } from 'node:crypto'
import path from 'node:path'

import { readOptional, writeText } from '../lib/fs.ts'
import type { ProjectContext } from '../lib/project.ts'
import { srcFile } from '../lib/project.ts'
import { addPackages } from '../lib/run.ts'
import { t, toTemplateContext } from '../lib/template.ts'
import { envExample } from '../templates/app.ts'
import {
  authClient,
  authRoute,
  authServer,
  dbFallback,
  dbReexport,
  devMagicLink,
  envModule,
  getSession,
} from '../templates/auth.ts'

function asTemplate(ctx: ProjectContext) {
  return toTemplateContext(ctx)
}

export async function installAuth(ctx: ProjectContext) {
  await addPackages(ctx.packageManager, ctx.projectDir, [
    'better-auth',
    '@paralleldrive/cuid2',
    '@hookform/resolvers',
    'react-hook-form',
  ])
}

export function writeAuthFiles(ctx: ProjectContext) {
  const tpl = asTemplate(ctx)
  const secret = randomBytes(32).toString('base64')

  writeText(srcFile(ctx, 'shared/lib/env.ts'), envModule())
  writeText(srcFile(ctx, 'shared/lib/dev-magic-link.ts'), devMagicLink())
  writeText(srcFile(ctx, 'shared/lib/auth.ts'), authServer(tpl))
  writeText(srcFile(ctx, 'shared/lib/auth-client.ts'), authClient(tpl))
  writeText(srcFile(ctx, 'shared/lib/server/get-session.ts'), getSession(tpl))
  writeText(srcFile(ctx, 'app/api/auth/[...all]/route.ts'), authRoute(tpl))

  if (ctx.prismaDbPath) {
    writeText(srcFile(ctx, 'shared/lib/db.ts'), dbReexport(tpl))
  } else {
    writeText(srcFile(ctx, 'shared/lib/db.ts'), dbFallback(tpl))
  }

  const envContents = t(envExample(), tpl)
  writeText(path.join(ctx.projectDir, '.env.example'), envContents)
  writeText(
    path.join(ctx.projectDir, '.env.local'),
    envContents.replace('replace-with-a-32-char-secret', secret)
  )
  patchDotenvDatabaseUrl(ctx.projectDir, ctx.databaseUrl)
}

function patchDotenvDatabaseUrl(projectDir: string, databaseUrl: string) {
  const envPath = path.join(projectDir, '.env')
  const current = readOptional(envPath)
  if (!current) return

  if (/^DATABASE_URL=/m.test(current)) {
    writeText(
      envPath,
      current.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${databaseUrl}"`)
    )
    return
  }

  writeText(envPath, `${current.trimEnd()}\nDATABASE_URL="${databaseUrl}"\n`)
}
