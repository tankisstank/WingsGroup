import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { getCurrentLocale, getCurrentSite } from './siteContext'

export const getCurrentSiteSettings = async (siteCodeFromArgs?: string | null) => {
  const payload = await getPayload({ config: configPromise })
  const site = await getCurrentSite(siteCodeFromArgs)
  const locale = await getCurrentLocale()

  if (!site) {
    return null
  }

  const result = await payload.find({
    collection: 'site-settings',
    depth: 1,
    locale,
    limit: 1,
    pagination: false,
    where: {
      site: {
        equals: site.id,
      },
    },
  })

  return result.docs[0] || null
}
