import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // Payload and its database adapters are server-only. Running integration
    // tests in jsdom makes Vite try to browser-bundle `node:sqlite`.
    environment: 'node',
    // A fresh Payload SQLite schema and the source-derived editorial inventory
    // both exceed Vitest's small defaults on Windows release-gate runners.
    hookTimeout: 60_000,
    include: ['tests/int/**/*.int.spec.ts'],
    testTimeout: 30_000,
  },
})
