import {
  createHash,
  generateKeyPairSync,
  sign as signDigest,
  type KeyObject,
} from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { mkdtemp, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  assertWingsSideTourMediaEvidenceReleaseGate,
  parseWingsSideTourMediaEvidenceCliArguments,
  produceWingsSideTourMediaEvidence,
  wingsSideTourMediaEvidenceSigningDigest,
  wingsSideTourMediaPolicyPathEnv,
  wingsSideTourMediaPolicyShaEnv,
  wingsSideTourMediaSourceInventoryChecksum,
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

const signerIDs = [
  'release-root-01',
  'reviewer-01',
  'rights-reviewer-01',
  'ocr-attester-01',
] as const
let privateKeys = new Map<string, KeyObject>()

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
    valueBase64: signDigest(
      null,
      Buffer.from(wingsSideTourMediaEvidenceSigningDigest(artifactType, payload), 'utf8'),
      privateKeys.get(signerID)!,
    ).toString('base64'),
  },
})

let root = ''
let assetSha = ''
let reviewSha = ''
let rightsSha = ''
let ocrSha = ''
let sourceSha = ''
let releaseSha = ''
let releaseBinding: WingsSideTourMediaReleaseBinding
let releaseEnvelope: WingsSideTourMediaReleaseEnvelope
let trusted: WingsSideTourMediaReleaseBinding & {
  envelopeSha256: string
  manifestSha256: string
}
let publicKeys: Record<string, string> = {}
let priorPolicyPath: string | undefined
let priorPolicySha: string | undefined

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
    manifestSha256: wingsSideTourMediaManifestChecksum(canonical),
  }
  const policy = {
    publicKeys,
    release: trusted,
    schemaVersion: 1,
    signerACL: {
      'manual-review': ['reviewer-01'],
      'ocr-attestation': ['ocr-attester-01'],
      'release-envelope': ['release-root-01'],
      'rights-approval': ['rights-reviewer-01'],
    },
  }
  const policyBytes = Buffer.from(JSON.stringify(policy))
  const policyPath = path.join(root, 'release-policy.json')
  writeFileSync(policyPath, policyBytes)
  process.env[wingsSideTourMediaPolicyPathEnv] = policyPath
  process.env[wingsSideTourMediaPolicyShaEnv] = sha256(policyBytes)
}

const produce = (
  overrides: Partial<Parameters<typeof produceWingsSideTourMediaEvidence>[0]> = {},
) =>
  produceWingsSideTourMediaEvidence({
    approvedRoot: root,
    manifest: manifest(),
    releaseBinding,
    releaseEnvelope,
    tours: tours(),
    ...overrides,
  })

