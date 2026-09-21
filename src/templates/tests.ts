import type { TemplateContext } from '../lib/template.ts'
import { t } from '../lib/template.ts'

export function generatedTests(ctx: TemplateContext) {
  return {
    'app/layout.test.tsx': rootLayoutTest(ctx),
    'app/(app)/page.test.tsx': homePageTest(ctx),
    'app/(app)/_actions/get-published-posts.test.ts': getPublishedPostsTest(ctx),
    'app/(app)/_components/post-list.test.tsx': postListTest(ctx),
    'app/(app)/login/page.test.tsx': loginPageTest(),
    'app/(app)/login/_components/LoginForm/schema/index.test.ts': loginSchemaTest(ctx),
    'app/(app)/login/_components/LoginForm/index.test.tsx': loginFormTest(ctx),
    'app/(app)/login/_components/LoginForm/actions/request-magic-link.test.ts':
      requestMagicLinkTest(ctx),
    'app/(dashboard)/layout.test.tsx': dashboardLayoutTest(ctx),
    'app/(dashboard)/dashboard/page.test.tsx': dashboardPageTest(ctx),
    'app/(dashboard)/dashboard/_actions/sign-out.test.ts': dashboardActionsTest(ctx),
    'app/(dashboard)/dashboard/posts/page.test.tsx': postsPageTest(ctx),
    'app/(dashboard)/dashboard/posts/new/page.test.tsx': newPostPageTest(),
    'app/(dashboard)/dashboard/posts/new/_components/PostForm/index.test.tsx': postFormTest(ctx),
    'app/(dashboard)/dashboard/posts/new/_components/PostForm/schema/index.test.ts':
      postSchemaTest(ctx),
    'app/(dashboard)/dashboard/posts/new/_components/PostForm/actions/create-post.test.ts':
      postActionsTest(ctx),
    'app/api/health/route.test.ts': healthRouteTest(),
    'app/api/posts/route.test.ts': postsApiTest(ctx),
    'app/api/auth/[...all]/route.test.ts': authRouteTest(ctx),
    'shared/lib/auth.test.ts': authServerTest(),
    'shared/lib/auth-client.test.ts': authClientTest(),
    'shared/lib/dev-magic-link.test.ts': devMagicLinkTest(),
    'shared/lib/server/get-session.test.ts': getSessionTest(ctx),
    'shared/lib/db.test.ts': dbTest(ctx),
    'shared/lib/env.test.ts': envTest(),
    'prisma/seed.test.ts': seedTest(ctx),
    'prisma/reset.test.ts': resetTest(ctx),
  } satisfies Record<string, string>
}

function rootLayoutTest(ctx: TemplateContext) {
  return t(
    `import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, test, vi } from 'vitest'

import RootLayout from './layout'

vi.mock('./globals.css', () => ({}))
vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono' }),
}))
vi.mock('{{uiImport}}/sonner', () => ({
  Toaster: () => createElement('div', { 'data-testid': 'toaster' }),
}))

describe('RootLayout', () => {
  test('renders children and the toaster', () => {
    render(
      <RootLayout>
        <p>Hello</p>
      </RootLayout>
    )

    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByTestId('toaster')).toBeInTheDocument()
  })
})
`,
    ctx
  )
}

function homePageTest(ctx: TemplateContext) {
  return t(
    `import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { getServerSideSession } from '{{libImport}}/server/get-session'
import { postFactory, sessionFactory } from '{{importPrefix}}test/factories'

import { getPublishedPosts } from './_actions/get-published-posts'
import HomePage from './page'

vi.mock('{{libImport}}/server/get-session', async () => {
  const { getServerSideSession } = await import('{{importPrefix}}test/mocks/session')
  return { getServerSideSession }
})
vi.mock('./_actions/get-published-posts', () => ({
  getPublishedPosts: vi.fn(),
}))
vi.mock('{{uiImport}}/card', () => ({
  Card: ({ children }: { children?: unknown }) => <div>{children}</div>,
  CardHeader: ({ children }: { children?: unknown }) => <div>{children}</div>,
  CardTitle: ({ children }: { children?: unknown }) => <h3>{children}</h3>,
  CardDescription: ({ children }: { children?: unknown }) => <p>{children}</p>,
}))

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getPublishedPosts).mockResolvedValue({ posts: [] })
  })

  test('offers magic-link sign in when there is no session', async () => {
    vi.mocked(getServerSideSession).mockResolvedValue(null)

    render(await HomePage())

    expect(screen.getByRole('link', { name: /sign in with a magic link/i })).toHaveAttribute(
      'href',
      '/login'
    )
  })

  test('links to the dashboard when signed in', async () => {
    const session = await sessionFactory.build()
    vi.mocked(getServerSideSession).mockResolvedValue(session as never)

    render(await HomePage())

    expect(screen.getByText(\`Signed in as \${session.user.name}.\`)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open dashboard/i })).toHaveAttribute(
      'href',
      '/dashboard'
    )
  })

  test('renders seeded posts on the homepage', async () => {
    const post = await postFactory.build()
    vi.mocked(getServerSideSession).mockResolvedValue(null)
    vi.mocked(getPublishedPosts).mockResolvedValue({ posts: [post] })

    render(await HomePage())

    expect(screen.getByText(post.title)).toBeInTheDocument()
    expect(screen.getByText(post.body)).toBeInTheDocument()
  })
})
`,
    ctx
  )
}

