import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { getCurrentSite } from './siteContext'

export const getCurrentSiteSettings = async (siteCodeFromArgs?: string | null) => {
  const payload = await getPayload({ config: configPromise })
  const site = await getCurrentSite(siteCodeFromArgs)

  if (!site) {
    return null
  }

  const result = await payload.find({
    collection: 'site-settings',
    depth: 1,
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
