import { unlinkSync } from 'node:fs'
import path from 'node:path'

import { exists, writeJson, writeText } from '../lib/fs.ts'
import { mergeScripts, type ProjectContext, srcFile } from '../lib/project.ts'
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
      'vite-tsconfig-paths',
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

  const seedFile = ctx.srcRoot === '.' ? 'prisma/seed.ts' : 'src/prisma/seed.ts'
  const resetFile = ctx.srcRoot === '.' ? 'prisma/reset.ts' : 'src/prisma/reset.ts'

  const pkg = mergeScripts(ctx.projectDir, {
    test: 'vitest run',
    'test:watch': 'vitest',
    'test:coverage': 'vitest run --coverage',
    lint: 'eslint .',
    'lint:fix': 'eslint . --fix',
    'format:write': 'prettier --write "**/*.{ts,tsx,mjs,json,css,md}" --cache',
    'format:check': 'prettier --check "**/*.{ts,tsx,mjs,json,css,md}" --cache',
    'db:init': 'prisma db init',
    'db:seed': `tsx ${seedFile}`,
    'db:reset': `tsx ${resetFile} && prisma db init && tsx ${seedFile}`,
  })
  pkg.engines = { ...pkg.engines, node: '>=24' }

  writeJson(path.join(ctx.projectDir, 'package.json'), pkg)

  writeText(
    srcFile(ctx, 'shared/libs/utils/slugify.ts'),
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
    srcFile(ctx, 'shared/libs/utils/slugify.test.ts'),
    `import { describe, expect, test } from 'vitest'

import { slugify } from './slugify'

describe('slugify', () => {
  test('turns a title into a url slug', () => {
    expect(slugify('Hello, Fullest of Stacks!')).toBe('hello-fullest-of-stacks')
  })
})
`
  )
}
