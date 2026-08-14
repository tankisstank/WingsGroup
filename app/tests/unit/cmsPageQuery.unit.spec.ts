import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  WINGSGROUP_CONTENT_VALIDATION_MARKER,
  WINGSGROUP_LEGAL_IDENTITY,
} from '@/wingsgroup/corporateRoutes'

const mocks = vi.hoisted(() => ({
  draftMode: vi.fn(),
  find: vi.fn(),
  settings: {} as Record<string, unknown>,
  site: { code: 'wings-group', id: 1 },
}))

vi.mock('next/headers', () => ({ draftMode: mocks.draftMode }))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({ find: mocks.find })) }))
vi.mock('@/utilities/getSiteSettings', () => ({
  getCurrentSiteSettings: vi.fn(async () => mocks.settings),
}))
vi.mock('@/utilities/siteContext', () => ({
  appendSiteWhere: vi.fn(async (where: Record<string, unknown>) => ({
    and: [{ site: { equals: mocks.site.id } }, where],
  })),
  getCurrentSite: vi.fn(async () => mocks.site),
}))

import { queryPageByPath } from '@/utilities/cmsPageQuery'

const wingsGroupSettings = {
  wingsGroupV3: {
    enabled: true,
    englishPublicationState: 'hidden',
    legalIdentity: WINGSGROUP_LEGAL_IDENTITY,
  },
}

const contactPage = {
  _status: 'published',
  id: 6,
  layout: [{ blockType: 'content' }],
  pathname: '/lien-he',
  site: 1,
  slug: 'lien-he',
  title: 'Liên hệ',
  wingsGroupRoute: {
    archetype: 'contact',
    contentApproval: {
      en: WINGSGROUP_CONTENT_VALIDATION_MARKER,
      vi: WINGSGROUP_CONTENT_VALIDATION_MARKER,
    },
    managedBy: 'wingsgroup-v3',
    publication: { en: 'hidden', vi: 'approved' },
  },
}

describe('CMS page requested-path perimeter', () => {
  beforeEach(() => {
    mocks.draftMode.mockResolvedValue({ isEnabled: false })
    mocks.find.mockReset()
    mocks.find.mockResolvedValue({ docs: [contactPage] })
    mocks.site = { code: 'wings-group', id: 1 }
    mocks.settings = wingsGroupSettings
  })

  it('rejects a nested Vietnamese alias before the slug fallback can resolve it', async () => {
    await expect(
      queryPageByPath({ locale: 'vi', requestedPath: '/foo/lien-he' }),
    ).resolves.toBeNull()
    expect(mocks.find).not.toHaveBeenCalled()
  })

  it.each(['/lien-he', '/foo/lien-he', '/en/lien-he', '/en/foo/lien-he'])(
    'rejects hidden English or locale-prefixed path %s before lookup',
    async (requestedPath) => {
      await expect(queryPageByPath({ locale: 'en', requestedPath })).resolves.toBeNull()
      expect(mocks.find).not.toHaveBeenCalled()
    },
  )

  it.each(['/lien-he', '/foo/lien-he'])(
    'preserves trusted draft English lookup for shared path %s',
    async (requestedPath) => {
      mocks.draftMode.mockResolvedValue({ isEnabled: true })

      await expect(queryPageByPath({ locale: 'en', requestedPath })).resolves.toEqual(contactPage)
      expect(mocks.find).toHaveBeenCalledTimes(1)
      expect(mocks.find).toHaveBeenCalledWith(
        expect.objectContaining({
          draft: true,
          locale: 'en',
          overrideAccess: true,
        }),
      )
    },
  )

  it('still resolves an exact governed Vietnamese path', async () => {
    await expect(queryPageByPath({ locale: 'vi', requestedPath: '/lien-he' })).resolves.toEqual(
      contactPage,
    )
    expect(mocks.find).toHaveBeenCalledTimes(1)
  })

  it('preserves nested slug fallback behavior for other tenants', async () => {
    const wingsGoPage = { ...contactPage, site: 2, wingsGroupRoute: null }
    mocks.site = { code: 'wings-go', id: 2 }
    mocks.settings = {}
    mocks.find.mockResolvedValue({ docs: [wingsGoPage] })

    await expect(
      queryPageByPath({ locale: 'vi', requestedPath: '/foo/lien-he' }),
    ).resolves.toEqual(wingsGoPage)
    expect(mocks.find).toHaveBeenCalledTimes(1)
  })
})
