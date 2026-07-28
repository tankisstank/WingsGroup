import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const importer = fs.readFileSync(
  path.resolve(process.cwd(), 'scripts', 'import-wingsside-tour-editorial-production.ts'),
  'utf8',
)

describe('WingSide tour editorial production importer release guard ordering', () => {
  it('guards apply and rollback before Payload initialization', () => {
    const preflight = importer.indexOf('initializeWingsSideEditorialProductionWriter({')
    const payloadInitialization = importer.indexOf("await import('../src/payload.config')")
    expect(preflight).toBeGreaterThan(-1)
    expect(payloadInitialization).toBeGreaterThan(preflight)
  })

  it('re-checks release evidence immediately before the transaction runtime', () => {
    const lastGuard = importer.lastIndexOf('assertMutationReleaseGuard({')
    const applyRuntime = importer.indexOf('applyWingsSideTourEditorialProductionPlan({')
    const rollbackRuntime = importer.indexOf('rollbackWingsSideTourEditorialProductionPlan({')
    expect(lastGuard).toBeGreaterThan(importer.indexOf('const failAfterUpdates'))
    expect(applyRuntime).toBeGreaterThan(lastGuard)
    expect(rollbackRuntime).toBeGreaterThan(lastGuard)
  })

  it('preserves phase-specific textual confirmation as an additional gate', () => {
    expect(importer).toContain('CONFIRM_WINGSSIDE_TOUR_EDITORIAL_PRODUCTION_WRITE')
    expect(importer).toContain('CONFIRM_WINGSSIDE_TOUR_EDITORIAL_PRODUCTION_ROLLBACK')
    expect(importer.indexOf('assertConfirmation(phase)')).toBeLessThan(
      importer.indexOf('assertMutationReleaseGuard({'),
    )
  })
})
