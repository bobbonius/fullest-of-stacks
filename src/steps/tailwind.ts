import { renameSync } from 'node:fs'
import path from 'node:path'

import { exists, readOptional, writeText } from '../lib/fs.ts'
import type { ProjectContext } from '../lib/project.ts'
import { addPackages } from '../lib/run.ts'

/** Nx next apps ship plain CSS. shadcn requires Tailwind v4 before init. */
export async function ensureTailwind(ctx: ProjectContext) {
  await addPackages(
    ctx.packageManager,
    ctx.appRoot,
    ['tailwindcss', '@tailwindcss/postcss', 'postcss'],
    true
  )

  writeText(
    path.join(ctx.appRoot, 'postcss.config.mjs'),
    `const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
`
  )

  const appDir = path.join(ctx.appRoot, ctx.appDir)
  const globalsPath = path.join(appDir, 'globals.css')
  const nxGlobalPath = path.join(appDir, 'global.css')

  if (!exists(globalsPath) && exists(nxGlobalPath)) {
    renameSync(nxGlobalPath, globalsPath)
  }

  const current = readOptional(globalsPath) ?? ''
  if (!current.includes('@import') || !current.includes('tailwindcss')) {
    writeText(
      globalsPath,
      `@import 'tailwindcss';

${current.trim() ? `${current.trim()}\n` : ''}`
    )
  }

  retargetLayoutCssImport(appDir)
}

function retargetLayoutCssImport(appDir: string) {
  const layoutPath = path.join(appDir, 'layout.tsx')
  const current = readOptional(layoutPath)
  if (!current) return

  const next = current.replace(
    /import\s+['"]\.\/global\.css['"]\s*;?/,
    "import './globals.css'"
  )

  if (next !== current) {
    writeText(layoutPath, next)
  }
}
