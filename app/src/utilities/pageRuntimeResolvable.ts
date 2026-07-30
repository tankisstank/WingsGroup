import type { SupportedLocaleCode } from './sitePaths'
import type { hasMatchingWingSideTourWrapper as matchWingSideTourWrapper } from '@/tours/wingsSideTourViewModel'

type RenderablePageLike = {
  hero?: null | { richText?: unknown }
  layout?: null | unknown[]
  title?: null | string
}

type TourWrapperPageLike = {
  id?: number | string
}

type TourDataLike = {
  tour?: Parameters<typeof matchWingSideTourWrapper>[0]
}

const placeholderTitles = new Set(['page', 'pagina', 'página', 'trang'])

export const hasRenderableLocalizedPageContent = (page?: null | RenderablePageLike): boolean => {
  if (!page) return false

  if (Array.isArray(page.layout) && page.layout.length > 0) return true
  if (page.hero?.richText) return true

  return (
    typeof page.title === 'string' &&
    page.title.trim().length > 0 &&
    !placeholderTitles.has(page.title.trim().toLowerCase())
  )
}

export const getStructuredTourSlugFromPath = (pathname: string): string | null => {
  const segments = pathname.split('/').filter(Boolean)

  return segments.length === 2 && segments[0] === 'tour' && segments[1] ? segments[1] : null
}

export const isRuntimeResolvablePage = async ({
  getResolvedTourDetailBySlug,
  hasMatchingWingSideTourWrapper,
  locale,
  page,
  pathname,
  siteCode,
}: {
  getResolvedTourDetailBySlug?: (args: {
    draft: false
    fallbackLocale: false
    locale: SupportedLocaleCode
    slug: string
  }) => Promise<TourDataLike | null>
  hasMatchingWingSideTourWrapper?: typeof matchWingSideTourWrapper
  locale: SupportedLocaleCode
  page?: null | (RenderablePageLike & TourWrapperPageLike)
  pathname: string
  siteCode?: null | string
}): Promise<boolean> => {
  if (!hasRenderableLocalizedPageContent(page)) return false

  const tourSlug = siteCode === 'wing-side' ? getStructuredTourSlugFromPath(pathname) : null
  if (!tourSlug) return true

  if (!page?.id || !getResolvedTourDetailBySlug || !hasMatchingWingSideTourWrapper) {
    return false
  }

  const tourData = await getResolvedTourDetailBySlug({
    draft: false,
    fallbackLocale: false,
    locale,
    slug: tourSlug,
  })

  return Boolean(tourData?.tour && hasMatchingWingSideTourWrapper(tourData.tour, page.id))
}
