import type { TemplateContext } from '../lib/template.ts'
import { t } from '../lib/template.ts'

export function testSupportFiles(ctx: TemplateContext) {
  return {
    'test/factories/index.ts': factories(ctx),
    'test/mocks/db.ts': dbMock(),
    'test/mocks/session.ts': sessionMock(),
    'test/mocks/navigation.ts': navigationMock(),
    'test/mocks/auth-client.ts': authClientMock(),
  } satisfies Record<string, string>
}

function factories(ctx: TemplateContext) {
  return t(
    `import { factory, seq } from '@factory-js/factory'

import type { Post, User } from '{{libImport}}/database/models'

interface AuthSession {
  user: User
}

interface MagicLinkValues {
  name: string
  email: string
}

interface PostInput {
  title: string
  body: string
}

export const userFactory = factory.define<User>({
  props: {
    id: seq(1, (n: number): string => \`user_\${n}\`),
    name: () => 'Ada Lovelace',
    email: seq(1, (n: number): string => \`ada\${n}@example.com\`),
    emailVerified: () => false,
    image: () => null,
    createdAt: () => '2024-01-01 00:00:00',
    updatedAt: () => '2024-01-01 00:00:00',
  },
  vars: {},
})

export const sessionFactory = factory.define<AuthSession>({
  props: {
    user: async () => userFactory.build(),
  },
  vars: {},
})

export const postFactory = factory.define<Post>({
  props: {
    id: seq(1, (n: number): string => \`post_\${n}\`),
    title: () => 'Hello stacks',
    body: () => 'A body that is definitely long enough.',
    slug: () => 'hello-stacks',
    published: () => true,
    authorId: () => 'user_1',
    createdAt: () => '2024-01-01 00:00:00',
    updatedAt: () => '2024-01-01 00:00:00',
  },
  vars: {},
})

export const magicLinkValuesFactory = factory.define<MagicLinkValues>({
  props: {
    name: () => 'Ada Lovelace',
    email: () => 'ada@example.com',
  },
  vars: {},
})

export const postInputFactory = factory.define<PostInput>({
  props: {
    title: () => 'Hello stacks',
    body: () => 'A body that is definitely long enough.',
  },
  vars: {},
}).traits({
  invalid: {
    props: {
      title: () => 'Hi',
      body: () => 'Too short',
    },
  },
})
`,
    ctx
  )
}

function dbMock() {
  return `import { vi } from 'vitest'

export const postQuery = {
  all: vi.fn(),
  first: vi.fn(),
}

export const dbMock = {
  orm: {
    public: {
      User: {
        create: vi.fn(),
      },
      Post: {
        create: vi.fn(),
        all: vi.fn(),
        where: vi.fn(() => postQuery),
      },
    },
  },
}
`
}

function sessionMock() {
  return `import { vi } from 'vitest'

export const getServerSideSession = vi.fn()
`
}

function navigationMock() {
  return `import { vi } from 'vitest'

export const routerPush = vi.fn()
export const routerRefresh = vi.fn()

export const useRouter = vi.fn(() => ({
  push: routerPush,
  refresh: routerRefresh,
}))

export const redirect = vi.fn((href?: string) => {
  throw new Error(\`NEXT_REDIRECT:\${href ?? ''}\`)
})

export const notFound = vi.fn()
`
}

function authClientMock() {
  return `import { vi } from 'vitest'

export const signIn = {
  magicLink: vi.fn(),
}

export const signOut = vi.fn()
export const useSession = vi.fn()
export const getSession = vi.fn()
`
}
