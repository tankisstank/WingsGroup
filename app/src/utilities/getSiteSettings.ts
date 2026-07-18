import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { getCurrentLocale, getCurrentSite } from './siteContext'
import { getSharedCachedValue } from '@/infrastructure/cache/sharedCache'

export const getCurrentSiteSettings = async () => {
  const payload = await getPayload({ config: configPromise })
  const site = await getCurrentSite()
  const locale = await getCurrentLocale()

  return getSharedCachedValue({
    namespace: 'site-settings',
    tenant: site.id,
    variant: locale,
    load: async () => {
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
    },
  })
}
