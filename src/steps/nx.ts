import { unlinkSync } from 'node:fs'
import path from 'node:path'

import * as p from '@clack/prompts'
import pc from 'picocolors'

import { exists, readJson, writeJson } from '../lib/fs.ts'
import { ensurePnpmAllowBuilds } from '../lib/pnpm.ts'
import { addPackages, dlx, execLocal, run, type PackageManager } from '../lib/run.ts'

export async function runCreateNxWorkspace(options: {
  projectName: string
  cwd: string
  packageManager: PackageManager
  yes: boolean
}) {
  const projectDir = path.join(options.cwd, options.projectName)

  p.note(
    [
      pc.bold('Nx monorepo (non-interactive):'),
      '  1. Empty workspace (--preset=apps)',
      '  2. Fix pnpm allowBuilds',
      '  3. Add @nx/next + generate apps/web',
      `  Package manager: ${options.packageManager}`,
      '  Nx Cloud: skip',
    ].join('\n'),
    'create-nx-workspace'
  )

  // The `next` preset fails its final pnpm install because Nx writes
  // allowBuilds placeholders ("set this to true or false"). Create an empty
  // workspace first, repair allowBuilds, then add the Next app.
  const { command, args } = dlx(options.packageManager, 'create-nx-workspace@latest')
  args.push(
    options.projectName,
    '--preset=apps',
    `--packageManager=${options.packageManager}`,
    '--nxCloud=skip',
    '--skipGit',
    '--interactive=false',
    '--aiAgents=none',
    '--workspaces=true'
  )

  await run(command, args, options.cwd)

  if (!exists(path.join(projectDir, 'nx.json'))) {
    throw new Error('create-nx-workspace did not produce nx.json. Stopped.')
  }

  ensurePnpmAllowBuilds(projectDir)
  await run(options.packageManager, installArgs(options.packageManager), projectDir)

  await addPackages(options.packageManager, projectDir, ['@nx/next'], true)
  ensurePnpmAllowBuilds(projectDir)

  await execLocal(
    options.packageManager,
    'nx',
    [
      'g',
      '@nx/next:application',
      'web',
      '--directory=apps/web',
      '--linter=eslint',
      '--unitTestRunner=none',
      '--e2eTestRunner=none',
      '--appDir=true',
      '--src=true',
      '--style=css',
    ],
    projectDir
  )

  ensurePnpmAllowBuilds(projectDir)
  await run(options.packageManager, installArgs(options.packageManager), projectDir)

  if (!exists(path.join(projectDir, 'apps/web/package.json'))) {
    throw new Error('Nx did not create apps/web. Stopped.')
  }

  await retargetAppAlias(projectDir)
  removeNxHelloRoute(projectDir)
  p.log.success('Nx workspace ready with apps/web')
}

function installArgs(pm: PackageManager): string[] {
  switch (pm) {
    case 'pnpm':
      return ['install', '--no-frozen-lockfile']
    case 'yarn':
      return ['install']
    case 'bun':
      return ['install']
    default:
      return ['install']
  }
}

/** Prefer ~/ for app-local imports so AGENTS and templates stay consistent. */
async function retargetAppAlias(projectDir: string) {
  const tsconfigPath = path.join(projectDir, 'apps/web/tsconfig.json')
  if (!exists(tsconfigPath)) return

  const tsconfig = readJson<{
    compilerOptions?: { paths?: Record<string, string[]> }
  }>(tsconfigPath)

  const paths = tsconfig.compilerOptions?.paths ?? {}
  if (paths['@/*']) {
    paths['~/*'] = paths['@/*']
    delete paths['@/*']
  } else if (!paths['~/*']) {
    paths['~/*'] = ['./src/*']
  }

  tsconfig.compilerOptions = {
    ...tsconfig.compilerOptions,
    paths,
  }
  writeJson(tsconfigPath, tsconfig)
}

function removeNxHelloRoute(projectDir: string) {
  const hello = path.join(projectDir, 'apps/web/src/app/api/hello/route.ts')
  if (exists(hello)) {
    unlinkSync(hello)
  }
}
