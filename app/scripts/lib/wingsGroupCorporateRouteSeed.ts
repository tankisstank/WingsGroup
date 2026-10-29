import type { Payload, PayloadRequest } from 'payload'

import {
  WINGSGROUP_CORPORATE_ROUTES,
  WINGSGROUP_CONTENT_VALIDATION_MARKER,
  WINGSGROUP_LEGAL_IDENTITY,
  WINGSGROUP_POLICY_VALIDATION_MARKER,
  WINGSGROUP_RELATIONSHIP_STATEMENT_EN,
  WINGSGROUP_SITE_CODE,
  type WingsGroupRouteDefinition,
  type WingsGroupCorporateRouteDefinition,
} from '../../src/wingsgroup/corporateRoutes'
import {
  WINGSGROUP_CONSENT_VERSION,
  WINGSGROUP_DATA_CONTACT,
  WINGSGROUP_LEAD_RETENTION_MONTHS,
  WINGSGROUP_POLICY_ROUTES as CONTACT_POLICY_ROUTES,
  WINGSGROUP_PRIVACY_VERSION,
} from '../../src/lead-capture/wingsGroupV3'

type Locale = 'en' | 'vi'
type SeedBlock = Record<string, unknown>

type LocalizedRouteSeed = {
  description: string
  hero: SeedBlock
  layout: SeedBlock[]
  title: string
}

export type WingsGroupCorporateRouteSeed = WingsGroupCorporateRouteDefinition & {
  en: LocalizedRouteSeed
  preserveExisting: boolean
  vi: LocalizedRouteSeed
}

const lexical = (
  heading: string,
  paragraphs: readonly string[],
  headingTag: 'h1' | 'h2' = 'h2',
) => ({
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: heading,
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        tag: headingTag,
        type: 'heading',
        version: 1,
      },
      ...paragraphs.map((text) => ({
        children: [
          { detail: 0, format: 0, mode: 'normal', style: '', text, type: 'text', version: 1 },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        textFormat: 0,
        type: 'paragraph',
        version: 1,
      })),
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
})

const heroPrimaryLink = (url: string, label: string): SeedBlock => ({
  link: {
    appearance: 'default',
    label,
    type: 'custom',
    url,
  },
})

const pageHero = (title: string, media?: string, links?: SeedBlock[]): SeedBlock => ({
  ...(links ? { links } : {}),
  ...(media ? { media } : {}),
  richText: lexical(title, [], 'h1'),
  type: 'highImpact',
})

const ecosystemHeroLinks = (locale: Locale): SeedBlock[] => [
  heroPrimaryLink(
    '#ecosystem',
    locale === 'en' ? 'Explore the ecosystem' : 'Khám phá hệ sinh thái',
  ),
]

const capabilityHeroLinks = (locale: Locale): SeedBlock[] => [
  heroPrimaryLink('#services', locale === 'en' ? 'Explore services' : 'Khám phá dịch vụ'),
]

const trustHeroLinks = (locale: Locale): SeedBlock[] => [
  heroPrimaryLink('#trust', locale === 'en' ? 'Review the record' : 'Xem thông tin'),
]

const editorialHeroLinks = (locale: Locale): SeedBlock[] => [
  heroPrimaryLink('#news', locale === 'en' ? 'Read the latest' : 'Đọc tin mới'),
]

const contactHeroLinks = (locale: Locale, url = '/lien-he#contact-form'): SeedBlock[] => [
  heroPrimaryLink(url, locale === 'en' ? 'Request a consultation' : 'Trao đổi với chuyên viên'),
]

const content = (heading: string, ...paragraphs: string[]): SeedBlock => ({
  blockType: 'content',
  columns: [{ richText: lexical(heading, paragraphs), size: 'full' }],
  presentation: 'reading',
})

const features = (
  eyebrow: string,
  title: string,
  description: string,
  items: Array<{ description: string; title: string }>,
): SeedBlock => ({
  blockType: 'featureGrid',
  columns: '3',
  description,
  eyebrow,
  items,
  presentation: 'icon-grid',
  title,
  variant: 'minimal',
})

const contactCTA = (locale: Locale): SeedBlock => ({
  blockType: 'cta',
  links: [
    {
      link: {
        appearance: 'default',
        label: locale === 'en' ? 'Send a consultation request' : 'Gửi yêu cầu tư vấn',
        type: 'custom',
        url: '/lien-he#contact-form',
      },
    },
  ],
  presentation: 'card',
  richText: lexical(
    locale === 'en'
      ? 'A considered response starts with a clear brief'
      : 'Một phản hồi phù hợp bắt đầu từ nhu cầu rõ ràng',
    [
      locale === 'en'
        ? 'The WingsGroup team will review your request and connect it with the most suitable service team.'
        : 'Đội ngũ WingsGroup sẽ xem xét yêu cầu và kết nối với bộ phận dịch vụ phù hợp.',
    ],
  ),
})

const ecosystemCTA = (locale: Locale): SeedBlock => ({
  blockType: 'cta',
  links: [
    {
      link: {
        appearance: 'default',
        label: locale === 'en' ? 'Contact for consultation' : 'Liên hệ tư vấn',
        type: 'custom',
        url: '/lien-he#contact-form',
      },
    },
  ],
  presentation: 'card',
  richText: lexical(
    locale === 'en'
      ? 'You choose the destination. WingsGroup takes care of the rest!'
      : 'Bạn chọn điểm đến. WingsGroup lo phần còn lại!',
    [
      locale === 'en'
        ? 'From leisure travel, airport services to tailor-made journeys — connect with our specialists for a seamless and coordinated travel experience.'
        : 'Từ du lịch, dịch vụ sân bay đến những trải nghiệm được thiết kế riêng — kết nối cùng chuyên viên để có trải nghiệm đồng bộ và an tâm xuyên suốt chuyến đi.',
    ],
  ),
})

