import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { isWingsGroupPublishedMedia } from '@/components/WingsGroupV3/model'
import type { Media, Post } from '@/payload-types'
import { hydrateScopedWingsGroupMediaRelations } from '@/utilities/wingsGroupMediaRelations'
import { normalizePublicMediaURL } from '@/utilities/getMediaUrl'
import { getCurrentSite } from '@/utilities/siteContext'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'

export const WINGSGROUP_EDITORIAL_ARCHIVE_PATH = '/tin-tuc' as const
export const WINGSGROUP_TRUST_ARTICLE_SLUG =
  'giay-phep-lu-hanh-va-cac-tin-hieu-trust-khi-chon-cong-ty-du-lich' as const

export const WINGSGROUP_EDITORIAL_FALLBACK_MEDIA_FILENAMES = [
  'wingsgroup-journey-guide.png',
  'wingsgroup-selection-guide.png',
  'wingsgroup-travel-trends.png',
] as const

export type WingsGroupEditorialMediaMap = ReadonlyMap<string, Media>

export const getWingsGroupEditorialPostPath = (slug?: null | string): string =>
  slug ? `${WINGSGROUP_EDITORIAL_ARCHIVE_PATH}/${slug}` : WINGSGROUP_EDITORIAL_ARCHIVE_PATH

export const formatWingsGroupEditorialDate = (value: string, locale?: null | string): string =>
  new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))

const relationID = (value: unknown): number | string | null =>
  value && typeof value === 'object' && 'id' in value
    ? ((value as { id?: number | string | null }).id ?? null)
    : typeof value === 'number' || typeof value === 'string'
      ? value
      : null

export const isGovernedWingsGroupEditorialPost = (
  post:
    | {
        _status?: unknown
        content?: unknown
        site?: unknown
        slug?: unknown
        title?: unknown
      }
    | null
    | undefined,
  siteID: number | string,
): boolean =>
  Boolean(
    post &&
    post._status === 'published' &&
    String(relationID(post.site)) === String(siteID) &&
    typeof post.slug === 'string' &&
    post.slug.trim() &&
    typeof post.title === 'string' &&
    post.title.trim() &&
    post.content,
  )

export const getGovernedEditorialAuthorNames = (post: Pick<Post, 'populatedAuthors'>): string[] =>
  (post.populatedAuthors || [])
    .map((author) => (typeof author?.name === 'string' ? author.name.trim() : ''))
    .filter(Boolean)

type EditorialCopySection = {
  heading: string
  paragraphs: string[]
}

const TRUST_ARTICLE_PUBLIC_COPY: Record<
  'en' | 'vi',
  {
    breadcrumbLabel: string
    description: string
    sections: EditorialCopySection[]
    title: string
  }
> = {
  vi: {
    breadcrumbLabel: 'Kiểm tra thông tin dịch vụ',
    description:
      'Hướng dẫn thực tế để kiểm tra thông tin doanh nghiệp, phạm vi dịch vụ, điều kiện thanh toán và đầu mối hỗ trợ trước khi đặt chuyến đi.',
    title: 'Kiểm tra giấy phép và thông tin trước khi chọn dịch vụ du lịch',
    sections: [
      {
        heading: 'Bắt đầu từ thông tin có thể đối chiếu',
        paragraphs: [
          'Trước khi đặt dịch vụ, hãy yêu cầu tên pháp nhân, mã số doanh nghiệp, địa chỉ giao dịch, đầu mối liên hệ chính thức và thông tin giấy phép phù hợp với phạm vi công việc được chào bán.',
          'Đối chiếu các thông tin này với nguồn công khai của cơ quan có thẩm quyền. Nếu trạng thái chưa rõ hoặc dữ liệu giữa các nguồn không khớp, hãy đề nghị doanh nghiệp giải thích bằng văn bản trước khi thanh toán.',
        ],
      },
      {
        heading: 'Đọc chương trình và điều kiện như một cam kết dịch vụ',
        paragraphs: [
          'Một đề xuất rõ ràng cần nêu lịch trình, hạng mục bao gồm và không bao gồm, tiêu chuẩn dịch vụ, điều kiện thay đổi hoặc hủy, cùng trách nhiệm của mỗi bên. Đừng dựa vào hình ảnh quảng bá để suy ra những quyền lợi chưa được ghi nhận.',
        ],
      },
      {
        heading: 'Làm rõ thanh toán, chứng từ và dữ liệu cá nhân',
        paragraphs: [
          'Xác nhận đúng đơn vị nhận tiền, lịch thanh toán, loại chứng từ được cung cấp và cách xử lý hoàn tiền nếu có. Chỉ gửi dữ liệu hộ chiếu hoặc thông tin nhạy cảm qua kênh đã được xác nhận và sau khi hiểu mục đích sử dụng.',
        ],
      },
      {
        heading: 'Biết ai sẽ hỗ trợ trước, trong và sau hành trình',
        paragraphs: [
          'Lưu lại đầu mối phụ trách, số liên hệ khi cần hỗ trợ và quy trình xử lý thay đổi. Thông tin minh bạch không thay thế việc tự kiểm tra: quy định và trạng thái giấy phép có thể thay đổi, vì vậy hãy xác nhận lại trên nguồn chính thức hiện hành trước khi quyết định.',
        ],
      },
    ],
  },
  en: {
    breadcrumbLabel: 'Verify a travel provider',
    description:
      'A practical guide to checking a provider, service scope, payment terms and support arrangements before committing to a journey.',
    title: 'What to verify before choosing a travel provider',
    sections: [
      {
        heading: 'Start with information you can verify',
        paragraphs: [
          'Before booking, ask for the legal entity name, business registration details, operating address, official contact channels and the licence information relevant to the service being offered.',
          'Compare those details with public records maintained by the competent authorities. If a status is unclear or two sources do not agree, ask the provider to clarify the position in writing before you pay.',
        ],
      },
      {
        heading: 'Treat the itinerary and terms as the service commitment',
        paragraphs: [
          'A considered proposal should state the itinerary, inclusions and exclusions, service standards, change or cancellation terms, and each party’s responsibilities. Marketing imagery should never be treated as confirmation of a benefit that is not written into the offer.',
        ],
      },
      {
        heading: 'Clarify payments, records and personal data',
        paragraphs: [
          'Confirm the receiving entity, payment schedule, documents you will receive and any applicable refund process. Share passport details or other sensitive information only through a verified channel and after the purpose of collection is clear.',
        ],
      },
      {
        heading: 'Know who will support the journey',
        paragraphs: [
          'Keep the responsible contact, an assistance number and the process for handling changes. Transparent information is not a substitute for your own verification: rules and licence status can change, so check the current official source before making a decision.',
        ],
      },
    ],
  },
}

