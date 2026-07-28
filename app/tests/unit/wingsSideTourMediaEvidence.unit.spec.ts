import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  produceWingsSideTourMediaEvidence,
  resolveProtectedWingsSideManifestSha,
  wingsSideTourMediaManifestShaEnv,
  type LocalMediaEvidenceSource,
  type LocalTourMediaEvidenceSource,
  type OcrEvidenceAdapter,
  type WingsSideTourMediaReleaseBinding,
} from '../../scripts/lib/wingsSideTourMediaEvidence'
import {
  wingsSideTourMediaManifestChecksum,
  type WingsSideTourMediaManifest,
} from '../../scripts/lib/wingsSideTourMediaAudit'

const hash = (character: string) => character.repeat(64)
const timestamp = '2026-07-28T04:00:00.000Z'
let root = ''
let assetBytes = Buffer.from('trusted-local-asset')

const manifest = (): WingsSideTourMediaManifest => ({
  schemaVersion: 1,
  tours: Array.from({ length: 22 }, (_, index) => ({
    tourID: index + 1,
    tourSlug: `tour-${index + 1}`,
  })),
})

const releaseBinding: WingsSideTourMediaReleaseBinding = {
  releaseCommitSha: 'a'.repeat(40),
  siteCode: 'wing-side',
  source: { kind: 'database-snapshot', sha256: hash('b') },
}

const media = (overrides: Partial<LocalMediaEvidenceSource> = {}): LocalMediaEvidenceSource => ({
  dimensions: { height: 900, width: 1600 },
  id: 'shared-media',
  kind: 'image',
  manualReview: {
    artifactRelativePath: 'review.json',
    reviewedAt: timestamp,
    reviewerID: 'reviewer-01',
    state: 'passed',
  },
  provenance: {
    approvedAt: timestamp,
    approvedBy: 'rights-reviewer-01',
    licenseReference: 'rights-ledger:asset-01',
    licenseType: 'owned',
    owner: 'WingsGroup',
    publicUseApproved: true,
    sourceReference: 'asset-library:asset-01',
  },
  relativePath: 'asset.jpg',
  ...overrides,
})

const tours = (asset = media()): LocalTourMediaEvidenceSource[] =>
  manifest().tours.map(({ tourID, tourSlug }) => ({ heroMedia: asset, tourID, tourSlug }))

const adapter = (): OcrEvidenceAdapter => ({
  scan: async ({ asset, frames, kind }) => ({
    engine: 'fixture-ocr',
    engineVersion: '1.0.0',
    frameHashes: kind === 'image' ? [asset.sha256] : frames.map(({ sha256 }) => sha256),
    runAt: timestamp,
    state: 'pass',
    text: 'mountains',
  }),
})

const produce = (
  overrides: Partial<Parameters<typeof produceWingsSideTourMediaEvidence>[0]> = {},
) => {
  const canonical = manifest()
  return produceWingsSideTourMediaEvidence({
    approvedRoot: root,
    manifest: canonical,
    ocrAdapter: adapter(),
    releaseBinding,
    tours: tours(),
    trusted: { ...releaseBinding, manifestSha256: wingsSideTourMediaManifestChecksum(canonical) },
    ...overrides,
  })
}

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'wingsside-media-evidence-'))
  assetBytes = Buffer.from('trusted-local-asset')
  await writeFile(path.join(root, 'asset.jpg'), assetBytes)
  await writeFile(path.join(root, 'review.json'), '{"review":"passed"}')
})

afterEach(async () => {
  await rm(root, { force: true, recursive: true })
})

