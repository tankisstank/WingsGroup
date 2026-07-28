/**
 * Audit-only local evidence producer.
 *
 * Reads only files beneath --approved-root, never accesses the network/Payload,
 * and never mutates production. OCR attestations are supplied by an upstream
 * adapter and are checked against hashes of the local bytes; this CLI does not
 * claim to execute OCR or authenticate a human reviewer.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  produceWingsSideTourMediaEvidence,
  resolveProtectedWingsSideManifestSha,
  type LocalTourMediaEvidenceSource,
  type OcrAttestation,
  type WingsSideTourMediaReleaseBinding,
  type WingsSideTourMediaTrustedExpectation,
} from './lib/wingsSideTourMediaEvidence'
import type { WingsSideTourMediaManifest } from './lib/wingsSideTourMediaAudit'
import { assertWingsSideTourMediaReleaseGate } from './lib/wingsSideTourMediaAudit'

const args = process.argv.slice(2)
const inputPath = args.find((argument) => !argument.startsWith('--'))
const argument = (name: string): string | undefined =>
  args.find((entry) => entry.startsWith(`${name}=`))?.slice(name.length + 1)
const approvedRoot = argument('--approved-root')
const requestedManifestSha = argument('--manifest-sha256')
const releaseGate = args.includes('--release-gate')

if (!inputPath || !approvedRoot) {
  throw new Error(
    'Usage: tsx scripts/audit-wingsside-tour-media-evidence.ts <source.json> --approved-root=<path> [--manifest-sha256=<protected-value>]',
  )
}

const requiredEnvironment = (name: string): string => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Protected environment ${name} is required`)
  return value
}

const parsed = JSON.parse(await readFile(path.resolve(inputPath), 'utf8')) as {
  manifest?: WingsSideTourMediaManifest
  ocrAttestations?: Record<string, OcrAttestation>
  releaseBinding?: WingsSideTourMediaReleaseBinding
  tours?: LocalTourMediaEvidenceSource[]
}
if (
  !parsed.manifest ||
  !parsed.releaseBinding ||
  !Array.isArray(parsed.tours) ||
  !parsed.ocrAttestations
) {
  throw new Error(
    'Evidence source must contain manifest, releaseBinding, tours, and OCR attestations',
  )
}

const trusted: WingsSideTourMediaTrustedExpectation = {
  manifestSha256: resolveProtectedWingsSideManifestSha(process.env, requestedManifestSha),
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

const result = await produceWingsSideTourMediaEvidence({
  approvedRoot,
  manifest: parsed.manifest,
  ocrAdapter: {
    scan: async ({ mediaID }) => {
      const attestation = parsed.ocrAttestations![mediaID]
      if (!attestation) {
        throw new Error(`WingSide media evidence missing OCR attestation for media ${mediaID}`)
      }
      return attestation
    },
  },
  releaseBinding: parsed.releaseBinding,
  tours: parsed.tours,
  trusted,
})
if (releaseGate) {
  assertWingsSideTourMediaReleaseGate(result.report, result.bundle.manifest)
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
