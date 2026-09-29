import path from 'node:path'

import { exists, readOptional, writeText } from './fs.ts'

const ALLOWED_BUILDS = [
  'esbuild',
  'msgpackr-extract',
  'workerd',
  'sharp',
  'unrs-resolver',
  '@prisma/engines',
  '@swc/core',
  'nx',
]

/** Rewrite pnpm-workspace.yaml with a known-good allowBuilds block.
 *  Nx's next preset writes "set this to true or false" placeholders that
 *  break `pnpm install`; pnpm may also re-introduce placeholders later. */
export function ensurePnpmAllowBuilds(projectDir: string) {
  const filePath = path.join(projectDir, 'pnpm-workspace.yaml')
  const current = exists(filePath) ? (readOptional(filePath) ?? '') : ''

  const packagesBlock =
    current.match(/^packages:\n(?:[ \t]+- .+\n)*/m)?.[0] ??
    ['packages:', '  - "apps/*"', '  - "packages/*"'].join('\n') + '\n'

  let packages = packagesBlock
  if (!packages.includes('packages/*')) {
    packages = `${packages.trimEnd()}\n  - "packages/*"\n`
  }
  if (!packages.includes('apps/*')) {
    packages = `${packages.trimEnd()}\n  - "apps/*"\n`
  }

  const lines = [
    packages.trimEnd(),
    '',
    'strictDepBuilds: false',
    'verifyDepsBeforeRun: false',
    'autoInstallPeers: true',
    'allowBuilds:',
    ...ALLOWED_BUILDS.map(name => `  ${quoteYamlKey(name)}: true`),
  ]

  writeText(filePath, `${lines.join('\n')}\n`)
}

function quoteYamlKey(name: string) {
  return name.startsWith('@') ? `'${name}'` : name
}
