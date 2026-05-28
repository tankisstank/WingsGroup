import { NextResponse, type NextRequest } from 'next/server'

import { getLocaleFromPathname, getSiteAliasFromPathname, siteAliasToCodeMap } from '@/utilities/sitePaths'

export function proxy(request: NextRequest) {
  const siteAlias = getSiteAliasFromPathname(request.nextUrl.pathname)
  const locale = getLocaleFromPathname(request.nextUrl.pathname)

  if (!siteAlias) {
    if (!locale) {
      return NextResponse.next()
    }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-locale', locale)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-site-code', siteAliasToCodeMap[siteAlias])
  if (locale) {
    requestHeaders.set('x-locale', locale)
  }
  requestHeaders.set('x-site-prefix', `/${siteAlias}${locale ? `/${locale}` : ''}`)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|favicon.svg).*)'],
}
