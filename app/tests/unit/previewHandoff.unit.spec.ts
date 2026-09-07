import { describe, expect, it, vi } from 'vitest'
import {
  isAuthorizedPreviewFrameRequest,
  mintPreviewHandoff,
  PREVIEW_HANDOFF_COOKIE,
  verifyPreviewHandoff,
} from '@/utilities/previewHandoff'

describe('production preview handoff', () => {
  it('binds a short-lived handoff to its exact page, site and path', async () => {
    vi.stubEnv('PREVIEW_HANDOFF_SECRET', 'unit-handoff-secret')
    const token = await mintPreviewHandoff({ collection: 'pages', documentID: '308', locale: 'vi', path: '/tour/valid', siteCode: 'wings-go' })
    expect(await verifyPreviewHandoff(token)).toMatchObject({ documentID: '308', path: '/tour/valid', siteCode: 'wings-go' })
    expect(await verifyPreviewHandoff(`${token}x`)).toBeNull()
  })

  it('rejects expired and malformed handoffs', async () => {
    vi.stubEnv('PREVIEW_HANDOFF_SECRET', 'unit-handoff-secret')
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-07T00:00:00Z'))
    const token = await mintPreviewHandoff({ collection: 'pages', documentID: '308', locale: 'vi', path: '/tour/valid', siteCode: 'wings-go' })
    vi.advanceTimersByTime(61_000)
    expect(await verifyPreviewHandoff(token)).toBeNull()
    expect(await verifyPreviewHandoff('forged')).toBeNull()
    vi.useRealTimers()
  })

  it('allows only a valid handoff from the CMS origin to frame the bound public path', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PREVIEW_PUBLIC_ORIGINS', 'wings-go=wingsgo.vn')
    vi.stubEnv('PREVIEW_HANDOFF_SECRET', 'unit-handoff-secret')
    const token = await mintPreviewHandoff({
      collection: 'pages',
      documentID: '308',
      locale: 'vi',
      path: '/tour/valid',
      siteCode: 'wings-go',
    })
    const headers = new Headers({
      cookie: `${PREVIEW_HANDOFF_COOKIE}=${token}`,
      referer: 'https://wingsgroup.vn/admin/collections/pages/308',
    })

    await expect(isAuthorizedPreviewFrameRequest({ headers, host: 'wingsgo.vn', pathname: '/tour/valid' })).resolves.toBe(true)
    await expect(isAuthorizedPreviewFrameRequest({ headers, host: 'wingsgo.vn', pathname: '/tour/other' })).resolves.toBe(false)
    await expect(isAuthorizedPreviewFrameRequest({ headers: new Headers({ ...Object.fromEntries(headers), referer: 'https://evil.example/' }), host: 'wingsgo.vn', pathname: '/tour/valid' })).resolves.toBe(false)
    await expect(isAuthorizedPreviewFrameRequest({ headers, host: 'wingsplus.vn', pathname: '/tour/valid' })).resolves.toBe(false)
  })
})
