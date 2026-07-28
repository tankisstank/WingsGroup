import { describe, expect, it } from 'vitest'

import {
  buildWingsSideTourEditorialCatalog,
  editorialServiceLabelChecksum,
  editorialSourceChecksum,
  loadWingsSideTourEditorialCatalog,
  validateWingsSideTourEditorialCatalog,
  type WingsSideTourEditorialLocaleFile,
  type WingsSideTourEditorialSourceManifest,
  type EditorialSourceTour,
  type WingsSideTourEditorialCatalog,
} from '../../scripts/lib/wingsSideTourEditorialLocalization'

const source: EditorialSourceTour = {
  excludes: [{ id: 'exclude-1', label: 'International flights' }],
  includes: [{ id: 'include-1', label: 'Private airport transfer' }],
  itineraryDays: [
    {
      dayNumber: 1,
      meals: 'Breakfast',
      route: 'Hanoi - Ha Long',
      summary: 'Travel from Hanoi to Ha Long and board the overnight cruise.',
      title: 'Hanoi to Ha Long',
    },
  ],
  slug: 'hanoi-halong-2-days',
  summary: 'A private two-day journey from Hanoi to Ha Long Bay.',
  title: 'Hanoi and Ha Long in 2 days',
}

const localized = (locale: 'es' | 'it' | 'pt' | 'vi') => {
  const copy = {
    es: {
      cta: 'Diseñar mi viaje',
      route: 'Hanói y bahía de Ha Long',
      summary: 'Un viaje privado de dos días entre Hanói y la bahía de Ha Long.',
      title: 'Hanói y Ha Long en 2 días',
    },
    it: {
      cta: 'Progetta il mio viaggio',
      route: 'Hanoi e baia di Ha Long',
      summary: 'Un itinerario privato di due giorni da Hanoi alla baia di Ha Long.',
      title: 'Hanoi e Ha Long in 2 giorni',
    },
    pt: {
      cta: 'Planear a minha viagem',
      route: 'Hanói e baía de Ha Long',
      summary: 'Uma viagem privada de dois dias entre Hanói e a baía de Ha Long.',
      title: 'Hanói e Ha Long em 2 dias',
    },
    vi: {
      cta: 'Thiết kế hành trình',
      route: 'Hà Nội và vịnh Hạ Long',
      summary: 'Hành trình riêng hai ngày từ Hà Nội đến vịnh Hạ Long.',
      title: 'Hà Nội và Hạ Long trong 2 ngày',
    },
  }[locale]

  return {
    excludes: [
      { label: 'Chuyến bay quốc tế', sourceRowID: 'exclude-1', targetBucket: 'excludes' as const },
    ],
    includes: [
      { label: 'Đón tiễn sân bay riêng', sourceRowID: 'include-1', targetBucket: 'includes' as const },
    ],
    itineraryDays: [
      {
        dayNumber: 1,
        meals: 'Bữa sáng',
        route: copy.route,
        summary: `${copy.summary} Nghỉ đêm trên du thuyền.`,
        title: copy.route,
      },
    ],
    meta: {
      breadcrumbLabel: copy.title,
      description: copy.summary,
      title: copy.title,
    },
    primaryCTALabel: copy.cta,
    routeSummary: copy.route,
    servicesSummary: {
      hotelSummary: `${copy.summary} Hotel.`,
      mealsSummary: `${copy.summary} Meals.`,
      operatorNotes: `${copy.summary} Notes.`,
      transportSummary: `${copy.summary} Transport.`,
    },
    summary: copy.summary,
    title: copy.title,
  }
}

const catalog = (): WingsSideTourEditorialCatalog => ({
  pricingDispositions: [],
  sourceLocale: 'en',
  targetLocales: ['vi', 'it', 'es', 'pt'],
  tours: [
    {
      locales: {
        es: localized('es'),
        it: localized('it'),
        pt: localized('pt'),
        vi: localized('vi'),
      },
      slug: source.slug,
      sourceChecksum: editorialSourceChecksum(source),
    },
  ],
  version: 2,
})

