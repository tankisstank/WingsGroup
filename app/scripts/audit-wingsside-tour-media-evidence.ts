/**
 * Authenticated local media-evidence producer.
 *
 * Every input and governed artifact is read beneath --approved-root. Release
 * success requires a protected signed envelope, actual source/release bytes,
 * signed review/rights/OCR artifacts, and a protected verifier key set.
 */
import { createPublicKey, verify } from 'node:crypto'
import { open, realpath, stat } from 'node:fs/promises'
import path from 'node:path'

import {
  assertWingsSideTourMediaEvidenceReleaseGate,
  parseWingsSideTourMediaEvidenceCliArguments,
  produceWingsSideTourMediaEvidence,
  resolveProtectedWingsSideEnvelopeSha,
  resolveProtectedWingsSideManifestSha,
  type EvidenceSignatureVerifier,
  type LocalTourMediaEvidenceSource,
  type WingsSideTourMediaReleaseBinding,
  type WingsSideTourMediaReleaseEnvelope,
  type WingsSideTourMediaTrustedExpectation,
} from './lib/wingsSideTourMediaEvidence'
import type { WingsSideTourMediaManifest } from './lib/wingsSideTourMediaAudit'

const {
  approvedRoot,
  inputRelativePath,
  releaseGate,
  requestedEnvelopeSha,
  requestedManifestSha,
} = parseWingsSideTourMediaEvidenceCliArguments(process.argv.slice(2))

const requiredEnvironment = (name: string): string => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Protected environment ${name} is required`)
  return value
}

const root = await realpath(path.resolve(approvedRoot))
if (!(await stat(root)).isDirectory()) {
  throw new Error('Approved root must be a directory')
}
const sourceLexicalPath = path.resolve(root, inputRelativePath)
const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`
const withinRoot = (candidate: string): boolean =>
  process.platform === 'win32'
    ? candidate.toLowerCase().startsWith(rootPrefix.toLowerCase())
    : candidate.startsWith(rootPrefix)
if (!withinRoot(sourceLexicalPath)) throw new Error('Evidence source JSON escapes approved root')
const sourceRealpath = await realpath(sourceLexicalPath)
if (!withinRoot(sourceRealpath)) throw new Error('Evidence source JSON symlink escapes approved root')
const initialSourceStat = await stat(sourceRealpath, { bigint: true })
if (!initialSourceStat.isFile()) throw new Error('Evidence source JSON must be a regular file')
const sourceHandle = await open(sourceRealpath, 'r')
let sourceBytes: Buffer
try {
  const before = await sourceHandle.stat({ bigint: true })
  if (
    !before.isFile() ||
    before.dev !== initialSourceStat.dev ||
    before.ino !== initialSourceStat.ino
  ) {
    throw new Error('Evidence source JSON identity changed before verified read')
  }
  sourceBytes = await sourceHandle.readFile()
  const after = await sourceHandle.stat({ bigint: true })
  if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size) {
    throw new Error('Evidence source JSON changed while being read')
  }
  const finalSourceRealpath = await realpath(sourceLexicalPath)
  if (!withinRoot(finalSourceRealpath) || finalSourceRealpath !== sourceRealpath) {
    throw new Error('Evidence source JSON path changed while being read')
  }
  const finalSourceHandle = await open(finalSourceRealpath, 'r')
  try {
    const finalSourceStat = await finalSourceHandle.stat({ bigint: true })
    if (before.dev !== finalSourceStat.dev || before.ino !== finalSourceStat.ino) {
      throw new Error('Evidence source JSON identity changed while being read')
    }
  } finally {
    await finalSourceHandle.close()
  }
} finally {
  await sourceHandle.close()
}

const parsed = JSON.parse(sourceBytes.toString('utf8')) as {
  manifest?: WingsSideTourMediaManifest
  releaseBinding?: WingsSideTourMediaReleaseBinding
  releaseEnvelope?: WingsSideTourMediaReleaseEnvelope
  tours?: LocalTourMediaEvidenceSource[]
}
const expectedTopLevel = ['manifest', 'releaseBinding', 'releaseEnvelope', 'tours']
if (
  !parsed ||
  Object.keys(parsed).sort().join('\0') !== expectedTopLevel.sort().join('\0') ||
  !parsed.manifest ||
  !parsed.releaseBinding ||
  !parsed.releaseEnvelope ||
  !Array.isArray(parsed.tours)
) {
  throw new Error(
    'Evidence source must contain only manifest, releaseBinding, releaseEnvelope, and tours',
  )
}

const trusted: WingsSideTourMediaTrustedExpectation = {
  envelopeSha256: resolveProtectedWingsSideEnvelopeSha(
    process.env,
    requestedEnvelopeSha,
  ),
  envelopeSignerID: requiredEnvironment('WINGSSIDE_EVIDENCE_ENVELOPE_SIGNER_ID'),
  manifestSha256: resolveProtectedWingsSideManifestSha(
    process.env,
    requestedManifestSha,
  ),
  releaseCommitSha: requiredEnvironment('WINGSTRAVEL_EXPECTED_RELEASE_SHA'),
  siteCode: requiredEnvironment('WINGSSIDE_EXPECTED_SITE_CODE'),
  source: {
    kind: requiredEnvironment('WINGSSIDE_EXPECTED_SOURCE_KIND') as
      | 'database-snapshot'
      | 'source-inventory',
    sha256: requiredEnvironment('WINGSSIDE_EXPECTED_SOURCE_SHA256'),
  },
}
if (!['database-snapshot', 'source-inventory'].includes(trusted.source.kind)) {
  throw new Error(
    'Protected environment WINGSSIDE_EXPECTED_SOURCE_KIND must be database-snapshot or source-inventory',
  )
}

let publicKeys: Record<string, string>
try {
  publicKeys = JSON.parse(requiredEnvironment('WINGSSIDE_EVIDENCE_PUBLIC_KEYS_JSON')) as Record<
    string,
    string
  >
} catch {
  throw new Error('Protected WINGSSIDE_EVIDENCE_PUBLIC_KEYS_JSON must be valid JSON')
}
const signatureVerifier: EvidenceSignatureVerifier = {
  verify: async ({ digest, signature }) => {
    const encodedKey = publicKeys[signature.signerID]
    if (!encodedKey) return false
    try {
      const key = createPublicKey({
        format: 'der',
        key: Buffer.from(encodedKey, 'base64'),
        type: 'spki',
      })
      return verify(
        null,
        Buffer.from(digest, 'utf8'),
        key,
        Buffer.from(signature.valueBase64, 'base64'),
      )
    } catch {
      return false
    }
  },
}

const result = await produceWingsSideTourMediaEvidence({
  approvedRoot: root,
  frameExtractionVerifier: {
    verify: async ({ assetSha256, attestation, frames, mediaID }) =>
      attestation.mediaID === mediaID &&
      attestation.assetSha256 === assetSha256 &&
      frames.every(({ sha256 }) => attestation.frameHashes.includes(sha256)),
  },
  manifest: parsed.manifest,
  releaseBinding: parsed.releaseBinding,
  releaseEnvelope: parsed.releaseEnvelope,
  signatureVerifier,
  tours: parsed.tours,
  trusted,
})
if (releaseGate) {
  assertWingsSideTourMediaEvidenceReleaseGate(result, trusted.envelopeSha256)
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
