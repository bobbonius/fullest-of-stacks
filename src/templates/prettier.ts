export const prettierRc = {
  semi: false,
  singleQuote: true,
  jsxSingleQuote: false,
  trailingComma: 'all',
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',
  endOfLine: 'lf',
  quoteProps: 'as-needed',
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindFunctions: ['cn', 'cva'],
}

export const prettierIgnore = `node_modules
.next
out
build
dist
coverage
pnpm-lock.yaml
package-lock.yaml
package-lock.json
yarn.lock
bun.lock
bun.lockb
next-env.d.ts
*.prisma
**/generated/**
`
