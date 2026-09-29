import { unlinkSync } from 'node:fs'
import path from 'node:path'

import { exists, writeJson, writeText } from '../lib/fs.ts'
import { mergeScripts, type ProjectContext } from '../lib/project.ts'
import { addPackages } from '../lib/run.ts'
import { eslintConfig } from '../templates/eslint.ts'
import { prettierIgnore, prettierRc } from '../templates/prettier.ts'
import { viteConfig, vitestSetup } from '../templates/vitest.ts'

export async function installTooling(ctx: ProjectContext) {
  await addPackages(ctx.packageManager, ctx.projectDir, ['zod', 'dotenv', 'pg'])
  await addPackages(
    ctx.packageManager,
    ctx.projectDir,
    [
      'prettier',
      'vitest',
      '@vitejs/plugin-react',
      'jsdom',
      '@testing-library/react',
      '@testing-library/jest-dom',
      '@testing-library/user-event',
      '@factory-js/factory',
      '@vitest/coverage-v8',
      'vite',
      'eslint',
      'eslint-config-next',
      'eslint-config-prettier',
      '@eslint/js',
      'typescript-eslint',
      'globals',
      '@next/eslint-plugin-next',
      'eslint-plugin-react',
      'eslint-plugin-react-hooks',
      'eslint-plugin-jsx-a11y',
      'eslint-plugin-n',
      'eslint-plugin-promise',
      'eslint-plugin-unicorn',
      'eslint-plugin-simple-import-sort',
      'eslint-plugin-unused-imports',
      'eslint-plugin-import',
      'eslint-import-resolver-typescript',
      '@vitest/eslint-plugin',
      'eslint-plugin-testing-library',
      'prettier-plugin-tailwindcss',
      '@eslint/eslintrc',
      '@types/pg',
      'tsx',
      '@playwright/test',
    ],
    true
  )
}

export function writeToolingConfigs(ctx: ProjectContext) {
  writeJson(path.join(ctx.projectDir, '.prettierrc'), prettierRc)
  writeText(path.join(ctx.projectDir, '.prettierignore'), prettierIgnore)
  writeText(path.join(ctx.projectDir, 'eslint.config.ts'), eslintConfig(ctx))
  const legacyEslint = path.join(ctx.projectDir, 'eslint.config.mjs')
  if (exists(legacyEslint)) {
    unlinkSync(legacyEslint)
  }
  writeText(path.join(ctx.projectDir, 'vitest.config.ts'), viteConfig(ctx))
  writeText(path.join(ctx.projectDir, 'vitest.setup.ts'), vitestSetup)

  const seedFile = 'packages/database/prisma/seed.ts'
  const resetFile = 'packages/database/prisma/reset.ts'

  const pkg = mergeScripts(ctx.projectDir, {
    dev: 'nx dev web',
    build: 'nx build web',
    start: 'nx start web',
    test: 'vitest run',
    'test:watch': 'vitest',
    'test:coverage': 'vitest run --coverage',
    'test:e2e': 'playwright test',
    'test:e2e:ui': 'playwright test --ui',
    'test:e2e:install': 'playwright install chromium',
    lint: 'eslint .',
    'lint:fix': 'eslint . --fix',
    'format:write': 'prettier --write "**/*.{ts,tsx,mjs,json,css,md}" --cache',
    'format:check': 'prettier --check "**/*.{ts,tsx,mjs,json,css,md}" --cache',
    'db:init': 'prisma db init',
    'db:seed': `tsx ${seedFile}`,
    'db:reset': `tsx ${resetFile} && prisma db init && tsx ${seedFile}`,
    'db:studio': 'prisma studio',
  })
  pkg.engines = { ...pkg.engines, node: '>=24' }

  writeJson(path.join(ctx.projectDir, 'package.json'), pkg)
}