function getPublishedPostsTest(ctx: TemplateContext) {
  return t(
    `import { beforeEach, describe, expect, test, vi } from 'vitest'

import { postFactory } from '{{importPrefix}}test/factories'
import { dbMock, postQuery } from '{{importPrefix}}test/mocks/db'

import { getPublishedPosts } from './get-published-posts'

vi.mock('{{libImport}}/db', async () => {
  const { dbMock } = await import('{{importPrefix}}test/mocks/db')
  return { db: dbMock }
})

describe('getPublishedPosts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('loads published posts', async () => {
    const posts = await postFactory.buildList(2)
    postQuery.all.mockResolvedValue(posts)

    await expect(getPublishedPosts()).resolves.toEqual({ posts })
    expect(dbMock.orm.public.Post.where).toHaveBeenCalledWith({ published: true })
  })

  test('returns a setup error when the post table is missing', async () => {
    postQuery.all.mockRejectedValue(
      new Error('relation "public.post" does not exist')
    )

    await expect(getPublishedPosts()).resolves.toEqual({
      posts: [],
      setupError: expect.stringMatching(/db:init/i),
    })
  })
})
`,
    ctx
  )
}

function postListTest(ctx: TemplateContext) {
  return t(
    `import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { postFactory } from '{{importPrefix}}test/factories'

import { PostList } from './post-list'

vi.mock('{{uiImport}}/card', () => ({
  Card: ({ children }: { children?: unknown }) => <div>{children}</div>,
  CardHeader: ({ children }: { children?: unknown }) => <div>{children}</div>,
  CardTitle: ({ children }: { children?: unknown }) => <h3>{children}</h3>,
  CardDescription: ({ children }: { children?: unknown }) => <p>{children}</p>,
}))

describe('PostList', () => {
  test('shows an empty state', () => {
    render(<PostList posts={[]} />)
    expect(screen.getByText(/no posts yet/i)).toBeInTheDocument()
  })

  test('lists posts', async () => {
    const post = await postFactory.build()
    render(<PostList posts={[post]} />)
    expect(screen.getByText(post.title)).toBeInTheDocument()
    expect(screen.getByText(post.body)).toBeInTheDocument()
  })

  test('shows database setup instructions', () => {
    render(
      <PostList
        posts={[]}
        setupError="Postgres is running, but the Prisma tables are not there yet."
      />
    )
    expect(screen.getByText(/database is not initialized/i)).toBeInTheDocument()
    expect(screen.getByText(/prisma tables are not there yet/i)).toBeInTheDocument()
  })
})
`,
    ctx
  )
}

function loginPageTest() {
  return `import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import LoginPage from './page'

vi.mock('./_components/LoginForm', () => ({
  LoginForm: () => <div>login form</div>,
}))

describe('LoginPage', () => {
  test('renders the login form', () => {
    render(<LoginPage />)
    expect(screen.getByText('login form')).toBeInTheDocument()
  })
})
`
}

function loginSchemaTest(ctx: TemplateContext) {
  return t(
    `import { describe, expect, test } from 'vitest'

import { magicLinkValuesFactory } from '{{importPrefix}}test/factories'

import { LoginFormSchema } from '.'

describe('LoginFormSchema', () => {
  test('accepts a name and email', async () => {
    const values = await magicLinkValuesFactory.build()
    expect(LoginFormSchema.parse(values)).toEqual(values)
  })

  test('rejects an invalid email', () => {
    const result = LoginFormSchema.safeParse({
      name: 'Ada',
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })
})
`,
    ctx
  )
}

