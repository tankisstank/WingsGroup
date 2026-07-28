import { createHash } from 'node:crypto'
import { mkdtemp, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  assertWingsSideTourMediaEvidenceReleaseGate,
  parseWingsSideTourMediaEvidenceCliArguments,
  produceWingsSideTourMediaEvidence,
  resolveProtectedWingsSideEnvelopeSha,
  resolveProtectedWingsSideManifestSha,
  wingsSideTourMediaEnvelopeShaEnv,
  wingsSideTourMediaEvidenceSigningDigest,
  wingsSideTourMediaManifestShaEnv,
  wingsSideTourMediaSourceInventoryChecksum,
  type EvidenceSignatureVerifier,
  type LocalMediaEvidenceSource,
  type LocalTourMediaEvidenceSource,
  type ManualReviewArtifactPayload,
  type OcrAttestation,
  type RightsApprovalArtifactPayload,
  type SignedEvidenceArtifact,
  type WingsSideTourMediaReleaseBinding,
  type WingsSideTourMediaReleaseEnvelope,
} from '../../scripts/lib/wingsSideTourMediaEvidence'
import {
  wingsSideTourMediaAuditChecksum,
  wingsSideTourMediaManifestChecksum,
  type WingsSideTourMediaManifest,
} from '../../scripts/lib/wingsSideTourMediaAudit'

const timestamp = '2026-07-28T04:00:00.000Z'
const sha256 = (value: Buffer | string): string =>
  createHash('sha256').update(value).digest('hex')
const manifest = (): WingsSideTourMediaManifest => ({
  schemaVersion: 1,
  tours: Array.from({ length: 22 }, (_, index) => ({
    tourID: index + 1,
    tourSlug: `tour-${index + 1}`,
  })),
})

const signed = <
  Kind extends 'manual-review' | 'ocr-attestation' | 'release-envelope' | 'rights-approval',
  Payload,
>(
  artifactType: Kind,
  payload: Payload,
  signerID: string,
): SignedEvidenceArtifact<Kind, Payload> => ({
  artifactType,
  payload,
  schemaVersion: 1,
  signature: {
    algorithm: 'ed25519',
    signerID,
    valueBase64: Buffer.from(
      `${signerID}:${wingsSideTourMediaEvidenceSigningDigest(artifactType, payload)}`,
    ).toString('base64'),
  },
})

const verifier: EvidenceSignatureVerifier = {
  verify: async ({ digest, signature }) =>
    Buffer.from(signature.valueBase64, 'base64').toString('utf8') ===
    `${signature.signerID}:${digest}`,
}

let root = ''
let assetSha = ''
let reviewSha = ''
let rightsSha = ''
let ocrSha = ''
let sourceSha = ''
let releaseSha = ''
let releaseBinding: WingsSideTourMediaReleaseBinding
let releaseEnvelope: WingsSideTourMediaReleaseEnvelope
let trusted: Parameters<typeof produceWingsSideTourMediaEvidence>[0]['trusted']

const writeJson = async (relativePath: string, value: unknown): Promise<string> => {
  const bytes = Buffer.from(JSON.stringify(value))
  await writeFile(path.join(root, relativePath), bytes)
  return sha256(bytes)
}