export const WINGSGROUP_PRIVACY_APPROVAL_REFERENCE = 'stakeholder-privacy-consent-2026-08-24'
export const WINGSGROUP_PRIVACY_DATA_SUBJECT_RIGHTS_EVIDENCE =
  'stakeholder-privacy-consent-2026-08-24'
export const WINGSGROUP_PRIVACY_DATA_SUBJECT_RIGHTS_STATEMENT_VI =
  'Người có dữ liệu có thể liên hệ qua info@doicanhviet.com.'
export const WINGSGROUP_PRIVACY_DATA_SUBJECT_RIGHTS_STATEMENT_EN =
  'Data subjects may contact info@doicanhviet.com.'

const isApprovedPrivacyRoute = (definition: WingsGroupRouteDefinition): boolean =>
  definition.path === CONTACT_POLICY_ROUTES.vi

const approvedPrivacyPolicy = (locale: Locale): LocalizedRouteSeed => ({
  description:
    locale === 'en'
      ? `Approved WingsGroup privacy and consent contract ${WINGSGROUP_PRIVACY_VERSION}.`
      : `Hợp đồng quyền riêng tư và đồng ý của WingsGroup ${WINGSGROUP_PRIVACY_VERSION} đã được duyệt.`,
  hero: pageHero(locale === 'en' ? 'Privacy Policy' : 'Chính sách bảo mật'),
  layout: [
    content(
      locale === 'en' ? 'Privacy and consent contract' : 'Hợp đồng quyền riêng tư và đồng ý',
      locale === 'en'
        ? 'I agree that WingsGroup may use the information provided to contact me, provide consultation, and route my request to the appropriate team in accordance with the Privacy Policy.'
        : 'Tôi đồng ý để WingsGroup sử dụng thông tin đã cung cấp nhằm liên hệ, tư vấn và chuyển yêu cầu đến bộ phận phù hợp theo Chính sách bảo mật.',
      locale === 'en'
        ? 'Retention period: 24 months. Data-subject contact: info@doicanhviet.com. Inter-branch routing is permitted for consultation requests.'
        : 'Thời hạn lưu trữ: 24 tháng. Liên hệ về dữ liệu cá nhân: info@doicanhviet.com. Cho phép chuyển yêu cầu giữa các chi nhánh để định tuyến và phản hồi tư vấn.',
    ),
  ],
  title: locale === 'en' ? 'Privacy Policy' : 'Chính sách bảo mật',
})

const policyDraft = (locale: Locale, label: string): LocalizedRouteSeed => ({
  description:
    locale === 'en'
      ? `${label} is being prepared for legal ownership and editorial approval. It is not public policy.`
      : `${label} đang được hoàn thiện chủ sở hữu pháp lý và phê duyệt biên tập. Đây chưa phải chính sách công khai.`,
  hero: pageHero(label),
  layout: [
    content(
      locale === 'en' ? 'Publication pending legal approval' : 'Chờ phê duyệt pháp lý để công bố',
      locale === 'en'
        ? 'This controlled draft records the intended route only. Effective date, version, scope, legal owner and approval evidence must be completed before publication.'
        : 'Bản nháp có kiểm soát này chỉ ghi nhận đường dẫn dự kiến. Ngày hiệu lực, phiên bản, phạm vi, chủ sở hữu pháp lý và bằng chứng phê duyệt phải đầy đủ trước khi công bố.',
      locale === 'en'
        ? `The governing entity is ${WINGSGROUP_LEGAL_IDENTITY.legalEntityName}; no legal terms are asserted by this draft.`
        : `Pháp nhân quản lý dự kiến là ${WINGSGROUP_LEGAL_IDENTITY.legalEntityName}; bản nháp này không tự xác lập điều khoản pháp lý.`,
    ),
  ],
  title: label,
})

