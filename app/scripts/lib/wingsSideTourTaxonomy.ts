import { createHash } from 'node:crypto'

import {
  normalizeTourDestinationKeys,
  normalizeTourTravelStyleKeys,
  type TourDestinationKey,
  type TourTravelStyleKey,
} from '../../src/tours/taxonomy'

export const wingsSideTourTaxonomyBatchID = 'wingsside-bestprice-22-20260717'
export const wingsSideTourTaxonomyExpectedCount = 22
export const wingsSideTourTaxonomyMappingRevision = 'us-049-v1-20260724'
export const wingsSideTourTaxonomySiteCode = 'wing-side'

type JSONRecord = Record<string, unknown>

export type TourTaxonomyDocument = {
  _status?: null | string
  destinationTags?: null | TourDestinationKey[]
  id: number | string
  site?: number | string | { id: number | string } | null
  slug?: null | string
  sourceProvenance?: null | JSONRecord
  taxonomyProvenance?: null | JSONRecord
  title?: null | string
  travelStyles?: null | TourTravelStyleKey[]
  wrapperPage?: number | string | { id: number | string } | null
}

export type TourTaxonomyMapping = {
  destinations: TourDestinationKey[]
  evidence: string
  sourceID: string
  styles: TourTravelStyleKey[]
}

export type TourTaxonomySnapshot = {
  destinationTags: TourDestinationKey[]
  taxonomyProvenance: JSONRecord | null
  travelStyles: TourTravelStyleKey[]
}

export type TourTaxonomyPlanRecord = {
  action: 'unchanged' | 'update'
  after: TourTaxonomySnapshot
  before: TourTaxonomySnapshot
  id: number | string
  integrityChecksum: string
  provenanceChecksum: string
  slug: string
  sourceID: string
}

