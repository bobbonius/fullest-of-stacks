import type { TemplateContext } from '../lib/template.ts'
import { t } from '../lib/template.ts'

export function rootLayout(ctx: TemplateContext, existing?: string) {
  if (
    existing?.includes('Toaster') &&
    existing.includes('children') &&
    existing.includes('next/font')
  ) {
    return existing
  }

  return t(
    `import './globals.css'

import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import type { JSX, ReactNode } from 'react'

import { Toaster } from '{{uiImport}}/sonner'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: '{{projectName}}',
  description: 'Scaffolded with fullest-of-stacks',
}

interface Props {
  readonly children: ReactNode
}

export default function RootLayout({ children }: Props): JSX.Element {
  return (
    <html lang="en" className={geistSans.variable}>
      <body
        className={\`\${geistSans.variable} \${geistMono.variable} min-h-svh font-sans antialiased\`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  )
}
`,
    ctx
  )
}

export function patchGlobalsCss(contents: string): string {
  return contents
    .replace(
      '--font-sans: var(--font-sans);',
      '--font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;'
    )
    .replace(
      '--font-mono: var(--font-geist-mono);',
      '--font-mono: var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace;'
    )
    .replace(
      /body \{\s*@apply bg-background text-foreground;\s*\}/,
      'body {\n    @apply bg-background font-sans text-foreground antialiased;\n  }'
    )
}

export function homePage(ctx: TemplateContext) {
  return t(
    `import Link from 'next/link'
import type { JSX } from 'react'

import { Button } from '{{uiImport}}/button'
import { getServerSideSession } from '{{libImport}}/server/get-session'

import { getPublishedPosts } from './_actions/get-published-posts'
import { PostList } from './_components/post-list'

export default async function HomePage(): Promise<JSX.Element> {
  const session = await getServerSideSession()
  const { posts, setupError } = await getPublishedPosts()

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col justify-center gap-8 p-8">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">fullest-of-stacks</p>
        <h1 className="text-3xl font-semibold tracking-tight">{{projectName}}</h1>
        <p className="text-muted-foreground">
          {session
            ? \`Signed in as \${session.user.name}.\`
            : 'A full-stack starter with magic-link auth, Prisma 8, and tests.'}
        </p>
      </div>
      <div className="flex gap-3">
        {session ? (
          <Button nativeButton={false} render={<Link href="/dashboard" />}>
            Open dashboard
          </Button>
        ) : (
          <Button nativeButton={false} render={<Link href="/login" />}>
            Sign in with a magic link
          </Button>
        )}
      </div>
      <PostList posts={posts} setupError={setupError} />
    </main>
  )
}
`,
    ctx
  )
}

export function getPublishedPostsAction(ctx: TemplateContext) {
  return t(
    `'use server'

import { db } from '{{libImport}}/db'

export interface PublishedPost {
  id: string
  title: string
  body: string
  slug: string
  published: boolean
  authorId: string
}

export interface PublishedPostsResult {
  posts: PublishedPost[]
  setupError?: string
}

function isUnreadyDatabase(error: unknown): boolean {
  const parts: string[] = []
  let current: unknown = error

  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (current instanceof Error) {
      parts.push(current.name, current.message)
      current = current.cause
      continue
    }

    parts.push(String(current))
    break
  }

  return /does not exist|ECONNREFUSED|42P01|DATABASE_URL is not set|connect(ion)? refused/i.test(
    parts.join(' '),
  )
}

export async function getPublishedPosts(): Promise<PublishedPostsResult> {
  try {
    const posts = await db.orm.public.Post.where({ published: true }).all()
    return { posts }
  } catch (error: unknown) {
    if (isUnreadyDatabase(error)) {
      return {
        posts: [],
        setupError:
          'The database is not ready. This app expects Postgres at localhost:{{databasePort}} / {{databaseName}}. From this app run \`{{packageManager}} db:init\`, then \`{{packageManager}} db:seed\`. To wipe local data and start over, run \`{{packageManager}} db:reset\`.',
      }
    }

    throw error
  }
}
`,
    ctx
  )
}

