import 'dotenv/config'

import fs from 'node:fs/promises'
import path from 'node:path'

import type { File, Payload, PayloadRequest } from 'payload'

import { createLocalReq, getPayload } from 'payload'

import config from '../src/payload.config'
import { normalizeRelationID } from '../src/access/roles'
import { ensureLocalAdminUser, localAdminCredentials } from '../src/utilities/adminSeed'
import {
  ensureHeroPresentationPresetSeeds,
  siteHeroPresentationAssignments,
} from '../src/utilities/heroPresentationSeed'
import { backfillWingsSideLocales } from './lib/wingssideLocaleBackfill'
import type { CopyLocaleCode } from '../src/utilities/locales'
import { ensureThemePresetSeeds, wingsSideInboundThemePresetKey } from '../src/utilities/themeSeed'

const seedContext = {
  disableRevalidate: true,
  seed: true,
}

const scriptDir = import.meta.dirname
const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const docsDir = path.join(repoRoot, 'docs', 'Tai_lieu_trao_doi_vong_2')
const seedAssetsDir = path.join(scriptDir, 'seed-assets')
const fallbackSeedImagePath = path.join(seedAssetsDir, 'wingsgroup-ecosystem-hero.png')

const seedData = <T>(data: T) => data as never

const trimPathSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '')

const localizePathForSeed = (pathValue?: null | string, locale: SupportedSeedLocale = 'vi') => {
  if (!pathValue || /^https?:\/\//.test(pathValue)) {
    return pathValue
  }

  if (locale !== 'en') {
    return pathValue
  }

  const prefix = pathValue.startsWith('/') ? '/' : ''
  const localizedPath = trimPathSlashes(pathValue)
    .split('/')
    .filter(Boolean)
    .map((segment) => englishPathSegmentMap[segment] || segment)
    .join('/')

  return `${prefix}${localizedPath}` || '/'
}

const localizeSeedTitle = (title?: unknown, locale: SupportedSeedLocale = 'vi') => {
  if (typeof title !== 'string' || locale !== 'en') {
    return title
  }

  return englishTitleMap[title] || title
}

const deepLocalizeSeedLinks = (value: unknown, locale: SupportedSeedLocale): unknown => {
  if (locale !== 'en') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepLocalizeSeedLinks(item, locale))
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      if (key === 'url' && typeof entry === 'string') {
        return [key, localizePathForSeed(entry, locale)]
      }

      if (
        (key === 'breadcrumbLabel' || key === 'label' || key === 'title') &&
        typeof entry === 'string'
      ) {
        return [key, localizeSeedTitle(entry, locale)]
      }

      return [key, deepLocalizeSeedLinks(entry, locale)]
    }),
  )
}

const stripGeneratedIDs = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stripGeneratedIDs)
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== 'id')
      .map(([key, entry]) => [key, stripGeneratedIDs(entry)]),
  )
}

type SeedRichText = {
  root: {
    type: 'root'
    children: Array<Record<string, unknown> & { type: string; version: number }>
    direction: 'ltr' | 'rtl' | null
    format: '' | 'center' | 'end' | 'justify' | 'left' | 'right' | 'start'
    indent: number
    version: number
  }
}

type RichTextSection =
  | {
      kind: 'heading'
      tag?: 'h1' | 'h2' | 'h3' | 'h4'
      text: string
    }
  | {
      kind: 'paragraph'
      text: string
    }

type SiteSeed = {
  accentColor?: null | string
  brandColor?: null | string
  code: string
  defaultLocale?: CopyLocaleCode
  domain: string
  name: string
  seoDescription: string
  seoSuffix: string
  supportedLocales?: Array<CopyLocaleCode | 'es' | 'it' | 'pt'>
  summary: string
  themePreset: string
}

type LinkAppearance = 'default' | 'outline'
type SupportedSeedLocale = CopyLocaleCode | 'es' | 'it' | 'pt'

const englishPathSegmentMap: Record<string, string> = {
  '5-site-trong-he-wingsgroup-khac-nhau-ra-sao': 'how-the-five-wingsgroup-sites-differ',
  'add-on': 'add-ons',
  'bac-kinh-van-ly-truong-thanh-5n4d': 'beijing-great-wall-5d4n',
  'bang-gia': 'pricing',
  'cam-nang-lua-chon': 'selection-guides',
  'cam-nang-outbound': 'outbound-guides',
  'cach-chon-dung-line-outbound-cho-han-nhat-trung':
    'how-to-choose-the-right-outbound-line-for-korea-japan-china',
  'cach-doc-lich-khoi-hanh-va-gia': 'how-to-read-departure-schedules-and-prices',
  'campaign-mua-he-dan-khach-di-dau': 'where-summer-campaigns-should-send-visitors',
  'campaign-theo-mua': 'seasonal-campaigns',
  'chinh-sach-bao-mat': 'privacy-policy',
  'chinh-sach-huy-doi': 'cancellation-change-policy',
  'chinh-sach-thanh-toan': 'payment-policy',
  'claim-support': 'claim-support',
  'dieu-khoan-su-dung': 'terms-of-use',
  'fast-track-airport-services-khi-nao-nen-su-dung': 'when-to-use-fast-track-airport-services',
  faq: 'faq',
  'giay-phep-lu-hanh-va-cac-tin-hieu-trust-khi-chon-cong-ty-du-lich':
    'travel-license-and-trust-signals-when-choosing-a-travel-company',
  'gioi-thieu': 'about',
  'han-quoc': 'korea',
  'he-2026-han-quoc': 'summer-2026-korea',
  'he-2026-nhat-ban': 'summer-2026-japan',
  'he-sinh-thai': 'service-ecosystem',
  'he-sinh-thai-wingsgroup-la-gi': 'what-is-the-wingsgroup-ecosystem',
  'huong-dan-yeu-cau-ho-tro': 'support-request-guide',
  'lien-he': 'contact',
  'lich-khoi-hanh': 'departures',
  'nang-luc-dich-vu': 'capabilities',
  'nang-luc-to-chuc-hanh-trinh-doan-va-mice-cua-vietwings': 'vietwings-group-and-mice-capabilities',
  'nen-bat-dau-tu-site-nao-trong-he-sinh-thai-wingsgroup': 'which-wingsgroup-site-to-start-with',
  'nhat-ban': 'japan',
  'nhung-gi-khach-hang-can-kiem-tra-truoc-khi-dat-dich-vu-du-lich':
    'what-to-check-before-booking-travel-services',
  'noi-bai': 'noi-bai',
  'phap-ly-va-niem-tin': 'trust-and-legal',
  'quyen-loi': 'benefits',
  'san-bay': 'airports',
  'san-pham-bao-hiem': 'insurance-products',
  'seoul-jeju-nami-camellia-hill-6n5d': 'seoul-jeju-nami-camellia-hill-6d5n',
  'seoul-nami-everland-5n4d': 'seoul-nami-everland-5d4n',
  'shizuoka-nui-phu-si-tokyo-5n4d': 'shizuoka-mount-fuji-tokyo-5d4n',
  'tan-son-nhat': 'tan-son-nhat',
  'thi-truong': 'markets',
  'thuong-hai-o-tran-hang-chau-5n4d': 'shanghai-wuzhen-hangzhou-5d4n',
  'tin-cay-va-phap-ly': 'trust-and-legal',
  'tin-he-sinh-thai': 'ecosystem-news',
  'tin-tuc': 'news-insights',
  tour: 'tours',
  'travel-insurance-va-care-support-can-hieu-dung-dieu-gi':
    'travel-insurance-and-care-support-explained',
  'trung-quoc': 'china',
  'trung-quoc-gia-ro': 'china-clear-pricing',
  've-wingsgroup': 'about-wingsgroup',
  'vi-sao-viet-nam-phu-hop-cho-hanh-trinh-inbound-tailor-made':
    'why-vietnam-works-for-tailor-made-inbound-journeys',
  'xu-huong-du-lich-cao-cap-va-private-journey-2026': 'premium-and-private-journey-trends-2026',
}

const englishTitleMap: Record<string, string> = {
  'Add-on': 'Add-ons',
  'Add-on dịch vụ': 'Service Add-ons',
  'Bảng giá': 'Pricing',
  'Bảng giá Fast Track': 'Fast Track Pricing',
  'Bắc Kinh - Vạn Lý Trường Thành 5N4D': 'Beijing - Great Wall 5D4N',
  'Campaign mùa hè nên dẫn khách vào đâu sau poster':
    'Where Summer Campaigns Should Send Visitors After the Poster',
  'Tour theo mùa': 'Seasonal Tours',
  'Cách đọc lịch khởi hành và giá trên WingsGo':
    'How to Read Departure Schedules and Prices on WingsGo',
  'Chính sách bảo mật': 'Privacy Policy',
  'Chính sách hủy đổi': 'Cancellation and Change Policy',
  'Chính sách thanh toán': 'Payment Policy',
  'Câu hỏi thường gặp': 'Frequently Asked Questions',
  'Dịch vụ theo sân bay': 'Airport Services',
  'FAQ WingsCare': 'WingsCare FAQ',
  'FAQ WingsPass': 'WingsPass FAQ',
  'Fast Track Đà Nẵng': 'Da Nang Fast Track',
  'Fast Track Nội Bài': 'Noi Bai Fast Track',
  'Fast Track Phú Quốc': 'Phu Quoc Fast Track',
  'Fast Track Tân Sơn Nhất': 'Tan Son Nhat Fast Track',
  'Giới thiệu': 'About',
  'Gửi yêu cầu': 'Send Request',
  'Gửi yêu cầu hỗ trợ': 'Request Support',
  'Gửi yêu cầu tư vấn': 'Request Proposal',
  'Hướng dẫn yêu cầu hỗ trợ': 'Support Request Guide',
  'Hè 2026 Hàn Quốc': 'Summer 2026 Korea',
  'Hè 2026 Nhật Bản': 'Summer 2026 Japan',
  'Hệ sinh thái dịch vụ': 'Service Ecosystem',
  'Liên hệ': 'Contact',
  'Liên hệ WingsGo': 'Contact WingsGo',
  'Liên hệ WingsGroup': 'Contact WingsGroup',
  'Liên hệ hỗ trợ': 'Contact Support',
  'Liên hệ đặt Fast Track': 'Book Fast Track',
  'Lịch khởi hành': 'Departures',
  'Năng lực dịch vụ': 'Service Capabilities',
  'Quyền lợi': 'Benefits',
  'Quyền lợi và phạm vi': 'Benefits and Coverage',
  'Sân bay': 'Airports',
  'Sản phẩm': 'Products',
  'Sản phẩm bảo hiểm': 'Insurance Products',
  'Thượng Hải - Ô Trấn - Hàng Châu 5N4D': 'Shanghai - Wuzhen - Hangzhou 5D4N',
  'Thị trường': 'Markets',
  'Thị trường outbound': 'Outbound Markets',
  'Tin cậy và pháp lý': 'Trust and Legal',
  'Tin tức': 'News and Insights',
  Tour: 'Tours',
  'Tour Hàn Quốc': 'Korea Tours',
  'Tour Nhật Bản': 'Japan Tours',
  'Tour WingsGo': 'WingsGo Tours',
  'Trang chủ': 'Home',
  'Tour riêng cao cấp': 'Premium Private Tours',
  'Trung Quốc giá rõ': 'China Clear Pricing',
  'Về WingsGroup': 'About WingsGroup',
  'Xem bảng giá': 'View Pricing',
  'Xem quyền lợi': 'View Benefits',
  'Điểm đến cao cấp': 'Premium Destinations',
  'Điều khoản sử dụng': 'Terms of Use',
}

const siteSeeds: SiteSeed[] = [
  {
    accentColor: '#A16207',
    brandColor: '#1C1917',
    code: 'wings-group',
    domain: 'wingsgroup.local',
    name: 'WingsGroup',
    seoDescription:
      'Corporate hub and multisite content platform for the WingsGroup ecosystem, outbound tours, inbound journeys, fast track services, and premium travel programs.',
    seoSuffix: 'Travel Ecosystem',
    summary:
      'Corporate hub điều hướng sang WingsGo, WingsSide, WingsPass, WingsPlus và các line business khác của VietWings.',
    themePreset: 'corporate',
  },
  {
    accentColor: '#F97316',
    brandColor: '#1D4ED8',
    code: 'wings-go',
    domain: 'wingsgo.local',
    name: 'WingsGo',
    seoDescription:
      'Tour outbound Hàn, Nhật, Trung với giá rõ, lịch khởi hành rõ, tour theo mùa và trang chi tiết dễ giữ chỗ.',
    seoSuffix: 'Outbound Tours',
    summary:
      'Tour outbound Hàn, Nhật, Trung với giá rõ, lịch khởi hành rõ và CTA tư vấn hoặc giữ chỗ nhanh.',
    themePreset: 'retail',
  },
  {
    code: 'wing-side',
    defaultLocale: 'en',
    domain: 'wingside.vn',
    name: 'WingSide',
    seoDescription:
      'Inbound Vietnam travel site focused on trust, destinations, travel styles, sample itineraries, and custom trip planning for international guests.',
    seoSuffix: 'Inbound Vietnam',
    supportedLocales: ['en', 'vi', 'it', 'es', 'pt'],
    summary:
      'Inbound consultative site cho khách quốc tế với destination hub, travel styles, sample itineraries và luồng plan-your-trip.',
    themePreset: wingsSideInboundThemePresetKey,
  },
  {
    accentColor: '#EA580C',
    brandColor: '#0B4F6C',
    code: 'wings-pass',
    domain: 'wingspass.wingsgroup.vn',
    name: 'WingsPass',
    seoDescription:
      'Fast Track service microsite with airport-specific service pricing, add-ons, and booking contact flows.',
    seoSuffix: 'Fast Track Services',
    summary:
      'Pricing-first site cho dịch vụ Fast Track theo sân bay, add-on, điều kiện áp dụng và đặt dịch vụ.',
    themePreset: 'utility',
  },
  {
    accentColor: '#A16207',
    brandColor: '#1C1917',
    code: 'wings-plus',
    defaultLocale: 'vi',
    domain: 'wingsplus.local',
    name: 'WingsPlus',
    seoDescription:
      'Premium site for private tours, MICE, special markets, long-haul destinations, and high-value travel proposals.',
    seoSuffix: 'Private, MICE và Proposal',
    supportedLocales: ['vi', 'en'],
    summary:
      'High-value consultative site cho private tours, MICE, special markets và request proposal.',
    themePreset: 'premium',
  },
  {
    accentColor: '#D97706',
    brandColor: '#15803D',
    code: 'wings-care',
    domain: 'wingscare.wingsgroup.vn',
    name: 'WingsCare',
    seoDescription:
      'Service assurance and insurance-oriented support site for the WingsGroup ecosystem.',
    seoSuffix: 'Care And Support',
    summary:
      'Site hỗ trợ và chăm sóc, để sẵn nền cho insurance và post-sales service trong hệ sinh thái.',
    themePreset: 'care',
  },
]

const themePresetIDsByKey: Record<string, number | string> = {}
const heroPresentationPresetIDsByKey: Record<string, number | string> = {}

const richTextFromSections = (sections: readonly RichTextSection[]): SeedRichText => ({
  root: {
    type: 'root',
    children: sections.map((section) => {
      if (section.kind === 'heading') {
        return {
          type: 'heading',
          children: [
            {
              type: 'text',
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text: section.text,
              version: 1,
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          tag: section.tag || 'h2',
          version: 1,
        }
      }

      return {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: section.text,
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        textFormat: 0,
        version: 1,
      }
    }),
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  },
})

const richText = (
  heading: string,
  paragraph: string,
  tag: 'h1' | 'h2' | 'h3' = 'h2',
): SeedRichText =>
  richTextFromSections([
    {
      kind: 'heading',
      tag,
      text: heading,
    },
    {
      kind: 'paragraph',
      text: paragraph,
    },
  ])

const linkItem = (label: string, url: string, appearance: LinkAppearance = 'default') => ({
  link: {
    type: 'custom' as const,
    appearance,
    label,
    url,
  },
})

const contentBlock = (
  columns: Array<{
    paragraph: string
    size: 'full' | 'half' | 'oneThird' | 'twoThirds'
    title: string
  }>,
) => ({
  blockType: 'content' as const,
  columns: columns.map((column) => ({
    size: column.size,
    richText: richText(column.title, column.paragraph, column.size === 'full' ? 'h2' : 'h3'),
  })),
})

const featureGridBlock = (
  title: string,
  description: string,
  items: Array<
    {
      description: string
      eyebrow?: string
      imageID?: number | string
      label?: string
      meta?: string
      url?: string
    } & { title: string }
  >,
  variant: 'default' | 'highlight' | 'minimal' = 'default',
  eyebrow?: string,
  presentation:
    | 'accordion'
    | 'alternating'
    | 'before-after'
    | 'bento'
    | 'icon-grid'
    | 'icon-wall'
    | 'sticky-reveal'
    | 'tabs' = 'icon-grid',
  defaultLinkLabel = 'Xem thêm',
) => ({
  blockType: 'featureGrid' as const,
  columns: '3',
  description,
  eyebrow,
  items: items.map((item) => ({
    description: item.description,
    eyebrow: item.eyebrow,
    enableLink: Boolean(item.url),
    image: item.imageID,
    meta: item.meta,
    title: item.title,
    ...(item.url
      ? {
          link: {
            type: 'custom' as const,
            label: item.label || defaultLinkLabel,
            url: item.url,
          },
        }
      : {}),
  })),
  presentation,
  title,
  variant,
})

const infoStripBlock = (
  title: string,
  description: string,
  items: Array<{ description?: string; label: string; value?: string }>,
  eyebrow?: string,
) => ({
  blockType: 'infoStrip' as const,
  description,
  eyebrow,
  items,
  title,
})

const statsBlock = (
  title: string,
  description: string,
  items: Array<{
    description?: string
    label: string
    progress?: number
    value: string
  }>,
  presentation:
    | 'card-grid'
    | 'editorial'
    | 'floating'
    | 'inline-bar'
    | 'logo-proof'
    | 'progress'
    | 'split-statement' = 'inline-bar',
  eyebrow?: string,
) => ({
  blockType: 'stats' as const,
  description,
  eyebrow,
  items,
  presentation,
  title,
})

const testimonialBlock = (
  title: string,
  description: string,
  items: Array<{
    country?: string
    name: string
    noteDate?: string
    quote: string
    rating?: number
    role?: string
  }>,
  presentation:
    | 'carousel'
    | 'featured'
    | 'logo-cloud'
    | 'marquee'
    | 'masonry'
    | 'quote-grid'
    | 'social-wall'
    | 'video' = 'quote-grid',
  eyebrow?: string,
) => ({
  blockType: 'testimonial' as const,
  description,
  eyebrow,
  // The historical PostgreSQL schema gave rating a DEFAULT 5. Explicitly
  // persist null when a planning note has no sourced rating so seed content
  // cannot accidentally become a five-star customer claim.
  items: items.map((item) => ({
    ...item,
    rating: item.rating ?? null,
  })),
  presentation,
  title,
})

const pricingTableBlock = (
  title: string,
  description: string,
  items: Array<{
    airline?: string
    departure?: string
    label?: string
    note?: string
    price: string
    subtitle?: string
    title: string
    url?: string
  }>,
  eyebrow?: string,
) => ({
  blockType: 'pricingTable' as const,
  description,
  eyebrow,
  items: items.map((item) => ({
    airline: item.airline,
    departure: item.departure,
    enableLink: Boolean(item.url),
    note: item.note,
    price: item.price,
    subtitle: item.subtitle,
    title: item.title,
    ...(item.url
      ? {
          link: {
            type: 'custom' as const,
            label: item.label || 'Xem chi tiết',
            url: item.url,
          },
        }
      : {}),
  })),
  title,
})

const faqBlock = (
  title: string,
  description: string,
  items: Array<{ answer: string; question: string }>,
  eyebrow?: string,
) => ({
  blockType: 'faq' as const,
  description,
  eyebrow,
  items,
  title,
})

const ctaBlock = (title: string, paragraph: string, links: Array<ReturnType<typeof linkItem>>) => ({
  blockType: 'cta' as const,
  links,
  richText: richText(title, paragraph),
})

const mediaBlock = (media: number | string) => ({
  blockType: 'mediaBlock' as const,
  media,
})

const formBlock = (form: number | string, title: string, paragraph: string) => ({
  blockType: 'formBlock' as const,
  enableIntro: true,
  form,
  introContent: richText(title, paragraph),
})

const archiveBlock = (
  categoryIDs: Array<number | string>,
  title: string,
  paragraph: string,
  limit = 3,
) => ({
  blockType: 'archive' as const,
  categories: categoryIDs,
  introContent: richText(title, paragraph),
  limit,
  populateBy: 'collection' as const,
  relationTo: 'posts' as const,
})

async function fetchFileByURL(url: string): Promise<File> {
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Failed to fetch file from ${url}, status: ${res.status}`)
  }

  const data = await res.arrayBuffer()
  const extension = path.extname(new URL(url).pathname).replace('.', '') || 'webp'

  return {
    name: url.split('/').pop() || `file-${Date.now()}.${extension}`,
    data: Buffer.from(data),
    mimetype: `image/${extension}`,
    size: data.byteLength,
  }
}

async function readFileByPath(filePath: string): Promise<File> {
  const bytes = await fs.readFile(filePath)
  const extension = path.extname(filePath).replace('.', '').toLowerCase() || 'jpg'
  const mimeByExtension: Record<string, string> = {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  }

  return {
    name: path.basename(filePath),
    data: bytes,
    mimetype: mimeByExtension[extension] || 'image/jpeg',
    size: bytes.byteLength,
  }
}

async function loadSeedFile(source: string) {
  if (/^https?:\/\//.test(source)) {
    try {
      return await fetchFileByURL(source)
    } catch (error) {
      console.warn(
        `[seed-subsites] Failed to fetch remote seed asset "${source}". Falling back to ${path.basename(fallbackSeedImagePath)}.`,
      )
      console.warn(error)

      return readFileByPath(fallbackSeedImagePath)
    }
  }

  return readFileByPath(source)
}

async function upsertSite(payload: Payload, req: PayloadRequest, siteSeed: SiteSeed) {
  const existing = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 1,
    req,
    where: {
      code: {
        equals: siteSeed.code,
      },
    },
  })

  const baseData = {
    name: siteSeed.name,
    code: siteSeed.code,
    primaryDomain: siteSeed.domain,
    supportedLocales: siteSeed.supportedLocales || ['vi', 'en'],
    defaultLocale: siteSeed.defaultLocale || 'vi',
    isActive: true,
  }

  if (existing.docs[0]) {
    return payload.update({
      collection: 'sites',
      id: existing.docs[0].id,
      req,
      context: seedContext,
      data: baseData,
    })
  }

  return payload.create({
    collection: 'sites',
    req,
    context: seedContext,
    data: seedData(baseData),
  })
}

async function clearSiteContent(payload: Payload, req: PayloadRequest, siteID: number | string) {
  await payload.db.deleteMany({
    collection: 'tour-departures' as never,
    req,
    where: {
      site: {
        equals: siteID,
      },
    },
  })

  await payload.db.deleteMany({
    collection: 'departure-variants' as never,
    req,
    where: {
      site: {
        equals: siteID,
      },
    },
  })

  await payload.db.deleteMany({
    collection: 'tour-campaigns' as never,
    req,
    where: {
      site: {
        equals: siteID,
      },
    },
  })

  await payload.db.deleteMany({
    collection: 'tour-products' as never,
    req,
    where: {
      site: {
        equals: siteID,
      },
    },
  })

  await payload.db.deleteMany({
    collection: 'site-settings',
    req,
    where: {
      site: {
        equals: siteID,
      },
    },
  })

  await payload.db.deleteMany({
    collection: 'posts',
    req,
    where: {
      site: {
        equals: siteID,
      },
    },
  })

  await payload.db.deleteMany({
    collection: 'pages',
    req,
    where: {
      site: {
        equals: siteID,
      },
    },
  })

  await payload.db.deleteMany({
    collection: 'categories',
    req,
    where: {
      site: {
        equals: siteID,
      },
    },
  })

  await payload.db.deleteMany({
    collection: 'media',
    req,
    where: {
      site: {
        equals: siteID,
      },
    },
  })

  await payload.db.deleteMany({
    collection: 'forms',
    req,
    where: {
      site: {
        equals: siteID,
      },
    },
  })
}

async function createMedia(
  payload: Payload,
  req: PayloadRequest,
  siteID: number | string,
  alt: string,
  captionTitle: string,
  captionText: string,
  source: string,
) {
  return payload.create({
    collection: 'media',
    locale: 'vi',
    req,
    context: seedContext,
    data: seedData({
      alt,
      caption: richText(captionTitle, captionText),
      site: siteID,
    }),
    file: await loadSeedFile(source),
  })
}

async function createCategory(
  payload: Payload,
  req: PayloadRequest,
  siteID: number | string,
  title: string,
  slug: string,
) {
  return payload.create({
    collection: 'categories',
    locale: 'vi',
    req,
    context: seedContext,
    data: seedData({
      title,
      slug,
      site: siteID,
    }),
  })
}

async function createForm(
  payload: Payload,
  req: PayloadRequest,
  siteID: number | string,
  title: string,
  submitButtonLabel: string,
  confirmationHeading: string,
  confirmationText: string,
  fields: unknown[],
) {
  return payload.create({
    collection: 'forms',
    locale: 'vi',
    req,
    context: seedContext,
    data: seedData({
      title,
      site: siteID,
      submitButtonLabel,
      confirmationType: 'message',
      confirmationMessage: richText(confirmationHeading, confirmationText),
      fields,
    }),
  })
}

async function createPage(
  payload: Payload,
  req: PayloadRequest,
  siteID: number | string,
  data: Record<string, unknown>,
) {
  const siteRecord = await payload.findByID({
    collection: 'sites',
    id: siteID,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const requestedSlug = typeof data.slug === 'string' ? data.slug : 'home'
  const explicitPathname =
    typeof data.pathname === 'string'
      ? data.pathname
      : requestedSlug === 'home'
        ? '/'
        : (() => {
            const parentPageID = normalizeRelationID(
              data.parentPage as Parameters<typeof normalizeRelationID>[0],
            )

            if (!parentPageID) {
              return `/${requestedSlug}`
            }

            return null
          })()

  let resolvedPathname = explicitPathname

  if (resolvedPathname === null) {
    const parentPageID = normalizeRelationID(
      data.parentPage as Parameters<typeof normalizeRelationID>[0],
    )

    if (parentPageID) {
      const parentPage = await payload.findByID({
        collection: 'pages',
        id: parentPageID,
        depth: 0,
        overrideAccess: true,
        req,
      })

      const parentPathname =
        parentPage.pathname && parentPage.pathname !== '/' ? parentPage.pathname : ''
      resolvedPathname = `${parentPathname}/${requestedSlug}`.replace(/\/+/g, '/')
    } else {
      resolvedPathname = `/${requestedSlug}`
    }
  }

  return payload.create({
    collection: 'pages',
    locale: 'vi',
    req,
    context: seedContext,
    data: seedData({
      ...data,
      _status: 'published',
      pathname: resolvedPathname,
      site: siteID,
      slug: `${siteRecord.code}-${requestedSlug}`,
    }),
  })
}

const parsePriceNumber = (value: string) => Number(value.replace(/[^\d]/g, ''))

const parseSeedDate = (value: string) => {
  const [day, month, year] = value.split('/').map((part) => Number(part))

  return new Date(Date.UTC(year, month - 1, day))
}

const toISODate = (value: Date) => value.toISOString()

const addDays = (value: Date, days: number) => {
  const next = new Date(value)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

const buildListItemsFromSentence = (value: string, fallback: string[] = []) => {
  const normalized = value.replace(/\.$/, '')
  const segments = normalized
    .split(/,|;| và /g)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)

  const source = segments.length > 0 ? segments : fallback

  return source.map((label) => ({ label }))
}

const buildItineraryDays = (itinerary: string, durationDays: number, mediaID?: number | string) => {
  const rawDays = itinerary
    .split(/\.\s+/)
    .map((entry) => entry.trim().replace(/\.$/, ''))
    .filter(Boolean)

  return Array.from({ length: durationDays }, (_, index) => {
    const summary = rawDays[index] || rawDays[rawDays.length - 1] || itinerary
    const dayNumber = index + 1

    return {
      dayNumber,
      title: `Ngày ${dayNumber}`,
      route: summary.split(' ').slice(0, 5).join(' '),
      summary,
      meals: 'Theo chương trình',
      transport: 'Máy bay / xe theo tuyến',
      accommodation: 'Khách sạn tiêu chuẩn line bán',
      notes: 'Có thể tinh chỉnh theo đợt khởi hành thực tế.',
      dayTheme: `Nhịp ngày ${dayNumber}`,
      dayHighlight:
        'Ngày được tổ chức để khách nhìn rõ route, nhịp tham quan và mức độ phù hợp trước khi giữ chỗ.',
      sleepingStandard: 'Khách sạn tiêu chuẩn line bán / xác nhận lại theo đợt đi',
      equipmentNote: 'Phương tiện triển khai theo lịch công bố của line bán',
      media: mediaID,
      gallery: [mediaID],
    }
  })
}

async function createTourProduct(
  payload: Payload,
  req: PayloadRequest,
  siteID: number | string,
  data: Record<string, unknown>,
): Promise<any> {
  return payload.create({
    collection: 'tour-products' as never,
    locale: 'vi',
    req,
    context: seedContext,
    data: seedData({
      ...data,
      _status: 'published',
      site: siteID,
    }),
  })
}

async function createTourDeparture(
  payload: Payload,
  req: PayloadRequest,
  siteID: number | string,
  data: Record<string, unknown>,
): Promise<any> {
  return payload.create({
    collection: 'tour-departures' as never,
    locale: 'vi',
    req,
    context: seedContext,
    data: seedData({
      ...data,
      _status: 'published',
      site: siteID,
    }),
  })
}

async function createDepartureVariant(
  payload: Payload,
  req: PayloadRequest,
  siteID: number | string,
  data: Record<string, unknown>,
): Promise<any> {
  return payload.create({
    collection: 'departure-variants' as never,
    locale: 'vi',
    req,
    context: seedContext,
    data: seedData({
      ...data,
      _status: 'published',
      site: siteID,
    }),
  })
}

async function createTourCampaign(
  payload: Payload,
  req: PayloadRequest,
  siteID: number | string,
  data: Record<string, unknown>,
): Promise<any> {
  return payload.create({
    collection: 'tour-campaigns' as never,
    locale: 'vi',
    req,
    context: seedContext,
    data: seedData({
      ...data,
      _status: 'published',
      site: siteID,
    }),
  })
}

async function updatePageLocale(
  payload: Payload,
  req: PayloadRequest,
  pageID: number | string,
  locale: SupportedSeedLocale,
  data: Record<string, unknown>,
) {
  const { pathname: _pathname, site: _site, slug: _slug, ...localizedData } = data
  const nextData = deepLocalizeSeedLinks(
    stripGeneratedIDs({
      ...localizedData,
      title: localizeSeedTitle(localizedData.title, locale),
    }),
    locale,
  )

  return payload.update({
    collection: 'pages',
    id: pageID,
    locale,
    req,
    context: seedContext,
    data: seedData(nextData),
  })
}

async function updatePostLocale(
  payload: Payload,
  req: PayloadRequest,
  postID: number | string,
  locale: SupportedSeedLocale,
  data: Record<string, unknown>,
) {
  const { slug: _slug, ...localizedData } = data
  const nextData = deepLocalizeSeedLinks(
    stripGeneratedIDs({
      ...localizedData,
      title: localizeSeedTitle(localizedData.title, locale),
    }),
    locale,
  )

  return payload.update({
    collection: 'posts',
    id: postID,
    locale,
    req,
    context: seedContext,
    data: seedData(nextData),
  })
}

async function updateCategoryLocale(
  payload: Payload,
  req: PayloadRequest,
  categoryID: number | string,
  locale: SupportedSeedLocale,
  data: Record<string, unknown>,
) {
  const { slug: _slug, ...localizedData } = data
  const nextData = {
    ...localizedData,
    title: localizeSeedTitle(localizedData.title, locale),
  }

  return payload.update({
    collection: 'categories',
    id: categoryID,
    locale,
    req,
    context: seedContext,
    data: seedData(nextData),
  })
}

async function createPost(
  payload: Payload,
  req: PayloadRequest,
  siteID: number | string,
  data: Record<string, unknown>,
) {
  return payload.create({
    collection: 'posts',
    locale: 'vi',
    req,
    context: seedContext,
    data: seedData({
      ...data,
      _status: 'published',
      site: siteID,
    }),
  })
}

async function seedThemePresets(payload: Payload, req: PayloadRequest) {
  const presetIDs = await ensureThemePresetSeeds(payload, req)
  Object.assign(themePresetIDsByKey, presetIDs)
}

function disableVersionWritesForSeed(payload: Payload) {
  const versionedCollections = [
    'pages',
    'posts',
    'tour-campaigns',
    'tour-departures',
    'tour-products',
  ] as const

  for (const slug of versionedCollections) {
    const collection = payload.collections[slug]

    if (collection?.config.versions) {
      collection.config.versions = false as never
    }
  }
}

function disableLocalTransactionsForSeed(payload: Payload) {
  const create = payload.create.bind(payload)
  const update = payload.update.bind(payload)
  const deleteOperation = payload.delete.bind(payload)
  const updateGlobal = payload.updateGlobal.bind(payload)

  payload.create = ((args) =>
    create({ ...args, disableTransaction: true } as never)) as typeof payload.create
  payload.update = ((args) =>
    update({ ...args, disableTransaction: true } as never)) as typeof payload.update
  payload.delete = ((args) =>
    deleteOperation({ ...args, disableTransaction: true } as never)) as typeof payload.delete
  payload.updateGlobal = ((args) =>
    updateGlobal({ ...args, disableTransaction: true } as never)) as typeof payload.updateGlobal
}

async function createSiteSettings(
  payload: Payload,
  req: PayloadRequest,
  site: Awaited<ReturnType<typeof upsertSite>>,
  siteSeed: SiteSeed,
  heroImageID: number | string,
  overrides: {
    footerNote?: string
    footerNavItems?: Array<ReturnType<typeof linkItem>>
    faviconImageID?: number | string
    headerNavItems?: Array<ReturnType<typeof linkItem>>
    logoImageID?: number | string | null
    supportEmail?: string
    supportPhone?: string
    tagline?: string
  } = {},
) {
  return payload.create({
    collection: 'site-settings',
    locale: 'vi',
    req,
    context: seedContext,
    data: seedData({
      site: site.id,
      siteName: siteSeed.name,
      tagline: overrides.tagline || siteSeed.summary,
      branding: {
        logoText: siteSeed.name,
        ...(siteSeed.brandColor ? { brandColor: siteSeed.brandColor } : {}),
        ...(siteSeed.accentColor ? { accentColor: siteSeed.accentColor } : {}),
        logoImage: overrides.logoImageID === undefined ? null : overrides.logoImageID,
        faviconImage: overrides.faviconImageID || heroImageID,
        // Tenant identity is `wing-side`, while the established visual theme
        // option is `wings-side`. Keep those separate instead of submitting an
        // invalid select value during deterministic fixture seeding.
        themeKey: siteSeed.code === 'wing-side' ? 'wings-side' : siteSeed.code,
        themePreset: themePresetIDsByKey[siteSeed.themePreset],
      },
      heroDefaults: {
        presentationPreset:
          heroPresentationPresetIDsByKey[
            siteHeroPresentationAssignments[siteSeed.code]?.presetKey || 'centered-classic'
          ],
        variant: siteHeroPresentationAssignments[siteSeed.code]?.variant || 'standard',
      },
      seo: {
        defaultTitle: siteSeed.name,
        titleSuffix: siteSeed.seoSuffix,
        defaultDescription: siteSeed.seoDescription,
        defaultImage: heroImageID,
        canonicalDomain: `https://${siteSeed.domain.replace('.local', '.vn')}`,
      },
      supportEmail: overrides.supportEmail || `hello@${siteSeed.domain.replace('.local', '.vn')}`,
      supportPhone: overrides.supportPhone || '+84 28 0000 0000',
      headerNavItems: overrides.headerNavItems || [linkItem('Trang chủ', '/')],
      footerNavItems: overrides.footerNavItems || [linkItem('Trang chủ', '/')],
      footerNote:
        overrides.footerNote ||
        `${siteSeed.name} runs as a child site inside the WingsGroup multisite platform.`,
    }),
  })
}

async function updateSiteSettingsLocale(
  payload: Payload,
  req: PayloadRequest,
  siteSettingsID: number | string,
  locale: SupportedSeedLocale,
  data: Record<string, unknown>,
) {
  return payload.update({
    collection: 'site-settings',
    id: siteSettingsID,
    locale,
    req,
    context: seedContext,
    data: seedData(deepLocalizeSeedLinks(stripGeneratedIDs(data), locale)),
  })
}

async function mirrorSiteContentToEnglish(
  payload: Payload,
  req: PayloadRequest,
  siteID: number | string,
) {
  const pages = await payload.find({
    collection: 'pages',
    depth: 0,
    limit: 1000,
    locale: 'vi',
    pagination: false,
    overrideAccess: true,
    req,
    where: {
      site: {
        equals: siteID,
      },
    },
  })

  for (const page of pages.docs) {
    await updatePageLocale(payload, req, page.id, 'en', {
      hero: page.hero,
      layout: page.layout,
      meta: page.meta,
      parentPage: page.parentPage,
      relatedPages: page.relatedPages,
      title: page.title,
    })
  }

  const posts = await payload.find({
    collection: 'posts',
    depth: 0,
    limit: 1000,
    locale: 'vi',
    pagination: false,
    overrideAccess: true,
    req,
    where: {
      site: {
        equals: siteID,
      },
    },
  })

  for (const post of posts.docs) {
    await updatePostLocale(payload, req, post.id, 'en', {
      categories: post.categories,
      content: post.content,
      heroImage: post.heroImage,
      meta: post.meta,
      relatedPosts: post.relatedPosts,
      title: post.title,
    })
  }

  const categories = await payload.find({
    collection: 'categories',
    depth: 0,
    limit: 1000,
    locale: 'vi',
    pagination: false,
    overrideAccess: true,
    req,
    where: {
      site: {
        equals: siteID,
      },
    },
  })

  for (const category of categories.docs) {
    await updateCategoryLocale(payload, req, category.id, 'en', {
      title: category.title,
    })
  }

  const settings = await payload.find({
    collection: 'site-settings',
    depth: 0,
    limit: 10,
    locale: 'vi',
    pagination: false,
    overrideAccess: true,
    req,
    where: {
      site: {
        equals: siteID,
      },
    },
  })

  for (const setting of settings.docs) {
    await updateSiteSettingsLocale(payload, req, setting.id, 'en', {
      footerNavItems: setting.footerNavItems,
      footerNote: setting.footerNote,
      headerNavItems: setting.headerNavItems,
      seo: setting.seo,
      tagline: setting.tagline,
    })
  }
}

async function createRedirect(payload: Payload, req: PayloadRequest, from: string, toURL: string) {
  const existing = await payload.find({
    collection: 'redirects',
    depth: 0,
    limit: 1,
    pagination: false,
    req,
    where: {
      from: {
        equals: from,
      },
    },
  })

  if (existing.docs[0]) {
    return payload.update({
      collection: 'redirects',
      id: existing.docs[0].id,
      req,
      context: seedContext,
      data: seedData({
        to: {
          type: 'custom',
          url: toURL,
        },
      }),
    })
  }

  return payload.create({
    collection: 'redirects',
    req,
    context: seedContext,
    data: seedData({
      from,
      to: {
        type: 'custom',
        url: toURL,
      },
    }),
  })
}

async function seedWingsGroup(payload: Payload, req: PayloadRequest, siteSeed: SiteSeed) {
  const site = await upsertSite(payload, req, siteSeed)
  await clearSiteContent(payload, req, site.id)

  const ecosystemHeroImage = await createMedia(
    payload,
    req,
    site.id,
    'WingsGroup corporate hub',
    'WingsGroup ecosystem',
    'Corporate hub for the VietWings digital ecosystem.',
    path.join(seedAssetsDir, 'wingsgroup-ecosystem-hero.png'),
  )
  const legacyLogoImage = await createMedia(
    payload,
    req,
    site.id,
    'VietWings Travel legacy logo',
    'Legacy brand reference',
    'Legacy logo asset from the previous public website used as a trust reference during the phase 1 transition.',
    'https://doicanhviet.com/upload/Image/Logo/LG-VW.png',
  )
  const outboundImage = await createMedia(
    payload,
    req,
    site.id,
    'Outbound travel programs',
    'Outbound retail routes',
    'Representative outbound image for Korea, Japan, and broader retail travel programs under the WingsGroup ecosystem.',
    path.join(seedAssetsDir, 'wingsgo-shizuoka-fuji-tokyo.png'),
  )
  const inboundImage = await createMedia(
    payload,
    req,
    site.id,
    'Inbound Vietnam journeys',
    'Inbound destination storytelling',
    'Representative visual for inbound destination planning and tailor-made journeys in Vietnam.',
    path.join(seedAssetsDir, 'wingsside-vietnam-journey-hero.png'),
  )
  const destinationHubImage = await createMedia(
    payload,
    req,
    site.id,
    'Vietnam destination planning',
    'Destination planning hub',
    'Destination-led planning visual used to explain consultative Vietnam journeys and ecosystem positioning.',
    path.join(seedAssetsDir, 'wingsside-destination-hub.png'),
  )
  const travelStyleImage = await createMedia(
    payload,
    req,
    site.id,
    'Travel style and curated journey design',
    'Curated journey styles',
    'Visual used to explain travel-style differentiation and curated itinerary design across the ecosystem.',
    path.join(seedAssetsDir, 'wingsside-travel-styles.png'),
  )
  const scheduleGuideImage = await createMedia(
    payload,
    req,
    site.id,
    'Departure and service planning guide',
    'Planning and schedule guide',
    'Visual reference for itinerary planning, schedule reading, and understanding structured product information.',
    path.join(seedAssetsDir, 'wingsgo-schedule-price-guide.png'),
  )
  const fastTrackImage = await createMedia(
    payload,
    req,
    site.id,
    'Airport fast-track services',
    'Airport service capability',
    'Airport fast-track and add-on service image used to explain high-speed airport support inside the WingsGroup ecosystem.',
    path.join(seedAssetsDir, 'wingspass-fast-track-hero.png'),
  )
  const premiumImage = await createMedia(
    payload,
    req,
    site.id,
    'Private and MICE travel proposals',
    'Premium and MICE capability',
    'Premium private tour and MICE proposal image used for high-value travel positioning.',
    path.join(seedAssetsDir, 'wingsplus-private-mice-hero.png'),
  )
  const careImage = await createMedia(
    payload,
    req,
    site.id,
    'Travel care and insurance support',
    'Care and insurance support',
    'Care-oriented support image used for insurance, after-sales support, and claim guidance.',
    path.join(seedAssetsDir, 'wingscare-travel-care-hero.png'),
  )

  const contactForm = await createForm(
    payload,
    req,
    site.id,
    'WingsGroup Ecosystem Contact',
    'Gửi liên hệ',
    'Đã nhận thông tin',
    'Đội quản trị WingsGroup sẽ phản hồi theo đúng line business liên quan.',
    [
      {
        blockName: 'full-name',
        blockType: 'text',
        name: 'full-name',
        label: 'Họ tên',
        required: true,
        width: 100,
      },
      {
        blockName: 'email',
        blockType: 'email',
        name: 'email',
        label: 'Email',
        required: true,
        width: 100,
      },
      {
        blockName: 'phone',
        blockType: 'text',
        name: 'phone',
        label: 'Số điện thoại',
        required: false,
        width: 100,
      },
      {
        blockName: 'business-line',
        blockType: 'select',
        name: 'business-line',
        label: 'Line business quan tâm',
        required: true,
        options: [
          {
            label: 'Tôi chưa chắc, cần tư vấn chung',
            value: 'general-routing',
          },
          {
            label: 'WingsGo - outbound retail',
            value: 'wingsgo',
          },
          {
            label: 'WingsSide - inbound Vietnam',
            value: 'wingsside',
          },
          {
            label: 'WingsPass - fast track',
            value: 'wingspass',
          },
          {
            label: 'WingsPlus - private / MICE',
            value: 'wingsplus',
          },
          {
            label: 'WingsCare - insurance / support',
            value: 'wingscare',
          },
        ],
        width: 100,
      },
      {
        blockName: 'message',
        blockType: 'textarea',
        name: 'message',
        label: 'Nội dung',
        required: true,
        width: 100,
      },
    ],
  )

  const createRootCategory = async (title: string, slug: string, englishTitle: string) => {
    const category = await createCategory(payload, req, site.id, title, slug)
    await updateCategoryLocale(payload, req, category.id, 'vi', {
      title,
    })
    await updateCategoryLocale(payload, req, category.id, 'en', {
      title: englishTitle,
    })

    return category
  }

  const createRootPage = async (
    vietnameseData: Record<string, unknown>,
    englishData: Record<string, unknown>,
  ) => {
    const page = await createPage(payload, req, site.id, vietnameseData)
    await updatePageLocale(payload, req, page.id, 'vi', vietnameseData)
    await updatePageLocale(payload, req, page.id, 'en', englishData)

    return page
  }

  const createRootPost = async (
    vietnameseData: Record<string, unknown>,
    englishData: Record<string, unknown>,
  ) => {
    const post = await createPost(payload, req, site.id, vietnameseData)
    await updatePostLocale(payload, req, post.id, 'vi', vietnameseData)
    await updatePostLocale(payload, req, post.id, 'en', englishData)

    return post
  }

  const ecosystemCategory = await createRootCategory(
    'Tin hệ sinh thái',
    'tin-he-sinh-thai',
    'Ecosystem News',
  )
  const capabilityCategory = await createRootCategory(
    'Năng lực dịch vụ',
    'nang-luc-dich-vu',
    'Service Capabilities',
  )
  const guideCategory = await createRootCategory(
    'Cẩm nang lựa chọn',
    'cam-nang-lua-chon',
    'Selection Guides',
  )
  const trendCategory = await createRootCategory(
    'Xu hướng du lịch',
    'xu-huong-du-lich',
    'Travel Trends',
  )
  const trustCategory = await createRootCategory(
    'Pháp lý và niềm tin',
    'phap-ly-va-niem-tin',
    'Trust And Legal',
  )

  const ecosystemPage = await createRootPage(
    {
      title: 'Hệ sinh thái dịch vụ',
      slug: 'he-sinh-thai',
      hero: {
        type: 'mediumImpact',
        media: ecosystemHeroImage.id,
        links: [
          linkItem('Khám phá WingsGo', 'https://wingsgo.vn', 'default'),
          linkItem('Liên hệ tư vấn', '/lien-he', 'outline'),
        ],
        richText: richText(
          'Một hệ sinh thái, nhiều hành trình chuyên biệt',
          'WingsGroup đóng vai trò lớp umbrella để khách hàng đi đúng site, đúng line business và đúng luồng tư vấn ngay từ lần truy cập đầu tiên.',
          'h1',
        ),
      },
      layout: [
        featureGridBlock(
          '5 site con với 5 vai trò khác nhau',
          'Mỗi site trong hệ có đối tượng khách, câu chuyện nội dung và CTA chính riêng để không trộn lẫn tour đại trà, khách quốc tế tại Việt Nam, dịch vụ sân bay, đề xuất cao cấp và chăm sóc sau bán.',
          [
            {
              title: 'WingsGo',
              description:
                'Điểm vào outbound retail với thị trường Hàn, Nhật, Trung, campaign mùa vụ, lịch khởi hành và tour detail rõ ràng.',
              imageID: outboundImage.id,
              meta: 'Outbound retail',
              url: 'https://wingsgo.vn',
            },
            {
              title: 'WingsSide',
              description:
                'Điểm vào dành cho khách quốc tế tại Việt Nam với nội dung theo điểm đến, phong cách du lịch, hành trình mẫu và luồng tư vấn.',
              imageID: inboundImage.id,
              meta: 'Tư vấn cho khách quốc tế',
              url: 'https://wingside.vn',
            },
            {
              title: 'WingsPass',
              description:
                'Điểm vào dịch vụ fast track theo sân bay, bảng giá, add-on và luồng gửi yêu cầu dịch vụ nhanh.',
              imageID: fastTrackImage.id,
              meta: 'Airport service',
              url: 'https://wingspass.wingsgroup.vn',
            },
            {
              title: 'WingsPlus',
              description:
                'Điểm vào private tours, MICE, special markets và proposal flow cho nhu cầu high-value.',
              imageID: premiumImage.id,
              meta: 'Private / MICE',
              url: 'https://wingsplus.vn',
            },
            {
              title: 'WingsCare',
              description:
                'Điểm vào insurance support, quyền lợi, claim guidance và after-sales care trong hệ sinh thái.',
              imageID: careImage.id,
              meta: 'Care support',
              url: 'https://wingscare.wingsgroup.vn',
            },
          ],
          'highlight',
          'Ecosystem roles',
        ),
        infoStripBlock(
          'Khi nào nên vào site nào',
          'Nếu khách đang tìm một tour bán lẻ có giá và lịch đi, họ không nên rơi vào một trang umbrella quá chung. Nếu khách chưa rõ nhu cầu, WingsGroup giữ vai trò điều hướng và tạo lớp trust trước khi chuyển tuyến.',
          [
            {
              label: 'Retail outbound',
              value: 'WingsGo',
              description:
                'Dành cho khách muốn duyệt tour Hàn, Nhật, Trung theo giá, ngày đi và campaign.',
            },
            {
              label: 'Khách quốc tế tại Việt Nam',
              value: 'WingsSide',
              description:
                'Dành cho khách quốc tế cần hành trình consultative, tailor-made và insight điểm đến.',
            },
            {
              label: 'Airport service',
              value: 'WingsPass',
              description:
                'Dành cho khách cần fast track, đón tiễn, add-on và thông tin theo sân bay.',
            },
            {
              label: 'High-value brief',
              value: 'WingsPlus',
              description:
                'Dành cho đoàn riêng, MICE, special market và chương trình cần proposal riêng.',
            },
            {
              label: 'Support and care',
              value: 'WingsCare',
              description: 'Dành cho quyền lợi, care support, insurance và hậu mãi.',
            },
          ],
          'Routing logic',
        ),
        ctaBlock(
          'Chưa chắc nên bắt đầu từ đâu?',
          'Gửi nhu cầu chung và đội vận hành sẽ phân loại để chuyển đúng line business trong hệ WingsGroup.',
          [linkItem('Gửi yêu cầu tư vấn', '/lien-he')],
        ),
      ],
      meta: {
        title: 'Hệ sinh thái WingsGroup',
        description:
          'Giải thích vai trò của WingsGo, WingsSide, WingsPass, WingsPlus và WingsCare trong hệ sinh thái WingsGroup.',
        image: ecosystemHeroImage.id,
        breadcrumbLabel: 'Hệ sinh thái',
      },
    },
    {
      title: 'Service Ecosystem',
      hero: {
        type: 'mediumImpact',
        media: ecosystemHeroImage.id,
        links: [
          linkItem('Explore WingsGo', 'https://wingsgo.vn', 'default'),
          linkItem('Contact the team', '/lien-he', 'outline'),
        ],
        richText: richText(
          'One ecosystem, several specialized customer journeys',
          'WingsGroup acts as the umbrella layer that helps visitors enter the right site, product line, and consultation flow from the first visit.',
          'h1',
        ),
      },
      layout: [
        featureGridBlock(
          'Five child sites, five distinct roles',
          'Each site serves a different customer journey so that retail discovery, inbound planning, airport services, premium proposals, and post-sales care do not collapse into one generic homepage.',
          [
            {
              title: 'WingsGo',
              description:
                'Outbound retail entry with Korea, Japan, and China market pages, campaign routes, departure visibility, and tour detail pages.',
              imageID: outboundImage.id,
              meta: 'Outbound retail',
              url: 'https://wingsgo.vn',
            },
            {
              title: 'WingsSide',
              description:
                'Inbound Vietnam entry with destination storytelling, travel styles, sample itineraries, and inquiry-first planning flows.',
              imageID: inboundImage.id,
              meta: 'Inbound consultative',
              url: 'https://wingside.vn',
            },
            {
              title: 'WingsPass',
              description:
                'Airport-service entry for fast-track services, add-ons, pricing, and service requests.',
              imageID: fastTrackImage.id,
              meta: 'Airport service',
              url: 'https://wingspass.wingsgroup.vn',
            },
            {
              title: 'WingsPlus',
              description:
                'Premium private-travel and MICE entry for high-value briefs that require tailored proposals.',
              imageID: premiumImage.id,
              meta: 'Private / MICE',
              url: 'https://wingsplus.vn',
            },
            {
              title: 'WingsCare',
              description:
                'Support and insurance entry for benefits, claim guidance, and post-sales assistance.',
              imageID: careImage.id,
              meta: 'Care support',
              url: 'https://wingscare.wingsgroup.vn',
            },
          ],
          'highlight',
          'Ecosystem roles',
        ),
        infoStripBlock(
          'How to choose the right entry point',
          'Visitors looking for a departure-driven retail tour should not be forced through a generic umbrella page. Visitors who are unsure of the right line should start here and route into the right child site.',
          [
            {
              label: 'Retail outbound',
              value: 'WingsGo',
              description:
                'For visitors comparing Korea, Japan, and China programs by departure and campaign.',
            },
            {
              label: 'Khách quốc tế tại Việt Nam',
              value: 'WingsSide',
              description:
                'For visitors planning tailor-made Vietnam journeys through consultation.',
            },
            {
              label: 'Airport service',
              value: 'WingsPass',
              description: 'For visitors who need fast-track, airport support, and add-ons.',
            },
            {
              label: 'High-value brief',
              value: 'WingsPlus',
              description: 'For private tours, MICE, and premium proposal-led work.',
            },
            {
              label: 'Support and care',
              value: 'WingsCare',
              description: 'For insurance support, care requests, and after-sales cases.',
            },
          ],
          'Routing logic',
        ),
        ctaBlock(
          'Not sure where to start?',
          'Send one general inquiry and the operations team will route it to the right line inside the WingsGroup ecosystem.',
          [linkItem('Send an inquiry', '/lien-he')],
        ),
      ],
      meta: {
        title: 'WingsGroup Ecosystem',
        description:
          'Understand the different roles of WingsGo, WingsSide, WingsPass, WingsPlus, and WingsCare inside the WingsGroup ecosystem.',
        image: ecosystemHeroImage.id,
        breadcrumbLabel: 'Ecosystem',
      },
    },
  )

  const aboutPage = await createRootPage(
    {
      title: 'Về WingsGroup',
      slug: 've-wingsgroup',
      hero: {
        type: 'lowImpact',
        richText: richText(
          'VietWings Travel đi từ doanh nghiệp du lịch thật sang hệ sinh thái số rõ vai trò',
          'WingsGroup kế thừa nền tảng pháp lý, năng lực vận hành và kinh nghiệm dịch vụ của doanh nghiệp cũ, rồi tách thành các site con rõ nhiệm vụ để phục vụ khách hàng tốt hơn.',
          'h1',
        ),
      },
      layout: [
        mediaBlock(legacyLogoImage.id),
        contentBlock([
          {
            size: 'half',
            title: 'Hình thành sau giai đoạn biến động',
            paragraph:
              'Theo website cũ doicanhviet.com, VietWings Travel được thành lập vào ngày 29/04/2022 với định hướng cung cấp các sản phẩm và dịch vụ du lịch trong và ngoài nước bằng trải nghiệm chỉn chu, bền vững và thích ứng nhanh với thị trường.',
          },
          {
            size: 'half',
            title: 'Từ một website tổng hợp sang kiến trúc hệ sinh thái',
            paragraph:
              'Thay vì dồn toàn bộ tour đại trà, hành trình cho khách quốc tế, dịch vụ sân bay, premium và chăm sóc sau bán vào một site duy nhất, WingsGroup mới phân lớp vai trò để khách truy cập hiểu nhanh họ nên đi tiếp vào đâu.',
          },
        ]),
        infoStripBlock(
          'Tầm nhìn, sứ mệnh và giá trị vận hành',
          'Website cũ đã xác lập hướng đi là một đơn vị du lịch tận tâm, chú trọng chất lượng dịch vụ và trải nghiệm khách hàng. Root site mới cần giữ nguyên tinh thần đó nhưng trình bày rõ hơn ở cấp corporate.',
          [
            {
              value: 'Tận tâm',
              label: 'Khách hàng là trung tâm',
              description:
                'Sự hài lòng của khách hàng là tiêu chí đầu tiên khi thiết kế dịch vụ, nội dung và cách điều phối tư vấn.',
            },
            {
              value: 'Chất lượng',
              label: 'Dịch vụ có tiêu chuẩn',
              description:
                'Từ retail outbound đến premium proposal, mọi line business đều cần ngôn ngữ dịch vụ rõ ràng, đáng tin và có khả năng bàn giao vận hành.',
            },
            {
              value: 'Thích ứng',
              label: 'Liên tục đổi mới',
              description:
                'WingsGroup được tổ chức để có thể mở thêm site, thêm nội dung và thêm locale mà không phải thay toàn bộ nền tảng.',
            },
          ],
          'Company principles',
        ),
        contentBlock([
          {
            size: 'oneThird',
            title: 'Outbound',
            paragraph:
              'Hàn, Nhật, Trung và các tuyến retail cần cấu trúc rõ về giá, ngày đi, campaign và tour detail.',
          },
          {
            size: 'oneThird',
            title: 'Khách quốc tế tại Việt Nam',
            paragraph:
              'Hành trình vào Việt Nam cần nội dung theo điểm đến, phong cách du lịch, hành trình tham khảo và luồng tư vấn rõ ràng.',
          },
          {
            size: 'oneThird',
            title: 'Corporate support',
            paragraph:
              'MICE, airport service, insurance và care support được đặt thành các line business có lớp trust và điều hướng riêng.',
          },
        ]),
        ctaBlock(
          'Muốn xem rõ hệ đang được tổ chức như thế nào?',
          'Đi tiếp sang trang Hệ sinh thái để so sánh vai trò từng site con trong hệ WingsGroup.',
          [linkItem('Xem hệ sinh thái', '/he-sinh-thai')],
        ),
      ],
      meta: {
        title: 'Về WingsGroup',
        description:
          'Giới thiệu về VietWings Travel, định vị hệ sinh thái WingsGroup, và cách doanh nghiệp được tổ chức lại thành nhiều site chuyên biệt.',
        image: legacyLogoImage.id,
        breadcrumbLabel: 'Về WingsGroup',
      },
    },
    {
      title: 'About WingsGroup',
      hero: {
        type: 'lowImpact',
        richText: richText(
          'From a real travel company to a clearly structured digital ecosystem',
          'WingsGroup carries forward the legal footprint, service capability, and operational experience of the legacy business, then reorganizes them into child sites with clearer roles.',
          'h1',
        ),
      },
      layout: [
        mediaBlock(legacyLogoImage.id),
        contentBlock([
          {
            size: 'half',
            title: 'Founded in a volatile period',
            paragraph:
              'The legacy public site states that VietWings Travel was established on 29 April 2022 with the mission of delivering stronger domestic and international travel products through dedicated service and long-term trust.',
          },
          {
            size: 'half',
            title: 'From one broad site to a cleaner ecosystem',
            paragraph:
              'Instead of forcing outbound retail, inbound Vietnam, airport support, premium proposals, and care support into one generic surface, WingsGroup now routes them into purpose-built child sites.',
          },
        ]),
        infoStripBlock(
          'Vision, mission, and working values',
          'The legacy business positioned itself around customer satisfaction, service quality, and the willingness to adapt. The new root site keeps those principles but presents them in a clearer corporate layer.',
          [
            {
              value: 'Dedication',
              label: 'Customer-first',
              description:
                'Customer satisfaction remains the first criterion in how the ecosystem is explained and routed.',
            },
            {
              value: 'Quality',
              label: 'Service standards',
              description:
                'Each line in the ecosystem must present a trustworthy and clearly structured service experience.',
            },
            {
              value: 'Adaptation',
              label: 'Continuous improvement',
              description:
                'The platform is built to add more sites, more content, and more locales without rebuilding the whole system.',
            },
          ],
          'Company principles',
        ),
        contentBlock([
          {
            size: 'oneThird',
            title: 'Outbound',
            paragraph:
              'Retail journeys need visible prices, departure logic, campaign routes, and tour detail structure.',
          },
          {
            size: 'oneThird',
            title: 'Khách quốc tế tại Việt Nam',
            paragraph:
              'Inbound journeys need destination storytelling, travel-style framing, and consultation-first planning.',
          },
          {
            size: 'oneThird',
            title: 'Corporate support',
            paragraph:
              'MICE, airport services, insurance, and care support sit as separate roles with their own trust layer.',
          },
        ]),
        ctaBlock(
          'Want to see how the ecosystem is organized?',
          'Continue to the ecosystem page to compare the purpose of each child site inside WingsGroup.',
          [linkItem('View the ecosystem', '/he-sinh-thai')],
        ),
      ],
      meta: {
        title: 'About WingsGroup',
        description:
          'Understand VietWings Travel, the WingsGroup umbrella role, and the transition from one broad legacy site to a structured multisite ecosystem.',
        image: legacyLogoImage.id,
        breadcrumbLabel: 'About',
      },
    },
  )

  const servicesPage = await createRootPage(
    {
      title: 'Năng lực dịch vụ',
      slug: 'nang-luc-dich-vu',
      hero: {
        type: 'mediumImpact',
        media: premiumImage.id,
        links: [
          linkItem('Khám phá các site con', '/he-sinh-thai', 'default'),
          linkItem('Gửi nhu cầu dịch vụ', '/lien-he', 'outline'),
        ],
        richText: richText(
          'Một doanh nghiệp, nhiều lớp năng lực dịch vụ',
          'WingsGroup không bán một loại hành trình duy nhất. Hệ này được tổ chức để phục vụ tour đại trà ra nước ngoài, hành trình cho khách quốc tế tại Việt Nam, hỗ trợ sân bay, đề xuất cao cấp và hỗ trợ sau bán dưới các bề mặt khác nhau.',
          'h1',
        ),
      },
      layout: [
        featureGridBlock(
          '5 cụm năng lực chính',
          'Trang này tóm tắt năng lực ở cấp corporate. Khi khách cần xem sâu một line business cụ thể, hệ sẽ chuyển họ sang child site tương ứng.',
          [
            {
              title: 'Outbound retail',
              description:
                'Các chương trình outbound cần giá, ngày đi, hãng bay, campaign và tour detail rõ ràng để khách so sánh nhanh.',
              imageID: outboundImage.id,
              meta: 'WingsGo',
              url: '/wingsgo',
            },
            {
              title: 'Khách quốc tế tại Việt Nam',
              description:
                'Khách quốc tế cần câu chuyện theo điểm đến, hành trình mẫu, phong cách du lịch và luồng tư vấn rõ ràng.',
              imageID: destinationHubImage.id,
              meta: 'WingsSide',
              url: '/wing-side',
            },
            {
              title: 'Airport service',
              description:
                'Fast track, đón tiễn và add-on sân bay cần pricing-first presentation cùng luồng giữ dịch vụ nhanh.',
              imageID: fastTrackImage.id,
              meta: 'WingsPass',
              url: '/wingspass',
            },
            {
              title: 'Private / MICE / high-value',
              description:
                'Các brief giá trị cao cần proposal riêng, case framing và cách nói năng lực khác hẳn retail.',
              imageID: premiumImage.id,
              meta: 'WingsPlus',
              url: '/wingsplus',
            },
            {
              title: 'Insurance / care support',
              description:
                'Chăm sóc sau bán, quyền lợi và claim guidance cần ngôn ngữ hỗ trợ rõ ràng, ưu tiên niềm tin.',
              imageID: careImage.id,
              meta: 'WingsCare',
              url: '/wingscare',
            },
          ],
          'highlight',
          'Corporate capability map',
        ),
        mediaBlock(travelStyleImage.id),
        contentBlock([
          {
            size: 'half',
            title: 'Khi khách hàng cần so sánh rõ',
            paragraph:
              'Retail outbound nên đi vào WingsGo vì nơi đó có logic giá, lịch khởi hành và campaign rõ. Root site chỉ nên giải thích tại sao line business đó tồn tại và nó phục vụ kiểu khách nào.',
          },
          {
            size: 'half',
            title: 'Khi khách hàng cần tư vấn sâu',
            paragraph:
              'Các nhu cầu khách quốc tế, private, MICE, dịch vụ sân bay và chăm sóc sau bán cần cách mô tả hành trình khác nhau. Root site có nhiệm vụ nêu năng lực tổng quan và chuyển đúng site chuyên sâu.',
          },
        ]),
        ctaBlock(
          'Có brief cụ thể cần phân loại nhanh?',
          'Gửi nhu cầu chung và đội vận hành sẽ điều phối sang site phù hợp thay vì để khách phải tự đoán toàn bộ cấu trúc hệ.',
          [linkItem('Gửi brief', '/lien-he')],
        ),
      ],
      meta: {
        title: 'Năng lực dịch vụ WingsGroup',
        description:
          'Tổng quan tour đại trà ra nước ngoài, hành trình cho khách quốc tế tại Việt Nam, fast track, private / MICE và chăm sóc sau bán trong hệ sinh thái WingsGroup.',
        image: premiumImage.id,
        breadcrumbLabel: 'Năng lực dịch vụ',
      },
    },
    {
      title: 'Service Capabilities',
      hero: {
        type: 'mediumImpact',
        media: premiumImage.id,
        links: [
          linkItem('Explore the child sites', '/he-sinh-thai', 'default'),
          linkItem('Send a service brief', '/lien-he', 'outline'),
        ],
        richText: richText(
          'One business, several service layers',
          'WingsGroup is not built around one generic travel offer. The ecosystem is structured to serve outbound retail, inbound Vietnam, airport support, premium proposals, and after-sales care through different surfaces.',
          'h1',
        ),
      },
      layout: [
        featureGridBlock(
          'Five core service clusters',
          'This page explains capability at the corporate level. When a visitor needs a deeper line-specific journey, the ecosystem routes them into the relevant child site.',
          [
            {
              title: 'Outbound retail',
              description:
                'Outbound programs need visible prices, departure logic, airline context, campaigns, and tour detail structure.',
              imageID: outboundImage.id,
              meta: 'WingsGo',
              url: '/wingsgo',
            },
            {
              title: 'Khách quốc tế tại Việt Nam',
              description:
                'Inbound guests need destination storytelling, sample itineraries, travel styles, and inquiry-first planning.',
              imageID: destinationHubImage.id,
              meta: 'WingsSide',
              url: '/wing-side',
            },
            {
              title: 'Airport service',
              description:
                'Fast-track, airport support, and add-ons need pricing-first presentation and quick service-request flows.',
              imageID: fastTrackImage.id,
              meta: 'WingsPass',
              url: '/wingspass',
            },
            {
              title: 'Private / MICE / high-value',
              description:
                'High-value briefs need proposal-led selling, capability framing, and different proof from retail pages.',
              imageID: premiumImage.id,
              meta: 'WingsPlus',
              url: '/wingsplus',
            },
            {
              title: 'Insurance / care support',
              description:
                'Benefits, claims, and after-sales care need clearer trust-first language and support expectations.',
              imageID: careImage.id,
              meta: 'WingsCare',
              url: '/wingscare',
            },
          ],
          'highlight',
          'Corporate capability map',
        ),
        contentBlock([
          {
            size: 'half',
            title: 'When visitors need clear comparison',
            paragraph:
              'Retail outbound belongs in WingsGo because that site is built around price, departure visibility, and campaign logic. The root site explains the business role, not the retail detail layer.',
          },
          {
            size: 'half',
            title: 'When visitors need consultative guidance',
            paragraph:
              'Inbound, private, MICE, airport support, and care support all need different framing. The root site provides capability overview and then routes into the specialist site.',
          },
        ]),
        ctaBlock(
          'Have a concrete service brief to classify?',
          'Send one general request and the team will route it to the correct line instead of making the visitor decode the full ecosystem alone.',
          [linkItem('Send a brief', '/lien-he')],
        ),
      ],
      meta: {
        title: 'WingsGroup Service Capabilities',
        description:
          'A corporate overview of outbound retail, inbound Vietnam, airport support, private / MICE, and care support inside WingsGroup.',
        image: premiumImage.id,
        breadcrumbLabel: 'Capabilities',
      },
    },
  )

  const trustPage = await createRootPage(
    {
      title: 'Tin cậy và pháp lý',
      slug: 'tin-cay-va-phap-ly',
      hero: {
        type: 'lowImpact',
        richText: richText(
          'Lớp trust của hệ sinh thái cần nói rõ và kiểm chứng được',
          'WingsGroup root site phải trả lời nhanh doanh nghiệp là ai, đang vận hành từ đâu, có giấy phép gì và khách nên liên hệ qua kênh nào.',
          'h1',
        ),
      },
      layout: [
        mediaBlock(legacyLogoImage.id),
        infoStripBlock(
          'Thông tin pháp lý chính',
          'Phần này kế thừa trực tiếp từ website cũ và được dùng như lớp trust nền cho toàn hệ. Đây không thay thế điều khoản cụ thể của từng child site, nhưng phải đủ để xác nhận pháp nhân và điểm liên hệ.',
          [
            {
              label: 'Pháp nhân',
              value: 'Công ty Cổ phần Du lịch Đôi Cánh Việt',
              description:
                'Tên doanh nghiệp dùng trên website cũ và lớp trust hiện tại của hệ sinh thái.',
            },
            {
              label: 'Mã số doanh nghiệp',
              value: '0109983118',
              description: 'Thông tin doanh nghiệp công bố trên website cũ.',
            },
            {
              label: 'Giấy phép lữ hành',
              value: '01-2336/2023/TCDL-GP LHQT',
              description: 'Giấy phép lữ hành quốc tế được dùng làm trust signal công khai.',
            },
            {
              label: 'Người đại diện',
              value: 'Phạm Nguyễn Quân',
              description: 'Thông tin người đại diện công bố trên website cũ.',
            },
            {
              label: 'Hotline',
              value: '0975513886',
              description: 'Kênh hotline công khai hiện tại.',
            },
          ],
          'Trust signals',
        ),
        contentBlock([
          {
            size: 'half',
            title: 'Vì sao page này phải tồn tại ở root site',
            paragraph:
              'Khách B2C, B2B và đối tác không nên phải tìm trust signal trong một trang tour bất kỳ. Root site cần gom lại các thông tin pháp lý, contact và nguyên tắc phục vụ ở tầng corporate.',
          },
          {
            size: 'half',
            title: 'Giới hạn của page này',
            paragraph:
              'Page này không thay thế điều khoản giao dịch chi tiết của từng line business. Nó là lớp xác minh doanh nghiệp và định tuyến trust cho toàn bộ hệ WingsGroup.',
          },
        ]),
        faqBlock(
          'Câu hỏi thường gặp về trust',
          'Các câu hỏi này giúp visitor hiểu page trust và legal của root site phục vụ mục đích gì.',
          [
            {
              question: 'Root site có phải nơi đặt toàn bộ điều khoản giao dịch chi tiết không?',
              answer:
                'Không. Root site giữ legal và trust ở mức umbrella. Điều khoản cụ thể có thể nằm ở child site phù hợp hoặc được xác nhận trong luồng tư vấn thực tế.',
            },
            {
              question: 'Vì sao vẫn cần child site nếu root site đã có phần trust?',
              answer:
                'Trust và legal là lớp nền ở cấp doanh nghiệp. Mỗi child site vẫn cần surface riêng để trình bày đúng hành trình khách, sản phẩm và CTA của line business đó.',
            },
          ],
          'FAQ',
        ),
      ],
      meta: {
        title: 'Tin cậy và pháp lý WingsGroup',
        description:
          'Trang tập trung trust signal, pháp lý, hotline, địa chỉ và nguyên tắc liên hệ chính thức của WingsGroup.',
        image: legacyLogoImage.id,
        breadcrumbLabel: 'Tin cậy & pháp lý',
      },
    },
    {
      title: 'Trust And Legal',
      hero: {
        type: 'lowImpact',
        richText: richText(
          'The ecosystem trust layer must be explicit and verifiable',
          'The WingsGroup root site should quickly answer who the business is, where it operates from, what legal footing it presents, and how visitors should make contact.',
          'h1',
        ),
      },
      layout: [
        mediaBlock(legacyLogoImage.id),
        infoStripBlock(
          'Core legal signals',
          'This section is derived from the legacy public site and acts as the base trust layer for the ecosystem. It does not replace child-site transaction terms, but it must be enough to confirm the business identity and contact footprint.',
          [
            {
              label: 'Legal entity',
              value: 'Doi Canh Viet Travel Joint Stock Company',
              description: 'The company identity presented on the legacy public site.',
            },
            {
              label: 'Business registration',
              value: '0109983118',
              description: 'Business registration number published on the legacy site.',
            },
            {
              label: 'Travel license',
              value: '01-2336/2023/TCDL-GP LHQT',
              description: 'International travel license presented as a public trust signal.',
            },
            {
              label: 'Representative',
              value: 'Pham Nguyen Quan',
              description: 'Representative information published on the legacy site.',
            },
            {
              label: 'Hotline',
              value: '0975513886',
              description: 'The public hotline currently shown on the legacy website.',
            },
          ],
          'Trust signals',
        ),
        contentBlock([
          {
            size: 'half',
            title: 'Why this page belongs on the root site',
            paragraph:
              'Trust signals should not be buried inside a random tour page. The root site should centralize legal identity, contact, and basic operating principles at the corporate level.',
          },
          {
            size: 'half',
            title: 'What this page does not replace',
            paragraph:
              'This page does not replace detailed transaction terms for each line business. It functions as the umbrella-level trust and legal layer for the WingsGroup ecosystem.',
          },
        ]),
        faqBlock(
          'Frequently asked trust questions',
          'These answers explain the role of the trust and legal layer on the root site.',
          [
            {
              question:
                'Does the root site hold every detailed transaction term for the ecosystem?',
              answer:
                'No. The root site holds umbrella-level legal and trust information. Detailed service terms may live on the relevant child site or be confirmed inside the service consultation flow.',
            },
            {
              question: 'Why keep child sites if the root site already carries trust signals?',
              answer:
                'Trust belongs at the corporate layer, but each child site still needs its own product story, content surface, and call to action for the customer journey it serves.',
            },
          ],
          'FAQ',
        ),
      ],
      meta: {
        title: 'WingsGroup Trust And Legal',
        description:
          'The public trust, legal identity, office details, and primary contact layer for the WingsGroup ecosystem.',
        image: legacyLogoImage.id,
        breadcrumbLabel: 'Trust & Legal',
      },
    },
  )

  const newsPage = await createRootPage(
    {
      title: 'Tin tức',
      slug: 'tin-tuc',
      hero: {
        type: 'lowImpact',
        richText: richText(
          'Tin tức, bài giải thích và lớp editorial chung của hệ',
          'Root site chỉ giữ lớp editorial mang tính thương hiệu, capability, trust và hướng dẫn chọn đúng line business. Các bài tour detail và traffic market-specific nên để child site gánh.',
          'h1',
        ),
      },
      layout: [
        infoStripBlock(
          'Các nhóm nội dung đang xuất bản',
          'Kho bài viết của WingsGroup được tổ chức theo vai trò umbrella thay vì trở thành một content hub tour tổng hợp.',
          [
            {
              label: 'Tin hệ sinh thái',
              value: 'Routing & brand',
              description: 'Giải thích hệ được tổ chức ra sao và từng site con phục vụ ai.',
            },
            {
              label: 'Năng lực dịch vụ',
              value: 'Capability',
              description:
                'Giải thích cách doanh nghiệp phục vụ tour nước ngoài, hành trình cho khách quốc tế, hỗ trợ sân bay, premium và chăm sóc sau bán.',
            },
            {
              label: 'Cẩm nang lựa chọn',
              value: 'Selection',
              description: 'Hướng dẫn khách chọn đúng line business và chuẩn bị brief rõ hơn.',
            },
            {
              label: 'Xu hướng du lịch',
              value: 'Travel trends',
              description:
                'Một phần nhỏ bài xu hướng để mở rộng bề mặt editorial nhưng không lấn sân child site.',
            },
          ],
          'Editorial categories',
        ),
        archiveBlock(
          [
            ecosystemCategory.id,
            capabilityCategory.id,
            guideCategory.id,
            trendCategory.id,
            trustCategory.id,
          ],
          'Bài viết mới nhất từ WingsGroup',
          'Kho bài viết này đóng vai trò trust, explanation và selection guide cho toàn hệ sinh thái.',
          12,
        ),
      ],
      meta: {
        title: 'Tin tức WingsGroup',
        description:
          'Kho bài viết về hệ sinh thái, năng lực dịch vụ, trust và cẩm nang lựa chọn trong WingsGroup.',
        image: ecosystemHeroImage.id,
        breadcrumbLabel: 'Tin tức',
      },
    },
    {
      title: 'News And Insights',
      hero: {
        type: 'lowImpact',
        richText: richText(
          'Editorial, explainers, and ecosystem-level insight',
          'The root site only holds brand, capability, trust, and selection-guide content. Tour detail and market-specific discovery should remain on the relevant child sites.',
          'h1',
        ),
      },
      layout: [
        infoStripBlock(
          'Editorial groups published here',
          'The WingsGroup archive is structured around umbrella-site roles rather than turning into a generic tour content hub.',
          [
            {
              label: 'Ecosystem news',
              value: 'Routing & brand',
              description: 'Explains how the ecosystem is organized and who each site serves.',
            },
            {
              label: 'Service capability',
              value: 'Capability',
              description:
                'Explains how the business supports outbound, inbound, airport service, premium work, and care.',
            },
            {
              label: 'Selection guides',
              value: 'Selection',
              description:
                'Helps visitors choose the right line business and prepare better briefs.',
            },
            {
              label: 'Travel trends',
              value: 'Travel trends',
              description:
                'A smaller trend layer that broadens editorial reach without competing with child-site route content.',
            },
          ],
          'Editorial categories',
        ),
        archiveBlock(
          [
            ecosystemCategory.id,
            capabilityCategory.id,
            guideCategory.id,
            trendCategory.id,
            trustCategory.id,
          ],
          'Latest posts from WingsGroup',
          'This archive acts as the trust, explanation, and selection-guide layer for the ecosystem.',
          12,
        ),
      ],
      meta: {
        title: 'WingsGroup News And Insights',
        description:
          'An editorial archive of ecosystem explainers, service capability notes, trust guidance, and selection guides.',
        image: ecosystemHeroImage.id,
        breadcrumbLabel: 'News',
      },
    },
  )

  const contactPage = await createRootPage(
    {
      title: 'Liên hệ WingsGroup',
      slug: 'lien-he',
      hero: {
        type: 'lowImpact',
        links: [
          linkItem('Gửi thông tin', '#contact-form', 'default'),
          linkItem('Chọn line business', '/he-sinh-thai', 'outline'),
        ],
        richText: richText(
          'Liên hệ một lần, điều phối đúng line business',
          'Nếu khách hàng chưa biết nên vào WingsGo, WingsSide, WingsPass, WingsPlus hay WingsCare, root site phải đóng vai trò tuyến tiếp nhận chung và điều phối về đội phù hợp.',
          'h1',
        ),
      },
      layout: [
        contentBlock([
          {
            size: 'half',
            title: 'Văn phòng giao dịch',
            paragraph:
              'Phòng 403 - Ngọc Khánh Plaza, số 1 Phạm Huy Thông, Ba Đình, Hà Nội. Đây là địa chỉ văn phòng giao dịch được công bố trên website cũ của doanh nghiệp.',
          },
          {
            size: 'half',
            title: 'Trụ sở đăng ký kinh doanh',
            paragraph:
              'Tầng 2, số nhà 28B ngõ 44 Hào Nam, Hà Nội. Root site cần giữ thông tin này như một lớp trust chung cho toàn hệ.',
          },
        ]),
        infoStripBlock(
          'Kênh liên hệ chính thức',
          'Mọi liên hệ không rõ line business nên đi qua root site để đội vận hành phân loại trước khi chuyển sang từng site con.',
          [
            {
              label: 'Hotline',
              value: '0975513886',
              description: 'Đầu mối hotline công khai từ website cũ.',
            },
            {
              label: 'Email',
              value: 'info@doicanhviet.com',
              description:
                'Email công khai hiện tại và nguồn tham chiếu trust trong giai đoạn chuyển đổi.',
            },
            {
              label: 'Facebook',
              value: 'VietWings Travel',
              description: 'Kênh social công khai hiện có trên website cũ.',
            },
          ],
          'Contact channels',
        ),
        formBlock(
          contactForm.id,
          'Gửi thông tin',
          'Chọn đúng line business hoặc chọn tư vấn chung để đội phụ trách điều phối và phản hồi.',
        ),
        featureGridBlock(
          'Cần đi thẳng tới line business cụ thể?',
          'Nếu khách đã biết họ cần gì, có thể đi thẳng sang site con tương ứng thay vì chờ root site phân loại.',
          [
            {
              title: 'WingsGo',
              description: 'Tour outbound, lịch khởi hành và campaign retail.',
              url: '/wingsgo',
            },
            {
              title: 'WingsSide',
              description:
                'Hành trình cho khách quốc tế tại Việt Nam với nội dung theo điểm đến và hành trình tham khảo.',
              url: '/wing-side',
            },
            {
              title: 'WingsPass',
              description: 'Fast track sân bay và add-on.',
              url: '/wingspass',
            },
            {
              title: 'WingsPlus',
              description: 'Private, MICE và proposal high-value.',
              url: '/wingsplus',
            },
            {
              title: 'WingsCare',
              description: 'Insurance support, care và claim guidance.',
              url: '/wingscare',
            },
          ],
          'minimal',
          'Direct routing',
        ),
      ],
      meta: {
        title: 'Liên hệ WingsGroup',
        description: 'Trang liên hệ và lead-routing chung cho toàn bộ hệ sinh thái WingsGroup.',
        image: legacyLogoImage.id,
        breadcrumbLabel: 'Liên hệ',
      },
    },
    {
      title: 'Contact WingsGroup',
      hero: {
        type: 'lowImpact',
        links: [
          linkItem('Send your inquiry', '#contact-form', 'default'),
          linkItem('Choose a business line', '/service-ecosystem', 'outline'),
        ],
        richText: richText(
          'One contact layer, routed to the right business line',
          'If visitors are not sure whether they need WingsGo, WingsSide, WingsPass, WingsPlus, or WingsCare, the root site should work as the shared intake and routing surface.',
          'h1',
        ),
      },
      layout: [
        contentBlock([
          {
            size: 'half',
            title: 'Operating office',
            paragraph:
              'Room 403 - Ngoc Khanh Plaza, 1 Pham Huy Thong Street, Ba Dinh, Hanoi. This is the office address published on the legacy public site.',
          },
          {
            size: 'half',
            title: 'Registered office',
            paragraph:
              '2nd Floor, 28B Lane 44 Hao Nam, Hanoi. The root site should retain this as part of the ecosystem trust layer.',
          },
        ]),
        infoStripBlock(
          'Official contact channels',
          'Any inquiry without a clear business-line destination should enter through the root site so the operations team can classify it before routing.',
          [
            {
              label: 'Hotline',
              value: '0975513886',
              description: 'The public hotline shown on the legacy website.',
            },
            {
              label: 'Email',
              value: 'info@doicanhviet.com',
              description:
                'The current public email and trust reference during the transition stage.',
            },
            {
              label: 'Facebook',
              value: 'VietWings Travel',
              description: 'The current public social channel from the legacy site.',
            },
          ],
          'Contact channels',
        ),
        formBlock(
          contactForm.id,
          'Send your inquiry',
          'Choose the right business line or select general routing so the team can classify and respond.',
        ),
        featureGridBlock(
          'Already know the right business line?',
          'Visitors who already know what they need can move directly into the relevant child site.',
          [
            {
              title: 'WingsGo',
              description: 'Outbound tours, departures, and retail campaigns.',
              url: '/wingsgo',
            },
            {
              title: 'WingsSide',
              description:
                'Hành trình cho khách quốc tế tại Việt Nam với nội dung theo điểm đến và hành trình tham khảo.',
              url: '/wing-side',
            },
            {
              title: 'WingsPass',
              description: 'Fast-track and airport add-on services.',
              url: '/wingspass',
            },
            {
              title: 'WingsPlus',
              description: 'Private, MICE, and high-value proposals.',
              url: '/wingsplus',
            },
            {
              title: 'WingsCare',
              description: 'Insurance support, care, and claim guidance.',
              url: '/wingscare',
            },
          ],
          'minimal',
          'Direct routing',
        ),
      ],
      meta: {
        title: 'Contact WingsGroup',
        description: 'The shared contact and lead-routing page for the WingsGroup ecosystem.',
        image: legacyLogoImage.id,
        breadcrumbLabel: 'Contact',
      },
    },
  )

  await createRootPage(
    {
      title: 'Chính sách bảo mật',
      slug: 'chinh-sach-bao-mat',
      hero: {
        type: 'lowImpact',
        richText: richText(
          'Chính sách bảo mật ở mức umbrella',
          'Trang này mô tả cách WingsGroup root site xử lý dữ liệu liên hệ và điều hướng yêu cầu ở cấp corporate. Điều khoản chi tiết hơn có thể áp dụng ở child site tương ứng khi phát sinh dịch vụ cụ thể.',
          'h1',
        ),
      },
      layout: [
        contentBlock([
          {
            size: 'full',
            title: 'Phạm vi áp dụng',
            paragraph:
              'Chính sách này áp dụng cho dữ liệu được gửi qua root site WingsGroup, bao gồm form liên hệ chung, yêu cầu điều hướng line business và các tương tác editorial ở cấp umbrella.',
          },
          {
            size: 'full',
            title: 'Loại dữ liệu có thể được thu thập',
            paragraph:
              'Tên, email, số điện thoại, line business quan tâm và nội dung brief là các trường dữ liệu chính mà root site thu nhận để phân loại yêu cầu và phản hồi.',
          },
          {
            size: 'full',
            title: 'Mục đích sử dụng',
            paragraph:
              'Dữ liệu được sử dụng để liên hệ lại, phân tuyến sang đúng site hoặc đội phụ trách, và giữ lịch sử trao đổi cần thiết cho việc phục vụ yêu cầu của khách hàng.',
          },
        ]),
        faqBlock(
          'Các nguyên tắc chính',
          'Root site giữ privacy ở mức corporate và không nên hứa những luồng xử lý vượt quá capability phase 1.',
          [
            {
              question: 'Dữ liệu gửi ở root site có thể được chuyển sang child site không?',
              answer:
                'Có. Nếu yêu cầu phù hợp với một line business cụ thể, dữ liệu sẽ được chuyển cho đội phụ trách để tiếp tục tư vấn hoặc xử lý.',
            },
            {
              question: 'Chính sách này có thay thế privacy policy riêng của child site không?',
              answer:
                'Không. Child site có thể có điều khoản hoặc luồng xử lý dữ liệu bổ sung khi phát sinh dịch vụ cụ thể.',
            },
          ],
          'Privacy principles',
        ),
      ],
      meta: {
        title: 'Chính sách bảo mật WingsGroup',
        description:
          'Chính sách bảo mật ở cấp corporate cho root site WingsGroup và các yêu cầu điều hướng lead trong hệ sinh thái.',
        image: legacyLogoImage.id,
        breadcrumbLabel: 'Bảo mật',
      },
    },
    {
      title: 'Privacy Policy',
      hero: {
        type: 'lowImpact',
        richText: richText(
          'Umbrella-level privacy policy',
          'This page explains how the WingsGroup root site handles contact data and routing requests at the corporate level. More specific service terms may apply on the relevant child site.',
          'h1',
        ),
      },
      layout: [
        contentBlock([
          {
            size: 'full',
            title: 'Scope',
            paragraph:
              'This policy applies to data submitted through the WingsGroup root site, including the general contact form, ecosystem routing requests, and umbrella-level editorial interactions.',
          },
          {
            size: 'full',
            title: 'Data that may be collected',
            paragraph:
              'Name, email, phone number, business line of interest, and the inquiry brief are the main data points collected by the root site.',
          },
          {
            size: 'full',
            title: 'Purpose of use',
            paragraph:
              'The data is used to respond, route the inquiry to the relevant site or team, and keep a necessary operating record for service follow-up.',
          },
        ]),
        faqBlock(
          'Key principles',
          'The root site keeps privacy language at the corporate layer and should not overstate handling beyond the actual phase 1 operation.',
          [
            {
              question: 'Can data submitted on the root site be transferred to a child site team?',
              answer:
                'Yes. When the inquiry clearly belongs to a specific line business, it may be routed to the relevant team or site for further handling.',
            },
            {
              question: 'Does this replace a child-site privacy policy?',
              answer:
                'No. A child site may carry more detailed data-handling terms when a specific service engagement takes place.',
            },
          ],
          'Privacy principles',
        ),
      ],
      meta: {
        title: 'WingsGroup Privacy Policy',
        description:
          'The corporate-level privacy policy for the WingsGroup root site and ecosystem routing inquiries.',
        image: legacyLogoImage.id,
        breadcrumbLabel: 'Privacy',
      },
    },
  )

  await createRootPage(
    {
      title: 'Điều khoản sử dụng',
      slug: 'dieu-khoan-su-dung',
      hero: {
        type: 'lowImpact',
        richText: richText(
          'Điều khoản sử dụng root site',
          'Root site WingsGroup tồn tại để giới thiệu hệ sinh thái, cung cấp thông tin trust và tiếp nhận yêu cầu điều hướng. Nó không đồng nghĩa với việc mọi giao dịch đều diễn ra trực tiếp trên bề mặt này.',
          'h1',
        ),
      },
      layout: [
        contentBlock([
          {
            size: 'full',
            title: 'Vai trò của root site',
            paragraph:
              'WingsGroup root site là lớp corporate và umbrella. Người dùng được kỳ vọng sử dụng site này để hiểu hệ, xem trust signal, đọc bài viết định hướng và gửi yêu cầu chung.',
          },
          {
            size: 'full',
            title: 'Giới hạn trách nhiệm ở cấp root site',
            paragraph:
              'Một số thông tin chi tiết về giá, lịch trình, quyền lợi hoặc điều kiện dịch vụ có thể chỉ được xác nhận đầy đủ ở child site hoặc trong quá trình tư vấn chính thức.',
          },
        ]),
        faqBlock(
          'Điều gì cần hiểu đúng',
          'Điều khoản sử dụng root site phải giúp visitor hiểu đúng bề mặt này dùng để làm gì.',
          [
            {
              question: 'Root site có thay toàn bộ điều khoản của mọi site con không?',
              answer:
                'Không. Root site chỉ giữ điều khoản ở mức umbrella. Mỗi site con có thể có quy định hoặc điều kiện bổ sung theo loại dịch vụ của mình.',
            },
            {
              question:
                'Thông tin trên root site có phải chào bán cuối cùng cho từng dịch vụ không?',
              answer:
                'Không. Root site chủ yếu mang tính giới thiệu, trust và điều hướng. Đề xuất dịch vụ cụ thể sẽ được xác nhận ở bề mặt phù hợp hoặc trong trao đổi tư vấn.',
            },
          ],
          'Usage terms',
        ),
      ],
      meta: {
        title: 'Điều khoản sử dụng WingsGroup',
        description: 'Điều khoản sử dụng ở cấp umbrella cho root site WingsGroup.',
        image: ecosystemHeroImage.id,
        breadcrumbLabel: 'Điều khoản',
      },
    },
    {
      title: 'Terms Of Use',
      hero: {
        type: 'lowImpact',
        richText: richText(
          'Terms of use for the root site',
          'The WingsGroup root site exists to explain the ecosystem, present trust information, and receive routing inquiries. It should not be interpreted as the sole transaction surface for every service line.',
          'h1',
        ),
      },
      layout: [
        contentBlock([
          {
            size: 'full',
            title: 'Role of the root site',
            paragraph:
              'The WingsGroup root site is the corporate and umbrella surface. Visitors are expected to use it to understand the ecosystem, review trust signals, read explainers, and submit general inquiries.',
          },
          {
            size: 'full',
            title: 'Limits at the root-site layer',
            paragraph:
              'Some detailed information about pricing, itinerary, benefits, or service conditions may only be fully confirmed on the relevant child site or during the formal consultation flow.',
          },
        ]),
        faqBlock(
          'What visitors should understand',
          'The terms of use should help visitors understand the intended function of the root site.',
          [
            {
              question: 'Does the root site replace all terms from all child sites?',
              answer:
                'No. The root site only holds umbrella-level usage terms. Each child site may carry additional terms specific to its service line.',
            },
            {
              question: 'Is all information on the root site a final service offer?',
              answer:
                'No. The root site is primarily explanatory, trust-oriented, and routing-focused. A specific service offer is confirmed in the relevant surface or consultation flow.',
            },
          ],
          'Usage terms',
        ),
      ],
      meta: {
        title: 'WingsGroup Terms Of Use',
        description: 'Umbrella-level terms of use for the WingsGroup root site.',
        image: ecosystemHeroImage.id,
        breadcrumbLabel: 'Terms',
      },
    },
  )

  await createRootPage(
    {
      title: 'Chính sách thanh toán',
      slug: 'chinh-sach-thanh-toan',
      hero: {
        type: 'lowImpact',
        richText: richText(
          'Chính sách thanh toán ở mức chung',
          'Root site mô tả nguyên tắc thanh toán và xác nhận dịch vụ ở mức umbrella. Điều khoản thanh toán cuối cùng có thể thay đổi theo line business, child site và hồ sơ dịch vụ cụ thể.',
          'h1',
        ),
      },
      layout: [
        contentBlock([
          {
            size: 'full',
            title: 'Nguyên tắc chung',
            paragraph:
              'Mọi yêu cầu đi từ root site sẽ được phân loại trước. Khi chuyển sang site con hoặc luồng tư vấn cụ thể, khách hàng sẽ được xác nhận phương thức thanh toán, mốc đặt cọc và phần còn lại theo dịch vụ thực tế.',
          },
          {
            size: 'full',
            title: 'Tại sao root site không công bố một policy giao dịch duy nhất cho toàn hệ',
            paragraph:
              'Outbound retail, airport service, MICE, private proposal và care support có đặc tính giao dịch khác nhau. Root site chỉ nên giữ chính sách ở mức corporate và dẫn khách tới bề mặt phù hợp để xác nhận đầy đủ.',
          },
        ]),
        faqBlock(
          'Thanh toán và xác nhận dịch vụ',
          'Đây là các giải thích cần có để tránh visitor hiểu nhầm rằng root site đã là bề mặt giao dịch hoàn chỉnh.',
          [
            {
              question: 'Khách có thể thanh toán trực tiếp ngay trên root site không?',
              answer:
                'Không trong phạm vi phase 1. Root site chủ yếu tiếp nhận brief và điều hướng. Xác nhận thanh toán sẽ diễn ra trong luồng child site hoặc trao đổi tư vấn tương ứng.',
            },
            {
              question: 'Root site có công bố mức đặt cọc cố định cho mọi dịch vụ không?',
              answer:
                'Không. Mức đặt cọc, thời điểm thanh toán và điều kiện xác nhận có thể khác nhau theo loại hành trình hoặc dịch vụ.',
            },
          ],
          'Payment policy',
        ),
      ],
      meta: {
        title: 'Chính sách thanh toán WingsGroup',
        description:
          'Chính sách thanh toán umbrella-level cho root site WingsGroup và nguyên tắc xác nhận dịch vụ theo từng line business.',
        image: fastTrackImage.id,
        breadcrumbLabel: 'Thanh toán',
      },
    },
    {
      title: 'Payment Policy',
      hero: {
        type: 'lowImpact',
        richText: richText(
          'Umbrella-level payment policy',
          'The root site describes payment and confirmation principles at a general level. Final payment terms may differ by line business, child site, and service brief.',
          'h1',
        ),
      },
      layout: [
        contentBlock([
          {
            size: 'full',
            title: 'General principle',
            paragraph:
              'Any request entering through the root site is classified first. Once it moves into a child-site or service-specific consultation flow, the visitor receives the relevant payment method, deposit timing, and balance terms.',
          },
          {
            size: 'full',
            title: 'Why the root site does not publish one master transaction rule',
            paragraph:
              'Outbound retail, airport service, MICE, private proposals, and care support have different transaction patterns. The root site should keep the policy at a corporate level and route visitors to the correct detailed surface.',
          },
        ]),
        faqBlock(
          'Payments and confirmation',
          'These answers prevent visitors from assuming that the root site is already a full transaction surface.',
          [
            {
              question: 'Can visitors pay directly on the root site in phase 1?',
              answer:
                'No. In phase 1 the root site mainly receives briefs and routes them. Payment confirmation happens inside the relevant child-site or service consultation flow.',
            },
            {
              question: 'Does the root site publish one fixed deposit rule for every service?',
              answer:
                'No. Deposit timing, payment milestones, and confirmation conditions may vary by journey type and service line.',
            },
          ],
          'Payment policy',
        ),
      ],
      meta: {
        title: 'WingsGroup Payment Policy',
        description:
          'Umbrella-level payment guidance for the WingsGroup root site and line-specific service confirmation.',
        image: fastTrackImage.id,
        breadcrumbLabel: 'Payment',
      },
    },
  )

  await createRootPage(
    {
      title: 'Chính sách hủy đổi',
      slug: 'chinh-sach-huy-doi',
      hero: {
        type: 'lowImpact',
        richText: richText(
          'Chính sách hủy đổi ở cấp umbrella',
          'Root site trình bày nguyên tắc chung để khách hiểu rằng điều kiện hủy đổi sẽ phụ thuộc loại dịch vụ, thời điểm xác nhận và site con đang xử lý yêu cầu.',
          'h1',
        ),
      },
      layout: [
        contentBlock([
          {
            size: 'full',
            title: 'Nguyên tắc chung',
            paragraph:
              'Điều kiện hủy, đổi hoặc dời lịch không thể dùng một công thức chung cho toàn hệ vì outbound retail, MICE, airport service hay care support có bản chất dịch vụ khác nhau.',
          },
          {
            size: 'full',
            title: 'Khi nào khách sẽ nhận được điều khoản cụ thể',
            paragraph:
              'Điều khoản cụ thể sẽ được xác nhận ở child site phù hợp hoặc trong quá trình tư vấn sau khi đội phụ trách đã hiểu rõ hành trình, dịch vụ và thời điểm phát sinh.',
          },
        ]),
        faqBlock(
          'Hủy đổi và dời lịch',
          'Phần này giúp đặt kỳ vọng đúng cho visitor trước khi họ đi sâu vào một line business cụ thể.',
          [
            {
              question: 'Root site có công bố một bảng phạt hủy áp dụng cho mọi dịch vụ không?',
              answer:
                'Không. Mức phạt, khả năng đổi lịch và giới hạn xử lý phụ thuộc loại dịch vụ, thời điểm phát sinh và điều khoản thực tế của line business liên quan.',
            },
            {
              question: 'Nếu khách gửi yêu cầu ở root site thì ai sẽ tư vấn phần hủy đổi?',
              answer:
                'Đội vận hành sẽ phân loại và chuyển sang site hoặc line business phù hợp để cung cấp điều khoản đúng theo tình huống cụ thể.',
            },
          ],
          'Cancellation policy',
        ),
      ],
      meta: {
        title: 'Chính sách hủy đổi WingsGroup',
        description:
          'Chính sách hủy đổi umbrella-level cho root site WingsGroup và nguyên tắc chuyển sang line business phù hợp để xác nhận chi tiết.',
        image: careImage.id,
        breadcrumbLabel: 'Hủy đổi',
      },
    },
    {
      title: 'Cancellation And Change Policy',
      hero: {
        type: 'lowImpact',
        richText: richText(
          'Umbrella-level cancellation and change policy',
          'The root site explains the general principle that cancellation and change conditions depend on the service type, confirmation stage, and child site handling the request.',
          'h1',
        ),
      },
      layout: [
        contentBlock([
          {
            size: 'full',
            title: 'General principle',
            paragraph:
              'Cancellation, change, and rescheduling terms cannot be reduced to one master rule for the whole ecosystem because outbound retail, MICE, airport support, and care support all behave differently.',
          },
          {
            size: 'full',
            title: 'When visitors receive specific terms',
            paragraph:
              'Specific conditions are confirmed in the relevant child-site or consultation flow once the responsible team understands the service type, itinerary, and timing.',
          },
        ]),
        faqBlock(
          'Cancellation and rescheduling',
          'This section sets the right expectation before visitors move into a specific business line.',
          [
            {
              question: 'Does the root site publish one penalty table for every service?',
              answer:
                'No. Penalty level, change flexibility, and handling limits depend on the service type, timing, and the actual terms of the relevant line business.',
            },
            {
              question:
                'Who handles change or cancellation if the first inquiry starts on the root site?',
              answer:
                'The operations team classifies the request and routes it to the site or business line that can confirm the right service-specific terms.',
            },
          ],
          'Cancellation policy',
        ),
      ],
      meta: {
        title: 'WingsGroup Cancellation And Change Policy',
        description:
          'Umbrella-level cancellation and change guidance for the WingsGroup root site and routing into the correct business line.',
        image: careImage.id,
        breadcrumbLabel: 'Cancellation',
      },
    },
  )

  const rootPostDefinitions = [
    {
      viTitle: 'Hệ sinh thái WingsGroup là gì?',
      enTitle: 'What is the WingsGroup ecosystem?',
      slug: 'he-sinh-thai-wingsgroup-la-gi',
      heroImageID: ecosystemHeroImage.id,
      categoryIDs: [ecosystemCategory.id],
      viDescription:
        'Giải thích vai trò umbrella site của WingsGroup và lý do hệ được tách thành nhiều site con.',
      enDescription:
        'Explains the umbrella role of WingsGroup and why the ecosystem is split into several child sites.',
      viSections: [
        { kind: 'heading', tag: 'h2', text: 'Vì sao không giữ một website tổng hợp như cũ' },
        {
          kind: 'paragraph',
          text: 'Website cũ doicanhviet.com gom rất nhiều loại nội dung vào cùng một nơi: tour outbound, tour nội địa, bài viết, dịch vụ phụ trợ và legal footer. Điều đó tạo được độ rộng, nhưng khiến visitor khó hiểu nên bắt đầu từ đâu nếu họ có một nhu cầu cụ thể.',
        },
        { kind: 'heading', tag: 'h2', text: 'WingsGroup mới giữ vai trò gì' },
        {
          kind: 'paragraph',
          text: 'WingsGroup mới không cố thay mọi child site. Root site giữ vai trò umbrella: giới thiệu hệ sinh thái, xác lập trust signal, gom legal corporate và tiếp nhận yêu cầu chưa rõ line business.',
        },
        { kind: 'heading', tag: 'h2', text: '5 site con giải quyết 5 hành trình khác nhau' },
        {
          kind: 'paragraph',
          text: 'WingsGo phục vụ retail outbound. WingsSide phục vụ inbound Vietnam. WingsPass phục vụ fast-track sân bay. WingsPlus phục vụ private, MICE và brief high-value. WingsCare phục vụ quyền lợi, care và hỗ trợ sau bán.',
        },
        { kind: 'heading', tag: 'h2', text: 'Visitor nên dùng root site thế nào' },
        {
          kind: 'paragraph',
          text: 'Nếu khách chưa biết họ cần line business nào, root site là nơi bắt đầu đúng. Nếu khách đã rõ nhu cầu, root site nên dẫn họ sang child site tương ứng càng nhanh càng tốt.',
        },
      ],
      enSections: [
        { kind: 'heading', tag: 'h2', text: 'Why not keep one broad legacy-style website' },
        {
          kind: 'paragraph',
          text: 'The legacy site gathered many different kinds of content in one place: outbound tours, domestic tours, articles, support services, and legal footer material. That breadth exists, but it makes it harder for visitors to understand where to start for a concrete need.',
        },
        { kind: 'heading', tag: 'h2', text: 'What the new WingsGroup root site does' },
        {
          kind: 'paragraph',
          text: 'The new root site does not try to replace every child site. It acts as the umbrella layer: ecosystem explanation, trust presentation, corporate legal context, and intake for inquiries that are not yet clearly classified.',
        },
        { kind: 'heading', tag: 'h2', text: 'Five child sites for five different journeys' },
        {
          kind: 'paragraph',
          text: 'WingsGo handles retail outbound. WingsSide handles inbound Vietnam. WingsPass handles airport support. WingsPlus handles private, MICE, and high-value briefs. WingsCare handles benefits, care, and after-sales support.',
        },
        { kind: 'heading', tag: 'h2', text: 'How visitors should use the root site' },
        {
          kind: 'paragraph',
          text: 'Visitors who are not yet sure which business line they need should start here. Visitors with a clear need should be routed into the correct child site as quickly as possible.',
        },
      ],
    },
    {
      viTitle: '5 site trong hệ WingsGroup khác nhau ra sao?',
      enTitle: 'How are the five WingsGroup child sites different?',
      slug: '5-site-trong-he-wingsgroup-khac-nhau-ra-sao',
      heroImageID: ecosystemHeroImage.id,
      categoryIDs: [ecosystemCategory.id, guideCategory.id],
      viDescription:
        'So sánh vai trò, đối tượng khách và CTA chính của từng site con trong hệ WingsGroup.',
      enDescription:
        'Compares the role, target audience, and main CTA of each child site in the WingsGroup ecosystem.',
      viSections: [
        { kind: 'heading', tag: 'h2', text: 'WingsGo: bán lẻ outbound' },
        {
          kind: 'paragraph',
          text: 'WingsGo dành cho khách muốn duyệt tour, xem campaign mùa vụ, đọc lịch khởi hành và so sánh chương trình retail outbound một cách trực tiếp.',
        },
        { kind: 'heading', tag: 'h2', text: 'WingsSide: tư vấn hành trình cho khách quốc tế' },
        {
          kind: 'paragraph',
          text: 'WingsSide không nên nói như một bảng giá retail. Site này cần nội dung theo điểm đến, hành trình tham khảo và luồng tư vấn dành cho khách quốc tế.',
        },
        { kind: 'heading', tag: 'h2', text: 'WingsPass, WingsPlus, WingsCare' },
        {
          kind: 'paragraph',
          text: 'WingsPass tập trung pricing airport service. WingsPlus tập trung năng lực proposal cho private, MICE và special market. WingsCare tập trung quyền lợi, claim guidance và hậu mãi.',
        },
        { kind: 'heading', tag: 'h2', text: 'Vai trò của root site trong so sánh này' },
        {
          kind: 'paragraph',
          text: 'Root site không nên mô tả sâu từng sản phẩm như child site. Nó chỉ cần cho visitor thấy rõ site nào là điểm vào đúng nhất.',
        },
      ],
      enSections: [
        { kind: 'heading', tag: 'h2', text: 'WingsGo: outbound retail' },
        {
          kind: 'paragraph',
          text: 'WingsGo is for visitors who want to browse tours, seasonal campaigns, departure schedules, and structured outbound retail detail.',
        },
        { kind: 'heading', tag: 'h2', text: 'WingsSide: inbound consultative' },
        {
          kind: 'paragraph',
          text: 'WingsSide should not feel like a retail price sheet. It needs destination storytelling, sample itineraries, and inquiry-first planning for international guests.',
        },
        { kind: 'heading', tag: 'h2', text: 'WingsPass, WingsPlus, WingsCare' },
        {
          kind: 'paragraph',
          text: 'WingsPass is pricing-first airport service. WingsPlus is proposal-led private and MICE capability. WingsCare is benefits, claims, and after-sales support.',
        },
        { kind: 'heading', tag: 'h2', text: 'What the root site should do here' },
        {
          kind: 'paragraph',
          text: 'The root site should not describe every product line in child-site detail. It should simply help visitors understand which entry point fits best.',
        },
      ],
    },
    {
      viTitle: 'Nên bắt đầu từ site nào trong hệ sinh thái WingsGroup?',
      enTitle: 'Which WingsGroup site should a visitor start with?',
      slug: 'nen-bat-dau-tu-site-nao-trong-he-sinh-thai-wingsgroup',
      heroImageID: scheduleGuideImage.id,
      categoryIDs: [guideCategory.id],
      viDescription:
        'Cẩm nang nhanh giúp visitor chọn đúng điểm vào giữa WingsGo, WingsSide, WingsPass, WingsPlus và WingsCare.',
      enDescription:
        'A quick guide to choosing the right entry point between WingsGo, WingsSide, WingsPass, WingsPlus, and WingsCare.',
      viSections: [
        { kind: 'heading', tag: 'h2', text: 'Bắt đầu từ nhu cầu thay vì từ menu' },
        {
          kind: 'paragraph',
          text: 'Cách chọn site đúng nhất là hỏi trước: khách đang cần duyệt tour bán lẻ, cần proposal riêng, cần làm hành trình inbound, cần fast-track sân bay hay đang cần hỗ trợ sau bán?',
        },
        { kind: 'heading', tag: 'h2', text: 'Nếu muốn xem giá và ngày đi' },
        {
          kind: 'paragraph',
          text: 'Hãy bắt đầu từ WingsGo. Đây là nơi phù hợp nhất cho retail outbound và các chiến dịch gắn với lịch khởi hành.',
        },
        { kind: 'heading', tag: 'h2', text: 'Nếu cần brief riêng hoặc hành trình theo yêu cầu' },
        {
          kind: 'paragraph',
          text: 'Inbound Vietnam nên đi qua WingsSide. Private / MICE / high-value nên đi qua WingsPlus. Fast-track sân bay nên đi qua WingsPass. Quyền lợi và care support nên đi qua WingsCare.',
        },
        { kind: 'heading', tag: 'h2', text: 'Nếu vẫn chưa chắc' },
        {
          kind: 'paragraph',
          text: 'Khi chưa rõ nhu cầu, root site là điểm vào đúng để đội vận hành phân loại thay vì để visitor tự suy luận toàn bộ cấu trúc hệ.',
        },
      ],
      enSections: [
        { kind: 'heading', tag: 'h2', text: 'Start from the need, not from the menu' },
        {
          kind: 'paragraph',
          text: 'The cleanest way to choose the right site is to ask first: is the visitor browsing retail tours, asking for a premium proposal, planning inbound Vietnam, requesting airport support, or seeking after-sales care?',
        },
        { kind: 'heading', tag: 'h2', text: 'If the visitor wants prices and departure dates' },
        {
          kind: 'paragraph',
          text: 'Start with WingsGo. It is the correct entry for outbound retail and campaign routes built around departure visibility.',
        },
        { kind: 'heading', tag: 'h2', text: 'If the visitor needs a tailored brief' },
        {
          kind: 'paragraph',
          text: 'Inbound Vietnam belongs in WingsSide. Private or MICE briefs belong in WingsPlus. Airport support belongs in WingsPass. Benefits and care belong in WingsCare.',
        },
        { kind: 'heading', tag: 'h2', text: 'If the visitor still is not sure' },
        {
          kind: 'paragraph',
          text: 'When the need is still unclear, the root site is the correct intake point so the operations team can classify the inquiry instead of forcing the visitor to decode the structure alone.',
        },
      ],
    },
    {
      viTitle: 'Năng lực tổ chức hành trình đoàn và MICE của VietWings',
      enTitle: 'VietWings capability for group travel and MICE',
      slug: 'nang-luc-to-chuc-hanh-trinh-doan-va-mice-cua-vietwings',
      heroImageID: premiumImage.id,
      categoryIDs: [capabilityCategory.id],
      viDescription:
        'Giải thích vì sao MICE và nhu cầu đoàn phải được trình bày ở lớp proposal, không thể dùng chung logic retail.',
      enDescription:
        'Explains why MICE and group travel should be framed through proposal-led capability instead of retail logic.',
      viSections: [
        { kind: 'heading', tag: 'h2', text: 'MICE không phải retail outbound phóng to' },
        {
          kind: 'paragraph',
          text: 'Một brief MICE cần cách nói về năng lực tổ chức, điều phối, lưu trú, timeline và proposal. Nếu dùng cùng cấu trúc với tour retail, giá trị doanh nghiệp sẽ bị làm phẳng.',
        },
        { kind: 'heading', tag: 'h2', text: 'Vai trò của WingsPlus' },
        {
          kind: 'paragraph',
          text: 'WingsPlus là lớp phù hợp để trình bày private journeys, proposal theo yêu cầu và các case cần năng lực bán solution thay vì chỉ bán chương trình cố định.',
        },
        { kind: 'heading', tag: 'h2', text: 'Vai trò của root site' },
        {
          kind: 'paragraph',
          text: 'Root site nên dùng bài viết kiểu này để giải thích năng lực doanh nghiệp, sau đó dẫn khách sang WingsPlus để đi tiếp vào luồng gửi brief.',
        },
      ],
      enSections: [
        { kind: 'heading', tag: 'h2', text: 'MICE is not just retail outbound at a bigger scale' },
        {
          kind: 'paragraph',
          text: 'A MICE brief needs language around coordination, accommodation logic, timing, operating capability, and proposal framing. If it is presented like a retail tour page, the business value is flattened.',
        },
        { kind: 'heading', tag: 'h2', text: 'Why WingsPlus exists' },
        {
          kind: 'paragraph',
          text: 'WingsPlus is the correct surface for private journeys, tailored proposals, and high-value cases that need solution-selling rather than a fixed itinerary page.',
        },
        { kind: 'heading', tag: 'h2', text: 'What the root site should do' },
        {
          kind: 'paragraph',
          text: 'The root site should use posts like this to explain the company capability and then route the visitor into WingsPlus for the actual proposal flow.',
        },
      ],
    },
    {
      viTitle: 'Fast track sân bay phù hợp khi nào?',
      enTitle: 'When do airport fast-track services make sense?',
      slug: 'fast-track-airport-services-khi-nao-nen-su-dung',
      heroImageID: fastTrackImage.id,
      categoryIDs: [capabilityCategory.id, guideCategory.id],
      viDescription:
        'Bài giải thích nhanh về trường hợp nên dùng fast-track và vì sao dịch vụ này cần một site riêng.',
      enDescription:
        'A quick explainer on when airport fast-track services are useful and why they need a dedicated site.',
      viSections: [
        { kind: 'heading', tag: 'h2', text: 'Fast-track là một nhu cầu dịch vụ khác retail tour' },
        {
          kind: 'paragraph',
          text: 'Khách tìm fast-track thường không cần đọc tour hay destination. Họ cần rõ sân bay nào có dịch vụ, gói nào phù hợp, giá bao nhiêu và phải gửi thông tin gì để giữ dịch vụ.',
        },
        { kind: 'heading', tag: 'h2', text: 'Vì sao WingsPass cần tách riêng' },
        {
          kind: 'paragraph',
          text: 'Airport service vận hành khác hoàn toàn với retail hoặc inbound planning. Pricing, mã dịch vụ, add-on và thời gian phản hồi là tín hiệu cốt lõi của bề mặt này.',
        },
        { kind: 'heading', tag: 'h2', text: 'Root site dùng bài này để làm gì' },
        {
          kind: 'paragraph',
          text: 'Root site dùng bài này để giải thích line business, sau đó dẫn khách sang WingsPass thay vì cố nhồi tất cả airport service vào chân trang của một website tổng hợp.',
        },
      ],
      enSections: [
        {
          kind: 'heading',
          tag: 'h2',
          text: 'Fast-track is a different service need from a retail trip',
        },
        {
          kind: 'paragraph',
          text: 'Visitors looking for fast-track support do not need destination storytelling first. They need to know which airport offers which service, what the package means, what it costs, and what information must be submitted.',
        },
        { kind: 'heading', tag: 'h2', text: 'Why WingsPass is separated' },
        {
          kind: 'paragraph',
          text: 'Airport services operate differently from retail travel or inbound planning. Pricing, service code, add-ons, and response expectations are the core signals for this surface.',
        },
        { kind: 'heading', tag: 'h2', text: 'What the root site uses this post for' },
        {
          kind: 'paragraph',
          text: 'The root site uses this kind of post to explain the business line, then routes the visitor into WingsPass instead of burying airport support inside a generic footer or support page.',
        },
      ],
    },
    {
      viTitle: 'Travel insurance và care support cần hiểu đúng điều gì?',
      enTitle: 'What should visitors understand about travel insurance and care support?',
      slug: 'travel-insurance-va-care-support-can-hieu-dung-dieu-gi',
      heroImageID: careImage.id,
      categoryIDs: [capabilityCategory.id, trustCategory.id],
      viDescription:
        'Giải thích vai trò của insurance, care support và hậu mãi trong hệ WingsGroup.',
      enDescription:
        'Explains the role of insurance, care support, and after-sales assistance in the WingsGroup ecosystem.',
      viSections: [
        {
          kind: 'heading',
          tag: 'h2',
          text: 'Bảo hiểm và care support không nên bị đẩy xuống footer',
        },
        {
          kind: 'paragraph',
          text: 'Website cũ có legal footer, nhưng customer support sau bán cần một bề mặt rõ hơn. Khách hàng muốn biết họ được hỗ trợ gì, liên hệ ở đâu và trường hợp nào cần chuẩn bị hồ sơ.',
        },
        { kind: 'heading', tag: 'h2', text: 'Vai trò của WingsCare' },
        {
          kind: 'paragraph',
          text: 'WingsCare tồn tại để nói ngôn ngữ hỗ trợ: quyền lợi, claim guidance, care flow và hậu mãi. Đây là một role khác hẳn retail marketing.',
        },
        { kind: 'heading', tag: 'h2', text: 'Root site phải làm gì' },
        {
          kind: 'paragraph',
          text: 'Root site nên giải thích tại sao care support là một line business riêng, sau đó đẩy khách sang WingsCare khi câu hỏi đã chạm tới quyền lợi hoặc xử lý cụ thể.',
        },
      ],
      enSections: [
        {
          kind: 'heading',
          tag: 'h2',
          text: 'Insurance and care support should not be buried in the footer',
        },
        {
          kind: 'paragraph',
          text: 'The legacy site carried a legal footer, but post-sales care needs a clearer operating surface. Visitors want to understand what kind of support exists, where to contact, and what documentation may be needed.',
        },
        { kind: 'heading', tag: 'h2', text: 'Why WingsCare exists' },
        {
          kind: 'paragraph',
          text: 'WingsCare speaks the language of support: benefits, claim guidance, care flow, and after-sales handling. That is a very different role from retail marketing.',
        },
        { kind: 'heading', tag: 'h2', text: 'What the root site must do' },
        {
          kind: 'paragraph',
          text: 'The root site should explain why care support is a distinct line and then route the visitor into WingsCare once the question becomes service-specific.',
        },
      ],
    },
    {
      viTitle: 'Cách chọn line outbound phù hợp cho Hàn, Nhật, Trung',
      enTitle: 'How to choose the right outbound line for Korea, Japan, and China',
      slug: 'cach-chon-dung-line-outbound-cho-han-nhat-trung',
      heroImageID: outboundImage.id,
      categoryIDs: [guideCategory.id, trendCategory.id],
      viDescription:
        'Bài cẩm nang umbrella-level giúp visitor hiểu lúc nào nên chuyển thẳng sang WingsGo.',
      enDescription:
        'An umbrella-level guide that helps visitors understand when to move directly into WingsGo.',
      viSections: [
        {
          kind: 'heading',
          tag: 'h2',
          text: 'Khi nào nên bỏ qua root site và đi thẳng sang WingsGo',
        },
        {
          kind: 'paragraph',
          text: 'Nếu khách đã biết họ đang tìm một tour outbound bán lẻ, cần so sánh giá, ngày đi hoặc campaign theo thị trường thì WingsGo là điểm vào đúng hơn root site.',
        },
        { kind: 'heading', tag: 'h2', text: 'Hàn, Nhật, Trung có logic retail khác nhau' },
        {
          kind: 'paragraph',
          text: 'Mỗi thị trường có seasonality, hãng bay, độ dài hành trình và campaign retail khác nhau. Bề mặt outbound cần được tổ chức để khách có thể xem theo market rồi đi tiếp vào tour detail.',
        },
        { kind: 'heading', tag: 'h2', text: 'Vai trò của bài viết ở root site' },
        {
          kind: 'paragraph',
          text: 'Bài ở root site chỉ nên giúp visitor hiểu cách chọn điểm vào đúng. Khi đã chạm tới so sánh chương trình cụ thể, traffic nên đi qua WingsGo.',
        },
      ],
      enSections: [
        {
          kind: 'heading',
          tag: 'h2',
          text: 'When to skip the root site and go directly to WingsGo',
        },
        {
          kind: 'paragraph',
          text: 'If the visitor already knows they are looking for an outbound retail tour and wants to compare price, departure timing, or market-specific campaigns, WingsGo is the better entry point.',
        },
        {
          kind: 'heading',
          tag: 'h2',
          text: 'Korea, Japan, and China follow different retail logic',
        },
        {
          kind: 'paragraph',
          text: 'Each market has different seasonality, airline patterns, route lengths, and campaign behavior. The outbound surface needs to be structured around those market differences.',
        },
        { kind: 'heading', tag: 'h2', text: 'What this article does on the root site' },
        {
          kind: 'paragraph',
          text: 'The post only helps visitors choose the right entry point. Once the comparison becomes program-specific, the traffic should move into WingsGo.',
        },
      ],
    },
    {
      viTitle: 'Vì sao Việt Nam phù hợp cho hành trình inbound tailor-made?',
      enTitle: 'Why Vietnam works well for tailor-made inbound journeys',
      slug: 'vi-sao-viet-nam-phu-hop-cho-hanh-trinh-inbound-tailor-made',
      heroImageID: inboundImage.id,
      categoryIDs: [trendCategory.id, capabilityCategory.id],
      viDescription:
        'Bài xu hướng ở cấp root site để giới thiệu logic inbound và dẫn khách sang WingsSide.',
      enDescription:
        'A trend-level article that introduces inbound journey logic and routes visitors into WingsSide.',
      viSections: [
        { kind: 'heading', tag: 'h2', text: 'Inbound không nên được bán như một bảng tour ghép' },
        {
          kind: 'paragraph',
          text: 'Khách quốc tế thường không mua Việt Nam như mua một retail departure page. Họ cần hiểu nhịp hành trình, tổ hợp điểm đến, phong cách du lịch và mức độ cá nhân hóa.',
        },
        { kind: 'heading', tag: 'h2', text: 'Tại sao WingsSide là bề mặt đúng' },
        {
          kind: 'paragraph',
          text: 'WingsSide có cụm điểm đến, các phong cách du lịch và hành trình tham khảo. Đó là cấu trúc đúng cho một hành trình Việt Nam thiết kế riêng theo nhu cầu tư vấn.',
        },
        { kind: 'heading', tag: 'h2', text: 'Root site chỉ nên làm gì' },
        {
          kind: 'paragraph',
          text: 'Root site có thể viết ở mức định hướng xu hướng và capability, sau đó chuyển traffic sang WingsSide để khách tiếp tục lên kế hoạch cụ thể.',
        },
      ],
      enSections: [
        {
          kind: 'heading',
          tag: 'h2',
          text: 'Inbound should not be sold like a shared retail departure table',
        },
        {
          kind: 'paragraph',
          text: 'International guests usually do not buy Vietnam the same way a retail outbound customer buys a departure-based page. They need pace, destination combination, travel style, and personalization context.',
        },
        { kind: 'heading', tag: 'h2', text: 'Why WingsSide is the right surface' },
        {
          kind: 'paragraph',
          text: 'WingsSide provides destination hubs, travel styles, and sample itineraries. That is the right structure for tailor-made or inquiry-led inbound planning.',
        },
        { kind: 'heading', tag: 'h2', text: 'What the root site should do instead' },
        {
          kind: 'paragraph',
          text: 'The root site can write at the level of trend and capability, then route the visitor into WingsSide for actual trip planning.',
        },
      ],
    },
    {
      viTitle: 'Xu hướng du lịch cao cấp và private journey 2026',
      enTitle: 'Premium travel and private-journey trends for 2026',
      slug: 'xu-huong-du-lich-cao-cap-va-private-journey-2026',
      heroImageID: premiumImage.id,
      categoryIDs: [trendCategory.id],
      viDescription:
        'Bài xu hướng giúp root site có bề mặt editorial nhưng vẫn giữ vai trò umbrella và dẫn sang WingsPlus.',
      enDescription:
        'A trend piece that expands the root-site editorial layer while still routing premium demand into WingsPlus.',
      viSections: [
        {
          kind: 'heading',
          tag: 'h2',
          text: 'Du lịch cao cấp không còn chỉ là hạng vé và khách sạn',
        },
        {
          kind: 'paragraph',
          text: 'Khách high-value ngày càng kỳ vọng vào pacing, privacy, dịch vụ, tính linh hoạt và khả năng thiết kế proposal theo ngữ cảnh chứ không chỉ một bảng giá đẹp hơn.',
        },
        { kind: 'heading', tag: 'h2', text: 'Private journey cần bề mặt proposal-led' },
        {
          kind: 'paragraph',
          text: 'Một site kiểu retail không đủ để bán private hoặc MICE. Những brief này cần năng lực kể chuyện bằng case, capability và cơ chế gửi yêu cầu rõ ràng.',
        },
        { kind: 'heading', tag: 'h2', text: 'Vai trò của root site' },
        {
          kind: 'paragraph',
          text: 'Root site có thể dùng bài xu hướng này để mở rộng bề mặt editorial, nhưng mọi CTA chính nên chuyển về WingsPlus để giữ đúng chức năng của hệ.',
        },
      ],
      enSections: [
        {
          kind: 'heading',
          tag: 'h2',
          text: 'Premium travel is no longer only about flight class and hotel stars',
        },
        {
          kind: 'paragraph',
          text: 'High-value guests increasingly expect privacy, pace control, service smoothness, and proposal flexibility rather than only a more expensive version of a retail product.',
        },
        { kind: 'heading', tag: 'h2', text: 'Private journeys need a proposal-led surface' },
        {
          kind: 'paragraph',
          text: 'A retail-style site is not enough to sell private or MICE work. Those briefs need case framing, capability proof, and a clear proposal intake flow.',
        },
        { kind: 'heading', tag: 'h2', text: 'What the root site should do' },
        {
          kind: 'paragraph',
          text: 'The root site can use a trend piece like this to broaden editorial reach, but the main CTA should still route into WingsPlus to preserve the ecosystem role.',
        },
      ],
    },
    {
      viTitle: 'Khách hàng cần kiểm tra gì trước khi đặt dịch vụ du lịch?',
      enTitle: 'What should visitors check before committing to a travel service?',
      slug: 'nhung-gi-khach-hang-can-kiem-tra-truoc-khi-dat-dich-vu-du-lich',
      heroImageID: scheduleGuideImage.id,
      categoryIDs: [guideCategory.id, trustCategory.id],
      viDescription:
        'Bài trust-first giúp root site đưa ra checklist chọn đơn vị du lịch và dẫn về page trust/legal.',
      enDescription:
        'A trust-first checklist that helps visitors evaluate a travel provider and route back into the trust/legal layer.',
      viSections: [
        { kind: 'heading', tag: 'h2', text: 'Đừng chỉ nhìn giá hoặc visual campaign' },
        {
          kind: 'paragraph',
          text: 'Giá và hình ảnh là lớp mở đầu, nhưng khách vẫn nên kiểm tra pháp nhân, giấy phép lữ hành, kênh liên hệ chính thức và cách doanh nghiệp trình bày quyền lợi hay hỗ trợ sau bán.',
        },
        { kind: 'heading', tag: 'h2', text: 'Kiểm tra bề mặt có đúng nhu cầu không' },
        {
          kind: 'paragraph',
          text: 'Nếu đang tìm retail outbound, hãy vào đúng bề mặt như WingsGo. Nếu đang tìm MICE hay fast-track, hãy tìm site chuyên biệt tương ứng thay vì đọc một website chung quá rộng.',
        },
        { kind: 'heading', tag: 'h2', text: 'Root site hỗ trợ bước nào' },
        {
          kind: 'paragraph',
          text: 'Root site giúp khách kiểm tra trust, hiểu hệ sinh thái và tìm được site con đúng nhất trước khi đi sâu vào dịch vụ cụ thể.',
        },
      ],
      enSections: [
        { kind: 'heading', tag: 'h2', text: 'Do not evaluate only from price or campaign visuals' },
        {
          kind: 'paragraph',
          text: 'Price and creative are only the first layer. Visitors should still verify legal identity, travel license, official contact channels, and how the company presents support and after-sales expectations.',
        },
        { kind: 'heading', tag: 'h2', text: 'Check whether the surface matches the need' },
        {
          kind: 'paragraph',
          text: 'If the need is outbound retail, use a dedicated surface like WingsGo. If the need is MICE or fast-track, move into the specialist site instead of relying on one broad general site.',
        },
        { kind: 'heading', tag: 'h2', text: 'What the root site contributes' },
        {
          kind: 'paragraph',
          text: 'The root site helps visitors verify trust, understand the ecosystem, and enter the most relevant child site before engaging with a concrete service line.',
        },
      ],
    },
    {
      viTitle: 'Giấy phép lữ hành và trust signal quan trọng khi chọn công ty du lịch',
      enTitle: 'Travel-license and trust signals that matter when choosing a travel company',
      slug: 'giay-phep-lu-hanh-va-cac-tin-hieu-trust-khi-chon-cong-ty-du-lich',
      heroImageID: legacyLogoImage.id,
      categoryIDs: [trustCategory.id],
      viDescription:
        'Bài trust-oriented dùng dữ liệu công khai từ website cũ để giải thích visitor nên nhìn gì khi đánh giá một công ty du lịch.',
      enDescription:
        'A trust-oriented article built from public legacy-site data to explain what visitors should verify when evaluating a travel company.',
      viSections: [
        { kind: 'heading', tag: 'h2', text: 'Trust signal không chỉ là một logo đẹp' },
        {
          kind: 'paragraph',
          text: 'Một doanh nghiệp du lịch đáng tin cần thể hiện được pháp nhân, giấy phép, địa chỉ giao dịch, người đại diện và kênh liên hệ công khai. Những tín hiệu này giúp khách đánh giá đúng hơn trước khi đi sâu vào sản phẩm.',
        },
        { kind: 'heading', tag: 'h2', text: 'Website cũ đã để lại những gì có giá trị' },
        {
          kind: 'paragraph',
          text: 'Website cũ của doanh nghiệp đã công khai mã số doanh nghiệp, giấy phép lữ hành, hotline, email và các địa chỉ liên hệ. Root site mới cần giữ lại những trust signal này thay vì chỉ dùng lớp visual marketing.',
        },
        { kind: 'heading', tag: 'h2', text: 'Root site phải gom trust về một nơi' },
        {
          kind: 'paragraph',
          text: 'Khi trust signal bị phân tán trong footer hoặc page con, visitor khó xác minh nhanh. Root site nên có page và bài viết riêng để gom lại toàn bộ lớp trust ở cấp corporate.',
        },
      ],
      enSections: [
        { kind: 'heading', tag: 'h2', text: 'A trust signal is more than a good-looking logo' },
        {
          kind: 'paragraph',
          text: 'A trustworthy travel business should present legal identity, license information, office footprint, representative details, and official contact channels. These signals let visitors evaluate the company before they study a specific product.',
        },
        { kind: 'heading', tag: 'h2', text: 'What the legacy site already provided' },
        {
          kind: 'paragraph',
          text: 'The legacy public site already exposed business registration, travel license, hotline, email, and office details. The new root site should preserve these trust signals instead of relying only on visual marketing.',
        },
        { kind: 'heading', tag: 'h2', text: 'The root site should centralize trust' },
        {
          kind: 'paragraph',
          text: 'When trust signals are scattered across footers or subpages, visitors cannot verify them quickly. The root site should centralize the entire corporate trust layer in dedicated pages and articles.',
        },
      ],
    },
  ] as const

  for (const definition of rootPostDefinitions) {
    await createRootPost(
      {
        title: definition.viTitle,
        slug: definition.slug,
        heroImage: definition.heroImageID,
        content: richTextFromSections(definition.viSections),
        categories: definition.categoryIDs,
        meta: {
          title: definition.viTitle,
          description: definition.viDescription,
          image: definition.heroImageID,
          breadcrumbLabel: definition.viTitle,
        },
      },
      {
        title: definition.enTitle,
        content: richTextFromSections(definition.enSections),
        meta: {
          title: definition.enTitle,
          description: definition.enDescription,
          image: definition.heroImageID,
          breadcrumbLabel: definition.enTitle,
        },
      },
    )
  }

  await createRootPage(
    {
      title: 'WingsGroup',
      slug: 'home',
      hero: {
        type: 'highImpact',
        presentation: 'centered-visual',
        variant: 'standard',
        media: ecosystemHeroImage.id,
        links: [
          linkItem('Khám phá hệ sinh thái', '/he-sinh-thai', 'default'),
          linkItem('Liên hệ tư vấn', '/lien-he', 'outline'),
        ],
        richText: richText(
          'WingsGroup - hệ sinh thái du lịch nhiều line business dưới một lớp tin cậy chung',
          'Từ tour đại trà ra nước ngoài và hành trình cho khách quốc tế tại Việt Nam đến hỗ trợ sân bay, private/MICE và chăm sóc sau bán, WingsGroup giúp khách đi đúng bề mặt, đúng nội dung và đúng đội phụ trách.',
          'h1',
        ),
      },
      layout: [
        featureGridBlock(
          '5 child site trong hệ sinh thái',
          'Root site không thay child site. Nó giới thiệu, xác lập trust và đưa visitor sang đúng bề mặt có khả năng chuyển đổi cao nhất.',
          [
            {
              title: 'WingsGo',
              description:
                'Outbound retail với campaign, lịch khởi hành và tour detail theo Hàn, Nhật, Trung.',
              imageID: outboundImage.id,
              meta: 'Retail outbound',
              url: '/wingsgo',
            },
            {
              title: 'WingsSide',
              description:
                'Hành trình cho khách quốc tế tại Việt Nam với nội dung theo điểm đến, phong cách du lịch và hành trình mẫu.',
              imageID: inboundImage.id,
              meta: 'Tư vấn hành trình',
              url: '/wing-side',
            },
            {
              title: 'WingsPass',
              description:
                'Fast-track theo sân bay, bảng giá, add-on và luồng gửi yêu cầu giữ dịch vụ.',
              imageID: fastTrackImage.id,
              meta: 'Airport support',
              url: '/wingspass',
            },
            {
              title: 'WingsPlus',
              description:
                'Private tour, MICE và proposal high-value cho các brief cần năng lực giải pháp.',
              imageID: premiumImage.id,
              meta: 'Premium consultative',
              url: '/wingsplus',
            },
            {
              title: 'WingsCare',
              description:
                'Insurance support, care flow và hậu mãi cho các tình huống cần xử lý theo hướng ưu tiên niềm tin.',
              imageID: careImage.id,
              meta: 'Care support',
              url: '/wingscare',
            },
          ],
          'highlight',
          'Ecosystem overview',
        ),
        infoStripBlock(
          'Tín hiệu trust ngay trên trang chủ',
          'Khách truy cập root site cần nhìn thấy rõ đây là doanh nghiệp thật, có legal footprint rõ và có cấu trúc dịch vụ được tổ chức hợp lý.',
          [
            {
              label: 'Giấy phép lữ hành',
              value: '01-2336/2023/TCDL-GP LHQT',
              description: 'Trust signal công khai ở cấp corporate.',
            },
            {
              label: 'Mã số doanh nghiệp',
              value: '0109983118',
              description: 'Thông tin pháp nhân công khai trên website cũ.',
            },
            {
              label: 'Site con đang phát triển',
              value: '5',
              description: 'WingsGo, WingsSide, WingsPass, WingsPlus và WingsCare.',
            },
            {
              label: 'Ngôn ngữ phase 1',
              value: 'vi / en',
              description: 'Root site và child site đều giữ baseline song ngữ.',
            },
          ],
          'Trust signals',
        ),
        featureGridBlock(
          'Năng lực ở cấp doanh nghiệp',
          'Các cụm năng lực này cho khách thấy WingsGroup là lớp corporate, còn line business chi tiết sẽ được triển khai ở site chuyên biệt.',
          [
            {
              title: 'Outbound retail',
              description: 'Tour outbound theo thị trường, campaign và lịch khởi hành.',
              imageID: outboundImage.id,
              meta: 'WingsGo',
              url: '/nang-luc-dich-vu',
            },
            {
              title: 'Khách quốc tế tại Việt Nam',
              description: 'Destination-led planning và tailor-made journey cho khách quốc tế.',
              imageID: destinationHubImage.id,
              meta: 'WingsSide',
              url: '/nang-luc-dich-vu',
            },
            {
              title: 'Airport services',
              description: 'Fast-track, airport support và add-on theo sân bay.',
              imageID: fastTrackImage.id,
              meta: 'WingsPass',
              url: '/nang-luc-dich-vu',
            },
            {
              title: 'Private and MICE',
              description: 'Proposal-led service cho nhu cầu high-value, delegation và corporate.',
              imageID: premiumImage.id,
              meta: 'WingsPlus',
              url: '/nang-luc-dich-vu',
            },
            {
              title: 'Insurance and care',
              description: 'Quyền lợi, claim guidance và hậu mãi có trust layer riêng.',
              imageID: careImage.id,
              meta: 'WingsCare',
              url: '/nang-luc-dich-vu',
            },
          ],
          'default',
          'Service overview',
        ),
        contentBlock([
          {
            size: 'half',
            title: 'Không lặp lại mô hình website cũ',
            paragraph:
              'Website cũ có độ rộng lớn nhưng trộn nhiều loại nhu cầu vào cùng một chỗ. Root site mới giữ nội dung trust, năng lực và routing; các site con gánh conversion ở bề mặt phù hợp hơn.',
          },
          {
            size: 'half',
            title: 'Editorial đủ để làm production',
            paragraph:
              'Trang chủ root site cần có bài viết nổi bật, legal link, contact routing và liên kết sâu sang từng child site thay vì chỉ là một banner gateway.',
          },
        ]),
        archiveBlock(
          [
            ecosystemCategory.id,
            capabilityCategory.id,
            guideCategory.id,
            trendCategory.id,
            trustCategory.id,
          ],
          'Bài viết nổi bật từ WingsGroup',
          'Lớp editorial ở root site giúp giải thích hệ, năng lực, trust và cách chọn đúng line business trước khi khách đi tiếp.',
          4,
        ),
        ctaBlock(
          'Chưa chắc nên đi đâu tiếp theo?',
          'Gửi yêu cầu một lần và đội vận hành sẽ định tuyến sang đúng site con hoặc đội phụ trách.',
          [linkItem('Gửi yêu cầu tư vấn', '/lien-he')],
        ),
        formBlock(
          contactForm.id,
          'Gửi brief chung cho hệ WingsGroup',
          'Điền nhu cầu, line business quan tâm và đầu mối liên hệ. Root site sẽ giữ vai trò intake và điều phối.',
        ),
      ],
      relatedPages: [
        ecosystemPage.id,
        aboutPage.id,
        servicesPage.id,
        trustPage.id,
        newsPage.id,
        contactPage.id,
      ],
      meta: {
        title: 'WingsGroup',
        description:
          'Trang umbrella của hệ sinh thái WingsGroup, kết nối tour đại trà ra nước ngoài, hành trình cho khách quốc tế tại Việt Nam, hỗ trợ sân bay, private / MICE và chăm sóc sau bán.',
        image: ecosystemHeroImage.id,
        breadcrumbLabel: 'Trang chủ',
      },
    },
    {
      title: 'WingsGroup',
      hero: {
        type: 'highImpact',
        presentation: 'centered-visual',
        variant: 'standard',
        media: ecosystemHeroImage.id,
        links: [
          linkItem('Explore the ecosystem', '/he-sinh-thai', 'default'),
          linkItem('Contact the team', '/lien-he', 'outline'),
        ],
        richText: richText(
          'WingsGroup - a travel ecosystem with several business lines under one trust layer',
          'From outbound retail and inbound Vietnam to airport support, private / MICE, and care services, WingsGroup helps visitors enter the right surface, content layer, and operating team.',
          'h1',
        ),
      },
      layout: [
        featureGridBlock(
          'Five child sites inside the ecosystem',
          'The root site does not replace the child sites. It introduces the ecosystem, establishes trust, and routes visitors into the highest-fit conversion surface.',
          [
            {
              title: 'WingsGo',
              description:
                'Outbound retail with market pages, seasonal campaigns, departures, and tour detail routes.',
              imageID: outboundImage.id,
              meta: 'Retail outbound',
              url: '/wingsgo',
            },
            {
              title: 'WingsSide',
              description:
                'Inbound Vietnam with destination storytelling, travel styles, and sample itineraries for international guests.',
              imageID: inboundImage.id,
              meta: 'Inbound planning',
              url: '/wing-side',
            },
            {
              title: 'WingsPass',
              description: 'Airport fast-track pricing, add-ons, and service-request flows.',
              imageID: fastTrackImage.id,
              meta: 'Airport support',
              url: '/wingspass',
            },
            {
              title: 'WingsPlus',
              description: 'Private journeys, MICE, and proposal-led high-value travel work.',
              imageID: premiumImage.id,
              meta: 'Premium consultative',
              url: '/wingsplus',
            },
            {
              title: 'WingsCare',
              description: 'Insurance support, care flow, and after-sales trust-first handling.',
              imageID: careImage.id,
              meta: 'Care support',
              url: '/wingscare',
            },
          ],
          'highlight',
          'Ecosystem overview',
        ),
        infoStripBlock(
          'Trust signals visible from the first screen flow',
          'Visitors entering the root site should quickly see that this is a real travel business with a legal footprint and an organized service model.',
          [
            {
              label: 'Travel license',
              value: '01-2336/2023/TCDL-GP LHQT',
              description: 'Public trust signal at the corporate layer.',
            },
            {
              label: 'Business registration',
              value: '0109983118',
              description: 'Legal identity disclosed on the legacy public site.',
            },
            {
              label: 'Child sites in phase 1',
              value: '5',
              description: 'WingsGo, WingsSide, WingsPass, WingsPlus, and WingsCare.',
            },
            {
              label: 'Phase 1 locales',
              value: 'vi / en',
              description: 'The root site and child sites keep a bilingual baseline.',
            },
          ],
          'Trust signals',
        ),
        featureGridBlock(
          'Capability at the company layer',
          'These clusters show that WingsGroup is the corporate surface, while the detailed conversion story belongs to specialist sites.',
          [
            {
              title: 'Outbound retail',
              description: 'Outbound tours organized by market, campaign, and departure logic.',
              imageID: outboundImage.id,
              meta: 'WingsGo',
              url: '/nang-luc-dich-vu',
            },
            {
              title: 'Inbound Vietnam',
              description: 'Destination-led planning and tailor-made inbound journeys.',
              imageID: destinationHubImage.id,
              meta: 'WingsSide',
              url: '/nang-luc-dich-vu',
            },
            {
              title: 'Airport services',
              description: 'Fast-track, airport support, and add-ons by airport.',
              imageID: fastTrackImage.id,
              meta: 'WingsPass',
              url: '/nang-luc-dich-vu',
            },
            {
              title: 'Private and MICE',
              description: 'Proposal-led services for premium, delegation, and corporate needs.',
              imageID: premiumImage.id,
              meta: 'WingsPlus',
              url: '/nang-luc-dich-vu',
            },
            {
              title: 'Insurance and care',
              description:
                'Benefits, claim guidance, and after-sales support with its own trust layer.',
              imageID: careImage.id,
              meta: 'WingsCare',
              url: '/nang-luc-dich-vu',
            },
          ],
          'default',
          'Service overview',
        ),
        contentBlock([
          {
            size: 'half',
            title: 'Not a repeat of the legacy broad website',
            paragraph:
              'The legacy site had broad coverage but mixed too many different needs into one surface. The new root site keeps trust, capability, and routing while child sites handle conversion in more appropriate product surfaces.',
          },
          {
            size: 'half',
            title: 'Editorial depth that feels production-ready',
            paragraph:
              'The root homepage should include featured articles, legal routes, contact routing, and deep links into the child sites rather than acting as a simple gateway banner.',
          },
        ]),
        archiveBlock(
          [
            ecosystemCategory.id,
            capabilityCategory.id,
            guideCategory.id,
            trendCategory.id,
            trustCategory.id,
          ],
          'Featured posts from WingsGroup',
          'The editorial layer on the root site explains the ecosystem, capability, trust, and business-line selection before visitors move deeper.',
          4,
        ),
        ctaBlock(
          'Not sure where to go next?',
          'Send one inquiry and the operations team will route it to the right site or service team.',
          [linkItem('Send an inquiry', '/lien-he')],
        ),
        formBlock(
          contactForm.id,
          'Send one brief to the WingsGroup ecosystem',
          'Submit the need, line of interest, and contact details. The root site acts as the intake and routing layer.',
        ),
      ],
      relatedPages: [
        ecosystemPage.id,
        aboutPage.id,
        servicesPage.id,
        trustPage.id,
        newsPage.id,
        contactPage.id,
      ],
      meta: {
        title: 'WingsGroup',
        description:
          'The umbrella site of the WingsGroup ecosystem, connecting outbound retail, inbound Vietnam, airport service, private / MICE, and care support.',
        image: ecosystemHeroImage.id,
        breadcrumbLabel: 'Home',
      },
    },
  )

  const wingsTravelSettings = await createSiteSettings(
    payload,
    req,
    site,
    siteSeed,
    ecosystemHeroImage.id,
    {
      footerNote:
        'WingsGroup đóng vai trò lớp umbrella, trust và điều hướng lead cho toàn bộ hệ sinh thái dịch vụ của VietWings Travel.',
      headerNavItems: [
        linkItem('Trang chủ', '/'),
        linkItem('Hệ sinh thái', '/he-sinh-thai'),
        linkItem('Về WingsGroup', '/ve-wingsgroup'),
        linkItem('Năng lực dịch vụ', '/nang-luc-dich-vu'),
        linkItem('Tin cậy & pháp lý', '/tin-cay-va-phap-ly'),
        linkItem('Tin tức', '/tin-tuc'),
        linkItem('Liên hệ', '/lien-he'),
      ],
      footerNavItems: [
        linkItem('Hệ sinh thái', '/he-sinh-thai'),
        linkItem('Năng lực dịch vụ', '/nang-luc-dich-vu'),
        linkItem('Tin cậy & pháp lý', '/tin-cay-va-phap-ly'),
        linkItem('Tin tức', '/tin-tuc'),
        linkItem('Chính sách bảo mật', '/chinh-sach-bao-mat'),
        linkItem('Điều khoản sử dụng', '/dieu-khoan-su-dung'),
        linkItem('Chính sách thanh toán', '/chinh-sach-thanh-toan'),
        linkItem('Liên hệ', '/lien-he'),
      ],
      supportEmail: 'info@doicanhviet.com',
      supportPhone: '0975513886',
      tagline:
        'Lớp umbrella của hệ sinh thái WingsGroup, kết nối tour đại trà ra nước ngoài, hành trình cho khách quốc tế tại Việt Nam, hỗ trợ sân bay, private / MICE và chăm sóc sau bán.',
    },
  )

  await updateSiteSettingsLocale(payload, req, wingsTravelSettings.id, 'en', {
    seo: {
      defaultDescription:
        'The umbrella site of the WingsGroup ecosystem, connecting outbound retail, inbound Vietnam, airport support, premium proposals, and care support.',
      defaultTitle: 'WingsGroup',
      titleSuffix: 'Travel Ecosystem',
    },
    footerNote:
      'WingsGroup acts as the umbrella, trust, and lead-routing layer for the full VietWings Travel service ecosystem.',
    headerNavItems: [
      linkItem('Home', '/'),
      linkItem('Ecosystem', '/he-sinh-thai'),
      linkItem('About WingsGroup', '/ve-wingsgroup'),
      linkItem('Capabilities', '/nang-luc-dich-vu'),
      linkItem('Trust & Legal', '/tin-cay-va-phap-ly'),
      linkItem('News', '/tin-tuc'),
      linkItem('Contact', '/lien-he'),
    ],
    footerNavItems: [
      linkItem('Ecosystem', '/he-sinh-thai'),
      linkItem('Capabilities', '/nang-luc-dich-vu'),
      linkItem('Trust & Legal', '/tin-cay-va-phap-ly'),
      linkItem('News', '/tin-tuc'),
      linkItem('Privacy Policy', '/chinh-sach-bao-mat'),
      linkItem('Terms Of Use', '/dieu-khoan-su-dung'),
      linkItem('Payment Policy', '/chinh-sach-thanh-toan'),
      linkItem('Contact', '/lien-he'),
    ],
    tagline:
      'The umbrella layer of the WingsGroup ecosystem, connecting outbound retail, inbound Vietnam, airport support, private / MICE, and care support.',
  })

  await updateSiteSettingsLocale(payload, req, wingsTravelSettings.id, 'vi', {
    seo: {
      defaultDescription:
        'Trang umbrella của hệ sinh thái WingsGroup, kết nối tour đại trà ra nước ngoài, hành trình cho khách quốc tế tại Việt Nam, hỗ trợ sân bay, private / MICE và chăm sóc sau bán.',
      defaultTitle: 'WingsGroup',
      titleSuffix: 'Travel Ecosystem',
    },
    footerNote:
      'WingsGroup đóng vai trò lớp umbrella, trust và điều hướng lead cho toàn bộ hệ sinh thái dịch vụ của VietWings Travel.',
    headerNavItems: [
      linkItem('Trang chủ', '/'),
      linkItem('Hệ sinh thái', '/he-sinh-thai'),
      linkItem('Về WingsGroup', '/ve-wingsgroup'),
      linkItem('Năng lực dịch vụ', '/nang-luc-dich-vu'),
      linkItem('Tin cậy & pháp lý', '/tin-cay-va-phap-ly'),
      linkItem('Tin tức', '/tin-tuc'),
      linkItem('Liên hệ', '/lien-he'),
    ],
    footerNavItems: [
      linkItem('Hệ sinh thái', '/he-sinh-thai'),
      linkItem('Năng lực dịch vụ', '/nang-luc-dich-vu'),
      linkItem('Tin cậy & pháp lý', '/tin-cay-va-phap-ly'),
      linkItem('Tin tức', '/tin-tuc'),
      linkItem('Chính sách bảo mật', '/chinh-sach-bao-mat'),
      linkItem('Điều khoản sử dụng', '/dieu-khoan-su-dung'),
      linkItem('Chính sách thanh toán', '/chinh-sach-thanh-toan'),
      linkItem('Liên hệ', '/lien-he'),
    ],
    tagline:
      'Lớp umbrella của hệ sinh thái WingsGroup, kết nối tour đại trà ra nước ngoài, hành trình cho khách quốc tế tại Việt Nam, hỗ trợ sân bay, private / MICE và chăm sóc sau bán.',
  })
}

async function seedWingsGo(payload: Payload, req: PayloadRequest, siteSeed: SiteSeed) {
  const site = await upsertSite(payload, req, siteSeed)
  await clearSiteContent(payload, req, site.id)

  const heroImage = await createMedia(
    payload,
    req,
    site.id,
    'WingsGo outbound hero',
    'Tour outbound WingsGo theo mùa',
    'Hình đại diện các tour Hàn, Nhật, Trung với giá và lịch khởi hành rõ.',
    path.join(docsDir, '338651170296767688.jpg'),
  )
  const japanPoster = await createMedia(
    payload,
    req,
    site.id,
    'Japan summer tours 2026',
    'Japan schedule poster',
    'Sales poster showing summer 2026 departures for Japan.',
    path.join(docsDir, '2861720340503557263.jpg'),
  )
  const jejuPoster = await createMedia(
    payload,
    req,
    site.id,
    'Jeju summer campaign',
    'Jeju poster',
    'Campaign poster for Jeju retail package with visible date and price.',
    path.join(docsDir, '338651170296767688.jpg'),
  )
  const chinaJiangnanImage = await createMedia(
    payload,
    req,
    site.id,
    'Thượng Hải Ô Trấn Hàng Châu tour cover',
    'Hình minh họa tour Thượng Hải - Ô Trấn - Hàng Châu',
    'Hình minh họa hành trình Thượng Hải, Ô Trấn và Hàng Châu 5N4D.',
    path.join(seedAssetsDir, 'wingsgo-shanghai-wuzhen-hangzhou.png'),
  )
  const chinaMarketImage = await createMedia(
    payload,
    req,
    site.id,
    'WingsGo China market campaign cover',
    'Hình minh họa thị trường tour Trung Quốc',
    'Hình minh họa nhóm tour Trung Quốc retail dùng cho trang thị trường và campaign.',
    path.join(seedAssetsDir, 'wingsgo-china-market-campaign.png'),
  )
  const beijingGreatWallImage = await createMedia(
    payload,
    req,
    site.id,
    'Bắc Kinh Vạn Lý Trường Thành tour cover',
    'Hình minh họa tour Bắc Kinh - Vạn Lý Trường Thành',
    'Hình minh họa hành trình Bắc Kinh và Vạn Lý Trường Thành 5N4D.',
    path.join(seedAssetsDir, 'wingsgo-beijing-great-wall.png'),
  )
  const scheduleGuideImage = await createMedia(
    payload,
    req,
    site.id,
    'WingsGo schedule and price guide cover',
    'Hình minh họa lịch khởi hành WingsGo',
    'Hình minh họa bài hướng dẫn đọc lịch khởi hành và giá tour WingsGo.',
    path.join(seedAssetsDir, 'wingsgo-schedule-price-guide.png'),
  )
  const seoulNamiEverlandImage = await createMedia(
    payload,
    req,
    site.id,
    'Seoul Nami Everland tour cover',
    'Hình minh họa tour Seoul - Nami - Everland',
    'Hình minh họa hành trình Seoul, Nami và Everland 5N4D.',
    path.join(seedAssetsDir, 'wingsgo-seoul-nami-everland.png'),
  )
  const seoulJejuCamelliaImage = await createMedia(
    payload,
    req,
    site.id,
    'Seoul Jeju Nami Camellia Hill tour cover',
    'Hình minh họa tour Seoul - Jeju - Nami - Camellia Hill',
    'Hình minh họa hành trình Seoul, Jeju, Nami và Camellia Hill 6N5D.',
    path.join(seedAssetsDir, 'wingsgo-seoul-jeju-nami-camellia.png'),
  )
  const shizuokaFujiTokyoImage = await createMedia(
    payload,
    req,
    site.id,
    'Shizuoka Núi Phú Sĩ Tokyo tour cover',
    'Hình minh họa tour Shizuoka - Núi Phú Sĩ - Tokyo',
    'Hình minh họa hành trình Shizuoka, Núi Phú Sĩ và Tokyo 5N4D.',
    path.join(seedAssetsDir, 'wingsgo-shizuoka-fuji-tokyo.png'),
  )
  const osakaKyotoFujiTokyoImage = await createMedia(
    payload,
    req,
    site.id,
    'Osaka Kyoto Fuji Tokyo tour cover',
    'Hình minh họa tour Osaka - Kobe - Kyoto - Nagoya - Fuji - Tokyo',
    'Hình minh họa hành trình Osaka, Kobe, Kyoto, Nagoya, Phú Sĩ và Tokyo 6N5D.',
    path.join(seedAssetsDir, 'wingsgo-osaka-kyoto-fuji-tokyo.png'),
  )

  const seasonCategory = await createCategory(
    payload,
    req,
    site.id,
    'Tour theo mùa',
    'campaign-theo-mua',
  )
  const guideCategory = await createCategory(
    payload,
    req,
    site.id,
    'Cẩm nang outbound',
    'cam-nang-outbound',
  )
  const wingsGoTrustStrip = () =>
    infoStripBlock(
      'Cần xác nhận trước khi giữ chỗ',
      'Giá, lịch khởi hành và hãng bay trên website là thông tin bán hàng để khách so sánh nhanh; đội WingsGo sẽ xác nhận lại tình trạng chỗ và điều kiện áp dụng khi tư vấn.',
      [
        {
          label: 'Phản hồi',
          value: 'Trong giờ làm việc',
          description: 'Sales kiểm tra lịch, số chỗ và mức giá mới nhất trước khi chốt.',
        },
        {
          label: 'Hỗ trợ',
          value: 'Visa | Hãng bay | Lịch trình',
          description: 'Tư vấn theo đúng line tour, ngân sách và thời điểm khách muốn đi.',
        },
        {
          label: 'Liên hệ',
          value: '+84 903 000 111',
          description: 'Có thể gửi yêu cầu qua form, hotline hoặc email sales@wingsgo.vn.',
        },
      ],
      'Xác nhận & hỗ trợ',
    )

  const quickInquiryForm = await createForm(
    payload,
    req,
    site.id,
    'WingsGo Quick Inquiry',
    'Gửi yêu cầu',
    'Đã nhận yêu cầu',
    'Đội bán hàng sẽ phản hồi để chốt lịch khởi hành và giữ chỗ.',
    [
      {
        blockName: 'full-name',
        blockType: 'text',
        name: 'full-name',
        label: 'Họ tên',
        required: true,
        width: 100,
      },
      {
        blockName: 'phone',
        blockType: 'text',
        name: 'phone',
        label: 'Số điện thoại',
        required: true,
        width: 100,
      },
      {
        blockName: 'market',
        blockType: 'text',
        name: 'market',
        label: 'Thị trường quan tâm',
        required: false,
        width: 100,
      },
      {
        blockName: 'message',
        blockType: 'textarea',
        name: 'message',
        label: 'Nhu cầu',
        required: false,
        width: 100,
      },
    ],
  )

  const contactPage = await createPage(payload, req, site.id, {
    title: 'Liên hệ WingsGo',
    slug: 'lien-he',
    hero: {
      type: 'lowImpact',
      links: [
        linkItem('Gửi yêu cầu nhanh', '#contact-form', 'default'),
        linkItem('Xem lịch khởi hành', '/lich-khoi-hanh', 'outline'),
      ],
      richText: richText(
        'Giữ chỗ hoặc nhận tư vấn outbound',
        'Để lại nhu cầu để đội ngũ WingsGo tư vấn lịch khởi hành, visa, hãng bay và mức giá phù hợp.',
        'h1',
      ),
    },
    layout: [
      infoStripBlock(
        'Kênh liên hệ nhanh',
        'WingsGo tiếp nhận yêu cầu qua form, hotline và email để kiểm tra lịch khởi hành, số chỗ, visa và mức giá mới nhất.',
        [
          {
            label: 'Hotline / Zalo',
            value: '+84 903 000 111',
            description: 'Ưu tiên phản hồi trong giờ làm việc.',
          },
          {
            label: 'Email',
            value: 'sales@wingsgo.vn',
            description: 'Phù hợp khi gửi danh sách khách hoặc yêu cầu đoàn riêng.',
          },
          {
            label: 'Bảo mật',
            value: 'Chỉ dùng để tư vấn',
            description:
              'Thông tin liên hệ được dùng cho phản hồi tour và không hiển thị công khai.',
          },
        ],
        'Hỗ trợ tư vấn',
      ),
      formBlock(
        quickInquiryForm.id,
        'Gửi yêu cầu nhanh',
        'Điền thị trường, tour quan tâm và mốc thời gian dự kiến. WingsGo chỉ dùng thông tin này để tư vấn và xác nhận dịch vụ phù hợp.',
      ),
      faqBlock(
        'Các câu hỏi thường gặp trước khi giữ chỗ',
        'WingsGo ưu tiên minh bạch giá và lịch trình trước khi đẩy khách sang bước liên hệ.',
        [
          {
            question: 'Giá trên website đã gồm visa chưa?',
            answer:
              'Từng tour sẽ ghi rõ trạng thái bao gồm visa. Các line Hàn và Nhật retail chủ lực có thể đã bao gồm visa hoặc hỗ trợ visa trọn gói tuỳ chiến dịch.',
          },
          {
            question: 'Có thể đổi lịch khởi hành sau khi đăng ký không?',
            answer:
              'Có thể đổi nếu cùng line tour còn chỗ và đúng chính sách giá tại thời điểm đổi. Bộ phận sales sẽ xác nhận lại chênh lệch nếu có.',
          },
          {
            question: 'Có nhận đoàn riêng không?',
            answer:
              'Có. Các line outbound retail vẫn có thể nâng cấp thành đoàn riêng khi đủ số lượng và yêu cầu dịch vụ phù hợp.',
          },
        ],
      ),
    ],
    meta: {
      title: 'Liên hệ WingsGo',
      description: 'Trang giữ chỗ và nhận tư vấn cho các line tour outbound của WingsGo.',
      image: heroImage.id,
      breadcrumbLabel: 'Liên hệ',
    },
  })

  const aboutPage = await createPage(payload, req, site.id, {
    title: 'Giới thiệu WingsGo',
    slug: 'gioi-thieu',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'WingsGo tập trung các tuyến outbound khách hỏi nhiều nhất',
        'Thế mạnh hiện tại là các line Hàn Quốc, Nhật Bản và Trung Quốc với lịch khởi hành, giá tham khảo và nội dung campaign rõ ràng.',
        'h1',
      ),
    },
    layout: [
      infoStripBlock(
        'Thiết kế để khách dễ chọn tour, không chỉ xem thông tin',
        'Các trang chính đưa giá, lịch khởi hành và lối vào theo thị trường lên sớm để khách so sánh nhanh trước khi gửi yêu cầu.',
        [
          {
            label: 'Thị trường chủ lực',
            value: 'Hàn | Nhật | Trung',
            description: 'Ba line đang có dữ liệu mạnh nhất từ Google Sheet source.',
          },
          {
            label: 'Logic chuyển đổi',
            value: 'Price-first',
            description: 'Khách thấy giá trước, sau đó mở tour detail hoặc gửi yêu cầu giữ chỗ.',
          },
          {
            label: 'Nguồn dữ liệu',
            value: 'Sheet + Docs + Poster',
            description:
              'Nội dung web được cấu trúc lại từ tài liệu vận hành hiện tại của đội sales.',
          },
          {
            label: 'Khả năng mở rộng',
            value: 'Campaign-ready',
            description:
              'Có thể thêm market mới, campaign mùa mới và bảng khởi hành mới trong cùng mô hình.',
          },
        ],
        'Định vị WingsGo',
      ),
      contentBlock([
        {
          size: 'half',
          title: 'Tour outbound có lịch và giá dễ kiểm tra',
          paragraph:
            'Khách có thể xem trước ngày khởi hành, hãng bay và mức giá từ trước khi để lại thông tin tư vấn.',
        },
        {
          size: 'half',
          title: 'Nội dung bám dữ liệu vận hành',
          paragraph:
            'Poster tour, tài liệu tư vấn và bảng lịch khởi hành được chuyển thành trang thị trường, campaign và trang tour chi tiết có cấu trúc.',
        },
      ]),
    ],
    meta: {
      title: 'Giới thiệu WingsGo',
      description:
        'Thông tin định vị, thế mạnh thị trường và cách WingsGo tổ chức nội dung outbound retail.',
      image: heroImage.id,
    },
  })

  const marketHub = await createPage(payload, req, site.id, {
    title: 'Thị trường outbound',
    slug: 'thi-truong',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Thị trường outbound chủ lực',
        'Đi từ thị trường sang campaign, lịch khởi hành và trang tour chi tiết thay vì bắt đầu từ một danh sách rời rạc.',
        'h1',
      ),
    },
    layout: [
      featureGridBlock(
        'Ba market page ưu tiên',
        'Đây là nhóm thị trường được khách hàng nhắc rõ và cũng là nơi đang có nguồn sản phẩm mạnh nhất.',
        [
          {
            title: 'Hàn Quốc',
            description:
              'Tour Hàn Quốc kết hợp mùa hè, mùa hoa, hành trình ngắn ngày và các hãng bay quen thuộc.',
            meta: 'Tour Hàn Quốc',
            url: '/thi-truong/han-quoc',
          },
          {
            title: 'Nhật Bản',
            description:
              'Tour Nhật Bản có các line 5N4Đ, 6N5Đ, dễ so sánh theo mùa, lịch và ngân sách.',
            meta: 'Tour Nhật Bản',
            url: '/thi-truong/nhat-ban',
          },
          {
            title: 'Trung Quốc',
            description:
              'China pages cần rõ route, giá bám lịch Air China và CTA dẫn sang chi tiết tour hoặc lịch khởi hành.',
            meta: 'Tour Trung Quốc',
            url: '/thi-truong/trung-quoc',
          },
        ],
        'highlight',
        'Chọn thị trường',
      ),
      pricingTableBlock(
        'Lịch và giá tham khảo 2026',
        'Bảng này giúp khách nhìn nhanh tuyến, ngày khởi hành, hãng bay và mức giá từ trước khi mở trang chi tiết.',
        [
          {
            title: 'Seoul - Nami - Everland 5N4D',
            subtitle: 'Korea best-selling line',
            departure: '08/07, 22/07, 05/08',
            airline: 'Vietjet / Jeju Air',
            price: 'Từ 18.900.000',
            note: 'Visa support available',
            url: '/tour/seoul-nami-everland-5n4d',
          },
          {
            title: 'Shizuoka - Núi Phú Sĩ - Tokyo 5N4D',
            subtitle: 'Japan summer line',
            departure: '17/06, 08/07, 05/08',
            airline: 'Vietjet',
            price: 'Từ 22.500.000',
            note: 'Summer 2026',
            url: '/tour/shizuoka-nui-phu-si-tokyo-5n4d',
          },
          {
            title: 'Bắc Kinh - Vạn Lý Trường Thành 5N4D',
            subtitle: 'China short-holiday line',
            departure: '12/06, 10/07, 07/08',
            airline: 'Air China',
            price: 'Từ 19.900.000',
            note: 'Retail departure',
            url: '/tour/bac-kinh-van-ly-truong-thanh-5n4d',
          },
        ],
        'Xem nhanh',
      ),
    ],
    relatedPages: [contactPage.id, aboutPage.id],
    meta: {
      title: 'Thị trường outbound WingsGo',
      description: 'Trang hub điều hướng Hàn Quốc, Nhật Bản và Trung Quốc cho WingsGo.',
      image: heroImage.id,
      breadcrumbLabel: 'Thị trường',
    },
  })

  const campaignHub = await createPage(payload, req, site.id, {
    title: 'Tour theo mùa',
    slug: 'campaign',
    hero: {
      type: 'mediumImpact',
      media: heroImage.id,
      links: [
        linkItem('Xem tour Hàn Quốc hè', '/campaign/he-2026-han-quoc', 'default'),
        linkItem('Xem lịch khởi hành', '/lich-khoi-hanh', 'outline'),
      ],
      richText: richText(
        'Tour theo mùa: chọn nhanh line Hàn, Nhật, Trung',
        'Mỗi đợt mở bán gom các gói tour nổi bật, hình ảnh, giá tham khảo và CTA để khách mở chi tiết hoặc giữ chỗ nhanh.',
        'h1',
      ),
    },
    layout: [
      featureGridBlock(
        'Tour theo mùa đang mở bán',
        'Các đợt tour được tổ chức thành trang bán hàng có route, giá, lịch khởi hành và lối liên hệ rõ ràng.',
        [
          {
            title: 'Hè 2026 Hàn Quốc',
            description:
              'Jeju, Seoul, Nami, Camellia Hill và các line Hàn Quốc dễ chốt cho khách lần đầu đi Hàn.',
            meta: 'Hè Hàn Quốc',
            url: '/campaign/he-2026-han-quoc',
          },
          {
            title: 'Hè 2026 Nhật Bản',
            description:
              'Shizuoka, Tokyo, Osaka, Kyoto và các line Nhật Bản có giá, lịch dễ so sánh.',
            meta: 'Hè Nhật Bản',
            url: '/campaign/he-2026-nhat-ban',
          },
          {
            title: 'Tour Trung Quốc ngắn ngày',
            description:
              'Các gói Trung Quốc ngắn ngày, rõ route, rõ giá tham khảo và dễ gửi yêu cầu tư vấn.',
            meta: 'Tour Trung Quốc',
            url: '/campaign/trung-quoc-gia-ro',
          },
        ],
      ),
      wingsGoTrustStrip(),
    ],
    meta: {
      title: 'Tour theo mùa WingsGo',
      description:
        'Tổng hợp tour Hàn, Nhật, Trung hè 2026 của WingsGo với giá rõ, lịch khởi hành và CTA giữ chỗ nhanh.',
      image: heroImage.id,
      breadcrumbLabel: 'Tour theo mùa',
    },
  })

  const schedulePage = await createPage(payload, req, site.id, {
    title: 'Lịch khởi hành',
    slug: 'lich-khoi-hanh',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Lịch khởi hành và giá cập nhật',
        'Trang tổng hợp để khách mở nhanh các line tour gần nhất theo Hàn, Nhật và Trung.',
        'h1',
      ),
    },
    layout: [
      contentBlock([
        {
          size: 'full',
          title: 'Lịch khởi hành luôn được cập nhật',
          paragraph:
            'Tất cả đợt khởi hành Hàn, Nhật, Trung được tổng hợp tại đây kèm giá tham khảo và tình trạng chỗ, để bạn so sánh nhanh trước khi giữ chỗ.',
        },
      ]),
      ctaBlock(
        'Cần ngày khác hoặc báo giá đoàn riêng?',
        'Gửi yêu cầu để WingsGo kiểm tra lịch mới nhất, số chỗ còn lại hoặc phương án riêng cho nhóm của bạn.',
        [linkItem('Liên hệ tư vấn', '/lien-he')],
      ),
    ],
    meta: {
      title: 'Lịch khởi hành WingsGo',
      description: 'Trang tổng hợp lịch khởi hành và giá cho các line tour chủ lực của WingsGo.',
      image: japanPoster.id,
      breadcrumbLabel: 'Lịch khởi hành',
    },
  })

  const tourHub = await createPage(payload, req, site.id, {
    title: 'Chi tiết tour',
    slug: 'tour',
    hero: {
      type: 'lowImpact',
      links: [
        linkItem('Xem tour nổi bật', '/tour/seoul-nami-everland-5n4d', 'default'),
        linkItem('Giữ chỗ nhanh', '/lien-he', 'outline'),
      ],
      richText: richText(
        'Tour outbound nổi bật: giá, lịch và điểm nhấn rõ ràng',
        'Mỗi tour có tóm tắt, điểm nổi bật, lịch khởi hành, giá tham khảo, lịch trình và CTA giữ chỗ để khách dễ ra quyết định.',
        'h1',
      ),
    },
    layout: [
      featureGridBlock(
        'Các chương trình outbound nổi bật',
        'Nhóm tour này được dựng từ Google Sheet lịch khởi hành 2026 và các poster Hàn, Nhật, Trung mà khách hàng đã cung cấp.',
        [
          {
            title: 'Seoul - Nami - Everland 5N4D',
            description:
              'Line Hàn Quốc nhập môn, lịch 08/07, 22/07, 05/08, bay Vietjet / Jeju Air, giá từ 18.900.000.',
            imageID: seoulNamiEverlandImage.id,
            meta: 'Korea | 5N4D | từ 18.900.000',
            url: '/tour/seoul-nami-everland-5n4d',
          },
          {
            title: 'Seoul - Jeju - Nami - Camellia Hill 6N5D',
            description:
              'Line campaign hè có Jeju, Nami và Camellia Hill, khởi hành 11/07 và 28/08, bay Jeju Air.',
            imageID: seoulJejuCamelliaImage.id,
            meta: 'Korea | 6N5D | từ 23.900.000',
            url: '/tour/seoul-jeju-nami-camellia-hill-6n5d',
          },
          {
            title: 'Shizuoka - Núi Phú Sĩ - Tokyo 5N4D',
            description:
              'Route Nhật ngắn, dễ chốt: Shizuoka, Phú Sĩ, Tokyo, bay Vietjet, giá từ 22.500.000.',
            imageID: shizuokaFujiTokyoImage.id,
            meta: 'Japan | 5N4D | từ 22.500.000',
            url: '/tour/shizuoka-nui-phu-si-tokyo-5n4d',
          },
          {
            title: 'Osaka - Kobe - Kyoto - Nagoya - Fuji - Tokyo 6N5D',
            description:
              'Route Nhật dài hơn cho khách muốn đủ chuỗi Osaka, Kyoto, Nagoya, Phú Sĩ và Tokyo.',
            imageID: osakaKyotoFujiTokyoImage.id,
            meta: 'Japan | 6N5D | từ 32.900.000',
            url: '/tour/osaka-kobe-kyoto-nagoya-fuji-tokyo-6n5d',
          },
          {
            title: 'Bắc Kinh - Vạn Lý Trường Thành 5N4D',
            description:
              'Entry China route with retail-friendly duration and straightforward selling points.',
            imageID: beijingGreatWallImage.id,
            meta: 'China | 5N4D',
            url: '/tour/bac-kinh-van-ly-truong-thanh-5n4d',
          },
          {
            title: 'Thượng Hải - Ô Trấn - Hàng Châu 5N4D',
            description:
              'Tour Trung Quốc cân bằng giữa biểu tượng đô thị và trải nghiệm cảnh quan mềm hơn.',
            imageID: chinaJiangnanImage.id,
            meta: 'China | 5N4D',
            url: '/tour/thuong-hai-o-tran-hang-chau-5n4d',
          },
        ],
      ),
      wingsGoTrustStrip(),
    ],
    meta: {
      title: 'Tour WingsGo',
      description:
        'Khám phá các tour outbound nổi bật của WingsGo với giá tham khảo, lịch khởi hành, điểm nhấn và CTA giữ chỗ nhanh.',
      image: heroImage.id,
      breadcrumbLabel: 'Tour',
    },
  })

  const createMarketPage = async (args: {
    description: string
    faq: Array<{ answer: string; question: string }>
    heroImageID: number | string
    metaDescription: string
    parentPageID: number | string
    pricingItems: Array<{
      airline: string
      departure: string
      price: string
      title: string
      url: string
    }>
    relatedPageIDs: Array<number | string>
    slug: string
    title: string
    tours: Array<{
      description: string
      imageID?: number | string
      meta: string
      title: string
      url: string
    }>
  }) =>
    createPage(payload, req, site.id, {
      title: args.title,
      slug: args.slug,
      parentPage: args.parentPageID,
      relatedPages: args.relatedPageIDs,
      hero: {
        type: 'mediumImpact',
        media: args.heroImageID,
        links: [
          linkItem('Xem lịch khởi hành', '/lich-khoi-hanh', 'default'),
          linkItem('Liên hệ tư vấn', '/lien-he', 'outline'),
        ],
        richText: richText(args.title, args.description, 'h1'),
      },
      layout: [
        contentBlock([
          {
            size: 'half',
            title: 'Giá và lịch khởi hành luôn cập nhật',
            paragraph:
              'Mỗi line tour trong thị trường này hiển thị giá tham khảo, đợt khởi hành gần nhất và tình trạng chỗ để bạn dễ so sánh trước khi đi vào chi tiết.',
          },
          {
            size: 'half',
            title: 'Đi sâu vào từng tour chỉ trong một bước',
            paragraph:
              'Từ trang thị trường, bạn mở thẳng tour chi tiết với lịch trình theo ngày, dịch vụ đi kèm và lối giữ chỗ nhanh mà không phải tìm lại thông tin.',
          },
        ]),
        wingsGoTrustStrip(),
        ctaBlock(
          'Xem lịch hoặc mở tour chi tiết',
          'Chọn nhanh đợt khởi hành phù hợp hoặc mở tour chi tiết để xem lịch trình, dịch vụ và giá tham khảo đầy đủ.',
          [
            linkItem('Xem lịch khởi hành', '/lich-khoi-hanh'),
            linkItem('Liên hệ tư vấn', '/lien-he', 'outline'),
          ],
        ),
      ],
      meta: {
        title: args.title,
        description: args.metaDescription,
        image: args.heroImageID,
        breadcrumbLabel: args.title,
      },
    })

  const koreaPage = await createMarketPage({
    title: 'Tour Hàn Quốc',
    slug: 'han-quoc',
    parentPageID: marketHub.id,
    relatedPageIDs: [contactPage.id, schedulePage.id],
    heroImageID: jejuPoster.id,
    description:
      'Tập trung các line Seoul, Jeju, Nami, Everland, Camellia Hill với nhịp retail dễ duyệt, có giá công khai và lịch khởi hành rõ.',
    metaDescription:
      'Trang thị trường Hàn Quốc của WingsGo với campaign mùa hè, lịch khởi hành và các line tour nổi bật.',
    pricingItems: [
      {
        title: 'Seoul - Nami - Everland 5N4D',
        departure: '08/07, 22/07, 05/08',
        airline: 'Vietjet / Jeju Air',
        price: '18.900.000',
        url: '/tour/seoul-nami-everland-5n4d',
      },
      {
        title: 'Seoul - Jeju - Nami - Camellia Hill 6N5D',
        departure: '11/07, 28/08',
        airline: 'Jeju Air',
        price: '23.900.000',
        url: '/tour/seoul-jeju-nami-camellia-hill-6n5d',
      },
    ],
    tours: [
      {
        title: 'Seoul - Nami - Everland 5N4D',
        description:
          'Line first-time Korea, lịch 08/07, 22/07, 05/08, bay Vietjet / Jeju Air, giá từ 18.900.000.',
        imageID: seoulNamiEverlandImage.id,
        meta: 'Retail starter | từ 18.900.000',
        url: '/tour/seoul-nami-everland-5n4d',
      },
      {
        title: 'Seoul - Jeju - Nami - Camellia Hill 6N5D',
        description:
          'Line hè có Jeju và Camellia Hill, khởi hành 11/07 và 28/08, giá từ 23.900.000.',
        imageID: seoulJejuCamelliaImage.id,
        meta: 'Summer campaign | Jeju Air',
        url: '/tour/seoul-jeju-nami-camellia-hill-6n5d',
      },
    ],
    faq: [
      {
        question: 'Korea market page nên ưu tiên điều gì?',
        answer:
          'Ưu tiên nhìn thấy ngày khởi hành, mức giá bắt đầu, số đêm, và lý do khác nhau giữa line Jeju và line Seoul cổ điển.',
      },
      {
        question: 'Có thể mở rộng thêm campaign hoa anh đào hoặc mùa lá đỏ không?',
        answer:
          'Có. Cấu trúc page hiện tại được seed để về sau chỉ cần thêm campaign child page và bảng giá mới theo mùa.',
      },
    ],
  })

  const japanPage = await createMarketPage({
    title: 'Tour Nhật Bản',
    slug: 'nhat-ban',
    parentPageID: marketHub.id,
    relatedPageIDs: [contactPage.id, schedulePage.id],
    heroImageID: japanPoster.id,
    description:
      'Line Nhật cần cảm giác seasonal rõ, nhiều route để so sánh, và giá xuất hiện sớm như khách hàng yêu cầu.',
    metaDescription:
      'Trang thị trường Nhật Bản của WingsGo với các line tour mùa hè, lịch khởi hành và card tour chi tiết.',
    pricingItems: [
      {
        title: 'Shizuoka - Núi Phú Sĩ - Tokyo 5N4D',
        departure: '20/05, 17/06, 08/07',
        airline: 'Vietjet',
        price: '22.500.000',
        url: '/tour/shizuoka-nui-phu-si-tokyo-5n4d',
      },
      {
        title: 'Osaka - Kobe - Kyoto - Nagoya - Fuji - Tokyo 6N5D',
        departure: '25/06, 30/07, 27/08',
        airline: 'Vietnam Airlines',
        price: '32.900.000',
        url: '/tour/osaka-kobe-kyoto-nagoya-fuji-tokyo-6n5d',
      },
    ],
    tours: [
      {
        title: 'Shizuoka - Núi Phú Sĩ - Tokyo 5N4D',
        description: 'Route 5N4D từ poster Nhật 2026, lịch 20/05, 17/06, 08/07, bay Vietjet.',
        imageID: shizuokaFujiTokyoImage.id,
        meta: 'Short route | từ 22.500.000',
        url: '/tour/shizuoka-nui-phu-si-tokyo-5n4d',
      },
      {
        title: 'Osaka - Kobe - Kyoto - Nagoya - Fuji - Tokyo 6N5D',
        description:
          'Route dài hơn cho khách muốn nhiều thành phố, lịch 25/06, 30/07, 27/08, bay Vietnam Airlines.',
        imageID: osakaKyotoFujiTokyoImage.id,
        meta: 'Full route | từ 32.900.000',
        url: '/tour/osaka-kobe-kyoto-nagoya-fuji-tokyo-6n5d',
      },
    ],
    faq: [
      {
        question: 'Japan pages cần bộc lộ điều gì ngay trên màn đầu?',
        answer:
          'Giá, mùa, route chính, và sự khác nhau giữa short route 5N4D và full route 6N5D. Nếu giấu các tín hiệu này xuống sâu sẽ mất đúng lợi thế mà khách muốn.',
      },
      {
        question: 'Có nên nhồi quá nhiều text vào market page không?',
        answer:
          'Không. Market page nên cân bằng giữa visual mùa, card line tour, giá, và CTA thay vì thành một bài blog dài.',
      },
    ],
  })

  const chinaPage = await createMarketPage({
    title: 'Tour Trung Quốc',
    slug: 'trung-quoc',
    parentPageID: marketHub.id,
    relatedPageIDs: [contactPage.id, schedulePage.id],
    heroImageID: chinaMarketImage.id,
    description:
      'Thị trường Trung Quốc được tổ chức theo city break và retail package với route ngắn, giá rõ và CTA dễ mở sang tour detail.',
    metaDescription:
      'Trang thị trường Trung Quốc của WingsGo với route retail, lịch khởi hành và CTA tư vấn.',
    pricingItems: [
      {
        title: 'Bắc Kinh - Vạn Lý Trường Thành 5N4D',
        departure: '12/06, 10/07, 07/08',
        airline: 'Air China',
        price: '19.900.000',
        url: '/tour/bac-kinh-van-ly-truong-thanh-5n4d',
      },
      {
        title: 'Thượng Hải - Ô Trấn - Hàng Châu 5N4D',
        departure: '20/06, 18/07, 15/08',
        airline: 'Air China',
        price: '21.900.000',
        url: '/tour/thuong-hai-o-tran-hang-chau-5n4d',
      },
    ],
    tours: [
      {
        title: 'Bắc Kinh - Vạn Lý Trường Thành 5N4D',
        description:
          'Retail-friendly route for first-time China travel and national-icon positioning.',
        imageID: beijingGreatWallImage.id,
        meta: 'China | Capital route',
        url: '/tour/bac-kinh-van-ly-truong-thanh-5n4d',
      },
      {
        title: 'Thượng Hải - Ô Trấn - Hàng Châu 5N4D',
        description: 'A softer retail route balancing city landmarks and scenic stopovers.',
        imageID: chinaJiangnanImage.id,
        meta: 'China | Jiangnan route',
        url: '/tour/thuong-hai-o-tran-hang-chau-5n4d',
      },
    ],
    faq: [
      {
        question: 'China market page nên tránh gì?',
        answer:
          'Không nên biến thành một list card quá phẳng. Cần vẫn có section giải thích route, lịch khởi hành và CTA rõ như ở Hàn và Nhật.',
      },
      {
        question: 'Có thể gom China dưới campaign riêng không?',
        answer:
          'Có. Cấu trúc hiện tại cho phép tạo campaign con khi cần đẩy sales theo lễ, visa hoặc một mức giá cụ thể.',
      },
    ],
  })

  const createTourPage = async (args: {
    badgeLabels?: string[]
    marketCard?: {
      badges?: string[]
      featuredReason?: string
      priorityLabel?: string
      sellingLine?: string
    }
    departures: Array<{
      airline: string
      availabilityBadge?: string
      ctaLabelOverride?: string
      departure: string
      departureCity?: string
      depositNote?: string
      holdNote?: string
      price: string
      promoLabel?: string
      status?: 'limited' | 'open' | 'sold-out'
      urgencyLabel?: string
      variantKey?: string
    }>
    excludesList?: string[]
    faq: Array<{ answer: string; question: string }>
    factSummaryOverride?: {
      groupSizeSummary?: string
      holdNote?: string
      hotelSummary?: string
      mealsSummary?: string
      operatorNote?: string
      routeSummary?: string
    }
    galleryIDs?: Array<number | string>
    highlights: Array<{ paragraph: string; title: string }>
    imageID: number | string
    includes: string
    includesList?: string[]
    itinerary: string
    itineraryDays?: Array<Record<string, unknown>>
    market: 'china' | 'japan' | 'korea'
    metaDescription: string
    parentPageID: number | string
    relatedPageIDs: Array<number | string>
    reviewSnapshot?: {
      proofQuotes?: Array<{ author?: string; quote: string }>
      reviewCount?: number
      score?: number
      sourceLabel?: string
      travelerCount?: number
      whyGuestsChoose?: string
    }
    routeVisual?: {
      mapImage?: number | string
      routeCaption?: string
      routeStops?: Array<{ label: string; order: number; stopType?: string }>
      travelLegs?: Array<{ from: string; mode?: string; to: string }>
    }
    servicesSummary?: {
      hotelSummary?: string
      mealsSummary?: string
      notes?: string[]
      operatorNotes?: string
      transportSummary?: string
    }
    slug: string
    summary: string
    title: string
    durationDays: number
    durationNights: number
    variantSeeds?: Array<{
      airline?: string
      departureCity?: string
      displayPriority?: number
      heroMediaOverride?: number | string
      itineraryDayOverrides?: Array<Record<string, unknown>>
      label: string
      routeVisualOverride?: {
        mapImage?: number | string
        routeCaption?: string
        routeStops?: Array<{ label: string; order: number; stopType?: string }>
      }
      servicesOverride?: {
        hotelSummary?: string
        importantNotes?: string
        transportSummary?: string
      }
      summaryOverride?: string
      variantKey: string
    }>
  }) => {
    const enrichedItineraryDays: Array<Record<string, any>> = (
      (args.itineraryDays ||
        buildItineraryDays(args.itinerary, args.durationDays, args.imageID)) as Array<
        Record<string, any>
      >
    ).map((day, index) => ({
      dayTheme:
        (day.dayTheme as string) ||
        `Ngày ${index + 1}: ${String(day.title || day.route || 'Theo chương trình')}`,
      dayHighlight:
        (day.dayHighlight as string) ||
        'Điểm nhấn của ngày được giữ đủ rõ để khách biết vì sao chặng này đáng đi và mức độ phù hợp với nhu cầu của mình.',
      equipmentNote:
        (day.equipmentNote as string) ||
        'Xe du lịch và dịch vụ triển khai theo line bán, điều hành xác nhận lại khi chốt đợt đi.',
      gallery: Array.isArray(day.gallery) && day.gallery.length > 0 ? day.gallery : [args.imageID],
      sleepingStandard:
        (day.sleepingStandard as string) ||
        `Ngủ đêm theo line bán tại ${String(day.accommodation || 'khách sạn tiêu chuẩn')}`,
      ...day,
    }))
    const derivedRouteStops = (() => {
      if (args.routeVisual?.routeStops?.length) {
        return args.routeVisual.routeStops
      }

      const rawStops = args.title
        .replace(/\s+\d+N\d+D$/, '')
        .split('-')
        .map((item) => item.trim())
        .filter(Boolean)

      return rawStops.map((label, index) => ({
        label,
        order: index + 1,
        stopType:
          index === 0 ? 'arrival' : index === rawStops.length - 1 ? 'return' : 'sightseeing',
      }))
    })()
    const derivedTravelLegs = args.routeVisual?.travelLegs?.length
      ? args.routeVisual.travelLegs
      : derivedRouteStops.slice(0, -1).map((stop, index) => ({
          from: stop.label,
          mode: 'Máy bay / xe theo tuyến',
          to: derivedRouteStops[index + 1]?.label || stop.label,
        }))
    const reviewSnapshot = {
      score: args.reviewSnapshot?.score || 4.8,
      reviewCount: args.reviewSnapshot?.reviewCount || 36,
      travelerCount: args.reviewSnapshot?.travelerCount || 120,
      sourceLabel: args.reviewSnapshot?.sourceLabel || 'Đánh giá tổng hợp từ khách đã đi line này',
      whyGuestsChoose:
        args.reviewSnapshot?.whyGuestsChoose ||
        'Khách chọn line này vì route rõ, giá dễ so sánh và nhịp chương trình đủ dễ hiểu để chốt nhanh.',
      proofQuotes: args.reviewSnapshot?.proofQuotes || [
        {
          author: 'Khách WingsGo',
          quote: 'Lịch đi rõ, giá rõ và dễ chốt vì biết ngay mình sẽ đi đâu, ngủ ở đâu.',
        },
        {
          author: 'Nhóm khách gia đình',
          quote:
            'Line gọn, không quá dày, sales giải thích ngày đi và hãng bay rất rõ trước khi giữ chỗ.',
        },
      ],
    }
    const routeVisual = {
      mapImage: args.routeVisual?.mapImage,
      routeCaption:
        args.routeVisual?.routeCaption ||
        'Route được trình bày như một hành trình bán hàng rõ ràng để khách biết tuyến đi, điểm ngủ đêm và nhịp tham quan.',
      stops: derivedRouteStops.map((stop) => ({
        ...stop,
        type: stop.stopType,
      })),
      travelLegs: derivedTravelLegs,
    }
    const servicesSummary = {
      hotelSummary:
        args.servicesSummary?.hotelSummary ||
        args.factSummaryOverride?.hotelSummary ||
        'Khách sạn 3-4 sao theo line bán, bố trí 2 khách/phòng tiêu chuẩn và điều hành xác nhận lại trước ngày đi.',
      mealsSummary:
        args.servicesSummary?.mealsSummary ||
        args.factSummaryOverride?.mealsSummary ||
        'Ăn uống theo chương trình công bố, có thể thay đổi nhẹ theo giờ bay và điểm tham quan thực tế.',
      transportSummary:
        args.servicesSummary?.transportSummary ||
        enrichedItineraryDays
          .map((day) => day.transport)
          .filter(Boolean)
          .slice(0, 3)
          .join('. '),
      operatorNotes:
        args.servicesSummary?.operatorNotes ||
        args.factSummaryOverride?.operatorNote ||
        'Điều hành xác nhận lại tồn chỗ, khách sạn, hãng bay và giờ tập trung trước khi khách giữ chỗ chính thức.',
      notes: (
        args.servicesSummary?.notes || [
          'Giá có thể thay đổi theo từng đợt mở bán và cần sales xác nhận lại trước khi chốt booking.',
          'Lịch tham quan có thể điều chỉnh theo giờ bay, thời tiết và điều kiện vận hành thực tế nhưng vẫn giữ khung trải nghiệm chính.',
        ]
      ).map((label) => ({ label })),
    }
    const firstDeparture = args.departures[0]
    const heroSummary = firstDeparture
      ? `${args.summary} Khởi hành gần nhất ${firstDeparture.departure}, ${firstDeparture.airline}, giá từ ${firstDeparture.price}đ.`
      : args.summary
    const variantSeeds = args.variantSeeds?.length
      ? args.variantSeeds
      : [
          {
            airline: firstDeparture?.airline,
            departureCity: firstDeparture?.departureCity || 'TP.HCM / Hà Nội',
            displayPriority: 0,
            label: `${args.title} • Đợt chuẩn`,
            summaryOverride: args.summary,
            variantKey: `${args.slug}-core`,
          },
        ]

    const page = await createPage(payload, req, site.id, {
      title: args.title,
      slug: args.slug,
      parentPage: args.parentPageID,
      relatedPages: args.relatedPageIDs,
      hero: {
        type: 'mediumImpact',
        media: args.imageID,
        links: [
          linkItem('Liên hệ giữ chỗ', '/lien-he', 'default'),
          linkItem('Xem lịch khởi hành', '/lich-khoi-hanh', 'outline'),
        ],
        richText: richText(args.title, heroSummary, 'h1'),
      },
      layout: [
        contentBlock([
          {
            size: 'full',
            title: 'Tất cả thông tin để chốt tour trong một trang',
            paragraph:
              'Tóm tắt hành trình, lịch trình theo ngày, các đợt khởi hành, dịch vụ bao gồm và FAQ được trình bày liền mạch để khách quyết định nhanh.',
          },
        ]),
        wingsGoTrustStrip(),
        formBlock(
          quickInquiryForm.id,
          'Giữ chỗ / nhận lịch trình chi tiết',
          'Điền ngày đi dự kiến, số lượng khách và nhu cầu để đội sales phản hồi đúng line tour.',
        ),
      ],
      meta: {
        title: args.title,
        description: args.metaDescription,
        image: args.imageID,
      },
    })

    const product = await createTourProduct(payload, req, site.id, {
      title: args.title,
      slug: args.slug,
      market: args.market,
      tourCode: args.slug.toUpperCase(),
      durationDays: args.durationDays,
      durationNights: args.durationNights,
      wrapperPage: page.id,
      summary: args.summary,
      heroMedia: args.imageID,
      gallery: args.galleryIDs?.length ? args.galleryIDs : [args.imageID],
      highlights: args.highlights.map((item) => ({
        title: item.title,
        description: item.paragraph,
      })),
      factSummary: {
        routeSummary:
          args.factSummaryOverride?.routeSummary || args.title.replace(/\s+\d+N\d+D$/, ''),
        mealsSummary: args.factSummaryOverride?.mealsSummary || 'Ăn theo chương trình',
        groupSizeSummary: args.factSummaryOverride?.groupSizeSummary || 'Đoàn retail ghép khách',
        operatorNote:
          args.factSummaryOverride?.operatorNote ||
          'Điều hành WingsGo xác nhận lại chỗ và điều kiện áp dụng.',
        holdNote:
          args.factSummaryOverride?.holdNote || 'Giữ chỗ sau khi sales kiểm tra đợt đi phù hợp.',
        hotelSummary:
          args.factSummaryOverride?.hotelSummary ||
          'Khách sạn 3-4 sao theo line bán, điều hành xác nhận lại khu vực lưu trú trước ngày đi.',
      },
      reviewSnapshot,
      routeViz: routeVisual,
      badges: (args.badgeLabels || ['Giá công khai', 'Lịch khởi hành rõ', 'Retail ready']).map(
        (label) => ({ label }),
      ),
      marketCard: args.marketCard
        ? {
            badges: (args.marketCard.badges || []).map((label) => ({ label })),
            sellingLine: args.marketCard.sellingLine,
            priorityLabel: args.marketCard.priorityLabel,
            featuredReason: args.marketCard.featuredReason,
          }
        : undefined,
      primaryCTA: {
        mode: 'hold-seat',
        label: 'Giữ chỗ / nhận tư vấn',
        href: '/lien-he',
        leadFormVariant: 'tour-quick-inquiry',
        bookingIntentMode: 'tour-detail',
      },
      itineraryDays: enrichedItineraryDays,
      includes: (
        args.includesList || buildListItemsFromSentence(args.includes).map((item) => item.label)
      ).map((label) => ({ label })),
      excludes: (
        args.excludesList || [
          'Chi phí cá nhân ngoài chương trình',
          'Tips và phụ phí phát sinh theo điều kiện thực tế',
          'Dịch vụ tự chọn không ghi trong chương trình',
        ]
      ).map((label) => ({ label })),
      servicesSummary,
      faqItems: args.faq,
      meta: {
        title: args.title,
        description: args.metaDescription,
        image: args.imageID,
        breadcrumbLabel: args.title,
      },
      bcfg: {
        template: 'dense-retail-default',
        stickyCTAEnabled: true,
        ctaStyle: 'hold-seat',
        routeMode: 'route-map',
        itinMode: 'timeline-cards',
        depMode: 'matrix',
      },
      sectionVisibility: [
        'hero',
        'facts',
        'reviews',
        'why-choose',
        'route',
        'itinerary',
        'services',
        'departures',
        'faq',
        'related',
        'sticky-cta',
      ],
      sectionOrder: [
        'hero',
        'facts',
        'reviews',
        'why-choose',
        'route',
        'itinerary',
        'services',
        'departures',
        'faq',
        'related',
        'sticky-cta',
      ],
      variantStrategy: 'variant-first',
    })

    const variants = await Promise.all(
      variantSeeds.map((variant, index) =>
        createDepartureVariant(payload, req, site.id, {
          tourProduct: product.id,
          variantKey: variant.variantKey,
          label: variant.label,
          status: 'active',
          departureCity: variant.departureCity || 'TP.HCM / Hà Nội',
          airline: variant.airline || firstDeparture?.airline,
          displayPriority: variant.displayPriority ?? index,
          summaryOverride: variant.summaryOverride,
          heroMediaOverride: variant.heroMediaOverride,
          rvo: variant.routeVisualOverride
            ? {
                ...variant.routeVisualOverride,
                st: variant.routeVisualOverride.routeStops?.map((stop) => ({
                  ...stop,
                  tp: stop.stopType,
                })),
              }
            : undefined,
          servicesOverride: variant.servicesOverride,
          itineraryDayOverrides: variant.itineraryDayOverrides || [],
        }),
      ),
    )

    const departures = await Promise.all(
      args.departures.map((row, index) => {
        const departureDate = parseSeedDate(row.departure)
        const variant =
          variants.find((item) => item.variantKey === row.variantKey) ||
          variants[index % Math.max(variants.length, 1)] ||
          variants[0]

        return createTourDeparture(payload, req, site.id, {
          tourProduct: product.id,
          variantRef: variant?.id,
          variantKey: row.variantKey || variant?.variantKey || `${args.slug}-${index + 1}`,
          departureCity: row.departureCity || variant?.departureCity || 'TP.HCM / Hà Nội',
          departureDate: toISODate(departureDate),
          returnDate: toISODate(addDays(departureDate, Math.max(args.durationDays - 1, 0))),
          airline: row.airline,
          priceFrom: parsePriceNumber(row.price),
          currency: 'VND',
          promoLabel: row.promoLabel || (index === 0 ? 'Đợt gần nhất' : undefined),
          urgencyLabel:
            row.urgencyLabel || (index === 0 ? 'Ưu tiên giữ chỗ sớm' : 'Nên chốt sớm để giữ giá'),
          availabilityBadge: row.availabilityBadge || (index === 0 ? 'Đang mở bán' : 'Sắp hết chỗ'),
          availabilityStatus: row.status || (index === 0 ? 'open' : 'limited'),
          note: 'Giá tham khảo công khai, sales xác nhận lại trước khi giữ chỗ.',
          depositNote:
            row.depositNote || 'Đặt cọc theo xác nhận của sales sau khi giữ chỗ thành công.',
          holdNote: row.holdNote || 'Giữ chỗ ngắn hạn theo tình trạng tồn chỗ thực tế.',
          changePolicyNote:
            'Điều kiện đổi/hủy phụ thuộc hãng bay, khách sạn và thời điểm chốt dịch vụ.',
          ctaLabelOverride: row.ctaLabelOverride || (index === 0 ? 'Giữ chỗ' : 'Nhận tư vấn'),
          isFeatured: index === 0,
          intentConfig: {
            leadFormVariant: 'tour-quick-inquiry',
            bookingIntentMode: 'tour-detail',
            salesRoutingHint: args.market,
            bookingNote: 'Dùng structured IDs để prefill lead form ở phase 2.',
          },
        })
      }),
    )

    await Promise.all(
      variants.map((variant) => {
        const linkedDepartures = departures
          .filter((departure) => String(departure.variantRef) === String(variant.id))
          .map((departure) => departure.id)

        return payload.update({
          collection: 'departure-variants' as never,
          id: variant.id,
          req,
          context: seedContext,
          data: seedData({
            activeDepartures: linkedDepartures,
          }),
        })
      }),
    )

    return {
      departures,
      page,
      product,
      variants,
    }
  }

  const seoulEverlandTour = await createTourPage({
    title: 'Seoul - Nami - Everland 5N4D',
    slug: 'seoul-nami-everland-5n4d',
    market: 'korea',
    durationDays: 5,
    durationNights: 4,
    parentPageID: tourHub.id,
    relatedPageIDs: [koreaPage.id, schedulePage.id, contactPage.id],
    imageID: seoulNamiEverlandImage.id,
    summary:
      'Line Korea retail 5N4D cho khách lần đầu đi Hàn, dễ chốt nhờ route quen thuộc, thời lượng ngắn và nhịp khởi hành đều.',
    marketCard: {
      badges: ['Phù hợp người mới đi'],
      sellingLine: 'Route Hàn Quốc quen thuộc, dễ chốt cho khách đi lần đầu.',
      priorityLabel: 'Gợi ý cho khách mới',
    },
    metaDescription:
      'Trang chi tiết tour Seoul - Nami - Everland 5N4D của WingsGo với giá và lịch khởi hành.',
    highlights: [
      {
        title: 'Tuyến Hàn Quốc dễ chọn',
        paragraph:
          'Tập trung Seoul, đảo Nami, Everland và các trải nghiệm an toàn cho khách đi Hàn lần đầu.',
      },
      {
        title: 'Dễ so sánh và quyết nhanh',
        paragraph:
          'Khác biệt rõ với line Jeju, phù hợp cho khách muốn giữ chỗ sau khi xem lịch và giá.',
      },
      {
        title: 'Giá hiển thị sớm',
        paragraph:
          'Các mốc giá và ngày đi xuất hiện sớm, không bắt khách để lại thông tin trước khi biết ngân sách.',
      },
    ],
    badgeLabels: [
      'Category: Korea retail bestseller',
      'Theme: City icons',
      'Theme: Family-friendly',
      'Suitable: First-time Korea travelers',
      'Suitable: Gia đình nhỏ',
      'Type: Group tour',
      'Giá công khai',
      'Free 3 days hold',
      'Visa support',
    ],
    factSummaryOverride: {
      routeSummary: 'Seoul - Nami - Everland - Myeongdong',
      mealsSummary: '4 bữa sáng, 3 bữa chính theo chương trình',
      groupSizeSummary: 'Ghép đoàn retail từ 20-28 khách',
      hotelSummary:
        '4 đêm khách sạn 3-4 sao khu Seoul, phù hợp nhóm gia đình và khách đi Hàn lần đầu',
      operatorNote:
        'Điều hành WingsGo xác nhận lại lịch bay, khách sạn Seoul và vé Everland trước khi giữ chỗ.',
      holdNote: 'Được giữ chỗ 72 giờ sau khi tư vấn nếu giá và tình trạng ghế còn phù hợp.',
    },
    reviewSnapshot: {
      score: 4.9,
      reviewCount: 58,
      travelerCount: 240,
      sourceLabel: 'Đánh giá tổng hợp từ khách đi Hàn line ngắn ngày',
      whyGuestsChoose:
        'Khách chọn line này vì route quen thuộc, đủ icon Seoul, có Nami và Everland nên dễ chốt cho gia đình nhỏ và khách đi lần đầu.',
      proofQuotes: [
        {
          author: 'Khách đi tháng 4',
          quote: 'Lịch gọn, không bị quá mệt, các điểm chính đều có và tối vẫn có thời gian tự do.',
        },
        {
          author: 'Nhóm gia đình 6 khách',
          quote: 'Everland và Nami là hai điểm khiến cả nhà quyết rất nhanh ngay từ lúc xem lịch.',
        },
      ],
    },
    routeVisual: {
      routeCaption:
        'Tuyến Seoul ngắn ngày, dễ chốt cho khách lần đầu với nhịp city icons, cảnh quan và vui chơi gia đình.',
      routeStops: [
        { label: 'Việt Nam', order: 1, stopType: 'origin' },
        { label: 'Seoul', order: 2, stopType: 'arrival' },
        { label: 'Nami', order: 3, stopType: 'sightseeing' },
        { label: 'Everland', order: 4, stopType: 'sightseeing' },
        { label: 'Seoul', order: 5, stopType: 'overnight' },
        { label: 'Việt Nam', order: 6, stopType: 'return' },
      ],
    },
    variantSeeds: [
      {
        variantKey: 'seoul-short-vj-sgn',
        label: 'Đi TP.HCM • Vietjet • Nhịp ngắn dễ chốt',
        departureCity: 'TP.HCM',
        airline: 'Vietjet',
        displayPriority: 0,
        summaryOverride:
          'Biến thể TP.HCM dùng Vietjet, phù hợp khách muốn đi nhanh, nhịp gọn và mức giá tiếp cận tốt cho line Hàn đầu tay.',
      },
      {
        variantKey: 'seoul-family-vna-han',
        label: 'Đi Hà Nội • Vietnam Airlines • Nhịp thoải mái hơn',
        departureCity: 'Hà Nội',
        airline: 'Vietnam Airlines',
        displayPriority: 1,
        summaryOverride:
          'Biến thể Hà Nội dùng Vietnam Airlines, phù hợp khách gia đình hoặc khách ưu tiên nhịp bay và cảm giác dịch vụ ổn định hơn.',
      },
    ],
    galleryIDs: [seoulNamiEverlandImage.id, jejuPoster.id],
    includesList: [
      'Vé máy bay khứ hồi theo đợt khởi hành công bố cùng 20kg hành lý ký gửi tiêu chuẩn',
      '4 đêm khách sạn 3-4 sao khu Seoul hoặc tương đương, tiêu chuẩn 2 khách/phòng',
      'Xe du lịch phục vụ theo lịch trình tham quan và đón tiễn sân bay',
      'Hướng dẫn viên tiếng Việt xuyên tuyến và trưởng đoàn từ Việt Nam khi đủ số lượng',
      'Vé vào cửa Everland, đảo Nami và các điểm tham quan ghi trong chương trình',
      'Ăn uống theo chương trình, nước suối cơ bản trên xe và hỗ trợ hồ sơ visa Hàn Quốc',
      'Bảo hiểm du lịch mức cơ bản theo line bán và quà tặng nhận diện đoàn',
    ],
    excludesList: [
      'Hộ chiếu còn hạn tối thiểu 6 tháng, phí làm hộ chiếu hoặc hồ sơ cá nhân phát sinh',
      'Tips cho hướng dẫn viên và tài xế theo quy định đoàn Hàn Quốc',
      'Nâng hạng phòng đơn, mua sắm cá nhân và các bữa ăn tự do ngoài lịch trình',
      'Chi phí đổi tên, đổi ngày hoặc nâng hạng vé máy bay ngoài điều kiện gói tour',
    ],
    itineraryDays: [
      {
        dayNumber: 1,
        title: 'TP.HCM / Hà Nội - Seoul',
        route: 'Việt Nam - Seoul',
        summary:
          'Khởi hành theo giờ bay của hãng công bố. Đến Seoul, đoàn làm thủ tục nhập cảnh, gặp xe và về khách sạn nghỉ ngơi để lấy lại sức sau chuyến bay.',
        meals: 'Tự túc / ăn nhẹ trên máy bay',
        transport: 'Máy bay quốc tế và xe đón sân bay',
        accommodation: 'Khách sạn 3-4 sao khu Seoul',
        notes:
          'Đêm đầu ưu tiên nghỉ ngơi, khách có thể đi dạo khu lân cận khách sạn nếu giờ đến còn sớm.',
        media: seoulNamiEverlandImage.id,
      },
      {
        dayNumber: 2,
        title: 'Khám phá city icons của Seoul',
        route: 'Cung điện - quảng trường - tháp biểu tượng - Myeongdong',
        summary:
          'Ngày tham quan nhấn vào các điểm khách đi Hàn lần đầu thường muốn thấy: cung điện, quảng trường trung tâm, khu phố mua sắm và các điểm check-in đại diện cho Seoul hiện đại.',
        meals: 'Ăn sáng / trưa / tối',
        transport: 'Xe du lịch theo chương trình',
        accommodation: 'Khách sạn 3-4 sao khu Seoul',
        notes:
          'Buổi tối có thời gian tự do tại Myeongdong để khách trải nghiệm mỹ phẩm, thời trang và ẩm thực đường phố.',
        media: seoulNamiEverlandImage.id,
      },
      {
        dayNumber: 3,
        title: 'Đảo Nami - cảnh quan dễ bán cho khách lần đầu',
        route: 'Seoul - Nami - Seoul',
        summary:
          'Rời Seoul đi đảo Nami, điểm đến rất mạnh về hình ảnh và cảm xúc. Trên tuyến có thể kết hợp thêm các điểm phụ trợ phù hợp mùa, giúp ngày thứ ba đủ thư giãn nhưng vẫn giàu trải nghiệm.',
        meals: 'Ăn sáng / trưa',
        transport: 'Xe du lịch và tàu vào đảo',
        accommodation: 'Khách sạn 3-4 sao khu Seoul',
        notes:
          'Nami phù hợp cho nhóm gia đình, cặp đôi và khách thích khung cảnh lãng mạn, xanh mát để chụp ảnh.',
        media: seoulNamiEverlandImage.id,
      },
      {
        dayNumber: 4,
        title: 'Everland - shopping - tự do theo nhịp retail',
        route: 'Seoul - Everland - Seoul',
        summary:
          'Ngày thứ tư dành cho Everland và trải nghiệm vui chơi, sau đó quay lại Seoul để khách có thời gian mua sắm và hoàn thiện checklist trước khi kết thúc tour.',
        meals: 'Ăn sáng / trưa',
        transport: 'Xe du lịch theo đoàn',
        accommodation: 'Khách sạn 3-4 sao khu Seoul',
        notes:
          'Đây là ngày giúp line 5N4D khác rõ các chương trình chỉ city tour đơn thuần, đặc biệt hấp dẫn với khách gia đình có trẻ em.',
        media: seoulNamiEverlandImage.id,
      },
      {
        dayNumber: 5,
        title: 'Seoul - Việt Nam',
        route: 'Seoul - Việt Nam',
        summary:
          'Trả phòng, ra sân bay theo giờ bay của đoàn. Kết thúc hành trình Hàn Quốc ngắn ngày với cấu trúc rõ ràng, dễ hiểu và dễ chốt cho nhóm khách retail.',
        meals: 'Ăn sáng',
        transport: 'Xe tiễn sân bay và máy bay quốc tế',
        accommodation: 'Không áp dụng',
        notes:
          'Lịch bay ngày cuối phụ thuộc từng đợt khởi hành; điều hành sẽ gửi giờ tập trung chính thức khi chốt tour.',
        media: seoulNamiEverlandImage.id,
      },
    ],
    departures: [
      {
        departure: '08/07/2026',
        airline: 'Vietjet',
        price: '18.900.000',
        variantKey: 'seoul-short-vj-sgn',
        departureCity: 'TP.HCM',
        urgencyLabel: 'Giá mở bán đầu mùa',
        promoLabel: 'Bán chạy',
      },
      {
        departure: '22/07/2026',
        airline: 'Jeju Air',
        price: '19.500.000',
        variantKey: 'seoul-short-vj-sgn',
        departureCity: 'TP.HCM',
        status: 'limited',
      },
      {
        departure: '05/08/2026',
        airline: 'Vietnam Airlines',
        price: '21.900.000',
        variantKey: 'seoul-family-vna-han',
        departureCity: 'Hà Nội',
        availabilityBadge: 'Ghế đẹp',
        ctaLabelOverride: 'Nhận tư vấn line bay đẹp',
      },
    ],
    itinerary:
      'Ngày 1 bay đến Seoul và nhận nhịp city orientation. Ngày 2 khám phá cung điện, tháp biểu tượng và khu mua sắm. Ngày 3 đi Nami và các điểm check-in cảnh quan. Ngày 4 trải nghiệm Everland, shopping và tự do theo nhịp retail. Ngày 5 trả phòng, ra sân bay và kết thúc hành trình.',
    includes:
      'Giá tour bao gồm vé máy bay khứ hồi theo chặng công bố, khách sạn tiêu chuẩn, ăn uống theo chương trình, xe tham quan, hướng dẫn viên, và hỗ trợ visa theo line bán. Các chi phí cá nhân, hộ chiếu, tips và mua sắm tự do được ghi rõ khi chốt booking.',
    faq: [
      {
        question: 'Tour này phù hợp với ai?',
        answer:
          'Phù hợp với first-time Korea travelers, nhóm gia đình nhỏ và khách muốn đi ngắn ngày nhưng vẫn đủ icon trải nghiệm.',
      },
      {
        question: 'Có thể nâng hạng dịch vụ không?',
        answer:
          'Có thể nâng khách sạn hoặc bổ sung dịch vụ theo nhu cầu nếu còn chỗ và đúng chính sách giá của đợt khởi hành.',
      },
    ],
  })

  const jejuTour = await createTourPage({
    title: 'Seoul - Jeju - Nami - Camellia Hill 6N5D',
    slug: 'seoul-jeju-nami-camellia-hill-6n5d',
    market: 'korea',
    durationDays: 6,
    durationNights: 5,
    parentPageID: tourHub.id,
    relatedPageIDs: [koreaPage.id, campaignHub.id, contactPage.id],
    imageID: seoulJejuCamelliaImage.id,
    summary:
      'Line campaign mùa hè cho Hàn Quốc với Jeju Air, visual mạnh, giá public rõ và thông điệp bán hàng hướng trải nghiệm hoa và cảnh quan.',
    marketCard: {
      badges: ['Nổi bật mùa hè'],
      sellingLine: 'Trải nghiệm hoa và cảnh quan Jeju, đậm chất mùa hè.',
      priorityLabel: 'Campaign mùa hè',
    },
    metaDescription: 'Trang chi tiết tour Seoul - Jeju - Nami - Camellia Hill 6N5D của WingsGo.',
    highlights: [
      {
        title: 'Visual campaign rõ ràng',
        paragraph:
          'Tour tận dụng poster Jeju để khách nhận diện ngay đây là line mùa hè đang mở bán.',
      },
      {
        title: 'Bán theo điểm đến nổi bật',
        paragraph:
          'Jeju, Camellia Hill, Nami và các điểm biểu tượng giúp line này khác rõ route Seoul cổ điển.',
      },
      {
        title: 'Dễ gửi yêu cầu nhanh',
        paragraph:
          'Ngày khởi hành và giá được hiển thị sớm để khách không phải đi vòng qua nhiều bước.',
      },
    ],
    badgeLabels: [
      'Category: Summer Korea campaign',
      'Theme: Jeju scenery',
      'Theme: Relaxation',
      'Suitable: Couples',
      'Suitable: Khách thích chụp ảnh',
      'Type: Group tour',
      'Giá công khai',
      'Campaign-ready',
      'Jeju Air focus',
    ],
    factSummaryOverride: {
      routeSummary: 'Seoul - Jeju - Camellia Hill - Nami',
      mealsSummary: '5 bữa sáng, 4 bữa chính theo lịch trình',
      groupSizeSummary: 'Đoàn campaign 18-25 khách',
      operatorNote:
        'Line này cần chốt kỹ giờ bay nội địa nối Jeju và khách sạn theo mùa; sales sẽ confirm lại ngay khi giữ chỗ.',
      holdNote: 'Giữ chỗ ngắn hạn theo tồn chỗ Jeju Air và room allotment thực tế.',
    },
    galleryIDs: [seoulJejuCamelliaImage.id, jejuPoster.id],
    includesList: [
      'Vé máy bay quốc tế và chặng nối nội địa theo cấu trúc tour được công bố',
      '5 đêm khách sạn 3-4 sao tại Seoul và Jeju, bố trí 2 khách/phòng tiêu chuẩn',
      'Xe tham quan, hướng dẫn viên và trưởng đoàn theo line campaign',
      'Ăn uống, vé tham quan Camellia Hill, Nami và các điểm chính theo chương trình',
      'Hỗ trợ hồ sơ visa, bảo hiểm du lịch cơ bản và nước uống trên xe',
      'Quà tặng đoàn và hỗ trợ điều phối ảnh/chỗ check-in tại các điểm nổi bật',
    ],
    excludesList: [
      'Chi phí cá nhân, tips, minibar, giặt ủi và mua sắm tự do ngoài chương trình',
      'Phí đổi vé, nâng hạng ghế hoặc thay đổi lịch trình do nhu cầu cá nhân',
      'Phòng đơn hoặc phụ phí mùa cao điểm nếu khách có yêu cầu riêng ngoài tiêu chuẩn đoàn',
    ],
    itineraryDays: [
      {
        dayNumber: 1,
        title: 'Việt Nam - Seoul',
        route: 'TP.HCM / Hà Nội - Seoul',
        summary:
          'Đoàn khởi hành sang Hàn Quốc, nhập cảnh và di chuyển về Seoul nghỉ ngơi. Buổi đầu ưu tiên hồi sức và làm quen nhịp chương trình.',
        meals: 'Tự túc / ăn nhẹ trên máy bay',
        transport: 'Máy bay quốc tế và xe sân bay',
        accommodation: 'Khách sạn 3-4 sao khu Seoul',
        notes: 'Nếu giờ đến thuận lợi, khách có thể tự do khám phá khu mua sắm gần khách sạn.',
        media: seoulJejuCamelliaImage.id,
      },
      {
        dayNumber: 2,
        title: 'Bay nối Jeju - cảnh quan mở đầu campaign',
        route: 'Seoul - Jeju',
        summary:
          'Nối chuyến nội địa đến Jeju, bắt đầu nhịp visual của chương trình với những điểm tham quan thiên về biển, cảnh quan và hình ảnh dễ bán mùa hè.',
        meals: 'Ăn sáng / trưa / tối',
        transport: 'Máy bay nội địa và xe du lịch',
        accommodation: 'Khách sạn 3-4 sao tại Jeju',
        notes:
          'Ngày này quyết định cảm xúc của campaign, nên thường được ưu tiên lịch tham quan có nhịp nhẹ và hình ảnh đẹp.',
        media: seoulJejuCamelliaImage.id,
      },
      {
        dayNumber: 3,
        title: 'Camellia Hill - bờ biển Jeju - trải nghiệm thư giãn',
        route: 'Jeju',
        summary:
          'Khám phá Camellia Hill và các điểm nhìn ra biển đặc trưng của Jeju. Đây là ngày tour thiên về thư giãn, cảnh sắc và thời gian chụp ảnh nhiều hơn city tour.',
        meals: 'Ăn sáng / trưa',
        transport: 'Xe du lịch theo chương trình',
        accommodation: 'Khách sạn 3-4 sao tại Jeju',
        notes:
          'Phù hợp với khách cặp đôi, nhóm bạn hoặc khách hàng muốn một line Hàn Quốc có chất nghỉ dưỡng rõ hơn.',
        media: seoulJejuCamelliaImage.id,
      },
      {
        dayNumber: 4,
        title: 'Quay lại Seoul - Nami',
        route: 'Jeju - Seoul - Nami',
        summary:
          'Rời Jeju quay về Seoul, sau đó tiếp tục một tuyến tham quan giàu hình ảnh với đảo Nami để giữ nhịp cảm xúc của chương trình.',
        meals: 'Ăn sáng / trưa',
        transport: 'Máy bay nội địa, xe du lịch và tàu vào đảo',
        accommodation: 'Khách sạn 3-4 sao khu Seoul',
        notes:
          'Ngày di chuyển nhiều hơn, điều hành thường tối ưu thời gian để đoàn vẫn có đủ khoảng nghỉ.',
        media: seoulJejuCamelliaImage.id,
      },
      {
        dayNumber: 5,
        title: 'Seoul highlights - shopping',
        route: 'Seoul',
        summary:
          'Khám phá các điểm city icon còn lại tại Seoul kết hợp thời gian mua sắm để khách hoàn tất nhu cầu cá nhân trước ngày về.',
        meals: 'Ăn sáng / trưa',
        transport: 'Xe du lịch theo đoàn',
        accommodation: 'Khách sạn 3-4 sao khu Seoul',
        notes:
          'Buổi tối tự do là khoảng khách retail rất thích vì có thể linh hoạt shopping hoặc dạo phố.',
        media: seoulJejuCamelliaImage.id,
      },
      {
        dayNumber: 6,
        title: 'Seoul - Việt Nam',
        route: 'Seoul - Việt Nam',
        summary:
          'Trả phòng và ra sân bay theo giờ bay. Kết thúc line Hàn Quốc mùa hè với cấu trúc vừa có cảnh quan Jeju vừa có city Seoul quen thuộc.',
        meals: 'Ăn sáng',
        transport: 'Xe tiễn sân bay và máy bay quốc tế',
        accommodation: 'Không áp dụng',
        notes: 'Điều hành sẽ chốt thời gian tập trung sân bay theo giờ bay từng đợt.',
        media: seoulJejuCamelliaImage.id,
      },
    ],
    departures: [
      { departure: '11/07/2026', airline: 'Jeju Air', price: '23.900.000' },
      { departure: '28/08/2026', airline: 'Jeju Air', price: '25.900.000' },
    ],
    itinerary:
      'Ngày 1 bay sang Hàn Quốc và kết nối Seoul. Ngày 2 di chuyển đến Jeju với trọng tâm cảnh quan và các điểm check-in hoa. Ngày 3 trải nghiệm Camellia Hill, cảnh biển và hoạt động mang tính thư giãn. Ngày 4 quay lại nhịp Seoul, đảo Nami, các điểm landmark và shopping. Ngày 5-6 hoàn tất phần city, tự do chọn mua và bay về Việt Nam.',
    includes:
      'Bao gồm vé máy bay theo chặng công bố, khách sạn 3-4 sao, xe đưa đón, hướng dẫn viên, ăn uống theo chương trình, và các điểm tham quan chính trên line campaign. Các khoản cá nhân, tips và thay đổi do điều kiện vận hành sẽ được thông báo khi tư vấn.',
    faq: [
      {
        question: 'Điểm khác biệt lớn nhất của line Jeju là gì?',
        answer:
          'Line này thiên về cảm xúc và visual hơn, phù hợp với chiến dịch mùa hè và nhóm khách thích trải nghiệm cảnh quan, hoa và chụp ảnh.',
      },
      {
        question: 'Page này có thể dùng lại cho campaign khác không?',
        answer:
          'Có. Đây chính là cấu trúc mẫu để về sau seed thêm campaign Hàn theo mùa khác mà không phải viết lại toàn bộ từ đầu.',
      },
    ],
  })

  const shizuokaTour = await createTourPage({
    title: 'Shizuoka - Núi Phú Sĩ - Tokyo 5N4D',
    slug: 'shizuoka-nui-phu-si-tokyo-5n4d',
    market: 'japan',
    durationDays: 5,
    durationNights: 4,
    parentPageID: tourHub.id,
    relatedPageIDs: [japanPage.id, schedulePage.id, contactPage.id],
    imageID: shizuokaFujiTokyoImage.id,
    summary:
      'Line Nhật 5N4D thiên về quyết định nhanh, giá dễ đọc, dùng rất tốt cho traffic từ campaign mùa hè và hành vi compare route.',
    marketCard: {
      badges: ['Giá tốt'],
      sellingLine: 'Route Nhật ngắn ngày, giá dễ đọc và dễ quyết.',
      priorityLabel: 'Giá tốt trong tháng',
    },
    metaDescription: 'Trang chi tiết tour Shizuoka - Núi Phú Sĩ - Tokyo 5N4D của WingsGo.',
    highlights: [
      {
        title: 'Tuyến ngắn dễ chọn',
        paragraph: 'Phù hợp nhóm khách muốn đi Nhật Bản nhưng chưa cần hành trình 6N5D dài hơn.',
      },
      {
        title: 'Giá và ngày rõ ràng',
        paragraph: 'Các mốc giá và ngày từ poster được chuyển thành bảng thông tin dễ cập nhật.',
      },
      {
        title: 'Line mở đầu mạnh',
        paragraph:
          'Dùng tốt làm tour nổi bật trên homepage, trang thị trường và bảng lịch khởi hành.',
      },
    ],
    badgeLabels: [
      'Category: Japan short route',
      'Theme: Mt. Fuji',
      'Theme: Summer compare',
      'Suitable: First-time Japan travelers',
      'Suitable: Khách ngân sách gọn',
      'Type: Group tour',
      'Giá công khai',
      'Visa support',
      'Tokyo finale',
    ],
    factSummaryOverride: {
      routeSummary: 'Shizuoka - Núi Phú Sĩ - Tokyo',
      mealsSummary: '4 bữa sáng, 3 bữa chính theo chương trình',
      groupSizeSummary: 'Đoàn Nhật 20-26 khách',
      hotelSummary:
        '4 đêm khách sạn 3-4 sao, có đêm nghỉ gần tuyến Fuji để giữ nhịp route ngắn nhưng dễ bán',
      operatorNote:
        'Điều hành ưu tiên xác nhận khách sạn khu vực Fuji và lịch tham quan theo thời tiết từng đợt.',
      holdNote: 'Có thể giữ chỗ ngắn hạn, nhưng giá line Nhật thay đổi nhanh theo mùa.',
    },
    reviewSnapshot: {
      score: 4.7,
      reviewCount: 31,
      travelerCount: 110,
      sourceLabel: 'Đánh giá line Nhật short route',
      whyGuestsChoose:
        'Khách chọn line này khi muốn đi Nhật lần đầu nhưng chưa cần hành trình dài 6N5D và muốn nhìn giá rõ ngay từ market page.',
    },
    routeVisual: {
      routeCaption:
        'Route Nhật ngắn, chuyển mượt từ cảnh quan Fuji sang city Tokyo để khách dễ so sánh với line Nhật 6N5D.',
    },
    variantSeeds: [
      {
        variantKey: 'japan-short-vj-sgn',
        label: 'TP.HCM • Vietjet • Ngân sách gọn',
        departureCity: 'TP.HCM',
        airline: 'Vietjet',
        displayPriority: 0,
        summaryOverride:
          'Biến thể giá gọn cho khách muốn đi Nhật 5N4D rõ ràng, so sánh nhanh và chốt nhanh theo ngân sách.',
      },
      {
        variantKey: 'japan-short-vna-han',
        label: 'Hà Nội • Vietnam Airlines • Dịch vụ êm hơn',
        departureCity: 'Hà Nội',
        airline: 'Vietnam Airlines',
        displayPriority: 1,
        summaryOverride:
          'Biến thể Hà Nội dành cho khách ưu tiên nhịp bay và cảm giác dịch vụ ổn định hơn, vẫn giữ khung route 5N4D.',
      },
    ],
    galleryIDs: [shizuokaFujiTokyoImage.id, japanPoster.id],
    includesList: [
      'Vé máy bay khứ hồi theo chặng công bố cùng hành lý ký gửi tiêu chuẩn',
      '4 đêm khách sạn 3-4 sao, trong đó có đêm nghỉ khu vực gần tuyến Núi Phú Sĩ',
      'Xe tham quan, hướng dẫn viên tiếng Việt và vé vào cửa các điểm chính theo lịch trình',
      'Bữa ăn theo chương trình, hỗ trợ hồ sơ visa Nhật và nước suối cơ bản trên xe',
      'Bảo hiểm du lịch cơ bản cùng hỗ trợ điều phối đoàn xuyên tuyến',
    ],
    excludesList: [
      'Tips, chi tiêu cá nhân, minibar, giặt ủi và các bữa ăn tự do ngoài chương trình',
      'Phụ phí phòng đơn, phụ phí mùa lễ hoặc chênh lệch hãng bay nếu khách chọn phương án khác',
      'Chi phí phát sinh do đổi tên, đổi ngày hoặc yêu cầu tách đoàn riêng',
    ],
    itineraryDays: [
      {
        dayNumber: 1,
        title: 'Việt Nam - Nhật Bản',
        route: 'TP.HCM / Hà Nội - Nhật Bản',
        summary:
          'Khởi hành sang Nhật Bản theo chuyến bay của đoàn. Sau khi nhập cảnh, xe đưa đoàn về khu vực lưu trú đầu tiên để nghỉ ngơi.',
        meals: 'Tự túc / ăn nhẹ trên máy bay',
        transport: 'Máy bay quốc tế và xe sân bay',
        accommodation: 'Khách sạn 3-4 sao tại khu vực Shizuoka / phụ cận',
        notes: 'Đêm đầu thường được bố trí tối ưu để ngày hôm sau vào nhịp tham quan thuận lợi.',
        media: shizuokaFujiTokyoImage.id,
      },
      {
        dayNumber: 2,
        title: 'Shizuoka - tuyến cảnh quan gắn với Núi Phú Sĩ',
        route: 'Shizuoka - khu vực Núi Phú Sĩ',
        summary:
          'Ngày trọng tâm của route ngắn: tham quan khu vực Shizuoka, các điểm nhìn ra Núi Phú Sĩ và những stop có hình ảnh mùa hè rất dễ bán.',
        meals: 'Ăn sáng / trưa / tối',
        transport: 'Xe du lịch theo tuyến',
        accommodation: 'Khách sạn 3-4 sao khu vực gần Fuji',
        notes:
          'Lịch điểm ngắm núi có thể đổi thứ tự theo thời tiết để đảm bảo trải nghiệm thực tế tốt nhất.',
        media: shizuokaFujiTokyoImage.id,
      },
      {
        dayNumber: 3,
        title: 'Tuyến Fuji - vào Tokyo',
        route: 'Fuji - Tokyo',
        summary:
          'Tiếp tục các điểm chính quanh tuyến Fuji rồi dịch chuyển về Tokyo. Cảm giác tour bắt đầu chuyển từ thiên nhiên sang city experience rõ hơn từ ngày này.',
        meals: 'Ăn sáng / trưa',
        transport: 'Xe du lịch xuyên tuyến',
        accommodation: 'Khách sạn 3-4 sao khu Tokyo',
        notes:
          'Ngày có di chuyển đường dài hơn, điều hành thường kiểm soát chặt giờ đoàn để tối vẫn có thời gian nghỉ.',
        media: shizuokaFujiTokyoImage.id,
      },
      {
        dayNumber: 4,
        title: 'Tokyo city highlights - shopping',
        route: 'Tokyo',
        summary:
          'Khám phá các biểu tượng của Tokyo kết hợp thời gian mua sắm và tự do. Đây là ngày cân bằng giữa sightseeing và retail rất phù hợp với khách outbound phổ thông.',
        meals: 'Ăn sáng / trưa',
        transport: 'Xe du lịch theo chương trình',
        accommodation: 'Khách sạn 3-4 sao khu Tokyo',
        notes:
          'Nếu khách cần trải nghiệm riêng buổi tối, đây thường là ngày linh hoạt nhất của line 5N4D.',
        media: shizuokaFujiTokyoImage.id,
      },
      {
        dayNumber: 5,
        title: 'Tokyo - Việt Nam',
        route: 'Tokyo - Việt Nam',
        summary:
          'Trả phòng, ra sân bay và kết thúc chương trình Nhật 5N4D. Đây là line phù hợp khi khách muốn đi Nhật rõ ràng, vừa đủ và ngân sách gọn.',
        meals: 'Ăn sáng',
        transport: 'Xe tiễn sân bay và máy bay quốc tế',
        accommodation: 'Không áp dụng',
        notes: 'Giờ bay và thời gian tập trung phụ thuộc từng đợt khởi hành.',
        media: shizuokaFujiTokyoImage.id,
      },
    ],
    departures: [
      {
        departure: '20/05/2026',
        airline: 'Vietjet',
        price: '22.500.000',
        variantKey: 'japan-short-vj-sgn',
        departureCity: 'TP.HCM',
        status: 'limited',
      },
      {
        departure: '17/06/2026',
        airline: 'Vietjet',
        price: '22.900.000',
        variantKey: 'japan-short-vj-sgn',
        departureCity: 'TP.HCM',
        status: 'limited',
      },
      {
        departure: '08/07/2026',
        airline: 'Vietnam Airlines',
        price: '24.900.000',
        variantKey: 'japan-short-vna-han',
        departureCity: 'Hà Nội',
        urgencyLabel: 'Đợt dễ chốt cho khách ưu tiên hãng bay',
        availabilityBadge: 'Mở bán',
      },
    ],
    itinerary:
      'Ngày 1 bay đến Nhật và vào nhịp chương trình. Ngày 2 khám phá Shizuoka, cảnh quan gắn với Núi Phú Sĩ và các điểm dừng hình ảnh mạnh. Ngày 3 chuyển về Tokyo, trải nghiệm city icons và các khu phố biểu tượng. Ngày 4 tự do theo tuyến shopping hoặc điểm tham quan bổ sung. Ngày 5 trả phòng và bay về Việt Nam.',
    includes:
      'Bao gồm vé máy bay khứ hồi, khách sạn tiêu chuẩn 3-4 sao, xe tham quan, vé vào cửa theo chương trình, HDV và hỗ trợ hồ sơ visa theo line. Giá chưa bao gồm chi tiêu ngoài chương trình và phí cá nhân phát sinh.',
    faq: [
      {
        question: 'Tour 5N4D này khác gì line 6N5D?',
        answer:
          'Khác ở độ dài và số điểm dừng. 5N4D phù hợp khách muốn quyết nhanh và ngân sách gọn hơn, còn 6N5D phù hợp người muốn đi sâu hơn theo nhiều thành phố.',
      },
      {
        question: 'Tại sao line Nhật cần giá sớm?',
        answer:
          'Vì khách thường so sánh tuyến và ngân sách rất nhanh. Nếu không thấy giá đủ sớm, khách dễ rời trang thị trường trước khi mở chi tiết.',
      },
    ],
  })

  const osakaTour = await createTourPage({
    title: 'Osaka - Kobe - Kyoto - Nagoya - Fuji - Tokyo 6N5D',
    slug: 'osaka-kobe-kyoto-nagoya-fuji-tokyo-6n5d',
    market: 'japan',
    durationDays: 6,
    durationNights: 5,
    parentPageID: tourHub.id,
    relatedPageIDs: [japanPage.id, schedulePage.id, contactPage.id],
    imageID: osakaKyotoFujiTokyoImage.id,
    summary:
      'Line Nhật 6N5D cho khách muốn hành trình đầy hơn, nhiều điểm hơn và có lý do rõ để nâng ngân sách từ line 5N4D.',
    marketCard: {
      badges: ['Route nhiều điểm'],
      sellingLine: 'Hành trình Nhật đầy đủ Osaka, Kyoto, Phú Sĩ và Tokyo.',
      priorityLabel: 'Route nhiều điểm',
    },
    metaDescription:
      'Trang chi tiết tour Osaka - Kobe - Kyoto - Nagoya - Fuji - Tokyo 6N5D của WingsGo.',
    highlights: [
      {
        title: 'Hành trình đầy đủ hơn',
        paragraph: 'Route dài giúp khách hiểu lý do giá cao hơn và trải nghiệm nhiều điểm hơn.',
      },
      {
        title: 'Dễ dùng cho nhiều mùa',
        paragraph:
          'Có thể dùng cho mùa hè, mùa thu hoặc mùa lá vàng nếu cập nhật hình ảnh và lịch khởi hành.',
      },
      {
        title: 'Hỗ trợ so sánh tốt',
        paragraph:
          'Cặp line 5N4D và 6N5D cho thị trường Nhật giúp khách chọn theo thời gian và ngân sách.',
      },
    ],
    badgeLabels: [
      'Category: Japan full route',
      'Theme: Multi-city discovery',
      'Theme: Cultural highlights',
      'Suitable: Khách muốn đi sâu hơn',
      'Suitable: Nhóm bạn / gia đình có thời gian',
      'Type: Group tour',
      'Giá công khai',
      'Vietnam Airlines',
      'Full-route compare',
    ],
    factSummaryOverride: {
      routeSummary: 'Osaka - Kobe - Kyoto - Nagoya - Fuji - Tokyo',
      mealsSummary: '5 bữa sáng, 4 bữa chính theo lịch trình',
      groupSizeSummary: 'Đoàn Nhật 20-26 khách',
      operatorNote:
        'Line dài ngày cần điều phối khách sạn đa chặng và xe xuyên tuyến; điều hành sẽ chốt rooming và giờ tập trung kỹ hơn so với line 5N4D.',
      holdNote:
        'Giữ chỗ theo allotment của line Nhật, ưu tiên xác nhận sớm với khách muốn đi mùa đẹp.',
    },
    galleryIDs: [osakaKyotoFujiTokyoImage.id, japanPoster.id],
    includesList: [
      'Vé máy bay khứ hồi quốc tế và hành lý ký gửi tiêu chuẩn theo hãng bay công bố',
      '5 đêm khách sạn 3-4 sao xuyên tuyến Osaka - Kyoto - Fuji - Tokyo, tiêu chuẩn 2 khách/phòng',
      'Xe tham quan suốt tuyến, hướng dẫn viên và vé tham quan các điểm chính theo chương trình',
      'Bữa ăn theo lịch trình, hỗ trợ hồ sơ visa Nhật và nước suối cơ bản trên xe',
      'Bảo hiểm du lịch cơ bản và điều phối đoàn cho line nhiều điểm dừng',
    ],
    excludesList: [
      'Tips, chi tiêu ngoài chương trình, phòng đơn và các dịch vụ cá nhân phát sinh',
      'Phụ phí mùa cao điểm, vé tham quan tự chọn hoặc hoạt động riêng của khách',
      'Chi phí đổi ngày, đổi tên hoặc tách đoàn theo yêu cầu cá nhân',
    ],
    itineraryDays: [
      {
        dayNumber: 1,
        title: 'Việt Nam - Osaka',
        route: 'TP.HCM / Hà Nội - Osaka',
        summary:
          'Khởi hành sang Osaka, nhập cảnh và về khách sạn nghỉ ngơi. Ngày đầu nhẹ để đoàn chuẩn bị cho tuyến nhiều thành phố từ ngày tiếp theo.',
        meals: 'Tự túc / ăn nhẹ trên máy bay',
        transport: 'Máy bay quốc tế và xe sân bay',
        accommodation: 'Khách sạn 3-4 sao khu Osaka',
        notes:
          'Line 6N5D ưu tiên giữ sức cho đoàn ngay từ đầu vì nhịp di chuyển các ngày sau dày hơn.',
        media: osakaKyotoFujiTokyoImage.id,
      },
      {
        dayNumber: 2,
        title: 'Osaka - Kobe - Kyoto',
        route: 'Osaka - Kobe - Kyoto',
        summary:
          'Bắt đầu tuyến multi-city với Osaka, Kobe và Kyoto. Ngày này giúp khách cảm nhận rất rõ lợi thế của line dài: trải nghiệm dày và nhiều bối cảnh khác nhau trong cùng một hành trình.',
        meals: 'Ăn sáng / trưa / tối',
        transport: 'Xe du lịch xuyên tuyến',
        accommodation: 'Khách sạn 3-4 sao khu Kyoto / Nagoya',
        notes: 'Điều hành tối ưu thứ tự điểm để tránh dồn đoàn vào cùng một time slot quá căng.',
        media: osakaKyotoFujiTokyoImage.id,
      },
      {
        dayNumber: 3,
        title: 'Kyoto - Nagoya',
        route: 'Kyoto - Nagoya',
        summary:
          'Tiếp tục tuyến với các điểm văn hóa và city stop quan trọng trước khi nối sang chặng Fuji. Ngày thứ ba là điểm khác biệt lớn giữa line 6N5D và line 5N4D.',
        meals: 'Ăn sáng / trưa',
        transport: 'Xe du lịch theo chương trình',
        accommodation: 'Khách sạn 3-4 sao khu Nagoya / phụ cận',
        notes: 'Khách cần chuẩn bị hành lý gọn để thuận tiện cho các chặng khách sạn đổi liên tục.',
        media: osakaKyotoFujiTokyoImage.id,
      },
      {
        dayNumber: 4,
        title: 'Nagoya - tuyến Fuji',
        route: 'Nagoya - khu vực Núi Phú Sĩ',
        summary:
          'Rời Nagoya đi khu vực Fuji, nơi chương trình chuyển từ nhịp city sang thiên nhiên. Đây là ngày tạo chiều sâu trải nghiệm cho khách muốn “đi Nhật cho đáng chuyến”.',
        meals: 'Ăn sáng / trưa / tối',
        transport: 'Xe du lịch xuyên tuyến',
        accommodation: 'Khách sạn 3-4 sao khu Fuji / Yamanashi',
        notes:
          'Điểm ngắm Fuji có thể thay đổi theo thực tế thời tiết để đảm bảo trải nghiệm tốt hơn.',
        media: osakaKyotoFujiTokyoImage.id,
      },
      {
        dayNumber: 5,
        title: 'Fuji - Tokyo',
        route: 'Fuji - Tokyo',
        summary:
          'Hoàn tất tuyến Fuji rồi vào Tokyo. Buổi cuối tại thủ đô cho phép khách vừa sightseeing vừa shopping, tạo cái kết cân bằng cho hành trình dài ngày.',
        meals: 'Ăn sáng / trưa',
        transport: 'Xe du lịch theo tuyến',
        accommodation: 'Khách sạn 3-4 sao khu Tokyo',
        notes: 'Tối cuối thường được khách tận dụng để mua sắm hoặc dạo phố tự do.',
        media: osakaKyotoFujiTokyoImage.id,
      },
      {
        dayNumber: 6,
        title: 'Tokyo - Việt Nam',
        route: 'Tokyo - Việt Nam',
        summary:
          'Trả phòng, ra sân bay và kết thúc line Nhật 6N5D. Đây là lựa chọn phù hợp cho khách có thêm thời gian và muốn nhiều điểm đến hơn trong một chuyến.',
        meals: 'Ăn sáng',
        transport: 'Xe tiễn sân bay và máy bay quốc tế',
        accommodation: 'Không áp dụng',
        notes: 'Giờ tập trung chính thức sẽ được gửi khi điều hành chốt giờ bay cuối cùng.',
        media: osakaKyotoFujiTokyoImage.id,
      },
    ],
    departures: [
      { departure: '25/06/2026', airline: 'Vietnam Airlines', price: '32.900.000' },
      { departure: '30/07/2026', airline: 'Vietnam Airlines', price: '33.900.000' },
      { departure: '27/08/2026', airline: 'Vietnam Airlines', price: '34.900.000' },
    ],
    itinerary:
      'Ngày 1 đến Osaka. Ngày 2 đi Kobe và Kyoto với nhịp city icon kết hợp cảnh quan. Ngày 3 dịch chuyển tuyến Nagoya và kết nối các điểm dừng tiếp theo. Ngày 4 tham quan khu vực gắn với Núi Phú Sĩ và nghỉ đêm theo tuyến. Ngày 5 vào Tokyo, city highlights và shopping. Ngày 6 hoàn tất hành trình và bay về.',
    includes:
      'Bao gồm vé máy bay, khách sạn tiêu chuẩn, ăn uống theo chương trình, xe đưa đón, vé tham quan chính, hướng dẫn viên và hỗ trợ hồ sơ. Mọi chi phí cá nhân, tips và chương trình tự chọn phát sinh sẽ được ghi rõ ở bước tư vấn.',
    faq: [
      {
        question: 'Ai nên chọn line 6N5D?',
        answer:
          'Khách đã cân nhắc Nhật nghiêm túc hơn, muốn đi nhiều thành phố và sẵn sàng cho lịch trình dày hơn.',
      },
      {
        question: 'Page này có cần nhiều card nhỏ không?',
        answer:
          'Không. Tour detail page nên tập trung vào summary, departure rows, itinerary và CTA giữ chỗ thay vì phân tán người đọc.',
      },
    ],
  })

  const beijingTour = await createTourPage({
    title: 'Bắc Kinh - Vạn Lý Trường Thành 5N4D',
    slug: 'bac-kinh-van-ly-truong-thanh-5n4d',
    market: 'china',
    durationDays: 5,
    durationNights: 4,
    parentPageID: tourHub.id,
    relatedPageIDs: [chinaPage.id, schedulePage.id, contactPage.id],
    imageID: beijingGreatWallImage.id,
    summary:
      'Route Trung Quốc gọn cho khách thích điểm biểu tượng, thời lượng ngắn và mức giá retail dễ tiếp cận.',
    marketCard: {
      badges: ['Nhịp nhẹ'],
      sellingLine: 'Hành trình gọn, nhịp tham quan nhẹ nhàng theo biểu tượng.',
      priorityLabel: 'Nhịp nhẹ',
    },
    metaDescription: 'Trang chi tiết tour Bắc Kinh - Vạn Lý Trường Thành 5N4D của WingsGo.',
    highlights: [
      {
        title: 'Tuyến biểu tượng dễ nhận diện',
        paragraph:
          'Dễ bán nhờ Vạn Lý Trường Thành, mức độ nhận diện cao và thời lượng phù hợp khách retail.',
      },
      {
        title: 'Sản phẩm mở đầu cho Trung Quốc',
        paragraph: 'Phù hợp làm route mở đầu cho trang thị trường Trung Quốc trong phase 1.',
      },
      {
        title: 'Lịch khởi hành rõ',
        paragraph:
          'Ngày đi công khai giúp line này giống một sản phẩm có thể hỏi mua ngay, không chỉ là brochure ảnh.',
      },
    ],
    badgeLabels: [
      'Category: China entry route',
      'Theme: Capital icons',
      'Theme: History',
      'Suitable: First-time China travelers',
      'Suitable: Khách thích biểu tượng nổi tiếng',
      'Type: Group tour',
      'Giá công khai',
      'Air China',
      'Short holiday',
    ],
    factSummaryOverride: {
      routeSummary: 'Bắc Kinh - Vạn Lý Trường Thành',
      mealsSummary: '4 bữa sáng, 3 bữa chính theo lịch trình',
      groupSizeSummary: 'Đoàn Trung Quốc 18-24 khách',
      operatorNote:
        'Điều hành tập trung tối ưu visa đoàn, khách sạn Bắc Kinh và tuyến tham quan biểu tượng để tour dễ bán, dễ vận hành.',
      holdNote: 'Giữ chỗ theo tồn ghế Air China và visa list từng đợt đi.',
    },
    galleryIDs: [beijingGreatWallImage.id, chinaMarketImage.id],
    includesList: [
      'Vé máy bay khứ hồi theo chặng công bố, hành lý ký gửi tiêu chuẩn và xe đón tiễn sân bay',
      '4 đêm khách sạn tiêu chuẩn 3-4 sao khu Bắc Kinh, bố trí 2 khách/phòng',
      'Hướng dẫn viên, xe tham quan và vé vào cửa các điểm chính theo chương trình',
      'Ăn uống theo lịch trình, hỗ trợ thủ tục theo line bán và nước uống cơ bản trên xe',
      'Bảo hiểm du lịch cơ bản và điều phối đoàn theo tuyến ngắn ngày',
    ],
    excludesList: [
      'Chi tiêu cá nhân, tips, phòng đơn và các chương trình tự chọn ngoài lịch trình',
      'Chi phí phát sinh do đổi ngày, đổi tên hoặc nâng hạng dịch vụ theo yêu cầu',
      'Các khoản ngoài phạm vi chương trình đã công bố khi sales xác nhận giữ chỗ',
    ],
    itineraryDays: [
      {
        dayNumber: 1,
        title: 'Việt Nam - Bắc Kinh',
        route: 'TP.HCM / Hà Nội - Bắc Kinh',
        summary:
          'Đoàn bay đến Bắc Kinh, nhập cảnh và về khách sạn nghỉ ngơi. Ngày đầu giữ nhịp nhẹ để ngày hôm sau vào tuyến lịch sử - biểu tượng thuận lợi.',
        meals: 'Tự túc / ăn nhẹ trên máy bay',
        transport: 'Máy bay quốc tế và xe sân bay',
        accommodation: 'Khách sạn 3-4 sao khu Bắc Kinh',
        notes: 'Tùy giờ bay, khách có thể có thêm thời gian tự do quanh khu khách sạn.',
        media: beijingGreatWallImage.id,
      },
      {
        dayNumber: 2,
        title: 'Bắc Kinh city icons',
        route: 'Quảng trường - cung điện - khu trung tâm',
        summary:
          'Ngày tham quan tập trung các biểu tượng nội đô để khách có cảm giác “đi Bắc Kinh là phải thấy” những điểm cốt lõi ngay trong 48 giờ đầu.',
        meals: 'Ăn sáng / trưa / tối',
        transport: 'Xe du lịch theo đoàn',
        accommodation: 'Khách sạn 3-4 sao khu Bắc Kinh',
        notes: 'Line này phù hợp với khách retail muốn nội dung đơn giản, rõ ràng, dễ hiểu.',
        media: beijingGreatWallImage.id,
      },
      {
        dayNumber: 3,
        title: 'Vạn Lý Trường Thành - điểm nhấn chính của tour',
        route: 'Bắc Kinh - Vạn Lý Trường Thành - Bắc Kinh',
        summary:
          'Ngày đắt giá nhất của chương trình với tuyến Vạn Lý Trường Thành. Đây là lý do lớn nhất khiến khách chọn route Bắc Kinh thay vì các line Trung Quốc mềm hơn.',
        meals: 'Ăn sáng / trưa',
        transport: 'Xe du lịch theo tuyến',
        accommodation: 'Khách sạn 3-4 sao khu Bắc Kinh',
        notes:
          'Điều hành sẽ căn tuyến tham quan theo lượng khách và thời tiết để tránh dồn quá đông ở điểm chính.',
        media: beijingGreatWallImage.id,
      },
      {
        dayNumber: 4,
        title: 'Mua sắm - city leisure',
        route: 'Bắc Kinh',
        summary:
          'Ngày nhẹ hơn để khách mua sắm, hoàn tất trải nghiệm city break và chuẩn bị cho ngày về. Đây là khoảng đệm hợp lý cho khách retail ngắn ngày.',
        meals: 'Ăn sáng / trưa',
        transport: 'Xe du lịch theo chương trình',
        accommodation: 'Khách sạn 3-4 sao khu Bắc Kinh',
        notes: 'Khách có thể cân nhắc các điểm tự do bổ sung nếu thời gian cho phép.',
        media: beijingGreatWallImage.id,
      },
      {
        dayNumber: 5,
        title: 'Bắc Kinh - Việt Nam',
        route: 'Bắc Kinh - Việt Nam',
        summary:
          'Trả phòng, ra sân bay và kết thúc hành trình Bắc Kinh - Vạn Lý Trường Thành 5N4D. Đây là route mở đầu tốt cho khách muốn thử Trung Quốc bằng một chương trình rất rõ cấu trúc.',
        meals: 'Ăn sáng',
        transport: 'Xe tiễn sân bay và máy bay quốc tế',
        accommodation: 'Không áp dụng',
        notes: 'Giờ tập trung và hành lý được điều hành nhắc lại trước ngày về.',
        media: beijingGreatWallImage.id,
      },
    ],
    departures: [
      { departure: '12/06/2026', airline: 'Air China', price: '19.900.000' },
      { departure: '10/07/2026', airline: 'Air China', price: '20.500.000' },
      { departure: '07/08/2026', airline: 'Air China', price: '21.200.000' },
    ],
    itinerary:
      'Ngày 1 bay đến Bắc Kinh. Ngày 2 trải nghiệm các biểu tượng nội đô và nhịp lịch sử. Ngày 3 di chuyển đến tuyến Vạn Lý Trường Thành và các điểm nổi bật liên quan. Ngày 4 shopping hoặc điểm phụ trợ theo chương trình. Ngày 5 kết thúc và bay về Việt Nam.',
    includes:
      'Bao gồm vé máy bay, khách sạn, xe đưa đón, các điểm tham quan chính, bữa ăn theo chương trình, HDV và hỗ trợ thủ tục liên quan theo từng đợt bán. Chưa bao gồm chi tiêu cá nhân và các điểm mua sắm tự chọn.',
    faq: [
      {
        question: 'Line này phù hợp với ai?',
        answer:
          'Khách muốn một route Trung Quốc dễ hiểu, ngắn ngày và tập trung biểu tượng nổi bật hơn là lịch trình dài nhiều điểm.',
      },
      {
        question: 'Tại sao market page Trung Quốc vẫn cần tour detail riêng?',
        answer:
          'Vì khách vẫn cần nhìn route, include scope và lịch khởi hành của từng line để quyết định nhanh.',
      },
    ],
  })

  const shanghaiTour = await createTourPage({
    title: 'Thượng Hải - Ô Trấn - Hàng Châu 5N4D',
    slug: 'thuong-hai-o-tran-hang-chau-5n4d',
    market: 'china',
    durationDays: 5,
    durationNights: 4,
    parentPageID: tourHub.id,
    relatedPageIDs: [chinaPage.id, schedulePage.id, contactPage.id],
    imageID: chinaJiangnanImage.id,
    summary:
      'Route Jiangnan mềm hơn cho thị trường Trung Quốc retail, phù hợp khách thích cân bằng giữa city icon và trải nghiệm cảnh quan.',
    marketCard: {
      badges: ['Line bán chạy'],
      sellingLine: 'Cân bằng city icon và cảnh quan Jiangnan, được khách chọn nhiều.',
      priorityLabel: 'Bán chạy',
    },
    metaDescription: 'Trang chi tiết tour Thượng Hải - Ô Trấn - Hàng Châu 5N4D của WingsGo.',
    highlights: [
      {
        title: 'Route cân bằng',
        paragraph: 'Cân bằng giữa đô thị nổi tiếng và trải nghiệm cảnh quan mềm hơn.',
      },
      {
        title: 'Thêm lựa chọn để so sánh',
        paragraph:
          'Bổ sung lựa chọn thứ hai cho trang thị trường Trung Quốc để khách không chỉ thấy một route.',
      },
      {
        title: 'Sẵn sàng mở campaign',
        paragraph: 'Có thể gắn thêm hình ảnh chiến dịch hoặc nhóm khởi hành đặc biệt về sau.',
      },
    ],
    badgeLabels: [
      'Category: China scenic route',
      'Theme: Jiangnan atmosphere',
      'Theme: City + ancient town',
      'Suitable: Couples',
      'Suitable: Khách thích cảnh quan mềm',
      'Type: Group tour',
      'Giá công khai',
      'Air China',
      'Campaign-ready',
    ],
    factSummaryOverride: {
      routeSummary: 'Thượng Hải - Ô Trấn - Hàng Châu',
      mealsSummary: '4 bữa sáng, 3 bữa chính theo lịch trình',
      groupSizeSummary: 'Đoàn Trung Quốc 18-24 khách',
      operatorNote:
        'Điều hành cần chốt tốt nhịp di chuyển giữa city và cổ trấn để tour giữ được chất mềm, đẹp như đúng định vị của route.',
      holdNote: 'Giữ chỗ theo ghế Air China và allotment khách sạn trên tuyến Giang Nam.',
    },
    galleryIDs: [chinaJiangnanImage.id, chinaMarketImage.id],
    includesList: [
      'Vé máy bay khứ hồi, hành lý ký gửi tiêu chuẩn và xe đón tiễn sân bay',
      '4 đêm khách sạn 3-4 sao trên tuyến Thượng Hải - Hàng Châu hoặc tương đương',
      'Xe tham quan, hướng dẫn viên, vé tham quan các điểm chính theo lịch trình',
      'Bữa ăn theo chương trình, hỗ trợ thủ tục line bán và nước uống cơ bản trên xe',
      'Bảo hiểm du lịch cơ bản và điều phối đoàn theo tuyến ngắn ngày',
    ],
    excludesList: [
      'Chi tiêu cá nhân, tips, phòng đơn, giặt ủi và các bữa ăn tự do ngoài lịch trình',
      'Phí phát sinh do đổi ngày bay, đổi tên hoặc mua thêm dịch vụ cá nhân',
      'Các hoạt động riêng ngoài phạm vi chương trình sau khi sales đã chốt tour',
    ],
    itineraryDays: [
      {
        dayNumber: 1,
        title: 'Việt Nam - Thượng Hải',
        route: 'TP.HCM / Hà Nội - Thượng Hải',
        summary:
          'Đoàn bay đến Thượng Hải, nhập cảnh và về khách sạn nghỉ ngơi. Ngày đầu làm quen nhịp chương trình và chuẩn bị cho tuyến city - scenic route những ngày sau.',
        meals: 'Tự túc / ăn nhẹ trên máy bay',
        transport: 'Máy bay quốc tế và xe sân bay',
        accommodation: 'Khách sạn 3-4 sao khu Thượng Hải',
        notes: 'Nếu giờ đến thuận lợi, khách có thể tự do khám phá khu vực quanh khách sạn.',
        media: chinaJiangnanImage.id,
      },
      {
        dayNumber: 2,
        title: 'Thượng Hải city icons',
        route: 'Thượng Hải',
        summary:
          'Ngày tập trung các điểm nhìn và city icon của Thượng Hải. Đây là phần giúp khách nhận diện chương trình không chỉ có cổ trấn mà vẫn có nhịp đô thị rõ ràng.',
        meals: 'Ăn sáng / trưa / tối',
        transport: 'Xe du lịch theo đoàn',
        accommodation: 'Khách sạn 3-4 sao khu Thượng Hải',
        notes:
          'Khách retail thường thích ngày này vì có đủ city feel, ảnh đẹp và thời gian shopping vừa phải.',
        media: chinaJiangnanImage.id,
      },
      {
        dayNumber: 3,
        title: 'Ô Trấn - chất mềm của tuyến Giang Nam',
        route: 'Thượng Hải - Ô Trấn',
        summary:
          'Rời nhịp đô thị để vào Ô Trấn, điểm giúp route này khác hẳn line Bắc Kinh. Cổ trấn, mặt nước và không khí chậm hơn tạo nên cảm giác thư giãn dễ chịu.',
        meals: 'Ăn sáng / trưa',
        transport: 'Xe du lịch xuyên tuyến',
        accommodation: 'Khách sạn 3-4 sao khu Ô Trấn / Hàng Châu',
        notes:
          'Đây là ngày rất mạnh về hình ảnh, phù hợp khách cặp đôi hoặc nhóm bạn thích trải nghiệm mềm hơn.',
        media: chinaJiangnanImage.id,
      },
      {
        dayNumber: 4,
        title: 'Hàng Châu - cảnh quan và city leisure',
        route: 'Ô Trấn - Hàng Châu',
        summary:
          'Tiếp tục tuyến với Hàng Châu, nơi giữ sự cân bằng giữa cảnh quan và cảm giác thành phố. Chương trình đủ dày nhưng không quá nặng vận động.',
        meals: 'Ăn sáng / trưa',
        transport: 'Xe du lịch theo tuyến',
        accommodation: 'Khách sạn 3-4 sao khu Hàng Châu / Thượng Hải',
        notes:
          'Điều hành thường tối ưu giờ di chuyển để khách vẫn có thời gian thư thả trong ngày.',
        media: chinaJiangnanImage.id,
      },
      {
        dayNumber: 5,
        title: 'Tuyến về - Việt Nam',
        route: 'Hàng Châu / Thượng Hải - Việt Nam',
        summary:
          'Trả phòng, di chuyển ra sân bay và kết thúc hành trình Giang Nam 5N4D. Đây là lựa chọn tốt cho khách muốn một route Trung Quốc có chất cảnh quan rõ hơn.',
        meals: 'Ăn sáng',
        transport: 'Xe tiễn sân bay và máy bay quốc tế',
        accommodation: 'Không áp dụng',
        notes: 'Thời gian sân bay và chặng ra sân bay phụ thuộc lịch bay cuối cùng của đoàn.',
        media: chinaJiangnanImage.id,
      },
    ],
    departures: [
      { departure: '20/06/2026', airline: 'Air China', price: '21.900.000' },
      { departure: '18/07/2026', airline: 'Air China', price: '22.500.000' },
      { departure: '15/08/2026', airline: 'Air China', price: '22.900.000' },
    ],
    itinerary:
      'Ngày 1 bay đến Thượng Hải và city orientation. Ngày 2 vào Ô Trấn, nhấn mạnh chất cảnh quan và không khí cổ trấn. Ngày 3 nối tuyến Hàng Châu với các điểm nổi bật chính. Ngày 4 quay lại nhịp mua sắm và city icon. Ngày 5 kết thúc hành trình và bay về.',
    includes:
      'Bao gồm vé máy bay, khách sạn, xe, HDV, ăn theo chương trình và vé vào cửa trọng điểm. Không bao gồm chi tiêu cá nhân, tips và dịch vụ ngoài chương trình.',
    faq: [
      {
        question: 'Khi nào nên chọn route này thay vì Bắc Kinh?',
        answer:
          'Khi khách thích trải nghiệm mềm hơn, ít nặng biểu tượng lịch sử hơn và muốn route nhìn đẹp hơn cho nhóm bạn hoặc cặp đôi.',
      },
      {
        question: 'Có cần hiển thị giá công khai cho route này không?',
        answer: 'Có. Đây là nguyên tắc chung của WingsGo phase 1 theo đúng mong muốn khách hàng.',
      },
    ],
  })

  await payload.update({
    collection: 'tour-products' as never,
    id: seoulEverlandTour.product.id,
    req,
    context: seedContext,
    data: seedData({
      relatedTours: [jejuTour.product.id, shizuokaTour.product.id],
    }),
  })
  await payload.update({
    collection: 'tour-products' as never,
    id: jejuTour.product.id,
    req,
    context: seedContext,
    data: seedData({
      relatedTours: [seoulEverlandTour.product.id, shizuokaTour.product.id],
    }),
  })
  await payload.update({
    collection: 'tour-products' as never,
    id: shizuokaTour.product.id,
    req,
    context: seedContext,
    data: seedData({
      relatedTours: [osakaTour.product.id, seoulEverlandTour.product.id],
    }),
  })
  await payload.update({
    collection: 'tour-products' as never,
    id: osakaTour.product.id,
    req,
    context: seedContext,
    data: seedData({
      relatedTours: [shizuokaTour.product.id, shanghaiTour.product.id],
    }),
  })
  await payload.update({
    collection: 'tour-products' as never,
    id: beijingTour.product.id,
    req,
    context: seedContext,
    data: seedData({
      relatedTours: [shanghaiTour.product.id, seoulEverlandTour.product.id],
    }),
  })
  await payload.update({
    collection: 'tour-products' as never,
    id: shanghaiTour.product.id,
    req,
    context: seedContext,
    data: seedData({
      relatedTours: [beijingTour.product.id, shizuokaTour.product.id],
    }),
  })

  const summerKoreaCampaignPage = await createPage(payload, req, site.id, {
    title: 'Hè 2026 Hàn Quốc',
    slug: 'he-2026-han-quoc',
    parentPage: campaignHub.id,
    relatedPages: [koreaPage.id, seoulEverlandTour.page.id, jejuTour.page.id, contactPage.id],
    hero: {
      type: 'mediumImpact',
      media: jejuPoster.id,
      links: [
        linkItem('Xem tour Hàn Quốc', '/thi-truong/han-quoc', 'default'),
        linkItem('Giữ chỗ ngay', '/lien-he', 'outline'),
      ],
      richText: richText(
        'Hè 2026 Hàn Quốc',
        'Campaign page gom các line bán nhanh, visual poster, ngày khởi hành và CTA giữ chỗ cho nhóm khách outbound retail.',
        'h1',
      ),
    },
    layout: [
      contentBlock([
        {
          size: 'full',
          title: 'Các line Hàn Quốc bán nhanh trong mùa hè',
          paragraph:
            'Mỗi campaign gom những line đang được khách chọn nhiều nhất theo mùa, kèm giá tham khảo và lịch khởi hành rõ ràng để khách so sánh và giữ chỗ nhanh.',
        },
      ]),
      wingsGoTrustStrip(),
      ctaBlock(
        'Cần xác nhận chỗ cho đợt khởi hành gần nhất?',
        'Gửi yêu cầu để WingsGo kiểm tra số chỗ, giá mới nhất hoặc phương án riêng cho nhóm của bạn.',
        [linkItem('Gửi yêu cầu', '/lien-he')],
      ),
    ],
    meta: {
      title: 'Hè 2026 Hàn Quốc',
      description:
        'Tour Hàn Quốc hè 2026 của WingsGo với line Jeju, Seoul, Nami, Camellia Hill, giá tham khảo và CTA giữ chỗ.',
      image: jejuPoster.id,
    },
  })

  const summerJapanCampaignPage = await createPage(payload, req, site.id, {
    title: 'Hè 2026 Nhật Bản',
    slug: 'he-2026-nhat-ban',
    parentPage: campaignHub.id,
    relatedPages: [japanPage.id, shizuokaTour.page.id, osakaTour.page.id, contactPage.id],
    hero: {
      type: 'mediumImpact',
      media: japanPoster.id,
      links: [
        linkItem('Xem tour Nhật Bản', '/thi-truong/nhat-ban', 'default'),
        linkItem('Liên hệ tư vấn', '/lien-he', 'outline'),
      ],
      richText: richText(
        'Hè 2026 Nhật Bản',
        'Đợt hè cho các line Nhật Bản có giá rõ, lịch khởi hành dễ so sánh và lối mở nhanh sang trang tour chi tiết.',
        'h1',
      ),
    },
    layout: [
      contentBlock([
        {
          size: 'full',
          title: 'So sánh nhanh các line Nhật Bản theo mùa',
          paragraph:
            'Mỗi route hiển thị giá tham khảo, lịch khởi hành và lối mở nhanh sang trang tour chi tiết để khách chọn đúng line theo ngân sách và thời lượng.',
        },
      ]),
      wingsGoTrustStrip(),
    ],
    meta: {
      title: 'Hè 2026 Nhật Bản',
      description:
        'Tour Nhật Bản hè 2026 của WingsGo với line Shizuoka, Phú Sĩ, Tokyo, Osaka, Kyoto, giá và lịch khởi hành.',
      image: japanPoster.id,
    },
  })

  const chinaCampaignPage = await createPage(payload, req, site.id, {
    title: 'Trung Quốc giá rõ',
    slug: 'trung-quoc-gia-ro',
    parentPage: campaignHub.id,
    relatedPages: [chinaPage.id, contactPage.id],
    hero: {
      type: 'mediumImpact',
      media: chinaMarketImage.id,
      links: [
        linkItem('Xem thị trường Trung Quốc', '/thi-truong/trung-quoc', 'default'),
        linkItem('Nhận tư vấn', '/lien-he', 'outline'),
      ],
      richText: richText(
        'Tour Trung Quốc giá rõ: chọn nhanh route ngắn ngày',
        'Các tour Trung Quốc gom route dễ chọn, giá tham khảo và CTA tư vấn để khách so sánh trước khi giữ chỗ.',
        'h1',
      ),
    },
    layout: [
      contentBlock([
        {
          size: 'full',
          title: 'Route Trung Quốc dễ chọn theo giá và thời lượng',
          paragraph:
            'Các route nổi bật được gom kèm giá tham khảo và lịch khởi hành để khách so sánh nhanh trước khi nhận tư vấn giữ chỗ.',
        },
      ]),
      wingsGoTrustStrip(),
    ],
    meta: {
      title: 'Tour Trung Quốc giá rõ',
      description:
        'Tour Trung Quốc của WingsGo với route Bắc Kinh, Vạn Lý Trường Thành, Thượng Hải, Ô Trấn, Hàng Châu và giá rõ.',
      image: chinaMarketImage.id,
    },
  })

  await createTourCampaign(payload, req, site.id, {
    title: 'Hè 2026 Hàn Quốc',
    slug: 'he-2026-han-quoc',
    campaignCode: 'WG-KR-SUMMER-2026',
    seasonKey: 'summer-2026',
    wrapperPage: summerKoreaCampaignPage.id,
    summary:
      'Campaign gom các line Hàn Quốc đang mở bán mạnh nhất, ưu tiên visual rõ, giá công khai và lối mở nhanh sang giữ chỗ.',
    heroMedia: jejuPoster.id,
    linkedTours: [seoulEverlandTour.product.id, jejuTour.product.id],
    featuredDepartures: [
      ...jejuTour.departures.slice(0, 1).map((item) => item.id),
      ...seoulEverlandTour.departures.slice(0, 1).map((item) => item.id),
    ],
    meta: {
      title: 'Hè 2026 Hàn Quốc',
      description:
        'Tour Hàn Quốc hè 2026 của WingsGo với các line nổi bật, giá công khai và lịch khởi hành rõ ràng.',
      image: jejuPoster.id,
      breadcrumbLabel: 'Hè 2026 Hàn Quốc',
    },
  })

  await createTourCampaign(payload, req, site.id, {
    title: 'Hè 2026 Nhật Bản',
    slug: 'he-2026-nhat-ban',
    campaignCode: 'WG-JP-SUMMER-2026',
    seasonKey: 'summer-2026',
    wrapperPage: summerJapanCampaignPage.id,
    summary:
      'Campaign gom các route Nhật Bản ngắn và dài để khách so sánh nhanh theo ngân sách, thời lượng và đợt đi.',
    heroMedia: japanPoster.id,
    linkedTours: [shizuokaTour.product.id, osakaTour.product.id],
    featuredDepartures: [
      ...shizuokaTour.departures.slice(0, 1).map((item) => item.id),
      ...osakaTour.departures.slice(0, 1).map((item) => item.id),
    ],
    meta: {
      title: 'Hè 2026 Nhật Bản',
      description:
        'Tour Nhật Bản hè 2026 của WingsGo với lựa chọn tuyến ngắn, tuyến dài, giá công khai và lịch khởi hành rõ ràng.',
      image: japanPoster.id,
      breadcrumbLabel: 'Hè 2026 Nhật Bản',
    },
  })

  await createTourCampaign(payload, req, site.id, {
    title: 'Trung Quốc giá rõ',
    slug: 'trung-quoc-gia-ro',
    campaignCode: 'WG-CN-CLEAR-PRICE',
    seasonKey: 'always-on',
    wrapperPage: chinaCampaignPage.id,
    summary:
      'Campaign cho các route Trung Quốc retail, nhấn vào giá công khai, route ngắn ngày và CTA tư vấn nhanh.',
    heroMedia: chinaMarketImage.id,
    linkedTours: [beijingTour.product.id, shanghaiTour.product.id],
    featuredDepartures: [
      ...beijingTour.departures.slice(0, 1).map((item) => item.id),
      ...shanghaiTour.departures.slice(0, 1).map((item) => item.id),
    ],
    meta: {
      title: 'Trung Quốc giá rõ',
      description:
        'Tour Trung Quốc của WingsGo với các route dễ chọn, giá công khai và lịch khởi hành rõ ràng.',
      image: chinaMarketImage.id,
      breadcrumbLabel: 'Trung Quốc giá rõ',
    },
  })

  await createPost(payload, req, site.id, {
    title: 'Cách đọc lịch khởi hành và giá trên WingsGo',
    slug: 'cach-doc-lich-khoi-hanh-va-gia',
    heroImage: scheduleGuideImage.id,
    content: richText(
      'Đọc lịch khởi hành như một buyer',
      'Bài viết giải thích cách xem line tour, ngày đi, hãng bay và mốc giá trước khi mở trang tour chi tiết.',
      'h2',
    ),
    categories: [guideCategory.id],
    meta: {
      title: 'Cách đọc lịch khởi hành và giá trên WingsGo',
      description:
        'Hướng dẫn cách đọc lịch khởi hành, hãng bay, giá từ và ghi chú tour trên WingsGo trước khi gửi yêu cầu tư vấn.',
      image: scheduleGuideImage.id,
    },
  })

  await createPost(payload, req, site.id, {
    title: 'Campaign mùa hè nên dẫn khách vào đâu sau poster',
    slug: 'campaign-mua-he-dan-khach-di-dau',
    heroImage: heroImage.id,
    content: richText(
      'Poster chỉ là điểm mở',
      'Bài viết giải thích tại sao campaign pages cần mở ra tour detail, lịch khởi hành và contact flow thay vì dừng ở một ảnh creative.',
      'h2',
    ),
    categories: [seasonCategory.id],
    meta: {
      title: 'Campaign mùa hè nên dẫn khách vào đâu sau poster',
      description: 'Giải thích logic campaign page của WingsGo từ poster sang route detail và CTA.',
      image: heroImage.id,
    },
  })

  const homePage = await createPage(payload, req, site.id, {
    title: 'WingsGo',
    slug: 'home',
    hero: {
      type: 'highImpact',
      variant: 'retail-departures',
      media: heroImage.id,
      links: [
        linkItem('Xem lịch khởi hành', '/lich-khoi-hanh', 'default'),
        linkItem('Xem thị trường', '/thi-truong', 'outline'),
      ],
      richText: richText(
        'Chùm tour outbound giá rõ, lịch rõ',
        'Dễ so sánh tour Hàn, Nhật, Trung theo lịch khởi hành, giá và điểm nổi bật. Chọn line phù hợp, gửi yêu cầu giữ chỗ nhanh.',
        'h1',
      ),
    },
    layout: [
      infoStripBlock(
        'WingsGo giúp khách chọn tour theo tín hiệu rõ ràng',
        'Trang chủ đưa thị trường, lịch khởi hành, giá tham khảo và CTA tư vấn lên sớm để khách dễ so sánh.',
        [
          {
            label: 'Hành động chính',
            value: 'Xem giá',
            description: 'Khách thấy mức giá trước khi quyết định gửi yêu cầu tư vấn.',
          },
          {
            label: 'Dữ liệu mạnh nhất',
            value: 'Hàn | Nhật | Trung',
            description: 'Ba market có nguồn sheet và poster mạnh nhất ở phase 1.',
          },
          {
            label: 'Nguồn vận hành',
            value: 'Lịch 2026',
            description: 'Lịch khởi hành và line product bám nguồn vận hành thực tế của đội sales.',
          },
          {
            label: 'Trải nghiệm',
            value: 'Duyệt và so sánh',
            description:
              'Khách chọn thị trường, xem giá, mở tour chi tiết rồi gửi yêu cầu giữ chỗ.',
          },
        ],
        'Tour outbound retail',
      ),
      featureGridBlock(
        'Chọn thị trường muốn đi',
        'Khách có thể bắt đầu từ Hàn Quốc, Nhật Bản hoặc Trung Quốc thay vì phải đọc một danh sách tour quá dài.',
        [
          {
            title: 'Hàn Quốc',
            description: 'Seoul, Nami, Everland, Jeju, Camellia Hill và các line campaign mùa hè.',
            meta: 'Tour Hàn Quốc',
            url: '/thi-truong/han-quoc',
          },
          {
            title: 'Nhật Bản',
            description:
              'Shizuoka, Phú Sĩ, Tokyo, Osaka, Kyoto, Nagoya và các line theo mùa dễ so sánh.',
            meta: 'Tour Nhật Bản',
            url: '/thi-truong/nhat-ban',
          },
          {
            title: 'Trung Quốc',
            description:
              'Bắc Kinh, Vạn Lý Trường Thành, Thượng Hải, Ô Trấn, Hàng Châu với giá tham khảo rõ.',
            meta: 'Tour Trung Quốc',
            url: '/thi-truong/trung-quoc',
          },
        ],
        'highlight',
        'Thị trường',
      ),
      pricingTableBlock(
        'Lịch khởi hành nổi bật',
        'Các line được đưa lên sớm để khách xem nhanh ngày đi, hãng bay và giá từ.',
        [
          {
            title: 'Seoul - Jeju - Nami - Camellia Hill 6N5D',
            subtitle: 'Campaign hè Hàn Quốc',
            departure: '11/07, 28/08',
            airline: 'Jeju Air',
            price: '23.900.000',
            note: 'Xác nhận lại khi tư vấn',
            url: '/tour/seoul-jeju-nami-camellia-hill-6n5d',
          },
          {
            title: 'Shizuoka - Núi Phú Sĩ - Tokyo 5N4D',
            subtitle: 'Line Nhật ngắn ngày',
            departure: '20/05, 17/06, 08/07',
            airline: 'Vietjet',
            price: '22.500.000',
            note: 'Xác nhận lại khi tư vấn',
            url: '/tour/shizuoka-nui-phu-si-tokyo-5n4d',
          },
          {
            title: 'Bắc Kinh - Vạn Lý Trường Thành 5N4D',
            subtitle: 'Line Trung Quốc ngắn ngày',
            departure: '12/06, 10/07, 07/08',
            airline: 'Air China',
            price: '19.900.000',
            note: 'Xác nhận lại khi tư vấn',
            url: '/tour/bac-kinh-van-ly-truong-thanh-5n4d',
          },
        ],
        'Giá tham khảo',
      ),
      featureGridBlock(
        'Tour theo mùa',
        'Các đợt tour được tổ chức thành trang bán hàng có lịch, giá, route và lối gửi yêu cầu rõ ràng.',
        [
          {
            title: 'Hè 2026 Hàn Quốc',
            description:
              'Đợt Jeju và Seoul có ngày khởi hành, giá tham khảo và visual bán hàng rõ.',
            meta: 'Tour Hàn Quốc',
            url: '/campaign/he-2026-han-quoc',
          },
          {
            title: 'Hè 2026 Nhật Bản',
            description: 'Tour Nhật Bản giúp so sánh line ngắn ngày và line nhiều điểm.',
            meta: 'Tour Nhật Bản',
            url: '/campaign/he-2026-nhat-ban',
          },
          {
            title: 'Trung Quốc giá rõ',
            description: 'Tour Trung Quốc tập trung route rõ, giá rõ và CTA tư vấn nhanh.',
            meta: 'Tour Trung Quốc',
            url: '/campaign/trung-quoc-gia-ro',
          },
        ],
        'default',
        'Tour theo mùa',
      ),
      featureGridBlock(
        'Tour nổi bật',
        'Trang tour chi tiết là bước nối giữa campaign, lịch khởi hành và form giữ chỗ.',
        [
          {
            title: 'Seoul - Nami - Everland 5N4D',
            description:
              'Line Hàn Quốc dễ chọn cho khách lần đầu đi Hàn, có lịch và giá tham khảo.',
            meta: 'Korea | 5N4D',
            url: '/tour/seoul-nami-everland-5n4d',
          },
          {
            title: 'Shizuoka - Núi Phú Sĩ - Tokyo 5N4D',
            description:
              'Line Nhật ngắn ngày phù hợp khách muốn so sánh nhanh theo lịch và ngân sách.',
            meta: 'Japan | 5N4D',
            url: '/tour/shizuoka-nui-phu-si-tokyo-5n4d',
          },
          {
            title: 'Thượng Hải - Ô Trấn - Hàng Châu 5N4D',
            description:
              'Line Trung Quốc có nhịp cảnh quan mềm hơn và mức giá tham khảo dễ hỏi mua.',
            meta: 'China | 5N4D',
            url: '/tour/thuong-hai-o-tran-hang-chau-5n4d',
          },
        ],
        'minimal',
        'Tour',
      ),
      wingsGoTrustStrip(),
      ctaBlock(
        'Cần kiểm tra chỗ hoặc báo giá riêng?',
        'Gửi yêu cầu để WingsGo xác nhận số chỗ còn lại, giá mới nhất hoặc phương án riêng cho nhóm của bạn.',
        [linkItem('Gửi yêu cầu tư vấn', '/lien-he')],
      ),
    ],
    relatedPages: [marketHub.id, campaignHub.id, schedulePage.id, aboutPage.id, contactPage.id],
    meta: {
      title: 'WingsGo',
      description: siteSeed.seoDescription,
      image: heroImage.id,
    },
  })

  await createSiteSettings(payload, req, site, siteSeed, heroImage.id, {
    footerNote:
      'WingsGo giúp khách so sánh tour outbound theo thị trường, tour theo mùa, lịch khởi hành và trang chi tiết có giá tham khảo.',
    headerNavItems: [
      linkItem('Trang chủ', '/'),
      linkItem('Thị trường', '/thi-truong'),
      linkItem('Lịch khởi hành', '/lich-khoi-hanh'),
      linkItem('Tour theo mùa', '/campaign'),
      linkItem('Tour', '/tour'),
      linkItem('Liên hệ', '/lien-he'),
    ],
    footerNavItems: [
      linkItem('Thị trường', '/thi-truong'),
      linkItem('Lịch khởi hành', '/lich-khoi-hanh'),
      linkItem('Giới thiệu', '/gioi-thieu'),
      linkItem('Liên hệ', '/lien-he'),
    ],
    supportEmail: 'sales@wingsgo.vn',
    supportPhone: '+84 903 000 111',
    tagline: siteSeed.summary,
  })

  await mirrorSiteContentToEnglish(payload, req, site.id)

  await updatePageLocale(payload, req, homePage.id, 'en', {
    title: 'WingsGo',
    hero: {
      type: 'highImpact',
      links: [
        linkItem('Explore markets', '/thi-truong', 'default'),
        linkItem('Check departures', '/lich-khoi-hanh', 'outline'),
      ],
      richText: richText(
        'Outbound programs with visible pricing, departures, and next steps',
        'WingsGo is built for visitors who want to compare Korea, Japan, and China routes quickly through market hubs, departure visibility, and fast inquiry paths.',
        'h1',
      ),
    },
    layout: [
      infoStripBlock(
        'Why WingsGo feels direct',
        'The homepage leads with market choice, departure visibility, sample pricing, and a clear consultation path instead of a generic inspirational intro.',
        [
          {
            label: 'Primary comparison',
            value: 'Market + departure',
            description:
              'Visitors can compare Korea, Japan, and China routes before they open the full detail page.',
          },
          {
            label: 'Sales model',
            value: 'Price-visible retail',
            description:
              'Reference prices appear early so the visitor can judge budget fit before contacting the team.',
          },
          {
            label: 'Best next step',
            value: 'Short inquiry or hold request',
            description:
              'The contact path is designed to confirm seats, dates, and final pricing quickly.',
          },
        ],
        'Retail entry',
      ),
      pricingTableBlock(
        'Quick price and departure scan',
        'This homepage table is intentionally compact: it lets the visitor scan current routes before moving deeper into tour detail or a market page.',
        [
          {
            title: 'Seoul - Nami - Everland 5N4D',
            subtitle: 'Korea starter route',
            departure: '08/07, 22/07, 05/08',
            airline: 'Vietjet / Jeju Air',
            price: 'From 18,900,000 VND',
            note: 'Reference price',
            url: '/tour/seoul-nami-everland-5n4d',
          },
          {
            title: 'Shizuoka - Mount Fuji - Tokyo 5N4D',
            subtitle: 'Japan short route',
            departure: '17/06, 08/07, 05/08',
            airline: 'Vietjet',
            price: 'From 22,500,000 VND',
            note: 'Reference price',
            url: '/tour/shizuoka-nui-phu-si-tokyo-5n4d',
          },
          {
            title: 'Beijing - Great Wall 5N4D',
            subtitle: 'China city break',
            departure: '12/06, 10/07, 07/08',
            airline: 'Air China',
            price: 'From 19,900,000 VND',
            note: 'Reference price',
            url: '/tour/bac-kinh-van-ly-truong-thanh-5n4d',
          },
        ],
        'Fast scan',
      ),
      featureGridBlock(
        'Featured outbound lines',
        'These routes represent the current selling structure: short-retail comparison, seasonal campaigns, and easy movement into detail pages.',
        [
          {
            title: 'Seoul - Nami - Everland 5N4D',
            description:
              'A first-time Korea route with straightforward pricing and an easy departure pattern.',
            meta: 'Korea | 5D4N',
            url: '/tour/seoul-nami-everland-5n4d',
          },
          {
            title: 'Shizuoka - Mount Fuji - Tokyo 5N4D',
            description:
              'A short Japan route for visitors comparing season, budget, and route pace.',
            meta: 'Japan | 5D4N',
            url: '/tour/shizuoka-nui-phu-si-tokyo-5n4d',
          },
          {
            title: 'Shanghai - Wuzhen - Hangzhou 5N4D',
            description: 'A softer China route balancing city icons and lighter scenic stops.',
            meta: 'China | 5D4N',
            url: '/tour/thuong-hai-o-tran-hang-chau-5n4d',
          },
        ],
        'minimal',
        'Featured tours',
      ),
      wingsGoTrustStrip(),
      ctaBlock(
        'Need a seat check or a custom quote?',
        'Send a short request and the WingsGo team will confirm availability, current pricing, or a more suitable option for your group.',
        [linkItem('Contact sales', '/lien-he')],
      ),
    ],
    relatedPages: [marketHub.id, campaignHub.id, schedulePage.id, aboutPage.id, contactPage.id],
    meta: {
      title: 'WingsGo',
      description:
        'Outbound routes for Korea, Japan, and China with visible pricing, departure schedules, and quick entry into detail pages or sales contact.',
      image: heroImage.id,
      breadcrumbLabel: 'Home',
    },
  })

  await updatePageLocale(payload, req, aboutPage.id, 'en', {
    title: 'About WingsGo',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'WingsGo is organized around fast outbound comparison',
        'The site focuses on Korea, Japan, and China programs where visitors want visible prices, departure timing, airline context, and quick movement into tour detail.',
        'h1',
      ),
    },
    layout: [
      infoStripBlock(
        'How WingsGo is positioned',
        'This is not a broad editorial site. It is a sales-oriented retail surface built from actual market sheets, campaign posters, and departure data.',
        [
          {
            label: 'Core markets',
            value: 'Korea | Japan | China',
            description:
              'These are the strongest current lines in the operational source material.',
          },
          {
            label: 'Decision model',
            value: 'Price + departure first',
            description:
              'Visitors should be able to judge route fit before they spend time in a long consultation flow.',
          },
          {
            label: 'Content source',
            value: 'Sheets + posters + sales docs',
            description:
              'The site structure is derived from current operating material instead of generic tourism copy.',
          },
          {
            label: 'Expansion path',
            value: 'Campaign-ready',
            description:
              'New markets, new poster drops, and new departures can fit the same retail model quickly.',
          },
        ],
        'WingsGo position',
      ),
      contentBlock([
        {
          size: 'half',
          title: 'Made for quick outbound decisions',
          paragraph:
            'Visitors should see route logic, departure timing, airline context, and reference pricing early instead of hunting across separate brochures or spreadsheets.',
        },
        {
          size: 'half',
          title: 'Close to current operations',
          paragraph:
            'Campaign posters, departure tables, and selling notes are translated into market pages, seasonal hubs, and structured tour detail pages that are easier to maintain.',
        },
      ]),
    ],
    meta: {
      title: 'About WingsGo',
      description:
        'How WingsGo turns current Korea, Japan, and China sales material into a retail-ready outbound site with visible prices and departure logic.',
      image: heroImage.id,
      breadcrumbLabel: 'About',
    },
  })

  await updatePageLocale(payload, req, tourHub.id, 'en', {
    title: 'WingsGo Tours',
    hero: {
      type: 'lowImpact',
      links: [
        linkItem('View featured tours', '/tour/seoul-nami-everland-5n4d', 'default'),
        linkItem('Contact sales', '/lien-he', 'outline'),
      ],
      richText: richText(
        'Featured outbound routes with prices, pace, and selling logic made explicit',
        'Each tour page is built to help a visitor compare route shape, departure timing, reference price, and the next action without digging through raw sales material.',
        'h1',
      ),
    },
    layout: [
      featureGridBlock(
        'Current outbound highlights',
        'These tours were selected because they represent the strongest current Korea, Japan, and China retail lines in the source material.',
        [
          {
            title: 'Seoul - Nami - Everland 5N4D',
            description:
              'A Korea starter route with a simple selling story, visible price, and repeatable departures.',
            imageID: seoulNamiEverlandImage.id,
            meta: 'Korea | from 18,900,000 VND',
            url: '/tour/seoul-nami-everland-5n4d',
          },
          {
            title: 'Seoul - Jeju - Nami - Camellia Hill 6N5D',
            description:
              'A seasonal Korea campaign route with Jeju emphasis and a clearer summer selling angle.',
            imageID: seoulJejuCamelliaImage.id,
            meta: 'Korea | from 23,900,000 VND',
            url: '/tour/seoul-jeju-nami-camellia-hill-6n5d',
          },
          {
            title: 'Shizuoka - Mount Fuji - Tokyo 5N4D',
            description:
              'A short Japan route for buyers who want an easy budget-and-season comparison.',
            imageID: shizuokaFujiTokyoImage.id,
            meta: 'Japan | from 22,500,000 VND',
            url: '/tour/shizuoka-nui-phu-si-tokyo-5n4d',
          },
          {
            title: 'Osaka - Kobe - Kyoto - Nagoya - Fuji - Tokyo 6N5D',
            description:
              'A longer Japan route for visitors comparing city count, pace, and fuller itinerary coverage.',
            imageID: osakaKyotoFujiTokyoImage.id,
            meta: 'Japan | from 32,900,000 VND',
            url: '/tour/osaka-kobe-kyoto-nagoya-fuji-tokyo-6n5d',
          },
          {
            title: 'Beijing - Great Wall 5N4D',
            description:
              'A China entry route with short duration, iconic stops, and straightforward selling points.',
            imageID: beijingGreatWallImage.id,
            meta: 'China | 5D4N',
            url: '/tour/bac-kinh-van-ly-truong-thanh-5n4d',
          },
          {
            title: 'Shanghai - Wuzhen - Hangzhou 5N4D',
            description: 'A China route that blends city landmarks with softer scenic pacing.',
            imageID: chinaJiangnanImage.id,
            meta: 'China | 5D4N',
            url: '/tour/thuong-hai-o-tran-hang-chau-5n4d',
          },
        ],
      ),
      wingsGoTrustStrip(),
      ctaBlock(
        'Need help choosing the right outbound line?',
        'Send a request and the team will help compare departures, pricing windows, and route fit before you commit.',
        [linkItem('Ask the team', '/lien-he')],
      ),
    ],
    meta: {
      title: 'WingsGo Tours',
      description:
        'Featured Korea, Japan, and China outbound routes with reference pricing, route logic, and fast movement into sales contact.',
      image: heroImage.id,
      breadcrumbLabel: 'Tours',
    },
  })
}

async function seedWingsSide(payload: Payload, req: PayloadRequest, siteSeed: SiteSeed) {
  const site = await upsertSite(payload, req, siteSeed)
  await clearSiteContent(payload, req, site.id)

  const heroImage = await createMedia(
    payload,
    req,
    site.id,
    'WingsSide Vietnam hero',
    'Private Vietnam journey through heritage towns and coastal landscapes',
    'Vietnam journey scene used to introduce destination-led, tailor-made travel planning.',
    path.join(seedAssetsDir, 'wingsside-vietnam-journey-hero.png'),
  )
  const secondaryImage = await createMedia(
    payload,
    req,
    site.id,
    'Vietnam destination image',
    'Vietnam destination route from northern bays to central heritage',
    'Scenic destination image for Vietnam route discovery and regional planning.',
    path.join(seedAssetsDir, 'wingsside-destination-hub.png'),
  )
  const travelStylesImage = await createMedia(
    payload,
    req,
    site.id,
    'WingsSide travel styles cover',
    'Private Vietnam travel styles for culture, family, luxury, and adventure',
    'Editorial travel style image for matching trip rhythm, comfort, and interests.',
    path.join(seedAssetsDir, 'wingsside-travel-styles.png'),
  )
  const sampleItinerariesImage = await createMedia(
    payload,
    req,
    site.id,
    'WingsSide sample itineraries cover',
    'Curated Vietnam itinerary route across heritage and nature',
    'Editorial itinerary image for sample Vietnam journeys that can be tailored.',
    path.join(seedAssetsDir, 'wingsside-sample-itineraries.png'),
  )

  const guideCategory = await createCategory(payload, req, site.id, 'Travel Guide', 'travel-guide')

  const tripPlannerForm = await createForm(
    payload,
    req,
    site.id,
    'WingSide Trip Planner',
    'Plan my trip',
    'Request received',
    'The inbound planning team will review the travel brief and reply with a tailored recommendation.',
    [
      {
        blockName: 'full-name',
        blockType: 'text',
        name: 'full-name',
        label: 'Full name',
        required: true,
        width: 100,
      },
      {
        blockName: 'email',
        blockType: 'email',
        name: 'email',
        label: 'Email',
        required: true,
        width: 100,
      },
      {
        blockName: 'country',
        blockType: 'text',
        name: 'country',
        label: 'Country of residence',
        required: false,
        width: 100,
      },
      {
        blockName: 'travel-month',
        blockType: 'text',
        name: 'travel-month',
        label: 'Planned travel month',
        required: false,
        width: 100,
      },
      {
        blockName: 'group-size',
        blockType: 'number',
        name: 'group-size',
        label: 'Group size',
        required: false,
        width: 100,
      },
      {
        blockName: 'message',
        blockType: 'textarea',
        name: 'message',
        label: 'Trip brief',
        required: true,
        width: 100,
      },
    ],
  )

  const contactPage = await createPage(payload, req, site.id, {
    title: 'Contact Us',
    slug: 'contact-us',
    hero: {
      type: 'mediumImpact',
      media: heroImage.id,
      links: [
        linkItem('Start your inquiry', '#trip-inquiry', 'default'),
        linkItem('Plan your trip', '/plan-your-trip', 'outline'),
      ],
      richText: richText(
        'Tell us what kind of Vietnam journey you want to build',
        'WingsSide is designed for custom inquiries, destination planning, and consultative conversations rather than price-only browsing.',
        'h1',
      ),
    },
    layout: [
      mediaBlock(heroImage.id),
      infoStripBlock(
        'What happens after you send a brief',
        'Contact should feel like the beginning of planning, not a generic support page.',
        [
          {
            label: 'Response path',
            value: 'Planning team',
            description:
              'The request is reviewed for destination, travel style, timing, and group needs.',
          },
          {
            label: 'Best input',
            value: 'Month + group size',
            description:
              'Approximate timing and party size are enough to start a useful recommendation.',
          },
          {
            label: 'Next step',
            value: 'Tailored proposal',
            description:
              'The team follows up with a route direction instead of forcing fixed-package checkout.',
          },
        ],
        'Inquiry flow',
      ),
      formBlock(
        tripPlannerForm.id,
        'Start your inquiry',
        'Share your destination ideas, travel style, approximate dates, and group size so the planning team can prepare a suitable recommendation.',
      ),
    ],
    meta: {
      title: 'Contact Us',
      description: 'Inquiry page for WingsSide inbound Vietnam journeys.',
      image: heroImage.id,
    },
  })

  const aboutPage = await createPage(payload, req, site.id, {
    title: 'About Us',
    slug: 'about-us',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Inbound Vietnam needs trust, not retail noise',
        'WingsSide follows a destination-led, style-led, inquiry-first structure because the inbound customer journey is different from outbound retail.',
        'h1',
      ),
    },
    layout: [
      infoStripBlock(
        'Why WingsSide feels different from WingsGo',
        'The site is organized around destination discovery, trip planning, travel styles, and operator trust instead of early price comparison.',
        [
          {
            label: 'Primary CTA',
            value: 'Plan your trip',
            description:
              'The key action is sending a planning brief, not immediately comparing prices.',
          },
          {
            label: 'Content pillars',
            value: 'Destinations + Styles',
            description:
              'Destination hubs and travel style pages create the core exploration model.',
          },
          {
            label: 'Market fit',
            value: 'Inbound travelers',
            description: 'International guests need guidance, proof, and local expertise signals.',
          },
          {
            label: 'Editorial tone',
            value: 'Trust-first',
            description:
              'Images, spacing, and storytelling should feel curated rather than sales-heavy.',
          },
        ],
        'Brand direction',
      ),
      contentBlock([
        {
          size: 'half',
          title: 'Destination-led UX',
          paragraph:
            'Users should be able to move from Vietnam-level exploration to destination pages such as Hanoi, Halong, Hoi An, Hue, and the Mekong.',
        },
        {
          size: 'half',
          title: 'Consultative trip planning',
          paragraph:
            'Instead of leading with a wall of prices, the site explains travel styles, sample itineraries, and the trip planning process.',
        },
      ]),
    ],
    meta: {
      title: 'About WingsSide',
      description: 'About page for the WingsSide inbound positioning and travel planning model.',
      image: heroImage.id,
    },
  })

  const destinationHub = await createPage(payload, req, site.id, {
    title: 'Destinations',
    slug: 'destinations',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Explore Vietnam by destination',
        'Destination hub pages create the core inbound discovery model before users move into sample itineraries or inquiry.',
        'h1',
      ),
    },
    layout: [
      mediaBlock(secondaryImage.id),
      contentBlock([
        {
          size: 'twoThirds',
          title: 'How to use this destination hub',
          paragraph:
            'Start with the role each place plays in a Vietnam route: Hanoi for northern context, Ha Long for bay contrast, Hue and Hoi An for heritage, and the Mekong for a softer southern extension.',
        },
        {
          size: 'oneThird',
          title: 'Start with a shortlist',
          paragraph:
            'Use the hub to shortlist regions before sending a brief. WingsSide can then shape pacing, hotels, transfers, and local experiences around your group.',
        },
      ]),
      featureGridBlock(
        'Key Vietnam destinations',
        'These entry points help guests understand how each region can shape a private Vietnam journey.',
        [
          {
            title: 'Ha Noi',
            description: 'Historic core, food culture, gateway for North Vietnam itineraries.',
            meta: 'North Vietnam',
            url: '/destinations/ha-noi',
          },
          {
            title: 'Ha Long',
            description: 'Cruise and seascape experiences often paired with Hanoi and Ninh Binh.',
            meta: 'Bay and cruise',
            url: '/destinations/ha-long',
          },
          {
            title: 'Hoi An',
            description:
              'Heritage, lantern nights, riverside atmosphere, and family-friendly pacing.',
            meta: 'Central heritage',
            url: '/destinations/hoi-an',
          },
          {
            title: 'Hue',
            description:
              'Imperial heritage and culture depth, useful for history-driven sample itineraries.',
            meta: 'Historic city',
            url: '/destinations/hue',
          },
          {
            title: 'Mekong',
            description:
              'Soft southern rhythm, waterways, local life, and multi-day extension options.',
            meta: 'Southern Vietnam',
            url: '/destinations/mekong',
          },
        ],
        'highlight',
        'Vietnam destination hub',
        'icon-grid',
        'Explore',
      ),
    ],
    meta: {
      title: 'Vietnam destinations',
      description: 'Destination hub for WingsSide inbound Vietnam pages.',
      image: heroImage.id,
      breadcrumbLabel: 'Destinations',
    },
  })

  const styleHub = await createPage(payload, req, site.id, {
    title: 'Travel Styles',
    slug: 'styles',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Travel styles help users self-qualify their journey',
        'Inbound customers often know how they want to travel before they know the exact itinerary, so style pages are a key navigation layer.',
        'h1',
      ),
    },
    layout: [
      mediaBlock(travelStylesImage.id),
      contentBlock([
        {
          size: 'half',
          title: 'Choose a rhythm before choosing a route',
          paragraph:
            'Travel styles turn a broad Vietnam idea into a useful planning direction. They help the team understand pace, hotel expectations, activity level, and how much cultural context should be built into each day.',
        },
        {
          size: 'half',
          title: 'Built for consultative selling',
          paragraph:
            'The page is intentionally not a fixed price grid. It gives European inbound guests a clearer way to brief WingsSide before a tailored itinerary is prepared.',
        },
      ]),
      featureGridBlock(
        'Choose your travel style',
        'These style entry points create a softer, more consultative funnel than an outbound-style product wall.',
        [
          {
            title: 'Luxury',
            description: 'Curated stays, comfort, and premium pacing.',
            meta: 'Premium travel style',
            url: '/styles/luxury',
          },
          {
            title: 'Family',
            description:
              'Balanced rhythm, flexible daily flow, and family-friendly destination choices.',
            meta: 'Family travel',
            url: '/styles/family',
          },
          {
            title: 'Culture',
            description: 'Heritage, local stories, food, and meaningful contextual experiences.',
            meta: 'Culture focus',
            url: '/styles/culture',
          },
          {
            title: 'Adventure',
            description: 'Nature, movement, soft trekking, and more active route design.',
            meta: 'Adventure focus',
            url: '/styles/adventure',
          },
        ],
        'default',
        'Travel themes',
        'icon-grid',
        'Explore',
      ),
    ],
    meta: {
      title: 'Travel styles',
      description: 'Travel style hub for WingsSide inbound pages.',
      image: heroImage.id,
      breadcrumbLabel: 'Styles',
    },
  })

  const packagesHub = await createPage(payload, req, site.id, {
    title: 'Vietnam Packages',
    slug: 'packages',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Sample itineraries show possibility, not hard-sell retail grids',
        'Inbound package pages should illustrate what can be built, then move the user to inquiry and customization.',
        'h1',
      ),
    },
    layout: [
      mediaBlock(sampleItinerariesImage.id),
      infoStripBlock(
        'How to read these sample packages',
        'Each itinerary is a starting structure. The actual proposal can adjust season, hotel class, guide depth, route order, and add-ons such as airport support.',
        [
          {
            label: 'Use as',
            value: 'Reference route',
            description: 'The pages explain what a coherent Vietnam journey can look like.',
          },
          {
            label: 'Do not treat as',
            value: 'Fixed checkout',
            description: 'Inbound planning still needs human scoping before quote and operation.',
          },
          {
            label: 'Next action',
            value: 'Send a brief',
            description: 'Share timing, group size, style, and must-see places.',
          },
        ],
        'Sample itinerary logic',
      ),
      featureGridBlock(
        'Sample itinerary structures',
        'These pages act like curated itinerary examples, not rigid retail departures.',
        [
          {
            title: 'Vietnam Highlights',
            description:
              'A balanced multi-region first-time route across North, Central, and South.',
            meta: 'Multi-region',
            url: '/packages/vietnam-highlights',
          },
          {
            title: 'Northern Vietnam',
            description: 'Hanoi, Halong, and nearby culture-nature combinations.',
            meta: 'North Vietnam',
            url: '/packages/northern-vietnam',
          },
          {
            title: 'Central Heritage',
            description: 'Hue, Hoi An, heritage sites, and softer pacing.',
            meta: 'Central Vietnam',
            url: '/packages/central-heritage',
          },
        ],
        'default',
        'Itinerary ideas',
        'icon-grid',
        'Explore',
      ),
    ],
    meta: {
      title: 'Vietnam packages',
      description: 'Curated sample itineraries for WingsSide inbound planning.',
      image: secondaryImage.id,
      breadcrumbLabel: 'Packages',
    },
  })

  const planTripPage = await createPage(payload, req, site.id, {
    title: 'Plan Your Trip',
    slug: 'plan-your-trip',
    hero: {
      type: 'mediumImpact',
      media: heroImage.id,
      links: [
        linkItem('Send your brief', '/contact-us', 'default'),
        linkItem('Explore destinations', '/destinations', 'outline'),
      ],
      richText: richText(
        'Plan your Vietnam trip with a local team',
        'This page qualifies destination interest, travel style, timing, and group needs before the sales team prepares a tailored proposal.',
        'h1',
      ),
    },
    layout: [
      mediaBlock(heroImage.id),
      infoStripBlock(
        'What the trip planner should capture',
        'The inquiry form is part of the product, not an afterthought. It should help the team understand market, style, timing, and level of customization needed.',
        [
          {
            label: 'Travel intent',
            value: 'Destination + style',
            description:
              'Start from what kind of journey the guest wants, not only fixed SKU selection.',
          },
          {
            label: 'Qualification',
            value: 'Timing + group size',
            description: 'Capture enough context to scope hotels, pacing, and route depth.',
          },
          {
            label: 'Sales handoff',
            value: 'Consultative',
            description: 'The form should feed a conversation, not pretend to be a booking engine.',
          },
        ],
        'Trip planning flow',
      ),
      formBlock(
        tripPlannerForm.id,
        'Share your travel brief',
        'Tell us when you plan to travel, how many people are in your group, and what kind of experiences you care about most.',
      ),
      faqBlock(
        'Planning questions',
        'These FAQs address the common uncertainty on the inbound side before users send a brief.',
        [
          {
            question: 'Do I need to know my full itinerary before contacting WingsSide?',
            answer:
              'No. A clear destination interest, approximate travel window, and travel style are enough to begin a useful planning conversation.',
          },
          {
            question: 'Can fast track be added later?',
            answer:
              'Yes. The architecture is intentionally aligned with the customer request to later bundle inbound itineraries with WingsPass add-on services.',
          },
        ],
        'Inbound FAQ',
      ),
    ],
    relatedPages: [contactPage.id, destinationHub.id, styleHub.id],
    meta: {
      title: 'Plan your trip',
      description: 'Trip planning page for WingsSide inbound inquiries.',
      image: heroImage.id,
    },
  })

  const travelGuidePage = await createPage(payload, req, site.id, {
    title: 'Travel Guide',
    slug: 'travel-guide',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Travel guide content builds search entry and planning confidence',
        'Guide posts help inbound users explore seasonality, logistics, and destination context before they send an inquiry.',
        'h1',
      ),
    },
    layout: [
      archiveBlock(
        [guideCategory.id],
        'Latest travel guide notes',
        'This archive stays site-scoped and supports destination-led SEO growth.',
        3,
      ),
    ],
    meta: {
      title: 'Travel guide',
      description: 'Travel guide archive for WingsSide destination and planning content.',
      image: secondaryImage.id,
    },
  })

  const testimonialsPage = await createPage(payload, req, site.id, {
    title: 'Testimonials',
    slug: 'testimonials',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Trust signals matter earlier than price on inbound journeys',
        'Testimonials, process clarity, and destination expertise should appear before the form ask becomes too heavy.',
        'h1',
      ),
    },
    layout: [
      featureGridBlock(
        'How trust appears on the site',
        'This page uses structured cards for credibility rather than hiding all proof inside long text sections.',
        [
          {
            title: 'Tailored route planning',
            description:
              'Guests receive itinerary recommendations shaped around style, pace, and regional priorities.',
            meta: 'Planning proof',
          },
          {
            title: 'Local coordination',
            description:
              'The team understands hotel, transfer, and destination rhythm across multiple Vietnam regions.',
            meta: 'Operational proof',
          },
          {
            title: 'Flexible inquiry funnel',
            description:
              'The website supports soft entry into consultation instead of forcing rigid product selection.',
            meta: 'Experience proof',
          },
        ],
        'minimal',
        'Trust-first design',
      ),
    ],
    meta: {
      title: 'Testimonials and trust',
      description: 'Trust signals and proof page for WingsSide inbound planning.',
      image: secondaryImage.id,
    },
  })

  const createDestinationPage = async (args: {
    focus: string
    highlights: Array<{ description: string; title: string }>
    slug: string
    title: string
  }) =>
    createPage(payload, req, site.id, {
      title: args.title,
      slug: args.slug,
      parentPage: destinationHub.id,
      relatedPages: [planTripPage.id, packagesHub.id, travelGuidePage.id],
      hero: {
        type: 'mediumImpact',
        media: secondaryImage.id,
        links: [
          linkItem('Plan your trip', '/plan-your-trip', 'default'),
          linkItem('View packages', '/packages', 'outline'),
        ],
        richText: richText(args.title, args.focus, 'h1'),
      },
      layout: [
        infoStripBlock(
          `${args.title} as an inbound planning page`,
          'Destination pages should mix overview, seasonality, top experiences, related packages, and a clear route to inquiry.',
          [
            {
              label: 'Best use',
              value: 'Destination entry',
              description:
                'The page should help users understand why this place matters inside a broader Vietnam trip.',
            },
            {
              label: 'Top conversion path',
              value: 'Plan your trip',
              description:
                'Destination discovery should lead into inquiry once the user sees enough signal.',
            },
            {
              label: 'Content role',
              value: 'SEO + planning',
              description: 'These pages support both search and consultative selling.',
            },
          ],
          'Destination structure',
        ),
        featureGridBlock(
          'Top experiences',
          'A destination page should spotlight experience clusters rather than a dense sales grid.',
          args.highlights.map((item) => ({
            title: item.title,
            description: item.description,
            meta: 'Experience',
          })),
          'default',
          'What to expect',
        ),
        ctaBlock(
          'Need a tailored route around this destination?',
          'Use the trip planner to combine this destination with matching regions, travel styles, and pacing preferences.',
          [linkItem('Plan your trip', '/plan-your-trip')],
        ),
      ],
      meta: {
        title: args.title,
        description: `${args.title} destination page for WingsSide inbound Vietnam planning.`,
        image: secondaryImage.id,
      },
    })

  await createDestinationPage({
    title: 'Ha Noi',
    slug: 'ha-noi',
    focus:
      'Ha Noi works as a cultural gateway and often anchors first-time North Vietnam itineraries with heritage, food, and city rhythm.',
    highlights: [
      {
        title: 'Old Quarter rhythm',
        description:
          'Historic streets, walking pace, food culture, and atmosphere-led exploration.',
      },
      {
        title: 'Cultural landmarks',
        description: 'Museums, temples, and political-history layers that help frame the journey.',
      },
      {
        title: 'North Vietnam gateway',
        description: 'Useful transition point into Halong, Ninh Binh, or mountain extensions.',
      },
    ],
  })

  await createDestinationPage({
    title: 'Ha Long',
    slug: 'ha-long',
    focus:
      'Ha Long adds cruise and seascape contrast to land-based North Vietnam routes and works well in first-time sample itineraries.',
    highlights: [
      {
        title: 'Cruise experience',
        description:
          'Overnight or day cruise framing depending on route depth and guest preference.',
      },
      {
        title: 'Landscape contrast',
        description: 'Bay scenery complements Hanoi culture and inland destinations.',
      },
      {
        title: 'Flexible route depth',
        description:
          'Can be a short extension or a stronger luxury anchor depending on package style.',
      },
    ],
  })

  await createDestinationPage({
    title: 'Hoi An',
    slug: 'hoi-an',
    focus:
      'Hoi An balances heritage, soft evening atmosphere, family-friendly pacing, and flexible combinations with Da Nang or Hue.',
    highlights: [
      {
        title: 'Heritage atmosphere',
        description: 'Lantern streets, riverside scenes, and walkable core experiences.',
      },
      {
        title: 'Soft family pacing',
        description: 'Good for guests who want cultural texture without a heavy schedule.',
      },
      {
        title: 'Central pairing',
        description: 'Pairs naturally with Hue and nearby coast-based extensions.',
      },
    ],
  })

  await createDestinationPage({
    title: 'Hue',
    slug: 'hue',
    focus:
      'Hue deepens Central Vietnam programs with imperial heritage, storytelling, and slower cultural pacing.',
    highlights: [
      {
        title: 'Imperial heritage',
        description: 'Historic narrative and architecture add strong culture value.',
      },
      {
        title: 'Meaningful pacing',
        description: 'Works well for travelers who want context and slower discovery.',
      },
      {
        title: 'Central circuit anchor',
        description: 'Builds strong paired routes with Hoi An and nearby cultural sites.',
      },
    ],
  })

  await createDestinationPage({
    title: 'Mekong',
    slug: 'mekong',
    focus:
      'The Mekong region gives southern itineraries a softer local-life rhythm and a different perspective from major city visits.',
    highlights: [
      {
        title: 'Waterway life',
        description: 'River-based perspective and slower local-life observation.',
      },
      {
        title: 'Southern contrast',
        description: 'Useful contrast against more urban or heritage-heavy parts of a longer trip.',
      },
      {
        title: 'Extension logic',
        description: 'Can be added as a short add-on or a deeper regional component.',
      },
    ],
  })

  const createStylePage = async (args: {
    description: string
    focusPoints: Array<{ description: string; title: string }>
    slug: string
    title: string
  }) =>
    createPage(payload, req, site.id, {
      title: args.title,
      slug: args.slug,
      parentPage: styleHub.id,
      relatedPages: [planTripPage.id, packagesHub.id, aboutPage.id],
      hero: {
        type: 'lowImpact',
        richText: richText(args.title, args.description, 'h1'),
      },
      layout: [
        featureGridBlock(
          'What this style means in practice',
          'Travel style pages should help users self-select before they submit an inquiry.',
          args.focusPoints.map((item) => ({
            title: item.title,
            description: item.description,
            meta: 'Travel style',
          })),
          'default',
          'Style logic',
        ),
        ctaBlock(
          'Want a trip built around this style?',
          'Use the planner and mention the travel style you prefer so the team can adapt pacing, hotels, and route depth.',
          [linkItem('Plan your trip', '/plan-your-trip')],
        ),
      ],
      meta: {
        title: `${args.title} Vietnam travel`,
        description: `${args.title} travel style page for WingsSide.`,
        image: secondaryImage.id,
      },
    })

  await createStylePage({
    title: 'Luxury',
    slug: 'luxury',
    description:
      'Luxury journeys focus on curated stays, comfort, service smoothness, and destination sequencing that feels polished rather than rushed.',
    focusPoints: [
      {
        title: 'Curated stays',
        description: 'Hotels and pacing work together to create an easier travel rhythm.',
      },
      {
        title: 'Soft daily flow',
        description: 'The schedule prioritizes quality experiences over overpacked movement.',
      },
      {
        title: 'Private planning',
        description: 'Luxury requests often benefit from stronger consultation before quoting.',
      },
    ],
  })

  await createStylePage({
    title: 'Family',
    slug: 'family',
    description:
      'Family travel needs balanced pacing, easier transfers, flexible downtime, and destinations that work across age groups.',
    focusPoints: [
      {
        title: 'Balanced pace',
        description: 'The route should avoid exhausting movement while keeping variety.',
      },
      {
        title: 'Comfort and flexibility',
        description: 'Family pages should communicate ease, not only attraction lists.',
      },
      {
        title: 'Multi-generation suitability',
        description: 'Good family planning handles different energy levels and needs.',
      },
    ],
  })

  await createStylePage({
    title: 'Culture',
    slug: 'culture',
    description:
      'Culture-led itineraries center on heritage, local food, storytelling, and places that carry strong historical or social context.',
    focusPoints: [
      {
        title: 'Context-rich routes',
        description: 'The value comes from understanding the place, not only visiting it.',
      },
      {
        title: 'Heritage depth',
        description:
          'Pages should guide users toward destination combinations with stronger narrative continuity.',
      },
      {
        title: 'Food and local life',
        description: 'Cultural journeys often combine sights with food and neighborhood texture.',
      },
    ],
  })

  await createStylePage({
    title: 'Adventure',
    slug: 'adventure',
    description:
      'Adventure journeys emphasize movement, landscape, and a more active day structure without losing overall route clarity.',
    focusPoints: [
      {
        title: 'Nature and motion',
        description: 'Adventure pages should foreground active landscapes and route energy.',
      },
      {
        title: 'Route honesty',
        description:
          'Guests need to know when the journey becomes more active or physically demanding.',
      },
      {
        title: 'Flexible combinations',
        description:
          'Adventure can be layered into a broader itinerary rather than acting as a standalone extreme product.',
      },
    ],
  })

  const createPackagePage = async (args: {
    blocks: Array<{ paragraph: string; title: string }>
    slug: string
    summary: string
    title: string
  }) =>
    createPage(payload, req, site.id, {
      title: args.title,
      slug: args.slug,
      parentPage: packagesHub.id,
      relatedPages: [planTripPage.id, destinationHub.id, styleHub.id],
      hero: {
        type: 'mediumImpact',
        media: secondaryImage.id,
        links: [
          linkItem('Plan your trip', '/plan-your-trip', 'default'),
          linkItem('Contact us', '/contact-us', 'outline'),
        ],
        richText: richText(args.title, args.summary, 'h1'),
      },
      layout: [
        contentBlock(args.blocks.map((block) => ({ ...block, size: 'half' }))),
        ctaBlock(
          'Need this sample itinerary adjusted?',
          'These package pages are sample planning references. The real next step is a custom inquiry, not a fixed checkout flow.',
          [linkItem('Plan your trip', '/plan-your-trip')],
        ),
      ],
      meta: {
        title: args.title,
        description: `${args.title} sample itinerary page for WingsSide.`,
        image: secondaryImage.id,
      },
    })

  await createPackagePage({
    title: 'Vietnam Highlights',
    slug: 'vietnam-highlights',
    summary:
      'A multi-region first-time framework for travelers who want to touch North, Central, and South in one coherent route.',
    blocks: [
      {
        title: 'Who this suits',
        paragraph:
          'First-time inbound guests who want a balanced overview rather than an ultra-specialized route.',
      },
      {
        title: 'Suggested structure',
        paragraph:
          'North gateway, heritage center, then southern contrast, with pacing adapted by trip length and style.',
      },
      {
        title: 'Why it converts',
        paragraph:
          'The package gives users a tangible starting point while still inviting customization.',
      },
      {
        title: 'What happens next',
        paragraph:
          'Guests should use this page as a reference and move into the plan-your-trip flow.',
      },
    ],
  })

  await createPackagePage({
    title: 'Northern Vietnam',
    slug: 'northern-vietnam',
    summary:
      'A northern route frame connecting Hanoi, Halong, and nearby destination depth for travelers who want a tighter regional focus.',
    blocks: [
      {
        title: 'Core rhythm',
        paragraph:
          'City culture, seascape, and optional soft extension into nearby nature or countryside.',
      },
      {
        title: 'Travel style fit',
        paragraph:
          'Works well for culture, family, and light luxury planning depending on accommodation mix.',
      },
      {
        title: 'Trip depth',
        paragraph:
          'Can stay compact or grow into a richer regional route with more nights and side experiences.',
      },
      {
        title: 'Conversion model',
        paragraph:
          'The point is to inspire inquiry with a structured sample, not to behave like a retail departure table.',
      },
    ],
  })

  await createPackagePage({
    title: 'Central Heritage',
    slug: 'central-heritage',
    summary:
      'A heritage-focused sample itinerary for guests who want culture, architecture, and a softer pace in Central Vietnam.',
    blocks: [
      {
        title: 'Destination logic',
        paragraph: 'Hue and Hoi An pair naturally for historical depth, contrast, and atmosphere.',
      },
      {
        title: 'Experience tone',
        paragraph: 'The route should feel refined and context-rich rather than overpacked.',
      },
      {
        title: 'Who it serves',
        paragraph: 'Culture-focused travelers, couples, and slower-paced family groups.',
      },
      {
        title: 'How it should sell',
        paragraph:
          'The page should invite consultation around pacing, hotels, and route extension.',
      },
    ],
  })

  await createPost(payload, req, site.id, {
    title: 'When is the best time to travel in Northern Vietnam?',
    slug: 'best-time-to-travel-northern-vietnam',
    heroImage: secondaryImage.id,
    content: richText(
      'Seasonality guides planning confidence',
      'Guide content helps international guests understand how weather, pacing, and destination combinations affect a Vietnam trip plan.',
      'h2',
    ),
    categories: [guideCategory.id],
    meta: {
      title: 'Best time to travel in Northern Vietnam',
      description: 'Guide post for northern Vietnam planning on WingsSide.',
      image: secondaryImage.id,
    },
  })

  await createPost(payload, req, site.id, {
    title: 'How to choose between Hanoi, Halong, and Hoi An',
    slug: 'how-to-choose-between-hanoi-halong-hoi-an',
    heroImage: secondaryImage.id,
    content: richText(
      'Destination choice is often the first planning question',
      'This guide clarifies the different roles those destinations play inside a sample itinerary so users can brief the team more clearly.',
      'h2',
    ),
    categories: [guideCategory.id],
    meta: {
      title: 'How to choose between Hanoi, Halong, and Hoi An',
      description: 'Guide post comparing key Vietnam destinations for inbound planning.',
      image: secondaryImage.id,
    },
  })

  await createPost(payload, req, site.id, {
    title: 'What makes a Vietnam trip feel luxury instead of generic?',
    slug: 'what-makes-a-vietnam-trip-feel-luxury',
    heroImage: secondaryImage.id,
    content: richText(
      'Luxury is not only about hotel stars',
      'This guide supports the trust-first positioning of WingsSide by explaining how pacing, curation, service smoothness, and destination flow shape a premium journey.',
      'h2',
    ),
    categories: [guideCategory.id],
    meta: {
      title: 'What makes a Vietnam trip feel luxury instead of generic?',
      description: 'Guide post supporting luxury travel positioning on WingsSide.',
      image: secondaryImage.id,
    },
  })

  const homePage = await createPage(payload, req, site.id, {
    title: 'wingside.vn',
    slug: 'home',
    hero: {
      type: 'highImpact',
      presentationMode: 'inherit',
      variant: 'planner',
      media: heroImage.id,
      slides: [
        {
          eyebrow: 'Tailor-made Vietnam',
          title: 'Tailor-made Vietnam journeys',
          description:
            'Private, flexible, locally designed experiences built through destination discovery and consultative planning.',
          media: heroImage.id,
          links: [linkItem('Plan your trip', '/plan-your-trip', 'default')],
        },
        {
          eyebrow: 'Destination-led planning',
          title: 'Start with places, not packages',
          description:
            'Explore Hanoi, Ha Long, Hoi An, Hue, and the Mekong through route ideas that can be shaped around your group.',
          media: secondaryImage.id,
          links: [linkItem('Explore destinations', '/destinations', 'outline')],
        },
        {
          eyebrow: 'Travel styles',
          title: 'Culture, family, luxury, slow travel',
          description:
            'Use travel styles as a briefing shortcut before the team turns your ideas into a practical route.',
          media: travelStylesImage.id,
          links: [linkItem('View travel styles', '/styles', 'outline')],
        },
      ],
      links: [
        linkItem('Plan your trip', '/plan-your-trip', 'default'),
        linkItem('Explore destinations', '/destinations', 'outline'),
      ],
      richText: richText(
        'Tailor-made Vietnam journeys',
        'Private, flexible, locally designed experiences built through destination discovery, travel style guidance, and consultative planning.',
        'h1',
      ),
    },
    layout: [
      featureGridBlock(
        'Build your Vietnam journey from the right starting point',
        'Each planning path opens a deeper guide so you can understand the options, compare route ideas, and prepare a more useful trip brief.',
        [
          {
            title: 'Plan your trip',
            description:
              'Share your dates, group size, interests, and preferred pace. The planner explains what to prepare and what happens after you submit.',
            url: '/plan-your-trip',
          },
          {
            title: 'Destination + style',
            description:
              'Combine the places you want to see with the way you want to travel—from culture and family time to luxury or adventure.',
            url: '/destinations',
          },
          {
            title: 'Inbound Vietnam',
            description:
              'Learn how WingsSide approaches private Vietnam travel, local route design, practical pacing, and support for international guests.',
            url: '/about-us',
          },
          {
            title: 'Guide + destination',
            description:
              'Use destination pages and practical travel guides to shortlist regions, understand seasonality, and ask better planning questions.',
            url: '/posts',
          },
        ],
        'default',
        'Start planning',
        'icon-grid',
        'Explore',
      ),
      featureGridBlock(
        'Why travel with WingsSide',
        'A useful inbound journey starts with clear advice, realistic pacing, and a planning process shaped around the people who will travel.',
        [
          {
            title: 'Locally designed routes',
            description:
              'Destination combinations and itinerary rhythm are shaped around how travel actually feels on the ground.',
            imageID: secondaryImage.id,
            meta: 'Local expertise',
          },
          {
            title: 'Flexible itinerary planning',
            description:
              'Users are guided into customization instead of being trapped in rigid off-the-shelf catalog logic.',
            imageID: sampleItinerariesImage.id,
            meta: 'Flexible planning',
          },
          {
            title: 'Travel-style matching',
            description:
              'Luxury, family, culture, and adventure help qualify the inquiry before the first human response.',
            imageID: travelStylesImage.id,
            meta: 'Style-led',
          },
        ],
        'highlight',
        'How we plan',
        'bento',
      ),
      statsBlock(
        'Explore the planning library',
        'Use these published entry points to move from broad inspiration to a focused conversation with the planning team.',
        [
          {
            label: 'Destination clusters',
            value: '5+',
            description: 'North, Central, South, coastal and multi-region route frames.',
          },
          {
            label: 'Travel style briefs',
            value: '6',
            description: 'Luxury, family, culture, adventure, honeymoon and wellness entry points.',
          },
          {
            label: 'Sample route frameworks',
            value: '3',
            description:
              'Vietnam Highlights, Northern Vietnam and Central Heritage provide practical starting structures.',
          },
          {
            label: 'Public languages',
            value: '5',
            description:
              'Vietnamese, English, Italian, Spanish and Portuguese routes are available for exploration.',
          },
        ],
        'logo-proof',
        'Planning at a glance',
      ),
      featureGridBlock(
        'Destination hub',
        'The homepage should surface destinations early because that is how users often begin their inbound exploration.',
        [
          {
            title: 'Ha Noi',
            description: 'City heritage, food, and North Vietnam gateway logic.',
            imageID: secondaryImage.id,
            meta: 'North Vietnam',
            url: '/destinations/ha-noi',
          },
          {
            title: 'Ha Long',
            description: 'Cruise contrast and seascape rhythm for sample itineraries.',
            imageID: secondaryImage.id,
            meta: 'Bay and cruise',
            url: '/destinations/ha-long',
          },
          {
            title: 'Hoi An',
            description: 'Heritage atmosphere and softer evening pacing.',
            imageID: secondaryImage.id,
            meta: 'Central heritage',
            url: '/destinations/hoi-an',
          },
          {
            title: 'Hue',
            description: 'Imperial depth and cultural structure.',
            imageID: secondaryImage.id,
            meta: 'Historic city',
            url: '/destinations/hue',
          },
          {
            title: 'Mekong',
            description: 'Southern waterways and local-life contrast.',
            imageID: secondaryImage.id,
            meta: 'Southern Vietnam',
            url: '/destinations/mekong',
          },
        ],
        'default',
        'Destinations',
        'icon-grid',
        'Explore',
      ),
      featureGridBlock(
        'Travel styles',
        'Styles help users self-qualify their journey before choosing the exact package shape.',
        [
          {
            title: 'Luxury',
            description: 'Curated stays, service smoothness, and refined pacing.',
            imageID: travelStylesImage.id,
            meta: 'Travel style',
            url: '/styles/luxury',
          },
          {
            title: 'Family',
            description: 'Balanced route design and easy-flow days for mixed-age groups.',
            imageID: travelStylesImage.id,
            meta: 'Travel style',
            url: '/styles/family',
          },
          {
            title: 'Culture',
            description: 'Heritage, food, stories, and contextual travel.',
            imageID: travelStylesImage.id,
            meta: 'Travel style',
            url: '/styles/culture',
          },
          {
            title: 'Adventure',
            description: 'More active route rhythm with landscape and movement.',
            imageID: travelStylesImage.id,
            meta: 'Travel style',
            url: '/styles/adventure',
          },
        ],
        'minimal',
        'Travel themes',
        'icon-grid',
        'Explore',
      ),
      featureGridBlock(
        'Sample itineraries',
        'Itinerary cards remain in FeatureGrid for wave 1 because they are static marketing examples, not a separate product data model.',
        [
          {
            title: 'Vietnam Highlights',
            description: 'A first-time multi-region planning frame.',
            imageID: sampleItinerariesImage.id,
            meta: 'Sample package',
            url: '/packages/vietnam-highlights',
          },
          {
            title: 'Northern Vietnam',
            description: 'A tighter regional route for culture and scenic contrast.',
            imageID: sampleItinerariesImage.id,
            meta: 'Sample package',
            url: '/packages/northern-vietnam',
          },
          {
            title: 'Central Heritage',
            description: 'Heritage-led route with softer pacing and stronger storytelling.',
            imageID: sampleItinerariesImage.id,
            meta: 'Sample package',
            url: '/packages/central-heritage',
          },
        ],
        'default',
        'Packages',
        'alternating',
        'Explore',
      ),
      testimonialBlock(
        'Traveler notes for planning',
        'Carousel presentation is used for planning signals and sample inquiry language; real public reviews should only be added after provenance is available.',
        [
          {
            country: 'United Kingdom',
            name: 'Family route brief',
            noteDate: '2026-07-02T00:00:00.000Z',
            quote:
              'We want Vietnam to feel easy for grandparents and children, with culture moments but not too many hotel changes.',
            role: 'Sample planning note',
          },
          {
            country: 'Italy',
            name: 'Culture-led brief',
            noteDate: '2026-07-05T00:00:00.000Z',
            quote:
              'The route should explain why each city matters, not only move us from one sightseeing stop to another.',
            role: 'Sample planning note',
          },
          {
            country: 'Australia',
            name: 'Luxury pacing brief',
            noteDate: '2026-07-08T00:00:00.000Z',
            quote:
              'We care about fewer transitions, reliable hosting, and hotels that match the rhythm of the journey.',
            role: 'Sample planning note',
          },
          {
            country: 'Spain',
            name: 'Food and heritage brief',
            noteDate: '2026-07-10T00:00:00.000Z',
            quote:
              'We would like local food and heritage to connect naturally, with enough free time to enjoy each place.',
            role: 'Sample planning note',
          },
          {
            country: 'Portugal',
            name: 'Slow travel brief',
            noteDate: '2026-07-11T00:00:00.000Z',
            quote:
              'We prefer a slower journey with longer stays and fewer early departures, even if that means seeing fewer regions.',
            role: 'Sample planning note',
          },
          {
            country: 'Singapore',
            name: 'Short private escape brief',
            noteDate: '2026-07-12T00:00:00.000Z',
            quote:
              'We only have one week, so we need a focused route with private transfers and one strong cultural contrast.',
            role: 'Sample planning note',
          },
          {
            country: 'Canada',
            name: 'First-time Vietnam brief',
            noteDate: '2026-07-13T00:00:00.000Z',
            quote:
              'This is our first visit and we need help balancing iconic places with quieter experiences that feel personal.',
            role: 'Sample planning note',
          },
          {
            country: 'Germany',
            name: 'Active couple brief',
            noteDate: '2026-07-14T00:00:00.000Z',
            quote:
              'We want walking, cycling, and scenery, but also comfortable evenings and a route that does not feel rushed.',
            role: 'Sample planning note',
          },
        ],
        'carousel',
        'Planning signals',
      ),
      ctaBlock(
        'Ready to shape your Vietnam trip?',
        'Move from inspiration into a planning conversation through the trip planner or the contact page.',
        [linkItem('Plan your trip', '/plan-your-trip')],
      ),
    ],
    relatedPages: [
      destinationHub.id,
      styleHub.id,
      packagesHub.id,
      planTripPage.id,
      aboutPage.id,
      travelGuidePage.id,
      testimonialsPage.id,
      contactPage.id,
    ],
    meta: {
      title: 'wingside.vn',
      description: siteSeed.seoDescription,
      image: heroImage.id,
    },
  })

  const updateLocalizedCorePage = async ({
    image,
    links: _links,
    pageID,
    translations,
  }: {
    image: number | string
    links: Array<ReturnType<typeof linkItem>>
    pageID: number | string
    translations: Record<
      'es' | 'it' | 'pt',
      {
        body: string
        heading: string
        links: Array<ReturnType<typeof linkItem>>
        meta: string
        paragraph: string
        section: string
        sideBody: string
        sideTitle: string
        title: string
      }
    >
  }) => {
    for (const locale of ['it', 'es', 'pt'] as const) {
      const copy = translations[locale]

      await updatePageLocale(payload, req, pageID, locale, {
        title: copy.title,
        hero: {
          type: 'mediumImpact',
          media: image,
          links: copy.links,
          richText: richText(copy.heading, copy.paragraph, 'h1'),
        },
        layout: [
          mediaBlock(image),
          contentBlock([
            {
              size: 'twoThirds',
              title: copy.section,
              paragraph: copy.body,
            },
            {
              size: 'oneThird',
              title: copy.sideTitle,
              paragraph: copy.sideBody,
            },
          ]),
          ctaBlock(copy.heading, copy.paragraph, copy.links),
        ],
        relatedPages: [
          destinationHub.id,
          styleHub.id,
          packagesHub.id,
          planTripPage.id,
          contactPage.id,
        ],
        meta: {
          title: copy.meta,
          description: copy.paragraph,
          image,
        },
      })
    }
  }

  const localizedHomeTranslations = {
    it: {
      ctaDescription:
        'Passa dall’ispirazione a una conversazione concreta tramite il planner o la pagina contatti.',
      ctaTitle: 'Pronto a dare forma al tuo viaggio in Vietnam?',
      destinationsDescription:
        'La homepage mostra presto le destinazioni perché molti viaggi inbound iniziano dalla scelta dei luoghi.',
      destinationsEyebrow: 'Destinazioni',
      destinationsTitle: 'Hub destinazioni',
      exploreLabel: 'Scopri',
      heading: 'Viaggi su misura in Vietnam',
      heroEyebrow: 'Vietnam su misura',
      links: [
        linkItem('Pianifica il viaggio', '/plan-your-trip'),
        linkItem('Destinazioni', '/destinations', 'outline'),
      ],
      meta: 'WingsSide Vietnam su misura',
      paragraph:
        'Esperienze private, flessibili e progettate localmente attraverso destinazioni, stili di viaggio e consulenza.',
      packagesDescription:
        'Le schede itinerario restano esempi marketing: mostrano possibilità, non un catalogo rigido.',
      packagesEyebrow: 'Itinerari',
      packagesTitle: 'Itinerari di esempio',
      planningNotesDescription:
        'Il carousel usa note di pianificazione campione; recensioni reali vanno pubblicate solo con provenienza verificabile.',
      planningNotesEyebrow: 'Segnali di planning',
      planningNotesTitle: 'Note di viaggio per pianificare',
      slideDestinationDescription:
        'Esplora Hanoi, Ha Long, Hoi An, Hue e Mekong attraverso idee di rotta adattabili al tuo gruppo.',
      slideDestinationEyebrow: 'Planning per destinazione',
      slideDestinationTitle: 'Inizia dai luoghi, non dai pacchetti',
      slideStyleDescription:
        'Usa gli stili di viaggio come scorciatoia di brief prima che il team trasformi le idee in una rotta pratica.',
      slideStyleEyebrow: 'Stili di viaggio',
      slideStyleTitle: 'Cultura, famiglia, lusso, slow travel',
      statsDescription:
        'Punti di ingresso pubblicati per passare dall’ispirazione a un brief di viaggio più preciso.',
      statsEyebrow: 'Planning in breve',
      statsTitle: 'Esplora la libreria di pianificazione',
      stylesDescription:
        'Gli stili aiutano l’utente a qualificare il viaggio prima di scegliere una forma di itinerario.',
      stylesEyebrow: 'Temi di viaggio',
      stylesTitle: 'Stili di viaggio',
      title: 'wingside.vn',
      trustDescription:
        'Ogni percorso apre una guida più completa per confrontare idee di rotta e preparare una richiesta utile.',
      trustEyebrow: 'Inizia a pianificare',
      trustTitle: 'Costruisci il viaggio dal punto di partenza giusto',
      whyDescription:
        'I viaggiatori inbound devono fidarsi dell’operatore prima di inviare un brief di pianificazione.',
      whyEyebrow: 'Come pianifichiamo',
      whyTitle: 'Perché viaggiare con WingsSide',
    },
    es: {
      ctaDescription:
        'Pasa de la inspiración a una conversación de planificación mediante el planner o la página de contacto.',
      ctaTitle: '¿Listo para dar forma a tu viaje a Vietnam?',
      destinationsDescription:
        'La portada muestra destinos desde el inicio porque muchos viajes inbound empiezan por elegir lugares.',
      destinationsEyebrow: 'Destinos',
      destinationsTitle: 'Hub de destinos',
      exploreLabel: 'Explorar',
      heading: 'Viajes a Vietnam hechos a medida',
      heroEyebrow: 'Vietnam a medida',
      links: [
        linkItem('Planifica tu viaje', '/plan-your-trip'),
        linkItem('Destinos', '/destinations', 'outline'),
      ],
      meta: 'WingsSide Vietnam a medida',
      paragraph:
        'Experiencias privadas y flexibles, diseñadas localmente a partir de destinos, estilos de viaje y planificación consultiva.',
      packagesDescription:
        'Las tarjetas de itinerario son ejemplos de marketing: muestran posibilidades, no un catálogo rígido.',
      packagesEyebrow: 'Itinerarios',
      packagesTitle: 'Itinerarios de ejemplo',
      planningNotesDescription:
        'El carrusel usa notas de planificación de muestra; las reseñas reales solo deben publicarse con procedencia verificable.',
      planningNotesEyebrow: 'Señales de planificación',
      planningNotesTitle: 'Notas de viaje para planificar',
      slideDestinationDescription:
        'Explora Hanoi, Ha Long, Hoi An, Hue y Mekong mediante ideas de ruta adaptables a tu grupo.',
      slideDestinationEyebrow: 'Planificación por destino',
      slideDestinationTitle: 'Empieza por lugares, no por paquetes',
      slideStyleDescription:
        'Usa los estilos de viaje como atajo de brief antes de que el equipo convierta las ideas en una ruta práctica.',
      slideStyleEyebrow: 'Estilos de viaje',
      slideStyleTitle: 'Cultura, familia, lujo, viaje pausado',
      statsDescription:
        'Puntos de entrada publicados para pasar de la inspiración a un brief de viaje más preciso.',
      statsEyebrow: 'Planificación de un vistazo',
      statsTitle: 'Explora la biblioteca de planificación',
      stylesDescription:
        'Los estilos ayudan al usuario a cualificar su viaje antes de elegir una forma de itinerario.',
      stylesEyebrow: 'Temas de viaje',
      stylesTitle: 'Estilos de viaje',
      title: 'wingside.vn',
      trustDescription:
        'Cada ruta abre una guía más completa para comparar ideas y preparar una solicitud de viaje útil.',
      trustEyebrow: 'Empieza a planificar',
      trustTitle: 'Construye el viaje desde el punto de partida adecuado',
      whyDescription:
        'Los viajeros inbound necesitan confiar en el operador antes de enviar un brief de planificación.',
      whyEyebrow: 'Cómo planificamos',
      whyTitle: 'Por qué viajar con WingsSide',
    },
    pt: {
      ctaDescription:
        'Passe da inspiração para uma conversa de planeamento através do planner ou da página de contacto.',
      ctaTitle: 'Pronto para dar forma à sua viagem ao Vietname?',
      destinationsDescription:
        'A homepage mostra destinos cedo porque muitas viagens inbound começam pela escolha dos lugares.',
      destinationsEyebrow: 'Destinos',
      destinationsTitle: 'Hub de destinos',
      exploreLabel: 'Explorar',
      heading: 'Viagens ao Vietname feitas à medida',
      heroEyebrow: 'Vietname à medida',
      links: [
        linkItem('Planear a viagem', '/plan-your-trip'),
        linkItem('Destinos', '/destinations', 'outline'),
      ],
      meta: 'WingsSide Vietname à medida',
      paragraph:
        'Experiências privadas, flexíveis e desenhadas localmente através de destinos, estilos de viagem e planeamento consultivo.',
      packagesDescription:
        'Os cartões de itinerário são exemplos de marketing: mostram possibilidades, não um catálogo rígido.',
      packagesEyebrow: 'Itinerários',
      packagesTitle: 'Itinerários de exemplo',
      planningNotesDescription:
        'O carrossel usa notas de planeamento de exemplo; avaliações reais só devem entrar com proveniência verificável.',
      planningNotesEyebrow: 'Sinais de planeamento',
      planningNotesTitle: 'Notas de viagem para planear',
      slideDestinationDescription:
        'Explore Hanoi, Ha Long, Hoi An, Hue e Mekong através de ideias de rota adaptáveis ao seu grupo.',
      slideDestinationEyebrow: 'Planeamento por destino',
      slideDestinationTitle: 'Comece pelos lugares, não pelos pacotes',
      slideStyleDescription:
        'Use os estilos de viagem como atalho de brief antes de a equipa transformar ideias numa rota prática.',
      slideStyleEyebrow: 'Estilos de viagem',
      slideStyleTitle: 'Cultura, família, luxo, viagem lenta',
      statsDescription:
        'Pontos de entrada publicados para passar da inspiração a um pedido de viagem mais preciso.',
      statsEyebrow: 'Planeamento em resumo',
      statsTitle: 'Explore a biblioteca de planeamento',
      stylesDescription:
        'Os estilos ajudam o utilizador a qualificar a viagem antes de escolher uma forma de itinerário.',
      stylesEyebrow: 'Temas de viagem',
      stylesTitle: 'Estilos de viagem',
      title: 'wingside.vn',
      trustDescription:
        'Cada percurso abre um guia mais completo para comparar ideias e preparar um pedido de viagem útil.',
      trustEyebrow: 'Comece a planear',
      trustTitle: 'Construa a viagem a partir do ponto certo',
      whyDescription:
        'Os viajantes precisam de confiar no operador antes de enviar um pedido de planeamento.',
      whyEyebrow: 'Como planeamos',
      whyTitle: 'Porque viajar com a WingsSide',
    },
  } as const

  const localizedHomeBlockCopy = {
    it: {
      trustItems: [
        {
          label: 'CTA',
          description:
            'La pagina deve sembrare pronta per una richiesta su misura, non per un checkout retail.',
        },
        {
          label: 'Navigazione',
          value: 'Destinazioni + stile',
          description: 'Gli utenti possono esplorare il Vietnam per luogo o per tipo di viaggio.',
        },
        {
          label: 'Ruolo business',
          value: 'Inbound Vietnam',
          description: 'Il sito serve ospiti internazionali e contenuti orientati alla fiducia.',
        },
        {
          label: 'SEO',
          value: 'Guida + destinazione',
          description: 'Guide e pagine destinazione supportano la scoperta prima della richiesta.',
        },
      ],
      whyItems: [
        {
          title: 'Rotte progettate localmente',
          description:
            'Combinazioni di destinazioni e ritmo pensate secondo come il viaggio si vive sul terreno.',
          meta: 'Local expertise',
        },
        {
          title: 'Pianificazione flessibile',
          description:
            'L’esperienza guida verso personalizzazione invece di una logica da catalogo chiuso.',
          meta: 'Flexible planning',
        },
        {
          title: 'Matching per stile',
          description:
            'Lusso, famiglia, cultura e avventura qualificano la richiesta prima della prima risposta umana.',
          meta: 'Style-led',
        },
      ],
      statsItems: [
        {
          label: 'Cluster destinazione',
          value: '5+',
          description: 'North, Central, South, coastal and multi-region route frames.',
        },
        {
          label: 'Brief per stile',
          value: '6',
          description: 'Luxury, family, culture, adventure, honeymoon and wellness.',
        },
        {
          label: 'Strutture di rotta',
          value: '3',
          description: 'Vietnam essenziale, Vietnam del Nord e Patrimonio centrale.',
        },
        {
          label: 'Lingue pubbliche',
          value: '5',
          description: 'Vietnamita, inglese, italiano, spagnolo e portoghese.',
        },
      ],
      styleItems: [
        {
          title: 'Lusso',
          description: 'Soggiorni curati, servizio fluido e ritmo raffinato.',
          url: '/styles/luxury',
        },
        {
          title: 'Famiglia',
          description: 'Rotte equilibrate e giornate fluide per gruppi di età diverse.',
          url: '/styles/family',
        },
        {
          title: 'Cultura',
          description: 'Patrimonio, cucina, storie e contesto.',
          url: '/styles/culture',
        },
        {
          title: 'Avventura',
          description: 'Un ritmo più attivo con paesaggio e movimento.',
          url: '/styles/adventure',
        },
      ],
      packageItems: [
        {
          title: 'Vietnam essenziale',
          description: 'Una base multi-regione per un primo viaggio.',
          url: '/packages/vietnam-highlights',
        },
        {
          title: 'Vietnam del Nord',
          description: 'Una rotta regionale più focalizzata su cultura e contrasto paesaggistico.',
          url: '/packages/northern-vietnam',
        },
        {
          title: 'Patrimonio centrale',
          description: 'Rotta patrimoniale con ritmo più morbido e più narrazione.',
          url: '/packages/central-heritage',
        },
      ],
      planningNotes: [
        {
          country: 'Regno Unito',
          name: 'Brief percorso famiglia',
          noteDate: '2026-07-02T00:00:00.000Z',
          quote:
            'Vogliamo un Vietnam facile per nonni e bambini, con momenti culturali ma senza troppi cambi hotel.',
          role: 'Nota di pianificazione campione',
        },
        {
          country: 'Italia',
          name: 'Brief culturale',
          noteDate: '2026-07-05T00:00:00.000Z',
          quote: 'La rotta deve spiegare perché ogni città conta, non solo spostarci tra tappe.',
          role: 'Nota di pianificazione campione',
        },
        {
          country: 'Australia',
          name: 'Brief lusso e ritmo',
          noteDate: '2026-07-08T00:00:00.000Z',
          quote:
            'Ci interessano meno transizioni, hosting affidabile e hotel coerenti con il ritmo del viaggio.',
          role: 'Nota di pianificazione campione',
        },
        {
          country: 'Spagna',
          name: 'Brief cucina e patrimonio',
          noteDate: '2026-07-10T00:00:00.000Z',
          quote:
            'Vorremmo collegare cucina locale e patrimonio, lasciando tempo libero in ogni tappa.',
          role: 'Nota di pianificazione campione',
        },
        {
          country: 'Portogallo',
          name: 'Brief slow travel',
          noteDate: '2026-07-11T00:00:00.000Z',
          quote:
            'Preferiamo soggiorni più lunghi e meno partenze presto, anche visitando meno regioni.',
          role: 'Nota di pianificazione campione',
        },
        {
          country: 'Singapore',
          name: 'Brief fuga privata',
          noteDate: '2026-07-12T00:00:00.000Z',
          quote:
            'Abbiamo una settimana e cerchiamo una rotta mirata con transfer privati e un forte contrasto culturale.',
          role: 'Nota di pianificazione campione',
        },
        {
          country: 'Canada',
          name: 'Brief prima volta in Vietnam',
          noteDate: '2026-07-13T00:00:00.000Z',
          quote:
            'È la prima visita: vogliamo bilanciare luoghi iconici ed esperienze più tranquille e personali.',
          role: 'Nota di pianificazione campione',
        },
        {
          country: 'Germania',
          name: 'Brief coppia attiva',
          noteDate: '2026-07-14T00:00:00.000Z',
          quote:
            'Cerchiamo camminate, bici e paesaggi, con serate comode e senza una rotta affrettata.',
          role: 'Nota di pianificazione campione',
        },
      ],
    },
    es: {
      trustItems: [
        {
          label: 'CTA',
          description:
            'La página debe sentirse lista para una solicitud a medida, no para un checkout retail.',
        },
        {
          label: 'Navegación',
          value: 'Destinos + estilo',
          description: 'Los usuarios pueden explorar Vietnam por lugar o por tipo de viaje.',
        },
        {
          label: 'Rol de negocio',
          value: 'Inbound Vietnam',
          description:
            'El sitio sirve a viajeros internacionales y contenido orientado a confianza.',
        },
        {
          label: 'SEO',
          value: 'Guía + destino',
          description: 'Guías y páginas de destino apoyan el descubrimiento antes de la solicitud.',
        },
      ],
      whyItems: [
        {
          title: 'Rutas diseñadas localmente',
          description:
            'Combinaciones de destinos y ritmo pensados según cómo se vive el viaje sobre el terreno.',
          meta: 'Local expertise',
        },
        {
          title: 'Planificación flexible',
          description:
            'La experiencia guía hacia personalización en vez de lógica de catálogo cerrado.',
          meta: 'Flexible planning',
        },
        {
          title: 'Matching por estilo',
          description:
            'Lujo, familia, cultura y aventura califican la solicitud antes de la primera respuesta humana.',
          meta: 'Style-led',
        },
      ],
      statsItems: [
        {
          label: 'Clusters de destino',
          value: '5+',
          description: 'North, Central, South, coastal and multi-region route frames.',
        },
        {
          label: 'Briefs por estilo',
          value: '6',
          description: 'Luxury, family, culture, adventure, honeymoon and wellness.',
        },
        {
          label: 'Estructuras de ruta',
          value: '3',
          description: 'Vietnam esencial, Norte de Vietnam y Patrimonio central.',
        },
        {
          label: 'Idiomas públicos',
          value: '5',
          description: 'Vietnamita, inglés, italiano, español y portugués.',
        },
      ],
      styleItems: [
        {
          title: 'Lujo',
          description: 'Estancias cuidadas, servicio fluido y ritmo refinado.',
          url: '/styles/luxury',
        },
        {
          title: 'Familia',
          description: 'Rutas equilibradas y días fáciles para grupos de varias edades.',
          url: '/styles/family',
        },
        {
          title: 'Cultura',
          description: 'Patrimonio, gastronomía, historias y contexto.',
          url: '/styles/culture',
        },
        {
          title: 'Aventura',
          description: 'Un ritmo más activo con paisaje y movimiento.',
          url: '/styles/adventure',
        },
      ],
      packageItems: [
        {
          title: 'Vietnam esencial',
          description: 'Un marco multi-región para una primera visita.',
          url: '/packages/vietnam-highlights',
        },
        {
          title: 'Norte de Vietnam',
          description: 'Una ruta regional más enfocada en cultura y contraste escénico.',
          url: '/packages/northern-vietnam',
        },
        {
          title: 'Patrimonio central',
          description: 'Ruta patrimonial con ritmo más suave y más relato.',
          url: '/packages/central-heritage',
        },
      ],
      planningNotes: [
        {
          country: 'Reino Unido',
          name: 'Brief de ruta familiar',
          noteDate: '2026-07-02T00:00:00.000Z',
          quote:
            'Queremos que Vietnam sea fácil para abuelos y niños, con cultura pero sin demasiados cambios de hotel.',
          role: 'Nota de planificación de muestra',
        },
        {
          country: 'Italia',
          name: 'Brief cultural',
          noteDate: '2026-07-05T00:00:00.000Z',
          quote:
            'La ruta debe explicar por qué cada ciudad importa, no solo movernos entre paradas.',
          role: 'Nota de planificación de muestra',
        },
        {
          country: 'Australia',
          name: 'Brief de lujo pausado',
          noteDate: '2026-07-08T00:00:00.000Z',
          quote:
            'Nos importan menos transiciones, hosting fiable y hoteles que encajen con el ritmo del viaje.',
          role: 'Nota de planificación de muestra',
        },
        {
          country: 'España',
          name: 'Brief de gastronomía y patrimonio',
          noteDate: '2026-07-10T00:00:00.000Z',
          quote:
            'Queremos unir gastronomía local y patrimonio, con tiempo libre para disfrutar cada lugar.',
          role: 'Nota de planificación de muestra',
        },
        {
          country: 'Portugal',
          name: 'Brief de viaje pausado',
          noteDate: '2026-07-11T00:00:00.000Z',
          quote:
            'Preferimos estancias más largas y menos salidas tempranas, aunque veamos menos regiones.',
          role: 'Nota de planificación de muestra',
        },
        {
          country: 'Singapur',
          name: 'Brief de escapada privada',
          noteDate: '2026-07-12T00:00:00.000Z',
          quote:
            'Solo tenemos una semana y buscamos una ruta enfocada con traslados privados y contraste cultural.',
          role: 'Nota de planificación de muestra',
        },
        {
          country: 'Canadá',
          name: 'Brief de primera visita',
          noteDate: '2026-07-13T00:00:00.000Z',
          quote:
            'Es nuestra primera visita y queremos equilibrar lugares icónicos con experiencias tranquilas y personales.',
          role: 'Nota de planificación de muestra',
        },
        {
          country: 'Alemania',
          name: 'Brief de pareja activa',
          noteDate: '2026-07-14T00:00:00.000Z',
          quote:
            'Queremos caminar, pedalear y ver paisajes, con noches cómodas y sin sentir la ruta apresurada.',
          role: 'Nota de planificación de muestra',
        },
      ],
    },
    pt: {
      trustItems: [
        {
          label: 'CTA',
          description:
            'A página deve parecer pronta para um pedido à medida, não para um checkout retail.',
        },
        {
          label: 'Navegação',
          value: 'Destinos + estilo',
          description: 'Os utilizadores podem explorar o Vietname por lugar ou por tipo de viagem.',
        },
        {
          label: 'Papel de negócio',
          value: 'Inbound Vietnam',
          description: 'O site serve viajantes internacionais e conteúdo orientado para confiança.',
        },
        {
          label: 'SEO',
          value: 'Guia + destino',
          description: 'Guias e páginas de destino apoiam a descoberta antes do pedido.',
        },
      ],
      whyItems: [
        {
          title: 'Rotas desenhadas localmente',
          description:
            'Combinações de destinos e ritmo pensados segundo a experiência real no terreno.',
          meta: 'Local expertise',
        },
        {
          title: 'Planeamento flexível',
          description:
            'A experiência guia para personalização em vez de uma lógica de catálogo fechado.',
          meta: 'Flexible planning',
        },
        {
          title: 'Matching por estilo',
          description:
            'Luxo, família, cultura e aventura qualificam o pedido antes da primeira resposta humana.',
          meta: 'Style-led',
        },
      ],
      statsItems: [
        {
          label: 'Clusters de destino',
          value: '5+',
          description: 'North, Central, South, coastal and multi-region route frames.',
        },
        {
          label: 'Briefs por estilo',
          value: '6',
          description: 'Luxury, family, culture, adventure, honeymoon and wellness.',
        },
        {
          label: 'Estruturas de rota',
          value: '3',
          description: 'Vietname essencial, Norte do Vietname e Património central.',
        },
        {
          label: 'Idiomas públicos',
          value: '5',
          description: 'Vietnamita, inglês, italiano, espanhol e português.',
        },
      ],
      styleItems: [
        {
          title: 'Luxo',
          description: 'Estadias cuidadas, serviço fluido e ritmo refinado.',
          url: '/styles/luxury',
        },
        {
          title: 'Família',
          description: 'Rotas equilibradas e dias fluidos para grupos de várias idades.',
          url: '/styles/family',
        },
        {
          title: 'Cultura',
          description: 'Património, gastronomia, histórias e contexto.',
          url: '/styles/culture',
        },
        {
          title: 'Aventura',
          description: 'Um ritmo mais ativo com paisagem e movimento.',
          url: '/styles/adventure',
        },
      ],
      packageItems: [
        {
          title: 'Vietname essencial',
          description: 'Um enquadramento multi-região para uma primeira visita.',
          url: '/packages/vietnam-highlights',
        },
        {
          title: 'Norte do Vietname',
          description: 'Uma rota regional mais focada em cultura e contraste cénico.',
          url: '/packages/northern-vietnam',
        },
        {
          title: 'Património central',
          description: 'Rota patrimonial com ritmo mais suave e mais narrativa.',
          url: '/packages/central-heritage',
        },
      ],
      planningNotes: [
        {
          country: 'Reino Unido',
          name: 'Brief de rota familiar',
          noteDate: '2026-07-02T00:00:00.000Z',
          quote:
            'Queremos que o Vietname seja fácil para avós e crianças, com cultura mas sem demasiadas mudanças de hotel.',
          role: 'Nota de planeamento de exemplo',
        },
        {
          country: 'Itália',
          name: 'Brief cultural',
          noteDate: '2026-07-05T00:00:00.000Z',
          quote:
            'A rota deve explicar porque cada cidade importa, não apenas mover-nos entre paragens.',
          role: 'Nota de planeamento de exemplo',
        },
        {
          country: 'Austrália',
          name: 'Brief de luxo pausado',
          noteDate: '2026-07-08T00:00:00.000Z',
          quote:
            'Valorizamos menos transições, acolhimento fiável e hotéis alinhados com o ritmo da viagem.',
          role: 'Nota de planeamento de exemplo',
        },
        {
          country: 'Espanha',
          name: 'Brief de gastronomia e património',
          noteDate: '2026-07-10T00:00:00.000Z',
          quote:
            'Queremos ligar gastronomia local e património, com tempo livre para desfrutar de cada lugar.',
          role: 'Nota de planeamento de exemplo',
        },
        {
          country: 'Portugal',
          name: 'Brief de viagem lenta',
          noteDate: '2026-07-11T00:00:00.000Z',
          quote:
            'Preferimos estadias mais longas e menos partidas cedo, mesmo visitando menos regiões.',
          role: 'Nota de planeamento de exemplo',
        },
        {
          country: 'Singapura',
          name: 'Brief de escapadinha privada',
          noteDate: '2026-07-12T00:00:00.000Z',
          quote:
            'Temos apenas uma semana e procuramos uma rota focada com transfers privados e contraste cultural.',
          role: 'Nota de planeamento de exemplo',
        },
        {
          country: 'Canadá',
          name: 'Brief de primeira visita',
          noteDate: '2026-07-13T00:00:00.000Z',
          quote:
            'É a nossa primeira visita e queremos equilibrar lugares icónicos com experiências tranquilas e pessoais.',
          role: 'Nota de planeamento de exemplo',
        },
        {
          country: 'Alemanha',
          name: 'Brief de casal ativo',
          noteDate: '2026-07-14T00:00:00.000Z',
          quote:
            'Queremos caminhadas, bicicleta e paisagem, com noites confortáveis e sem uma rota apressada.',
          role: 'Nota de planeamento de exemplo',
        },
      ],
    },
  }

  for (const locale of ['it', 'es', 'pt'] as const) {
    const copy = localizedHomeTranslations[locale]
    const blockCopy = localizedHomeBlockCopy[locale]

    await updatePageLocale(payload, req, homePage.id, locale, {
      title: copy.title,
      hero: {
        type: 'highImpact',
        presentationMode: 'inherit',
        variant: 'planner',
        media: heroImage.id,
        slides: [
          {
            eyebrow: copy.heroEyebrow,
            title: copy.heading,
            description: copy.paragraph,
            media: heroImage.id,
            links: [copy.links[0]],
          },
          {
            eyebrow: copy.slideDestinationEyebrow,
            title: copy.slideDestinationTitle,
            description: copy.slideDestinationDescription,
            media: secondaryImage.id,
            links: [copy.links[1]],
          },
          {
            eyebrow: copy.slideStyleEyebrow,
            title: copy.slideStyleTitle,
            description: copy.slideStyleDescription,
            media: travelStylesImage.id,
            links: [linkItem(copy.stylesTitle, '/styles', 'outline')],
          },
        ],
        links: copy.links,
        richText: richText(copy.heading, copy.paragraph, 'h1'),
      },
      layout: [
        featureGridBlock(
          copy.trustTitle,
          copy.trustDescription,
          blockCopy.trustItems.map((item, index) => ({
            description: item.description,
            title: index === 0 ? copy.links[0].link.label : item.value || item.label,
            url: ['/plan-your-trip', '/destinations', '/about-us', '/posts'][index],
          })),
          'default',
          copy.trustEyebrow,
          'icon-grid',
          copy.exploreLabel,
        ),
        featureGridBlock(
          copy.whyTitle,
          copy.whyDescription,
          blockCopy.whyItems.map((item, index) => ({
            ...item,
            imageID:
              index === 0
                ? secondaryImage.id
                : index === 1
                  ? sampleItinerariesImage.id
                  : travelStylesImage.id,
          })),
          'highlight',
          copy.whyEyebrow,
          'bento',
        ),
        statsBlock(
          copy.statsTitle,
          copy.statsDescription,
          blockCopy.statsItems,
          'logo-proof',
          copy.statsEyebrow,
        ),
        featureGridBlock(
          copy.destinationsTitle,
          copy.destinationsDescription,
          [
            {
              title: 'Ha Noi',
              description: 'City heritage, food, and North Vietnam gateway logic.',
              imageID: secondaryImage.id,
              meta: 'North Vietnam',
              url: '/destinations/ha-noi',
            },
            {
              title: 'Ha Long',
              description: 'Cruise contrast and seascape rhythm for sample itineraries.',
              imageID: secondaryImage.id,
              meta: 'Bay and cruise',
              url: '/destinations/ha-long',
            },
            {
              title: 'Hoi An',
              description: 'Heritage atmosphere and softer evening pacing.',
              imageID: secondaryImage.id,
              meta: 'Central heritage',
              url: '/destinations/hoi-an',
            },
            {
              title: 'Hue',
              description: 'Imperial depth and cultural structure.',
              imageID: secondaryImage.id,
              meta: 'Historic city',
              url: '/destinations/hue',
            },
            {
              title: 'Mekong',
              description: 'Southern waterways and local-life contrast.',
              imageID: secondaryImage.id,
              meta: 'Southern Vietnam',
              url: '/destinations/mekong',
            },
          ],
          'default',
          copy.destinationsEyebrow,
          'icon-grid',
          copy.exploreLabel,
        ),
        featureGridBlock(
          copy.stylesTitle,
          copy.stylesDescription,
          blockCopy.styleItems.map((item) => ({
            ...item,
            imageID: travelStylesImage.id,
            meta: 'Travel style',
          })),
          'minimal',
          copy.stylesEyebrow,
          'icon-grid',
          copy.exploreLabel,
        ),
        featureGridBlock(
          copy.packagesTitle,
          copy.packagesDescription,
          blockCopy.packageItems.map((item) => ({
            ...item,
            imageID: sampleItinerariesImage.id,
            meta: 'Sample package',
          })),
          'default',
          copy.packagesEyebrow,
          'alternating',
          copy.exploreLabel,
        ),
        testimonialBlock(
          copy.planningNotesTitle,
          copy.planningNotesDescription,
          blockCopy.planningNotes,
          'carousel',
          copy.planningNotesEyebrow,
        ),
        ctaBlock(copy.ctaTitle, copy.ctaDescription, [copy.links[0]]),
      ],
      relatedPages: [
        destinationHub.id,
        styleHub.id,
        packagesHub.id,
        planTripPage.id,
        aboutPage.id,
        travelGuidePage.id,
        testimonialsPage.id,
        contactPage.id,
      ],
      meta: {
        title: copy.meta,
        description: copy.paragraph,
        image: heroImage.id,
      },
    })
  }

  await updateLocalizedCorePage({
    pageID: destinationHub.id,
    image: secondaryImage.id,
    links: [
      linkItem('Plan your trip', '/plan-your-trip'),
      linkItem('Packages', '/packages', 'outline'),
    ],
    translations: {
      it: {
        title: 'Destinazioni',
        heading: 'Scopri il Vietnam per destinazione',
        links: [
          linkItem('Pianifica il viaggio', '/plan-your-trip'),
          linkItem('Itinerari', '/packages', 'outline'),
        ],
        paragraph:
          'Una guida editoriale per capire il ruolo di Hanoi, Ha Long, Hue, Hoi An e Mekong dentro un itinerario inbound.',
        section: 'Dalla mappa alla rotta',
        sideTitle: 'Scegli prima le regioni',
        sideBody:
          'La selezione delle destinazioni guida ritmo, hotel, trasferimenti e livello di contesto culturale.',
        body: 'Questa pagina aiuta a scegliere le regioni giuste prima di parlare di hotel, trasferimenti e ritmo giornaliero.',
        meta: 'Destinazioni Vietnam',
      },
      es: {
        title: 'Destinos',
        heading: 'Explora Vietnam por destino',
        links: [
          linkItem('Planifica tu viaje', '/plan-your-trip'),
          linkItem('Itinerarios', '/packages', 'outline'),
        ],
        paragraph:
          'Una guía editorial para entender el papel de Hanoi, Ha Long, Hue, Hoi An y Mekong dentro de un itinerario inbound.',
        section: 'Del mapa a la ruta',
        sideTitle: 'Elige primero las regiones',
        sideBody:
          'La selección de destinos orienta ritmo, hoteles, traslados y profundidad cultural.',
        body: 'Esta página ayuda a elegir las regiones adecuadas antes de hablar de hoteles, traslados y ritmo diario.',
        meta: 'Destinos de Vietnam',
      },
      pt: {
        title: 'Destinos',
        heading: 'Explore o Vietname por destino',
        links: [
          linkItem('Planear a viagem', '/plan-your-trip'),
          linkItem('Itinerários', '/packages', 'outline'),
        ],
        paragraph:
          'Um guia editorial para entender o papel de Hanoi, Ha Long, Hue, Hoi An e Mekong num itinerário inbound.',
        section: 'Do mapa à rota',
        sideTitle: 'Escolha primeiro as regiões',
        sideBody: 'A seleção de destinos orienta ritmo, hotéis, transfers e profundidade cultural.',
        body: 'Esta página ajuda a escolher as regiões certas antes de falar de hotéis, transfers e ritmo diário.',
        meta: 'Destinos do Vietname',
      },
    },
  })

  await updateLocalizedCorePage({
    pageID: styleHub.id,
    image: travelStylesImage.id,
    links: [linkItem('Luxury', '/styles/luxury'), linkItem('Family', '/styles/family', 'outline')],
    translations: {
      it: {
        title: 'Stili di viaggio',
        heading: 'Gli stili di viaggio aiutano a qualificare il percorso',
        links: [
          linkItem('Lusso', '/styles/luxury'),
          linkItem('Famiglia', '/styles/family', 'outline'),
        ],
        paragraph:
          'Luxury, famiglia, cultura e avventura chiariscono ritmo, comfort e profondità prima della proposta.',
        section: 'Prima lo stile, poi il dettaglio',
        sideTitle: 'Un brief più chiaro',
        sideBody:
          'Lo stile di viaggio aiuta il team a capire comfort, intensità e aspettative prima di costruire la rotta.',
        body: 'Lo stile consente al team di capire aspettative, livello di servizio e intensità delle giornate senza forzare un pacchetto fisso.',
        meta: 'Stili di viaggio in Vietnam',
      },
      es: {
        title: 'Estilos de viaje',
        heading: 'Los estilos de viaje ayudan a definir la ruta',
        links: [
          linkItem('Lujo', '/styles/luxury'),
          linkItem('Familia', '/styles/family', 'outline'),
        ],
        paragraph:
          'Lujo, familia, cultura y aventura aclaran ritmo, comodidad y profundidad antes de preparar la propuesta.',
        section: 'Primero el estilo, luego el detalle',
        sideTitle: 'Un brief más claro',
        sideBody:
          'El estilo de viaje ayuda al equipo a entender comodidad, intensidad y expectativas antes de construir la ruta.',
        body: 'El estilo permite al equipo entender expectativas, nivel de servicio e intensidad diaria sin forzar un paquete fijo.',
        meta: 'Estilos de viaje en Vietnam',
      },
      pt: {
        title: 'Estilos de viagem',
        heading: 'Os estilos de viagem ajudam a qualificar a rota',
        links: [
          linkItem('Luxo', '/styles/luxury'),
          linkItem('Família', '/styles/family', 'outline'),
        ],
        paragraph:
          'Luxo, família, cultura e aventura clarificam ritmo, conforto e profundidade antes da proposta.',
        section: 'Primeiro o estilo, depois o detalhe',
        sideTitle: 'Um brief mais claro',
        sideBody:
          'O estilo de viagem ajuda a equipa a entender conforto, intensidade e expectativas antes de construir a rota.',
        body: 'O estilo permite à equipa entender expectativas, nível de serviço e intensidade diária sem impor um pacote fixo.',
        meta: 'Estilos de viagem no Vietname',
      },
    },
  })

  await updateLocalizedCorePage({
    pageID: packagesHub.id,
    image: sampleItinerariesImage.id,
    links: [
      linkItem('Plan your trip', '/plan-your-trip'),
      linkItem('Contact us', '/contact-us', 'outline'),
    ],
    translations: {
      it: {
        title: 'Pacchetti Vietnam',
        heading: 'Itinerari esempio, non cataloghi rigidi',
        links: [
          linkItem('Pianifica il viaggio', '/plan-your-trip'),
          linkItem('Contatti', '/contact-us', 'outline'),
        ],
        paragraph:
          'Le proposte mostrano possibilità concrete e poi portano verso personalizzazione e consulenza.',
        section: 'Come leggere gli itinerari',
        sideTitle: 'Base da personalizzare',
        sideBody:
          'Ogni itinerario mostra una struttura possibile, poi viene adattato a stagione, comfort e ritmo del gruppo.',
        body: 'Ogni pacchetto è una base: durata, hotel, ordine delle tappe e servizi aggiuntivi possono essere adattati al gruppo.',
        meta: 'Itinerari Vietnam di esempio',
      },
      es: {
        title: 'Paquetes Vietnam',
        heading: 'Itinerarios de ejemplo, no catálogos rígidos',
        links: [
          linkItem('Planifica tu viaje', '/plan-your-trip'),
          linkItem('Contacto', '/contact-us', 'outline'),
        ],
        paragraph:
          'Las propuestas muestran posibilidades concretas y después llevan hacia personalización y asesoría.',
        section: 'Cómo leer los itinerarios',
        sideTitle: 'Base para personalizar',
        sideBody:
          'Cada itinerario muestra una estructura posible y después se adapta a temporada, comodidad y ritmo del grupo.',
        body: 'Cada paquete es una base: duración, hoteles, orden de la ruta y servicios adicionales pueden adaptarse al grupo.',
        meta: 'Itinerarios de Vietnam de ejemplo',
      },
      pt: {
        title: 'Pacotes Vietname',
        heading: 'Itinerários de exemplo, não catálogos rígidos',
        links: [
          linkItem('Planear a viagem', '/plan-your-trip'),
          linkItem('Contacto', '/contact-us', 'outline'),
        ],
        paragraph:
          'As propostas mostram possibilidades concretas e depois conduzem à personalização e consultoria.',
        section: 'Como ler os itinerários',
        sideTitle: 'Base para personalizar',
        sideBody:
          'Cada itinerário mostra uma estrutura possível e depois adapta-se à época, conforto e ritmo do grupo.',
        body: 'Cada pacote é uma base: duração, hotéis, ordem da rota e serviços adicionais podem ser adaptados ao grupo.',
        meta: 'Itinerários de exemplo no Vietname',
      },
    },
  })

  await updateLocalizedCorePage({
    pageID: planTripPage.id,
    image: heroImage.id,
    links: [
      linkItem('Contact us', '/contact-us'),
      linkItem('Destinations', '/destinations', 'outline'),
    ],
    translations: {
      it: {
        title: 'Pianifica il viaggio',
        heading: 'Pianifica il tuo viaggio in Vietnam con un team locale',
        links: [
          linkItem('Contatti', '/contact-us'),
          linkItem('Destinazioni', '/destinations', 'outline'),
        ],
        paragraph:
          'Invia mese, gruppo, destinazioni e stile preferito per ricevere una direzione di itinerario su misura.',
        section: 'Cosa inviare',
        sideTitle: 'Non serve un itinerario completo',
        sideBody:
          'Bastano periodo, gruppo, interessi e livello di comfort per iniziare una conversazione utile.',
        body: 'Non serve un programma completo. Bastano periodo, numero di viaggiatori, interessi e livello di comfort desiderato.',
        meta: 'Pianifica viaggio Vietnam',
      },
      es: {
        title: 'Planifica tu viaje',
        heading: 'Planifica tu viaje a Vietnam con un equipo local',
        links: [
          linkItem('Contacto', '/contact-us'),
          linkItem('Destinos', '/destinations', 'outline'),
        ],
        paragraph:
          'Envía mes, grupo, destinos y estilo preferido para recibir una dirección de itinerario a medida.',
        section: 'Qué enviar',
        sideTitle: 'No necesitas un itinerario completo',
        sideBody:
          'Fechas aproximadas, grupo, intereses y nivel de comodidad bastan para iniciar una conversación útil.',
        body: 'No necesitas un programa completo. Bastan fechas aproximadas, número de viajeros, intereses y nivel de comodidad esperado.',
        meta: 'Planificar viaje a Vietnam',
      },
      pt: {
        title: 'Planear a viagem',
        heading: 'Planeie a sua viagem ao Vietname com uma equipa local',
        links: [
          linkItem('Contacto', '/contact-us'),
          linkItem('Destinos', '/destinations', 'outline'),
        ],
        paragraph:
          'Envie mês, grupo, destinos e estilo preferido para receber uma direção de itinerário à medida.',
        section: 'O que enviar',
        sideTitle: 'Não precisa de um itinerário completo',
        sideBody:
          'Período aproximado, grupo, interesses e nível de conforto bastam para iniciar uma conversa útil.',
        body: 'Não precisa de um programa completo. Bastam período aproximado, número de viajantes, interesses e nível de conforto esperado.',
        meta: 'Planear viagem ao Vietname',
      },
    },
  })

  await updateLocalizedCorePage({
    pageID: contactPage.id,
    image: heroImage.id,
    links: [
      linkItem('Plan your trip', '/plan-your-trip'),
      linkItem('Destinations', '/destinations', 'outline'),
    ],
    translations: {
      it: {
        title: 'Contatti',
        heading: 'Raccontaci che viaggio in Vietnam vuoi costruire',
        links: [
          linkItem('Pianifica il viaggio', '/plan-your-trip'),
          linkItem('Destinazioni', '/destinations', 'outline'),
        ],
        paragraph:
          'Il contatto è l’inizio della pianificazione: destinazioni, stile, periodo e gruppo guidano la risposta.',
        section: 'Dopo la richiesta',
        sideTitle: 'Dal brief alla proposta',
        sideBody:
          'La risposta parte da destinazioni, stile, periodo e gruppo, non da un catalogo fisso.',
        body: 'Il team legge il brief, valuta rotta e ritmo, poi risponde con una direzione utile invece di spingere un checkout standard.',
        meta: 'Contatti WingsSide',
      },
      es: {
        title: 'Contacto',
        heading: 'Cuéntanos qué viaje a Vietnam quieres construir',
        links: [
          linkItem('Planifica tu viaje', '/plan-your-trip'),
          linkItem('Destinos', '/destinations', 'outline'),
        ],
        paragraph:
          'El contacto es el inicio de la planificación: destinos, estilo, fechas y grupo orientan la respuesta.',
        section: 'Después de la solicitud',
        sideTitle: 'Del brief a la propuesta',
        sideBody: 'La respuesta parte de destinos, estilo, fechas y grupo, no de un catálogo fijo.',
        body: 'El equipo lee el brief, evalúa ruta y ritmo, y responde con una dirección útil en lugar de empujar un checkout estándar.',
        meta: 'Contacto WingsSide',
      },
      pt: {
        title: 'Contacto',
        heading: 'Conte-nos que viagem ao Vietname quer construir',
        links: [
          linkItem('Planear a viagem', '/plan-your-trip'),
          linkItem('Destinos', '/destinations', 'outline'),
        ],
        paragraph:
          'O contacto é o início do planeamento: destinos, estilo, datas e grupo orientam a resposta.',
        section: 'Depois do pedido',
        sideTitle: 'Do brief à proposta',
        sideBody: 'A resposta parte de destinos, estilo, datas e grupo, não de um catálogo fixo.',
        body: 'A equipa lê o brief, avalia rota e ritmo, e responde com uma direção útil em vez de forçar um checkout padrão.',
        meta: 'Contacto WingsSide',
      },
    },
  })

  const wingsSideSettings = await createSiteSettings(payload, req, site, siteSeed, heroImage.id, {
    footerNote:
      'WingsSide tập trung vào hành trình Việt Nam thiết kế riêng, kể chuyện theo điểm đến, phong cách du lịch và tư vấn theo nhu cầu thay vì một bảng tour bán sẵn.',
    headerNavItems: [
      linkItem('Trang chủ', '/'),
      linkItem('Điểm đến', '/destinations'),
      linkItem('Phong cách du lịch', '/styles'),
      linkItem('Gói Việt Nam', '/packages'),
      linkItem('Cẩm nang du lịch', '/travel-guide'),
      linkItem('Giới thiệu', '/about-us'),
      linkItem('Liên hệ', '/contact-us'),
    ],
    footerNavItems: [
      linkItem('Điểm đến', '/destinations'),
      linkItem('Lên kế hoạch', '/plan-your-trip'),
      linkItem('Cẩm nang du lịch', '/travel-guide'),
      linkItem('Liên hệ', '/contact-us'),
    ],
    logoImageID: null,
    supportEmail: 'hello@wingside.vn',
    supportPhone: '+84 903 000 222',
    tagline:
      'Thiết kế hành trình Việt Nam theo điểm đến, phong cách du lịch và tư vấn cá nhân hóa.',
  })

  await updateSiteSettingsLocale(payload, req, wingsSideSettings.id, 'en', {
    footerNote:
      'WingsSide focuses on inbound planning, destination storytelling, travel styles, and trip inquiry instead of a retail tour grid.',
    headerNavItems: [
      linkItem('Home', '/'),
      linkItem('Destinations', '/destinations'),
      linkItem('Travel Styles', '/styles'),
      linkItem('Vietnam Packages', '/packages'),
      linkItem('Travel Guide', '/travel-guide'),
      linkItem('About', '/about-us'),
      linkItem('Contact', '/contact-us'),
    ],
    footerNavItems: [
      linkItem('Destinations', '/destinations'),
      linkItem('Plan Your Trip', '/plan-your-trip'),
      linkItem('Travel Guide', '/travel-guide'),
      linkItem('Contact', '/contact-us'),
    ],
    seo: {
      defaultDescription: siteSeed.seoDescription,
      defaultTitle: siteSeed.name,
      titleSuffix: siteSeed.seoSuffix,
    },
    tagline:
      'Inbound Vietnam planning with destination-led discovery and consultative inquiry flow.',
  })

  await updateSiteSettingsLocale(payload, req, wingsSideSettings.id, 'it', {
    footerNote:
      'WingsSide si concentra su viaggi in Vietnam su misura, destinazioni, stili di viaggio e richieste personalizzate.',
    headerNavItems: [
      linkItem('Home', '/'),
      linkItem('Destinazioni', '/destinations'),
      linkItem('Stili di viaggio', '/styles'),
      linkItem('Pacchetti Vietnam', '/packages'),
      linkItem('Guida di viaggio', '/travel-guide'),
      linkItem('Chi siamo', '/about-us'),
      linkItem('Contatti', '/contact-us'),
    ],
    footerNavItems: [
      linkItem('Destinazioni', '/destinations'),
      linkItem('Pianifica', '/plan-your-trip'),
      linkItem('Guida', '/travel-guide'),
      linkItem('Contatti', '/contact-us'),
    ],
    seo: {
      defaultDescription:
        'WingsSide crea viaggi su misura in Vietnam con destinazioni curate, ritmo editoriale e consulenza locale.',
      defaultTitle: 'wingside.vn',
      titleSuffix: 'Vietnam su misura',
    },
    tagline: 'Viaggi in Vietnam su misura con destinazioni, stili e consulenza.',
  })

  await updateSiteSettingsLocale(payload, req, wingsSideSettings.id, 'es', {
    footerNote:
      'WingsSide se centra en viajes a Vietnam a medida, destinos, estilos de viaje y solicitudes personalizadas.',
    headerNavItems: [
      linkItem('Inicio', '/'),
      linkItem('Destinos', '/destinations'),
      linkItem('Estilos de viaje', '/styles'),
      linkItem('Paquetes Vietnam', '/packages'),
      linkItem('Guía de viaje', '/travel-guide'),
      linkItem('Nosotros', '/about-us'),
      linkItem('Contacto', '/contact-us'),
    ],
    footerNavItems: [
      linkItem('Destinos', '/destinations'),
      linkItem('Planifica', '/plan-your-trip'),
      linkItem('Guía', '/travel-guide'),
      linkItem('Contacto', '/contact-us'),
    ],
    seo: {
      defaultDescription:
        'WingsSide diseña viajes a Vietnam hechos a medida con destinos seleccionados, ritmo editorial y asesoría local.',
      defaultTitle: 'wingside.vn',
      titleSuffix: 'Vietnam a medida',
    },
    tagline: 'Viajes a medida por Vietnam con destinos, estilos y asesoría.',
  })

  await updateSiteSettingsLocale(payload, req, wingsSideSettings.id, 'pt', {
    footerNote:
      'A WingsSide foca-se em viagens ao Vietname feitas à medida, destinos, estilos de viagem e pedidos personalizados.',
    headerNavItems: [
      linkItem('Início', '/'),
      linkItem('Destinos', '/destinations'),
      linkItem('Estilos de viagem', '/styles'),
      linkItem('Pacotes Vietname', '/packages'),
      linkItem('Guia de viagem', '/travel-guide'),
      linkItem('Sobre', '/about-us'),
      linkItem('Contacto', '/contact-us'),
    ],
    footerNavItems: [
      linkItem('Destinos', '/destinations'),
      linkItem('Planear', '/plan-your-trip'),
      linkItem('Guia', '/travel-guide'),
      linkItem('Contacto', '/contact-us'),
    ],
    seo: {
      defaultDescription:
        'A WingsSide desenha viagens ao Vietname feitas à medida com destinos selecionados, ritmo editorial e consultoria local.',
      defaultTitle: 'wingside.vn',
      titleSuffix: 'Vietname sob medida',
    },
    tagline: 'Viagens à medida pelo Vietname com destinos, estilos e consultoria.',
  })

  if (process.env.SKIP_WINGSSIDE_LOCALE_BACKFILL !== 'true') {
    await backfillWingsSideLocales(payload, req)
  }

  await createRedirect(payload, req, '/wingsside/about', '/wingsside/about-us')
  await createRedirect(payload, req, '/wingsside/contact', '/wingsside/contact-us')
  await createRedirect(
    payload,
    req,
    '/wingsside/destinations/ha-long-bay',
    '/wingsside/destinations/ha-long',
  )
}

async function seedWingsPass(payload: Payload, req: PayloadRequest, siteSeed: SiteSeed) {
  const site = await upsertSite(payload, req, siteSeed)
  await clearSiteContent(payload, req, site.id)

  const heroImage = await createMedia(
    payload,
    req,
    site.id,
    'WingsPass fast track airport service',
    'Fast Track service pricing',
    'Airport fast track service visual for pricing-first service pages.',
    path.join(seedAssetsDir, 'wingspass-fast-track-hero.png'),
  )

  const bookingForm = await createForm(
    payload,
    req,
    site.id,
    'WingsPass Booking Request',
    'Gửi yêu cầu đặt dịch vụ',
    'Đã nhận yêu cầu',
    'Đội WingsPass sẽ kiểm tra sân bay, chiều dịch vụ, số khách và phản hồi xác nhận.',
    [
      {
        blockName: 'full-name',
        blockType: 'text',
        name: 'full-name',
        label: 'Họ tên',
        required: true,
        width: 100,
      },
      {
        blockName: 'phone',
        blockType: 'text',
        name: 'phone',
        label: 'Số điện thoại',
        required: true,
        width: 100,
      },
      {
        blockName: 'airport',
        blockType: 'text',
        name: 'airport',
        label: 'Sân bay',
        required: true,
        width: 100,
      },
      {
        blockName: 'service-date',
        blockType: 'text',
        name: 'service-date',
        label: 'Ngày sử dụng',
        required: false,
        width: 100,
      },
      {
        blockName: 'message',
        blockType: 'textarea',
        name: 'message',
        label: 'Chi tiết chuyến bay / số khách',
        required: false,
        width: 100,
      },
    ],
  )

  const pricingPage = await createPage(payload, req, site.id, {
    title: 'Bảng giá Fast Track',
    slug: 'bang-gia',
    hero: {
      type: 'mediumImpact',
      media: heroImage.id,
      richText: richText(
        'Bảng giá Fast Track theo sân bay',
        'Giá cần được nhìn thấy sớm, theo sân bay, chiều dịch vụ, nhóm khách và ghi chú điều kiện áp dụng.',
        'h1',
      ),
    },
    layout: [
      pricingTableBlock(
        'Bảng giá tham khảo',
        'Bảng giá tham khảo theo sân bay, loại dịch vụ và điều kiện áp dụng để team sales có thể chốt nhanh.',
        [
          {
            title: 'Nội Bài Fast Track',
            subtitle: 'Nhập cảnh / Xuất cảnh',
            departure: 'HAN',
            airline: 'All airlines',
            price: 'từ 650.000đ/khách',
            note: 'Áp dụng nhóm cá nhân và đoàn nhỏ; phụ thu theo khung giờ cao điểm nếu có.',
          },
          {
            title: 'Tân Sơn Nhất Fast Track',
            subtitle: 'Arrival / Departure',
            departure: 'SGN',
            airline: 'All airlines',
            price: 'từ 750.000đ/khách',
            note: 'Ưu tiên xác nhận mã chuyến bay, giờ đáp/cất cánh và số khách.',
          },
          {
            title: 'Đà Nẵng Fast Track',
            subtitle: 'International terminal',
            departure: 'DAD',
            airline: 'All airlines',
            price: 'từ 700.000đ/khách',
            note: 'Phù hợp khách inbound, đoàn tour và khách gia đình cần hỗ trợ nhanh.',
          },
          {
            title: 'Phú Quốc Fast Track',
            subtitle: 'Inbound leisure',
            departure: 'PQC',
            airline: 'All airlines',
            price: 'từ 700.000đ/khách',
            note: 'Có thể bán kèm gói inbound hoặc private tour.',
          },
        ],
        'Pricing-first',
      ),
      faqBlock(
        'Lưu ý khi đặt Fast Track',
        'Các điều kiện cần xác nhận trước khi chốt dịch vụ.',
        [
          {
            question: 'Cần gửi thông tin gì để giữ dịch vụ?',
            answer:
              'Cần sân bay, ngày giờ bay, mã chuyến bay, số khách, chiều nhập/xuất cảnh và yêu cầu hỗ trợ đặc biệt nếu có.',
          },
          {
            question: 'Giá có thay đổi không?',
            answer:
              'Giá có thể thay đổi theo sân bay, khung giờ, số lượng khách, phụ thu lễ/tết và yêu cầu add-on.',
          },
        ],
        'FAQ',
      ),
    ],
    meta: {
      title: 'Bảng giá Fast Track WingsPass',
      description: 'Bảng giá Fast Track theo sân bay, chiều dịch vụ và điều kiện áp dụng.',
      image: heroImage.id,
    },
  })

  const airportsPage = await createPage(payload, req, site.id, {
    title: 'Dịch vụ theo sân bay',
    slug: 'san-bay',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Chọn dịch vụ theo sân bay',
        'WingsPass cần cấu trúc rõ theo Nội Bài, Tân Sơn Nhất, Đà Nẵng và Phú Quốc để team vận hành cập nhật giá nhanh.',
        'h1',
      ),
    },
    layout: [
      featureGridBlock(
        'Sân bay phase 1',
        'Mỗi trang sân bay nên có dịch vụ áp dụng, lưu ý vận hành, add-on và CTA đặt dịch vụ.',
        [
          {
            title: 'Nội Bài',
            description:
              'Fast Track arrival/departure cho khách quốc tế, đoàn tour và khách doanh nhân.',
            meta: 'HAN',
            url: '/san-bay/noi-bai',
          },
          {
            title: 'Tân Sơn Nhất',
            description: 'Sân bay ưu tiên về volume, cần bảng giá và điều kiện rõ.',
            meta: 'SGN',
            url: '/san-bay/tan-son-nhat',
          },
          {
            title: 'Đà Nẵng',
            description: 'Phù hợp inbound miền Trung và gói du lịch gia đình/cao cấp.',
            meta: 'DAD',
            url: '/san-bay/da-nang',
          },
          {
            title: 'Phú Quốc',
            description: 'Kết nối resort, private journey và inbound leisure.',
            meta: 'PQC',
            url: '/san-bay/phu-quoc',
          },
        ],
        'default',
        'Airport taxonomy',
      ),
    ],
    meta: {
      title: 'Dịch vụ Fast Track theo sân bay',
      description: 'Danh sách sân bay và dịch vụ Fast Track WingsPass phase 1.',
      image: heroImage.id,
    },
  })

  const addOnPage = await createPage(payload, req, site.id, {
    title: 'Add-on dịch vụ',
    slug: 'add-on',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Add-on cho hành trình mượt hơn',
        'Fast Track có thể bán độc lập hoặc bán kèm inbound/private package như yêu cầu khách hàng đã nêu.',
        'h1',
      ),
    },
    layout: [
      featureGridBlock(
        'Add-on cần quản trị được trong CMS',
        'Các add-on nên nằm thành dữ liệu có cấu trúc để Content Manager cập nhật mà không sửa code.',
        [
          {
            title: 'Meet & Assist',
            description:
              'Nhân sự hỗ trợ đón khách, hướng dẫn luồng ưu tiên và kết nối phương tiện.',
            meta: 'Concierge',
          },
          {
            title: 'VIP lounge',
            description: 'Thông tin phòng chờ, điều kiện áp dụng và phụ thu theo sân bay.',
            meta: 'Lounge',
          },
          {
            title: 'Baggage support',
            description: 'Hỗ trợ hành lý cho khách gia đình, đoàn nhỏ hoặc khách cao cấp.',
            meta: 'Support',
          },
        ],
        'highlight',
        'Service add-ons',
      ),
    ],
    meta: {
      title: 'Add-on Fast Track WingsPass',
      description: 'Các dịch vụ add-on có thể bán kèm Fast Track hoặc package du lịch.',
      image: heroImage.id,
    },
  })

  const airportPageInputs = [
    {
      title: 'Fast Track Nội Bài',
      slug: 'noi-bai',
      summary:
        'Dịch vụ Fast Track tại Nội Bài cho khách nhập cảnh, xuất cảnh, đoàn tour và khách doanh nhân.',
      code: 'HAN',
    },
    {
      title: 'Fast Track Tân Sơn Nhất',
      slug: 'tan-son-nhat',
      summary:
        'Dịch vụ Fast Track tại Tân Sơn Nhất cho luồng arrival/departure volume cao, cần xác nhận mã chuyến bay và số khách.',
      code: 'SGN',
    },
    {
      title: 'Fast Track Đà Nẵng',
      slug: 'da-nang',
      summary:
        'Dịch vụ Fast Track tại Đà Nẵng cho khách inbound miền Trung, gia đình, đoàn nhỏ và gói du lịch cao cấp.',
      code: 'DAD',
    },
    {
      title: 'Fast Track Phú Quốc',
      slug: 'phu-quoc',
      summary:
        'Dịch vụ Fast Track tại Phú Quốc cho inbound leisure, resort trip và các gói bán kèm private/inbound.',
      code: 'PQC',
    },
  ]

  const airportPages = []

  for (const airport of airportPageInputs) {
    airportPages.push(
      await createPage(payload, req, site.id, {
        title: airport.title,
        slug: airport.slug,
        parentPage: airportsPage.id,
        hero: {
          type: 'mediumImpact',
          media: heroImage.id,
          richText: richText(airport.title, airport.summary, 'h1'),
        },
        layout: [
          infoStripBlock(
            `${airport.code} service notes`,
            'Trang sân bay phải giúp user hiểu dịch vụ áp dụng, thông tin cần cung cấp và add-on có thể bán kèm.',
            [
              {
                value: airport.code,
                label: 'Airport code',
                description: 'Dùng trong rate card và thao tác nội bộ.',
              },
              {
                value: 'Arrival / Departure',
                label: 'Direction',
                description: 'Cần xác nhận chiều dịch vụ khi booking.',
              },
              {
                value: 'Add-on',
                label: 'Service bundle',
                description: 'Có thể gắn Meet & Assist, lounge hoặc baggage support.',
              },
            ],
            'Airport detail',
          ),
          ctaBlock(
            `Cần đặt dịch vụ tại ${airport.code}?`,
            'Gửi mã chuyến bay, số khách và thời gian sử dụng để đội WingsPass kiểm tra khả dụng.',
            [linkItem('Gửi yêu cầu', '/contact')],
          ),
        ],
        meta: {
          title: airport.title,
          description: airport.summary,
          image: heroImage.id,
        },
      }),
    )
  }

  const faqPage = await createPage(payload, req, site.id, {
    title: 'FAQ WingsPass',
    slug: 'faq',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Câu hỏi thường gặp',
        'Giải thích ngắn, rõ điều kiện dịch vụ để giảm hỏi lại trước khi đặt.',
        'h1',
      ),
    },
    layout: [
      faqBlock('FAQ vận hành', 'Những câu hỏi phổ biến cần có sẵn trước khi công bố công khai.', [
        {
          question: 'Có cần đặt trước bao lâu?',
          answer:
            'Nên đặt sớm nhất có thể sau khi có mã chuyến bay; các khung giờ sát giờ bay cần xác nhận lại khả dụng.',
        },
        {
          question: 'Dịch vụ áp dụng cho đoàn không?',
          answer:
            'Có. Đội vận hành cần số lượng khách, quốc tịch, hành lý và thông tin trưởng đoàn để điều phối.',
        },
        {
          question: 'Có xuất hóa đơn hoặc VAT không?',
          answer:
            'Thông tin VAT/phụ thu cần được hiển thị trong rate card thật và xác nhận trước khi thanh toán.',
        },
      ]),
    ],
    meta: {
      title: 'FAQ WingsPass',
      description: 'Câu hỏi thường gặp về Fast Track và dịch vụ add-on WingsPass.',
      image: heroImage.id,
    },
  })

  const contactPage = await createPage(payload, req, site.id, {
    title: 'Liên hệ đặt Fast Track',
    slug: 'contact',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Gửi yêu cầu đặt dịch vụ',
        'Cung cấp sân bay, mã chuyến bay, số khách và ngày sử dụng để đội WingsPass báo lại nhanh.',
        'h1',
      ),
    },
    layout: [
      formBlock(
        bookingForm.id,
        'Thông tin đặt dịch vụ',
        'Form này mô phỏng đúng dữ liệu vận hành cần có khi chuyển từ rate card sang CMS.',
      ),
    ],
    meta: {
      title: 'Liên hệ WingsPass',
      description: 'Gửi yêu cầu đặt Fast Track theo sân bay và thông tin chuyến bay.',
      image: heroImage.id,
    },
  })

  await createPage(payload, req, site.id, {
    title: 'WingsPass',
    slug: 'home',
    hero: {
      type: 'highImpact',
      variant: 'utility',
      media: heroImage.id,
      links: [
        linkItem('Xem bảng giá', '/bang-gia', 'default'),
        linkItem('Liên hệ đặt dịch vụ', '/contact', 'outline'),
      ],
      richText: richText(
        'Fast Track rõ giá, rõ sân bay, đặt nhanh',
        'WingsPass là site utility-first cho dịch vụ sân bay, bảng giá, add-on và booking contact.',
        'h1',
      ),
    },
    layout: [
      pricingTableBlock(
        'Giá nổi bật cần thấy ngay',
        'Homepage WingsPass phải đưa pricing lên sớm thay vì giấu dưới nội dung cảm hứng du lịch.',
        [
          {
            title: 'Nội Bài',
            subtitle: 'Arrival / Departure',
            departure: 'HAN',
            price: 'từ 650.000đ',
            url: '/bang-gia',
          },
          {
            title: 'Tân Sơn Nhất',
            subtitle: 'Arrival / Departure',
            departure: 'SGN',
            price: 'từ 750.000đ',
            url: '/bang-gia',
          },
          {
            title: 'Đà Nẵng / Phú Quốc',
            subtitle: 'Inbound leisure',
            departure: 'DAD / PQC',
            price: 'từ 700.000đ',
            url: '/bang-gia',
          },
        ],
        'Fast price check',
      ),
      featureGridBlock(
        'Dịch vụ phase 1',
        'Bố cục ưu tiên kiểm tra giá, kiểm tra sân bay, hiểu add-on và liên hệ nhanh.',
        [
          {
            title: 'Bảng giá',
            description: 'Rate card theo sân bay, chiều dịch vụ, nhóm khách và phụ thu.',
            meta: 'Pricing',
            url: '/bang-gia',
          },
          {
            title: 'Sân bay',
            description: 'Nội Bài, Tân Sơn Nhất, Đà Nẵng, Phú Quốc.',
            meta: 'Airport',
            url: '/san-bay',
          },
          {
            title: 'Add-on',
            description: 'Meet & Assist, lounge, hành lý và hỗ trợ đoàn.',
            meta: 'Service',
            url: '/add-on',
          },
        ],
        'highlight',
        'Utility navigation',
      ),
      ctaBlock(
        'Cần giữ dịch vụ cho đoàn?',
        'Gửi mã chuyến bay, ngày sử dụng và số khách để đội WingsPass kiểm tra khả dụng.',
        [linkItem('Gửi yêu cầu', '/contact')],
      ),
    ],
    relatedPages: [
      pricingPage.id,
      airportsPage.id,
      ...airportPages.map((page) => page.id),
      addOnPage.id,
      faqPage.id,
      contactPage.id,
    ],
    meta: {
      title: 'WingsPass Fast Track',
      description: siteSeed.seoDescription,
      image: heroImage.id,
    },
  })

  const wingsPassSettings = await createSiteSettings(payload, req, site, siteSeed, heroImage.id, {
    footerNote: 'WingsPass ưu tiên bảng giá, sân bay, add-on và quy trình đặt dịch vụ rõ ràng.',
    headerNavItems: [
      linkItem('Trang chủ', '/'),
      linkItem('Bảng giá', '/bang-gia'),
      linkItem('Sân bay', '/san-bay'),
      linkItem('Add-on', '/add-on'),
      linkItem('FAQ', '/faq'),
      linkItem('Liên hệ', '/contact'),
    ],
    footerNavItems: [
      linkItem('Bảng giá', '/bang-gia'),
      linkItem('FAQ', '/faq'),
      linkItem('Liên hệ', '/contact'),
    ],
    supportEmail: 'booking@wingsgroup.vn',
    supportPhone: '+84 903 000 333',
  })

  await mirrorSiteContentToEnglish(payload, req, site.id)

  await updateSiteSettingsLocale(payload, req, wingsPassSettings.id, 'en', {
    footerNote:
      'WingsPass prioritizes clear airport Fast Track pricing, add-ons, and service booking flows.',
    headerNavItems: [
      linkItem('Home', '/'),
      linkItem('Pricing', '/bang-gia'),
      linkItem('Airports', '/san-bay'),
      linkItem('Add-ons', '/add-on'),
      linkItem('FAQ', '/faq'),
      linkItem('Contact', '/contact'),
    ],
    footerNavItems: [
      linkItem('Pricing', '/bang-gia'),
      linkItem('FAQ', '/faq'),
      linkItem('Contact', '/contact'),
    ],
    seo: {
      defaultDescription: siteSeed.seoDescription,
      defaultTitle: siteSeed.name,
      titleSuffix: siteSeed.seoSuffix,
    },
    tagline: 'Pricing-first airport Fast Track, add-ons, conditions, and service booking.',
  })
}

async function seedWingsPlus(payload: Payload, req: PayloadRequest, siteSeed: SiteSeed) {
  const site = await upsertSite(payload, req, siteSeed)
  await clearSiteContent(payload, req, site.id)

  const heroImage = await createMedia(
    payload,
    req,
    site.id,
    'WingsPlus private MICE proposal hero',
    'Premium private and MICE travel',
    'Premium visual for private tours, MICE, special markets, and high-value proposal flows.',
    path.join(seedAssetsDir, 'wingsplus-private-mice-hero.png'),
  )

  const proposalForm = await createForm(
    payload,
    req,
    site.id,
    'WingsPlus Proposal Request',
    'Gửi yêu cầu tư vấn',
    'Đã nhận brief',
    'Đội WingsPlus sẽ rà soát nhu cầu private/MICE và phản hồi hướng proposal phù hợp.',
    [
      {
        blockName: 'full-name',
        blockType: 'text',
        name: 'full-name',
        label: 'Họ tên',
        required: true,
        width: 100,
      },
      {
        blockName: 'company',
        blockType: 'text',
        name: 'company',
        label: 'Công ty / nhóm khách',
        required: false,
        width: 100,
      },
      {
        blockName: 'email',
        blockType: 'email',
        name: 'email',
        label: 'Email',
        required: true,
        width: 100,
      },
      {
        blockName: 'group-size',
        blockType: 'number',
        name: 'group-size',
        label: 'Số khách dự kiến',
        required: false,
        width: 100,
      },
      {
        blockName: 'brief',
        blockType: 'textarea',
        name: 'brief',
        label: 'Nhu cầu / ngân sách / thời gian',
        required: true,
        width: 100,
      },
    ],
  )

  const privatePage = await createPage(payload, req, site.id, {
    title: 'Tour riêng cao cấp',
    slug: 'private-tours',
    hero: {
      type: 'mediumImpact',
      media: heroImage.id,
      richText: richText(
        'Hành trình riêng thiết kế theo khách',
        'Nội dung private tour cần tạo cảm giác may đo, tuyển chọn và dẫn dắt bằng proposal thay vì catalog bán lẻ.',
        'h1',
      ),
    },
    layout: [
      featureGridBlock(
        'Năng lực tour riêng',
        'Các năng lực nên được trình bày như proof, không phải chỉ là danh sách dịch vụ.',
        [
          {
            title: 'Thiết kế tuyến riêng',
            description:
              'Thiết kế hành trình theo nhịp riêng, thời gian riêng và nhóm khách riêng.',
            meta: 'Lên kế hoạch',
          },
          {
            title: 'Lưu trú tuyển chọn',
            description:
              'Chọn khách sạn, resort, villa và trải nghiệm phù hợp mức dịch vụ mong muốn.',
            meta: 'Lưu trú',
          },
          {
            title: 'Hỗ trợ trong chuyến',
            description: 'Điều phối trước và trong chuyến để giảm rủi ro cho nhóm high-value.',
            meta: 'Vận hành',
          },
        ],
        'highlight',
        'Năng lực tour riêng',
      ),
    ],
    meta: {
      title: 'Tour riêng WingsPlus',
      description: 'Tour riêng và hành trình cao cấp được thiết kế theo yêu cầu riêng.',
      image: heroImage.id,
    },
  })

  const micePage = await createPage(payload, req, site.id, {
    title: 'MICE',
    slug: 'mice',
    hero: {
      type: 'mediumImpact',
      media: heroImage.id,
      richText: richText(
        'Chương trình MICE theo chuẩn proposal',
        'WingsPlus cần thể hiện năng lực điều phối đoàn, nhịp chương trình, nhà cung cấp và service level cho khách doanh nghiệp.',
        'h1',
      ),
    },
    layout: [
      infoStripBlock(
        'Tín hiệu triển khai MICE',
        'Khách doanh nghiệp cần thấy năng lực tổ chức trước khi gửi brief.',
        [
          {
            value: 'Agenda',
            label: 'Thiết kế chương trình',
            description: 'Lịch trình theo mục tiêu đoàn: incentive, meeting, gala, retreat.',
          },
          {
            value: 'Ops',
            label: 'Điều phối nhà cung cấp',
            description: 'Phối hợp hàng không, khách sạn, vận chuyển, venue và onsite support.',
          },
          {
            value: 'Risk',
            label: 'Phương án dự phòng',
            description: 'Chuẩn bị phương án backup cho đoàn và lịch trình có nhiều điểm chạm.',
          },
        ],
        'Du lịch doanh nghiệp',
      ),
    ],
    meta: {
      title: 'MICE WingsPlus',
      description: 'MICE, incentive và corporate travel programs cho đoàn doanh nghiệp.',
      image: heroImage.id,
    },
  })

  const specialMarketsPage = await createPage(payload, req, site.id, {
    title: 'Thị trường đặc biệt',
    slug: 'special-markets',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Thị trường đặc biệt và brief phức tạp',
        'Site cần đủ tin cậy cho các thị trường khó, long-haul, visa-heavy hoặc nhóm khách có yêu cầu đặc biệt.',
        'h1',
      ),
    },
    layout: [
      featureGridBlock(
        'Luồng proposal theo thị trường',
        'Các landing page có thể mở rộng theo thị trường hoặc loại đoàn.',
        [
          {
            title: 'Điểm đến long-haul',
            description: 'Europe, USA, Russia, South Africa hoặc các tuyến cần tư vấn sâu.',
            meta: 'Long-haul',
          },
          {
            title: 'Nhóm cần hỗ trợ visa',
            description: 'Nhóm cần định hướng hồ sơ, lịch trình và thời điểm chuẩn bị.',
            meta: 'Hỗ trợ visa',
          },
          {
            title: 'Đoàn high-value',
            description: 'Đoàn riêng cần service level, privacy và nhịp vận hành cao hơn.',
            meta: 'Đoàn riêng',
          },
        ],
        'default',
        'Thị trường đặc biệt',
      ),
    ],
    meta: {
      title: 'Thị trường đặc biệt WingsPlus',
      description: 'Thị trường đặc biệt, tuyến long-haul và nhóm khách giá trị cao của WingsPlus.',
      image: heroImage.id,
    },
  })

  const destinationsPage = await createPage(payload, req, site.id, {
    title: 'Điểm đến cao cấp',
    slug: 'destinations',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Điểm đến cao cấp nổi bật',
        'Các trang điểm đến giúp đội sales bắt đầu proposal từ một hướng travel rõ ràng.',
        'h1',
      ),
    },
    layout: [
      featureGridBlock(
        'Ví dụ điểm đến',
        'Dữ liệu seed cho các hướng private/MICE có thể mở thành page riêng.',
        [
          {
            title: 'Maldives',
            description: 'Resort cao cấp, honeymoon riêng tư và retreat khuyến thưởng trên đảo.',
            meta: 'Nghỉ dưỡng đảo',
            url: '/destinations/maldives',
          },
          {
            title: 'Châu Âu',
            description: 'Văn hóa long-haul, incentive và hành trình gia đình riêng.',
            meta: 'Long-haul',
            url: '/destinations/europe',
          },
          {
            title: 'Mỹ',
            description: 'Routing phức tạp, chuẩn bị visa, family travel và corporate travel.',
            meta: 'Thị trường đặc biệt',
            url: '/destinations/usa',
          },
          {
            title: 'Nga',
            description: 'Thị trường đặc biệt cần lớp tư vấn sâu và chuẩn bị kỹ hơn.',
            meta: 'Thị trường đặc biệt',
            url: '/destinations/russia',
          },
        ],
        'highlight',
        'Điểm đến premium',
      ),
    ],
    meta: {
      title: 'Điểm đến WingsPlus',
      description: 'Các hướng điểm đến cao cấp cho proposal tour riêng và MICE.',
      image: heroImage.id,
    },
  })

  const destinationPageInputs = [
    {
      enSummary:
        'Luxury resort, private honeymoon, island incentive retreat and high-touch beach escape planning.',
      enTitle: 'Maldives private journey',
      slug: 'maldives',
      summary:
        'Nghỉ dưỡng luxury resort, honeymoon riêng tư, incentive retreat trên đảo và hành trình biển cần high-touch service.',
      title: 'Maldives riêng tư',
      angle: 'Nghỉ dưỡng đảo cao cấp',
      enAngle: 'Island luxury',
    },
    {
      enSummary:
        'Long-haul culture, incentive travel, private family journeys and multi-country corporate routing.',
      enTitle: 'Europe private and MICE',
      slug: 'europe',
      summary:
        'Hành trình văn hóa long-haul, incentive travel, gia đình riêng và tuyến doanh nghiệp nhiều quốc gia.',
      title: 'Châu Âu private và MICE',
      angle: 'Long-haul',
      enAngle: 'Long-haul',
    },
    {
      enSummary:
        'Complex routing, visa-heavy planning, family travel and corporate group movement for the USA.',
      enTitle: 'USA special market',
      slug: 'usa',
      summary:
        'Tuyến Mỹ cần routing phức tạp, chuẩn bị visa, family travel và corporate group movement.',
      title: 'Mỹ special market',
      angle: 'Thị trường đặc biệt',
      enAngle: 'Special market',
    },
    {
      enSummary:
        'Special market travel requiring advisory depth, timing discipline and stronger proposal preparation.',
      enTitle: 'Russia special market',
      slug: 'russia',
      summary: 'Thị trường đặc biệt cần tư vấn sâu, kiểm soát timing và chuẩn bị proposal kỹ hơn.',
      title: 'Nga special market',
      angle: 'Thị trường đặc biệt',
      enAngle: 'Special market',
    },
  ]

  const destinationPages = []

  for (const destination of destinationPageInputs) {
    destinationPages.push(
      await createPage(payload, req, site.id, {
        title: destination.title,
        slug: destination.slug,
        parentPage: destinationsPage.id,
        hero: {
          type: 'mediumImpact',
          media: heroImage.id,
          richText: richText(destination.title, destination.summary, 'h1'),
        },
        layout: [
          infoStripBlock(
            `${destination.angle} cần lưu ý gì`,
            'Trang điểm đến cần cung cấp đủ ngôn ngữ định vị để sales bắt đầu một cuộc trao đổi proposal cao cấp.',
            [
              {
                value: 'Nhu cầu',
                label: 'Chân dung nhu cầu',
                description:
                  'Làm rõ loại khách, số lượng, thời gian, ngân sách và service level kỳ vọng.',
              },
              {
                value: 'Tuyến',
                label: 'Khung chương trình',
                description: 'Định hình nhịp tuyến trước khi xây proposal chi tiết.',
              },
              {
                value: 'Năng lực',
                label: 'Tín hiệu năng lực',
                description:
                  'Giải thích vì sao WingsPlus xử lý được brief giá trị cao hoặc phức tạp hơn.',
              },
            ],
            'Chi tiết điểm đến',
          ),
          ctaBlock(
            `Gửi yêu cầu cho ${destination.title}`,
            'Gửi điểm đến quan tâm, chân dung khách và thời gian dự kiến để WingsPlus chuẩn bị hướng proposal phù hợp.',
            [linkItem('Gửi yêu cầu tư vấn', '/request-proposal')],
          ),
        ],
        meta: {
          title: destination.title,
          description: destination.summary,
          image: heroImage.id,
        },
      }),
    )
  }

  const caseStudiesPage = await createPage(payload, req, site.id, {
    title: 'Năng lực dịch vụ',
    slug: 'nang-luc-dich-vu',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Chứng minh năng lực trước khi xin brief',
        'WingsPlus cần chứng minh năng lực planning, vận hành, supplier và risk control trước khi yêu cầu khách gửi brief chi tiết.',
        'h1',
      ),
    },
    layout: [
      infoStripBlock(
        'Điểm chứng minh năng lực',
        'Các điểm nhấn dưới đây mô tả năng lực triển khai thật của WingsPlus theo nhóm dịch vụ cốt lõi.',
        [
          {
            value: 'Tour riêng',
            label: 'Hành trình may đo',
            description: 'Hành trình riêng theo gia đình, nhóm bạn hoặc khách VIP.',
          },
          {
            value: 'MICE',
            label: 'Vận hành đoàn',
            description: 'Điều phối đoàn, venue, vận chuyển và lịch trình nhiều điểm chạm.',
          },
          {
            value: 'Hỗ trợ',
            label: 'Xử lý đầu cuối',
            description: 'Tư vấn trước chuyến, xử lý thay đổi và hỗ trợ trong chuyến.',
          },
        ],
        'Năng lực',
      ),
    ],
    meta: {
      title: 'Năng lực WingsPlus',
      description: 'Năng lực triển khai tour riêng, MICE và thị trường đặc biệt của WingsPlus.',
      image: heroImage.id,
    },
  })

  const proposalPage = await createPage(payload, req, site.id, {
    title: 'Gửi yêu cầu tư vấn',
    slug: 'request-proposal',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Gửi yêu cầu, nhận hướng đề xuất',
        'Form cần lấy số khách, loại nhu cầu, ngân sách, thời gian và yêu cầu đặc biệt để sales team phản hồi có chất lượng.',
        'h1',
      ),
    },
    layout: [
      formBlock(
        proposalForm.id,
        'Thông tin đề xuất',
        'Thông tin càng rõ, proposal càng sát nhu cầu tour riêng, MICE hoặc nhóm khách giá trị cao.',
      ),
    ],
    meta: {
      title: 'Gửi yêu cầu WingsPlus',
      description: 'Gửi yêu cầu tour riêng, MICE hoặc thị trường đặc biệt cho WingsPlus.',
      image: heroImage.id,
    },
  })

  const wingsPlusHomePage = await createPage(payload, req, site.id, {
    title: 'WingsPlus',
    slug: 'home',
    hero: {
      type: 'highImpact',
      variant: 'standard',
      media: heroImage.id,
      links: [
        linkItem('Gửi yêu cầu tư vấn', '/request-proposal', 'default'),
        linkItem('Xem năng lực', '/nang-luc-dich-vu', 'outline'),
      ],
      richText: richText(
        'Hành trình may đo cho nhu cầu giá trị cao',
        'Tour riêng, MICE, thị trường đặc biệt và chương trình long-haul được xây theo luồng đề xuất.',
        'h1',
      ),
    },
    layout: [
      featureGridBlock(
        'Chọn đúng hướng tư vấn',
        'Trang chủ WingsPlus nên ít card hơn, nhiều bằng chứng năng lực hơn và CTA gửi yêu cầu rõ ràng hơn.',
        [
          {
            title: 'Tour riêng',
            description:
              'Tuyến may đo, lưu trú tuyển chọn và nhịp hành trình linh hoạt cho khách riêng.',
            meta: 'Riêng tư',
            label: 'Xem thêm',
            url: '/private-tours',
          },
          {
            title: 'MICE',
            description:
              'Đoàn doanh nghiệp, chương trình khuyến thưởng, retreat, gala và di chuyển công vụ.',
            meta: 'Doanh nghiệp',
            label: 'Xem thêm',
            url: '/mice',
          },
          {
            title: 'Thị trường đặc biệt',
            description:
              'Tuyến đường dài, nhu cầu visa phức tạp, khách giá trị cao hoặc brief du lịch phức tạp.',
            meta: 'Đặc biệt',
            label: 'Xem thêm',
            url: '/special-markets',
          },
        ],
        'highlight',
        'Hướng tư vấn',
      ),
      infoStripBlock(
        'Vì sao đây không phải tour grid bán lẻ',
        'WingsPlus phải tạo cảm giác chuyên nghiệp và đáng tin cho deal giá trị cao.',
        [
          {
            value: 'Tư vấn',
            label: 'Tiếp nhận nhu cầu',
            description:
              'Bắt đầu bằng nhu cầu và context của khách, không bắt đầu bằng bảng giá đại trà.',
          },
          {
            value: 'Đề xuất',
            label: 'Định hình chương trình',
            description: 'Đội sales có đủ dữ liệu để gửi direction và cấu trúc hành trình phù hợp.',
          },
          {
            value: 'Vận hành',
            label: 'Chứng minh triển khai',
            description: 'Nội dung nhấn năng lực triển khai và kiểm soát rủi ro cho đoàn.',
          },
        ],
        'Quy trình premium',
      ),
      ctaBlock(
        'Sẵn sàng gửi yêu cầu tour riêng hoặc MICE?',
        'Gửi thông tin cốt lõi để đội ngũ chuẩn bị hướng đề xuất thay vì một bảng giá chung.',
        [linkItem('Gửi yêu cầu tư vấn', '/request-proposal')],
      ),
    ],
    relatedPages: [
      privatePage.id,
      micePage.id,
      specialMarketsPage.id,
      destinationsPage.id,
      ...destinationPages.map((page) => page.id),
      caseStudiesPage.id,
      proposalPage.id,
    ],
    meta: {
      title: 'WingsPlus',
      description: siteSeed.seoDescription,
      image: heroImage.id,
    },
  })

  await updatePageLocale(payload, req, privatePage.id, 'en', {
    title: 'Private Tours',
    hero: {
      type: 'mediumImpact',
      media: heroImage.id,
      richText: richText(
        'Private journeys designed around the guest',
        'Private tour content should feel bespoke, selective, and proposal-led rather than retail catalog.',
        'h1',
      ),
    },
    layout: [
      featureGridBlock(
        'Private tour capabilities',
        'The capabilities should read as proof, not just a generic service list.',
        [
          {
            title: 'Tailored routing',
            description:
              'Design the route around the guest rhythm, available time, and private group profile.',
            meta: 'Planning',
          },
          {
            title: 'Curated stays',
            description:
              'Select hotels, resorts, villas, and experiences that match the expected service level.',
            meta: 'Accommodation',
          },
          {
            title: 'On-trip support',
            description:
              'Coordinate before and during the journey to reduce risk for high-value groups.',
            meta: 'Operations',
          },
        ],
        'highlight',
        'Private capability',
      ),
    ],
  })

  await updatePageLocale(payload, req, micePage.id, 'en', {
    title: 'MICE',
    hero: {
      type: 'mediumImpact',
      media: heroImage.id,
      richText: richText(
        'MICE programs with proposal discipline',
        'WingsPlus needs to show capability in group movement, agenda rhythm, supplier coordination, and executive-level service.',
        'h1',
      ),
    },
    layout: [
      infoStripBlock(
        'MICE delivery signals',
        'Corporate clients need to see operational capability before sharing a detailed brief.',
        [
          {
            value: 'Agenda',
            label: 'Program design',
            description:
              'Build programs around incentive, meeting, gala, retreat, or business objectives.',
          },
          {
            value: 'Ops',
            label: 'Supplier coordination',
            description: 'Coordinate airlines, hotels, transport, venues, and onsite support.',
          },
          {
            value: 'Risk',
            label: 'Contingency planning',
            description: 'Prepare backup options for groups and schedules with many touchpoints.',
          },
        ],
        'Corporate travel',
      ),
    ],
  })

  await updatePageLocale(payload, req, specialMarketsPage.id, 'en', {
    title: 'Special Markets',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Special markets and complex travel briefs',
        'The site needs enough trust signals for difficult markets, long-haul programs, visa-heavy routing, or groups with special requirements.',
        'h1',
      ),
    },
    layout: [
      featureGridBlock(
        'Market-led proposal paths',
        'Landing pages can expand by market, destination, or group type.',
        [
          {
            title: 'Long-haul destinations',
            description:
              'Europe, USA, Russia, South Africa, or other routes that need deeper advisory.',
            meta: 'Long-haul',
          },
          {
            title: 'Visa-heavy groups',
            description:
              'Groups that need guidance on documentation, itinerary structure, and preparation timing.',
            meta: 'Visa support',
          },
          {
            title: 'High-value delegations',
            description:
              'Private delegations that need a higher service level, privacy, and operating rhythm.',
            meta: 'Delegation',
          },
        ],
        'default',
        'Special markets',
      ),
    ],
  })

  await updatePageLocale(payload, req, destinationsPage.id, 'en', {
    title: 'Destinations',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Featured premium destinations',
        'Destination pages help the sales team start each proposal from a clear travel direction.',
        'h1',
      ),
    },
    layout: [
      featureGridBlock(
        'Destination examples',
        'Seeded private and MICE directions that can expand into dedicated landing pages.',
        [
          {
            title: 'Maldives',
            description: 'Luxury resorts, private honeymoon, and island incentive retreats.',
            meta: 'Island luxury',
            label: 'Learn more',
            url: '/destinations/maldives',
          },
          {
            title: 'Europe',
            description: 'Long-haul culture, incentive programs, and private family journeys.',
            meta: 'Long-haul',
            label: 'Learn more',
            url: '/destinations/europe',
          },
          {
            title: 'USA',
            description:
              'Complex routing, visa preparation, family travel, and corporate movement.',
            meta: 'Special market',
            label: 'Learn more',
            url: '/destinations/usa',
          },
          {
            title: 'Russia',
            description:
              'Special-market planning that needs deeper advisory and stronger preparation.',
            meta: 'Special market',
            label: 'Learn more',
            url: '/destinations/russia',
          },
        ],
        'highlight',
        'Premium destinations',
      ),
    ],
  })

  for (const [index, destination] of destinationPageInputs.entries()) {
    const destinationPage = destinationPages[index]

    await updatePageLocale(payload, req, destinationPage.id, 'en', {
      title: destination.enTitle,
      hero: {
        type: 'mediumImpact',
        media: heroImage.id,
        richText: richText(destination.enTitle, destination.enSummary, 'h1'),
      },
      layout: [
        infoStripBlock(
          `${destination.enAngle} proposal cues`,
          'Destination detail pages should give sales enough positioning language to start a premium proposal conversation.',
          [
            {
              value: 'Brief',
              label: 'Need profile',
              description:
                'Clarify guest type, group size, timing, budget, and expected service level.',
            },
            {
              value: 'Route',
              label: 'Program shape',
              description: 'Frame the possible route rhythm before building a full proposal.',
            },
            {
              value: 'Proof',
              label: 'Capability signal',
              description:
                'Explain why WingsPlus can handle a higher-value or more complex request.',
            },
          ],
          'Destination detail',
        ),
        ctaBlock(
          `Build a proposal for ${destination.enTitle}`,
          'Send the destination interest, guest profile, and expected timing so WingsPlus can prepare a proposal direction.',
          [linkItem('Request proposal', '/request-proposal')],
        ),
      ],
    })
  }

  await updatePageLocale(payload, req, caseStudiesPage.id, 'en', {
    title: 'Capabilities',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Capability proof before proposal',
        'WingsPlus should prove planning, operations, supplier strength, and risk control before asking for a detailed brief.',
        'h1',
      ),
    },
    layout: [
      infoStripBlock(
        'Proof points',
        'These proof points describe WingsPlus delivery capability across the core service lines.',
        [
          {
            value: 'Private',
            label: 'Bespoke itineraries',
            description: 'Private journeys for families, friend groups, or VIP guests.',
          },
          {
            value: 'MICE',
            label: 'Group operations',
            description: 'Group coordination, venues, transport, and multi-touchpoint schedules.',
          },
          {
            value: 'Support',
            label: 'End-to-end handling',
            description: 'Pre-trip consultation, change handling, and support during the journey.',
          },
        ],
        'Capability',
      ),
    ],
  })

  await updatePageLocale(payload, req, proposalPage.id, 'en', {
    title: 'Request Proposal',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Share the brief, receive a proposal direction',
        'The form collects group size, need type, budget, timing, and special requirements so the sales team can respond with better context.',
        'h1',
      ),
    },
    layout: [
      formBlock(
        proposalForm.id,
        'Proposal brief',
        'The clearer the brief, the closer the proposal will be to the private, MICE, or high-value need.',
      ),
    ],
  })

  await updatePageLocale(payload, req, wingsPlusHomePage.id, 'en', {
    title: 'WingsPlus',
    hero: {
      type: 'highImpact',
      variant: 'standard',
      media: heroImage.id,
      links: [
        linkItem('Request proposal', '/request-proposal', 'default'),
        linkItem('Explore capabilities', '/nang-luc-dich-vu', 'outline'),
      ],
      richText: richText(
        'Tailored journeys for high-value travel needs',
        'Private tours, MICE, special markets, and long-haul programs built through a proposal-first workflow.',
        'h1',
      ),
    },
    layout: [
      featureGridBlock(
        'Choose the right proposal path',
        'The WingsPlus homepage should use fewer cards, stronger proof, and a clearer proposal CTA.',
        [
          {
            title: 'Private Tours',
            description: 'Bespoke routes, curated stays, and flexible pacing for private guests.',
            meta: 'Private',
            label: 'Learn more',
            url: '/private-tours',
          },
          {
            title: 'MICE',
            description: 'Corporate groups, incentive, retreat, gala, and business movement.',
            meta: 'Corporate',
            label: 'Learn more',
            url: '/mice',
          },
          {
            title: 'Special Markets',
            description: 'Long-haul, visa-heavy, high-value, or complex travel briefs.',
            meta: 'Special',
            label: 'Learn more',
            url: '/special-markets',
          },
        ],
        'highlight',
        'Proposal paths',
      ),
      infoStripBlock(
        'Why this is not a retail tour grid',
        'WingsPlus must feel professional and credible for high-value deals.',
        [
          {
            value: 'Brief',
            label: 'Consultative intake',
            description: 'Start from customer needs and context, not from a generic price list.',
          },
          {
            value: 'Plan',
            label: 'Proposal shaping',
            description:
              'Give the sales team enough data to send the right direction and itinerary structure.',
          },
          {
            value: 'Operate',
            label: 'Execution proof',
            description:
              'Emphasize operational capability and risk control for private or corporate groups.',
          },
        ],
        'Premium workflow',
      ),
      ctaBlock(
        'Ready to brief a private or MICE program?',
        'Send core details and the team will prepare a proposal direction instead of a generic price list.',
        [linkItem('Request proposal', '/request-proposal')],
      ),
    ],
  })

  const wingsPlusSettings = await createSiteSettings(payload, req, site, siteSeed, heroImage.id, {
    footerNote:
      'WingsPlus phục vụ private tours, MICE, special markets và các brief high-value cần proposal riêng.',
    headerNavItems: [
      linkItem('Trang chủ', '/'),
      linkItem('Tour riêng', '/private-tours'),
      linkItem('MICE', '/mice'),
      linkItem('Thị trường đặc biệt', '/special-markets'),
      linkItem('Điểm đến', '/destinations'),
      linkItem('Gửi yêu cầu', '/request-proposal'),
    ],
    footerNavItems: [
      linkItem('Năng lực', '/nang-luc-dich-vu'),
      linkItem('Gửi yêu cầu', '/request-proposal'),
      linkItem('Liên hệ', '/request-proposal'),
    ],
    supportEmail: 'proposal@wingsplus.vn',
    supportPhone: '+84 903 000 444',
    tagline: 'Proposal private, MICE và special-market cho nhu cầu du lịch high-value.',
  })

  await updateSiteSettingsLocale(payload, req, wingsPlusSettings.id, 'vi', {
    footerNote:
      'WingsPlus phục vụ private tours, MICE, special markets và các brief high-value cần proposal riêng.',
    headerNavItems: [
      linkItem('Trang chủ', '/'),
      linkItem('Tour riêng', '/private-tours'),
      linkItem('MICE', '/mice'),
      linkItem('Thị trường đặc biệt', '/special-markets'),
      linkItem('Điểm đến', '/destinations'),
      linkItem('Gửi yêu cầu', '/request-proposal'),
    ],
    footerNavItems: [
      linkItem('Năng lực', '/nang-luc-dich-vu'),
      linkItem('Gửi yêu cầu', '/request-proposal'),
      linkItem('Liên hệ', '/request-proposal'),
    ],
    seo: {
      defaultDescription:
        'Site premium cho tour riêng, MICE, thị trường đặc biệt, điểm đến long-haul và các brief du lịch giá trị cao.',
      defaultTitle: 'WingsPlus',
      titleSuffix: 'Private, MICE và Proposal',
    },
    tagline: 'Proposal private, MICE và special-market cho nhu cầu du lịch high-value.',
  })

  await updateSiteSettingsLocale(payload, req, wingsPlusSettings.id, 'en', {
    seo: {
      defaultDescription:
        'Premium site for private tours, MICE, special markets, long-haul destinations, and high-value travel proposals.',
      defaultTitle: 'WingsPlus',
      titleSuffix: 'Private, MICE and Proposal',
    },
    footerNote:
      'WingsPlus serves private tours, MICE, special markets, and high-value briefs that require a dedicated proposal.',
    headerNavItems: [
      linkItem('Home', '/'),
      linkItem('Private Tours', '/private-tours'),
      linkItem('MICE', '/mice'),
      linkItem('Special Markets', '/special-markets'),
      linkItem('Destinations', '/destinations'),
      linkItem('Request Proposal', '/request-proposal'),
    ],
    footerNavItems: [
      linkItem('Capabilities', '/nang-luc-dich-vu'),
      linkItem('Request Proposal', '/request-proposal'),
      linkItem('Contact', '/request-proposal'),
    ],
    tagline: 'Private, MICE, and special-market proposals for high-value travel needs.',
  })
}

async function seedWingsCare(payload: Payload, req: PayloadRequest, siteSeed: SiteSeed) {
  const site = await upsertSite(payload, req, siteSeed)
  await clearSiteContent(payload, req, site.id)

  const heroImage = await createMedia(
    payload,
    req,
    site.id,
    'WingsCare travel protection assistance',
    'Travel care and insurance support',
    'Trust-focused image for travel care, insurance, and post-sales assistance.',
    path.join(seedAssetsDir, 'wingscare-travel-care-hero.png'),
  )

  const supportForm = await createForm(
    payload,
    req,
    site.id,
    'WingsCare Support Request',
    'Gửi yêu cầu hỗ trợ',
    'Đã nhận yêu cầu hỗ trợ',
    'Đội WingsCare sẽ phân loại nhu cầu bảo hiểm, quyền lợi hoặc hỗ trợ sau bán.',
    [
      {
        blockName: 'full-name',
        blockType: 'text',
        name: 'full-name',
        label: 'Họ tên',
        required: true,
        width: 100,
      },
      {
        blockName: 'phone',
        blockType: 'text',
        name: 'phone',
        label: 'Số điện thoại',
        required: true,
        width: 100,
      },
      {
        blockName: 'policy-code',
        blockType: 'text',
        name: 'policy-code',
        label: 'Mã tour / mã hợp đồng / mã bảo hiểm nếu có',
        required: false,
        width: 100,
      },
      {
        blockName: 'message',
        blockType: 'textarea',
        name: 'message',
        label: 'Nội dung cần hỗ trợ',
        required: true,
        width: 100,
      },
    ],
  )

  const productsPageData = {
    title: 'Sản phẩm bảo hiểm',
    slug: 'san-pham-bao-hiem',
    hero: {
      type: 'mediumImpact',
      media: heroImage.id,
      richText: richText(
        'Travel protection products',
        'WingsCare cần trình bày sản phẩm bảo hiểm và phạm vi quyền lợi theo ngôn ngữ dễ hiểu.',
        'h1',
      ),
    },
    layout: [
      featureGridBlock(
        'Nhóm sản phẩm phase 1',
        'Nội dung mô tả các nhóm sản phẩm và luồng hỗ trợ chính trong giai đoạn launch.',
        [
          {
            title: 'Bảo hiểm du lịch outbound',
            description: 'Bảo vệ khách trong các chương trình Hàn, Nhật, Trung và long-haul.',
            meta: 'Outbound',
          },
          {
            title: 'Bảo hiểm cho khách quốc tế',
            description: 'Thông tin hỗ trợ khách quốc tế khi đi cùng WingsSide hoặc package riêng.',
            meta: 'Khách quốc tế',
          },
          {
            title: 'Hỗ trợ sau bán',
            description: 'Kênh hướng dẫn claim, hồ sơ, liên hệ và tình huống cần hỗ trợ.',
            meta: 'Care',
          },
        ],
        'highlight',
        'Protection products',
      ),
    ],
    meta: {
      title: 'Sản phẩm bảo hiểm WingsCare',
      description: 'Nhóm sản phẩm travel protection và hỗ trợ sau bán của WingsCare.',
      image: heroImage.id,
    },
  }
  const productsPage = await createPage(payload, req, site.id, productsPageData)
  await updatePageLocale(payload, req, productsPage.id, 'vi', productsPageData)
  const productsPageEnglishData = {
    title: 'Insurance Products',
    hero: {
      type: 'mediumImpact' as const,
      media: heroImage.id,
      richText: richText(
        'Travel protection products',
        'WingsCare presents insurance options and coverage scopes in plain language so travelers know what support is available before and after a trip.',
        'h1',
      ),
    },
    layout: [
      featureGridBlock(
        'Phase 1 product groups',
        'Launch content should explain the core product groups and support flows before detailed provider policies are connected.',
        [
          {
            title: 'Outbound travel insurance',
            description: 'Protection for Korea, Japan, China, and long-haul outbound programs.',
            meta: 'Outbound',
          },
          {
            title: 'Inbound and international guest cover',
            description:
              'Support information for international guests traveling with WingsSide or tailor-made packages.',
            meta: 'Inbound',
          },
          {
            title: 'Post-sales support',
            description:
              'Guidance for claims, documents, contact channels, and situations that need follow-up.',
            meta: 'Care',
          },
        ],
        'highlight',
        'Protection products',
      ),
    ],
    meta: {
      title: 'WingsCare Insurance Products',
      description: 'Travel protection product groups and post-sales support from WingsCare.',
      image: heroImage.id,
    },
  }

  const benefitsPageData = {
    title: 'Quyền lợi và phạm vi',
    slug: 'quyen-loi',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Quyền lợi cần đọc nhanh, dễ hiểu',
        'Travel care không nên dùng ngôn ngữ điều khoản quá nặng ở homepage; cần phân nhóm quyền lợi và hướng xử lý.',
        'h1',
      ),
    },
    layout: [
      infoStripBlock(
        'Nhóm quyền lợi cần chuẩn hóa',
        'Đây là cấu trúc nội dung để nhập điều khoản thật sau khi có provider/policy chính thức.',
        [
          {
            value: 'Medical',
            label: 'Chi phí y tế',
            description: 'Mô tả mức quyền lợi, điều kiện và ngoại lệ bằng ngôn ngữ dễ hiểu.',
          },
          {
            value: 'Trip',
            label: 'Sự cố chuyến đi',
            description: 'Delay, hủy chuyến, thất lạc hành lý hoặc thay đổi lịch trình.',
          },
          {
            value: 'Assist',
            label: 'Hỗ trợ khẩn cấp',
            description: 'Kênh liên hệ, quy trình phản hồi và thông tin cần chuẩn bị.',
          },
        ],
        'Benefits',
      ),
    ],
    meta: {
      title: 'Quyền lợi bảo hiểm WingsCare',
      description: 'Quyền lợi, phạm vi và hỗ trợ khẩn cấp cho khách du lịch.',
      image: heroImage.id,
    },
  }
  const benefitsPage = await createPage(payload, req, site.id, benefitsPageData)
  await updatePageLocale(payload, req, benefitsPage.id, 'vi', benefitsPageData)
  const benefitsPageEnglishData = {
    title: 'Benefits and Coverage',
    hero: {
      type: 'lowImpact' as const,
      richText: richText(
        'Benefits should be quick to understand',
        'Travel care pages should avoid heavy policy language at the top level. WingsCare groups benefits and next steps so customers can act quickly.',
        'h1',
      ),
    },
    layout: [
      infoStripBlock(
        'Benefit groups to standardize',
        'This structure is ready for official provider terms once policy details are finalized.',
        [
          {
            value: 'Medical',
            label: 'Medical expenses',
            description:
              'Explain benefit limits, conditions, and exclusions in customer-friendly language.',
          },
          {
            value: 'Trip',
            label: 'Trip incidents',
            description:
              'Delays, cancellations, lost luggage, or itinerary changes that may require support.',
          },
          {
            value: 'Assist',
            label: 'Emergency assistance',
            description:
              'Contact channels, response expectations, and information travelers should prepare.',
          },
        ],
        'Benefits',
      ),
    ],
    meta: {
      title: 'WingsCare Benefits and Coverage',
      description: 'Coverage groups, benefit scope, and emergency assistance for travelers.',
      image: heroImage.id,
    },
  }

  const claimsPageData = {
    title: 'Hướng dẫn yêu cầu hỗ trợ',
    slug: 'claim-support',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Biết cần làm gì khi có sự cố',
        'Trang này giúp giảm ma sát sau bán: cần chuẩn bị hồ sơ gì, liên hệ ai, kỳ vọng phản hồi như thế nào.',
        'h1',
      ),
    },
    layout: [
      featureGridBlock(
        'Quy trình hỗ trợ',
        'Cần viết rõ để khách không phải tìm thông tin trong nhiều kênh rời rạc.',
        [
          {
            title: '1. Ghi nhận sự cố',
            description: 'Thu thập thông tin chuyến đi, mã tour, thời điểm và mô tả tình huống.',
            meta: 'Intake',
          },
          {
            title: '2. Chuẩn bị hồ sơ',
            description: 'Hóa đơn, giấy xác nhận, boarding pass, biên bản hoặc tài liệu liên quan.',
            meta: 'Documents',
          },
          {
            title: '3. Theo dõi phản hồi',
            description: 'Cập nhật trạng thái và hướng xử lý từ đội hỗ trợ hoặc đối tác bảo hiểm.',
            meta: 'Follow-up',
          },
        ],
        'default',
        'Support flow',
      ),
    ],
    meta: {
      title: 'Claim support WingsCare',
      description: 'Hướng dẫn chuẩn bị hồ sơ và yêu cầu hỗ trợ sau bán.',
      image: heroImage.id,
    },
  }
  const claimsPage = await createPage(payload, req, site.id, claimsPageData)
  await updatePageLocale(payload, req, claimsPage.id, 'vi', claimsPageData)
  const claimsPageEnglishData = {
    title: 'Support Request Guide',
    hero: {
      type: 'lowImpact' as const,
      richText: richText(
        'Know what to do when something happens',
        'This page reduces post-sales friction by explaining what documents to prepare, who to contact, and what response timeline to expect.',
        'h1',
      ),
    },
    layout: [
      featureGridBlock(
        'Support process',
        'The process should be clear enough that customers do not have to search across multiple channels.',
        [
          {
            title: '1. Record the incident',
            description:
              'Collect trip details, tour code, timing, and a clear description of what happened.',
            meta: 'Intake',
          },
          {
            title: '2. Prepare documents',
            description:
              'Invoices, confirmations, boarding passes, reports, or other relevant documents.',
            meta: 'Documents',
          },
          {
            title: '3. Track the response',
            description:
              'Follow updates from the support team or insurance partner until the next step is clear.',
            meta: 'Follow-up',
          },
        ],
        'default',
        'Support flow',
      ),
    ],
    meta: {
      title: 'WingsCare Support Request Guide',
      description: 'How to prepare documents and request travel care or insurance support.',
      image: heroImage.id,
    },
  }

  const faqPageData = {
    title: 'FAQ WingsCare',
    slug: 'faq',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Câu hỏi thường gặp',
        'FAQ giúp khách hiểu phạm vi bảo vệ và quy trình hỗ trợ trước khi liên hệ.',
        'h1',
      ),
    },
    layout: [
      faqBlock(
        'FAQ bảo hiểm và hỗ trợ',
        'Các câu hỏi thường gặp về quy trình hỗ trợ và phạm vi sử dụng cần hiển thị rõ cho khách.',
        [
          {
            question: 'Khi nào cần liên hệ WingsCare?',
            answer:
              'Khi khách cần thông tin quyền lợi, hướng dẫn hồ sơ, hỗ trợ sự cố trong chuyến hoặc sau chuyến.',
          },
          {
            question: 'WingsCare có thay thế công ty bảo hiểm không?',
            answer:
              'Không. WingsCare là lớp hướng dẫn và hỗ trợ thông tin; quyền lợi cụ thể phụ thuộc điều khoản provider.',
          },
          {
            question: 'Cần chuẩn bị gì khi yêu cầu hỗ trợ?',
            answer:
              'Nên chuẩn bị thông tin chuyến đi, mã tour/hợp đồng, giấy tờ liên quan và mô tả tình huống rõ ràng.',
          },
        ],
      ),
    ],
    meta: {
      title: 'FAQ WingsCare',
      description: 'Câu hỏi thường gặp về bảo hiểm du lịch và hỗ trợ sau bán.',
      image: heroImage.id,
    },
  }
  const faqPage = await createPage(payload, req, site.id, faqPageData)
  await updatePageLocale(payload, req, faqPage.id, 'vi', faqPageData)
  const faqPageEnglishData = {
    title: 'WingsCare FAQ',
    hero: {
      type: 'lowImpact' as const,
      richText: richText(
        'Frequently asked questions',
        'The FAQ helps travelers understand protection scope and support process before contacting the team.',
        'h1',
      ),
    },
    layout: [
      faqBlock(
        'Insurance and support FAQ',
        'Common questions about support flow and coverage scope should be visible before customers submit a request.',
        [
          {
            question: 'When should I contact WingsCare?',
            answer:
              'Contact WingsCare when you need benefit information, document guidance, support during a trip, or post-trip assistance.',
          },
          {
            question: 'Does WingsCare replace the insurance provider?',
            answer:
              'No. WingsCare provides guidance and information support. Specific benefits depend on the terms of the insurance provider.',
          },
          {
            question: 'What should I prepare before requesting support?',
            answer:
              'Prepare trip information, tour or contract code, relevant documents, and a clear description of the situation.',
          },
        ],
      ),
    ],
    meta: {
      title: 'WingsCare FAQ',
      description: 'Frequently asked questions about travel insurance and post-sales support.',
      image: heroImage.id,
    },
  }

  const contactPageData = {
    title: 'Liên hệ hỗ trợ',
    slug: 'contact',
    hero: {
      type: 'lowImpact',
      richText: richText(
        'Gửi yêu cầu hỗ trợ',
        'Cung cấp mã tour/hợp đồng nếu có để đội WingsCare phân loại và phản hồi nhanh hơn.',
        'h1',
      ),
    },
    layout: [
      formBlock(
        supportForm.id,
        'Thông tin cần hỗ trợ',
        'Form này phục vụ travel care và insurance support ở mức phase 1.',
      ),
    ],
    meta: {
      title: 'Liên hệ WingsCare',
      description: 'Gửi yêu cầu hỗ trợ travel care, bảo hiểm hoặc sau bán.',
      image: heroImage.id,
    },
  }
  const contactPage = await createPage(payload, req, site.id, contactPageData)
  await updatePageLocale(payload, req, contactPage.id, 'vi', contactPageData)
  const contactPageEnglishData = {
    title: 'Contact Support',
    hero: {
      type: 'lowImpact' as const,
      richText: richText(
        'Send a support request',
        'Share your tour, contract, or policy code when available so the WingsCare team can classify the request faster.',
        'h1',
      ),
    },
    layout: [
      formBlock(
        supportForm.id,
        'Support request details',
        'This form supports travel care and insurance assistance for the phase 1 site.',
      ),
    ],
    meta: {
      title: 'Contact WingsCare',
      description: 'Send a travel care, insurance, or post-sales support request.',
      image: heroImage.id,
    },
  }

  const homePageData = {
    title: 'WingsCare',
    slug: 'home',
    hero: {
      type: 'highImpact',
      variant: 'standard',
      media: heroImage.id,
      links: [
        linkItem('Xem quyền lợi', '/quyen-loi', 'default'),
        linkItem('Gửi yêu cầu hỗ trợ', '/contact', 'outline'),
      ],
      richText: richText(
        'Travel care rõ quyền lợi, rõ hỗ trợ',
        'WingsCare là site ưu tiên niềm tin cho bảo hiểm du lịch, hướng dẫn quyền lợi và hỗ trợ sau bán trong hệ sinh thái WingsGroup.',
        'h1',
      ),
    },
    layout: [
      infoStripBlock(
        'Trust signals cần thấy sớm',
        'WingsCare không nên giống blog chung; site cần quyền lợi, quy trình và kênh hỗ trợ rõ.',
        [
          {
            value: 'Policy',
            label: 'Quyền lợi rõ',
            description: 'Mô tả phạm vi và điều kiện bằng ngôn ngữ dễ hiểu.',
          },
          {
            value: 'Support',
            label: 'Hỗ trợ sau bán',
            description: 'Kênh tiếp nhận yêu cầu, hồ sơ và kỳ vọng phản hồi.',
          },
          {
            value: 'Care',
            label: 'Gắn với hành trình',
            description:
              'Có thể liên kết với tour nước ngoài, hành trình cho khách quốc tế, private hoặc fast track.',
          },
        ],
        'Care model',
      ),
      featureGridBlock(
        'Nội dung cần có',
        'Các trang này tạo nền production cho travel care và insurance support.',
        [
          {
            title: 'Sản phẩm bảo hiểm',
            description: 'Nhóm sản phẩm, phạm vi áp dụng và đối tượng khách.',
            meta: 'Products',
            url: '/san-pham-bao-hiem',
          },
          {
            title: 'Quyền lợi',
            description: 'Chi phí y tế, sự cố chuyến đi, hành lý và hỗ trợ khẩn cấp.',
            meta: 'Benefits',
            url: '/quyen-loi',
          },
          {
            title: 'Claim support',
            description: 'Hướng dẫn hồ sơ, quy trình và liên hệ hỗ trợ.',
            meta: 'Support',
            url: '/claim-support',
          },
        ],
        'highlight',
        'Kiến trúc ưu tiên niềm tin',
      ),
      ctaBlock(
        'Cần hỗ trợ một trường hợp cụ thể?',
        'Gửi thông tin chuyến đi và mô tả tình huống để đội WingsCare phân loại hướng xử lý.',
        [linkItem('Gửi yêu cầu hỗ trợ', '/contact')],
      ),
    ],
    relatedPages: [productsPage.id, benefitsPage.id, claimsPage.id, faqPage.id, contactPage.id],
    meta: {
      title: 'WingsCare',
      description: siteSeed.seoDescription,
      image: heroImage.id,
    },
  }
  const homePage = await createPage(payload, req, site.id, homePageData)
  await updatePageLocale(payload, req, homePage.id, 'vi', homePageData)
  const homePageEnglishData = {
    title: 'WingsCare',
    hero: {
      type: 'highImpact' as const,
      variant: 'standard' as const,
      media: heroImage.id,
      links: [
        linkItem('View benefits', '/quyen-loi', 'default'),
        linkItem('Send support request', '/contact', 'outline'),
      ],
      richText: richText(
        'Travel care with clear benefits and support',
        'WingsCare is the trust-first site for travel insurance, benefit guidance, and post-sales support across the WingsGroup ecosystem.',
        'h1',
      ),
    },
    layout: [
      infoStripBlock(
        'Trust signals customers need early',
        'WingsCare should not feel like a generic blog. Customers need clear benefits, process, and support channels.',
        [
          {
            value: 'Policy',
            label: 'Clear benefits',
            description: 'Explain coverage scope and conditions in plain language.',
          },
          {
            value: 'Support',
            label: 'Post-sales support',
            description:
              'Show the request channel, required documents, and expected response path.',
          },
          {
            value: 'Care',
            label: 'Connected to the journey',
            description:
              'Support can connect with outbound, inbound, private, or fast track trips.',
          },
        ],
        'Care model',
      ),
      featureGridBlock(
        'What this site must cover',
        'These pages form the production foundation for travel care and insurance support.',
        [
          {
            title: 'Insurance products',
            description: 'Product groups, coverage scope, and intended traveler segments.',
            meta: 'Products',
            url: '/san-pham-bao-hiem',
          },
          {
            title: 'Benefits',
            description: 'Medical expenses, trip incidents, luggage, and emergency assistance.',
            meta: 'Benefits',
            url: '/quyen-loi',
          },
          {
            title: 'Claim support',
            description: 'Document guidance, support process, and contact workflow.',
            meta: 'Support',
            url: '/claim-support',
          },
        ],
        'highlight',
        'Kiến trúc ưu tiên niềm tin',
      ),
      ctaBlock(
        'Need support for a specific case?',
        'Send your trip information and situation details so WingsCare can route the request to the right support path.',
        [linkItem('Send support request', '/contact')],
      ),
    ],
    relatedPages: [productsPage.id, benefitsPage.id, claimsPage.id, faqPage.id, contactPage.id],
    meta: {
      title: 'WingsCare',
      description:
        'Trust-first travel care site for insurance benefits, support guidance, and post-sales assistance.',
      image: heroImage.id,
    },
  }

  const wingsCareSettingsData = {
    footerNote:
      'WingsCare tập trung travel care, insurance support, quyền lợi và hướng dẫn hỗ trợ sau bán.',
    headerNavItems: [
      linkItem('Trang chủ', '/'),
      linkItem('Sản phẩm', '/san-pham-bao-hiem'),
      linkItem('Quyền lợi', '/quyen-loi'),
      linkItem('Claim support', '/claim-support'),
      linkItem('FAQ', '/faq'),
      linkItem('Liên hệ', '/contact'),
    ],
    footerNavItems: [
      linkItem('Quyền lợi', '/quyen-loi'),
      linkItem('FAQ', '/faq'),
      linkItem('Liên hệ', '/contact'),
    ],
    supportEmail: 'care@wingsgroup.vn',
    supportPhone: '+84 903 000 555',
  }
  const wingsCareSettings = await createSiteSettings(
    payload,
    req,
    site,
    siteSeed,
    heroImage.id,
    wingsCareSettingsData,
  )
  await updateSiteSettingsLocale(payload, req, wingsCareSettings.id, 'vi', {
    siteName: siteSeed.name,
    tagline: siteSeed.summary,
    branding: {
      logoText: siteSeed.name,
      ...(siteSeed.brandColor ? { brandColor: siteSeed.brandColor } : {}),
      ...(siteSeed.accentColor ? { accentColor: siteSeed.accentColor } : {}),
      logoImage: null,
      faviconImage: heroImage.id,
      themeKey: siteSeed.code,
      themePreset: themePresetIDsByKey[siteSeed.themePreset],
    },
    seo: {
      defaultTitle: siteSeed.name,
      titleSuffix: siteSeed.seoSuffix,
      defaultDescription: siteSeed.seoDescription,
      defaultImage: heroImage.id,
      canonicalDomain: `https://${siteSeed.domain.replace('.local', '.vn')}`,
    },
    supportEmail: wingsCareSettingsData.supportEmail,
    supportPhone: wingsCareSettingsData.supportPhone,
    headerNavItems: wingsCareSettingsData.headerNavItems,
    footerNavItems: wingsCareSettingsData.footerNavItems,
    footerNote: wingsCareSettingsData.footerNote,
  })

  await mirrorSiteContentToEnglish(payload, req, site.id)

  await updatePageLocale(payload, req, productsPage.id, 'en', productsPageEnglishData)
  await updatePageLocale(payload, req, benefitsPage.id, 'en', benefitsPageEnglishData)
  await updatePageLocale(payload, req, claimsPage.id, 'en', claimsPageEnglishData)
  await updatePageLocale(payload, req, faqPage.id, 'en', faqPageEnglishData)
  await updatePageLocale(payload, req, contactPage.id, 'en', contactPageEnglishData)
  await updatePageLocale(payload, req, homePage.id, 'en', homePageEnglishData)

  await updateSiteSettingsLocale(payload, req, wingsCareSettings.id, 'en', {
    footerNote:
      'WingsCare focuses on travel care, insurance support, benefit guidance, and post-sales assistance.',
    headerNavItems: [
      linkItem('Home', '/'),
      linkItem('Products', '/san-pham-bao-hiem'),
      linkItem('Benefits', '/quyen-loi'),
      linkItem('Claim support', '/claim-support'),
      linkItem('FAQ', '/faq'),
      linkItem('Contact', '/contact'),
    ],
    footerNavItems: [
      linkItem('Benefits', '/quyen-loi'),
      linkItem('FAQ', '/faq'),
      linkItem('Contact', '/contact'),
    ],
    seo: {
      defaultTitle: siteSeed.name,
      titleSuffix: 'Care And Support',
      defaultDescription:
        'Travel care, insurance support, benefit guidance, and post-sales assistance for WingsGroup travelers.',
      defaultImage: heroImage.id,
      canonicalDomain: `https://${siteSeed.domain}`,
    },
    tagline: 'Travel care, insurance support, and post-sales assistance.',
  })
}

async function _seedLightweightSite(
  payload: Payload,
  req: PayloadRequest,
  siteSeed: SiteSeed,
  options: {
    ctaLabel: string
    ctaURL: string
    description: string
    navItems: string[]
  },
) {
  const site = await upsertSite(payload, req, siteSeed)
  await clearSiteContent(payload, req, site.id)
  const ctaSlug = options.ctaURL.replace(/^\/+/, '') || 'home'

  const heroImage = await createMedia(
    payload,
    req,
    site.id,
    `${siteSeed.name} hero`,
    `${siteSeed.name} cover`,
    siteSeed.summary,
    'https://raw.githubusercontent.com/payloadcms/payload/refs/heads/main/templates/website/src/endpoints/seed/image-hero1.webp',
  )

  await createPage(payload, req, site.id, {
    title: siteSeed.name,
    slug: 'home',
    hero: {
      type: 'highImpact',
      variant: 'standard',
      media: heroImage.id,
      links: [linkItem(options.ctaLabel, options.ctaURL, 'default')],
      richText: richText(siteSeed.name, options.description, 'h1'),
    },
    layout: [
      contentBlock([
        {
          size: 'half',
          title: 'Site scope',
          paragraph: siteSeed.summary,
        },
        {
          size: 'half',
          title: 'Current phase',
          paragraph:
            'This site is registered in the multisite platform and seeded with a starter production-ready shell, while detailed deep build is prioritized elsewhere in the roadmap.',
        },
      ]),
    ],
    meta: {
      title: siteSeed.name,
      description: siteSeed.seoDescription,
      image: heroImage.id,
    },
  })

  if (ctaSlug !== 'home') {
    await createPage(payload, req, site.id, {
      title: options.navItems[1] || options.ctaLabel,
      slug: ctaSlug,
      hero: {
        type: 'lowImpact',
        richText: richText(options.navItems[1] || options.ctaLabel, options.description, 'h1'),
      },
      layout: [
        contentBlock([
          {
            size: 'full',
            title: 'Site scope',
            paragraph:
              'This page exists so the multisite shell is navigable while the deeper production build for this business line is scheduled after WingsGo and WingsSide.',
          },
        ]),
      ],
      meta: {
        title: options.navItems[1] || options.ctaLabel,
        description: options.description,
        image: heroImage.id,
      },
    })
  }

  await createSiteSettings(payload, req, site, siteSeed, heroImage.id, {
    headerNavItems: options.navItems.map((label, index) =>
      linkItem(label, index === 0 ? '/' : options.ctaURL),
    ),
    footerNavItems: [linkItem('Home', '/'), linkItem(options.ctaLabel, options.ctaURL)],
  })
}

async function main() {
  const payload = await getPayload({ config })
  try {
    const requestedSeed = process.env.SEED_ONLY_SITE?.trim().toLowerCase() || null
    const seededAdminUser = await ensureLocalAdminUser(payload)
    const users = await payload.find({
      collection: 'users',
      depth: 0,
      limit: 1,
      where: {
        email: {
          equals: localAdminCredentials.email,
        },
      },
    })
    const currentUser = users.docs[0] || seededAdminUser

    if (!currentUser) {
      throw new Error('No admin user found. The local admin seed did not complete.')
    }

    const adminUser =
      currentUser.role === 'super-admin'
        ? currentUser
        : await payload.update({
            collection: 'users',
            id: currentUser.id,
            data: {
              role: 'super-admin',
              sites: [],
            },
          })

    const req = await createLocalReq({ user: adminUser }, payload)
    const databaseURL = process.env.DATABASE_URL || ''
    const isSQLiteSeed = !/^postgres(?:ql)?:\/\//.test(databaseURL)

    if (isSQLiteSeed) {
      disableLocalTransactionsForSeed(payload)
      disableVersionWritesForSeed(payload)
    }
    const heroPresetIDs = await ensureHeroPresentationPresetSeeds(payload, req)
    Object.assign(heroPresentationPresetIDsByKey, heroPresetIDs)

    const requestedSites = requestedSeed
      ? requestedSeed
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      : null

    payload.logger.info('Seeding theme presets...')
    await seedThemePresets(payload, req)

    const wingsGroupSeed = siteSeeds.find((site) => site.code === 'wings-group')!
    const wingsGoSeed = siteSeeds.find((site) => site.code === 'wings-go')!
    const wingsSideSeed = siteSeeds.find((site) => site.code === 'wing-side')!
    const wingsPassSeed = siteSeeds.find((site) => site.code === 'wings-pass')!
    const wingsPlusSeed = siteSeeds.find((site) => site.code === 'wings-plus')!
    const wingsCareSeed = siteSeeds.find((site) => site.code === 'wings-care')!

    const seeders: Record<string, () => Promise<void>> = {
      'wings-group': async () => {
        payload.logger.info('Seeding WingsGroup corporate hub...')
        await seedWingsGroup(payload, req, wingsGroupSeed)
      },
      'wings-go': async () => {
        payload.logger.info('Seeding WingsGo production content...')
        await seedWingsGo(payload, req, wingsGoSeed)
      },
      'wing-side': async () => {
        payload.logger.info('Seeding WingsSide production content...')
        await seedWingsSide(payload, req, wingsSideSeed)
      },
      'wings-pass': async () => {
        payload.logger.info('Seeding WingsPass production content...')
        await seedWingsPass(payload, req, wingsPassSeed)
      },
      'wings-plus': async () => {
        payload.logger.info('Seeding WingsPlus production content...')
        await seedWingsPlus(payload, req, wingsPlusSeed)
      },
      'wings-care': async () => {
        payload.logger.info('Seeding WingsCare production content...')
        await seedWingsCare(payload, req, wingsCareSeed)
      },
    }

    if (requestedSites) {
      const normalizedSites = [
        ...new Set(requestedSites.map((site) => site.replace(/^wingsplus$/, 'wings-plus'))),
      ]

      for (const site of normalizedSites) {
        const seedFn = seeders[site]

        if (!seedFn) {
          throw new Error(`Unknown SEED_ONLY_SITE value: ${requestedSeed}`)
        }

        await seedFn()
      }

      payload.logger.info(`Selective seed completed for ${normalizedSites.join(', ')}.`)
      return
    }

    await seedWingsGroup(payload, req, wingsGroupSeed)
    await seedWingsGo(payload, req, wingsGoSeed)
    await seedWingsSide(payload, req, wingsSideSeed)
    await seedWingsPass(payload, req, wingsPassSeed)
    await seedWingsPlus(payload, req, wingsPlusSeed)
    await seedWingsCare(payload, req, wingsCareSeed)

    await payload.updateGlobal({
      slug: 'header',
      req,
      context: seedContext,
      data: {
        navItems: [
          {
            link: {
              type: 'custom',
              label: 'Sites',
              url: '/',
            },
          },
          {
            link: {
              type: 'custom',
              label: 'Admin',
              url: '/admin',
            },
          },
        ],
      },
    })

    await payload.updateGlobal({
      slug: 'footer',
      req,
      context: seedContext,
      data: {
        navItems: [
          {
            link: {
              type: 'custom',
              label: 'WingsGroup',
              url: '/',
            },
          },
          {
            link: {
              type: 'custom',
              label: 'Payload Admin',
              url: '/admin',
            },
          },
        ],
      },
    })

    payload.logger.info('Production-oriented subsites seeded successfully.')
  } finally {
    await payload.destroy()
  }
}

try {
  await main()
  if (process.env.WINGSSIDE_REHEARSAL_EXIT_AFTER_SEED === 'true') {
    process.exit(0)
  }
} catch (error) {
  console.error(error)
  if (process.env.WINGSSIDE_REHEARSAL_EXIT_AFTER_SEED === 'true') {
    process.exit(1)
  } else {
    process.exitCode = 1
  }
}