function loginFormTest(ctx: TemplateContext) {
  return t(
    `import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { magicLinkValuesFactory } from '{{importPrefix}}test/factories'

import { requestMagicLink } from './actions/request-magic-link'
import { LoginForm } from '.'

vi.mock('./actions/request-magic-link', () => ({
  requestMagicLink: vi.fn(),
}))

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('warns that the printed magic link is starter-only', () => {
    render(<LoginForm />)
    expect(screen.getByText(/remove before production/i)).toBeInTheDocument()
  })

  test('shows a validation error for an invalid email', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText(/name/i), 'Ada')
    await user.click(screen.getByRole('button', { name: /email me a sign-in link/i }))

    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument()
    expect(requestMagicLink).not.toHaveBeenCalled()
  })

  test('prints the magic link after a successful request', async () => {
    const values = await magicLinkValuesFactory.build()
    const magicLinkUrl = 'http://localhost:3000/api/auth/magic-link/verify?token=test'
    vi.mocked(requestMagicLink).mockResolvedValue({ magicLinkUrl })

    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText(/name/i), values.name)
    await user.type(screen.getByLabelText(/email/i), values.email)
    await user.click(screen.getByRole('button', { name: /email me a sign-in link/i }))

    await waitFor(() => {
      expect(requestMagicLink).toHaveBeenCalledWith({ data: values })
    })
    expect(screen.getByRole('link', { name: magicLinkUrl })).toHaveAttribute(
      'href',
      magicLinkUrl
    )
    expect(screen.getByText(/do not ship this/i)).toBeInTheDocument()
  })

  test('shows the auth error message', async () => {
    const values = await magicLinkValuesFactory.build()
    vi.mocked(requestMagicLink).mockResolvedValue({
      error: 'Could not send the sign-in link',
    })

    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText(/name/i), values.name)
    await user.type(screen.getByLabelText(/email/i), values.email)
    await user.click(screen.getByRole('button', { name: /email me a sign-in link/i }))

    expect(
      await screen.findByText('Could not send the sign-in link')
    ).toBeInTheDocument()
  })
})
`,
    ctx
  )
}

function requestMagicLinkTest(ctx: TemplateContext) {
  return t(
    `import { beforeEach, describe, expect, test, vi } from 'vitest'

import { magicLinkValuesFactory } from '{{importPrefix}}test/factories'

import { requestMagicLink } from './request-magic-link'

const { signInMagicLink, headers, takeLastMagicLink } = vi.hoisted(() => ({
  signInMagicLink: vi.fn(),
  headers: vi.fn(),
  takeLastMagicLink: vi.fn(),
}))

vi.mock('next/headers', () => ({ headers }))
vi.mock('{{libImport}}/auth', () => ({
  auth: { api: { signInMagicLink } },
}))
vi.mock('{{libImport}}/dev-magic-link', () => ({
  takeLastMagicLink,
}))
vi.mock('{{libImport}}/env', () => ({
  env: { nodeEnv: 'test' },
}))

describe('requestMagicLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    headers.mockResolvedValue(new Headers())
  })

  test('returns a validation error for a short name', async () => {
    await expect(
      requestMagicLink({ data: { name: 'A', email: 'ada@example.com' } })
    ).resolves.toEqual({ error: 'Name is required' })
    expect(signInMagicLink).not.toHaveBeenCalled()
  })

  test('returns the stored magic link in non-production', async () => {
    const values = await magicLinkValuesFactory.build()
    const magicLinkUrl = 'http://localhost:3000/api/auth/magic-link/verify?token=test'
    signInMagicLink.mockResolvedValue({})
    takeLastMagicLink.mockReturnValue(magicLinkUrl)

    await expect(requestMagicLink({ data: values })).resolves.toEqual({ magicLinkUrl })
    expect(signInMagicLink).toHaveBeenCalledWith({
      body: {
        email: values.email,
        name: values.name,
        callbackURL: '/dashboard',
      },
      headers: expect.any(Headers),
    })
  })
})
`,
    ctx
  )
}

