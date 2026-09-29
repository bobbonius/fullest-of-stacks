import type { TemplateContext } from '../lib/template.ts'
import { t } from '../lib/template.ts'

export function playwrightConfig(ctx: TemplateContext) {
  const webServer =
    'node apps/web/node_modules/next/dist/bin/next dev --hostname localhost --port 3000'

  return t(
    `import { config as loadEnv } from 'dotenv'
import { defineConfig, devices } from '@playwright/test'

loadEnv({ path: '.env.local' })
loadEnv()

/**
 * End-to-end tests are the primary signal that the app works.
 * Unit/component tests (Vitest) stay fast and focused; Playwright covers
 * real browser journeys against a running Next.js server + Postgres.
 *
 * Prerequisites: Postgres up, \`{{packageManager}} db:init\`, \`{{packageManager}} db:seed\`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: '${webServer}',
    url: 'http://127.0.0.1:3000/api/health',
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      ...process.env,
    },
  },
})
`,
    ctx
  )
}

export function e2eAuthHelper() {
  return `import { expect, type Page } from '@playwright/test'

export interface MagicLinkUser {
  readonly name: string
  readonly email: string
}

/** Sign in via the starter magic-link preview on /login. */
export async function signInWithMagicLink(
  page: Page,
  user: MagicLinkUser
): Promise<void> {
  await page.goto('/login')
  await page.getByRole('heading', { name: 'Sign in' }).waitFor()
  await page.getByLabel('Name').fill(user.name)
  await page.getByLabel('Email').fill(user.email)
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click()

  const magicLink = page.getByRole('status').getByRole('link')
  await expect(magicLink).toBeVisible()
  await magicLink.click()

  await expect(page).toHaveURL(/\\/dashboard/)
  await expect(
    page.getByRole('heading', { name: new RegExp(\`Hello \${user.name}\`) })
  ).toBeVisible()
}

export function uniqueUser(prefix = 'e2e'): MagicLinkUser {
  const stamp = Date.now()
  return {
    name: \`\${prefix} user \${stamp}\`,
    email: \`\${prefix}.\${stamp}@example.com\`,
  }
}
`
}

export function e2eHomeSpec(ctx: TemplateContext) {
  return t(
    `import { expect, test } from '@playwright/test'

test.describe('homepage', () => {
  test('shows the product and seeded posts', async ({ page }) => {
    await page.goto('/')

    await expect(
      page.getByRole('heading', { name: '{{projectName}}' })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Sign in with a magic link' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Latest posts' })
    ).toBeVisible()
    await expect(page.getByText('Hello from the seed')).toBeVisible()
  })

  test('health endpoint responds', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBeTruthy()
  })
})
`,
    ctx
  )
}

export function e2eAuthSpec() {
  return `import { expect, test } from '@playwright/test'

import { signInWithMagicLink, uniqueUser } from './helpers/auth'

test.describe('magic-link auth', () => {
  test('signs in and reaches the dashboard', async ({ page }) => {
    const user = uniqueUser('auth')
    await signInWithMagicLink(page, user)
  })

  test('signed-in home offers the dashboard', async ({ page }) => {
    const user = uniqueUser('home')
    await signInWithMagicLink(page, user)

    await page.goto('/')
    await expect(
      page.getByText(new RegExp(\`Signed in as \${user.name}\`))
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Open dashboard' })
    ).toBeVisible()
  })

  test('sign out returns to login', async ({ page }) => {
    const user = uniqueUser('out')
    await signInWithMagicLink(page, user)

    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\\/login/)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  test('dashboard redirects guests to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\\/login/)
  })
})
`
}

export function e2ePostsSpec() {
  return `import { expect, test } from '@playwright/test'

import { signInWithMagicLink, uniqueUser } from './helpers/auth'

test.describe('posts', () => {
  test('creates a post and shows it on the homepage', async ({ page }) => {
    const user = uniqueUser('post')
    const title = \`E2E post \${Date.now()}\`
    const body =
      'Published through Playwright against the real Next.js app and database.'

    await signInWithMagicLink(page, user)

    await page.getByRole('button', { name: 'Manage posts' }).click()
    await expect(page.getByRole('heading', { name: 'Posts' })).toBeVisible()

    await page.getByRole('button', { name: 'New post' }).click()
    await page.getByLabel('Title').fill(title)
    await page.getByLabel('Body').fill(body)
    await Promise.all([
      page.waitForURL(/\\/dashboard\\/posts/),
      page.getByRole('button', { name: 'Publish' }).click(),
    ])

    await expect(page.getByText(title)).toBeVisible()

    await page.goto('/')
    await expect(page.getByText(title, { exact: true })).toBeVisible()
  })
})
`
}

export function generatedE2eFiles(ctx: TemplateContext) {
  return {
    'playwright.config.ts': playwrightConfig(ctx),
    'e2e/helpers/auth.ts': e2eAuthHelper(),
    'e2e/home.spec.ts': e2eHomeSpec(ctx),
    'e2e/auth.spec.ts': e2eAuthSpec(),
    'e2e/posts.spec.ts': e2ePostsSpec(),
  } satisfies Record<string, string>
}
