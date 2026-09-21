import type { TemplateContext } from '../lib/template.ts'
import { t } from '../lib/template.ts'

export function envModule() {
  return `import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })
loadEnv()

export const env = {
  databaseUrl: process.env.DATABASE_URL,
  betterAuthSecret: process.env.BETTER_AUTH_SECRET,
  betterAuthUrl: process.env.BETTER_AUTH_URL,
  nodeEnv: process.env.NODE_ENV,
}
`
}

export function devMagicLink() {
  return `/**
 * STARTER ONLY — delete this module before production.
 *
 * Better Auth calls \`sendMagicLink\` with the real sign-in URL. This file
 * keeps the last URL in memory so the login page can print it. That lets you
 * try auth without an email provider.
 *
 * In production: send the URL by email (Resend, Postmark, …) and never return
 * it to the browser.
 */

interface StoredMagicLink {
  email: string
  url: string
}

let lastMagicLink: StoredMagicLink | null = null

export function rememberMagicLink(email: string, url: string): void {
  lastMagicLink = { email, url }
}

export function takeLastMagicLink(email: string): string | undefined {
  if (!lastMagicLink || lastMagicLink.email !== email) {
    return undefined
  }

  return lastMagicLink.url
}
`
}

export function authServer(ctx: TemplateContext) {
  return t(
    `import { createId } from '@paralleldrive/cuid2'
import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { magicLink } from 'better-auth/plugins'
import { Pool } from 'pg'

import { rememberMagicLink } from '{{libImport}}/dev-magic-link'
import { env } from '{{libImport}}/env'

export const auth = betterAuth({
  appName: '{{projectName}}',
  secret: env.betterAuthSecret,
  baseURL: env.betterAuthUrl,
  database: new Pool({
    connectionString: env.databaseUrl,
  }),
  advanced: {
    database: {
      generateId: createId,
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }): Promise<void> => {
        // STARTER ONLY: print/store the URL instead of sending email.
        // Replace this callback with your mailer before production.
        rememberMagicLink(email, url)
        console.info(\`[starter] Magic link for \${email}: \${url}\`)
      },
    }),
    nextCookies(),
  ],
})
`,
    ctx
  )
}

export function authClient(ctx: TemplateContext) {
  return t(
    `import { magicLinkClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

import { env } from '{{libImport}}/env'

export const authClient = createAuthClient({
  baseURL: env.betterAuthUrl,
  plugins: [magicLinkClient()],
})

export const { signIn, signOut, useSession, getSession } = authClient
`,
    ctx
  )
}

export function authRoute(ctx: TemplateContext) {
  return t(
    `import { toNextJsHandler } from 'better-auth/next-js'

import { auth } from '{{libImport}}/auth'

export const { POST, GET } = toNextJsHandler(auth)
`,
    ctx
  )
}

export function getSession(ctx: TemplateContext) {
  return t(
    `'use server'

import { headers } from 'next/headers'

import { auth } from '{{libImport}}/auth'

export async function getServerSideSession(): Promise<
  Awaited<ReturnType<typeof auth.api.getSession>>
> {
  return auth.api.getSession({
    headers: await headers(),
  })
}

export type ServerSideSession = Awaited<ReturnType<typeof getServerSideSession>>
`,
    ctx
  )
}

export function dbReexport(ctx: TemplateContext) {
  return t(
    `export { db } from '{{prismaDbImport}}'
`,
    ctx
  )
}

export function dbFallback(ctx: TemplateContext) {
  return t(
    `import postgres from '@prisma/orm-postgres/runtime'

import { env } from '{{libImport}}/env'

const connectionString = env.databaseUrl

if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

export const db = postgres({
  url: connectionString,
})
`,
    ctx
  )
}
