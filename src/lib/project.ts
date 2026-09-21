import path from 'node:path'

import type { DatabaseConfig } from './database.ts'
import { exists, firstExisting, readJson } from './fs.ts'
import type { PackageManager } from './run.ts'

export type ProjectContext = {
  projectName: string
  projectDir: string
  srcDir: boolean
  alias: string
  importPrefix: string
  appDir: string
  srcRoot: string
  sharedRoot: string
  libDir: string
  libImport: string
  utilsImport: string
  uiImport: string
  packageManager: PackageManager
  prismaDbImport: string
  prismaContractPath: string | undefined
  prismaDbPath: string | undefined
  databasePort: string
  databaseName: string
  databaseUrl: string
}

type PackageJson = {
  name?: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  engines?: Record<string, string>
}

type TsConfig = {
  compilerOptions?: {
    paths?: Record<string, string[]>
  }
}

type ComponentsJson = {
  aliases?: {
    utils?: string
    ui?: string
    lib?: string
    components?: string
  }
}

export function detectPackageManager(projectDir: string, fallback: PackageManager): PackageManager {
  if (exists(path.join(projectDir, 'pnpm-lock.yaml')) || exists(path.join(projectDir, 'pnpm-workspace.yaml'))) {
    return 'pnpm'
  }
  if (exists(path.join(projectDir, 'yarn.lock'))) return 'yarn'
  if (exists(path.join(projectDir, 'bun.lock')) || exists(path.join(projectDir, 'bun.lockb'))) {
    return 'bun'
  }
  if (exists(path.join(projectDir, 'package-lock.json'))) return 'npm'
  return fallback
}

function detectAlias(projectDir: string, srcDir: boolean) {
  // Prefer tsconfig — that is the create-next-app import-alias choice.
  // shadcn init often writes @/ into components.json even when the app uses ~/.
  const tsconfigPath = firstExisting([
    path.join(projectDir, 'tsconfig.json'),
    path.join(projectDir, 'tsconfig.app.json'),
  ])

  if (tsconfigPath) {
    const tsconfig = readJson<TsConfig>(tsconfigPath)
    const paths = tsconfig.compilerOptions?.paths ?? {}
    if (paths['~/*']) return '~'
    if (paths['@/*']) return '@'
  }

  const componentsPath = path.join(projectDir, 'components.json')
  if (exists(componentsPath)) {
    const components = readJson<ComponentsJson>(componentsPath)
    const utils = components.aliases?.utils
    if (utils?.startsWith('~/')) return '~'
    if (utils?.startsWith('@/')) return '@'
  }

  return srcDir ? '~' : '@'
}

export function inspectProject(
  projectDir: string,
  projectName: string,
  packageManager: PackageManager,
  database: DatabaseConfig
): ProjectContext {
  const srcDir = exists(path.join(projectDir, 'src/app')) || exists(path.join(projectDir, 'src/pages'))
  const alias = detectAlias(projectDir, srcDir)
  const importPrefix = `${alias}/`
  const srcRoot = srcDir ? 'src' : '.'
  const appDir = srcDir ? 'src/app' : 'app'
  const sharedRoot = srcDir ? 'src/shared' : 'shared'
  const libDir = `${sharedRoot}/libs`
  const libImport = `${importPrefix}shared/libs`

  const componentsPath = path.join(projectDir, 'components.json')
  let utilsImport = `${importPrefix}shared/libs/utils`
  let uiImport = `${importPrefix}shared/components/ui`

  if (exists(componentsPath)) {
    const components = readJson<ComponentsJson>(componentsPath)
    if (components.aliases?.utils) utilsImport = components.aliases.utils
    if (components.aliases?.ui) uiImport = components.aliases.ui
  }

  const prismaContractPath = firstExisting([
    path.join(projectDir, 'src/prisma/contract.ts'),
    path.join(projectDir, 'prisma/contract.ts'),
    path.join(projectDir, 'src/prisma/contract.prisma'),
    path.join(projectDir, 'prisma/contract.prisma'),
    path.join(projectDir, 'src/prisma/schema.prisma'),
    path.join(projectDir, 'prisma/schema.prisma'),
  ])

  const prismaDbPath = firstExisting([
    path.join(projectDir, 'src/prisma/db.ts'),
    path.join(projectDir, 'prisma/db.ts'),
    path.join(projectDir, 'src/shared/libs/database/db.ts'),
    path.join(projectDir, 'shared/libs/database/db.ts'),
    path.join(projectDir, 'src/shared/lib/prisma.ts'),
    path.join(projectDir, 'shared/lib/prisma.ts'),
    path.join(projectDir, 'src/lib/prisma.ts'),
    path.join(projectDir, 'lib/prisma.ts'),
  ])

  let prismaDbImport = `${importPrefix}prisma/db`
  if (prismaDbPath) {
    const relative = prismaDbPath
      .slice(projectDir.length + 1)
      .replace(/\\/g, '/')
      .replace(/^src\//, '')
      .replace(/\.ts$/, '')
    prismaDbImport = `${importPrefix}${relative}`
  }

  return {
    projectName,
    projectDir,
    srcDir,
    alias,
    importPrefix,
    appDir,
    srcRoot,
    sharedRoot,
    libDir,
    libImport,
    utilsImport,
    uiImport,
    packageManager: detectPackageManager(projectDir, packageManager),
    prismaDbImport,
    prismaContractPath,
    prismaDbPath,
    databasePort: database.databasePort,
    databaseName: database.databaseName,
    databaseUrl: database.databaseUrl,
  }
}

export function readPackageJson(projectDir: string) {
  return readJson<PackageJson>(path.join(projectDir, 'package.json'))
}

export function mergeScripts(projectDir: string, scripts: Record<string, string>) {
  const pkg = readPackageJson(projectDir)
  pkg.scripts = { ...pkg.scripts, ...scripts }
  return pkg
}

export function fileIn(ctx: ProjectContext, ...parts: string[]) {
  return path.join(ctx.projectDir, ...parts)
}

export function srcFile(ctx: ProjectContext, ...parts: string[]) {
  return path.join(ctx.projectDir, ctx.srcRoot === '.' ? '.' : ctx.srcRoot, ...parts)
}

export function hasSrcFile(projectDir: string, relativePath: string) {
  return exists(path.join(projectDir, relativePath))
}
