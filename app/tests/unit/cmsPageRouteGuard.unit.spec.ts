import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/(frontend)/cmsPage', () => ({
  generateCmsPageMetadataByPath: vi.fn(),
  renderCmsPageByPath: vi.fn(),
}))

import * as catchAllPageRoute from '@/app/(frontend)/[...slug]/page'

describe('CMS catch-all page route guard', () => {
  it('asserts the catch-all page route exports dynamic = force-dynamic', () => {
    expect(catchAllPageRoute.dynamic).toBe('force-dynamic')
  })
})
