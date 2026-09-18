import path from 'node:path'

import { exists, readOptional, writeText } from './fs.ts'

const ALLOWED_BUILDS = [
  'esbuild',
  'msgpackr-extract',
  'workerd',
  'sharp',
  'unrs-resolver',
  '@prisma/engines',
]

export function ensurePnpmAllowBuilds(projectDir: string) {
  const filePath = path.join(projectDir, 'pnpm-workspace.yaml')
  const current = exists(filePath) ? (readOptional(filePath) ?? '') : ''
  const packagesBlock = current.match(/^packages:\n(?:[ \t]+- .+\n)*/m)?.[0]

  const lines = [
    ...(packagesBlock ? [packagesBlock.trimEnd()] : []),
    'strictDepBuilds: false',
    'verifyDepsBeforeRun: false',
    'allowBuilds:',
    ...ALLOWED_BUILDS.map(name => `  ${quoteYamlKey(name)}: true`),
  ]

  writeText(filePath, `${lines.join('\n')}\n`)
}

function quoteYamlKey(name: string) {
  return name.startsWith('@') ? `'${name}'` : name
}
