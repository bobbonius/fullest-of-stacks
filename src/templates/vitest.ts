import type { ProjectContext } from '../lib/project.ts'

export function viteConfig(ctx: ProjectContext) {
  const root = ctx.srcRoot === '.' ? '' : `${ctx.srcRoot}/`

  return `import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    {
      name: 'stub-css',
      load(id: string): string | null {
        if (id.endsWith('.css')) {
          return 'export default {}'
        }
        return null
      },
    },
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    include: ['**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        '${root}app/**/*.{ts,tsx}',
        '${root}shared/lib/**/*.{ts,tsx}',
        '${root}shared/utils/**/*.{ts,tsx}',
        '${root}prisma/seed.ts',
        '${root}prisma/reset.ts',
      ],
      exclude: [
        '**/*.test.{ts,tsx}',
        '${root}test/**',
        '${root}shared/components/ui/**',
        '${root}prisma/contract.*',
        '${root}prisma/db.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '${ctx.alias}': new URL('./${ctx.srcRoot === '.' ? '.' : ctx.srcRoot}', import.meta.url).pathname,
    },
  },
})
`
}

export const vitestSetup = `import '@testing-library/jest-dom/vitest'

import { createElement, type ReactNode } from 'react'
import { vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href?: string | { pathname?: string }
    children?: ReactNode
  }): ReturnType<typeof createElement> => {
    const url = typeof href === 'string' ? href : (href?.pathname ?? '#')
    return createElement('a', { href: url, ...props }, children)
  },
}))

class MockResizeObserver {
  observe(): void {
    return undefined
  }
  unobserve(): void {
    return undefined
  }
  disconnect(): void {
    return undefined
  }
}

vi.stubGlobal('ResizeObserver', MockResizeObserver)

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: vi.fn(),
})

Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
  configurable: true,
  value(): DOMRect {
    return {
      x: 0,
      y: 0,
      width: 300,
      height: 40,
      top: 0,
      left: 0,
      right: 300,
      bottom: 40,
      toJSON(): DOMRect {
        return this as DOMRect
      },
    } as DOMRect
  },
})

Object.defineProperty(globalThis, 'matchMedia', {
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
})

vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
  setTimeout(() => cb(performance.now()), 16),
)
vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
`
