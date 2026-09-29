import type { ProjectContext } from '../lib/project.ts'

export function viteConfig(ctx: ProjectContext) {
  const appSrc = 'apps/web/src'

  return `import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
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
    include: [
      'apps/**/*.{test,spec}.{ts,tsx}',
      'packages/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/e2e/**',
      '**/.next/**',
      '**/dist/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        '${appSrc}/app/**/*.{ts,tsx}',
        '${appSrc}/shared/libs/**/*.{ts,tsx}',
        'packages/**/src/**/*.{ts,tsx}',
        'packages/database/prisma/seed.ts',
        'packages/database/prisma/reset.ts',
      ],
      exclude: [
        '**/*.test.{ts,tsx}',
        '${appSrc}/test/**',
        '${appSrc}/shared/components/ui/**',
        'packages/database/prisma/contract.*',
        '**/node_modules/**',
        '**/dist/**',
        '**/e2e/**',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      '${ctx.alias}': new URL('./${appSrc}', import.meta.url).pathname,
    },
  },
})
`
}

export const vitestSetup = `import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'

import { createElement, type ReactNode } from 'react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

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