function dashboardLayoutTest(ctx: TemplateContext) {
  return t(
    `import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { getServerSideSession } from '{{libImport}}/server/get-session'
import { sessionFactory } from '{{importPrefix}}test/factories'
import { redirect } from '{{importPrefix}}test/mocks/navigation'

import DashboardLayout from './layout'

vi.mock('next/navigation', async () => import('{{importPrefix}}test/mocks/navigation'))
vi.mock('{{libImport}}/server/get-session', async () => {
  const { getServerSideSession } = await import('{{importPrefix}}test/mocks/session')
  return { getServerSideSession }
})

describe('DashboardLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('redirects to login when there is no session', async () => {
    vi.mocked(getServerSideSession).mockResolvedValue(null)

    await expect(DashboardLayout({ children: <p>secret</p> })).rejects.toThrow(
      'NEXT_REDIRECT:/login'
    )
    expect(redirect).toHaveBeenCalledWith('/login')
  })

  test('renders children when signed in', async () => {
    vi.mocked(getServerSideSession).mockResolvedValue(
      (await sessionFactory.build()) as never
    )

    render(await DashboardLayout({ children: <p>secret</p> }))

    expect(screen.getByText('secret')).toBeInTheDocument()
    expect(redirect).not.toHaveBeenCalled()
  })
})
`,
    ctx
  )
}

function dashboardPageTest(ctx: TemplateContext) {
  return t(
    `import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { getServerSideSession } from '{{libImport}}/server/get-session'
import { sessionFactory } from '{{importPrefix}}test/factories'

import DashboardPage from './page'

vi.mock('{{libImport}}/server/get-session', async () => {
  const { getServerSideSession } = await import('{{importPrefix}}test/mocks/session')
  return { getServerSideSession }
})
vi.mock('./_actions/sign-out', () => ({
  signOutAction: vi.fn(),
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('greets the signed-in user', async () => {
    const session = await sessionFactory.build()
    vi.mocked(getServerSideSession).mockResolvedValue(session as never)

    render(await DashboardPage())

    expect(
      screen.getByRole('heading', { name: \`Hello \${session.user.name}\` })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /manage posts/i })).toHaveAttribute(
      'href',
      '/dashboard/posts'
    )
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })
})
`,
    ctx
  )
}

function dashboardActionsTest(ctx: TemplateContext) {
  return t(
    `import { beforeEach, describe, expect, test, vi } from 'vitest'

import { redirect } from '{{importPrefix}}test/mocks/navigation'

import { signOutAction } from './sign-out'

const { signOut, headers } = vi.hoisted(() => ({
  signOut: vi.fn(),
  headers: vi.fn(),
}))

vi.mock('next/headers', () => ({ headers }))
vi.mock('next/navigation', async () => import('{{importPrefix}}test/mocks/navigation'))
vi.mock('{{libImport}}/auth', () => ({
  auth: { api: { signOut } },
}))

describe('signOutAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('signs out and redirects to login', async () => {
    const requestHeaders = new Headers()
    headers.mockResolvedValue(requestHeaders)

    await expect(signOutAction()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(signOut).toHaveBeenCalledWith({ headers: requestHeaders })
    expect(redirect).toHaveBeenCalledWith('/login')
  })
})
`,
    ctx
  )
}

function postsPageTest(ctx: TemplateContext) {
  return t(
    `import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { getServerSideSession } from '{{libImport}}/server/get-session'
import { postFactory, sessionFactory } from '{{importPrefix}}test/factories'
import { dbMock, postQuery } from '{{importPrefix}}test/mocks/db'

import PostsPage from './page'

vi.mock('{{libImport}}/db', async () => {
  const { dbMock } = await import('{{importPrefix}}test/mocks/db')
  return { db: dbMock }
})
vi.mock('{{libImport}}/server/get-session', async () => {
  const { getServerSideSession } = await import('{{importPrefix}}test/mocks/session')
  return { getServerSideSession }
})

describe('PostsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('shows an empty state when there is no session', async () => {
    vi.mocked(getServerSideSession).mockResolvedValue(null)

    render(await PostsPage())

    expect(screen.getByText(/no posts yet/i)).toBeInTheDocument()
    expect(dbMock.orm.public.Post.where).not.toHaveBeenCalled()
  })

  test('shows an empty state when the user has no posts', async () => {
    vi.mocked(getServerSideSession).mockResolvedValue(
      (await sessionFactory.build()) as never
    )
    postQuery.all.mockResolvedValue([])

    render(await PostsPage())

    expect(screen.getByText(/no posts yet/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /new post/i })).toHaveAttribute(
      'href',
      '/dashboard/posts/new'
    )
  })

  test('lists posts for the signed-in author', async () => {
    const session = await sessionFactory.build()
    const post = await postFactory.props({ authorId: () => session.user.id }).build()
    vi.mocked(getServerSideSession).mockResolvedValue(session as never)
    postQuery.all.mockResolvedValue([post])

    render(await PostsPage())

    expect(screen.getByText(post.title)).toBeInTheDocument()
    expect(screen.getByText(post.slug)).toBeInTheDocument()
    expect(dbMock.orm.public.Post.where).toHaveBeenCalledWith({
      authorId: session.user.id,
    })
  })
})
`,
    ctx
  )
}