const media = (overrides: Partial<LocalMediaEvidenceSource> = {}): LocalMediaEvidenceSource => ({
  dimensions: { height: 900, width: 1600 },
  id: 'shared-media',
  kind: 'image',
  manualReview: {
    artifactRelativePath: 'review.json',
    artifactSha256: reviewSha,
    reviewedAt: timestamp,
    reviewerID: 'reviewer-01',
    state: 'passed',
  },
  ocrArtifactRelativePath: 'ocr.json',
  ocrArtifactSha256: ocrSha,
  provenance: {
    approvedAt: timestamp,
    approvedBy: 'rights-reviewer-01',
    artifactRelativePath: 'rights.json',
    artifactSha256: rightsSha,
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

const rebuildEnvelope = (inventory: LocalTourMediaEvidenceSource[] = tours()): void => {
  const canonical = manifest()
  releaseEnvelope = signed(
    'release-envelope',
    {
      manifestSha256: wingsSideTourMediaManifestChecksum(canonical),
      mediaPolicies: [
        {
          assetSha256: assetSha,
          manualReviewArtifactSha256: reviewSha,
          mediaID: 'shared-media',
          ocrArtifactSha256: ocrSha,
          ocrAttesterID: 'ocr-attester-01',
          ocrEngine: 'trusted-ocr',
          ocrEngineVersion: '2.0.0',
          reviewerID: 'reviewer-01',
          rightsApproverID: 'rights-reviewer-01',
          rightsArtifactSha256: rightsSha,
        },
      ],
      releaseArtifact: { relativePath: 'release.json', sha256: releaseSha },
      releaseBinding,
      sourceArtifact: { relativePath: 'source-snapshot.json', sha256: sourceSha },
      tourInventorySha256: wingsSideTourMediaSourceInventoryChecksum(inventory),
    },
    'release-root-01',
  )
  trusted = {
    ...releaseBinding,
    envelopeSha256: wingsSideTourMediaAuditChecksum(releaseEnvelope),
    envelopeSignerID: 'release-root-01',
    manifestSha256: wingsSideTourMediaManifestChecksum(canonical),
  }
}

const produce = (
  overrides: Partial<Parameters<typeof produceWingsSideTourMediaEvidence>[0]> = {},
) =>
  produceWingsSideTourMediaEvidence({
    approvedRoot: root,
    frameExtractionVerifier: { verify: async () => true },
    manifest: manifest(),
    releaseBinding,
    releaseEnvelope,
    signatureVerifier: verifier,
    tours: tours(),
    trusted,
    ...overrides,
  })

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'wingsside-media-evidence-'))
  const assetBytes = Buffer.from('trusted-local-asset')
  await writeFile(path.join(root, 'asset.jpg'), assetBytes)
  assetSha = sha256(assetBytes)

  const sourceBytes = Buffer.from('{"snapshot":"canonical-22"}')
  await writeFile(path.join(root, 'source-snapshot.json'), sourceBytes)
  sourceSha = sha256(sourceBytes)
  releaseBinding = {
    releaseCommitSha: 'a'.repeat(40),
    siteCode: 'wing-side',
    source: { kind: 'database-snapshot', sha256: sourceSha },
  }
  releaseSha = await writeJson('release.json', {
    releaseCommitSha: releaseBinding.releaseCommitSha,
    siteCode: releaseBinding.siteCode,
  })

  const reviewPayload: ManualReviewArtifactPayload = {
    assetSha256: assetSha,
    mediaID: 'shared-media',
    reviewedAt: timestamp,
    reviewerID: 'reviewer-01',
    state: 'passed',
  }
  reviewSha = await writeJson(
    'review.json',
    signed('manual-review', reviewPayload, 'reviewer-01'),
  )
  const rightsPayload: RightsApprovalArtifactPayload = {
    approvedAt: timestamp,
    approvedBy: 'rights-reviewer-01',
    assetSha256: assetSha,
    licenseReference: 'rights-ledger:asset-01',
    licenseType: 'owned',
    mediaID: 'shared-media',
    owner: 'WingsGroup',
    publicUseApproved: true,
    sourceReference: 'asset-library:asset-01',
  }
  rightsSha = await writeJson(
    'rights.json',
    signed('rights-approval', rightsPayload, 'rights-reviewer-01'),
  )
  const ocrPayload: OcrAttestation = {
    assetSha256: assetSha,
    attesterID: 'ocr-attester-01',
    engine: 'trusted-ocr',
    engineVersion: '2.0.0',
    frameExtractions: [],
    frameHashes: [assetSha],
    kind: 'image',
    mediaID: 'shared-media',
    runAt: timestamp,
    state: 'pass',
    text: 'mountains',
  }
  ocrSha = await writeJson(
    'ocr.json',
    signed('ocr-attestation', ocrPayload, 'ocr-attester-01'),
  )
  rebuildEnvelope()
})

