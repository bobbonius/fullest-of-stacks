import path from 'node:path'

import * as p from '@clack/prompts'
import pc from 'picocolors'

import { ensureDir, exists, movePath, readJson, removeIfEmpty, writeJson } from '../lib/fs.ts'
import type { ProjectContext } from '../lib/project.ts'
import { dlx, run, type PackageManager } from '../lib/run.ts'

type ComponentsJson = {
  aliases?: {
    components?: string
    utils?: string
    ui?: string
    lib?: string
    hooks?: string
  }
  [key: string]: unknown
}

export async function runShadcnInit(options: {
  projectDir: string
  packageManager: PackageManager
  yes: boolean
}) {
  const { command, args } = dlx(options.packageManager, 'shadcn@latest')
  args.push('init')

  if (options.yes) {
    args.push('--defaults', '--yes', '--force')
  }

  p.note(
    [
      pc.bold('Recommended answers:'),
      '  Library: Base UI',
      '  Style: Nova / New York',
      '  Base color: Neutral',
      '  CSS variables: Yes',
      '  Icon library: lucide',
    ].join('\n'),
    'shadcn init'
  )

  await run(command, args, options.projectDir)
}

export function relocateSharedCode(ctx: ProjectContext) {
  const componentsPath = path.join(ctx.projectDir, 'components.json')
  if (exists(componentsPath)) {
    const components = readJson<ComponentsJson>(componentsPath)
    const prefix = `${ctx.alias}/shared`
    components.aliases = {
      ...components.aliases,
      components: `${prefix}/components`,
      utils: `${prefix}/lib/utils`,
      ui: `${prefix}/components/ui`,
      lib: `${prefix}/lib`,
      hooks: `${prefix}/hooks`,
    }
    writeJson(componentsPath, components)
  }

  const srcRoot = ctx.srcRoot === '.' ? ctx.projectDir : path.join(ctx.projectDir, ctx.srcRoot)
  const sharedRoot = path.join(ctx.projectDir, ctx.sharedRoot)

  ensureDir(path.join(sharedRoot, 'lib'))
  ensureDir(path.join(sharedRoot, 'utils'))
  ensureDir(path.join(sharedRoot, 'hooks'))

  movePath(path.join(srcRoot, 'lib/utils.ts'), path.join(sharedRoot, 'lib/utils.ts'))
  movePath(path.join(srcRoot, 'lib/utils.js'), path.join(sharedRoot, 'lib/utils.ts'))
  movePath(path.join(srcRoot, 'components'), path.join(sharedRoot, 'components'))
  movePath(path.join(srcRoot, 'hooks'), path.join(sharedRoot, 'hooks'))

  ensureDir(path.join(sharedRoot, 'components/ui'))
  removeIfEmpty(path.join(srcRoot, 'lib'))
  removeIfEmpty(path.join(srcRoot, 'components'))
  removeIfEmpty(path.join(srcRoot, 'hooks'))
}

export async function addShadcnComponents(options: {
  projectDir: string
  packageManager: PackageManager
}) {
  const { command, args } = dlx(options.packageManager, 'shadcn@latest')
  args.push(
    'add',
    'button',
    'input',
    'label',
    'card',
    'sonner',
    'textarea',
    'form',
    '--yes',
    '--overwrite'
  )
  await run(command, args, options.projectDir)
}
