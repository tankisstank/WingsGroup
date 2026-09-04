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
    '/wing-side',
    '/wing-side/en',
    '/wing-side/it/',
    '/wing-side/es',
    '/wing-side/pt',
    '/wing-side/vi',
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
    ['/wing-side/packages', '/packages'],
    ['/wing-side/en/packages', '/packages'],
    ['/wing-side/it/packages', '/packages'],
    ['/wing-side/es/packages?campaign=hot#offers', '/packages'],
    ['/wing-side/pt/packages', '/packages'],
    ['/wing-side/vi/packages', '/packages'],
    ['/wing-side/pt/tour/example', '/tour/example'],
  ])('normalizes %s to %s', (pathname, expected) => {
    expect(getPublicRoutePathname(pathname)).toBe(expected)
  })
})
