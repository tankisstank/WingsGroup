import { describe, expect, it } from 'vitest'

import {
  buildWingsSideTourEditorialCatalog,
  editorialSourceChecksum,
  loadWingsSideTourEditorialCatalog,
  validateWingsSideTourEditorialCatalog,
  type WingsSideTourEditorialLocaleFile,
  type WingsSideTourEditorialSourceManifest,
  type EditorialSourceTour,
  type WingsSideTourEditorialCatalog,
} from '../../scripts/lib/wingsSideTourEditorialLocalization'

const source: EditorialSourceTour = {
  excludes: [{ label: 'International flights' }],
  includes: [{ label: 'Private airport transfer' }],
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
    excludes: ['Chuyến bay quốc tế'],
    includes: ['Đón tiễn sân bay riêng'],
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
  version: 1,
})

describe('WingSide tour editorial localization contract', () => {
  it('accepts complete transcreated content while preserving source cardinality', () => {
    expect(
      validateWingsSideTourEditorialCatalog({ catalog: catalog(), sourceTours: [source] }),
    ).toEqual([])
  })

  it('rejects source drift, missing list items, verbatim fallback and source-brand leakage', () => {
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
        'Inclusion count changed',
        'Source-brand language is not allowed',
        'Meals must be authored per day without raw NA or semicolon serialization',
      ]),
    )
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

  it('loads the committed 22-tour catalog for all four editorial locales', async () => {
    const actual = await loadWingsSideTourEditorialCatalog()

    expect(actual.targetLocales).toEqual(['vi', 'it', 'es', 'pt'])
    expect(actual.tours).toHaveLength(22)
    expect(new Set(actual.tours.map(({ slug }) => slug)).size).toBe(22)
    for (const tour of actual.tours) {
      expect(tour.sourceChecksum).toMatch(/^[a-f0-9]{64}$/)
      expect(Object.keys(tour.locales).sort()).toEqual(['es', 'it', 'pt', 'vi'])
    }
  })

  it('fails closed when a locale file does not match the source slug inventory', () => {
    const content = localized('vi')
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
