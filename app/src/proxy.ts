import { NextResponse, type NextRequest } from 'next/server'

import {
  allSiteAliasToCodeMap,
  getLocaleFromPathname,
  getSiteAliasFromPathname,
} from '@/utilities/sitePaths'

const stripLeadingSegments = (pathname: string, count: number) => {
  const segments = pathname.split('/').filter(Boolean)
  const stripped = segments.slice(count).join('/')

  return stripped ? `/${stripped}` : '/'
}

export function proxy(request: NextRequest) {
  const siteAlias = getSiteAliasFromPathname(request.nextUrl.pathname)
  const locale = getLocaleFromPathname(request.nextUrl.pathname)

  if (!siteAlias) {
    if (!locale) {
      return NextResponse.next()
    }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-locale', locale)
    const url = request.nextUrl.clone()
    url.pathname = stripLeadingSegments(request.nextUrl.pathname, 1)

    return NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    })
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-site-code', allSiteAliasToCodeMap[siteAlias])
  if (locale) {
    requestHeaders.set('x-locale', locale)
  }
  requestHeaders.set('x-site-prefix', `/${siteAlias}${locale ? `/${locale}` : ''}`)
  const url = request.nextUrl.clone()
  url.pathname = stripLeadingSegments(request.nextUrl.pathname, locale ? 2 : 1)

  return NextResponse.rewrite(url, {
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|favicon.svg).*)'],
}
