import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  buildWingsSideCatalogCandidateOverlay,
  buildWingsSideCatalogCandidateReviewPacket,
  signWingsSideCatalogCandidateRehearsal,
  verifyWingsSideCatalogCandidateSignedEvidence,
} from '../../scripts/lib/wingsSideCatalogCandidateOverlay'
import type { WingsSideCatalogSourceSnapshot } from '../../scripts/lib/wingsSideCatalogSourceSnapshot'

const appRoot = process.cwd()
const evidenceRoot = path.resolve(
  appRoot,
  '..',
  'docs/stories/epics/E08-wingsside-inbound-upgrade/US-055-real-tour-why-travel/evidence/wp1-catalog-r3',
)
const englishCandidatePath = path.join(
  appRoot,
  'scripts/data/wingsside-tour-content-candidates/en.json',
)
const historicalSourceManifestPath = path.join(
  appRoot,
  'scripts/data/wingsside-tour-editorial/source-manifest.json',
)
const pricingDisclosuresPath = path.join(
  appRoot,
  'scripts/data/wingsside-tour-content-candidates/pricing-disclosures.json',
)
const readJSON = <T>(filePath: string): T => JSON.parse(fs.readFileSync(filePath, 'utf8')) as T

const inputs = () => ({
  englishCandidate: readJSON(englishCandidatePath),
  englishCandidatePath,
  historicalSourceManifest: readJSON(historicalSourceManifestPath),
  historicalSourceManifestPath,
  leaderWorktreeAppRoot: appRoot,
  pricingDisclosures: readJSON(pricingDisclosuresPath),
  pricingDisclosuresPath,
  snapshot: readJSON<WingsSideCatalogSourceSnapshot>(
    path.join(evidenceRoot, 'source-snapshot.json'),
  ),
})

const build = (value = inputs()) => buildWingsSideCatalogCandidateOverlay(value as never)

describe('WingSide source candidate overlay and D6-C rehearsal evidence', () => {
  it('deterministically binds exact 22 tours, 38 rows, and five locales', () => {
    const first = build()
    const second = build()
    expect(first).toEqual(second)
    expect(first.englishTours).toHaveLength(22)
    expect(first.pricingDisclosures).toHaveLength(38)
    expect(first.supportedLocales).toEqual(['en', 'vi', 'it', 'es', 'pt'])
    expect(new Set(first.englishTours.map(({ tourID }) => String(tourID))).size).toBe(22)
    expect(
      new Set(first.pricingDisclosures.map(({ slug, sourceRowID }) => `${slug}\0${sourceRowID}`))
        .size,
    ).toBe(38)
    for (const row of first.pricingDisclosures) {
      expect(Object.keys(row.labels).sort()).toEqual(['en', 'es', 'it', 'pt', 'vi'])
    }
  })

  it('rejects historical checksum drift, row loss, and locale substitution', () => {
    const stale = inputs()
    ;(
      stale.englishCandidate as { tours: Array<{ sourceChecksum: string }> }
    ).tours[0]!.sourceChecksum = 'f'.repeat(64)
    expect(() => build(stale)).toThrow('historical source binding mismatch')

    const rowLoss = inputs()
    rowLoss.snapshot.tours[0]!.includes!.pop()
    expect(() => build(rowLoss)).toThrow('Pricing disclosure source binding mismatch')

    const localeSubstitution = inputs()
    const firstPricing = (
      localeSubstitution.pricingDisclosures as {
        rows: Array<{ labels: Record<string, string> }>
      }
    ).rows[0]!
    delete firstPricing.labels.pt
    expect(() => build(localeSubstitution)).toThrow('Pricing disclosure source binding mismatch')
  })

  it('rejects full candidate checksum drift', () => {
    const candidate = build()
    candidate.englishTours[0]!.title = 'Substituted after candidate checksum'
    expect(() => buildWingsSideCatalogCandidateReviewPacket(candidate)).toThrow(
      'Full candidate checksum drift',
    )
  })

  it('verifies ephemeral Ed25519 evidence and rejects signature, policy, and replay', () => {
    const candidate = build()
    const evidence = signWingsSideCatalogCandidateRehearsal({
      approvedAt: '2026-07-28T14:00:00.000Z',
      approvedBy: 'development-team-reviewer',
      candidate,
      runID: 'unit-rehearsal-1',
    })
    const digest = verifyWingsSideCatalogCandidateSignedEvidence(evidence, candidate, {
      expectedRunID: 'unit-rehearsal-1',
    })
    expect(digest).toMatch(/^[a-f0-9]{64}$/u)
    expect(() =>
      verifyWingsSideCatalogCandidateSignedEvidence(evidence, candidate, {
        consumedEvidenceDigests: new Set([digest]),
        expectedRunID: 'unit-rehearsal-1',
      }),
    ).toThrow('replay detected')

    const forged = structuredClone(evidence)
    forged.signature.valueBase64 = Buffer.from('forged').toString('base64')
    expect(() => verifyWingsSideCatalogCandidateSignedEvidence(forged, candidate)).toThrow(
      'signature is invalid',
    )

    const substituted = structuredClone(evidence)
    substituted.approval.policyID = 'substituted' as never
    expect(() => verifyWingsSideCatalogCandidateSignedEvidence(substituted, candidate)).toThrow(
      'policy or packet substitution',
    )
  })
})
