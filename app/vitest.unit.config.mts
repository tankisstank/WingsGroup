import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

const nodeTests = [
  'tests/unit/postgresCrudSmokeLifecycle.unit.spec.ts',
  'tests/unit/wingsGroupEditorial.unit.spec.ts',
  'tests/unit/wingsGroupEditorialOperations.unit.spec.ts',
  'tests/unit/wingsGroupV3ContentLocaleIsolation.unit.spec.ts',
  'tests/unit/wingsGroupV3Foundation.unit.spec.ts',
  'tests/unit/wingsGroupV3PreviewSeed.unit.spec.ts',
]

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'node', environment: 'node', include: nodeTests },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          environment: 'jsdom',
          include: ['tests/unit/**/*.unit.spec.ts'],
          exclude: nodeTests,
          setupFiles: ['./vitest.setup.ts'],
        },
      },
    ],
  },
})