const lexicalText = (text: string) => ({
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  text,
  type: 'text',
  version: 1,
})

const createTrustArticleContent = (locale: 'en' | 'vi'): Post['content'] =>
  ({
    root: {
      children: TRUST_ARTICLE_PUBLIC_COPY[locale].sections.flatMap((section) => [
        {
          children: [lexicalText(section.heading)],
          direction: 'ltr',
          format: '',
          indent: 0,
          tag: 'h2',
          type: 'heading',
          version: 1,
        },
        ...section.paragraphs.map((paragraph) => ({
          children: [lexicalText(paragraph)],
          direction: 'ltr' as const,
          format: '' as const,
          indent: 0,
          textFormat: 0,
          type: 'paragraph' as const,
          version: 1,
        })),
      ]),
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  }) as Post['content']

export const applyWingsGroupEditorialPublicCopy = (
  post: Post,
  locale: SupportedLocaleCode,
): Post => {
  if (post.slug !== WINGSGROUP_TRUST_ARTICLE_SLUG) return post

  const update = getWingsGroupTrustArticleLocalizedUpdate(locale === 'en' ? 'en' : 'vi')

  return {
    ...post,
    ...update,
    meta: {
      ...post.meta,
      ...update.meta,
    },
  }
}

export const getWingsGroupTrustArticleLocalizedUpdate = (locale: 'en' | 'vi') => {
  const copy = TRUST_ARTICLE_PUBLIC_COPY[locale]

  return {
    content: createTrustArticleContent(locale),
    meta: {
      breadcrumbLabel: copy.breadcrumbLabel,
      description: copy.description,
      title: copy.title,
    },
    title: copy.title,
  } satisfies Pick<Post, 'content' | 'meta' | 'title'>
}

const isEditorialMedia = (value: unknown): value is Media =>
  isWingsGroupPublishedMedia(value) && value.governance?.usageScope === 'editorial-service'

export const getWingsGroupEditorialFallbackFilename = (slug?: null | string) => {
  if (slug === WINGSGROUP_TRUST_ARTICLE_SLUG) {
    return WINGSGROUP_EDITORIAL_FALLBACK_MEDIA_FILENAMES[0]
  }

  const hash = Array.from(slug || '').reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  )
  return WINGSGROUP_EDITORIAL_FALLBACK_MEDIA_FILENAMES[
    hash % WINGSGROUP_EDITORIAL_FALLBACK_MEDIA_FILENAMES.length
  ]
}

export const resolveWingsGroupEditorialMedia = (
  post: Pick<Post, 'heroImage' | 'meta' | 'slug'>,
  fallbackMedia: WingsGroupEditorialMediaMap,
): Media | null => {
  for (const candidate of [post.meta?.image, post.heroImage]) {
    if (isEditorialMedia(candidate)) return candidate
  }

  const fallback = fallbackMedia.get(getWingsGroupEditorialFallbackFilename(post.slug))
  return isEditorialMedia(fallback) ? fallback : null
}

