import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // Payload and its database adapters are server-only. Running integration
    // tests in jsdom makes Vite try to browser-bundle `node:sqlite`.
    environment: 'node',
    include: ['tests/int/**/*.int.spec.ts'],
  },
})
