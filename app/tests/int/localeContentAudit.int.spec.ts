import { describe, expect, it } from 'vitest'

import { publicLocales, type PublicLocaleCode } from '@/i18n/publicCopy'
import {
  auditWingsSideLocaleContent,
  renderLocaleAuditMarkdown,
  type LocaleAuditInput,
  type LocaleAuditPage,
  type LocaleAuditSettings,
} from '../../scripts/lib/localeContentAudit'
import { wingsSideBackfillPaths } from '../../scripts/lib/wingssideLocaleBackfill'

type FeatureGridFixture = {
  items: Array<{
    description: string
    title: string
  }>
}

const localeWord: Record<PublicLocaleCode, string> = {
  en: 'English',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  vi: 'Tiếng Việt',
}

const buildPage = (locale: PublicLocaleCode, pathname: string): LocaleAuditPage => ({
  hero: {
    heading: `${localeWord[locale]} heading`,
    richText: `${localeWord[locale]} intro`,
  },
  layout: [
    {
      blockType: 'featureGrid',
      items: [
        {
          title: `${localeWord[locale]} item`,
          description: `${localeWord[locale]} description`,
        },
      ],
      title: `${localeWord[locale]} section`,
    },
  ],
  meta: {
    description: `${localeWord[locale]} meta description`,
    title: `${localeWord[locale]} meta`,
  },
  pathname,
  title: `${localeWord[locale]} title`,
})

const buildSettings = (locale: PublicLocaleCode): LocaleAuditSettings => ({
  footerNavItems: [
    {
      link: {
        label: `${localeWord[locale]} footer`,
        url: '/',
      },
    },
  ],
  footerNote: `${localeWord[locale]} footer note`,
  headerNavItems: [
    {
      link: {
        label: `${localeWord[locale]} header`,
        url: '/',
      },
    },
  ],
  seo: {
    defaultDescription: `${localeWord[locale]} settings description`,
  },
  tagline: `${localeWord[locale]} tagline`,
})

const buildCompleteInput = (): LocaleAuditInput => ({
  pagesByLocale: Object.fromEntries(
    publicLocales.map((locale) => [
      locale,
      wingsSideBackfillPaths.map((pathname) => buildPage(locale, pathname)),
    ]),
  ),
  settingsByLocale: Object.fromEntries(publicLocales.map((locale) => [locale, buildSettings(locale)])),
})

describe('WingSide locale content audit', () => {
  it('passes complete localized fixture data', () => {
    const result = auditWingsSideLocaleContent(buildCompleteInput())

    expect(result.ok).toBe(true)
    expect(result.findings).toEqual([])
    expect(result.summary.expectedRouteCount).toBe(wingsSideBackfillPaths.length * publicLocales.length)
  })

  it('fails with an exact path for a missing nested block label', () => {
    const input = buildCompleteInput()
    const italianPage = input.pagesByLocale.it?.[0]

    if (!italianPage || !Array.isArray(italianPage.layout)) {
      throw new Error('Fixture setup failed.')
    }

    ;(italianPage.layout[0] as FeatureGridFixture).items[0].title = ''

    const result = auditWingsSideLocaleContent(input)

    expect(result.ok).toBe(false)
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: expect.stringContaining('.layout[0].items[0].title'),
          locale: 'it',
          message: 'Empty localized string.',
        }),
      ]),
    )
  })

  it('fails when an Italian page contains known English fallback copy', () => {
    const input = buildCompleteInput()
    const italianPage = input.pagesByLocale.it?.find((page) => page.pathname === '/destinations/ha-noi')

    if (!italianPage || !Array.isArray(italianPage.layout)) {
      throw new Error('Fixture setup failed.')
    }

    ;(italianPage.layout[0] as FeatureGridFixture).items[0].description =
      'Destination pages should mix overview, practical routing, and conversion cues.'

    const result = auditWingsSideLocaleContent(input)

    expect(result.ok).toBe(false)
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          locale: 'it',
          message: expect.stringContaining('Forbidden wrong-locale marker found'),
          pathname: '/destinations/ha-noi',
        }),
      ]),
    )
  })

  it('allows approved proper nouns while still rendering Markdown findings', () => {
    const input = buildCompleteInput()
    const italianPage = input.pagesByLocale.it?.[0]

    if (!italianPage) {
      throw new Error('Fixture setup failed.')
    }

    italianPage.title = 'WingSide Hanoi Mekong'

    const result = auditWingsSideLocaleContent(input)
    const markdown = renderLocaleAuditMarkdown(result)

    expect(result.ok).toBe(true)
    expect(markdown).toContain('Status: PASS')
  })
})
