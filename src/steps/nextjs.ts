import * as p from '@clack/prompts'
import pc from 'picocolors'

import { dlx, run, type PackageManager } from '../lib/run.ts'

export async function runCreateNextApp(options: {
  projectName: string
  cwd: string
  packageManager: PackageManager
  yes: boolean
}) {
  const { command, args } = dlx(options.packageManager, 'create-next-app@latest')
  args.push(options.projectName)

  if (options.yes) {
    args.push(
      '--ts',
      '--tailwind',
      '--eslint',
      '--app',
      '--src-dir',
      '--turbopack',
      '--import-alias',
      '~/*',
      '--yes'
    )

    if (options.packageManager === 'pnpm') args.push('--use-pnpm')
    if (options.packageManager === 'npm') args.push('--use-npm')
    if (options.packageManager === 'yarn') args.push('--use-yarn')
    if (options.packageManager === 'bun') args.push('--use-bun')
  }

  p.note(
    [
      pc.bold('Recommended answers:'),
      '  TypeScript: Yes',
      '  Linter: ESLint',
      '  Tailwind CSS: Yes',
      '  App Router: Yes',
      '  src/ directory: Yes',
      '  Import alias: ~/*',
      '  Turbopack: Yes',
      `  Package manager: ${options.packageManager}`,
    ].join('\n'),
    'create-next-app'
  )

  await run(command, args, options.cwd)
}
