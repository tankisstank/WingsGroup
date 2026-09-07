import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentSite: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('next/headers', () => ({ draftMode: vi.fn() }))
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }))
vi.mock('@/components/Breadcrumbs', () => ({ Breadcrumbs: vi.fn() }))
vi.mock('@/components/JsonLd', () => ({ JsonLd: vi.fn() }))
vi.mock('@/components/LivePreviewListener', () => ({ LivePreviewListener: vi.fn() }))
vi.mock('@/components/WingsGroupV3/EditorialArticle', () => ({
  WingsGroupEditorialArticle: vi.fn(),
}))
vi.mock('@/utilities/siteContext', () => ({
  getCurrentLocale: vi.fn(),
  getCurrentSite: mocks.getCurrentSite,
}))
vi.mock('@/utilities/getSiteSettings', () => ({ getCurrentSiteSettings: vi.fn() }))
vi.mock('@/utilities/generateMeta', () => ({ generateMeta: vi.fn() }))
vi.mock('@/utilities/siteSEO', () => ({ getCanonicalSiteOrigin: vi.fn() }))
vi.mock('@/utilities/wingsGroupEditorial', () => ({
  WINGSGROUP_EDITORIAL_ARCHIVE_PATH: '/tin-tuc',
  getWingsGroupEditorialOpenGraphMedia: vi.fn(),
  getWingsGroupEditorialPostPath: vi.fn(),
  queryWingsGroupEditorialFallbackMedia: vi.fn(),
  queryWingsGroupEditorialPosts: vi.fn(),
  resolveWingsGroupEditorialMedia: vi.fn(),
  selectWingsGroupEditorialRelatedPosts: vi.fn(),
}))
vi.mock('@/utilities/structuredData', () => ({
  buildArticleJSONLD: vi.fn(),
  buildBreadcrumbListJSONLD: vi.fn(),
  buildWebPageJSONLD: vi.fn(),
}))
vi.mock('@/wingsgroup/corporateRoutes', () => ({
  isWingsGroupEnglishPublicRoute: vi.fn(),
  isWingsGroupV3ExactPublicInventoryEnabled: vi.fn(),
}))
vi.mock('@/utilities/siteURLs', () => ({ getPageCanonicalPath: vi.fn() }))

import EditorialArticlePage, { generateMetadata } from '@/app/(frontend)/tin-tuc/[slug]/page'

describe('WingsGroup editorial article slug boundary', () => {
  beforeEach(() => {
    mocks.getCurrentSite.mockReset()
    mocks.notFound.mockClear()
  })

  it.each([
    ['page render', () => EditorialArticlePage({ params: Promise.resolve({ slug: '%E0%A4%A' }) })],
    ['metadata', () => generateMetadata({ params: Promise.resolve({ slug: '%E0%A4%A' }) })],
  ])('fails malformed percent encoding closed through notFound during %s', async (_label, run) => {
    await expect(run()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mocks.notFound).toHaveBeenCalledOnce()
    expect(mocks.getCurrentSite).not.toHaveBeenCalled()
  })
})
