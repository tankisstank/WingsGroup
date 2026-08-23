import type {
  ArchiveBlock,
  Category,
  Media,
  Page,
  Post,
  WingsGroupEcosystemBlock,
  WingsGroupProofArchiveBlock,
} from '@/payload-types'
import type { LocaleMetadata } from '@/utilities/locales'

export type WingsGroupHomeSection = 'ecosystem' | 'trust' | 'proof' | 'editorial' | 'contact'

type LayoutBlock = Page['layout'][number]
type EcosystemProfile = WingsGroupEcosystemBlock['profiles'][number]
type ProofRecord = NonNullable<WingsGroupProofArchiveBlock['records']>[number]

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
const SHA256 = /^[a-f0-9]{64}$/
const SOURCE_IDENTITY = /^.+:[a-f0-9]{64}$/
const UNSAFE_HREF = /[\\\u0000-\u001f\u007f]|%(?:0[0-9a-f]|1[0-9a-f]|2f|5c|7f)/i

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

export const isSafeSameSiteHref = (value: unknown): value is string => {
  const href = text(value)
  if (!href || UNSAFE_HREF.test(href)) return false
  if (href.startsWith('#')) return /^#[a-z0-9][a-z0-9._:-]*$/i.test(href)
  if (!href.startsWith('/') || href.startsWith('//')) return false

  try {
    const parsed = new URL(href, 'https://wingsgroup.invalid')
    return parsed.origin === 'https://wingsgroup.invalid' && parsed.pathname.startsWith('/')
  } catch {
    return false
  }
}

const hasGovernedDerivative = (value: unknown, format: 'avif' | 'webp'): boolean => {
  if (!isRecord(value) || value.format !== format) return false
  return (
    Number.isFinite(value.width) &&
    Number(value.width) > 0 &&
    /^https:\/\//i.test(text(value.url)) &&
    SHA256.test(text(value.sha256))
  )
}

export const isWingsGroupPublishedMedia = (value: unknown): value is Media => {
  if (!isRecord(value) || !text(value.url) || !text(value.alt)) return false

  const site = isRecord(value.site) ? value.site : null
  if (!site || site.code !== 'wings-group') return false

  const governance = isRecord(value.governance) ? value.governance : null
  if (!governance) return false

  const derivatives = Array.isArray(governance.responsiveDerivatives)
    ? governance.responsiveDerivatives.filter(isRecord)
    : []
  const sourceAttachmentID = text(governance.sourceAttachmentId)
  const sourceFileSha256 = text(governance.sourceFileSha256)
  const sourceIdentity = text(governance.sourceIdentity)

  return (
    governance.managedBy === 'wingsgroup-v3' &&
    governance.publicationState === 'published' &&
    governance.rightsState === 'approved' &&
    governance.derivativeState === 'verified' &&
    SOURCE_IDENTITY.test(sourceIdentity) &&
    Boolean(sourceAttachmentID) &&
    SHA256.test(text(governance.sourceArchiveSha256)) &&
    SHA256.test(sourceFileSha256) &&
    sourceIdentity === `${sourceAttachmentID}:${sourceFileSha256}` &&
    Boolean(text(governance.provenanceReference)) &&
    Boolean(text(governance.rightsEvidence)) &&
    derivatives.some((item) => hasGovernedDerivative(item, 'webp')) &&
    derivatives.some((item) => hasGovernedDerivative(item, 'avif'))
  )
}

/**
 * The handoff media is licensed for development/staging review before
 * production publication. The preview must be able to show those governed
 * records without treating them as published proof or opening an unapproved
 * external asset URL.
 */
export const isWingsGroupDevelopmentMedia = (value: unknown): value is Media => {
  if (!isRecord(value) || !text(value.url) || !text(value.alt)) return false

  const site = isRecord(value.site) ? value.site : null
  const governance = isRecord(value.governance) ? value.governance : null
  if (!site || site.code !== 'wings-group' || !governance) return false

  const sourceAttachmentID = text(governance.sourceAttachmentId)
  const sourceFileSha256 = text(governance.sourceFileSha256)
  return (
    governance.managedBy === 'wingsgroup-v3' &&
    governance.rightsState === 'approved' &&
    governance.usageScope === 'editorial-service' &&
    SOURCE_IDENTITY.test(text(governance.sourceIdentity)) &&
    Boolean(sourceAttachmentID) &&
    SHA256.test(text(governance.sourceArchiveSha256)) &&
    SHA256.test(sourceFileSha256) &&
    text(governance.sourceIdentity) === `${sourceAttachmentID}:${sourceFileSha256}` &&
    Boolean(text(governance.provenanceReference))
  )
}

