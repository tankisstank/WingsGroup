import { describe, expect, it, vi } from 'vitest'

import { reconcileCmsProof } from '../../scripts/lib/cmsLifecycleProofRecovery'
import type { OwnedFixtureIDs } from '../../scripts/lib/cmsLifecycleProofSafety'

const marker = '[proof:12345678-1234-1234-1234-123456789abc]'
const ownedIDs = (): OwnedFixtureIDs => ({
  departureID: null,
  productID: null,
  siteID: 2,
  slug: 'cms-qa-20261022-recovery',
  wrapperID: null,
})

describe('CMS proof ownership recovery', () => {
  it('recovers all ambiguous commits using the exact run marker and site', async () => {
    const owned = ownedIDs()
    const request = vi.fn(async (endpoint: string) => {
      const url = new URL(endpoint, 'https://wingsgroup.vn')
      expect(url.searchParams.get('where[and][0][site][equals]')).toBe('2')
      const doc = url.pathname.endsWith('tour-products')
        ? { id: 100, site: 2, slug: owned.slug, title: `QA ONLY ${marker}` }
        : url.pathname.endsWith('tour-departures')
          ? { id: 200, site: 2, tourProduct: 100, variantKey: marker }
          : { id: 300, site: 2, pathname: `/tour/${owned.slug}`, title: marker }
      return { data: { docs: [doc] }, status: 200 }
    })

    await reconcileCmsProof({ request } as never, owned, marker)
    expect(owned).toMatchObject({ productID: 100, departureID: 200, wrapperID: 300 })
    expect(request).toHaveBeenCalledTimes(3)
  })

  it.each([
    { site: 2, title: 'QA ONLY [proof:another-run]' },
    { site: 1, title: marker },
  ])('refuses an unowned or foreign record: %o', async (doc) => {
    const owned = ownedIDs()
    const request = vi.fn(async () => ({
      data: { docs: [{ id: 999, slug: owned.slug, ...doc }] },
      status: 200,
    }))

    await expect(reconcileCmsProof({ request } as never, owned, marker)).rejects.toThrow()
    expect(owned.productID).toBeNull()
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('does not treat a failed lookup as proof of absence', async () => {
    const owned = ownedIDs()
    const request = vi.fn().mockRejectedValue(new Error('Network unavailable'))

    await expect(reconcileCmsProof({ request }, owned, marker)).rejects.toThrow('Network unavailable')
    expect(owned.productID).toBeNull()
  })
})
