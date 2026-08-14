import type {
  Media,
  Page,
  WingsGroupEcosystemBlock,
  WingsGroupProofArchiveBlock,
} from '@/payload-types'

export type WingsGroupHomeSection = 'ecosystem' | 'trust' | 'proof' | 'editorial' | 'contact'

type LayoutBlock = Page['layout'][number]
type EcosystemProfile = WingsGroupEcosystemBlock['profiles'][number]
type ProofRecord = NonNullable<WingsGroupProofArchiveBlock['records']>[number]

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const hasLegacyWingSidePath = (value: string): boolean => {
  try {
    const pathname = value.startsWith('http') ? new URL(value).pathname : value.split(/[?#]/, 1)[0]
    return pathname
      .split('/')
      .filter(Boolean)
      .some((segment) => segment === 'wingsside')
  } catch {
    return true
  }
}

export const normalizeWingSidePath = (value: string): string =>
  value.replace(/(^|\/)wingsside(?=\/|[?#]|$)/gi, '$1wing-side')

export const isWingsGroupPublishedMedia = (value: unknown): value is Media => {
  if (!isRecord(value) || !text(value.url) || !text(value.alt)) return false

  const governance = isRecord(value.governance) ? value.governance : null
  if (!governance) return false

  const derivatives = Array.isArray(governance.responsiveDerivatives)
    ? governance.responsiveDerivatives.filter(isRecord)
    : []
  const formats = new Set(derivatives.map((item) => text(item.format)))

  return (
    governance.managedBy === 'wingsgroup-v3' &&
    governance.publicationState === 'published' &&
    governance.rightsState === 'approved' &&
    governance.derivativeState === 'verified' &&
    formats.has('webp') &&
    formats.has('avif')
  )
}

export type ResolvedEcosystemCTA = {
  href: string
  isFallback: boolean
  label: string
}

export const resolveEcosystemCTA = (
  profile: EcosystemProfile,
  locale?: null | string,
): ResolvedEcosystemCTA => {
  const cta = profile.cta
  const fallbackLabel = locale === 'en' ? 'Request a consultation' : 'Nhận tư vấn phù hợp'
  const fallbackPath = '/lien-he#contact-form'
  const hasApprovalEvidence = [
    cta.owner,
    cta.httpEvidence,
    cta.canonicalEvidence,
    cta.trackingEvidence,
    cta.ownerApprovalEvidence,
  ].every((value) => Boolean(text(value)))

  if (
    cta.state === 'approved-deep-link' &&
    /^https:\/\//i.test(text(cta.url)) &&
    !hasLegacyWingSidePath(text(cta.url)) &&
    hasApprovalEvidence
  ) {
    return {
      href: text(cta.url),
      isFallback: false,
      label: text(cta.label) || fallbackLabel,
    }
  }

  const requestedFallback = text(cta.contactPath)
  const safeFallback =
    requestedFallback.startsWith('/') && !hasLegacyWingSidePath(requestedFallback)
      ? requestedFallback
      : fallbackPath

  return {
    href: safeFallback,
    isFallback: true,
    label: text(cta.label) || fallbackLabel,
  }
}

export const isApprovedProofRecord = (record: ProofRecord): boolean => {
  if (
    record.publicationState !== 'approved' ||
    record.permissionState !== 'approved' ||
    !text(record.sourceIssuer) ||
    (!text(record.context) && !text(record.evidenceDate)) ||
    !text(record.permissionEvidence) ||
    !text(record.mediaProvenanceReference) ||
    !isWingsGroupPublishedMedia(record.media)
  ) {
    return false
  }

  return record.media.governance?.usageScope !== 'editorial-service'
}

export const getApprovedProofRecords = (
  records?: WingsGroupProofArchiveBlock['records'],
): ProofRecord[] => (records || []).filter(isApprovedProofRecord)

const normalizedBlockName = (block: LayoutBlock): string =>
  text('blockName' in block ? block.blockName : '').toLowerCase()

export const getWingsGroupHomeSection = (block: LayoutBlock): WingsGroupHomeSection | null => {
  if (block.blockType === 'wingsGroupEcosystem') return 'ecosystem'
  if (block.blockType === 'wingsGroupProofArchive') return 'proof'
  if (block.blockType === 'formBlock') return 'contact'
  if (block.blockType === 'archive') return 'editorial'
  if (block.blockType === 'infoStrip' || block.blockType === 'stats') return 'trust'

  const name = normalizedBlockName(block)
  if (name.includes('trust')) return 'trust'
  if (name.includes('editorial')) return 'editorial'
  if (name.includes('contact') && block.blockType === 'cta') return 'contact'

  return null
}

export const WINGS_GROUP_HOME_ORDER: readonly WingsGroupHomeSection[] = [
  'ecosystem',
  'trust',
  'proof',
  'editorial',
  'contact',
]

/**
 * The hero is rendered outside Page.layout. Once the governed ecosystem block
 * opts a WingsGroup home page into v3, only one block per public section is
 * rendered and the product-contract order is enforced at the boundary.
 */
export const composeWingsGroupHomeBlocks = (blocks: LayoutBlock[]): LayoutBlock[] => {
  const firstBySection = new Map<WingsGroupHomeSection, LayoutBlock>()

  for (const block of blocks) {
    const section = getWingsGroupHomeSection(block)
    if (section && !firstBySection.has(section)) firstBySection.set(section, block)
  }

  return WINGS_GROUP_HOME_ORDER.map((section) => firstBySection.get(section)).filter(
    (block): block is LayoutBlock => Boolean(block),
  )
}

export const isWingsGroupV3HomeLayout = (blocks: LayoutBlock[]): boolean =>
  blocks.some((block) => block.blockType === 'wingsGroupEcosystem')

type HeroLink = NonNullable<Page['hero']['links']>[number]['link']

export type SafeHeroLink = HeroLink & { url?: string | null }

export const resolveSafeHeroLinks = (
  links: Page['hero']['links'],
  locale?: null | string,
): [SafeHeroLink, SafeHeroLink] => {
  const fallback: [SafeHeroLink, SafeHeroLink] =
    locale === 'en'
      ? [
          { label: 'Explore the ecosystem', type: 'custom', url: '#ecosystem' },
          { label: 'Request a consultation', type: 'custom', url: '/lien-he#contact-form' },
        ]
      : [
          { label: 'Khám phá hệ sinh thái', type: 'custom', url: '#ecosystem' },
          { label: 'Nhận tư vấn', type: 'custom', url: '/lien-he#contact-form' },
        ]

  return fallback.map((defaultLink, index) => {
    const candidate = links?.[index]?.link
    if (!candidate || !text(candidate.label)) return defaultLink

    if (candidate.type === 'reference' && isRecord(candidate.reference?.value)) return candidate

    const url = text(candidate.url)
    if (!url || (!url.startsWith('/') && !url.startsWith('#'))) return defaultLink

    return {
      ...candidate,
      url: normalizeWingSidePath(url),
    }
  }) as [SafeHeroLink, SafeHeroLink]
}
