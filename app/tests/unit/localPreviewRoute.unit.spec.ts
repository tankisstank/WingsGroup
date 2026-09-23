import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), findByID: vi.fn(), getPayload: vi.fn() }))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: mocks.getPayload }))

import { GET } from '@/app/(frontend)/next/preview/route'
import { verifyPreviewHandoff } from '@/utilities/previewHandoff'

describe('preview handoff initializer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PREVIEW_HANDOFF_SECRET', 'route-handoff-secret')
    vi.stubEnv('PREVIEW_PUBLIC_ORIGINS', 'wings-go=wingsgo.vn')
    mocks.auth.mockResolvedValue({ user: { id: 77, role: 'super-admin' } })
    mocks.findByID.mockResolvedValue({
      id: 308,
      pathname: '/tour/tour-6n5d-hang-chau-o-tran-thuong-hai-hang-chau-bay-ca-dcv-265869',
      site: { code: 'wings-go', primaryDomain: 'wingsgo.vn' },
    })
    mocks.getPayload.mockResolvedValue({ auth: mocks.auth, findByID: mocks.findByID })
  })

  it('uses the persisted pathname and sends its bounded token only in a POST body', async () => {
    const response = await GET(new NextRequest('https://wingsgroup.vn/next/preview?collection=pages&id=308&path=%2Fforged'))
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html).toContain('action="https://wingsgo.vn/next/preview/handoff"')
    expect(response.headers.get('Content-Security-Policy')).toBe("form-action 'self' https://wingsgo.vn")
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(html).toContain('name="handoff"')
    expect(html).not.toContain('localhost')
    expect(html).not.toContain('PREVIEW_SECRET')
    expect(html).not.toContain('/forged')
  })

  it('rejects unauthenticated and malformed requests before issuing a handoff', async () => {
    mocks.auth.mockResolvedValue({ user: null })
    expect((await GET(new NextRequest('https://wingsgroup.vn/next/preview?collection=pages&id=308&path=%2Ftour'))).status).toBe(403)
    expect((await GET(new NextRequest('https://wingsgroup.vn/next/preview?collection=pages&id=308&path=https%3A%2F%2Fevil.example'))).status).toBe(404)
  })

  it('does not use a stale local CMS domain as a production preview target', async () => {
    mocks.findByID.mockResolvedValue({
      id: 308,
      pathname: '/tour/tour-6n5d-hang-chau-o-tran-thuong-hai-hang-chau-bay-ca-dcv-265869',
      site: { code: 'wings-go', primaryDomain: 'wingsgo.local' },
    })

    const response = await GET(new NextRequest('https://wingsgroup.vn/next/preview?collection=pages&id=308&path=%2Ftour'))
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html).toContain('action="https://wingsgo.vn/next/preview/handoff"')
    expect(html).not.toContain('wingsgo.local')
  })

  it('puts a public non-default locale in the signed preview path', async () => {
    mocks.findByID.mockResolvedValue({
      _status: 'draft',
      id: 308,
      pathname: '/tour/tour-6n5d-hang-chau-o-tran-hai',
      site: {
        code: 'wings-go',
        defaultLocale: 'vi',
        isActive: true,
        primaryDomain: 'wingsgo.vn',
        supportedLocales: ['vi', 'en'],
      },
    })

    const response = await GET(
      new NextRequest(
        'https://wingsgroup.vn/next/preview?collection=pages&id=308&locale=en&path=%2Fforged',
      ),
    )
    const html = await response.text()
    const token = html.match(/name="handoff" value="([^"]+)"/u)?.[1]

    expect(response.status).toBe(200)
    await expect(verifyPreviewHandoff(token)).resolves.toMatchObject({
      defaultLocale: 'vi',
      locale: 'en',
      path: '/tour/tour-6n5d-hang-chau-o-tran-hai',
    })
  })

  it('marks a saved draft as existing only when its published version is readable', async () => {
    mocks.findByID.mockImplementation(
      async (args: { collection?: string; disableErrors?: boolean; draft?: boolean }) => {
        if (args.collection === 'sites') return { code: 'wings-go', isActive: true }
        return args.draft
          ? {
              _status: 'draft',
              id: 308,
              slug: 'saved-draft',
              site: { code: 'wings-go' },
              wrapperPage: 909,
            }
          : { _status: 'published', id: 308, slug: 'saved-draft', wrapperPage: 909 }
      },
    )

    const response = await GET(
      new NextRequest(
        'https://wingsgroup.vn/next/preview?collection=tour-products&id=308&locale=en&path=%2Ftour%2Fsaved-draft',
      ),
    )
    const token = (await response.text()).match(/name="handoff" value="([^"]+)"/u)?.[1]

    await expect(verifyPreviewHandoff(token)).resolves.toMatchObject({
      collection: 'tour-products',
      hasPublishedVersion: true,
      mode: 'draft',
    })
    expect(mocks.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ disableErrors: true, draft: false }),
    )
  })

  it('marks a new draft as unpublished without falling back to a published document', async () => {
    mocks.findByID.mockImplementation(
      async (args: { collection?: string; disableErrors?: boolean; draft?: boolean }) => {
        if (args.collection === 'sites') return { code: 'wings-go', isActive: true }
        return args.draft
          ? {
              _status: 'draft',
              id: 309,
              slug: 'new-draft',
              site: { code: 'wings-go' },
              wrapperPage: 910,
            }
          : null
      },
    )

    const response = await GET(
      new NextRequest(
        'https://wingsgroup.vn/next/preview?collection=tour-products&id=309&locale=en&path=%2Ftour%2Fnew-draft',
      ),
    )
    const token = (await response.text()).match(/name="handoff" value="([^"]+)"/u)?.[1]

    await expect(verifyPreviewHandoff(token)).resolves.toMatchObject({
      collection: 'tour-products',
      hasPublishedVersion: false,
      mode: 'draft',
    })
  })

  it('returns an actionable conflict when a tour draft has no wrapper page', async () => {
    mocks.findByID.mockResolvedValue({
      _status: 'draft',
      id: 111,
      slug: 'draft-without-wrapper',
      site: { code: 'wings-go', isActive: true },
      wrapperPage: null,
    })

    const response = await GET(
      new NextRequest(
        'https://wingsgroup.vn/next/preview?collection=tour-products&id=111&locale=vi&path=%2Ftour%2Fdraft-without-wrapper',
      ),
    )

    expect(response.status).toBe(409)
    await expect(response.text()).resolves.toContain('linked wrapper page')
  })

  it('keeps a WingSide English default and prefixes its public Italian preview', async () => {
    vi.stubEnv('PREVIEW_PUBLIC_ORIGINS', 'wing-side=wingside.vn')
    mocks.findByID.mockResolvedValue({
      _status: 'draft',
      id: 501,
      pathname: '/discover-vietnam',
      site: {
        code: 'wing-side',
        defaultLocale: 'en',
        isActive: true,
        primaryDomain: 'wingside.vn',
        supportedLocales: ['en', 'it'],
      },
    })

    const response = await GET(
      new NextRequest(
        'https://wingsgroup.vn/next/preview?collection=pages&id=501&locale=it&path=%2Fforged',
      ),
    )
    const html = await response.text()
    const token = html.match(/name="handoff" value="([^"]+)"/u)?.[1]

    expect(response.status).toBe(200)
    expect(html).toContain('action="https://wingside.vn/next/preview/handoff"')
    await expect(verifyPreviewHandoff(token)).resolves.toMatchObject({
      defaultLocale: 'en',
      locale: 'it',
      path: '/discover-vietnam',
      siteCode: 'wing-side',
    })
  })

  it('rejects a CMS-only locale before reading a document', async () => {
    const response = await GET(
      new NextRequest(
        'https://wingsgroup.vn/next/preview?collection=pages&id=308&locale=ja&path=%2Ftour',
      ),
    )

    expect(response.status).toBe(404)
    expect(mocks.getPayload).not.toHaveBeenCalled()
  })

  it('fails closed when no public destination is allowlisted', async () => {
    vi.stubEnv('PREVIEW_PUBLIC_ORIGINS', '')
    expect((await GET(new NextRequest('https://wingsgroup.vn/next/preview?collection=pages&id=308&path=%2Ftour'))).status).toBe(503)
  })
})
