import { describe, expect, it, vi } from 'vitest'

import { generatePreviewPath } from '@/utilities/generatePreviewPath'

describe('generatePreviewPath', () => {
  it('keeps root-site preview paths without site alias prefix', async () => {
    const path = await generatePreviewPath({
      collection: 'pages',
      pathname: '/',
      req: {
        locale: 'en',
        payload: {
          findByID: vi.fn(),
        },
      } as never,
      site: {
        code: 'wings-group',
        id: 1,
      } as never,
      slug: 'home',
    })

    expect(new URLSearchParams(path?.split('?')[1]).get('path')).toBe('/')
  })

  it('prefixes child-site preview paths with local site alias', async () => {
    const path = await generatePreviewPath({
      collection: 'pages',
      pathname: '/',
      req: {
        locale: 'en',
        payload: {
          findByID: vi.fn(),
        },
      } as never,
      site: {
        code: 'wing-side',
        id: 3,
      } as never,
      slug: 'wings-side-home',
    })

    const params = new URLSearchParams(path?.split('?')[1])
    expect(params.get('path')).toBe('/')
    expect(path).not.toContain('localhost')
    expect(path).not.toContain('wingsgo')
    expect(params.get('previewSecret')).toBeNull()
  })

  it('keeps a persisted Page pathname rather than falling back to its site-prefixed slug', async () => {
    const path = await generatePreviewPath({
      collection: 'pages', id: 308,
      pathname: '/tour/tour-6n5d-hang-chau-o-tran-thuong-hai-hang-chau-bay-ca-dcv-265869',
      req: { locale: 'vi', payload: { findByID: vi.fn() } } as never,
      site: { code: 'wings-go', id: 2 } as never,
      slug: 'wings-go-tour-6n5d-hang-chau-o-tran-thuong-hai-hang-chau-bay-ca-dcv-265869',
    })
    const params = new URLSearchParams(path?.split('?')[1])
    expect(params.get('path')).toBe('/tour/tour-6n5d-hang-chau-o-tran-thuong-hai-hang-chau-bay-ca-dcv-265869')
    expect(params.get('id')).toBe('308')
  })

  it('uses the documented fallback only when pathname is absent', async () => {
    const path = await generatePreviewPath({ collection: 'pages', id: 1, pathname: null, req: { locale: 'vi' } as never, slug: 'fallback' })
    expect(new URLSearchParams(path?.split('?')[1]).get('path')).toBe('/fallback')
  })
})
