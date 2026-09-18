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
import { runCreateNextApp } from './steps/nextjs.ts'
import { emitPrismaContract, overlayPrismaContract, runPrismaInit } from './steps/prisma.ts'
import { writeScaffold } from './steps/scaffold.ts'
import { addShadcnComponents, relocateSharedCode, runShadcnInit } from './steps/shadcn.ts'
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

Scaffold a full-stack Next.js app using the official CLIs for Next.js, shadcn, and Prisma 8.

Requires Node.js 24+.

${pc.bold('Usage')}
  npx github:bobbonius/fullest-of-stacks [name] [options]
  pnpm dlx github:bobbonius/fullest-of-stacks [name]

${pc.bold('Options')}
  --yes, -y       Recommended answers for Next.js, shadcn, and Prisma (still asks Postgres port and database name)
  --pnpm          Use pnpm
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
  p.log.message('Next.js, shadcn, Prisma 8, Better Auth, Vitest, Zod, ESLint, and Prettier.')

  const packageManager =
    options.packageManager ??
    (options.yes
      ? detectInvokerPackageManager()
      : assertNotCancelled(
          await p.select({
            message: 'Package manager',
            options: [
              { value: 'pnpm', label: 'pnpm' },
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
            message: 'Project name',
            placeholder: 'fullest-app',
            defaultValue: 'fullest-app',
            validate: value => {
              if (!value?.trim()) return 'A project name is required'
            },
          })
        ))

  const cwd = process.cwd()
  const inPlace = projectName === '.'
  const projectDir = inPlace ? cwd : path.join(cwd, projectName)
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

  if (!inPlace && exists(projectDir)) {
    p.cancel(`Directory already exists: ${projectDir}`)
    process.exit(1)
  }

  p.log.step('1/7  Next.js')
  await runCreateNextApp({
    projectName,
    cwd,
    packageManager,
    yes: options.yes,
  })

  if (!exists(path.join(projectDir, 'package.json'))) {
    p.cancel('create-next-app did not produce a package.json. Stopped.')
    process.exit(1)
  }

  const inspect = (name = inPlace ? path.basename(cwd) : projectName) =>
    inspectProject(projectDir, name, packageManager, database)

  let ctx = inspect()
  ensurePnpmAllowBuilds(projectDir)

  p.log.step('2/7  shadcn/ui')
  await runShadcnInit({
    projectDir,
    packageManager: ctx.packageManager,
    yes: options.yes,
  })
  ctx = inspect(ctx.projectName)
  relocateSharedCode(ctx)
  ctx = inspect(ctx.projectName)

  p.log.step('3/7  Prisma 8')
  await runPrismaInit({
    projectDir,
    packageManager: ctx.packageManager,
    srcDir: ctx.srcDir,
  })
  p.log.success('Prisma init finished — continuing the scaffold')
  ctx = inspect(ctx.projectName)
  await overlayPrismaContract(ctx)
  ctx = inspect(ctx.projectName)
  await emitPrismaContract(ctx)

  p.log.step('4/7  Prettier, ESLint, Vitest, Zod')
  await installTooling(ctx)
  writeToolingConfigs(ctx)

  p.log.step('5/7  Better Auth')
  await installAuth(ctx)
  writeAuthFiles(ctx)

  p.log.step('6/7  shadcn components')
  await addShadcnComponents({
    projectDir,
    packageManager: ctx.packageManager,
  })
  ctx = inspect(ctx.projectName)

  p.log.step('7/7  Routes, schemas, and mocks')
  writeScaffold(ctx)

  try {
    await runScript(ctx.packageManager, 'format:write', projectDir)
  } catch {
    // Formatting is best-effort; the app is still usable if Prettier is not on PATH yet.
  }

  p.note(
    [
      inPlace ? 'cd into this directory if you are not already here' : `cd ${projectName}`,
      `DATABASE_URL is in .env.local (${database.databaseUrl})`,
      `${ctx.packageManager} db:init`,
      `${ctx.packageManager} db:seed`,
      `${ctx.packageManager} db:reset   # optional: wipe, recreate, and re-seed`,
      `${ctx.packageManager} dev`,
      `${ctx.packageManager} test`,
      `${ctx.packageManager} test:coverage`,
    ].join('\n'),
    'Next steps'
  )

  p.outro(pc.green('Fullest of stacks is ready.'))
}

main().catch(error => {
  p.log.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