export function postListComponent(ctx: TemplateContext) {
  return t(
    `import type { JSX } from 'react'

import { Card, CardDescription, CardHeader, CardTitle } from '{{uiImport}}/card'

import type { PublishedPost } from '../_actions/get-published-posts'

interface Props {
  readonly posts: readonly PublishedPost[]
  readonly setupError?: string
}

export function PostList({ posts, setupError }: Props): JSX.Element {
  if (setupError) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-medium">Latest posts</h2>
        <div
          role="status"
          className="rounded-md border-2 border-amber-500 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-50"
        >
          <p className="font-semibold">Database is not initialized</p>
          <p className="mt-1">{setupError}</p>
        </div>
      </section>
    )
  }

  if (posts.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-medium">Latest posts</h2>
        <p className="text-sm text-muted-foreground">
          No posts yet. After Postgres is up at localhost:{{databasePort}} / {{databaseName}}, run \`{{packageManager}} db:seed\`
          to add sample posts.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Latest posts</h2>
      <ul className="space-y-3">
        {posts.map((post) => (
          <li key={post.id}>
            <Card>
              <CardHeader>
                <CardTitle>{post.title}</CardTitle>
                <CardDescription>{post.body}</CardDescription>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}
`,
    ctx
  )
}

export function loginPage() {
  return `import type { JSX } from 'react'

import { LoginForm } from './_components/LoginForm'

export default function LoginPage(): JSX.Element {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <LoginForm />
    </main>
  )
}
`
}

export function loginSchema() {
  return `import { z } from 'zod'

export const LoginFormSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  email: z.email('Enter a valid email'),
})

export type LoginFormData = z.infer<typeof LoginFormSchema>
`
}

export function requestMagicLinkAction(ctx: TemplateContext) {
  return t(
    `'use server'

import { headers } from 'next/headers'

import { auth } from '{{libImport}}/auth'
import { takeLastMagicLink } from '{{libImport}}/dev-magic-link'
import { env } from '{{libImport}}/env'

import { type LoginFormData, LoginFormSchema } from '../schema'

interface Props {
  readonly data: LoginFormData
}

export async function requestMagicLink({
  data,
}: Props): Promise<{ error?: string; magicLinkUrl?: string }> {
  const parsed = LoginFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid email' }
  }

  try {
    await auth.api.signInMagicLink({
      body: {
        email: parsed.data.email,
        name: parsed.data.name,
        callbackURL: '/dashboard',
      },
      headers: await headers(),
    })
  } catch (error: unknown) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Could not send the sign-in link',
    }
  }

  if (env.nodeEnv === 'production') {
    return {}
  }

  return { magicLinkUrl: takeLastMagicLink(parsed.data.email) }
}
`,
    ctx
  )
}

export function loginForm(ctx: TemplateContext) {
  return t(
    `'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { type JSX, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '{{uiImport}}/button'
import { Input } from '{{uiImport}}/input'
import { Label } from '{{uiImport}}/label'

import { requestMagicLink } from './actions/request-magic-link'
import { type LoginFormData, LoginFormSchema } from './schema'

export function LoginForm(): JSX.Element {
  const [error, setError] = useState<string | null>(null)
  const [magicLinkUrl, setMagicLinkUrl] = useState<string | null>(null)
  const form = useForm<LoginFormData>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: { name: '', email: '' },
  })

  const onSubmit = async (values: LoginFormData): Promise<void> => {
    setError(null)
    setMagicLinkUrl(null)
    const result = await requestMagicLink({ data: values })
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.magicLinkUrl) {
      setMagicLinkUrl(result.magicLinkUrl)
    }
  }

  const handleSubmit = form.handleSubmit(onSubmit)

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          We email a one-time link. First-time addresses create an account.
        </p>
      </div>
      <div
        role="note"
        className="rounded-md border-2 border-amber-500 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-50"
      >
        <p className="font-semibold">Starter only — remove before production</p>
        <p className="mt-1">
          This page prints the magic-link URL so you can try auth without an
          email provider. Delete the preview,{' '}
          <code className="rounded bg-amber-200/80 px-1 dark:bg-amber-800">
            shared/lib/dev-magic-link.ts
          </code>
          , and the <code className="rounded bg-amber-200/80 px-1 dark:bg-amber-800">sendMagicLink</code>{' '}
          store-and-print callback before you ship.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" autoComplete="name" {...form.register('name')} />
        {form.formState.errors.name ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.name.message}
          </p>
        ) : undefined}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...form.register('email')}
        />
        {form.formState.errors.email ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.email.message}
          </p>
        ) : undefined}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : undefined}
      {magicLinkUrl ? (
        <div
          role="status"
          className="space-y-2 rounded-md border-2 border-dashed border-amber-500 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-50"
        >
          <p className="font-semibold">Dev magic link — do not ship this</p>
          <a
            href={magicLinkUrl}
            className="block break-all font-mono text-xs underline"
          >
            {magicLinkUrl}
          </a>
        </div>
      ) : undefined}
      <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Sending link…' : 'Email me a sign-in link'}
      </Button>
    </form>
  )
}
`,
    ctx
  )
}