beforeEach(async () => {
  priorPolicyPath = process.env[wingsSideTourMediaPolicyPathEnv]
  priorPolicySha = process.env[wingsSideTourMediaPolicyShaEnv]
  privateKeys = new Map()
  publicKeys = {}
  for (const signerID of signerIDs) {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519')
    privateKeys.set(signerID, privateKey)
    publicKeys[signerID] = publicKey.export({ format: 'der', type: 'spki' }).toString('base64')
  }
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
  if (priorPolicyPath === undefined) {
    delete process.env[wingsSideTourMediaPolicyPathEnv]
  } else {
    process.env[wingsSideTourMediaPolicyPathEnv] = priorPolicyPath
  }
  if (priorPolicySha === undefined) {
    delete process.env[wingsSideTourMediaPolicyShaEnv]
  } else {
    process.env[wingsSideTourMediaPolicyShaEnv] = priorPolicySha
  }
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
      assertWingsSideTourMediaEvidenceReleaseGate(first),
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
    const obsoleteVerifierInjection = {
      frameExtractionVerifier: { verify: async () => true },
      signatureVerifier: { verify: async () => true },
      tours: tours(media()),
    } as unknown as Partial<Parameters<typeof produceWingsSideTourMediaEvidence>[0]>
    await expect(produce(obsoleteVerifierInjection)).rejects.toThrow(
      'producer input schema contains missing or unknown fields',
    )
  })

  it('rejects a fabricated structural clone even when the envelope hash is known', async () => {
    const authenticated = await produce()
    const fabricated = structuredClone(
      authenticated,
    ) as unknown as Parameters<typeof assertWingsSideTourMediaEvidenceReleaseGate>[0]
    expect(() =>
      assertWingsSideTourMediaEvidenceReleaseGate(fabricated),
    ).toThrow('not created by the authenticated producer')
  })

  it('rechecks the protected release policy at the release gate', async () => {
    const authenticated = await produce()
    process.env[wingsSideTourMediaPolicyShaEnv] = 'f'.repeat(64)
    expect(() =>
      assertWingsSideTourMediaEvidenceReleaseGate(authenticated),
    ).toThrow('release-policy checksum mismatch')
  })

  it('rejects direct trusted-policy injection and exposes no envelope authority argument', async () => {
    expect(assertWingsSideTourMediaEvidenceReleaseGate.length).toBe(1)
    await expect(
      produce({
        trusted: {
          ...trusted,
          envelopeSha256: 'f'.repeat(64),
        },
      } as unknown as Partial<Parameters<typeof produceWingsSideTourMediaEvidence>[0]>),
    ).rejects.toThrow('producer input schema contains missing or unknown fields')
  })

  it('rejects one key assigned to every signer purpose', async () => {
    const policyPath = process.env[wingsSideTourMediaPolicyPathEnv]!
    const policy = JSON.parse(
      await (await import('node:fs/promises')).readFile(policyPath, 'utf8'),
    ) as {
      signerACL: Record<string, string[]>
    }
    for (const purpose of Object.keys(policy.signerACL)) {
      policy.signerACL[purpose] = ['release-root-01']
    }
    const bytes = Buffer.from(JSON.stringify(policy))
    await writeFile(policyPath, bytes)
    process.env[wingsSideTourMediaPolicyShaEnv] = sha256(bytes)
    await expect(produce()).rejects.toThrow('distinct authorized role keys')
  })

  it('deep-freezes authenticated output and prevents accessor or post-gate mutation', async () => {
    const authenticated = await produce()
    expect(Object.isFrozen(authenticated)).toBe(true)
    expect(Object.isFrozen(authenticated.bundle)).toBe(true)
    expect(Object.isFrozen(authenticated.bundle.releaseEnvelope)).toBe(true)
    expect(Object.isFrozen(authenticated.report)).toBe(true)
    expect(() =>
      Object.defineProperty(authenticated, 'report', {
        get: () => authenticated.report,
      }),
    ).toThrow()
    expect(() => {
      authenticated.report.releaseEvidenceBinding!.siteCode = 'mutated-after-authentication'
    }).toThrow()
    expect(() => assertWingsSideTourMediaEvidenceReleaseGate(authenticated)).not.toThrow()
    expect(() => {
      authenticated.bundle.releaseBinding.siteCode = 'mutated-after-gate'
    }).toThrow()
  })

  it('rejects source snapshot and release descriptor byte substitution', async () => {
    await writeFile(path.join(root, 'source-snapshot.json'), 'tampered')
    await expect(produce()).rejects.toThrow('source snapshot actual byte checksum mismatch')

    await writeFile(path.join(root, 'source-snapshot.json'), '{"snapshot":"canonical-22"}')
    await writeFile(path.join(root, 'release.json'), '{"releaseCommitSha":"bad","siteCode":"wing-side"}')
    await expect(produce()).rejects.toThrow('release artifact actual byte checksum mismatch')
  })

  it('accepts cryptographically signed frame-extraction proof bound to local video bytes', async () => {
    const videoBytes = Buffer.from('trusted-video')
    const frameBytes = Buffer.from('trusted-middle-frame')
    await writeFile(path.join(root, 'video.mp4'), videoBytes)
    await writeFile(path.join(root, 'frame.jpg'), frameBytes)
    assetSha = sha256(videoBytes)
    const frameSha = sha256(frameBytes)
    reviewSha = await writeJson(
      'review.json',
      signed(
        'manual-review',
        {
          assetSha256: assetSha,
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
          assetSha256: assetSha,
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
    ocrSha = await writeJson(
      'ocr.json',
      signed(
        'ocr-attestation',
        {
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
        } satisfies OcrAttestation,
        'ocr-attester-01',
      ),
    )
    const video = media({
      kind: 'video',
      relativePath: 'video.mp4',
      videoFrames: [{ label: 'middle', position: 'middle', relativePath: 'frame.jpg' }],
    })
    const inventory = tours(video)
    rebuildEnvelope(inventory)
    const result = await produce({ tours: inventory })
    expect(() =>
      assertWingsSideTourMediaEvidenceReleaseGate(result),
    ).not.toThrow()
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

  it('rejects protected-policy substitution at the combined gate', async () => {
    const result = await produce()
    process.env[wingsSideTourMediaPolicyShaEnv] = 'f'.repeat(64)
    expect(() => assertWingsSideTourMediaEvidenceReleaseGate(result)).toThrow(
      /release-policy checksum mismatch/,
    )
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

  it('requires the protected release-policy path and byte checksum', async () => {
    delete process.env[wingsSideTourMediaPolicyPathEnv]
    await expect(produce()).rejects.toThrow(wingsSideTourMediaPolicyPathEnv)
    rebuildEnvelope()
    process.env[wingsSideTourMediaPolicyShaEnv] = 'f'.repeat(64)
    await expect(produce()).rejects.toThrow('release-policy checksum mismatch')
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
        '--envelope-sha256=' + 'a'.repeat(64),
      ]),
    ).toThrow('Unknown or malformed CLI flag')
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