export const getWingsGroupEditorialOpenGraphMedia = (media?: Media | null): Media | null => {
  if (!isEditorialMedia(media)) return null

  const derivative = (media.governance?.responsiveDerivatives || [])
    .filter(
      (entry) =>
        entry.format === 'webp' &&
        typeof entry.url === 'string' &&
        entry.url.startsWith('https://') &&
        typeof entry.width === 'number',
    )
    .sort((left, right) => (right.width || 0) - (left.width || 0))[0]
  const mediaSizes = media.sizes as { og?: { url?: null | string } } | null | undefined

  const mediaSizes = media.sizes as { og?: { url?: null | string } } | null | undefined
  const publicURL = derivative?.url ? normalizePublicMediaURL(derivative.url) : ''
  return publicURL
    ? {
        ...media,
        sizes: {
          ...(media.sizes || {}),
          og: { ...(mediaSizes?.og || {}), url: publicURL },
        },
        url: publicURL,
      }
    : null
}

/**
 * The archive is a CMS page, while its editorial cards resolve their imagery
 * from the governed fallback register. Keep its social metadata on that same
 * register rather than inheriting a legacy CMS SEO image that may be private.
 */
export const getWingsGroupEditorialArchiveOpenGraphMedia = (
  fallbackMedia: WingsGroupEditorialMediaMap,
): Media | null =>
  getWingsGroupEditorialOpenGraphMedia(
    fallbackMedia.get(WINGSGROUP_EDITORIAL_FALLBACK_MEDIA_FILENAMES[0]),
  )

export const selectWingsGroupEditorialRelatedPosts = (
  post: Pick<Post, 'id' | 'relatedPosts'>,
  candidates: Post[],
  limit = 3,
): Post[] => {
  const relatedIDs = (post.relatedPosts || []).map(relationID).filter(Boolean).map(String)
  const uniqueCandidates = candidates.filter(
    (candidate, index, values) =>
      String(candidate.id) !== String(post.id) &&
      values.findIndex((item) => String(item.id) === String(candidate.id)) === index,
  )
  const byID = new Map(uniqueCandidates.map((candidate) => [String(candidate.id), candidate]))
  const selected = relatedIDs
    .map((id) => byID.get(id))
    .filter((candidate): candidate is Post => Boolean(candidate))
  const selectedIDs = new Set(selected.map((candidate) => String(candidate.id)))

  return [
    ...selected,
    ...uniqueCandidates.filter((candidate) => !selectedIDs.has(String(candidate.id))),
  ].slice(0, limit)
}

type QueryArgs = {
  draft?: boolean
  locale: SupportedLocaleCode
  slug?: string
}

export const queryWingsGroupEditorialPosts = async ({
  draft = false,
  locale,
  slug,
}: QueryArgs): Promise<Post[]> => {
  const site = await getCurrentSite()
  if (site.code !== 'wings-group') return []

  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'posts',
    depth: 2,
    draft,
    fallbackLocale: false,
    limit: slug ? 1 : 12,
    locale,
    overrideAccess: draft,
    pagination: false,
    sort: '-publishedAt',
    where: {
      and: [
        { site: { equals: site.id } },
        { _status: { equals: 'published' } },
        ...(slug ? [{ slug: { equals: slug } }] : []),
      ],
    },
  })

  const hydrated = hydrateScopedWingsGroupMediaRelations(result.docs, site)
  return hydrated
    .filter((post) => isGovernedWingsGroupEditorialPost(post, site.id))
    .map((post) => applyWingsGroupEditorialPublicCopy(post, locale))
}

export const queryWingsGroupEditorialFallbackMedia = async ({
  locale,
}: {
  locale: SupportedLocaleCode
}): Promise<Map<string, Media>> => {
  const site = await getCurrentSite()
  if (site.code !== 'wings-group') return new Map()

  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'media',
    depth: 1,
    fallbackLocale: false,
    limit: WINGSGROUP_EDITORIAL_FALLBACK_MEDIA_FILENAMES.length,
    locale,
    overrideAccess: false,
    pagination: false,
    where: {
      and: [
        { site: { equals: site.id } },
        { 'governance.managedBy': { equals: 'wingsgroup-v3' } },
        { 'governance.publicationState': { equals: 'published' } },
        { 'governance.rightsState': { equals: 'approved' } },
        { 'governance.derivativeState': { equals: 'verified' } },
        { 'governance.usageScope': { equals: 'editorial-service' } },
        {
          'governance.sourceFilename': {
            in: [...WINGSGROUP_EDITORIAL_FALLBACK_MEDIA_FILENAMES],
          },
        },
      ],
    },
  })

  const hydrated = hydrateScopedWingsGroupMediaRelations(result.docs, site)
  return new Map(
    hydrated
      .filter(isEditorialMedia)
      .map((media) => [String(media.governance?.sourceFilename || ''), media]),
  )
}
