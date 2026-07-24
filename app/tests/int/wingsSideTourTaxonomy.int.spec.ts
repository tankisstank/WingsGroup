import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  siteID: 3,
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return {
    ...actual,
    getPayload: vi.fn(async () => ({ find: mocks.find })),
  }
})
vi.mock('@/utilities/siteContext', () => ({
  appendSiteWhere: vi.fn(async (where?: Record<string, unknown>) => ({
    and: [{ site: { equals: mocks.siteID } }, where],
  })),
  getCurrentSite: vi.fn(async () => ({ code: 'wing-side', id: mocks.siteID })),
}))

import { TourProducts } from '@/collections/TourProducts'
import { getTourProductsByTaxonomy } from '@/tours/queries'

describe('WingSide tour taxonomy query contract', () => {
  beforeEach(() => {
    mocks.find.mockReset()
    mocks.find.mockResolvedValue({
      docs: [
        {
          _status: 'published',
          destinationTags: ['hanoi'],
          id: 1,
          site: 3,
          travelStyles: ['culture'],
        },
      ],
    })
  })

  it('registers governed has-many fields and useful admin columns', () => {
    const destination = TourProducts.fields.find(
      (field) => 'name' in field && field.name === 'destinationTags',
    )
    const style = TourProducts.fields.find(
      (field) => 'name' in field && field.name === 'travelStyles',
    )

    expect(destination).toMatchObject({ hasMany: true, index: true, type: 'select' })
    expect(style).toMatchObject({ hasMany: true, index: true, type: 'select' })
    expect(TourProducts.admin?.defaultColumns).toEqual(
      expect.arrayContaining(['destinationTags', 'travelStyles']),
    )
  })

  it('queries published taxonomy within the current tenant and never overrides public access', async () => {
    await expect(
      getTourProductsByTaxonomy({
        destination: 'hanoi',
        draft: false,
        locale: 'en',
        travelStyle: 'culture',
      }),
    ).resolves.toHaveLength(1)

    const args = mocks.find.mock.calls[0][0]
    expect(args.overrideAccess).toBe(false)
    expect(args.where).toEqual({
      and: [
        { site: { equals: 3 } },
        {
          and: [{ destinationTags: { in: ['hanoi'] } }, { travelStyles: { in: ['culture'] } }],
        },
      ],
    })
  })
})
