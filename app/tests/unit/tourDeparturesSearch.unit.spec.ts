import { describe, expect, it } from 'vitest'
import { TourDepartures } from '@/collections/TourDepartures'
import { mergeListSearchAndWhere } from 'payload/shared'
import type { SanitizedCollectionConfig, Where } from 'payload'

describe('TourDepartures collection search configuration', () => {
  it('configures listSearchableFields with tourProduct.title and departure metadata', () => {
    expect(TourDepartures.admin?.listSearchableFields).toEqual([
      'tourProduct.title',
      'departureCity',
      'flightNumber',
      'airline',
      'variantKey',
      'inventoryIdentity',
    ])
  })

  it('merges list search into where condition querying all configured fields', () => {
    const where = mergeListSearchAndWhere({
      collectionConfig: TourDepartures as unknown as SanitizedCollectionConfig,
      search: 'SING',
      where: {},
    })

    expect(where).toEqual({
      or: [
        { 'tourProduct.title': { like: 'SING' } },
        { departureCity: { like: 'SING' } },
        { flightNumber: { like: 'SING' } },
        { airline: { like: 'SING' } },
        { variantKey: { like: 'SING' } },
        { inventoryIdentity: { like: 'SING' } },
      ],
    })
  })

  it('keeps site and publication filters outside the search OR', () => {
    const filters: Where = {
      and: [{ site: { equals: 2 } }, { _status: { equals: 'published' } }],
    }
    const where = mergeListSearchAndWhere({
      collectionConfig: TourDepartures as unknown as SanitizedCollectionConfig,
      search: 'SING',
      where: filters,
    })

    expect(where).toEqual({
      and: [
        { site: { equals: 2 } },
        { _status: { equals: 'published' } },
        {
          or: TourDepartures.admin?.listSearchableFields?.map((field) => ({
            [field]: { like: 'SING' },
          })),
        },
      ],
    })
  })
})
