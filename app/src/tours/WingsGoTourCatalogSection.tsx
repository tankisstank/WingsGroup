import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { Site } from '@/payload-types'
import type { CopyLocaleCode } from '@/utilities/locales'

import { WingsGoCommerceHero } from '@/heros/WingsGoCommerceHero'
import { WingsGoTourCatalogClient } from './WingsGoTourCatalogClient'
import {
  parseWingsGoCatalogFilters,
  queryWingsGoTourCatalog,
  type WingsGoCatalogPage,
} from './wingsGoCatalog'
import { resolveWingsGoCopyLocale } from './wingsGoCatalogCopy'

export const WingsGoTourCatalogSection = async ({
  locale,
  page,
  searchParams,
  site,
}: {
  locale?: CopyLocaleCode | string | null
  page: WingsGoCatalogPage
  searchParams: Record<string, string | string[] | undefined>
  site: Site
}) => {
  const payload = await getPayload({ config: configPromise })
  const now = new Date()
  const filters = parseWingsGoCatalogFilters(searchParams, now)
  const copyLocale = resolveWingsGoCopyLocale(locale)
  const initial = await queryWingsGoTourCatalog({
    filters,
    limit: 6,
    locale: copyLocale,
    now,
    page,
    payload,
    site: { code: String(site.code), id: site.id },
  })

  return (
    <>
      <WingsGoCommerceHero
        cards={initial.hero}
        filtersActive={initial.filtersActive}
        initialFilters={filters}
        locale={copyLocale}
      />
      <WingsGoTourCatalogClient
        initial={initial}
        initialFilters={filters}
        locale={copyLocale}
      />
    </>
  )
}