describe('WingSide tour editorial localization contract', () => {
  it('accepts complete transcreated content while preserving source cardinality', () => {
    expect(
      validateWingsSideTourEditorialCatalog({ catalog: catalog(), sourceTours: [source] }),
    ).toEqual([])
  })

  it('rejects source drift, locale service-shape drift, verbatim fallback and source-brand leakage', () => {
    const invalid = catalog()
    invalid.tours[0]!.sourceChecksum = 'stale'
    invalid.tours[0]!.locales.it.summary = source.summary
    invalid.tours[0]!.locales.es.includes = []
    invalid.tours[0]!.locales.pt.itineraryDays[0]!.summary = 'BestPrice Travel package'
    invalid.tours[0]!.locales.vi.itineraryDays[0]!.meals = 'NA; Bữa sáng, bữa trưa'

    const findings = validateWingsSideTourEditorialCatalog({
      catalog: invalid,
      sourceTours: [source],
    })

    expect(findings.map(({ message }) => message)).toEqual(
      expect.arrayContaining([
        'English source content changed after editorial localization',
        'Verbatim English fallback is not allowed',
        'Localized service rows must contain every unique source row ID exactly once',
        'Source-brand language is not allowed',
        'Meals must be authored per day without raw NA/None markers',
      ]),
    )
  })

  it('allows an approved semantic reclassification and editorial semicolons', () => {
    const reclassifiedSource = {
      ...source,
      excludes: [],
      includes: [
        ...(source.includes || []),
        ...(source.excludes || []),
        { id: 'raw-1', label: 'Raw source row classified by editorial policy' },
      ],
    }
    const valid = catalog()
    valid.tours[0]!.sourceChecksum = editorialSourceChecksum(reclassifiedSource)
    valid.pricingDispositions.push({
      approvedAt: '2026-07-28T00:00:00.000Z',
      approvedBy: 'content-owner',
      approvedTargetBucket: 'excludes',
      rationale: 'Commercially excluded from the package.',
      slug: source.slug,
      sourceBucket: 'includes',
      sourceLabel: 'International flights',
      sourceLabelChecksum: editorialServiceLabelChecksum('International flights'),
      sourceRowID: 'exclude-1',
    })
    valid.pricingDispositions.push({
      approvedAt: '2026-07-28T00:00:00.000Z',
      approvedBy: 'content-owner',
      approvedTargetBucket: 'excludes',
      rationale: 'This imported source row is excluded by approved policy.',
      slug: source.slug,
      sourceBucket: 'includes',
      sourceLabel: 'Raw source row classified by editorial policy',
      sourceLabelChecksum: editorialServiceLabelChecksum(
        'Raw source row classified by editorial policy',
      ),
      sourceRowID: 'raw-1',
    })
    for (const locale of ['vi', 'it', 'es', 'pt'] as const) {
      valid.tours[0]!.locales[locale].excludes.push({
        label: 'Không bao gồm theo chính sách',
        sourceRowID: 'raw-1',
        targetBucket: 'excludes',
      })
      valid.tours[0]!.locales[locale].itineraryDays[0]!.meals =
        `${valid.tours[0]!.locales[locale].itineraryDays[0]!.meals}; light snack if selected`
    }

    expect(
      validateWingsSideTourEditorialCatalog({
        catalog: valid,
        sourceTours: [reclassifiedSource],
      }),
    ).toEqual([])
  })

  it('rejects missing and extra tour slugs', () => {
    const invalid = catalog()
    invalid.tours.push({ ...invalid.tours[0]!, slug: 'unexpected-tour' })

    const findings = validateWingsSideTourEditorialCatalog({
      catalog: invalid,
      sourceTours: [source, { ...source, slug: 'missing-tour' }],
    })

    expect(findings.map(({ message }) => message)).toEqual(
      expect.arrayContaining([
        'Source tour is missing from localization catalog',
        'Catalog contains a tour outside the exact source inventory',
      ]),
    )
  })

  it('fails closed for duplicate or unknown row IDs and disposition checksum tampering', () => {
    const invalid = catalog()
    invalid.tours[0]!.locales.vi.includes.push({
      ...invalid.tours[0]!.locales.vi.includes[0]!,
    })
    invalid.pricingDispositions.push({
      approvedAt: '2026-07-28T00:00:00.000Z',
      approvedBy: 'content-owner',
      approvedTargetBucket: 'includes',
      rationale: 'Approved pricing treatment.',
      slug: source.slug,
      sourceBucket: 'includes',
      sourceLabel: 'Unknown',
      sourceLabelChecksum: 'tampered',
      sourceRowID: 'unknown-row',
    })
    invalid.tours[0]!.locales.pt.includes = []
    invalid.tours[0]!.locales.pt.excludes.push({
      label: 'Trasferimento privato',
      sourceRowID: 'include-1',
      targetBucket: 'excludes',
    })
    invalid.pricingDispositions.push({
      approvedAt: '2026-07-28T00:00:00.000Z',
      approvedBy: 'content-owner',
      approvedTargetBucket: 'excludes',
      rationale: 'Approved bucket move.',
      slug: source.slug,
      sourceBucket: 'includes',
      sourceLabel: 'Private airport transfer',
      sourceLabelChecksum: 'tampered',
      sourceRowID: 'include-1',
    })

    const messages = validateWingsSideTourEditorialCatalog({
      catalog: invalid,
      sourceTours: [source],
    }).map(({ message }) => message)
    expect(messages).toContain(
      'Localized service rows must contain every unique source row ID exactly once',
    )
    expect(messages).toContain('Pricing disposition references an unknown source row ID')
    expect(messages).toContain('Pricing disposition source label or checksum drifted')
    expect(messages).toContain('Service row requires a complete approved pricing disposition')
  })

  it('refuses committed v1 positional locale files until they are migrated', async () => {
    await expect(loadWingsSideTourEditorialCatalog()).rejects.toThrow(
      'Unsafe v1 positional locale files cannot build catalog v2',
    )
  })

  it('fails closed when a locale file does not match the source slug inventory', () => {
    const localizedContent = localized('vi')
    const content = {
      ...localizedContent,
      excludes: localizedContent.excludes.map(({ label }) => label),
      includes: localizedContent.includes.map(({ label }) => label),
    }
    const localeFile = (locale: 'es' | 'it' | 'pt' | 'vi'): WingsSideTourEditorialLocaleFile => ({
      locale,
      tours: [{ ...content, slug: locale === 'pt' ? 'wrong-slug' : source.slug }],
      version: 1,
      voice: 'calm-specific-consultative',
    })
    const manifest: WingsSideTourEditorialSourceManifest = {
      generatedFrom: 'wing-side-published-en-tour-products',
      sourceLocale: 'en',
      tours: [{ checksum: editorialSourceChecksum(source), slug: source.slug }],
      version: 1,
    }

    expect(() =>
      buildWingsSideTourEditorialCatalog({
        localeFiles: ['vi', 'it', 'es', 'pt'].map((locale) =>
          localeFile(locale as 'es' | 'it' | 'pt' | 'vi'),
        ),
        manifest,
      }),
    ).toThrow('pt slug inventory does not match source')
  })
})