const ecosystemRoute = (locale: Locale): LocalizedRouteSeed => ({
  description:
    locale === 'en'
      ? 'Five service brands, each with a clear role and a considered route into consultation.'
      : 'Năm thương hiệu dịch vụ, mỗi thương hiệu có một vai trò rõ ràng và một điểm bắt đầu phù hợp.',
  hero: pageHero(
    locale === 'en' ? 'The WingsGroup ecosystem' : 'Hệ sinh thái WingsGroup',
    'wingsgroup-ecosystem-hero.png',
    ecosystemHeroLinks(locale),
  ),
  layout: [
    {
      blockType: 'wingsGroupEcosystem',
      description:
        locale === 'en'
          ? 'Choose what you need. Each brand connects you with a focused service team and a clear next step.'
          : 'Chọn điều bạn đang cần. Mỗi thương hiệu kết nối bạn với một đội ngũ dịch vụ và điểm bắt đầu rõ ràng.',
      eyebrow: locale === 'en' ? 'Service ecosystem' : 'Hệ sinh thái dịch vụ',
      profiles: [
        {
          brandKey: 'wingsgo',
          brandName: 'WingsGo',
          cta: {
            contactPath: '/lien-he#contact-form',
            label: locale === 'en' ? 'Talk with WingsGo' : 'Trao đổi với WingsGo',
            state: 'contact-fallback',
          },
          description:
            locale === 'en'
              ? 'Outbound journeys, departure planning and a clear starting point for travel abroad.'
              : 'Hành trình nước ngoài, lịch khởi hành và một điểm bắt đầu rõ ràng cho chuyến đi xa.',
          proofState: 'pending',
          serviceScope: [
            { label: locale === 'en' ? 'Outbound travel' : 'Du lịch nước ngoài' },
            { label: locale === 'en' ? 'Departure planning' : 'Lịch khởi hành' },
            { label: locale === 'en' ? 'Pre-trip guidance' : 'Thông tin trước chuyến đi' },
          ],
          stageMedia: 'wingsgroup-ecosystem-hero.png',
        },
        {
          brandKey: 'wing-side',
          brandName: 'WingSide',
          cta: {
            contactPath: '/lien-he#contact-form',
            label: locale === 'en' ? 'Talk with WingSide' : 'Trao đổi với WingSide',
            state: 'contact-fallback',
          },
          description:
            locale === 'en'
              ? 'Vietnam journeys shaped around local rhythm, destination and the way you prefer to travel.'
              : 'Hành trình Việt Nam được thiết kế theo nhịp đi, điểm đến và cách bạn muốn trải nghiệm.',
          proofState: 'pending',
          serviceScope: [
            { label: locale === 'en' ? 'Tailor-made Vietnam' : 'Thiết kế hành trình Việt Nam' },
            { label: locale === 'en' ? 'Local experiences' : 'Trải nghiệm địa phương' },
            { label: locale === 'en' ? 'Private groups' : 'Nhóm riêng' },
          ],
          stageMedia: 'wingsgroup-vietnam-discovery.png',
        },
        {
          brandKey: 'wingspass',
          brandName: 'WingsPass',
          cta: {
            contactPath: '/lien-he#contact-form',
            label: locale === 'en' ? 'Talk with WingsPass' : 'Trao đổi với WingsPass',
            state: 'contact-fallback',
          },
          description:
            locale === 'en'
              ? 'Airport service support for a calmer start and finish to your journey.'
              : 'Dịch vụ hỗ trợ sân bay để những điểm chạm đầu và cuối hành trình nhẹ nhàng hơn.',
          proofState: 'pending',
          serviceScope: [
            { label: locale === 'en' ? 'Fast Track by request' : 'Fast Track theo nhu cầu' },
            { label: locale === 'en' ? 'Airport arrival support' : 'Đón tiễn sân bay' },
            { label: locale === 'en' ? 'Airport touchpoints' : 'Hỗ trợ tại sân bay' },
          ],
          stageMedia: 'wingsgroup-airport-service.png',
        },
        {
          brandKey: 'wingsplus',
          brandName: 'WingsPlus',
          cta: {
            contactPath: '/lien-he#contact-form',
            label: locale === 'en' ? 'Talk with WingsPlus' : 'Trao đổi với WingsPlus',
            state: 'contact-fallback',
          },
          description:
            locale === 'en'
              ? 'Private journeys, corporate groups and MICE proposals shaped around a shared brief.'
              : 'Hành trình riêng, đoàn doanh nghiệp và đề xuất MICE được xây dựng từ một nhu cầu chung.',
          proofState: 'pending',
          serviceScope: [
            { label: locale === 'en' ? 'Private journeys' : 'Hành trình riêng' },
            { label: locale === 'en' ? 'Corporate groups' : 'Đoàn doanh nghiệp' },
            { label: 'MICE' },
          ],
          stageMedia: 'wingsgroup-corporate-partnership.png',
        },
        {
          brandKey: 'wingscare',
          brandName: 'WingsCare',
          cta: {
            contactPath: '/lien-he#contact-form',
            label: locale === 'en' ? 'Talk with WingsCare' : 'Trao đổi với WingsCare',
            state: 'contact-fallback',
          },
          description:
            locale === 'en'
              ? 'Travel care and support that helps clarify the assistance available along the way.'
              : 'Chăm sóc và hỗ trợ hành trình, giúp làm rõ những quyền lợi và đầu mối cần biết.',
          proofState: 'pending',
          serviceScope: [
            { label: locale === 'en' ? 'Travel care' : 'Chăm sóc hành trình' },
            { label: locale === 'en' ? 'Support guidance' : 'Hướng dẫn hỗ trợ' },
            { label: locale === 'en' ? 'Before-trip notes' : 'Lưu ý trước hành trình' },
          ],
          stageMedia: 'wingsgroup-travel-support.png',
        },
      ],
      title:
        locale === 'en'
          ? 'One ecosystem. Five ways to move forward.'
          : 'Một hệ sinh thái. Năm cách đồng hành.',
    },
    ecosystemCTA(locale),
  ],
  title: locale === 'en' ? 'The WingsGroup ecosystem' : 'Hệ sinh thái WingsGroup',
})

const routeContent: Record<
  Exclude<WingsGroupCorporateRouteDefinition['path'], '/'>,
  { en: LocalizedRouteSeed; vi: LocalizedRouteSeed }
