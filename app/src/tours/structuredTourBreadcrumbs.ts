import type { BreadcrumbItem } from '@/utilities/breadcrumbs'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'

import { normalizeDiscoveryQuery, serializeDiscoveryQuery, stripDiscoveryQueryMeta } from './discoveryCore'
import { readSafeTourEnquiryContext } from './enquiryContext'

const structuredTourTitle = (title?: null | string): string =>
  String(title || '')
    .replace(/:.*/, '')
    .replace(/\s+\d+\s+days?$/i, '')

const journeysLabelByLocale: Partial<Record<SupportedLocaleCode, string>> = {
  en: 'Journeys',
  es: 'Viajes',
  it: 'Viaggi',
  pt: 'Viagens',
  vi: 'Hành trình',
}

const packagesLabelByLocale: Partial<Record<SupportedLocaleCode, string>> = {
  en: 'Packages',
  es: 'Viajes de muestra',
  it: 'Viaggi di esempio',
  pt: 'Viagens de exemplo',
  vi: 'Hành trình mẫu',
}

const discoveryPathFromSearchParams = (
  searchParams?: URLSearchParams | Record<string, string | string[] | null | undefined>,
): string => {
  const query = stripDiscoveryQueryMeta(normalizeDiscoveryQuery(searchParams))
  const serialized = serializeDiscoveryQuery(query)
  return serialized ? `/journeys?${serialized}` : '/journeys'
}

export const buildStructuredTourBreadcrumbItems = ({
  baseItems,
  canonicalPath,
  locale,
  pageTitle,
  searchParams,
  siteCode,
}: {
  baseItems: BreadcrumbItem[]
  canonicalPath: string
  locale: SupportedLocaleCode
  pageTitle?: null | string
  searchParams?: URLSearchParams | Record<string, string | string[] | null | undefined>
  siteCode?: null | string
}): BreadcrumbItem[] => {
  if (siteCode !== 'wing-side') return baseItems

  const home = baseItems[0] || { label: 'WingsSide', path: '/' }
  const context = readSafeTourEnquiryContext(searchParams)
  const fromJourneys = context.source === 'journeys'
  const parent = fromJourneys
    ? {
        label: journeysLabelByLocale[locale] || journeysLabelByLocale.en || 'Journeys',
        path: discoveryPathFromSearchParams(searchParams),
      }
    : {
        label: packagesLabelByLocale[locale] || packagesLabelByLocale.en || 'Packages',
        path: '/packages',
      }

  return [
    home,
    parent,
    {
      label: structuredTourTitle(pageTitle),
      path: canonicalPath,
    },
  ]
}
