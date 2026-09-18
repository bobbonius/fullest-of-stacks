#!/usr/bin/env node

import { spawn } from 'node:child_process'
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

const child = spawn(
  process.execPath,
  ['--experimental-strip-types', '--no-warnings', cli, ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: process.env,
  }
)

child.on('exit', code => {
  process.exit(code ?? 1)
})

child.on('error', error => {
  console.error(error)
  process.exit(1)
})
