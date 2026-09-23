import { expect, test } from '@playwright/test'

import { e2eBaseURL } from '../helpers/baseURL'

const enabled = process.env.WINGSSIDE_FULL_TOUR_LOCALE_GATE === 'true'
const publicOrigin = 'https://wingside.vn'
const locales = ['en', 'vi', 'it', 'es', 'pt'] as const

const tourIdentity = (pathname: string) => {
  const segments = pathname.split('/').filter(Boolean)
  const prefixedLocale = locales.includes(segments[0] as (typeof locales)[number])
    ? (segments.shift() as (typeof locales)[number])
    : 'en'
  if (segments.shift() !== 'tour' || segments.length !== 1 || !segments[0]) return null
  return { locale: prefixedLocale, slug: segments[0] }
}

const linkTags = (html: string) =>
  Array.from(html.matchAll(/<link\b[^>]*>/giu), ([tag]) => tag)

const attribute = (tag: string, name: string) =>
  tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'iu'))?.[1] || null

test.describe('WingSide complete tour locale route gate', () => {
  test.skip(!enabled, 'Enable only after applying the reviewed 22-tour editorial locale plan')

  test('serves the exact 110 URL sitemap matrix with reciprocal locale metadata', async ({
    request,
  }) => {
    test.setTimeout(900_000)
    const sitemapResponse = await request.get(`${e2eBaseURL}/pages-sitemap.xml`, {
      headers: { host: 'wingside.vn' },
    })
    expect(sitemapResponse.status()).toBe(200)
    const sitemap = await sitemapResponse.text()
    const tourURLs = Array.from(sitemap.matchAll(/<loc>(.*?)<\/loc>/giu), ([, value]) => value)
      .filter((value): value is string => Boolean(value))
      .filter((value) => new URL(value).pathname.includes('/tour/'))

    expect(tourURLs).toHaveLength(110)
    expect(new Set(tourURLs).size).toBe(110)
    const matrix = new Map<string, Set<string>>()
    for (const value of tourURLs) {
      const url = new URL(value)
      expect(url.origin).toBe(publicOrigin)
      const identity = tourIdentity(url.pathname)
      expect(identity, value).not.toBeNull()
      const localeSet = matrix.get(identity!.slug) || new Set<string>()
      localeSet.add(identity!.locale)
      matrix.set(identity!.slug, localeSet)
    }
    expect(matrix.size).toBe(22)
    for (const [slug, localeSet] of matrix) {
      expect([...localeSet].sort(), slug).toEqual([...locales].sort())
    }

    for (const value of tourURLs) {
      const publicURL = new URL(value)
      const identity = tourIdentity(publicURL.pathname)!
      const response = await request.get(`${e2eBaseURL}${publicURL.pathname}`, {
        headers: { host: 'wingside.vn' },
        timeout: 30_000,
      })
      expect(response.status(), value).toBe(200)
      const html = await response.text()
      expect(html, `${value} html lang`).toMatch(
        new RegExp(`<html\\b[^>]*\\blang=["']${identity.locale}["']`, 'iu'),
      )
      const links = linkTags(html)
      const canonical = links.find((tag) => attribute(tag, 'rel') === 'canonical')
      expect(attribute(canonical || '', 'href'), `${value} canonical`).toBe(value)
      const alternates = links.filter((tag) => attribute(tag, 'rel') === 'alternate')
      expect(
        alternates.some((tag) => attribute(tag, 'hreflang') === 'x-default'),
        `${value} x-default`,
      ).toBe(true)
      const actualAlternates = Object.fromEntries(
        alternates
          .map((tag) => [attribute(tag, 'hreflang'), attribute(tag, 'href')] as const)
          .filter(([locale, href]) => locale && href),
      )
      const expectedAlternates = Object.fromEntries(
        locales.map((locale) => [
          locale,
          `${publicOrigin}${locale === 'en' ? '' : `/${locale}`}/tour/${identity.slug}`,
        ]),
      )
      expectedAlternates['x-default'] = `${publicOrigin}/tour/${identity.slug}`
      expect(actualAlternates, `${value} hreflang`).toEqual(expectedAlternates)
    }
  })
})
