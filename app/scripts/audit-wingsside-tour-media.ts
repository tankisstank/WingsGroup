/**
 * Verifies a caller-supplied normalized evidence manifest.
 * It does not execute OCR, hash media bytes, authenticate reviewers, or access Payload/network.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  assertWingsSideTourMediaReleaseGate,
  buildWingsSideTourMediaAuditReport,
  type NormalizedTourMediaAuditInput,
  type WingsSideTourMediaManifest,
} from './lib/wingsSideTourMediaAudit'

const args = process.argv.slice(2)
const inputPath = args.find((arg) => !arg.startsWith('--'))
const releaseGate = args.includes('--release-gate')

if (!inputPath) {
  throw new Error(
    'Usage: tsx scripts/audit-wingsside-tour-media.ts <normalized-evidence.json> [--release-gate]',
  )
}

const parsed = JSON.parse(await readFile(path.resolve(inputPath), 'utf8')) as {
  manifest?: WingsSideTourMediaManifest
  tours?: NormalizedTourMediaAuditInput[]
}
if (!parsed.manifest || !Array.isArray(parsed.tours)) {
  throw new Error('Evidence input must contain canonical manifest and normalized tours arrays')
}

const report = buildWingsSideTourMediaAuditReport({
  manifest: parsed.manifest,
  tours: parsed.tours,
})
if (releaseGate) assertWingsSideTourMediaReleaseGate(report, parsed.manifest)
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