afterEach(async () => {
  await rm(root, { force: true, recursive: true })
})

describe('WingSide authenticated local media evidence producer', () => {
  it('binds signed artifacts and actual source/release bytes into one release gate', async () => {
    const first = await produce()
    const second = await produce({ tours: [...tours()].reverse() })
    expect(first).toEqual(second)
    expect(first.report.releaseGate).toEqual({ blockingFindingCount: 0, passed: true })
    expect(first.report.releaseEvidenceBinding?.bundleAggregateChecksum).toBe(
      first.bundle.aggregateChecksum,
    )
    expect(() =>
      assertWingsSideTourMediaEvidenceReleaseGate(first, trusted.envelopeSha256),
    ).not.toThrow()
  })

  it('rejects the former presence-only review JSON', async () => {
    reviewSha = await writeJson('review.json', { review: 'passed' })
    rebuildEnvelope()
    await expect(produce({ tours: tours(media()) })).rejects.toThrow(/manual-review artifact/)
  })

  it('rejects a forged artifact signature even when its digest is protected', async () => {
    const artifact = JSON.parse(
      await (await import('node:fs/promises')).readFile(path.join(root, 'review.json'), 'utf8'),
    ) as SignedEvidenceArtifact<'manual-review', ManualReviewArtifactPayload>
    artifact.signature.valueBase64 = Buffer.from('forged-signature-value').toString('base64')
    reviewSha = await writeJson('review.json', artifact)
    rebuildEnvelope()
    await expect(produce({ tours: tours(media()) })).rejects.toThrow('signature verification failed')
  })

  it('rejects source snapshot and release descriptor byte substitution', async () => {
    await writeFile(path.join(root, 'source-snapshot.json'), 'tampered')
    await expect(produce()).rejects.toThrow('source snapshot actual byte checksum mismatch')

    await writeFile(path.join(root, 'source-snapshot.json'), '{"snapshot":"canonical-22"}')
    await writeFile(path.join(root, 'release.json'), '{"releaseCommitSha":"bad","siteCode":"wing-side"}')
    await expect(produce()).rejects.toThrow('release artifact actual byte checksum mismatch')
  })

  it('rejects video attestation replay when old frames are paired with substituted video bytes', async () => {
    const videoBytes = Buffer.from('replacement-video')
    await writeFile(path.join(root, 'video.mp4'), videoBytes)
    const videoSha = sha256(videoBytes)
    await writeFile(path.join(root, 'frame.jpg'), 'old-frame')
    const frameSha = sha256('old-frame')
    const replayed: OcrAttestation = {
      assetSha256: assetSha,
      attesterID: 'ocr-attester-01',
      engine: 'trusted-ocr',
      engineVersion: '2.0.0',
      frameExtractions: [
        {
          frameSha256: frameSha,
          label: 'middle',
          position: 'middle',
          sourceAssetSha256: assetSha,
        },
      ],
      frameHashes: [frameSha],
      kind: 'video',
      mediaID: 'shared-media',
      runAt: timestamp,
      state: 'pass',
    }
    ocrSha = await writeJson(
      'ocr.json',
      signed('ocr-attestation', replayed, 'ocr-attester-01'),
    )
    assetSha = videoSha
    reviewSha = await writeJson(
      'review.json',
      signed(
        'manual-review',
        {
          assetSha256: videoSha,
          mediaID: 'shared-media',
          reviewedAt: timestamp,
          reviewerID: 'reviewer-01',
          state: 'passed',
        } satisfies ManualReviewArtifactPayload,
        'reviewer-01',
      ),
    )
    rightsSha = await writeJson(
      'rights.json',
      signed(
        'rights-approval',
        {
          approvedAt: timestamp,
          approvedBy: 'rights-reviewer-01',
          assetSha256: videoSha,
          licenseReference: 'rights-ledger:asset-01',
          licenseType: 'owned',
          mediaID: 'shared-media',
          owner: 'WingsGroup',
          publicUseApproved: true,
          sourceReference: 'asset-library:asset-01',
        } satisfies RightsApprovalArtifactPayload,
        'rights-reviewer-01',
      ),
    )
    const video = media({
      kind: 'video',
      ocrArtifactSha256: ocrSha,
      relativePath: 'video.mp4',
      videoFrames: [{ label: 'middle', position: 'middle', relativePath: 'frame.jpg' }],
    })
    rebuildEnvelope(tours(video))
    await expect(produce({ tours: tours(video) })).rejects.toThrow('asset binding mismatch')
  })

  it('rejects a path swap after initial realpath instead of reading through it', async () => {
    let swapped = false
    await expect(
      produce({
        readHooks: {
          afterInitialRealpath: async (lexicalPath) => {
            if (!swapped && lexicalPath.endsWith(`${path.sep}asset.jpg`)) {
              swapped = true
              await unlink(lexicalPath)
              await writeFile(lexicalPath, 'replacement-file')
            }
          },
        },
      }),
    ).rejects.toThrow(/path changed|identity changed/)
  })

  it('rejects report replay or envelope substitution at the combined gate', async () => {
    const result = await produce()
    expect(() =>
      assertWingsSideTourMediaEvidenceReleaseGate(result, 'f'.repeat(64)),
    ).toThrow(/bundle or protected envelope/)
    result.report.releaseEvidenceBinding!.siteCode = 'other-site'
    expect(() =>
      assertWingsSideTourMediaEvidenceReleaseGate(result, trusted.envelopeSha256),
    ).toThrow(/combined release binding|integrity checksum/)
  })

  it('rejects a reordered media-to-tour field mapping not covered by the signed inventory', async () => {
    const substituted = tours()
    substituted[0] = {
      gallery: [media()],
      tourID: substituted[0]!.tourID,
      tourSlug: substituted[0]!.tourSlug,
    }
    await expect(produce({ tours: substituted })).rejects.toThrow(
      'protected tour inventory binding mismatch',
    )
  })

  it('requires protected manifest/envelope SHA and rejects explicit conflicts', () => {
    expect(() => resolveProtectedWingsSideManifestSha({})).toThrow(
      wingsSideTourMediaManifestShaEnv,
    )
    expect(() => resolveProtectedWingsSideEnvelopeSha({})).toThrow(
      wingsSideTourMediaEnvelopeShaEnv,
    )
    expect(() =>
      resolveProtectedWingsSideEnvelopeSha(
        { [wingsSideTourMediaEnvelopeShaEnv]: 'a'.repeat(64) },
        'b'.repeat(64),
      ),
    ).toThrow('protected release envelope checksum conflict')
  })

  it('rejects duplicate, unknown, malformed, and absolute CLI inputs', () => {
    expect(() =>
      parseWingsSideTourMediaEvidenceCliArguments([
        'source.json',
        '--approved-root=one',
        '--approved-root=two',
      ]),
    ).toThrow('Duplicate CLI flag')
    expect(() =>
      parseWingsSideTourMediaEvidenceCliArguments([
        'source.json',
        '--approved-root=one',
        '--unknown=value',
      ]),
    ).toThrow('Unknown or malformed CLI flag')
    expect(() =>
      parseWingsSideTourMediaEvidenceCliArguments(['source.json', '--approved-root']),
    ).toThrow('Unknown or malformed CLI flag')
    expect(() =>
      parseWingsSideTourMediaEvidenceCliArguments([
        path.resolve(root, 'source.json'),
        `--approved-root=${root}`,
      ]),
    ).toThrow('relative to approved root')
  })
})
