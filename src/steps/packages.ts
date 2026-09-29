import path from 'node:path'

import { exists, readJson, writeJson, writeText } from '../lib/fs.ts'
import type { ProjectContext } from '../lib/project.ts'
import { addPackages, run } from '../lib/run.ts'

export async function writeWorkspacePackages(ctx: ProjectContext) {
  writeEnvPackage(ctx)
  writeUtilsPackage(ctx)
  writeDatabasePackage(ctx)
  writeAuthPackage(ctx)
  wireAppDependencies(ctx)

  await addPackages(ctx.packageManager, ctx.projectDir, [
    'dotenv',
    'clsx',
    'tailwind-merge',
    'class-variance-authority',
  ])
  await run(ctx.packageManager === 'pnpm' ? 'pnpm' : ctx.packageManager, installArgs(ctx), ctx.projectDir)
}

function installArgs(ctx: ProjectContext): string[] {
  if (ctx.packageManager === 'pnpm') return ['install', '--no-frozen-lockfile']
  if (ctx.packageManager === 'npm') return ['install']
  if (ctx.packageManager === 'yarn') return ['install']
  return ['install']
}

function writeEnvPackage(ctx: ProjectContext) {
  const root = path.join(ctx.projectDir, 'packages/env')
  writePackageJson(root, {
    name: ctx.envImport,
    exports: {
      '.': entry('./src/env.ts'),
      './package.json': './package.json',
    },
    dependencies: {
      dotenv: '*',
    },
  })
  writeTsConfig(root, { types: ['node'] })
}

function writeUtilsPackage(ctx: ProjectContext) {
  const root = path.join(ctx.projectDir, 'packages/utils')
  writePackageJson(root, {
    name: ctx.utilsImport,
    exports: {
      '.': entry('./src/index.ts'),
      './cn': entry('./src/cn.ts'),
      './slugify': entry('./src/slugify.ts'),
      './package.json': './package.json',
    },
    dependencies: {
      clsx: '*',
      'tailwind-merge': '*',
      'class-variance-authority': '*',
    },
  })
  writeTsConfig(root, { jsx: 'react-jsx' })
}

function writeDatabasePackage(ctx: ProjectContext) {
  const root = path.join(ctx.projectDir, 'packages/database')
  writePackageJson(root, {
    name: ctx.databaseImport,
    exports: {
      './db': entry('./src/db.ts'),
      './models': entry('./src/models.ts'),
      './dbError': entry('./src/dbError.ts'),
      './package.json': './package.json',
    },
    dependencies: {
      [ctx.envImport]: 'workspace:*',
    },
  })
  writeTsConfig(root, { types: ['node'] })
}

function writeAuthPackage(ctx: ProjectContext) {
  const root = path.join(ctx.projectDir, 'packages/auth')
  writePackageJson(root, {
    name: ctx.authImport,
    exports: {
      './auth': entry('./src/auth.ts'),
      './authClient': entry('./src/authClient.ts'),
      './devMagicLink': entry('./src/devMagicLink.ts'),
      './package.json': './package.json',
    },
    dependencies: {
      [ctx.envImport]: 'workspace:*',
    },
    peerDependencies: {
      next: '>=15',
      react: '>=19',
    },
  })
  writeTsConfig(root, { jsx: 'react-jsx', types: ['node'] })
}

function entry(file: string) {
  return {
    types: file,
    import: file,
    default: file,
  }
}

function writePackageJson(
  root: string,
  pkg: {
    name: string
    exports: Record<string, unknown>
    dependencies?: Record<string, string>
    peerDependencies?: Record<string, string>
  }
) {
  writeJson(path.join(root, 'package.json'), {
    name: pkg.name,
    version: '0.0.1',
    private: true,
    type: 'module',
    exports: pkg.exports,
    nx: {
      name: pkg.name.split('/').pop(),
    },
    ...(pkg.dependencies ? { dependencies: pkg.dependencies } : {}),
    ...(pkg.peerDependencies ? { peerDependencies: pkg.peerDependencies } : {}),
  })
}

function writeTsConfig(
  root: string,
  extra: { types?: string[]; jsx?: string } = {}
) {
  writeText(
    path.join(root, 'tsconfig.json'),
    `${JSON.stringify(
      {
        extends: '../../tsconfig.base.json',
        compilerOptions: {
          outDir: 'dist',
          rootDir: 'src',
          ...(extra.types ? { types: extra.types } : {}),
          ...(extra.jsx ? { jsx: extra.jsx } : {}),
        },
        include: ['src/**/*.ts', 'src/**/*.tsx'],
        exclude: ['dist', 'node_modules'],
      },
      null,
      2
    )}\n`
  )
}

function wireAppDependencies(ctx: ProjectContext) {
  const webPkgPath = path.join(ctx.projectDir, 'apps/web/package.json')
  if (!exists(webPkgPath)) return

  const webPkg = readJson<{
    name?: string
    dependencies?: Record<string, string>
  }>(webPkgPath)

  webPkg.dependencies = {
    ...webPkg.dependencies,
    [ctx.envImport]: 'workspace:*',
    [ctx.databaseImport]: 'workspace:*',
    [ctx.authImport]: 'workspace:*',
    [ctx.utilsImport]: 'workspace:*',
  }
  writeJson(webPkgPath, webPkg)
}