export const isWingsGroupRenderableMedia = (value: unknown): value is Media =>
  isWingsGroupPublishedMedia(value) || isWingsGroupDevelopmentMedia(value)

export const areAllHeroMediaGoverned = (hero: Page['hero']): boolean => {
  const relations: unknown[] = [
    hero.media,
    ...(hero.supportingMedia || []),
    ...(hero.slides || []).flatMap((slide) => [slide.media, slide.mobileMedia]),
    hero.video?.desktopVideo,
    hero.video?.mobileVideo,
    hero.video?.poster,
  ].filter((value) => value !== null && value !== undefined)

  return relations.length > 0 && relations.every(isWingsGroupPublishedMedia)
}

export const areAllHeroMediaRenderable = (hero: Page['hero']): boolean => {
  const relations: unknown[] = [
    hero.media,
    ...(hero.supportingMedia || []),
    ...(hero.slides || []).flatMap((slide) => [slide.media, slide.mobileMedia]),
    hero.video?.desktopVideo,
    hero.video?.mobileVideo,
    hero.video?.poster,
  ].filter((value) => value !== null && value !== undefined)

  return relations.length > 0 && relations.every(isWingsGroupRenderableMedia)
}

export const WINGSGROUP_PROFILE_PRESENTATION: Record<
  EcosystemProfile['brandKey'],
  { en: { category: string; stageTitle: string }; vi: { category: string; stageTitle: string } }
> = {
  wingsgo: {
    en: { category: 'OUTBOUND TRAVEL', stageTitle: 'Go further, prepared.' },
    vi: { category: 'DU LỊCH NƯỚC NGOÀI', stageTitle: 'Đi xa, chuẩn bị rõ.' },
  },
  'wing-side': {
    en: { category: 'VIETNAM DISCOVERY', stageTitle: 'Vietnam, at your own pace.' },
    vi: { category: 'KHÁM PHÁ VIỆT NAM', stageTitle: 'Việt Nam theo nhịp riêng.' },
  },
  wingspass: {
    en: { category: 'AIRPORT SERVICES', stageTitle: 'A smoother airport experience.' },
    vi: { category: 'DỊCH VỤ SÂN BAY', stageTitle: 'Qua sân bay nhẹ nhàng hơn.' },
  },
  wingsplus: {
    en: { category: 'PRIVATE GROUPS & MICE', stageTitle: 'One group, one considered plan.' },
    vi: { category: 'ĐOÀN RIÊNG & MICE', stageTitle: 'Một đoàn, một kế hoạch.' },
  },
  wingscare: {
    en: { category: 'TRAVEL CARE & SUPPORT', stageTitle: 'Confidence at every step.' },
    vi: { category: 'BẢO HIỂM & HỖ TRỢ', stageTitle: 'Yên tâm trong từng chặng.' },
  },
}

export const WINGSGROUP_PROFILE_ORDER = [
  'wingsgo',
  'wing-side',
  'wingspass',
  'wingsplus',
  'wingscare',
] as const satisfies readonly EcosystemProfile['brandKey'][]

