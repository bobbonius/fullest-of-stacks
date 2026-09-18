#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const major = Number(process.versions.node.split('.')[0])
if (Number.isNaN(major) || major < 24) {
  console.error(
    `fullest-of-stacks requires Node.js 24 or newer (current: ${process.version}).`
  )
  process.exit(1)
}

const here = path.dirname(fileURLToPath(import.meta.url))
const cli = path.join(here, '../src/cli.ts')

let tsxCli
try {
  tsxCli = createRequire(import.meta.url).resolve('tsx/cli')
} catch {
  console.error('fullest-of-stacks could not find tsx. Reinstall the package.')
  process.exit(1)
}

const child = spawn(process.execPath, [tsxCli, cli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
})

child.on('exit', code => {
  process.exit(code ?? 1)
})

child.on('error', error => {
  console.error(error)
  process.exit(1)
})
