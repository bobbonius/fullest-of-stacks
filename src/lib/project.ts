import path from 'node:path'

import type { DatabaseConfig } from './database.ts'
import { exists, firstExisting, readJson } from './fs.ts'
import type { PackageManager } from './run.ts'

export type ProjectContext = {
  projectName: string
  projectDir: string
  /** Absolute path to the Next.js app (apps/web). */
  appRoot: string
  /** Package scope without leading @, e.g. my-app → imports @my-app/env */
  packageScope: string
  srcDir: boolean
  alias: string
  importPrefix: string
  appDir: string
  srcRoot: string
  sharedRoot: string
  libDir: string
  /** App-local libs still under shared/libs (magic-link, server). */
  libImport: string
  envImport: string
  databaseImport: string
  authImport: string
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

function detectAlias(appRoot: string, srcDir: boolean) {
  const tsconfigPath = firstExisting([
    path.join(appRoot, 'tsconfig.json'),
    path.join(appRoot, 'tsconfig.app.json'),
    path.join(path.dirname(appRoot), 'tsconfig.json'),
  ])

  if (tsconfigPath) {
    const tsconfig = readJson<TsConfig>(tsconfigPath)
    const paths = tsconfig.compilerOptions?.paths ?? {}
    if (paths['~/*']) return '~'
    if (paths['@/*']) return '@'
  }

  const componentsPath = path.join(appRoot, 'components.json')
  if (exists(componentsPath)) {
    const components = readJson<ComponentsJson>(componentsPath)
    const utils = components.aliases?.utils
    if (utils?.startsWith('~/')) return '~'
    if (utils?.startsWith('@/')) return '@'
  }

  return srcDir ? '~' : '@'
}

function detectAppRoot(projectDir: string) {
  const nxWeb = path.join(projectDir, 'apps/web')
  if (exists(path.join(nxWeb, 'package.json')) || exists(path.join(nxWeb, 'src/app'))) {
    return nxWeb
  }
  return projectDir
}

function detectPackageScope(projectDir: string, projectName: string) {
  const rootPkg = path.join(projectDir, 'package.json')
  if (exists(rootPkg)) {
    const pkg = readJson<PackageJson>(rootPkg)
    const name = pkg.name ?? ''
    const match = name.match(/^@([^/]+)\//)
    if (match?.[1]) return match[1]
  }

  return projectName
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'app'
}

export function inspectProject(
  projectDir: string,
  projectName: string,
  packageManager: PackageManager,
  database: DatabaseConfig
): ProjectContext {
  const appRoot = detectAppRoot(projectDir)
  const packageScope = detectPackageScope(projectDir, projectName)
  const srcDir =
    exists(path.join(appRoot, 'src/app')) || exists(path.join(appRoot, 'src/pages'))
  const alias = detectAlias(appRoot, srcDir)
  const importPrefix = `${alias}/`
  const srcRoot = srcDir ? 'src' : '.'
  const appDirRel = srcDir ? 'src/app' : 'app'
  const sharedRootRel = srcDir ? 'src/shared' : 'shared'
  const libDirRel = `${sharedRootRel}/libs`
  const libImport = `${importPrefix}shared/libs`

  const envImport = `@${packageScope}/env`
  const databaseImport = `@${packageScope}/database`
  const authImport = `@${packageScope}/auth`
  const utilsImport = `@${packageScope}/utils`

  const componentsPath = path.join(appRoot, 'components.json')
  let uiImport = `${importPrefix}shared/components/ui`

  if (exists(componentsPath)) {
    const components = readJson<ComponentsJson>(componentsPath)
    if (components.aliases?.ui) uiImport = components.aliases.ui
  }

  const prismaContractPath = firstExisting([
    path.join(projectDir, 'packages/database/prisma/contract.ts'),
    path.join(projectDir, 'packages/database/src/prisma/contract.ts'),
    path.join(appRoot, 'src/prisma/contract.ts'),
    path.join(appRoot, 'prisma/contract.ts'),
    path.join(projectDir, 'src/prisma/contract.ts'),
    path.join(projectDir, 'prisma/contract.ts'),
    path.join(projectDir, 'packages/database/prisma/contract.prisma'),
    path.join(appRoot, 'src/prisma/contract.prisma'),
    path.join(projectDir, 'src/prisma/contract.prisma'),
    path.join(projectDir, 'prisma/contract.prisma'),
  ])

  const prismaDbPath = firstExisting([
    // Prefer Prisma-generated client over our public re-export entry.
    path.join(projectDir, 'packages/database/prisma/db.ts'),
    path.join(projectDir, 'packages/database/src/db.ts'),
    path.join(appRoot, 'src/prisma/db.ts'),
    path.join(appRoot, 'prisma/db.ts'),
    path.join(appRoot, 'src/shared/libs/database/db.ts'),
    path.join(projectDir, 'src/prisma/db.ts'),
    path.join(projectDir, 'prisma/db.ts'),
  ])

  let prismaDbImport = `${databaseImport}/db`
  if (prismaDbPath?.includes(`${path.sep}packages${path.sep}database${path.sep}prisma${path.sep}`)) {
    // packages/database/src/db.ts re-exports the generated client.
    prismaDbImport = '../prisma/db'
  } else if (prismaDbPath && !prismaDbPath.includes(`${path.sep}packages${path.sep}database${path.sep}`)) {
    const relative = prismaDbPath
      .slice(appRoot.length + 1)
      .replace(/\\/g, '/')
      .replace(/^src\//, '')
      .replace(/\.ts$/, '')
    prismaDbImport = `${importPrefix}${relative}`
  }

  return {
    projectName,
    projectDir,
    appRoot,
    packageScope,
    srcDir,
    alias,
    importPrefix,
    appDir: appDirRel,
    srcRoot,
    sharedRoot: sharedRootRel,
    libDir: libDirRel,
    libImport,
    envImport,
    databaseImport,
    authImport,
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

/** Workspace-root relative file. */
export function fileIn(ctx: ProjectContext, ...parts: string[]) {
  return path.join(ctx.projectDir, ...parts)
}

/** File under the Next.js app src root (apps/web/src/...). */
export function srcFile(ctx: ProjectContext, ...parts: string[]) {
  const base =
    ctx.srcRoot === '.'
      ? ctx.appRoot
      : path.join(ctx.appRoot, ctx.srcRoot)
  return path.join(base, ...parts)
}

/** File under a workspace package (packages/<name>/...). */
export function packageFile(ctx: ProjectContext, packageName: string, ...parts: string[]) {
  return path.join(ctx.projectDir, 'packages', packageName, ...parts)
}

export function hasSrcFile(projectDir: string, relativePath: string) {
  return exists(path.join(projectDir, relativePath))
}
