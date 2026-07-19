import { getPublicRoutePathname } from '@/utilities/sitePaths'
import { describe, expect, it } from 'vitest'

describe('getPublicRoutePathname', () => {
  it.each([
    '/',
    '/en',
    '/it',
    '/es',
    '/pt',
    '/vi',
    '/wingsside',
    '/wingsside/en',
    '/wingsside/it/',
    '/wingsside/es',
    '/wingsside/pt',
    '/wingsside/vi',
  ])('normalizes Home route identity for %s', (pathname) =>
    expect(getPublicRoutePathname(pathname)).toBe('/'),
  )

  it.each([
    ['/packages', '/packages'],
    ['/en/packages', '/packages'],
    ['/it/packages/', '/packages'],
    ['/es/packages', '/packages'],
    ['/pt/packages', '/packages'],
    ['/vi/packages', '/packages'],
    ['/wingsside/packages', '/packages'],
    ['/wingsside/en/packages', '/packages'],
    ['/wingsside/it/packages', '/packages'],
    ['/wingsside/es/packages?campaign=hot#offers', '/packages'],
    ['/wingsside/pt/packages', '/packages'],
    ['/wingsside/vi/packages', '/packages'],
    ['/wingsside/pt/tour/example', '/tour/example'],
  ])('normalizes %s to %s', (pathname, expected) => {
    expect(getPublicRoutePathname(pathname)).toBe(expected)
  })
})
