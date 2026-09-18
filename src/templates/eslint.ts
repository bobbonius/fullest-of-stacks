import type { ProjectContext } from '../lib/project.ts'

export function eslintConfig(ctx: ProjectContext) {
  const wrongAlias = ctx.alias === '~' ? '@' : '~'

  return `import eslint from '@eslint/js'
import next from '@next/eslint-plugin-next'
import vitest from '@vitest/eslint-plugin'
import prettier from 'eslint-config-prettier'
import importPlugin from 'eslint-plugin-import'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import node from 'eslint-plugin-n'
import promise from 'eslint-plugin-promise'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import testingLibrary from 'eslint-plugin-testing-library'
import unicorn from 'eslint-plugin-unicorn'
import unusedImports from 'eslint-plugin-unused-imports'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const generalRestrictedSyntax = [
  {
    selector: 'LabeledStatement',
    message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain.',
  },
  {
    selector: 'WithStatement',
    message: '\`with\` is disallowed in strict mode because it makes code impossible to predict and optimize.',
  },
  {
    selector: 'CallExpression[callee.name="cloneElement"]',
    message:
      'cloneElement is uncommon and can lead to fragile code: https://react.dev/reference/react/cloneElement',
  },
  {
    selector: String.raw\`JSXText[value=/^\\s*;\\s*$/]\`,
    message: 'Stray semicolon after a JSX element. Remove it.',
  },
]

const config = [
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  reactHooks.configs.flat['recommended-latest'],
  jsxA11y.flatConfigs.recommended,
  next.configs.recommended,
  next.configs['core-web-vitals'],
  prettier,

  {
    ignores: [
      'next-env.d.ts',
      'node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'src/shared/components/ui/**',
      'shared/components/ui/**',
      '**/prisma/generated/**',
      'src/prisma/generated/**',
    ],
  },

  {
    name: 'fullest-of-stacks/language',
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.browser, ...globals.node },
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
        node: true,
      },
      node: { version: '>=24' },
    },
  },

  {
    name: 'fullest-of-stacks/universal',
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    plugins: {
      import: importPlugin,
      n: node,
      promise,
      unicorn,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    rules: {
      'no-console': ['error', { allow: ['info', 'error', 'time', 'timeEnd'] }],
      'no-underscore-dangle': 'error',
      'no-prototype-builtins': 'error',
      'no-plusplus': 'error',
      'spaced-comment': ['error', 'always', { markers: ['/'] }],
      'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
      'max-classes-per-file': ['error', 1],
      'no-return-assign': 'error',
      'no-param-reassign': 'error',
      camelcase: ['error', { properties: 'never', ignoreDestructuring: true }],
      'no-continue': 'error',
      'no-alert': 'error',
      'func-names': ['error', 'as-needed'],
      'no-use-before-define': 'off',
      'no-shadow': 'off',

      '@typescript-eslint/no-use-before-define': [
        'error',
        { functions: false, classes: true, variables: true },
      ],
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'typeLike', format: ['PascalCase'] },
      ],
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/prefer-ts-expect-error': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/no-restricted-types': [
        'error',
        {
          types: {
            'React.FC': 'Type props directly instead of React.FC.',
            'React.FunctionComponent': 'Type props directly instead of React.FunctionComponent.',
          },
        },
      ],
      '@typescript-eslint/method-signature-style': ['error', 'property'],
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/prefer-regexp-exec': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],

      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/*.test.{ts,tsx}',
            '**/*.spec.{ts,tsx}',
            '**/test/**',
            'vitest.setup.ts',
            'vitest.config.ts',
            'eslint.config.ts',
            'eslint.config.mjs',
          ],
        },
      ],
      'import/prefer-default-export': 'off',
      'import/no-default-export': 'error',
      'import/extensions': ['error', 'ignorePackages', { ts: 'never', tsx: 'never', js: 'never' }],
      'import/no-cycle': 'error',
      'import/named': 'error',
      'import/namespace': 'error',
      'import/default': 'error',
      'import/no-named-as-default-member': 'error',
      'import/no-unresolved': 'error',
      'import/order': 'off',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [['^\\u0000'], ['^@?\\\\w'], ['^'], ['^\\\\.']],
        },
      ],
      'simple-import-sort/exports': 'error',

      'react/no-unescaped-entities': 'error',
      'react/destructuring-assignment': ['error', 'always'],
      'react/jsx-filename-extension': ['error', { extensions: ['.tsx'] }],
      'react/require-default-props': 'off',
      'react/prop-types': 'off',
      'react/forbid-dom-props': ['error', { forbid: [] }],
      'react/no-danger': 'error',
      'react/display-name': 'error',
      'react/jsx-no-bind': ['error', { ignoreRefs: true, allowArrowFunctions: false }],
      'react/function-component-definition': [
        'error',
        { namedComponents: 'function-declaration', unnamedComponents: 'arrow-function' },
      ],
      'react/prefer-read-only-props': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'jsx-a11y/label-has-associated-control': ['error', { assert: 'either' }],

      'n/no-missing-import': ['error', { tryExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs'] }],
      'n/no-process-env': 'error',
      'n/no-unsupported-features/node-builtins': 'error',
      '@next/next/no-html-link-for-pages': 'error',
      'promise/prefer-await-to-then': 'error',
      'unicorn/prefer-global-this': 'error',

      'no-restricted-syntax': ['error', ...generalRestrictedSyntax],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@prisma/client',
              message: 'Prisma 8 uses db.orm from shared/lib/db, not PrismaClient.',
            },
            {
              name: 'better-auth/adapters/prisma',
              message: 'Prisma 8 is not supported by prismaAdapter. Use the pg Pool.',
            },
          ],
          patterns: [
            {
              group: ['${wrongAlias}/*'],
              message: 'This project imports through ${ctx.alias}/*.',
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          property: '__proto__',
          message: 'Use Object.getPrototypeOf / Object.create instead.',
        },
      ],
    },
  },

  {
    name: 'fullest-of-stacks/tests',
    ...testingLibrary.configs['flat/react'],
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    plugins: {
      ...testingLibrary.configs['flat/react'].plugins,
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
      'import/no-default-export': 'off',
      'react/jsx-no-bind': 'off',
      'vitest/expect-expect': 'error',
      'vitest/no-alias-methods': 'error',
      'vitest/no-focused-tests': 'error',
      'vitest/no-conditional-expect': 'error',
      'vitest/no-done-callback': 'error',
      'vitest/no-duplicate-hooks': 'error',
      'vitest/no-mocks-import': 'error',
      'vitest/no-standalone-expect': 'error',
      'vitest/no-test-prefixes': 'error',
      'vitest/no-test-return-statement': 'error',
      'vitest/prefer-comparison-matcher': 'error',
      'vitest/prefer-each': 'error',
      'vitest/prefer-equality-matcher': 'error',
      'vitest/prefer-expect-resolves': 'error',
      'vitest/prefer-hooks-in-order': 'error',
      'vitest/prefer-hooks-on-top': 'error',
      'vitest/prefer-mock-promise-shorthand': 'error',
      'vitest/prefer-spy-on': 'error',
      'vitest/prefer-to-have-length': 'error',
      'vitest/consistent-test-filename': 'error',
      'vitest/prefer-to-contain': 'error',
      'vitest/prefer-to-be-object': 'error',
    },
  },

  {
    name: 'fullest-of-stacks/next-default-exports',
    files: [
      '**/app/**/page.tsx',
      '**/app/**/layout.tsx',
      '**/app/**/loading.tsx',
      '**/app/**/error.tsx',
      '**/app/**/not-found.tsx',
      '**/app/**/route.ts',
      '**/app/**/template.tsx',
      '**/app/**/default.tsx',
      '**/*.config.{ts,js,mjs}',
    ],
    rules: {
      'import/no-default-export': 'off',
    },
  },

  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'n/no-missing-import': 'off',
    },
  },

  {
    files: ['**/shared/lib/env.ts', '**/lib/env.ts'],
    rules: {
      'n/no-process-env': 'off',
    },
  },

  {
    files: ['**/*.mjs', '**/*.config.{js,ts,mjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
]

export default defineConfig(config)
`
}
