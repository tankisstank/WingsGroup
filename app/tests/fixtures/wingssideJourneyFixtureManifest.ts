import type { DiscoveryDurationCode } from '@/tours/discoveryCore'
import type { TourDestinationKey, TourTravelStyleKey } from '@/tours/taxonomy'

export const wingSideJourneyFixtureLocales = ['en', 'vi', 'it', 'es', 'pt'] as const

export type WingSideJourneyFixtureLocale = (typeof wingSideJourneyFixtureLocales)[number]

type FixtureLocalization = { summary: string; title: string }
type FixtureTourType = 'group' | 'hybrid' | 'private' | undefined

export type WingSideJourneyFixture = {
  commerce: { posture: 'contact' }
  fixtureKey: string
  localized: Record<WingSideJourneyFixtureLocale, FixtureLocalization>
  media: { altByLocale: Record<WingSideJourneyFixtureLocale, string>; assetKey: string }
  publication: 'published'
  taxonomy: {
    destinationTags: TourDestinationKey[]
    durationDays: number
    durationNights: number
    tourType: FixtureTourType
    travelStyles: TourTravelStyleKey[]
  }
  wrapper: { pathname: string; slug: string }
}

type QueryCase = {
  query: {
    destination: TourDestinationKey
    duration: DiscoveryDurationCode
    style: TourTravelStyleKey
  }
}

const localized = (fixtureKey: string): Record<WingSideJourneyFixtureLocale, FixtureLocalization> =>
  Object.fromEntries(
    wingSideJourneyFixtureLocales.map((locale) => [
      locale,
      {
        summary: `Synthetic ${locale.toUpperCase()} summary for ${fixtureKey}.`,
        title: `Synthetic journey ${fixtureKey} (${locale.toUpperCase()})`,
      },
    ]),
  ) as Record<WingSideJourneyFixtureLocale, FixtureLocalization>

const neutralAlt = Object.fromEntries(
  wingSideJourneyFixtureLocales.map((locale) => [locale, 'Neutral E2E journey image']),
) as Record<WingSideJourneyFixtureLocale, string>

const fixture = (
  fixtureKey: string,
  destination: TourDestinationKey,
  style: TourTravelStyleKey,
  durationDays: number,
  tourType: FixtureTourType,
): WingSideJourneyFixture => ({
  commerce: { posture: 'contact' },
  fixtureKey,
  localized: localized(fixtureKey),
  media: { altByLocale: neutralAlt, assetKey: 'wingside-e2e-neutral.png' },
  publication: 'published',
  taxonomy: {
    destinationTags: [destination],
    durationDays,
    durationNights: durationDays - 1,
    tourType,
    travelStyles: [style],
  },
  wrapper: { pathname: `/tour/${fixtureKey}`, slug: `e2e-wrapper-${fixtureKey}` },
})

/** Synthetic fixture: preserves production cardinality/type shape, never production content. */
const tours: WingSideJourneyFixture[] = [
  fixture('journey-01', 'hanoi', 'culture', 6, 'group'),
  fixture('journey-02', 'halong', 'family', 9, 'group'),
  fixture('journey-03', 'ninh-binh', 'adventure', 5, 'group'),
  fixture('journey-04', 'sapa', 'adventure', 8, 'group'),
  fixture('journey-05', 'mai-chau', 'culture', 4, 'group'),
  fixture('journey-06', 'hue', 'wellness', 7, 'group'),
  fixture('journey-07', 'da-nang', 'luxury', 10, 'group'),
  fixture('journey-08', 'hoian', 'romance', 6, 'private'),
  fixture('journey-09', 'ho-chi-minh-city', 'business', 5, 'private'),
  fixture('journey-10', 'mekong', 'wellness', 3, 'private'),
  fixture('journey-11', 'phu-quoc', 'romance', 7, 'private'),
  fixture('journey-12', 'ninh-thuan', 'wellness', 8, 'private'),
  fixture('journey-13', 'siem-reap', 'culture', 15, 'private'),
  fixture('journey-14', 'halong', 'luxury', 4, 'private'),
  fixture('journey-15', 'ninh-binh', 'family', 6, 'private'),
  fixture('journey-16', 'hanoi', 'adventure', 9, 'private'),
  fixture('journey-17', 'sapa', 'culture', 8, 'hybrid'),
  fixture('journey-18', 'da-nang', 'family', 7, 'hybrid'),
  fixture('journey-19', 'mekong', 'luxury', 5, 'hybrid'),
  fixture('journey-20', 'phu-quoc', 'wellness', 10, 'hybrid'),
  fixture('journey-21', 'hoian', 'business', 4, undefined),
  fixture('journey-22', 'hue', 'romance', 9, undefined),
]

export const wingSideJourneyFixtureManifest = {
  capturedFrom: { acceptedReleaseSha: '00add94', sourceScope: 'production-shape only' },
  catalog: { tourCount: 22, typeCounts: { group: 7, hybrid: 4, private: 8, unresolved: 3 } },
  prohibitions: [
    'realLeadData',
    'realCredentials',
    'productionIDs',
    'productionPrices',
    'productionMediaURLs',
    'productionSlugs',
  ],
  queryCases: {
    exact: {
      query: {
        destination: 'hanoi',
        duration: '1-7',
        style: 'culture',
      } satisfies QueryCase['query'],
    },
    zeroResult: {
      query: {
        destination: 'hanoi',
        duration: '1-7',
        style: 'wellness',
      } satisfies QueryCase['query'],
    },
  },
  schemaVersion: 1,
  tenant: { code: 'wing-side', defaultLocale: 'en', locales: wingSideJourneyFixtureLocales },
  tours,
} as const
