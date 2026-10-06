import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      '@payloadcms/ui/icons/Copy': path.resolve(__dirname, 'tests/mocks/emptyNodeSqlite.ts'),
      'node:sqlite': path.resolve(__dirname, 'tests/mocks/emptyNodeSqlite.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/component/**/*.component.spec.tsx'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