function newPostPageTest() {
  return `import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import NewPostPage from './page'

vi.mock('./_components/PostForm', () => ({
  PostForm: () => <div>post form</div>,
}))

describe('NewPostPage', () => {
  test('renders the post form', () => {
    render(<NewPostPage />)
    expect(screen.getByRole('heading', { name: /new post/i })).toBeInTheDocument()
    expect(screen.getByText('post form')).toBeInTheDocument()
  })
})
`
}

function postFormTest(ctx: TemplateContext) {
  return t(
    `import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { postInputFactory } from '{{importPrefix}}test/factories'

import { createPost } from './actions/create-post'
import { PostForm } from '.'

vi.mock('./actions/create-post', () => ({
  createPost: vi.fn(),
}))

describe('PostForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('shows a validation error for a short title', async () => {
    const user = userEvent.setup()
    render(<PostForm />)

    await user.type(screen.getByLabelText(/title/i), 'Hi')
    await user.type(screen.getByLabelText(/body/i), 'Too short')
    await user.click(screen.getByRole('button', { name: /publish/i }))

    expect(
      await screen.findByText(/title must be at least 3 characters/i)
    ).toBeInTheDocument()
    expect(createPost).not.toHaveBeenCalled()
  })

  test('submits a valid post', async () => {
    const values = await postInputFactory.build()
    vi.mocked(createPost).mockResolvedValue(undefined)

    const user = userEvent.setup()
    render(<PostForm />)

    await user.type(screen.getByLabelText(/title/i), values.title)
    await user.type(screen.getByLabelText(/body/i), values.body)
    await user.click(screen.getByRole('button', { name: /publish/i }))

    await waitFor(() => {
      expect(createPost).toHaveBeenCalledWith({ data: values })
    })
  })

  test('shows an action error', async () => {
    const values = await postInputFactory.build()
    vi.mocked(createPost).mockResolvedValue({ error: 'Could not save' })

    const user = userEvent.setup()
    render(<PostForm />)

    await user.type(screen.getByLabelText(/title/i), values.title)
    await user.type(screen.getByLabelText(/body/i), values.body)
    await user.click(screen.getByRole('button', { name: /publish/i }))

    expect(await screen.findByText('Could not save')).toBeInTheDocument()
  })
})
`,
    ctx
  )
}

function postSchemaTest(ctx: TemplateContext) {
  return t(
    `import { describe, expect, test } from 'vitest'

import { postInputFactory } from '{{importPrefix}}test/factories'

import { PostFormSchema } from '.'

describe('PostFormSchema', () => {
  test('accepts a valid post', async () => {
    const values = await postInputFactory.build()
    expect(PostFormSchema.parse(values)).toEqual(values)
  })

  test('rejects a short title', async () => {
    const values = await postInputFactory.use((traits) => traits.invalid).build()
    const result = PostFormSchema.safeParse(values)
    expect(result.success).toBe(false)
  })
})
`,
    ctx
  )
}