describe('WingSide trusted local media evidence producer', () => {
  it('hashes actual bytes and produces deterministic gate-ready evidence', async () => {
    const first = await produce()
    const second = await produce({ tours: [...tours()].reverse() })
    expect(first).toEqual(second)
    expect(first.bundle.evidenceContract).toBe('local-byte-evidence-producer')
    expect(first.report.releaseGate).toEqual({ blockingFindingCount: 0, passed: true })
    expect(first.bundle.tours[0]?.heroMedia?.checksum).toMatch(/^[a-f0-9]{64}$/)
    expect(first.bundle.tours[0]?.heroMedia?.provenance?.licenseReference).toBe(
      'rights-ledger:asset-01',
    )
  })

  it.each(['../outside.jpg', path.resolve('C:\\outside.jpg')])(
    'rejects path escape: %s',
    async (relativePath) => {
      await expect(produce({ tours: tours(media({ relativePath })) })).rejects.toThrow(
        /relative to approved root|escapes approved root/,
      )
    },
  )

  it('rejects a symlink or junction that resolves outside approved root', async () => {
    const outside = await mkdtemp(path.join(tmpdir(), 'wingsside-media-outside-'))
    await writeFile(path.join(outside, 'outside.jpg'), 'outside')
    await mkdir(path.join(root, 'nested'))
    await symlink(outside, path.join(root, 'nested', 'escape'), 'junction')
    await expect(
      produce({ tours: tours(media({ relativePath: 'nested/escape/outside.jpg' })) }),
    ).rejects.toThrow('symlink escapes approved root')
    await rm(outside, { force: true, recursive: true })
  })

  it('detects byte tampering against an OCR attestation', async () => {
    const original = await produce()
    const attestedHash = original.bundle.tours[0]!.heroMedia!.checksum!
    const fixedAdapter: OcrEvidenceAdapter = {
      scan: async () => ({
        engine: 'fixture-ocr',
        engineVersion: '1.0.0',
        frameHashes: [attestedHash],
        runAt: timestamp,
        state: 'pass',
      }),
    }
    await writeFile(path.join(root, 'asset.jpg'), 'tampered')
    await expect(produce({ ocrAdapter: fixedAdapter })).rejects.toThrow(
      'not bound to local frame bytes',
    )
  })

  it('rejects manifest substitution and duplicates while normalizing reordering', async () => {
    const canonical = manifest()
    const reordered = { ...canonical, tours: [...canonical.tours].reverse() }
    expect(
      await produce({
        manifest: reordered,
        trusted: {
          ...releaseBinding,
          manifestSha256: wingsSideTourMediaManifestChecksum(canonical),
        },
      }),
    ).toEqual(await produce())

    const substituted = manifest()
    substituted.tours[0] = { tourID: 1, tourSlug: 'substituted' }
    await expect(produce({ manifest: substituted })).rejects.toThrow('manifest substitution')

    const duplicate = manifest()
    duplicate.tours[1] = { ...duplicate.tours[1]!, tourID: 1 }
    await expect(produce({ manifest: duplicate })).rejects.toThrow('unique 22-tour')
  })

  it('rejects a release, site, or source snapshot mismatch', async () => {
    await expect(
      produce({
        releaseBinding: { ...releaseBinding, releaseCommitSha: 'd'.repeat(40) },
      }),
    ).rejects.toThrow('trusted release binding mismatch')
  })

  it.each([
    ['provenance', { provenance: { ...media().provenance, owner: '' } }],
    ['license', { provenance: { ...media().provenance, licenseReference: '' } }],
    [
      'reviewer',
      { manualReview: { ...media().manualReview, reviewerID: '' } },
    ],
  ])('rejects missing %s evidence', async (_label, override) => {
    await expect(produce({ tours: tours(media(override)) })).rejects.toThrow(/missing/)
  })

  it('rejects missing OCR engine/version/frame evidence', async () => {
    await expect(
      produce({
        ocrAdapter: {
          scan: async () => ({
            engine: '',
            engineVersion: '',
            frameHashes: [],
            runAt: timestamp,
            state: 'unscanned',
          }),
        },
      }),
    ).rejects.toThrow(/OCR engine/)
  })

  it('requires protected manifest SHA and rejects argument conflicts', () => {
    expect(() => resolveProtectedWingsSideManifestSha({})).toThrow(
      wingsSideTourMediaManifestShaEnv,
    )
    expect(() =>
      resolveProtectedWingsSideManifestSha(
        { [wingsSideTourMediaManifestShaEnv]: hash('a') },
        hash('b'),
      ),
    ).toThrow('protected manifest checksum conflict')
    expect(
      resolveProtectedWingsSideManifestSha(
        { [wingsSideTourMediaManifestShaEnv]: hash('a') },
        hash('a'),
      ),
    ).toBe(hash('a'))
  })
})