export function dashboardLayout(ctx: TemplateContext) {
  return t(
    `import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getServerSideSession } from '{{libImport}}/server/get-session'

interface Props {
  readonly children: ReactNode
}

export default async function DashboardLayout({
  children,
}: Props): Promise<ReactNode> {
  const session = await getServerSideSession()

  if (!session) {
    return redirect('/login')
  }

  return children
}
`,
    ctx
  )
}

export function dashboardPage(ctx: TemplateContext) {
  return t(
    `import Link from 'next/link'
import type { JSX } from 'react'

import { Button } from '{{uiImport}}/button'
import { getServerSideSession } from '{{libImport}}/server/get-session'

import { signOutAction } from './_actions/sign-out'

export default async function DashboardPage(): Promise<JSX.Element> {
  const session = await getServerSideSession()

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Dashboard</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Hello {session?.user.name}
          </h1>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </div>
      <Button className="w-fit" nativeButton={false} render={<Link href="/dashboard/posts" />}>
        Manage posts
      </Button>
    </main>
  )
}
`,
    ctx
  )
}

export function dashboardActions(ctx: TemplateContext) {
  return t(
    `'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '{{libImport}}/auth'

export async function signOutAction(): Promise<never> {
  await auth.api.signOut({
    headers: await headers(),
  })
  return redirect('/login')
}
`,
    ctx
  )
}

export function postsPage(ctx: TemplateContext) {
  return t(
    `import Link from 'next/link'
import type { JSX } from 'react'

import { Button } from '{{uiImport}}/button'
import { db } from '{{libImport}}/db'
import { getServerSideSession } from '{{libImport}}/server/get-session'

export default async function PostsPage(): Promise<JSX.Element> {
  const session = await getServerSideSession()
  const posts = session
    ? await db.orm.public.Post.where({ authorId: session.user.id }).all()
    : []

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Posts</h1>
        <Button nativeButton={false} render={<Link href="/dashboard/posts/new" />}>
          New post
        </Button>
      </div>
      {posts.length === 0 ? (
        <p className="text-muted-foreground">
          No posts yet. Create one to try Zod, Prisma 8, and server actions.
        </p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id} className="rounded-lg border p-4">
              <p className="font-medium">{post.title}</p>
              <p className="text-sm text-muted-foreground">{post.slug}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
`,
    ctx
  )
}

export function newPostPage() {
  return `import type { JSX } from 'react'

import { PostForm } from './_components/PostForm'

export default function NewPostPage(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">New post</h1>
        <p className="text-muted-foreground">
          Validated with Zod, saved with Prisma 8.
        </p>
      </div>
      <PostForm />
    </main>
  )
}
`
}

export function postForm(ctx: TemplateContext) {
  return t(
    `'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { type JSX, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '{{uiImport}}/button'
import { Input } from '{{uiImport}}/input'
import { Label } from '{{uiImport}}/label'
import { Textarea } from '{{uiImport}}/textarea'

import { createPost } from './actions/create-post'
import { type PostFormData, PostFormSchema } from './schema'

export function PostForm(): JSX.Element {
  const [error, setError] = useState<string | null>(null)
  const form = useForm<PostFormData>({
    resolver: zodResolver(PostFormSchema),
    defaultValues: { title: '', body: '' },
  })

  const onSubmit = async (values: PostFormData): Promise<void> => {
    setError(null)
    const result = await createPost({ data: values })
    if (result?.error) {
      setError(result.error)
    }
  }

  const handleSubmit = form.handleSubmit(onSubmit)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...form.register('title')} />
        {form.formState.errors.title ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.title.message}
          </p>
        ) : undefined}
      </div>
      <div className="space-y-2">
        <Label htmlFor="body">Body</Label>
        <Textarea id="body" rows={8} {...form.register('body')} />
        {form.formState.errors.body ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.body.message}
          </p>
        ) : undefined}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : undefined}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Saving…' : 'Publish'}
      </Button>
    </form>
  )
}
`,
    ctx
  )
}

export function postSchema() {
  return `import { z } from 'zod'

export const PostFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  body: z.string().min(10, 'Body must be at least 10 characters'),
})

export type PostFormData = z.infer<typeof PostFormSchema>
`
}

