import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

import { ensurePnpmAllowBuilds } from './pnpm.ts'
import { restoreTerminal } from './tty.ts'

export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun'

export function detectInvokerPackageManager(): PackageManager {
  const agent = process.env.npm_config_user_agent ?? ''
  if (agent.startsWith('pnpm')) return 'pnpm'
  if (agent.startsWith('yarn')) return 'yarn'
  if (agent.startsWith('bun')) return 'bun'
  return 'npm'
}

export async function run(
  command: string,
  args: string[],
  cwd: string,
  extraEnv: NodeJS.ProcessEnv = {}
) {
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        stdio: 'inherit',
        env: { ...process.env, ...extraEnv },
      })

      child.on('error', reject)
      child.on('exit', code => {
        if (code === 0) {
          resolve()
          return
        }

        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
      })
    })
  } finally {
    restoreTerminal()
  }
}

export function dlx(pm: PackageManager, pkg: string): { command: string; args: string[] } {
  switch (pm) {
    case 'pnpm':
      return { command: 'pnpm', args: ['dlx', pkg] }
    case 'yarn':
      return { command: 'yarn', args: ['dlx', pkg] }
    case 'bun':
      return { command: 'bunx', args: [pkg] }
    default:
      return { command: 'npx', args: ['--yes', pkg] }
  }
}

/** Prisma's CLI engine vendors `@clack/prompts` without a resolvable
 *  `@clack/core` under pnpm's isolated store. npx/bunx flatten that tree.
 *  Prisma still detects the project package manager from the lockfile. */
export function prismaDlx(pm: PackageManager): { command: string; args: string[] } {
  if (pm === 'bun') return { command: 'bunx', args: ['prisma@latest'] }
  return { command: 'npx', args: ['--yes', 'prisma@latest'] }
}

function withLatest(pkg: string) {
  if (pkg.startsWith('@')) {
    // @scope/name or @scope/name@version
    return pkg.slice(1).includes('@') ? pkg : `${pkg}@latest`
  }
  return pkg.includes('@') ? pkg : `${pkg}@latest`
}

export async function addPackages(
  pm: PackageManager,
  cwd: string,
  packages: string[],
  dev = false
) {
  if (packages.length === 0) return

  const specs = packages.map(withLatest)

  switch (pm) {
    case 'pnpm': {
      // pnpm workspaces refuse root adds unless -w is explicit.
      const workspaceRoot = existsSync(path.join(cwd, 'pnpm-workspace.yaml'))
      await run(
        'pnpm',
        [
          'add',
          ...(workspaceRoot ? ['-w'] : []),
          '--allow-build=esbuild',
          '--allow-build=msgpackr-extract',
          '--allow-build=workerd',
          '--allow-build=sharp',
          '--allow-build=unrs-resolver',
          '--allow-build=@swc/core',
          '--allow-build=nx',
          ...(dev ? ['-D'] : []),
          ...specs,
        ],
        cwd
      )
      if (workspaceRoot) {
        // pnpm may re-introduce allowBuilds placeholders after an add.
        ensurePnpmAllowBuilds(cwd)
      }
      break
    }
    case 'yarn':
      await run('yarn', ['add', ...(dev ? ['--dev'] : []), ...specs], cwd)
      break
    case 'bun':
      await run('bun', ['add', ...(dev ? ['-d'] : []), ...specs], cwd)
      break
    default:
      await run('npm', ['install', ...(dev ? ['-D'] : []), ...specs], cwd)
  }
}

export function runScript(pm: PackageManager, script: string, cwd: string, extraArgs: string[] = []) {
  switch (pm) {
    case 'pnpm':
      return run('pnpm', [script, ...extraArgs], cwd)
    case 'yarn':
      return run('yarn', [script, ...extraArgs], cwd)
    case 'bun':
      return run('bun', ['run', script, ...extraArgs], cwd)
    default:
      return run('npm', ['run', script, '--', ...extraArgs], cwd)
  }
}

export function execLocal(
  pm: PackageManager,
  bin: string,
  args: string[],
  cwd: string,
  extraEnv: NodeJS.ProcessEnv = {}
) {
  switch (pm) {
    case 'pnpm':
      return run('pnpm', ['exec', bin, ...args], cwd, extraEnv)
    case 'yarn':
      return run('yarn', ['exec', bin, ...args], cwd, extraEnv)
    case 'bun':
      return run('bunx', [bin, ...args], cwd, extraEnv)
    default:
      return run('npx', [bin, ...args], cwd, extraEnv)
  }
}
