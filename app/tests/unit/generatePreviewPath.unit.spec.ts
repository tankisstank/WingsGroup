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

    expect(path).toContain('path=%2Fen')
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

    expect(path).toContain('path=%2Fwingsside%2Fen')
  })
})
