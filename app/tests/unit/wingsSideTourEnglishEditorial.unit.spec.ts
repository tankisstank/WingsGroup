import { describe, expect, it } from 'vitest'

import {
  applyWingsSideTourEnglishEditorialPlan,
  assertWingsSideTourEnglishEditorialPlan,
  buildWingsSideTourEnglishEditorialManifest,
  buildWingsSideTourEnglishEditorialPlan,
  rollbackWingsSideTourEnglishEditorialPlan,
  verifyWingsSideTourEnglishEditorialPlan,
  wingsSideTourEnglishEditorialChecksum,
  type WingsSideTourEnglishEditorialConfig,
  type WingsSideTourEnglishEditorialDocument,
  type WingsSideTourEnglishEditorialPlan,
} from '../../scripts/lib/wingsSideTourEnglishEditorial'
import { lintWingsSideTourEnglishEditorial } from '../../scripts/lib/wingsSideTourEnglishEditorialValidator'

const slugs = Array.from({ length: 22 }, (_, index) => `tour-${index + 1}`)

const tour = (slug: string): WingsSideTourEnglishEditorialDocument => ({
  content: {
    blocks: [
      {
        body: `A considered journey for ${slug}.`,
        heading: 'Journey overview',
      },
    ],
  },
  durationDays: 4,
  excludes: [{ id: `${slug}-exclude-1`, label: 'International flights' }],
  includes: [{ id: `${slug}-include-1`, label: 'Local transport' }],
  itineraryDays: [{ id: `${slug}-day-1`, summary: 'Meet the local host', title: 'Arrival' }],
  priceFrom: 100,
  slug,
  summary: `A private journey designed for ${slug}.`,
  title: `Original ${slug}`,
})

const sourceTours = () => slugs.map(tour)
const proposedTours = (): WingsSideTourEnglishEditorialDocument[] =>
  sourceTours().map((item) => ({
    ...item,
    content: {
      blocks: [
        {
          body: `A slower journey shaped around ${item.slug}.`,
          heading: 'Journey overview',
        },
      ],
    },
    summary: `A tailored private journey designed for ${item.slug}.`,
    title: `WingSide ${item.slug}`,
  }))

const config: WingsSideTourEnglishEditorialConfig = {
  allCapsAllowlist: ['UNESCO', 'IATA'],
  allowIataCodes: true,
  editorialPaths: [
    'title',
    'summary',
    'content',
    'itineraryDays',
    'includes',
    'excludes',
  ],
  lockedFactualPaths: ['durationDays', 'priceFrom'],
  publicTextPaths: ['title', 'summary', 'content', 'itineraryDays', 'includes', 'excludes'],
  requiredPaths: ['title', 'summary', 'content.blocks', 'itineraryDays'],
  serviceRowPaths: ['includes', 'excludes'],
  vendorBrands: ['BestPrice', 'SourceCo'],
}

const manifestFor = (
  source: WingsSideTourEnglishEditorialDocument[],
  governedConfig: WingsSideTourEnglishEditorialConfig = config,
) =>
  buildWingsSideTourEnglishEditorialManifest({
    config: governedConfig,
    releaseSha: 'a'.repeat(40),
    tours: source.map((item, index) => ({
      slug: item.slug,
      sourceChecksum: wingsSideTourEnglishEditorialChecksum(item),
      tourID: index + 1,
    })),
  })

const buildPlan = (
  source = sourceTours(),
  proposal = proposedTours(),
): WingsSideTourEnglishEditorialPlan =>
  (() => {
    const manifest = manifestFor(source)
    return buildWingsSideTourEnglishEditorialPlan({
      config,
      createdAt: '2026-07-28T00:00:00.000Z',
      expectedSlugs: slugs,
      manifest,
      proposedTours: proposal,
      runID: 'unit-run',
      sourceTours: source,
    })
  })()

describe('WingSide English editorial lint', () => {
  it.each([
    ['Book your tour NOW for a private departure.', 'risky-phrase'],
    ['A chance to let your hair down.', 'risky-phrase'],
    ['Leave the rat race behind.', 'risky-phrase'],
    ['Designed for young people.', 'risky-phrase'],
    ['Imported from BestPrice.', 'vendor-brand'],
    ['Supplied by SourceCo.', 'vendor-brand'],
    ['A TRULY REMARKABLE journey.', 'all-caps'],
  ])('detects governed copy "%s"', (body, code) => {
    const findings = lintWingsSideTourEnglishEditorial({
      config,
      tour: { ...tour('lint-tour'), content: { blocks: [{ body }] } },
    })
    expect(findings.some((finding) => finding.code === code)).toBe(true)
    expect(findings.some((finding) => finding.path === 'content.blocks.0.body')).toBe(true)
  })

  it('recurses through configured public fields and ignores unconfigured internal fields', () => {
    const findings = lintWingsSideTourEnglishEditorial({
      config,
      tour: {
        ...tour('nested-tour'),
        content: { groups: [{ cards: [{ caption: 'BestPrice source copy' }] }] },
        internalNote: 'BestPrice internal reference',
      },
    })
    expect(findings).toEqual([
      expect.objectContaining({
        code: 'vendor-brand',
        path: 'content.groups.0.cards.0.caption',
      }),
    ])
  })

  it('allows explicit acronyms and configured IATA airport codes', () => {
    const findings = lintWingsSideTourEnglishEditorial({
      config,
      tour: {
        ...tour('allowlist-tour'),
        summary: 'A UNESCO journey via HAN with IATA-aligned routing.',
      },
    })
    expect(findings).toEqual([])
  })
})

