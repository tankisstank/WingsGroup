import type { Post, SiteSetting } from '@/payload-types'

import {
  buildArticleJSONLD,
  buildBreadcrumbListJSONLD,
  buildFAQPageJSONLD,
  buildOrganizationJSONLD,
  buildWebPageJSONLD,
  serializeJsonLd,
} from '@/utilities/structuredData'
import { describe, expect, it } from 'vitest'

const settings = {
  id: 1,
  site: 1,
  siteName: 'WingsGroup',
  tagline: 'Premium travel services',
  seo: {
    canonicalDomain: 'https://wingsgroup.example',
    defaultDescription: 'Default WingsGroup SEO description',
  },
  salesEmail: 'sales@wingsgroup.example',
  supportEmail: 'support@wingsgroup.example',
  supportPhone: '+84123456789',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
} as SiteSetting

describe('structured data builders', () => {
  it('builds site-level Organization from visible site settings', () => {
    const organization = buildOrganizationJSONLD(settings)

    expect(organization['@type']).toBe('Organization')
    expect(organization.name).toBe('WingsGroup')
    expect(organization.url).toBe('https://wingsgroup.example')
    expect(organization.contactPoint).toEqual([
      {
        '@type': 'ContactPoint',
        email: 'support@wingsgroup.example',
        telephone: '+84123456789',
        contactType: 'customer support',
      },
      {
        '@type': 'ContactPoint',
        email: 'sales@wingsgroup.example',
        contactType: 'sales',
      },
    ])
  })

  it('builds WebPage using the shared canonical domain', () => {
    const webpage = buildWebPageJSONLD({
      description: 'About WingsGroup',
      path: '/about',
      settings,
      title: 'About',
    })

    expect(webpage['@type']).toBe('WebPage')
    expect(webpage.url).toBe('https://wingsgroup.example/about')
    expect(webpage.isPartOf).toEqual({
      '@id': 'https://wingsgroup.example#website',
    })
  })

  it('builds Article for post detail pages', () => {
    const post = {
      id: 1,
      title: 'Travel Guide',
      site: 1,
      content: {
        root: {
          type: 'root',
          children: [],
          direction: null,
          format: '',
          indent: 0,
          version: 1,
        },
      },
      meta: {
        description: 'Useful travel guide',
      },
      populatedAuthors: [{ name: 'Wings Editor' }],
      slug: 'travel-guide',
      updatedAt: '2026-01-02T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    } as Post

    const article = buildArticleJSONLD({
      path: '/posts/travel-guide',
      post,
      settings,
    })

    expect(article['@type']).toBe('Article')
    expect(article.headline).toBe('Travel Guide')
    expect(article.mainEntityOfPage).toEqual({
      '@id': 'https://wingsgroup.example/posts/travel-guide#webpage',
    })
  })

  it('defers BreadcrumbList when there is no visible breadcrumb path', () => {
    expect(buildBreadcrumbListJSONLD([{ name: 'Home', path: '/' }], settings)).toBeNull()
  })

  it('builds FAQPage only from complete visible CMS FAQ entries', () => {
    const faq = buildFAQPageJSONLD([
      {
        blockType: 'faq',
        items: [
          { answer: ' Có hỗ trợ 24/7. ', question: 'Có hỗ trợ khẩn cấp?' },
          { answer: 'Không nên xuất hiện', question: ' ' },
        ],
        title: 'Câu hỏi thường gặp',
      },
    ])

    expect(faq).toEqual({
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Có hỗ trợ khẩn cấp?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Có hỗ trợ 24/7.',
          },
        },
      ],
    })
    expect(buildFAQPageJSONLD([])).toBeNull()
  })

  it('serializes JSON-LD safely', () => {
    const serialized = serializeJsonLd({
      '@type': 'WebPage',
      name: '<script>alert(1)</script>',
    })

    expect(serialized).toContain('"@context": "https://schema.org"')
    expect(serialized).not.toContain('<script>')
    expect(JSON.parse(serialized)).toBeDefined()
  })
})
