import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { preflightWingsSideEditorialCatalogArtifact } from '../../scripts/import-wingsside-tour-editorial-production'

const importer = fs.readFileSync(
  path.resolve(process.cwd(), 'scripts', 'import-wingsside-tour-editorial-production.ts'),
  'utf8',
)

describe('WingSide tour editorial production importer release guard ordering', () => {
  it('requires and hashes an immutable catalog v2 artifact before use', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'wingsside-catalog-cli-'))
    const catalogPath = path.join(directory, 'reviewed-catalog-v2.json')
    const bytes = Buffer.from('{"version":2}\n', 'utf8')
    const checksum = createHash('sha256').update(bytes).digest('hex')
    try {
      await expect(
        preflightWingsSideEditorialCatalogArtifact({
          cwd: directory,
          expectedSha256: checksum,
        }),
      ).rejects.toThrow('require --catalog')
      await expect(
        preflightWingsSideEditorialCatalogArtifact({
          catalogPath: 'missing.json',
          cwd: directory,
          expectedSha256: checksum,
        }),
      ).rejects.toThrow('missing or unreadable')
      await writeFile(catalogPath, bytes)
      await expect(
        preflightWingsSideEditorialCatalogArtifact({
          catalogPath,
          expectedSha256: checksum.toUpperCase(),
        }),
      ).rejects.toThrow('lowercase SHA-256')
      await expect(
        preflightWingsSideEditorialCatalogArtifact({
          catalogPath,
          expectedSha256: '0'.repeat(64),
        }),
      ).rejects.toThrow('does not match')
      await expect(
        preflightWingsSideEditorialCatalogArtifact({
          catalogPath: 'reviewed-catalog-v2.json',
          cwd: directory,
          expectedSha256: checksum,
        }),
      ).resolves.toEqual({
        catalogPath: path.resolve(catalogPath),
        catalogSha256: checksum,
      })
    } finally {
      await rm(directory, { force: true, recursive: true })
    }
  })

  it('preflights and passes the selected catalog before Payload initialization', () => {
    const catalogPreflight = importer.indexOf(
      'await preflightWingsSideEditorialCatalogArtifact({',
    )
    const payloadInitialization = importer.indexOf("await import('../src/payload.config')")
    expect(catalogPreflight).toBeGreaterThan(-1)
    expect(payloadInitialization).toBeGreaterThan(catalogPreflight)
    expect(importer).toContain('catalogPath: catalogArtifact.catalogPath')
    expect(importer).toContain(
      'preparedPlan.plan.approvalSnapshotChecksum !== catalog.approvalManifest.checksum',
    )
  })

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