describe('WingSide governed English editorial plan', () => {
  it('builds exactly 22 checksummed entries with field-level change summaries', () => {
    const plan = buildPlan()
    expect(plan.entries).toHaveLength(22)
    expect(plan.entries.every(({ sourceChecksum }) => /^[a-f0-9]{64}$/u.test(sourceChecksum))).toBe(
      true,
    )
    expect(plan.entries[0]?.fieldChanges.map(({ path }) => path)).toEqual([
      'content.blocks.0.body',
      'summary',
      'title',
    ])
    expect(() => assertWingsSideTourEnglishEditorialPlan(plan)).not.toThrow()
  })

  it('fails closed when one of 22 tours is missing', () => {
    expect(() => buildPlan(sourceTours().slice(0, -1))).toThrow(
      /Invalid WingSide English editorial manifest|exactly 22 unique tours/,
    )
  })

  it('fails closed when an extra slug replaces a governed slug', () => {
    const proposal = proposedTours()
    proposal[21] = { ...proposal[21]!, slug: 'unexpected-tour' }
    expect(() => buildPlan(sourceTours(), proposal)).toThrow('inventory mismatch')
  })

  it('fails closed when a required public field is absent', () => {
    const proposal = proposedTours()
    proposal[0] = { ...proposal[0]!, summary: ' ' }
    expect(() => buildPlan(sourceTours(), proposal)).toThrow(
      'Required English editorial field is missing',
    )
  })

  it('rejects an unapproved factual-field modification', () => {
    const proposal = proposedTours()
    proposal[0] = { ...proposal[0]!, durationDays: 9 }
    expect(() => buildPlan(sourceTours(), proposal)).toThrow('Unapproved English editorial field delta')
  })

  it('permits an explicitly approved factual-field modification', () => {
    const proposal = proposedTours()
    proposal[0] = { ...proposal[0]!, durationDays: 9 }
    const approvedConfig = {
      ...config,
      approvedFactualPaths: ['durationDays'],
    }
    const source = sourceTours()
    expect(() =>
      buildWingsSideTourEnglishEditorialPlan({
        config: approvedConfig,
        createdAt: '2026-07-28T00:00:00.000Z',
        expectedSlugs: slugs,
        manifest: manifestFor(source, approvedConfig),
        proposedTours: proposal,
        runID: 'approved-fact-unit-run',
        sourceTours: source,
      }),
    ).not.toThrow()
  })

  it('preserves service row cardinality and identity', () => {
    const proposal = proposedTours()
    proposal[0] = {
      ...proposal[0]!,
      includes: [{ id: 'replacement-id', label: 'Local transport' }],
    }
    expect(() => buildPlan(sourceTours(), proposal)).toThrow(
      'Service row cardinality or identity drift',
    )
  })

  it('rejects plan checksum tampering', () => {
    const plan = buildPlan()
    plan.entries[0]!.after.summary = 'Tampered after approval'
    expect(() => assertWingsSideTourEnglishEditorialPlan(plan)).toThrow(
      'checksum or summary mismatch',
    )
  })

  it('rejects source drift during apply', () => {
    const plan = buildPlan()
    const drifted = sourceTours()
    drifted[0] = { ...drifted[0]!, summary: 'Changed after plan creation' }
    expect(() => applyWingsSideTourEnglishEditorialPlan(plan, drifted)).toThrow(
      'source drift at runtime',
    )
  })

  it('applies, verifies, rolls back, and is idempotent in memory', () => {
    const plan = buildPlan()
    const applied = applyWingsSideTourEnglishEditorialPlan(plan, sourceTours())
    expect(verifyWingsSideTourEnglishEditorialPlan(plan, applied, 'applied')).toBe(true)
    expect(applyWingsSideTourEnglishEditorialPlan(plan, applied)).toEqual(applied)

    const rolledBack = rollbackWingsSideTourEnglishEditorialPlan(plan, applied)
    expect(verifyWingsSideTourEnglishEditorialPlan(plan, rolledBack, 'rolled-back')).toBe(true)
    expect(rollbackWingsSideTourEnglishEditorialPlan(plan, rolledBack)).toEqual(rolledBack)
  })
})