function postActionsTest(ctx: TemplateContext) {
  return t(
    `import { beforeEach, describe, expect, test, vi } from 'vitest'

import { getServerSideSession } from '{{libImport}}/server/get-session'
import { postInputFactory, sessionFactory } from '{{importPrefix}}test/factories'
import { dbMock } from '{{importPrefix}}test/mocks/db'
import { redirect } from '{{importPrefix}}test/mocks/navigation'

import { createPost } from './create-post'

vi.mock('next/navigation', async () => import('{{importPrefix}}test/mocks/navigation'))
vi.mock('{{libImport}}/db', async () => {
  const { dbMock } = await import('{{importPrefix}}test/mocks/db')
  return { db: dbMock }
})
vi.mock('{{libImport}}/server/get-session', async () => {
  const { getServerSideSession } = await import('{{importPrefix}}test/mocks/session')
  return { getServerSideSession }
})

describe('createPost', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns a validation error for short input', async () => {
    const values = await postInputFactory.use((traits) => traits.invalid).build()
    await expect(createPost({ data: values })).resolves.toEqual({
      error: 'Title must be at least 3 characters',
    })
    expect(dbMock.orm.public.Post.create).not.toHaveBeenCalled()
  })

  test('redirects to login when there is no session', async () => {
    vi.mocked(getServerSideSession).mockResolvedValue(null)
    const values = await postInputFactory.build()

    await expect(createPost({ data: values })).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(redirect).toHaveBeenCalledWith('/login')
    expect(dbMock.orm.public.Post.create).not.toHaveBeenCalled()
  })

  test('creates a post and redirects', async () => {
    const session = await sessionFactory.build()
    const values = await postInputFactory.build()
    vi.mocked(getServerSideSession).mockResolvedValue(session as never)
    dbMock.orm.public.Post.create.mockResolvedValue({ id: 'post_1' })

    await expect(createPost({ data: values })).rejects.toThrow(
      'NEXT_REDIRECT:/dashboard/posts'
    )

    expect(dbMock.orm.public.Post.create).toHaveBeenCalledWith({
      title: values.title,
      body: values.body,
      slug: 'hello-stacks',
      published: true,
      authorId: session.user.id,
    })
    expect(redirect).toHaveBeenCalledWith('/dashboard/posts')
  })

  test('returns an error when create fails', async () => {
    const session = await sessionFactory.build()
    const values = await postInputFactory.build()
    vi.mocked(getServerSideSession).mockResolvedValue(session as never)
    dbMock.orm.public.Post.create.mockRejectedValue(new Error('db down'))

    await expect(createPost({ data: values })).resolves.toEqual({
      error: 'db down',
    })
    expect(redirect).not.toHaveBeenCalled()
  })
})
`,
    ctx
  )
}

function healthRouteTest() {
  return `import { describe, expect, test } from 'vitest'

import { GET } from './route'

describe('GET /api/health', () => {
  test('returns ok', async () => {
    const response = GET()
    await expect(response.json()).resolves.toEqual({ ok: true })
  })
})
`
}

function postsApiTest(ctx: TemplateContext) {
  return t(
    `import { beforeEach, describe, expect, test, vi } from 'vitest'

import { getServerSideSession } from '{{libImport}}/server/get-session'
import { postFactory, sessionFactory } from '{{importPrefix}}test/factories'
import { dbMock, postQuery } from '{{importPrefix}}test/mocks/db'

import { GET } from './route'

vi.mock('{{libImport}}/db', async () => {
  const { dbMock } = await import('{{importPrefix}}test/mocks/db')
  return { db: dbMock }
})
vi.mock('{{libImport}}/server/get-session', async () => {
  const { getServerSideSession } = await import('{{importPrefix}}test/mocks/session')
  return { getServerSideSession }
})

describe('GET /api/posts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns 401 when there is no session', async () => {
    vi.mocked(getServerSideSession).mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  test('returns posts for the signed-in author', async () => {
    const session = await sessionFactory.build()
    const posts = await postFactory
      .props({ authorId: () => session.user.id })
      .buildList(2)
    vi.mocked(getServerSideSession).mockResolvedValue(session as never)
    postQuery.all.mockResolvedValue(posts)

    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ posts })
    expect(dbMock.orm.public.Post.where).toHaveBeenCalledWith({
      authorId: session.user.id,
    })
  })
})
`,
    ctx
  )
}

function authRouteTest(ctx: TemplateContext) {
  return t(
    `import { describe, expect, test, vi } from 'vitest'

import { GET, POST } from './route'

vi.mock('better-auth/next-js', () => ({
  toNextJsHandler: vi.fn(() => ({
    GET: vi.fn(),
    POST: vi.fn(),
  })),
}))
vi.mock('{{libImport}}/auth', () => ({
  auth: { api: {} },
}))

describe('auth route', () => {
  test('exports the Better Auth Next.js handlers', () => {
    expect(typeof GET).toBe('function')
    expect(typeof POST).toBe('function')
  })
})
`,
    ctx
  )
}

