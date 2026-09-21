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

import { env } from '{{libImport}}/env/env'
import { rememberMagicLink } from '{{libImport}}/magic-link/dev-magic-link'

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
        /* v8 ignore start -- starter-only store-and-print; delete before production */
        rememberMagicLink(email, url)
        console.info(\`[starter] Magic link for \${email}: \${url}\`)
        /* v8 ignore stop */
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

import { env } from '{{libImport}}/env/env'

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

import { auth } from '{{libImport}}/auth/auth'

export const { POST, GET } = toNextJsHandler(auth)
`,
    ctx
  )
}

export function getSession(ctx: TemplateContext) {
  return t(
    `'use server'

import { headers } from 'next/headers'

import { auth } from '{{libImport}}/auth/auth'

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

import { env } from '{{libImport}}/env/env'

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

export function dbModels(ctx: TemplateContext) {
  return t(
    `import { db } from '{{libImport}}/database/db'

export type Account = NonNullable<(typeof db.orm.public.Account)['_row']>
export type Post = NonNullable<(typeof db.orm.public.Post)['_row']>
export type Session = NonNullable<(typeof db.orm.public.Session)['_row']>
export type User = NonNullable<(typeof db.orm.public.User)['_row']>
export type Verification = NonNullable<
  (typeof db.orm.public.Verification)['_row']
>
`,
    ctx
  )
}

export function dbError() {
  return `export type DatabaseErrorKind =
  | 'unique'
  | 'foreignKey'
  | 'notNull'
  | 'check'
  | 'unready'
  | 'unknown'

export interface DatabaseErrorInfo {
  readonly kind: DatabaseErrorKind
  readonly message: string
  readonly constraint?: string
  readonly column?: string
  readonly table?: string
}

export interface DatabaseActionError {
  readonly error: string
  readonly kind: DatabaseErrorKind
}

const DEFAULT_FALLBACK = 'Could not complete the request'

const MESSAGES: Record<Exclude<DatabaseErrorKind, 'unknown'>, string> = {
  unique: 'This value is already taken',
  foreignKey: 'Related record was not found',
  notNull: 'A required field is missing',
  check: 'This value is not allowed',
  unready: 'The database is not ready',
}

const UNIQUE_CONSTRAINT_MESSAGES: Record<string, string> = {
  post_slug_key: 'A post with this title already exists',
  user_email_key: 'This email is already in use',
}

const UNREADY_CODES = new Set([
  '42P01',
  '3D000',
  '08001',
  '08006',
  '57P01',
  '57P03',
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
])

const UNREADY_PATTERN =
  /does not exist|ECONNREFUSED|42P01|DATABASE_URL is not set|connect(ion)? refused/i

const UNIQUE_PATTERN = /duplicate key|unique constraint/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function readField(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  return readString(value[key])
}

function errorText(value: unknown): string {
  if (value instanceof Error) {
    return \`\${value.name} \${value.message}\`
  }

  return String(value)
}

function errorChain(error: unknown): readonly unknown[] {
  const parts: unknown[] = []
  let current: unknown = error

  for (let depth = 0; depth < 4 && current; depth += 1) {
    parts.push(current)

    if (current instanceof Error) {
      current = current.cause
    } else if (isRecord(current)) {
      current = current.cause
    } else {
      break
    }
  }

  return parts
}

function uniqueMessage(value: unknown): string {
  const constraint = readField(value, 'constraint')

  if (!constraint) {
    return MESSAGES.unique
  }

  return UNIQUE_CONSTRAINT_MESSAGES[constraint] ?? MESSAGES.unique
}

function classified(
  kind: Exclude<DatabaseErrorKind, 'unknown'>,
  value: unknown,
): DatabaseErrorInfo {
  return {
    kind,
    message: kind === 'unique' ? uniqueMessage(value) : MESSAGES[kind],
    constraint: readField(value, 'constraint'),
    column: readField(value, 'column'),
    table: readField(value, 'table'),
  }
}

function classify(value: unknown): DatabaseErrorInfo | undefined {
  const code = readField(value, 'code')

  if (code === '23505') {
    return classified('unique', value)
  }

  if (code === '23503') {
    return classified('foreignKey', value)
  }

  if (code === '23502') {
    return classified('notNull', value)
  }

  if (code === '23514') {
    return classified('check', value)
  }

  if (code && UNREADY_CODES.has(code)) {
    return classified('unready', value)
  }

  const text = errorText(value)

  if (UNREADY_PATTERN.test(text)) {
    return classified('unready', value)
  }

  if (UNIQUE_PATTERN.test(text)) {
    return classified('unique', value)
  }

  return undefined
}

export function getDatabaseErrorInfo(error: unknown): DatabaseErrorInfo {
  for (const entry of errorChain(error)) {
    const match = classify(entry)

    if (match) {
      return match
    }
  }

  return { kind: 'unknown', message: DEFAULT_FALLBACK }
}

export function getDatabaseError(error: unknown): DatabaseActionError {
  const info = getDatabaseErrorInfo(error)

  return { error: info.message, kind: info.kind }
}
`
}