export function postActions(ctx: TemplateContext) {
  return t(
    `'use server'

import { redirect } from 'next/navigation'

import { db } from '{{libImport}}/db'
import { getServerSideSession } from '{{libImport}}/server/get-session'
import { slugify } from '{{importPrefix}}shared/utils/slugify'

import { type PostFormData, PostFormSchema } from '../schema'

interface Props {
  readonly data: PostFormData
}

export async function createPost({
  data,
}: Props): Promise<{ error: string } | undefined> {
  const parsed = PostFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid post' }
  }

  const session = await getServerSideSession()
  if (!session) {
    return redirect('/login')
  }

  try {
    await db.orm.public.Post.create({
      title: parsed.data.title,
      body: parsed.data.body,
      slug: slugify(parsed.data.title),
      published: true,
      authorId: session.user.id,
    })
  } catch (error: unknown) {
    return {
      error: error instanceof Error ? error.message : 'Could not save the post',
    }
  }

  return redirect('/dashboard/posts')
}
`,
    ctx
  )
}

export function healthRoute() {
  return `export function GET(): Response {
  return Response.json({ ok: true })
}
`
}

export function postsApi(ctx: TemplateContext) {
  return t(
    `import { db } from '{{libImport}}/db'
import { getServerSideSession } from '{{libImport}}/server/get-session'

export async function GET(): Promise<Response> {
  const session = await getServerSideSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const posts = await db.orm.public.Post.where({ authorId: session.user.id }).all()
  return Response.json({ posts })
}
`,
    ctx
  )
}

export function seed(ctx: TemplateContext) {
  return t(
    `import '{{libImport}}/env'

import { db } from '{{libImport}}/db'

const SEED_POSTS = [
  {
    title: 'Hello from the seed',
    body: 'This post was created by the starter seed so the homepage has something to fetch.',
    slug: 'hello-from-the-seed',
  },
  {
    title: 'Colocate your next feature',
    body: 'Route-specific UI lives next to the page. Shared UI, lib, utils, and hooks live under shared/.',
    slug: 'colocate-your-next-feature',
  },
  {
    title: 'Magic links without email',
    body: 'The login page prints the Better Auth magic link in development. Remove that preview before production.',
    slug: 'magic-links-without-email',
  },
] as const

export async function seed(): Promise<void> {
  const existing = await db.orm.public.Post.where({
    slug: SEED_POSTS[0].slug,
  }).first()

  if (existing) {
    console.info('Seed already applied. Homepage posts are ready.')
    return
  }

  const user = await db.orm.public.User.create({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    emailVerified: true,
  })

  for (const post of SEED_POSTS) {
    await db.orm.public.Post.create({
      title: post.title,
      body: post.body,
      slug: post.slug,
      published: true,
      authorId: user.id,
    })
  }

  console.info(\`Seeded \${SEED_POSTS.length} published posts.\`)
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  void (async (): Promise<void> => {
    try {
      await seed()
    } catch (error: unknown) {
      console.error(error)
      process.exit(1)
    }
  })()
}
`,
    ctx
  )
}

export function resetDatabase(ctx: TemplateContext) {
  return t(
    `import { Pool } from 'pg'

import { env } from '{{libImport}}/env'

export async function resetDatabase(): Promise<void> {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is not set')
  }

  const pool = new Pool({ connectionString: env.databaseUrl })

  try {
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE')
    await pool.query('CREATE SCHEMA public')
    console.info('Cleared the public schema.')
  } finally {
    await pool.end()
  }
}

if (process.argv[1]?.endsWith('reset.ts') || process.argv[1]?.endsWith('reset.js')) {
  void (async (): Promise<void> => {
    try {
      await resetDatabase()
    } catch (error: unknown) {
      console.error(error)
      process.exit(1)
    }
  })()
}
`,
    ctx
  )
}

export function envExample() {
  return `DATABASE_URL="{{databaseUrl}}"
BETTER_AUTH_SECRET="replace-with-a-32-char-secret"
BETTER_AUTH_URL="http://localhost:3000"
`
}

export function vscodeSettings() {
  return `{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.execArgv": ["--max-old-space-size=8192"],
  "vitest.enable": true,
  "vitest.include": ["**/*.test.{ts,tsx}"]
}
`
}

export function vscodeExtensions() {
  return `{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "Prisma.prisma",
    "vitest.explorer"
  ]
}
`
}

export function nextConfigSnippet() {
  return `import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typedRoutes: true,
  serverExternalPackages: ['@prisma/orm-postgres', '@prisma/client', 'pg', '@prisma/adapter-pg'],
}

export default nextConfig
`
}
