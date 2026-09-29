import path from 'node:path'

import * as p from '@clack/prompts'
import pc from 'picocolors'

import { ensureDir, exists, movePath, readJson, removeIfEmpty, writeJson, writeText } from '../lib/fs.ts'
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
  appRoot: string
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
      '',
      'Tailwind v4 is installed into apps/web before this step.',
    ].join('\n'),
    'shadcn init'
  )

  await run(command, args, options.appRoot)
}

export function relocateSharedCode(ctx: ProjectContext) {
  const componentsPath = path.join(ctx.appRoot, 'components.json')
  if (exists(componentsPath)) {
    const components = readJson<ComponentsJson>(componentsPath)
    const prefix = `${ctx.alias}/shared`
    components.aliases = {
      ...components.aliases,
      components: `${prefix}/components`,
      utils: ctx.utilsImport,
      ui: `${prefix}/components/ui`,
      lib: `${prefix}/libs`,
      hooks: `${prefix}/hooks`,
    }
    writeJson(componentsPath, components)
  }

  const srcRoot =
    ctx.srcRoot === '.' ? ctx.appRoot : path.join(ctx.appRoot, ctx.srcRoot)
  const sharedRoot = path.join(ctx.appRoot, ctx.sharedRoot)
  const utilsPkg = path.join(ctx.projectDir, 'packages/utils/src')

  ensureDir(path.join(sharedRoot, 'libs'))
  ensureDir(path.join(sharedRoot, 'hooks'))
  ensureDir(utilsPkg)

  // Prefer workspace utils package for cn / class helpers.
  const shadcnUtilsCandidates = [
    path.join(srcRoot, 'lib/utils.ts'),
    path.join(srcRoot, 'lib/utils.js'),
    path.join(sharedRoot, 'lib/utils.ts'),
    path.join(sharedRoot, 'libs/utils/index.ts'),
    path.join(sharedRoot, 'libs/utils.ts'),
  ]

  for (const candidate of shadcnUtilsCandidates) {
    if (!exists(candidate)) continue
    movePath(candidate, path.join(utilsPkg, 'cn.ts'))
    break
  }

  if (!exists(path.join(utilsPkg, 'cn.ts'))) {
    writeText(
      path.join(utilsPkg, 'cn.ts'),
      `import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
`
    )
  }

  writeText(
    path.join(utilsPkg, 'slugify.ts'),
    `export function slugify(value: string): string {
  return String(value)
    .normalize('NFKD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\\s+/g, '-')
    .replace(/-+/g, '-')
}
`
  )

  writeText(
    path.join(utilsPkg, 'index.ts'),
    `export { cn } from './cn'
export { slugify } from './slugify'
`
  )

  writeText(
    path.join(utilsPkg, 'slugify.test.ts'),
    `import { describe, expect, test } from 'vitest'

import { slugify } from './slugify'

describe('slugify', () => {
  test('turns a title into a url slug', () => {
    expect(slugify('Hello, Fullest of Stacks!')).toBe('hello-fullest-of-stacks')
  })
})
`
  )

  movePath(path.join(srcRoot, 'components'), path.join(sharedRoot, 'components'))
  movePath(path.join(srcRoot, 'hooks'), path.join(sharedRoot, 'hooks'))
  movePath(path.join(sharedRoot, 'utils/slugify.ts'), path.join(utilsPkg, 'slugify.ts'))

  ensureDir(path.join(sharedRoot, 'components/ui'))
  removeIfEmpty(path.join(srcRoot, 'lib'))
  removeIfEmpty(path.join(sharedRoot, 'lib'))
  removeIfEmpty(path.join(sharedRoot, 'utils'))
  removeIfEmpty(path.join(sharedRoot, 'libs/utils'))
  removeIfEmpty(path.join(srcRoot, 'components'))
  removeIfEmpty(path.join(srcRoot, 'hooks'))
}

export async function addShadcnComponents(options: {
  appRoot: string
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
  await run(command, args, options.appRoot)
}
