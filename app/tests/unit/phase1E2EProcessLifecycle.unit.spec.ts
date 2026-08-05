import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const appFile = (relativePath: string) => join(process.cwd(), relativePath)

describe('phase-1 E2E process lifecycle', () => {
  it('forces the standalone PostgreSQL subsite seed to exit after Payload cleanup', async () => {
    const source = await readFile(appFile('scripts/prepare-phase1-e2e-db.mjs'), 'utf8')
    const postgresBranchStart = source.indexOf('if (isPostgres) {')
    const postgresBranchEnd = source.indexOf('} else {', postgresBranchStart)
    const postgresBranch = source.slice(postgresBranchStart, postgresBranchEnd)

    expect(postgresBranchStart).toBeGreaterThan(-1)
    expect(postgresBranchEnd).toBeGreaterThan(postgresBranchStart)
    expect(postgresBranch).toContain("['exec', 'tsx', 'scripts/seed-subsites.ts']")
    expect(postgresBranch).toContain("WINGSSIDE_REHEARSAL_EXIT_AFTER_SEED: 'true'")
  })

  it('returns explicit success and failure exit codes from the standalone smoke seed', async () => {
    const source = await readFile(appFile('scripts/seed-phase1-e2e-smoke.ts'), 'utf8')
    const seedCall = source.indexOf(
      'await seedPhase1LaunchSmoke({ destroyPayloadAfterSeed: true })',
    )
    const successExit = source.indexOf('process.exit(0)', seedCall)
    const catchBlock = source.indexOf('} catch (error) {', successExit)
    const failureExit = source.indexOf('process.exit(1)', catchBlock)

    expect(seedCall).toBeGreaterThan(-1)
    expect(successExit).toBeGreaterThan(seedCall)
    expect(catchBlock).toBeGreaterThan(successExit)
    expect(failureExit).toBeGreaterThan(catchBlock)
    expect(source).not.toContain('process.exitCode')
  })
})
