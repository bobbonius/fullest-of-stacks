import path from 'node:path'

import * as p from '@clack/prompts'
import pc from 'picocolors'

import {
  createDatabaseConfig,
  DEFAULT_DATABASE_PORT,
  defaultDatabaseName,
  invalidDatabaseName,
  invalidDatabasePort,
} from './lib/database.ts'
import { exists } from './lib/fs.ts'
import { ensurePnpmAllowBuilds } from './lib/pnpm.ts'
import { inspectProject } from './lib/project.ts'
import {
  detectInvokerPackageManager,
  type PackageManager,
  runScript,
} from './lib/run.ts'
import { installAuth, writeAuthFiles } from './steps/auth.ts'
import { runCreateNxWorkspace } from './steps/nx.ts'
import { writeWorkspacePackages } from './steps/packages.ts'
import { emitPrismaContract, overlayPrismaContract, runPrismaInit } from './steps/prisma.ts'
import { writeScaffold } from './steps/scaffold.ts'
import { addShadcnComponents, relocateSharedCode, runShadcnInit } from './steps/shadcn.ts'
import { ensureTailwind } from './steps/tailwind.ts'
import { installTooling, writeToolingConfigs } from './steps/tooling.ts'

type CliOptions = {
  projectName?: string
  yes: boolean
  packageManager?: PackageManager
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { yes: false }

  for (const arg of argv) {
    if (arg === '--yes' || arg === '-y') {
      options.yes = true
      continue
    }
    if (arg === '--pnpm') {
      options.packageManager = 'pnpm'
      continue
    }
    if (arg === '--npm') {
      options.packageManager = 'npm'
      continue
    }
    if (arg === '--yarn') {
      options.packageManager = 'yarn'
      continue
    }
    if (arg === '--bun') {
      options.packageManager = 'bun'
      continue
    }
    if (arg.startsWith('--pm=')) {
      options.packageManager = arg.slice(5) as PackageManager
      continue
    }
    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
    if (!arg.startsWith('-') && !options.projectName) {
      options.projectName = arg
    }
  }

  return options
}

function printHelp() {
  console.log(`
${pc.bold('fullest-of-stacks')}

Scaffold an Nx monorepo with a Next.js app, workspace packages for env /
database / auth / utils, shadcn, Prisma 8, Better Auth, Vitest, Zod, ESLint,
and Prettier.

Requires Node.js 24+.

${pc.bold('Usage')}
  npx github:bobbonius/fullest-of-stacks [name] [options]
  pnpm dlx github:bobbonius/fullest-of-stacks [name]

${pc.bold('Options')}
  --yes, -y       Recommended answers for Nx, shadcn, and Prisma (still asks Postgres port and database name)
  --pnpm          Use pnpm (recommended for the monorepo)
  --npm           Use npm
  --yarn          Use yarn
  --bun           Use bun
  --help, -h      Show this message
`)
}

function assertNotCancelled<T>(value: T): Exclude<T, symbol> {
  if (p.isCancel(value)) {
    p.cancel('Scaffold cancelled.')
    process.exit(1)
  }
  return value as Exclude<T, symbol>
}

function assertNode24() {
  const major = Number(process.versions.node.split('.')[0])
  if (Number.isNaN(major) || major < 24) {
    console.error(
      `fullest-of-stacks requires Node.js 24 or newer (current: ${process.version}).`
    )
    process.exit(1)
  }
}