export const wingsSideTourTaxonomyMappings: readonly TourTaxonomyMapping[] = [
  {
    sourceID: 'halong-bay-tours--discover-halong-bay-ninh-binh-2-days',
    destinations: ['halong', 'ninh-binh'],
    styles: ['culture', 'adventure'],
    evidence: 'Itinerary: Hanoi–Halong day cruise, Hoa Lu and Tam Coc.',
  },
  {
    sourceID: 'indochina-tours--best-of-vietnam-and-cambodia-15-days',
    destinations: ['hanoi', 'halong', 'hoian', 'ho-chi-minh-city', 'mekong', 'siem-reap'],
    styles: ['culture'],
    evidence: '15-day itinerary names Hanoi, Halong, Hoi An, Mekong and Siem Reap.',
  },
  {
    sourceID: 'mekong-delta-tours--luxury-mekong-delta-speedboat-tour-full-day',
    destinations: ['mekong'],
    styles: ['luxury', 'adventure'],
    evidence: 'Supplier route is a luxury Mekong Delta speedboat experience.',
  },
  {
    sourceID: 'mekong-delta-tours--mekong-delta-gateway-3-days',
    destinations: ['mekong'],
    styles: ['culture'],
    evidence: 'Itinerary covers Cai Be, Sa Dec and Can Tho.',
  },
  {
    sourceID: 'mekong-delta-tours--mekong-delta-with-floating-market-2-days',
    destinations: ['mekong'],
    styles: ['culture'],
    evidence: 'Itinerary covers Ben Tre, Can Tho and Cai Rang floating market.',
  },
  {
    sourceID: 'ninh-binh-tours--ninh-binh-hoa-lu-trang-an-full-day-private-tour',
    destinations: ['ninh-binh'],
    styles: ['culture'],
    evidence: 'Supplier title and route name Hoa Lu and Trang An.',
  },
  {
    sourceID: 'ninh-binh-tours--ninh-binh-tam-coc-mua-cave-private-tour-from-hanoi',
    destinations: ['ninh-binh'],
    styles: ['adventure'],
    evidence: 'Supplier route names Tam Coc and Mua Cave in Ninh Binh.',
  },
  {
    sourceID: 'sapa-tours--sapa-trekking-ethnic-market-3-days',
    destinations: ['sapa'],
    styles: ['culture', 'adventure'],
    evidence: 'Itinerary includes village trekking and Bac Ha ethnic market.',
  },
  {
    sourceID: 'vietnam-tours--a-glimpse-of-the-central-vietnam-5-days',
    destinations: ['hue', 'hoian'],
    styles: ['culture'],
    evidence: 'Itinerary covers Hue Imperial City, Hoi An and My Son.',
  },
  {
    sourceID: 'vietnam-tours--best-of-northern-vietnam-6-days',
    destinations: ['hanoi', 'halong', 'sapa'],
    styles: ['culture', 'adventure'],
    evidence: 'Itinerary covers Hanoi, Sapa trekking, Fansipan and Halong cruise.',
  },
  {
    sourceID: 'vietnam-tours--best-of-south-vietnam-5-days',
    destinations: ['ho-chi-minh-city', 'mekong'],
    styles: ['culture'],
    evidence: 'Itinerary covers Ho Chi Minh City, Cu Chi and Mekong Delta.',
  },
  {
    sourceID: 'vietnam-tours--central-vietnam-adventure-4-days',
    destinations: ['hue', 'hoian'],
    styles: ['adventure'],
    evidence: 'Itinerary includes Hue zipline, Hai Van motorbike route and Hoi An ecotour.',
  },
  {
    sourceID: 'vietnam-tours--da-nang-hoi-an-ba-na-hills-5-days',
    destinations: ['hue', 'da-nang', 'hoian'],
    styles: ['family', 'culture'],
    evidence: 'Itinerary names Da Nang, Ba Na Hills, Hue and Hoi An.',
  },
  {
    sourceID: 'vietnam-tours--deep-in-love-in-phu-quoc-5-days',
    destinations: ['ho-chi-minh-city', 'phu-quoc'],
    styles: ['wellness', 'romance'],
    evidence: 'Couples itinerary combines Saigon dinner cruise and Phu Quoc retreat.',
  },
  {
    sourceID: 'vietnam-tours--highlights-of-vietnam-12-days',
    destinations: ['hanoi', 'halong', 'hue', 'hoian', 'ho-chi-minh-city', 'mekong'],
    styles: ['culture'],
    evidence: 'North-to-south itinerary explicitly covers all assigned destinations.',
  },
  {
    sourceID: 'vietnam-tours--hoi-an-surrounding-and-beach-break-7days',
    destinations: ['da-nang', 'hoian'],
    styles: ['culture', 'wellness'],
    evidence: 'Itinerary centers on Hoi An heritage, My Son, Ba Na Hills and beach rest.',
  },
  {
    sourceID: 'vietnam-tours--northern-vietnam-highlights-for-family-6-days',
    destinations: ['hanoi', 'halong'],
    styles: ['family', 'culture'],
    evidence: 'Supplier marks the tour for families; itinerary covers Hanoi and Halong.',
  },
  {
    sourceID: 'vietnam-tours--northern-vietnam-soft-adventure-8-days',
    destinations: ['hanoi', 'halong', 'ninh-binh', 'mai-chau'],
    styles: ['culture', 'adventure'],
    evidence: 'Itinerary includes cycling, village stays, Ninh Binh and Halong cruise.',
  },
  {
    sourceID: 'vietnam-tours--southern-beauty-and-relaxation-8-days',
    destinations: ['ho-chi-minh-city', 'mekong', 'ninh-thuan'],
    styles: ['adventure', 'wellness'],
    evidence: 'Itinerary covers Saigon, Ben Tre and multi-day Ninh Thuan beach relaxation.',
  },
  {
    sourceID: 'vietnam-tours--vietnam-at-a-glance-7-days',
    destinations: ['hanoi', 'halong', 'ho-chi-minh-city', 'mekong'],
    styles: ['culture'],
    evidence: 'Itinerary covers Hanoi, Halong, Saigon, Cu Chi and Mekong Delta.',
  },
  {
    sourceID: 'vietnam-tours--vietnam-luxury-wellness-retreat-escape-8-days',
    destinations: ['hanoi', 'mai-chau', 'da-nang', 'hoian'],
    styles: ['luxury', 'culture', 'wellness'],
    evidence: 'Luxury itinerary covers Hanoi, Mai Chau and a Hoi An wellness retreat.',
  },
  {
    sourceID: 'vietnam-tours--vietnam-memorable-honeymoon-trip-8-days',
    destinations: ['hanoi', 'halong', 'ninh-binh', 'da-nang', 'hoian'],
    styles: ['culture', 'romance'],
    evidence: 'Honeymoon itinerary names Hanoi, Ninh Binh, Halong, Da Nang and Hoi An.',
  },
] as const

