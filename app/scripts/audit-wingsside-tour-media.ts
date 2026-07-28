import { readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  assertWingsSideTourMediaReleaseGate,
  buildWingsSideTourMediaAuditReport,
  type NormalizedTourMediaAuditInput,
} from './lib/wingsSideTourMediaAudit'

const args = process.argv.slice(2)
const inputPath = args.find((arg) => !arg.startsWith('--'))
const releaseGate = args.includes('--release-gate')

if (!inputPath) {
  throw new Error(
    'Usage: tsx scripts/audit-wingsside-tour-media.ts <normalized-input.json> [--release-gate]',
  )
}

const parsed = JSON.parse(await readFile(path.resolve(inputPath), 'utf8')) as unknown
const tours = Array.isArray(parsed)
  ? (parsed as NormalizedTourMediaAuditInput[])
  : ((parsed as { tours?: unknown }).tours as NormalizedTourMediaAuditInput[])

if (!Array.isArray(tours)) {
  throw new Error('Normalized media audit input must be an array or an object with a tours array')
}

const report = buildWingsSideTourMediaAuditReport({ tours })
if (releaseGate) assertWingsSideTourMediaReleaseGate(report)
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