function authServerTest() {
  return `import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { magicLink } from 'better-auth/plugins'
import { Pool } from 'pg'
import { describe, expect, test, vi } from 'vitest'

import { auth } from './auth'

vi.mock('pg', () => ({
  Pool: vi.fn(function MockPool() {}),
}))
vi.mock('@paralleldrive/cuid2', () => ({
  createId: vi.fn(() => 'id'),
}))
vi.mock('better-auth', () => ({
  betterAuth: vi.fn((options) => ({ options, api: {} })),
}))
vi.mock('better-auth/next-js', () => ({
  nextCookies: vi.fn(() => 'next-cookies'),
}))
vi.mock('better-auth/plugins', () => ({
  magicLink: vi.fn(() => 'magic-link'),
}))

describe('auth', () => {
  test('enables magic link against a pg pool', () => {
    expect(Pool).toHaveBeenCalled()
    expect(magicLink).toHaveBeenCalled()
    expect(nextCookies).toHaveBeenCalled()
    expect(betterAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        plugins: ['magic-link', 'next-cookies'],
      })
    )
    expect(auth).toEqual({
      options: expect.any(Object),
      api: {},
    })
  })
})
`
}

function authClientTest() {
  return `import { magicLinkClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { describe, expect, test, vi } from 'vitest'

import { authClient, getSession, signIn, signOut, useSession } from './auth-client'

vi.mock('better-auth/client/plugins', () => ({
  magicLinkClient: vi.fn(() => 'magic-link-client'),
}))
vi.mock('better-auth/react', () => ({
  createAuthClient: vi.fn(() => ({
    signIn: { magicLink: vi.fn() },
    signOut: vi.fn(),
    useSession: vi.fn(),
    getSession: vi.fn(),
  })),
}))

describe('auth-client', () => {
  test('re-exports the Better Auth browser client', () => {
    expect(magicLinkClient).toHaveBeenCalled()
    expect(createAuthClient).toHaveBeenCalledWith(
      expect.objectContaining({
        plugins: ['magic-link-client'],
      })
    )
    expect(signIn).toBe(authClient.signIn)
    expect(signOut).toBe(authClient.signOut)
    expect(useSession).toBe(authClient.useSession)
    expect(getSession).toBe(authClient.getSession)
  })
})
`
}

function devMagicLinkTest() {
  return `import { describe, expect, test } from 'vitest'

import { rememberMagicLink, takeLastMagicLink } from './dev-magic-link'

describe('dev-magic-link', () => {
  test('returns the last stored url for the same email', () => {
    rememberMagicLink('ada@example.com', 'http://localhost:3000/link')
    expect(takeLastMagicLink('ada@example.com')).toBe('http://localhost:3000/link')
  })

  test('ignores a url stored for a different email', () => {
    rememberMagicLink('ada@example.com', 'http://localhost:3000/link')
    expect(takeLastMagicLink('other@example.com')).toBeUndefined()
  })
})
`
}

function getSessionTest(ctx: TemplateContext) {
  return t(
    `import { beforeEach, describe, expect, test, vi } from 'vitest'

import { sessionFactory } from '{{importPrefix}}test/factories'

import { getServerSideSession } from './get-session'

const { getSession, headers } = vi.hoisted(() => ({
  getSession: vi.fn(),
  headers: vi.fn(),
}))

vi.mock('next/headers', () => ({ headers }))
vi.mock('{{libImport}}/auth', () => ({
  auth: { api: { getSession } },
}))

describe('getServerSideSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('reads the session from Better Auth with request headers', async () => {
    const session = await sessionFactory.build()
    const requestHeaders = new Headers({ cookie: 'session=test' })
    headers.mockResolvedValue(requestHeaders)
    getSession.mockResolvedValue(session as never)

    await expect(getServerSideSession()).resolves.toEqual(session)
    expect(getSession).toHaveBeenCalledWith({ headers: requestHeaders })
  })
})
`,
    ctx
  )
}