export const taxonomyRelationID = (
  value: TourTaxonomyDocument['site'] | TourTaxonomyDocument['wrapperPage'],
) => {
  if (typeof value === 'number' || typeof value === 'string') return value
  return value?.id ?? null
}

const canonicalizeTaxonomyValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalizeTaxonomyValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalizeTaxonomyValue(entry)]),
    )
  }
  return value
}

export const taxonomyChecksum = (value: unknown) => {
  const serialized = JSON.stringify(canonicalizeTaxonomyValue(value))
  if (serialized === undefined) throw new Error('Taxonomy checksum value is not JSON-serializable')
  return createHash('sha256').update(serialized).digest('hex')
}

export const extractTourTaxonomySnapshot = (
  document: TourTaxonomyDocument,
): TourTaxonomySnapshot => ({
  destinationTags: normalizeTourDestinationKeys(document.destinationTags ?? []),
  taxonomyProvenance: document.taxonomyProvenance ?? null,
  travelStyles: normalizeTourTravelStyleKeys(document.travelStyles ?? []),
})

const sourceIDFor = (document: TourTaxonomyDocument) => {
  const sourceID = document.sourceProvenance?.sourceId
  return typeof sourceID === 'string' ? sourceID : ''
}

export const validateTourTaxonomyMappings = (
  mappings: readonly TourTaxonomyMapping[] = wingsSideTourTaxonomyMappings,
) => {
  const sourceIDs = new Set<string>()
  for (const mapping of mappings) {
    if (!mapping.sourceID || sourceIDs.has(mapping.sourceID)) {
      throw new Error(`Duplicate or missing taxonomy source ID: ${mapping.sourceID}`)
    }
    sourceIDs.add(mapping.sourceID)
    if (!mapping.evidence.trim()) throw new Error(`Missing evidence for ${mapping.sourceID}`)
    if (!mapping.destinations.length || !mapping.styles.length) {
      throw new Error(`Incomplete taxonomy for ${mapping.sourceID}`)
    }
    normalizeTourDestinationKeys(mapping.destinations)
    normalizeTourTravelStyleKeys(mapping.styles)
  }
  if (mappings.length !== wingsSideTourTaxonomyExpectedCount) {
    throw new Error(
      `Expected ${wingsSideTourTaxonomyExpectedCount} mappings, found ${mappings.length}`,
    )
  }
}

export const assertTourTaxonomyScope = ({
  documents,
  siteID,
  wrapperSiteByID,
}: {
  documents: TourTaxonomyDocument[]
  siteID: number | string
  wrapperSiteByID: Map<string, number | string>
}) => {
  if (documents.length !== wingsSideTourTaxonomyExpectedCount) {
    throw new Error(
      `Expected ${wingsSideTourTaxonomyExpectedCount} scoped TourProducts, found ${documents.length}`,
    )
  }
  const ids = new Set(documents.map(({ id }) => String(id)))
  const sourceIDs = new Set(documents.map(sourceIDFor))
  if (ids.size !== documents.length) throw new Error('Scoped TourProducts contain duplicate IDs')
  if (sourceIDs.size !== documents.length || sourceIDs.has('')) {
    throw new Error('Scoped TourProducts contain missing or duplicate source IDs')
  }
  for (const document of documents) {
    if (String(taxonomyRelationID(document.site)) !== String(siteID)) {
      throw new Error(`TourProduct ${document.id} belongs to another site`)
    }
    if (document.sourceProvenance?.importBatchId !== wingsSideTourTaxonomyBatchID) {
      throw new Error(`TourProduct ${document.id} belongs to another batch`)
    }
    if (document._status !== 'published') {
      throw new Error(`TourProduct ${document.id} must remain published`)
    }
    const wrapperID = taxonomyRelationID(document.wrapperPage)
    if (wrapperID === null || String(wrapperSiteByID.get(String(wrapperID))) !== String(siteID)) {
      throw new Error(`TourProduct ${document.id} wrapperPage is missing or cross-site`)
    }
  }
  return [...documents].sort((left, right) => sourceIDFor(left).localeCompare(sourceIDFor(right)))
}

