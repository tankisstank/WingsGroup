import configPromise from '@payload-config'
import { draftMode } from 'next/headers'
import { getPayload } from 'payload'

import {
  isWingsGroupRoutePublic,
  isWingsGroupV3PublicSurfacePathAllowed,
} from '@/wingsgroup/corporateRoutes'
import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import { appendSiteWhere, getCurrentSite } from '@/utilities/siteContext'

export const queryPageByPath = async ({
  depth = 3,
  locale,
  requestedPath,
}: {
  depth?: number
  locale?: SupportedLocaleCode
  requestedPath: string
}) => {
  const { isEnabled: draft } = await draftMode()
  const site = await getCurrentSite()
  const settings = await getCurrentSiteSettings()

  if (
    !draft &&
    !isWingsGroupV3PublicSurfacePathAllowed({
      locale: locale || 'vi',
      path: requestedPath,
      settings,
      siteCode: site.code,
    })
  ) {
    return null
  }

  const payload = await getPayload({ config: configPromise })
  const segments = requestedPath.split('/').filter(Boolean)
  const candidateSlug = segments[segments.length - 1] || 'home'
  const candidateSlugs = [candidateSlug, `${site.code}-${candidateSlug}`]
  const where = await appendSiteWhere({
    or: [
      {
        pathname: {
          equals: requestedPath,
        },
      },
      {
        slug: {
          in: candidateSlugs,
        },
      },
    ],
  })

  const findPage = async (requestedLocale?: SupportedLocaleCode) => {
    const scopedWhere = draft
      ? where
      : {
          and: [
            where,
            {
              _status: {
                equals: 'published',
              },
            },
          ],
        }

    const result = await payload.find({
      collection: 'pages',
      draft,
      fallbackLocale: false,
      locale: requestedLocale,
      depth,
      limit: 1,
      pagination: false,
      overrideAccess: draft,
      where: scopedWhere,
    })

    return result.docs?.[0] || null
  }

  const hasRenderableLocalizedContent = (page: Awaited<ReturnType<typeof findPage>>) => {
    const placeholderTitles = new Set(['page', 'pagina', 'página', 'trang'])

    if (!page) return false
    if (Array.isArray(page.layout) && page.layout.length > 0) return true
    if (page.hero?.richText) return true

    return (
      typeof page.title === 'string' &&
      page.title.trim().length > 0 &&
      !placeholderTitles.has(page.title.trim().toLowerCase())
    )
  }

  const localizedPage = await findPage(locale)

  if (!hasRenderableLocalizedContent(localizedPage)) return null
  // Draft mode is an authenticated editorial preview perimeter. Preserve its
  // existing locale and slug-fallback behavior without widening public reads.
  if (draft) return localizedPage

  return isWingsGroupV3PublicSurfacePathAllowed({
    locale: locale || 'vi',
    path: requestedPath,
    settings,
    siteCode: site.code,
  }) && isWingsGroupRoutePublic({
    locale: locale || 'vi',
    page: localizedPage,
    settings,
    siteCode: site.code,
  })
    ? localizedPage
    : null
}
