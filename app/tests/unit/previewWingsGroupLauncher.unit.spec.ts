import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const sourceRoot = path.resolve(process.cwd())
const launcherSource = fs.readFileSync(
  path.join(sourceRoot, 'scripts', 'preview-wingsgroup-v3.ts'),
  'utf8',
)
const tsxEntrypoint = path.join(sourceRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')

describe('WingsGroup v3 preview launcher', () => {
  it('runs the TypeScript seed through the project tsx runtime', () => {
    expect(launcherSource).toContain("'node_modules/tsx/dist/cli.mjs'")
    expect(launcherSource).not.toContain(
      "runChild(\n      'scripts/seed-wingsgroup-v3-home-preview.ts'",
    )

    const result = execFileSync(
      process.execPath,
      [
        tsxEntrypoint,
        '--eval',
        "import('./src/wingsgroup/corporateRoutes.ts').then(({ WINGSGROUP_SITE_CODE }) => { if (WINGSGROUP_SITE_CODE !== 'wings-group') process.exit(1) })",
      ],
      { cwd: sourceRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    )

    expect(result).toBe('')
  })
})