export const buildTourTaxonomyPlanRecords = (
  documents: TourTaxonomyDocument[],
  mappings: readonly TourTaxonomyMapping[] = wingsSideTourTaxonomyMappings,
): TourTaxonomyPlanRecord[] => {
  validateTourTaxonomyMappings(mappings)
  const mappingBySourceID = new Map(mappings.map((mapping) => [mapping.sourceID, mapping]))
  const documentSourceIDs = new Set(documents.map(sourceIDFor))
  const missingRecords = mappings
    .map(({ sourceID }) => sourceID)
    .filter((sourceID) => !documentSourceIDs.has(sourceID))
  const missingMappings = [...documentSourceIDs].filter(
    (sourceID) => !mappingBySourceID.has(sourceID),
  )
  if (missingRecords.length || missingMappings.length) {
    throw new Error(
      `Taxonomy mapping mismatch: missingRecords=${missingRecords.join(',') || 'none'}; missingMappings=${missingMappings.join(',') || 'none'}`,
    )
  }

  return documents
    .map((document) => {
      const sourceID = sourceIDFor(document)
      const mapping = mappingBySourceID.get(sourceID)!
      const before = extractTourTaxonomySnapshot(document)
      const after: TourTaxonomySnapshot = {
        destinationTags: normalizeTourDestinationKeys(mapping.destinations),
        taxonomyProvenance: {
          evidence: mapping.evidence,
          mappingRevision: wingsSideTourTaxonomyMappingRevision,
          reviewStatus: 'mapped',
          sourceID,
        },
        travelStyles: normalizeTourTravelStyleKeys(mapping.styles),
      }
      const core = {
        after,
        before,
        id: document.id,
        provenanceChecksum: taxonomyChecksum(document.sourceProvenance ?? null),
        slug: String(document.slug || ''),
        sourceID,
      }
      return {
        ...core,
        action: taxonomyChecksum(before) === taxonomyChecksum(after) ? 'unchanged' : 'update',
        integrityChecksum: taxonomyChecksum(core),
      } satisfies TourTaxonomyPlanRecord
    })
    .sort((left, right) => left.sourceID.localeCompare(right.sourceID))
}

export const assertTourTaxonomyPlanRecords = (records: TourTaxonomyPlanRecord[]) => {
  if (records.length !== wingsSideTourTaxonomyExpectedCount) {
    throw new Error('Taxonomy plan record count mismatch')
  }
  for (const record of records) {
    const core = {
      after: record.after,
      before: record.before,
      id: record.id,
      provenanceChecksum: record.provenanceChecksum,
      slug: record.slug,
      sourceID: record.sourceID,
    }
    if (taxonomyChecksum(core) !== record.integrityChecksum) {
      throw new Error(`Taxonomy plan record ${record.id} failed integrity validation`)
    }
  }
}

export const classifyTourTaxonomyState = ({
  documents,
  records,
}: {
  documents: TourTaxonomyDocument[]
  records: TourTaxonomyPlanRecord[]
}) => {
  assertTourTaxonomyPlanRecords(records)
  const byID = new Map(documents.map((document) => [String(document.id), document]))
  let before = 0
  let after = 0
  for (const record of records) {
    const document = byID.get(String(record.id))
    if (
      !document ||
      sourceIDFor(document) !== record.sourceID ||
      taxonomyChecksum(document.sourceProvenance ?? null) !== record.provenanceChecksum
    ) {
      return 'unknown' as const
    }
    const current = taxonomyChecksum(extractTourTaxonomySnapshot(document))
    if (current === taxonomyChecksum(record.before)) before += 1
    else if (current === taxonomyChecksum(record.after)) after += 1
    else return 'unknown' as const
  }
  if (before === records.length && after === records.length) return 'equivalent' as const
  if (before === records.length) return 'before' as const
  if (after === records.length) return 'after' as const
  return 'mixed' as const
}