async function main() {
  assertNode24()
  const options = parseArgs(process.argv.slice(2))

  console.log()
  p.intro(pc.bgMagenta(pc.black(' fullest-of-stacks ')))
  p.log.message(
    'Nx monorepo · Next.js · shadcn · Prisma 8 · Better Auth · Vitest · Zod · ESLint · Prettier'
  )

  const packageManager =
    options.packageManager ??
    (options.yes
      ? detectInvokerPackageManager()
      : assertNotCancelled(
          await p.select({
            message: 'Package manager',
            options: [
              { value: 'pnpm', label: 'pnpm (recommended)' },
              { value: 'npm', label: 'npm' },
              { value: 'yarn', label: 'yarn' },
              { value: 'bun', label: 'bun' },
            ],
            initialValue: detectInvokerPackageManager(),
          })
        ))

  const projectName =
    options.projectName ??
    (options.yes
      ? 'fullest-app'
      : assertNotCancelled(
          await p.text({
            message: 'Workspace name',
            placeholder: 'fullest-app',
            defaultValue: 'fullest-app',
            validate: value => {
              if (!value?.trim()) return 'A workspace name is required'
              if (value.trim() === '.') return 'In-place (.) is not supported for the Nx monorepo scaffold'
            },
          })
        ))

  if (projectName === '.') {
    p.cancel('In-place (.) is not supported for the Nx monorepo scaffold.')
    process.exit(1)
  }

  const cwd = process.cwd()
  const projectDir = path.join(cwd, projectName)
  const suggestedDatabaseName = defaultDatabaseName(projectName, cwd)

  p.log.message(
    'Database: PostgreSQL only. The starter connects as postgres / postgres on localhost.'
  )

  const databasePort =
    assertNotCancelled(
      await p.text({
        message: 'PostgreSQL port',
        placeholder: DEFAULT_DATABASE_PORT,
        defaultValue: DEFAULT_DATABASE_PORT,
        validate: value => invalidDatabasePort(value || DEFAULT_DATABASE_PORT),
      })
    ).trim() || DEFAULT_DATABASE_PORT

  const databaseName =
    assertNotCancelled(
      await p.text({
        message: 'PostgreSQL database name',
        placeholder: suggestedDatabaseName,
        defaultValue: suggestedDatabaseName,
        validate: value => invalidDatabaseName(value || suggestedDatabaseName),
      })
    ).trim() || suggestedDatabaseName

  const database = createDatabaseConfig(databasePort, databaseName)

  if (exists(projectDir)) {
    p.cancel(`Directory already exists: ${projectDir}`)
    process.exit(1)
  }

  p.log.step('1/8  Nx workspace + Next.js app')
  await runCreateNxWorkspace({
    projectName,
    cwd,
    packageManager,
    yes: options.yes,
  })

  if (!exists(path.join(projectDir, 'nx.json'))) {
    p.cancel('create-nx-workspace did not produce nx.json. Stopped.')
    process.exit(1)
  }

  const inspect = (name = projectName) =>
    inspectProject(projectDir, name, packageManager, database)

  let ctx = inspect()
  ensurePnpmAllowBuilds(projectDir)

  p.log.step('2/8  Workspace packages (env, database, auth, utils)')
  await writeWorkspacePackages(ctx)
  ctx = inspect(ctx.projectName)

  p.log.step('3/8  shadcn/ui')
  await ensureTailwind(ctx)
  await runShadcnInit({
    appRoot: ctx.appRoot,
    packageManager: ctx.packageManager,
    yes: options.yes,
  })
  ctx = inspect(ctx.projectName)
  relocateSharedCode(ctx)
  ctx = inspect(ctx.projectName)

  p.log.step('4/8  Prisma 8')
  await runPrismaInit({
    projectDir,
    packageManager: ctx.packageManager,
    schemaPath: 'packages/database/prisma/contract.ts',
  })
  p.log.success('Prisma init finished — continuing the scaffold')
  ctx = inspect(ctx.projectName)
  await overlayPrismaContract(ctx)
  ctx = inspect(ctx.projectName)
  await emitPrismaContract(ctx)

  p.log.step('5/8  Prettier, ESLint, Vitest, Zod')
  await installTooling(ctx)
  writeToolingConfigs(ctx)

  p.log.step('6/8  Better Auth')
  await installAuth(ctx)
  writeAuthFiles(ctx)

  p.log.step('7/8  shadcn components')
  await addShadcnComponents({
    appRoot: ctx.appRoot,
    packageManager: ctx.packageManager,
  })
  ctx = inspect(ctx.projectName)

  p.log.step('8/8  Routes, schemas, and mocks')
  writeScaffold(ctx)

  try {
    await runScript(ctx.packageManager, 'format:write', projectDir)
  } catch {
    // Formatting is best-effort; the app is still usable if Prettier is not on PATH yet.
  }

  try {
    await runScript(ctx.packageManager, 'test:e2e:install', projectDir)
  } catch {
    p.log.warn(
      'Playwright browser install skipped. Run test:e2e:install before test:e2e.'
    )
  }

  p.note(
    [
      `cd ${projectName}`,
      `DATABASE_URL is in .env.local (${database.databaseUrl})`,
      `${ctx.packageManager} db:init`,
      `${ctx.packageManager} db:seed`,
      `${ctx.packageManager} db:reset   # optional: wipe, recreate, and re-seed`,
      `${ctx.packageManager} db:studio  # browse tables`,
      `${ctx.packageManager} dev`,
      `${ctx.packageManager} test`,
      `${ctx.packageManager} test:coverage`,
      `${ctx.packageManager} test:e2e:install   # once: download Chromium`,
      `${ctx.packageManager} test:e2e`,
    ].join('\n'),
    'Next steps'
  )

  p.outro(pc.green('Fullest of stacks monorepo is ready.'))
}

main().catch(error => {
  p.log.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