function dbTest(ctx: TemplateContext) {
  return t(
    `import { describe, expect, test, vi } from 'vitest'

import { db } from './db'

vi.stubEnv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/test')

vi.mock('{{prismaDbImport}}', () => ({
  db: { orm: { public: { Post: {} } } },
}))
vi.mock('@prisma/orm-postgres/runtime', () => ({
  default: () => ({ orm: { public: { Post: {} } } }),
}))

describe('db', () => {
  test('exports a Prisma client', () => {
    expect(db.orm.public.Post).toBeDefined()
  })
})
`,
    ctx
  )
}

function seedTest(ctx: TemplateContext) {
  return t(
    `import { beforeEach, describe, expect, test, vi } from 'vitest'

import { dbMock, postQuery } from '{{importPrefix}}test/mocks/db'

import { seed } from './seed'

vi.mock('{{libImport}}/db', async () => {
  const { dbMock } = await import('{{importPrefix}}test/mocks/db')
  return { db: dbMock }
})
vi.mock('{{libImport}}/env', () => ({
  env: { databaseUrl: 'postgresql://postgres:postgres@localhost:5432/test' },
}))

describe('seed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
  })

  test('skips when seed posts already exist', async () => {
    postQuery.first.mockResolvedValue({ id: 'post_1' })

    await seed()

    expect(dbMock.orm.public.User.create).not.toHaveBeenCalled()
    expect(console.info).toHaveBeenCalledWith(
      'Seed already applied. Homepage posts are ready.'
    )
  })

  test('creates a seed author and published posts', async () => {
    postQuery.first.mockResolvedValue(null)
    dbMock.orm.public.User.create.mockResolvedValue({ id: 'user_seed_ada' })
    dbMock.orm.public.Post.create.mockResolvedValue({ id: 'post_1' })

    await seed()

    expect(dbMock.orm.public.User.create).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      emailVerified: true,
    })
    expect(dbMock.orm.public.Post.create).toHaveBeenCalledWith(
      expect.objectContaining({ authorId: 'user_seed_ada' })
    )
    expect(dbMock.orm.public.Post.create).toHaveBeenCalledTimes(3)
    expect(console.info).toHaveBeenCalledWith('Seeded 3 published posts.')
  })
})
`,
    ctx
  )
}

function resetTest(ctx: TemplateContext) {
  return t(
    `import { beforeEach, describe, expect, test, vi } from 'vitest'

import { env } from '{{libImport}}/env'

import { resetDatabase } from './reset'

const { envState, query, end } = vi.hoisted(() => ({
  envState: {
    databaseUrl: 'postgresql://postgres:postgres@localhost:5432/test' as
      | string
      | undefined,
  },
  query: vi.fn(),
  end: vi.fn(),
}))

vi.mock('pg', () => ({
  Pool: vi.fn(() => ({ query, end })),
}))

vi.mock('{{libImport}}/env', () => ({
  env: envState,
}))

describe('resetDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    env.databaseUrl = 'postgresql://postgres:postgres@localhost:5432/test'
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    query.mockResolvedValue(undefined)
    end.mockResolvedValue(undefined)
  })

  test('drops and recreates the public schema', async () => {
    await resetDatabase()

    expect(query).toHaveBeenNthCalledWith(1, 'DROP SCHEMA IF EXISTS public CASCADE')
    expect(query).toHaveBeenNthCalledWith(2, 'CREATE SCHEMA public')
    expect(end).toHaveBeenCalledTimes(1)
    expect(console.info).toHaveBeenCalledWith('Cleared the public schema.')
  })

  test('closes the pool when a query fails', async () => {
    query.mockRejectedValueOnce(new Error('connection refused'))

    await expect(resetDatabase()).rejects.toThrow('connection refused')
    expect(end).toHaveBeenCalledTimes(1)
  })

  test('throws when DATABASE_URL is missing', async () => {
    env.databaseUrl = undefined

    await expect(resetDatabase()).rejects.toThrow('DATABASE_URL is not set')
    expect(query).not.toHaveBeenCalled()
  })
})
`,
    ctx
  )
}

function envTest() {
  return `import { describe, expect, test, vi } from 'vitest'

import { env } from './env'

vi.mock('dotenv', () => ({
  config: () => ({ parsed: {} }),
}))

describe('env', () => {
  test('exposes database and auth settings', () => {
    expect(Object.keys(env).sort()).toEqual([
      'betterAuthSecret',
      'betterAuthUrl',
      'databaseUrl',
      'nodeEnv',
    ])
  })
})
`
}
