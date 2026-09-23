const siteScopedCollectionPattern =
  /^(?:\/admin\/collections\/(?:pages|posts|tour-products|departure-variants|tour-departures|tour-campaigns|media|categories|forms|form-submissions|site-settings)|\/api\/(?:pages|posts|tour-products|departure-variants|tour-departures|tour-campaigns|media|categories|forms|form-submissions|site-settings))(?:\/|$)/u

const adminSiteContextPattern =
  /^\/admin(?:\/?$|\/(?:console|page-wizard|theme|site-review)(?:\/|$))/u

const adminCollectionPathPattern = /^\/admin\/collections\/([^/]+)(?:\/|$)/u

export const getAdminSiteScopedCollection = (pathname: string): string | null => {
  const collection = pathname.match(adminCollectionPathPattern)?.[1]
  return collection && siteScopedCollectionPattern.test(pathname) ? collection : null
}

export const isAdminSiteContextPath = (pathname: string): boolean =>
  adminSiteContextPattern.test(pathname) || siteScopedCollectionPattern.test(pathname)

export const getAdminSiteContextID = (search: string): string => {
  const params = new URLSearchParams(search)
  return (
    params.get('site') || params.get('where[site][equals]') || ''
  ).trim()
}

export const withAdminSiteContext = (href: string, siteID?: string): string => {
  if (!siteID) return href

  const url = new URL(href, 'http://wingsgroup-admin.local')
  if (
    !url.pathname.startsWith('/api/') &&
    (adminSiteContextPattern.test(url.pathname) || siteScopedCollectionPattern.test(url.pathname))
  ) {
    url.searchParams.set('site', siteID)
  }

  if (siteScopedCollectionPattern.test(url.pathname)) {
    url.searchParams.set('where[site][equals]', siteID)
  }

  return `${url.pathname}${url.search}${url.hash}`
}