export const WINGSGROUP_CAPABILITY_ROWS = {
  en: [
    {
      title: 'WingsGo',
      description: 'Journey advice, departure planning and pre-trip support.',
    },
    {
      title: 'WingSide',
      description: 'Vietnam journeys shaped around local rhythm and private groups.',
    },
    {
      title: 'WingsPass',
      description: 'Airport touchpoints, arrival support and Fast Track by request.',
    },
    {
      title: 'WingsPlus',
      description: 'Private journeys, corporate groups and considered event programmes.',
    },
    {
      title: 'WingsCare',
      description: 'Clearer guidance on travel care, benefits and support options.',
    },
  ],
  vi: [
    {
      title: 'WingsGo',
      description: 'Tư vấn hành trình, lịch khởi hành và hỗ trợ trước chuyến đi.',
    },
    {
      title: 'WingSide',
      description: 'Hành trình Việt Nam theo nhịp riêng và nhu cầu của nhóm riêng.',
    },
    {
      title: 'WingsPass',
      description: 'Hỗ trợ tại điểm chạm, đón tiễn và Fast Track theo nhu cầu.',
    },
    {
      title: 'WingsPlus',
      description: 'Hành trình riêng, đoàn doanh nghiệp và chương trình theo mục tiêu.',
    },
    {
      title: 'WingsCare',
      description: 'Làm rõ quyền lợi, phạm vi hỗ trợ và lưu ý trước hành trình.',
    },
  ],
} as const

export const resolveWingsGroupEcosystemProfiles = (
  profiles?: readonly EcosystemProfile[] | null,
): EcosystemProfile[] => {
  const byBrandKey = new Map(profiles?.map((profile) => [profile.brandKey, profile]) || [])
  return WINGSGROUP_PROFILE_ORDER.map((brandKey) => byBrandKey.get(brandKey)).filter(
    (profile): profile is EcosystemProfile => Boolean(profile),
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
    isSafeSameSiteHref(requestedFallback) && !hasLegacyWingSidePath(requestedFallback)
      ? normalizeWingSidePath(requestedFallback)
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

export const isWingsGroupV3HomeLayout = (blocks: LayoutBlock[]): boolean => {
  const counts = new Map<WingsGroupHomeSection, number>(
    WINGS_GROUP_HOME_ORDER.map((section) => [section, 0]),
  )

  for (const block of blocks) {
    const section = getWingsGroupHomeSection(block)
    if (section) counts.set(section, (counts.get(section) || 0) + 1)
  }

  return WINGS_GROUP_HOME_ORDER.every((section) => counts.get(section) === 1)
}

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
    if (!isSafeSameSiteHref(url)) return defaultLink

    return {
      ...candidate,
      url: normalizeWingSidePath(url),
    }
  }) as [SafeHeroLink, SafeHeroLink]
}

export const getWingsGroupSwitcherLocales = (
  locales: LocaleMetadata[],
  publicationState?: null | 'approved' | 'hidden' | 'route-ready',
): LocaleMetadata[] =>
  publicationState === 'approved' || publicationState === 'route-ready'
    ? locales
    : locales.filter((locale) => locale.code !== 'en')

const isWingsGroupCategory = (value: unknown): value is Category =>
  isRecord(value) &&
  isRecord(value.site) &&
  value.site.code === 'wings-group' &&
  Boolean(text(value.title))

export const isGovernedEditorialPost = (value: unknown): value is Post => {
  if (!isRecord(value) || value._status !== 'published') return false
  if (!isRecord(value.site) || value.site.code !== 'wings-group') return false
  if (!text(value.title) || !text(value.slug) || !text(value.publishedAt)) return false
  if (Number.isNaN(Date.parse(text(value.publishedAt)))) return false

  const authors = Array.isArray(value.populatedAuthors) ? value.populatedAuthors : []
  if (!authors.some((author) => isRecord(author) && Boolean(text(author.name)))) return false

  const categories = Array.isArray(value.categories) ? value.categories : []
  if (categories.length === 0 || !categories.every(isWingsGroupCategory)) return false

  const meta = isRecord(value.meta) ? value.meta : null
  const image = meta?.image || value.heroImage
  return isWingsGroupPublishedMedia(image) && image.governance?.usageScope === 'editorial-service'
}

export const resolveGovernedEditorialSelection = (
  block: ArchiveBlock,
  candidates: unknown[],
): Post[] => {
  if (block.populateBy === 'selection' && (block.selectedDocs?.length || 0) !== 3) return []
  if (block.populateBy !== 'selection' && block.limit !== 3) return []
  if (candidates.length !== 3 || !candidates.every(isGovernedEditorialPost)) return []
  return candidates as Post[]
}
