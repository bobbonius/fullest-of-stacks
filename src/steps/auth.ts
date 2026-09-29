import { randomBytes } from 'node:crypto'
import path from 'node:path'

import { readOptional, writeText } from '../lib/fs.ts'
import type { ProjectContext } from '../lib/project.ts'
import { packageFile, srcFile } from '../lib/project.ts'
import { addPackages } from '../lib/run.ts'
import { t, toTemplateContext } from '../lib/template.ts'
import { envExample } from '../templates/app.ts'
import {
  authClient,
  authRoute,
  authServer,
  dbError,
  dbFallback,
  dbModels,
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

  writeText(packageFile(ctx, 'env', 'src/env.ts'), envModule())
  writeText(packageFile(ctx, 'auth', 'src/devMagicLink.ts'), devMagicLink())
  writeText(packageFile(ctx, 'auth', 'src/auth.ts'), authServer(tpl))
  writeText(packageFile(ctx, 'auth', 'src/authClient.ts'), authClient(tpl))
  writeText(srcFile(ctx, 'shared/libs/server/getSession.ts'), getSession(tpl))
  writeText(packageFile(ctx, 'database', 'src/dbError.ts'), dbError())
  writeText(packageFile(ctx, 'database', 'src/models.ts'), dbModels(tpl))
  writeText(srcFile(ctx, 'app/api/auth/[...all]/route.ts'), authRoute(tpl))

  if (ctx.prismaDbPath) {
    writeText(packageFile(ctx, 'database', 'src/db.ts'), dbReexport(tpl))
  } else {
    writeText(packageFile(ctx, 'database', 'src/db.ts'), dbFallback(tpl))
  }

  const envContents = t(envExample(), tpl)
  writeText(path.join(ctx.projectDir, '.env.example'), envContents)
  writeText(
    path.join(ctx.projectDir, '.env.local'),
    envContents.replace('replace-with-a-32-char-secret', secret)
  )
  // Next.js also reads env from the app directory when started via apps/web.
  writeText(
    path.join(ctx.appRoot, '.env.local'),
    envContents.replace('replace-with-a-32-char-secret', secret)
  )
  writeText(path.join(ctx.appRoot, '.env.example'), envContents)
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
