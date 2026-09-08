import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { Site } from '@/payload-types'

import { WingsGoTourCatalogClient } from './WingsGoTourCatalogClient'
import {
  parseWingsGoCatalogFilters,
  queryWingsGoTourCatalog,
  type WingsGoCatalogPage,
} from './wingsGoCatalog'

export const WingsGoTourCatalogSection = async ({
  page,
  searchParams,
  site,
}: {
  page: WingsGoCatalogPage
  searchParams: Record<string, string | string[] | undefined>
  site: Site
}) => {
  const payload = await getPayload({ config: configPromise })
  const filters = parseWingsGoCatalogFilters(searchParams)
  const initial = await queryWingsGoTourCatalog({
    filters,
    limit: 6,
    page,
    payload,
    site: { code: String(site.code), id: site.id },
  })

  return <WingsGoTourCatalogClient initial={initial} initialFilters={filters} />
}