> = {
  '/ve-wingsgroup': {
    vi: {
      title: 'Về WingsGroup',
      description: 'Thông tin doanh nghiệp, văn phòng và mối quan hệ thương hiệu của WingsGroup.',
      hero: pageHero('Về WingsGroup', 'wingsgroup-ecosystem-hero.png', contactHeroLinks('vi')),
      layout: [
        content(
          'Mối quan hệ thương hiệu',
          WINGSGROUP_LEGAL_IDENTITY.relationshipStatement,
          `${WINGSGROUP_LEGAL_IDENTITY.legalEntityName} có tên quốc tế và viết tắt ${WINGSGROUP_LEGAL_IDENTITY.internationalName}. Người đại diện: ${WINGSGROUP_LEGAL_IDENTITY.legalRepresentative}.`,
        ),
      ],
    },
    en: {
      title: 'About WingsGroup',
      description:
        'Corporate identity, offices and the public brand relationship behind WingsGroup.',
      hero: pageHero('About WingsGroup', 'wingsgroup-ecosystem-hero.png', contactHeroLinks('en')),
      layout: [
        content(
          'Brand relationship',
          WINGSGROUP_RELATIONSHIP_STATEMENT_EN,
          `${WINGSGROUP_LEGAL_IDENTITY.legalEntityName} uses the international abbreviation ${WINGSGROUP_LEGAL_IDENTITY.internationalName}. Its legal representative is ${WINGSGROUP_LEGAL_IDENTITY.legalRepresentative}.`,
        ),
      ],
    },
  },
  '/he-sinh-thai': {
    vi: ecosystemRoute('vi'),
    en: ecosystemRoute('en'),
  },
  '/nang-luc-dich-vu': {
    vi: {
      title: 'Năng lực dịch vụ',
      description: 'Các nhóm dịch vụ du lịch được tổ chức theo nhu cầu khách hàng và đối tác.',
      hero: pageHero(
        'Năng lực dịch vụ',
        'wingsgroup-vietnam-discovery.png',
        capabilityHeroLinks('vi'),
      ),
      layout: [
        features(
          'Năng lực',
          'Dịch vụ được tổ chức theo nhu cầu',
          'Mỗi thương hiệu tập trung vào một hành trình phục vụ rõ ràng.',
          [
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
        ),
      ],
    },
    en: {
      title: 'Service Capabilities',
      description: 'Travel services organised around the needs of travellers, groups and partners.',
      hero: pageHero(
        'Service Capabilities',
        'wingsgroup-vietnam-discovery.png',
        capabilityHeroLinks('en'),
      ),
      layout: [
        features(
          'Capabilities',
          'Services shaped around each request',
          'Each public brand concentrates on a clear customer journey.',
          [
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
        ),
      ],
    },
  },
  '/tin-cay-va-phap-ly': {
    vi: {
      title: 'Tin cậy và pháp lý',
      description: 'Thông tin pháp nhân và giấy phép đã được xác nhận cho WingsGroup.',
      hero: pageHero('Tin cậy và pháp lý', 'wingsgroup-travel-support.png', trustHeroLinks('vi')),
      layout: [
        content(
          'Thông tin pháp lý công khai',
          `Pháp nhân: ${WINGSGROUP_LEGAL_IDENTITY.legalEntityName} (${WINGSGROUP_LEGAL_IDENTITY.internationalName}).`,
          `Mã số doanh nghiệp: ${WINGSGROUP_LEGAL_IDENTITY.registrationNumber}. Giấy phép kinh doanh dịch vụ lữ hành quốc tế: ${WINGSGROUP_LEGAL_IDENTITY.licenceNumber}.`,
          `Người đại diện: ${WINGSGROUP_LEGAL_IDENTITY.legalRepresentative}.`,
        ),
      ],
    },
    en: {
      title: 'Trust and Legal Information',
      description: 'Confirmed corporate identity and travel-licence information for WingsGroup.',
      hero: pageHero(
        'Trust and Legal Information',
        'wingsgroup-travel-support.png',
        trustHeroLinks('en'),
      ),
      layout: [
        content(
          'Public legal information',
          `Legal entity: ${WINGSGROUP_LEGAL_IDENTITY.legalEntityName} (${WINGSGROUP_LEGAL_IDENTITY.internationalName}).`,
          `Business registration: ${WINGSGROUP_LEGAL_IDENTITY.registrationNumber}. International travel licence: ${WINGSGROUP_LEGAL_IDENTITY.licenceNumber}.`,
          `Legal representative: ${WINGSGROUP_LEGAL_IDENTITY.legalRepresentative}.`,
        ),
      ],
    },
  },
  '/tin-tuc': {
    vi: {
      title: 'Tin tức',
      description: 'Tin tức và góc nhìn từ WingsGroup.',
      hero: pageHero('Tin tức', 'wingsgroup-travel-support.png', editorialHeroLinks('vi')),
      layout: [
        {
          blockType: 'archive',
          introContent: lexical('Tin tức và góc nhìn', [
            'Thông tin được biên tập theo phạm vi hoạt động của WingsGroup.',
          ]),
          limit: 9,
          populateBy: 'collection',
          presentation: 'card-grid',
          relationTo: 'posts',
        },
      ],
    },
    en: {
      title: 'News and Insights',
      description: 'News and considered perspectives from WingsGroup.',
      hero: pageHero(
        'News and Insights',
        'wingsgroup-travel-support.png',
        editorialHeroLinks('en'),
      ),
      layout: [
        {
          blockType: 'archive',
          introContent: lexical('News and insights', [
            'Editorial updates are prepared within the public scope of WingsGroup.',
          ]),
          limit: 9,
          populateBy: 'collection',
          presentation: 'card-grid',
          relationTo: 'posts',
        },
      ],
    },
  },
  '/lien-he': {
    vi: {
      title: 'Liên hệ',
      description: 'Gửi nhu cầu để WingsGroup kết nối bạn với bộ phận phù hợp.',
      hero: pageHero(
        'Liên hệ',
        'wingsgroup-corporate-partnership.png',
        contactHeroLinks('vi', '#contact-form'),
      ),
      layout: [
        content(
          'Chúng tôi sẵn sàng lắng nghe',
          'Hãy chia sẻ thời gian, số lượng khách, điểm đến hoặc loại dịch vụ bạn đang quan tâm.',
        ),
      ],
    },
    en: {
      title: 'Contact',
      description:
        'Share your request and WingsGroup will connect you with the most suitable team.',
      hero: pageHero(
        'Contact',
        'wingsgroup-corporate-partnership.png',
        contactHeroLinks('en', '#contact-form'),
      ),
      layout: [
        content(
          'We would be pleased to hear from you',
          'Please share your preferred timing, party size, destination or the service you are considering.',
        ),
      ],
    },
  },
  '/chinh-sach-bao-mat': {
    vi: approvedPrivacyPolicy('vi'),
    en: approvedPrivacyPolicy('en'),
  },
  '/dieu-khoan-su-dung': {
    vi: policyDraft('vi', 'Điều khoản sử dụng'),
    en: policyDraft('en', 'Terms of Use'),
  },
  '/chinh-sach-thanh-toan': {
    vi: policyDraft('vi', 'Chính sách thanh toán'),
    en: policyDraft('en', 'Payment Policy'),
  },
}

const homepageFallback = (locale: Locale): LocalizedRouteSeed => ({
  title: 'WingsGroup',
  description:
    locale === 'en'
      ? 'Travel services connected through one trusted organisation.'
      : 'Các dịch vụ du lịch được kết nối trong một tổ chức đáng tin cậy.',
  hero: pageHero('WingsGroup', 'wingsgroup-ecosystem-hero.png', ecosystemHeroLinks(locale)),
  layout: [
    content(
      locale === 'en' ? 'Thoughtful travel, connected expertise' : 'Tận tâm trong từng hành trình',
      locale === 'en'
        ? 'WingsGroup brings together specialist travel brands and service teams to respond to each request with care.'
        : 'WingsGroup kết nối các thương hiệu và đội ngũ dịch vụ chuyên biệt để phản hồi từng nhu cầu một cách chu đáo.',
    ),
    contactCTA(locale),
  ],
})

export const buildWingsGroupCorporateRouteSeeds = (): WingsGroupCorporateRouteSeed[] =>
  WINGSGROUP_CORPORATE_ROUTES.map((definition) => ({
    ...definition,
    ...(definition.path === '/'
      ? { en: homepageFallback('en'), preserveExisting: true, vi: homepageFallback('vi') }
      : { ...routeContent[definition.path], preserveExisting: false }),
  }))

export const routeGovernanceForSeed = (definition: WingsGroupRouteDefinition) => {
  const approvedPrivacy = isApprovedPrivacyRoute(definition)

  return {
    archetype: definition.archetype,
    contentApproval: definition.policy
      ? approvedPrivacy
        ? {
            en: WINGSGROUP_CONTENT_VALIDATION_MARKER,
            vi: WINGSGROUP_CONTENT_VALIDATION_MARKER,
          }
        : { en: null, vi: null }
      : {
          en: WINGSGROUP_CONTENT_VALIDATION_MARKER,
          vi: WINGSGROUP_CONTENT_VALIDATION_MARKER,
        },
    managedBy: 'wingsgroup-v3' as const,
    policy: definition.policy
      ? {
          approvalReference: approvedPrivacy ? WINGSGROUP_PRIVACY_APPROVAL_REFERENCE : null,
          approvalState: approvedPrivacy ? ('approved' as const) : ('pending' as const),
          consentEvidenceReference: approvedPrivacy
            ? WINGSGROUP_PRIVACY_DATA_SUBJECT_RIGHTS_EVIDENCE
            : null,
          consentVersion: WINGSGROUP_CONSENT_VERSION,
          dataSubjectContact: WINGSGROUP_DATA_CONTACT,
          dataSubjectRightsEvidence: approvedPrivacy
            ? WINGSGROUP_PRIVACY_DATA_SUBJECT_RIGHTS_EVIDENCE
            : null,
          dataSubjectRightsStatement: approvedPrivacy
            ? WINGSGROUP_PRIVACY_DATA_SUBJECT_RIGHTS_STATEMENT_VI
            : null,
          effectiveDate: approvedPrivacy ? '2026-08-24' : null,
          legalEntity: WINGSGROUP_LEGAL_IDENTITY.legalEntityName,
          legalOwner: approvedPrivacy ? 'Business and legal owner' : null,
          policyVersion: WINGSGROUP_PRIVACY_VERSION,
          privacyApprovalReference: approvedPrivacy ? WINGSGROUP_PRIVACY_APPROVAL_REFERENCE : null,
          retentionMonths: WINGSGROUP_LEAD_RETENTION_MONTHS,
          scope: approvedPrivacy ? 'WingsGroup privacy and consent contract' : null,
          validationMarker: approvedPrivacy ? WINGSGROUP_POLICY_VALIDATION_MARKER : null,
          version: approvedPrivacy ? WINGSGROUP_PRIVACY_VERSION : 'draft-1',
        }
      : undefined,
    publication: {
      en: definition.policy
        ? approvedPrivacy
          ? ('approved' as const)
          : ('hidden' as const)
        : ('approved' as const),
      vi: definition.policy
        ? approvedPrivacy
          ? ('approved' as const)
          : ('pending' as const)
        : ('approved' as const),
    },
  }
}

export const resolveCorporateRouteSeedAction = (
  existing: Array<{ id: number | string; pathname?: null | string }>,
  route: WingsGroupCorporateRouteSeed,
): 'create' | 'update' => {
  const matches = existing.filter(({ pathname }) => pathname === route.path)
  if (matches.length > 1) throw new Error(`Duplicate WingsGroup route: ${route.path}`)
  return matches.length === 1 ? 'update' : 'create'
}

const nav = (label: string, url: string) => ({ link: { label, type: 'custom', url } })

export const wingsGroupSettingsSeed = {
  en: {
    footerNavItems: [
      nav('About WingsGroup', '/ve-wingsgroup'),
      nav('Capabilities', '/nang-luc-dich-vu'),
      nav('Trust and legal information', '/tin-cay-va-phap-ly'),
      nav('News', '/tin-tuc'),
      nav('Contact', '/lien-he'),
    ],
    footerNote: `${WINGSGROUP_LEGAL_IDENTITY.legalEntityName} · Business registration ${WINGSGROUP_LEGAL_IDENTITY.registrationNumber}`,
    headerNavItems: [
      nav('Home', '/'),
      nav('About', '/ve-wingsgroup'),
      nav('Capabilities', '/nang-luc-dich-vu'),
      nav('Trust', '/tin-cay-va-phap-ly'),
      nav('News', '/tin-tuc'),
      nav('Contact', '/lien-he'),
    ],
    tagline: 'Thoughtful travel, connected expertise.',
    salesEmail: 'sales@wingsgroup.vn',
    supportEmail: 'info@wingsgroup.vn',
    supportPhone: '0948786775',
    additionalHotlines: [
      { phoneNumber: '0915250101', label: 'Tư vấn tour' },
      { phoneNumber: '0915260101', label: 'Hỗ trợ dịch vụ' },
    ],
  },
  vi: {
    footerNavItems: [
      nav('Về WingsGroup', '/ve-wingsgroup'),
      nav('Năng lực dịch vụ', '/nang-luc-dich-vu'),
      nav('Tin cậy và pháp lý', '/tin-cay-va-phap-ly'),
      nav('Tin tức', '/tin-tuc'),
      nav('Liên hệ', '/lien-he'),
    ],
    footerNote: `${WINGSGROUP_LEGAL_IDENTITY.legalEntityName} · Mã số doanh nghiệp ${WINGSGROUP_LEGAL_IDENTITY.registrationNumber}`,
    headerNavItems: [
      nav('Trang chủ', '/'),
      nav('Về WingsGroup', '/ve-wingsgroup'),
      nav('Năng lực', '/nang-luc-dich-vu'),
      nav('Tin cậy', '/tin-cay-va-phap-ly'),
      nav('Tin tức', '/tin-tuc'),
      nav('Liên hệ', '/lien-he'),
    ],
    tagline: 'Tận tâm trong từng hành trình, vững vàng trong từng kết nối.',
    salesEmail: 'sales@wingsgroup.vn',
    supportEmail: 'info@wingsgroup.vn',
    supportPhone: '0948786775',
    additionalHotlines: [
      { phoneNumber: '0915250101', label: 'Tư vấn tour' },
      { phoneNumber: '0915260101', label: 'Hỗ trợ dịch vụ' },
    ],
  },
} as const

const formFields = [
  {
    blockName: 'full-name',
    blockType: 'text',
    label: 'Họ và tên',
    name: 'full-name',
    required: true,
    width: 100,
  },
  {
    blockName: 'email',
    blockType: 'email',
    label: 'Email',
    name: 'email',
    required: false,
    width: 100,
  },
  {
    blockName: 'phone',
    blockType: 'text',
    label: 'Số điện thoại',
    name: 'phone',
    required: false,
    width: 100,
  },
  {
    blockName: 'brief',
    blockType: 'textarea',
    label: 'Nhu cầu tư vấn',
    name: 'brief',
    required: true,
    width: 100,
  },
]

const pendingConsultationChannels = (['zalo', 'whatsapp', 'messenger'] as const).map((key) => ({
  key,
  state: 'unconfigured' as const,
}))

const seedRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

export const buildWingsGroupSettingsGovernance = (existing?: unknown) => ({
  ...seedRecord(existing),
  consultationChannels: pendingConsultationChannels,
  enabled: true,
  englishPublicationState: 'approved',
  legalIdentity: WINGSGROUP_LEGAL_IDENTITY,
  privacy: {
    approvalReference: WINGSGROUP_PRIVACY_APPROVAL_REFERENCE,
    approvalState: 'approved',
    consentRequired: true,
    consentEvidenceReference: WINGSGROUP_PRIVACY_DATA_SUBJECT_RIGHTS_EVIDENCE,
    consentVersion: WINGSGROUP_CONSENT_VERSION,
    dataSubjectContact: WINGSGROUP_DATA_CONTACT,
    dataSubjectRightsEvidence: WINGSGROUP_PRIVACY_DATA_SUBJECT_RIGHTS_EVIDENCE,
    dataSubjectRightsStatement: WINGSGROUP_PRIVACY_DATA_SUBJECT_RIGHTS_STATEMENT_VI,
    interBranchTransferAllowed: true,
    policyRouteEn: CONTACT_POLICY_ROUTES.en,
    policyRouteVi: CONTACT_POLICY_ROUTES.vi,
    policyVersion: WINGSGROUP_PRIVACY_VERSION,
    retentionMonths: WINGSGROUP_LEAD_RETENTION_MONTHS,
  },
})

type SeedResult = {
  created: string[]
  policyPending: string[]
  preservedHome: boolean
  updated: string[]
}

export const seedWingsGroupCorporateRoutes = async ({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}): Promise<SeedResult> => {
  if (req.user?.role !== 'super-admin') throw new Error('US-065 seed requires a super-admin.')

  const sites = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: { code: { equals: WINGSGROUP_SITE_CODE } },
  })
  if (sites.docs.length !== 1) throw new Error(`Expected exactly one ${WINGSGROUP_SITE_CODE} site.`)
  const site = sites.docs[0]

  const settingsResult = await payload.find({
    collection: 'site-settings',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: { site: { equals: site.id } },
  })
  if (settingsResult.docs.length !== 1)
    throw new Error('Expected exactly one WingsGroup site-settings record.')
  const settings = settingsResult.docs[0]

  const mediaResult = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    pagination: false,
    req,
    where: { site: { equals: site.id } },
  })
  const mediaByFilename = new Map<string, { id: number | string; publishable: boolean }>()
  for (const media of mediaResult.docs) {
    const filename =
      typeof media.filename === 'string'
        ? media.filename
        : typeof media.governance?.sourceFilename === 'string'
          ? media.governance.sourceFilename
          : null
    const governance = media.governance
    const publishable =
      governance?.managedBy !== 'wingsgroup-v3' || governance.publicationState === 'published'
    if (filename) mediaByFilename.set(filename, { id: media.id, publishable })
    if (typeof media.governance?.sourceFilename === 'string') {
      mediaByFilename.set(media.governance.sourceFilename, { id: media.id, publishable })
    }
  }

  const resolveMediaReference = (value: unknown, label: string): unknown => {
    if (typeof value !== 'string') return value
    const preferredMedia = mediaByFilename.get(value)
    const mediaID = preferredMedia?.publishable ? preferredMedia.id : undefined
    if (mediaID === undefined) {
      throw new Error(
        `WingsGroup ${label} requires a publishable site-scoped media fixture for ${value}.`,
      )
    }
    return mediaID
  }

  const resolveRouteHero = (hero: SeedBlock, label: string): SeedBlock => ({
    ...hero,
    ...(Object.prototype.hasOwnProperty.call(hero, 'media')
      ? { media: resolveMediaReference(hero.media, `${label} hero`) }
      : {}),
    ...(Array.isArray(hero.slides)
      ? {
          slides: hero.slides.map((slide, index) =>
            slide && typeof slide === 'object' && !Array.isArray(slide)
              ? {
                  ...(slide as SeedBlock),
                  media: resolveMediaReference(
                    (slide as SeedBlock).media,
                    `${label} hero slide ${index + 1}`,
                  ),
                  ...(Object.prototype.hasOwnProperty.call(slide, 'mobileMedia')
                    ? {
                        mobileMedia: resolveMediaReference(
                          (slide as SeedBlock).mobileMedia,
                          `${label} mobile hero slide ${index + 1}`,
                        ),
                      }
                    : {}),
                }
              : slide,
          ),
        }
      : {}),
  })

  const resolveRouteLayout = (layout: SeedBlock[]): SeedBlock[] =>
    layout.map((block) => {
      if (block.blockType !== 'wingsGroupEcosystem' || !Array.isArray(block.profiles)) {
        return block
      }

      return {
        ...block,
        profiles: block.profiles.map((profile) => {
          if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return profile
          const stageMedia = (profile as SeedBlock).stageMedia
          if (typeof stageMedia !== 'string') return profile
          return {
            ...(profile as SeedBlock),
            stageMedia: resolveMediaReference(stageMedia, 'ecosystem profile'),
          }
        }),
      }
    })

  const routeSeeds = buildWingsGroupCorporateRouteSeeds()
  const resolvedRouteLayouts = new Map<string, SeedBlock[]>()
  const resolvedRouteHeroes = new Map<string, SeedBlock>()
  for (const route of routeSeeds) {
    for (const locale of ['vi', 'en'] as const) {
      resolvedRouteLayouts.set(`${route.path}:${locale}`, resolveRouteLayout(route[locale].layout))
      resolvedRouteHeroes.set(
        `${route.path}:${locale}`,
        resolveRouteHero(route[locale].hero, `${locale}:${route.path}`),
      )
    }
  }

  const forms = await payload.find({
    collection: 'forms',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    pagination: false,
    req,
    where: { site: { equals: site.id } },
  })
  const matchingContractForms = forms.docs.filter((candidate) => {
    const names = new Set(
      (candidate.fields || []).flatMap((field) =>
        'name' in field && field.name ? [field.name] : [],
      ),
    )
    return names.has('full-name') && (names.has('message') || names.has('brief'))
  })
  const seedOwnedForms = forms.docs.filter((candidate) => candidate.title === 'Liên hệ WingsGroup')
  if (seedOwnedForms.length > 1) {
    throw new Error('Duplicate WingsGroup contact forms owned by the corporate seed.')
  }

  if (seedOwnedForms.length === 0 && matchingContractForms.length > 1) {
    throw new Error('Multiple legacy WingsGroup contact forms match the lead contract.')
  }

  const existingForm = seedOwnedForms[0] || matchingContractForms[0]
  let form = existingForm
    ? ((await payload.update({
        collection: 'forms',
        context: { disableRevalidate: true },
        data: {
          fields: formFields,
          submitButtonLabel: 'Nhận tư vấn phù hợp',
        },
        id: existingForm.id,
        locale: 'vi',
        overrideAccess: true,
        req,
      } as never)) as unknown as (typeof forms.docs)[number])
    : undefined

  if (!form) {
    form = (await payload.create({
      collection: 'forms',
      context: { disableRevalidate: true },
      data: {
        confirmationMessage: lexical('Đã nhận yêu cầu', [
          'Đội ngũ WingsGroup sẽ xem xét và phản hồi theo thông tin bạn cung cấp.',
        ]),
        confirmationType: 'message',
        fields: formFields,
        site: site.id,
        submitButtonLabel: 'Nhận tư vấn phù hợp',
        title: 'Liên hệ WingsGroup',
      },
      locale: 'vi',
      overrideAccess: true,
      req,
    } as never)) as (typeof forms.docs)[number]
  }
  if (!form) throw new Error('WingsGroup contact form could not be resolved.')
  const formID = form.id

  const settingsGovernance = buildWingsGroupSettingsGovernance(settings.wingsGroupV3)

  for (const locale of ['vi', 'en'] as const) {
    await payload.update({
      collection: 'site-settings',
      context: { disableRevalidate: true },
      data: {
        ...wingsGroupSettingsSeed[locale],
        ...(locale === 'vi' ? { wingsGroupV3: settingsGovernance } : {}),
      },
      id: settings.id,
      locale,
      overrideAccess: true,
      req,
    } as never)
  }

  const existingResult = await payload.find({
    collection: 'pages',
    depth: 0,
    limit: 1000,
    locale: 'vi',
    overrideAccess: true,
    pagination: false,
    req,
    where: { site: { equals: site.id } },
  })
  const existingPages = existingResult.docs
  const result: SeedResult = { created: [], policyPending: [], preservedHome: false, updated: [] }

  for (const route of routeSeeds) {
    const action = resolveCorporateRouteSeedAction(existingPages, route)
    let page = existingPages.find((candidate) => candidate.pathname === route.path)
    const slug = route.path === '/' ? 'home' : route.path.slice(1)
    const base = {
      _status: 'draft' as const,
      pathname: route.path,
      site: site.id,
      slug,
      wingsGroupRoute: routeGovernanceForSeed(route),
    }
    const resolvedViLayout = resolvedRouteLayouts.get(`${route.path}:vi`)
    if (!resolvedViLayout) throw new Error(`Missing resolved VI layout for ${route.path}.`)

    if (action === 'create') {
      page = (await payload.create({
        collection: 'pages',
        context: { disableRevalidate: true },
        data: {
          ...base,
          hero: resolvedRouteHeroes.get(`${route.path}:vi`),
          layout: resolvedViLayout,
          meta: {
            breadcrumbLabel: route.vi.title,
            description: route.vi.description,
            title: route.vi.title,
          },
          title: route.vi.title,
        },
        locale: 'vi',
        overrideAccess: true,
        req,
      } as never)) as (typeof existingPages)[number]
      if (!existingPages.some((candidate) => String(candidate.id) === String(page!.id))) {
        existingPages.push(page)
      }
      result.created.push(route.path)
    } else {
      await payload.update({
        collection: 'pages',
        context: { disableRevalidate: true },
        data: base,
        id: page!.id,
        locale: 'vi',
        overrideAccess: true,
        req,
      } as never)
      result.updated.push(route.path)
    }

    if (!route.preserveExisting || action === 'create') {
      for (const locale of ['vi', 'en'] as const) {
        const localized = route[locale]
        const resolvedLocaleLayout = resolvedRouteLayouts.get(`${route.path}:${locale}`)
        if (!resolvedLocaleLayout) {
          throw new Error(`Missing resolved ${locale} layout for ${route.path}.`)
        }
        const layout =
          route.path === '/lien-he'
            ? [
                ...resolvedLocaleLayout,
                {
                  blockName: 'WingsGroup contact form',
                  blockType: 'formBlock',
                  enableIntro: false,
                  form: formID,
                  presentation: 'split-contact',
                },
              ]
            : resolvedLocaleLayout
        await payload.update({
          collection: 'pages',
          context: { disableRevalidate: true },
          data: {
            hero: resolvedRouteHeroes.get(`${route.path}:${locale}`),
            layout,
            meta: {
              breadcrumbLabel: localized.title,
              description: localized.description,
              title: localized.title,
            },
            title: localized.title,
            wingsGroupRoute: routeGovernanceForSeed(route),
          },
          id: page!.id,
          locale,
          overrideAccess: true,
          req,
        } as never)
      }
    } else {
      if (page?.hero?.type === 'none') {
        for (const locale of ['vi', 'en'] as const) {
          await payload.update({
            collection: 'pages',
            context: { disableRevalidate: true },
            data: { hero: resolvedRouteHeroes.get(`${route.path}:${locale}`) },
            id: page.id,
            locale,
            overrideAccess: true,
            req,
          } as never)
        }
      }

      const localized = route.en
      const resolvedEnglishLayout = resolvedRouteLayouts.get(`${route.path}:en`)
      if (!resolvedEnglishLayout) {
        throw new Error(`Missing resolved en layout for ${route.path}.`)
      }
      await payload.update({
        collection: 'pages',
        context: { disableRevalidate: true },
        data: {
          hero: resolvedRouteHeroes.get(`${route.path}:en`),
          layout: resolvedEnglishLayout,
          meta: {
            breadcrumbLabel: localized.title,
            description: localized.description,
            title: localized.title,
          },
          title: localized.title,
          wingsGroupRoute: routeGovernanceForSeed(route),
        },
        id: page!.id,
        locale: 'en',
        overrideAccess: true,
        req,
      } as never)
      result.preservedHome = true
    }

    if (route.policy && !isApprovedPrivacyRoute(route)) {
      result.policyPending.push(route.path)
      continue
    }

    const publishLocales = isApprovedPrivacyRoute(route)
      ? (['vi', 'en'] as const)
      : (['vi'] as const)
    try {
      for (const locale of publishLocales) {
        await payload.update({
          collection: 'pages',
          context: { disableRevalidate: true },
          data: { _status: 'published' },
          id: page!.id,
          locale,
          overrideAccess: true,
          req,
        } as never)
      }
    } catch (error) {
      if (route.path !== '/') throw error
      result.policyPending.push('/')
    }

    await payload.update({
      collection: 'pages',
      context: { disableRevalidate: true },
      data: { wingsGroupRoute: routeGovernanceForSeed(route) },
      id: page!.id,
      locale: 'vi',
      overrideAccess: true,
      req,
    } as never)
  }

  return result
}
