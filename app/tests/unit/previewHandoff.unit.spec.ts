import { describe, expect, it, vi } from 'vitest'
import { mintPreviewHandoff, verifyPreviewHandoff } from '@/utilities/previewHandoff'

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
})
