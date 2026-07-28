import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  assertWingsSideEditorialCatalogArtifactBinding,
  preflightWingsSideEditorialCatalogArtifact,
} from '../../scripts/import-wingsside-tour-editorial-production'
import {
  editorialPricingApprovalChecksum,
  type WingsSideTourEditorialCatalog,
} from '../../scripts/lib/wingsSideTourEditorialLocalization'
import { wingsSideCatalogDevelopmentTeamApprovalPolicy } from '../../scripts/lib/wingsSideTourEditorialCatalogAuthoring'

const importer = fs.readFileSync(
  path.resolve(process.cwd(), 'scripts', 'import-wingsside-tour-editorial-production.ts'),
  'utf8',
)

describe('WingSide tour editorial production importer release guard ordering', () => {
  it('requires and hashes an immutable catalog v2 artifact before use', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'wingsside-catalog-cli-'))
    const catalogPath = path.join(directory, 'reviewed-catalog-v2.json')
    const catalog: WingsSideTourEditorialCatalog = {
      approvalManifest: {
        ...wingsSideCatalogDevelopmentTeamApprovalPolicy,
        approvalArtifactID: 'unit-review',
        approvedAt: '2026-07-28T00:00:00.000Z',
        approvedBy: 'unit-reviewer',
        checksum: '',
        expectedPricingDisclosureCount: 0,
        trustedApprovers: ['unit-reviewer'],
        version: 1,
      },
      pricingDispositions: [],
      sourceLocale: 'en',
      targetLocales: ['vi', 'it', 'es', 'pt'],
      tours: [],
      version: 2,
    }
    catalog.approvalManifest.checksum = editorialPricingApprovalChecksum(catalog)
    const bytes = Buffer.from(`${JSON.stringify(catalog)}\n`, 'utf8')
    const checksum = createHash('sha256').update(bytes).digest('hex')
    try {
      await expect(
        preflightWingsSideEditorialCatalogArtifact({
          cwd: directory,
          expectedSha256: checksum,
          protectedSha256: checksum,
        }),
      ).rejects.toThrow('require --catalog')
      await expect(
        preflightWingsSideEditorialCatalogArtifact({
          catalogPath: 'missing.json',
          cwd: directory,
          expectedSha256: checksum,
          protectedSha256: checksum,
        }),
      ).rejects.toThrow('missing or unreadable')
      await writeFile(catalogPath, bytes)
      await expect(
        preflightWingsSideEditorialCatalogArtifact({
          catalogPath,
          expectedPricingDisclosureCount: 0,
          expectedSha256: checksum.toUpperCase(),
          protectedSha256: checksum,
        }),
      ).rejects.toThrow('conflicts with the protected release value')
      await expect(
        preflightWingsSideEditorialCatalogArtifact({
          catalogPath,
          expectedPricingDisclosureCount: 0,
          protectedSha256: checksum.toUpperCase(),
        }),
      ).rejects.toThrow('protected lowercase SHA-256')
      await expect(
        preflightWingsSideEditorialCatalogArtifact({
          catalogPath,
          expectedPricingDisclosureCount: 0,
          expectedSha256: '0'.repeat(64),
          protectedSha256: checksum,
        }),
      ).rejects.toThrow('conflicts with the protected release value')
      await expect(
        preflightWingsSideEditorialCatalogArtifact({
          catalogPath,
          expectedPricingDisclosureCount: 0,
          expectedSha256: '0'.repeat(64),
          protectedSha256: '0'.repeat(64),
        }),
      ).rejects.toThrow('does not match the trusted release value')
      const artifact = await preflightWingsSideEditorialCatalogArtifact({
        catalogPath: 'reviewed-catalog-v2.json',
        cwd: directory,
        expectedPricingDisclosureCount: 0,
        expectedSha256: checksum,
        protectedSha256: checksum,
      })
      expect(artifact).toMatchObject({
        catalogPath: path.resolve(catalogPath),
        catalogSha256: checksum,
      })
      expect(artifact.catalog.version).toBe(2)
      expect(Object.isFrozen(artifact.catalog)).toBe(true)
      await writeFile(catalogPath, '{"version":1}\n', 'utf8')
      expect(artifact.catalog.version).toBe(2)
      expect(artifact.catalog.approvalManifest.approvalArtifactID).toBe('unit-review')
      expect(() =>
        assertWingsSideEditorialCatalogArtifactBinding({
          catalogSha256: artifact.catalogSha256,
          protectedSha256: '0'.repeat(64),
        }),
      ).toThrow('no longer matches protected release configuration')
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
    expect(importer).toContain('const catalog = catalogArtifact.catalog')
    expect(importer).not.toContain('loadWingsSideTourEditorialCatalog({')
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
