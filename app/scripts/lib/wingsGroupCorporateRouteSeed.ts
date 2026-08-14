import type { Payload, PayloadRequest } from 'payload'

import {
  WINGSGROUP_CORPORATE_ROUTES,
  WINGSGROUP_LEGAL_IDENTITY,
  WINGSGROUP_RELATIONSHIP_STATEMENT_EN,
  WINGSGROUP_SITE_CODE,
  type WingsGroupRouteDefinition,
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
  layout: SeedBlock[]
  title: string
}

export type WingsGroupCorporateRouteSeed = WingsGroupRouteDefinition & {
  en: LocalizedRouteSeed
  preserveExisting: boolean
  vi: LocalizedRouteSeed
}

const lexical = (heading: string, paragraphs: readonly string[]) => ({
  root: {
    children: [
      {
        children: [{ detail: 0, format: 0, mode: 'normal', style: '', text: heading, type: 'text', version: 1 }],
        direction: 'ltr',
        format: '',
        indent: 0,
        tag: 'h2',
        type: 'heading',
        version: 1,
      },
      ...paragraphs.map((text) => ({
        children: [{ detail: 0, format: 0, mode: 'normal', style: '', text, type: 'text', version: 1 }],
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

const content = (heading: string, ...paragraphs: string[]): SeedBlock => ({
  blockType: 'content',
  columns: [{ richText: lexical(heading, paragraphs), size: 'full' }],
  presentation: 'prose',
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
    locale === 'en' ? 'A considered response starts with a clear brief' : 'Một phản hồi phù hợp bắt đầu từ nhu cầu rõ ràng',
    [
      locale === 'en'
        ? 'The WingsGroup team will review your request and connect it with the most suitable service team.'
        : 'Đội ngũ WingsGroup sẽ xem xét yêu cầu và kết nối với bộ phận dịch vụ phù hợp.',
    ],
  ),
})

const policyDraft = (locale: Locale, label: string): LocalizedRouteSeed => ({
  description:
    locale === 'en'
      ? `${label} is being prepared for legal ownership and editorial approval. It is not public policy.`
      : `${label} đang được hoàn thiện chủ sở hữu pháp lý và phê duyệt biên tập. Đây chưa phải chính sách công khai.`,
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

const routeContent: Record<Exclude<WingsGroupRouteDefinition['path'], '/'>, { en: LocalizedRouteSeed; vi: LocalizedRouteSeed }> = {
  '/ve-wingsgroup': {
    vi: {
      title: 'Về WingsGroup',
      description: 'Thông tin doanh nghiệp, văn phòng và mối quan hệ thương hiệu của WingsGroup.',
      layout: [
        content(
          'Một tổ chức du lịch, nhiều thương hiệu dịch vụ',
          WINGSGROUP_LEGAL_IDENTITY.relationshipStatement,
          `${WINGSGROUP_LEGAL_IDENTITY.legalEntityName} có tên quốc tế và viết tắt ${WINGSGROUP_LEGAL_IDENTITY.internationalName}. Người đại diện pháp luật: ${WINGSGROUP_LEGAL_IDENTITY.legalRepresentative}.`,
        ),
        features('Thông tin doanh nghiệp', 'Địa chỉ làm việc minh bạch', 'Thông tin được quản lý tập trung tại WingsGroup.', [
          { title: 'Trụ sở đăng ký', description: WINGSGROUP_LEGAL_IDENTITY.registeredOffice },
          { title: 'Văn phòng du lịch', description: WINGSGROUP_LEGAL_IDENTITY.travelOffice },
        ]),
        contactCTA('vi'),
      ],
    },
    en: {
      title: 'About WingsGroup',
      description: 'Corporate identity, offices and the public brand relationship behind WingsGroup.',
      layout: [
        content(
          'One organisational ecosystem, developing travel brands',
          WINGSGROUP_RELATIONSHIP_STATEMENT_EN,
          `${WINGSGROUP_LEGAL_IDENTITY.legalEntityName} uses the international abbreviation ${WINGSGROUP_LEGAL_IDENTITY.internationalName}. Its legal representative is ${WINGSGROUP_LEGAL_IDENTITY.legalRepresentative}.`,
        ),
        features('Corporate details', 'Clear office information', 'The organisation maintains a registered office and a travel office in Hanoi.', [
          { title: 'Registered office', description: WINGSGROUP_LEGAL_IDENTITY.registeredOffice },
          { title: 'Travel office', description: WINGSGROUP_LEGAL_IDENTITY.travelOffice },
        ]),
        contactCTA('en'),
      ],
    },
  },
  '/nang-luc-dich-vu': {
    vi: {
      title: 'Năng lực dịch vụ',
      description: 'Các nhóm dịch vụ du lịch được tổ chức theo nhu cầu khách hàng và đối tác.',
      layout: [
        features('Năng lực', 'Dịch vụ được tổ chức theo nhu cầu', 'Mỗi thương hiệu tập trung vào một hành trình phục vụ rõ ràng.', [
          { title: 'Du lịch nước ngoài', description: 'Tư vấn hành trình, lịch khởi hành và hỗ trợ trước chuyến đi.' },
          { title: 'Đón khách tại Việt Nam', description: 'Thiết kế hành trình Việt Nam linh hoạt cho khách quốc tế.' },
          { title: 'Khách đoàn và sự kiện', description: 'Đề xuất riêng cho đoàn doanh nghiệp, hội nghị và chuyến đi theo yêu cầu.' },
          { title: 'Dịch vụ hỗ trợ', description: 'Hỗ trợ sân bay, chăm sóc hành trình và các nhu cầu liên quan.' },
        ]),
        contactCTA('vi'),
      ],
    },
    en: {
      title: 'Service Capabilities',
      description: 'Travel services organised around the needs of travellers, groups and partners.',
      layout: [
        features('Capabilities', 'Services shaped around each request', 'Each public brand concentrates on a clear customer journey.', [
          { title: 'Outbound travel', description: 'Journey advice, departure planning and considerate pre-trip support.' },
          { title: 'Travel in Vietnam', description: 'Flexible Vietnam journeys designed for international guests.' },
          { title: 'Groups and events', description: 'Tailored proposals for corporate groups, meetings and special journeys.' },
          { title: 'Travel support', description: 'Airport assistance, journey care and related services.' },
        ]),
        contactCTA('en'),
      ],
    },
  },
  '/tin-cay-va-phap-ly': {
    vi: {
      title: 'Tin cậy và pháp lý',
      description: 'Thông tin pháp nhân và giấy phép đã được xác nhận cho WingsGroup.',
      layout: [
        content(
          'Thông tin pháp lý công khai',
          `Pháp nhân: ${WINGSGROUP_LEGAL_IDENTITY.legalEntityName} (${WINGSGROUP_LEGAL_IDENTITY.internationalName}).`,
          `Mã số doanh nghiệp: ${WINGSGROUP_LEGAL_IDENTITY.registrationNumber}. Giấy phép kinh doanh dịch vụ lữ hành quốc tế: ${WINGSGROUP_LEGAL_IDENTITY.licenceNumber}.`,
          `Người đại diện pháp luật: ${WINGSGROUP_LEGAL_IDENTITY.legalRepresentative}.`,
        ),
        contactCTA('vi'),
      ],
    },
    en: {
      title: 'Trust and Legal Information',
      description: 'Confirmed corporate identity and travel-licence information for WingsGroup.',
      layout: [
        content(
          'Public legal information',
          `Legal entity: ${WINGSGROUP_LEGAL_IDENTITY.legalEntityName} (${WINGSGROUP_LEGAL_IDENTITY.internationalName}).`,
          `Business registration: ${WINGSGROUP_LEGAL_IDENTITY.registrationNumber}. International travel licence: ${WINGSGROUP_LEGAL_IDENTITY.licenceNumber}.`,
          `Legal representative: ${WINGSGROUP_LEGAL_IDENTITY.legalRepresentative}.`,
        ),
        contactCTA('en'),
      ],
    },
  },
  '/tin-tuc': {
    vi: {
      title: 'Tin tức',
      description: 'Tin tức và góc nhìn từ WingsGroup.',
      layout: [{ blockType: 'archive', introContent: lexical('Tin tức và góc nhìn', ['Thông tin được biên tập theo phạm vi hoạt động của WingsGroup.']), limit: 9, populateBy: 'collection', presentation: 'card-grid', relationTo: 'posts' }],
    },
    en: {
      title: 'News and Insights',
      description: 'News and considered perspectives from WingsGroup.',
      layout: [{ blockType: 'archive', introContent: lexical('News and insights', ['Editorial updates are prepared within the public scope of WingsGroup.']), limit: 9, populateBy: 'collection', presentation: 'card-grid', relationTo: 'posts' }],
    },
  },
  '/lien-he': {
    vi: {
      title: 'Liên hệ',
      description: 'Gửi nhu cầu để WingsGroup kết nối bạn với bộ phận phù hợp.',
      layout: [content('Chúng tôi sẵn sàng lắng nghe', 'Hãy chia sẻ thời gian, số lượng khách, điểm đến hoặc loại dịch vụ bạn đang quan tâm.'), contactCTA('vi')],
    },
    en: {
      title: 'Contact',
      description: 'Share your request and WingsGroup will connect you with the most suitable team.',
      layout: [content('We would be pleased to hear from you', 'Please share your preferred timing, party size, destination or the service you are considering.'), contactCTA('en')],
    },
  },
  '/chinh-sach-bao-mat': {
    vi: policyDraft('vi', 'Chính sách bảo mật'),
    en: policyDraft('en', 'Privacy Policy'),
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

export const routeGovernanceForSeed = (definition: WingsGroupRouteDefinition) => ({
  archetype: definition.archetype,
  contentApproval: { en: null, vi: null },
  managedBy: 'wingsgroup-v3' as const,
  policy: definition.policy
    ? {
        approvalReference: null,
        approvalState: 'pending' as const,
        consentEvidenceReference: null,
        consentVersion: WINGSGROUP_CONSENT_VERSION,
        dataSubjectContact: WINGSGROUP_DATA_CONTACT,
        dataSubjectRightsEvidence: null,
        dataSubjectRightsStatement: null,
        effectiveDate: null,
        legalEntity: WINGSGROUP_LEGAL_IDENTITY.legalEntityName,
        legalOwner: null,
        policyVersion: WINGSGROUP_PRIVACY_VERSION,
        privacyApprovalReference: null,
        retentionMonths: WINGSGROUP_LEAD_RETENTION_MONTHS,
        scope: null,
        validationMarker: null,
        version: 'draft-1',
      }
    : undefined,
  publication: {
    en: 'hidden' as const,
    vi: definition.policy ? ('pending' as const) : ('approved' as const),
  },
})

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
    headerNavItems: [nav('Home', '/'), nav('About', '/ve-wingsgroup'), nav('Capabilities', '/nang-luc-dich-vu'), nav('Trust', '/tin-cay-va-phap-ly'), nav('News', '/tin-tuc'), nav('Contact', '/lien-he')],
    tagline: 'Thoughtful travel, connected expertise.',
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
    headerNavItems: [nav('Trang chủ', '/'), nav('Về WingsGroup', '/ve-wingsgroup'), nav('Năng lực', '/nang-luc-dich-vu'), nav('Tin cậy', '/tin-cay-va-phap-ly'), nav('Tin tức', '/tin-tuc'), nav('Liên hệ', '/lien-he')],
    tagline: 'Tận tâm trong từng hành trình, vững vàng trong từng kết nối.',
  },
} as const

const formFields = [
  { blockName: 'full-name', blockType: 'text', label: 'Họ và tên', name: 'full-name', required: true, width: 100 },
  { blockName: 'email', blockType: 'email', label: 'Email', name: 'email', required: true, width: 100 },
  { blockName: 'phone', blockType: 'text', label: 'Số điện thoại', name: 'phone', required: false, width: 100 },
  { blockName: 'message', blockType: 'textarea', label: 'Nhu cầu tư vấn', name: 'message', required: true, width: 100 },
]

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

  const sites = await payload.find({ collection: 'sites', depth: 0, limit: 2, overrideAccess: true, pagination: false, req, where: { code: { equals: WINGSGROUP_SITE_CODE } } })
  if (sites.docs.length !== 1) throw new Error(`Expected exactly one ${WINGSGROUP_SITE_CODE} site.`)
  const site = sites.docs[0]

  const settingsResult = await payload.find({ collection: 'site-settings', depth: 0, limit: 2, overrideAccess: true, pagination: false, req, where: { site: { equals: site.id } } })
  if (settingsResult.docs.length !== 1) throw new Error('Expected exactly one WingsGroup site-settings record.')
  const settings = settingsResult.docs[0]

  const forms = await payload.find({ collection: 'forms', depth: 0, limit: 100, overrideAccess: true, pagination: false, req, where: { site: { equals: site.id } } })
  let form = forms.docs.find((candidate) => {
    const names = new Set((candidate.fields || []).flatMap((field) => ('name' in field && field.name ? [field.name] : [])))
    return names.has('full-name') && (names.has('message') || names.has('brief'))
  })
  if (!form) {
    form = (await payload.create({
      collection: 'forms',
      context: { disableRevalidate: true },
      data: {
        confirmationMessage: lexical('Đã nhận yêu cầu', ['Đội ngũ WingsGroup sẽ xem xét và phản hồi theo thông tin bạn cung cấp.']),
        confirmationType: 'message',
        fields: formFields,
        site: site.id,
        submitButtonLabel: 'Gửi yêu cầu',
        title: 'Liên hệ WingsGroup',
      },
      locale: 'vi',
      overrideAccess: true,
      req,
    } as never)) as (typeof forms.docs)[number]
  }
  if (!form) throw new Error('WingsGroup contact form could not be resolved.')
  const formID = form.id

  const settingsGovernance = {
    ...(settings.wingsGroupV3 || {}),
    enabled: true,
    englishPublicationState: 'hidden',
    legalIdentity: WINGSGROUP_LEGAL_IDENTITY,
    privacy: {
      approvalReference: null,
      approvalState: 'pending',
      consentRequired: true,
      consentEvidenceReference: null,
      consentVersion: WINGSGROUP_CONSENT_VERSION,
      dataSubjectContact: WINGSGROUP_DATA_CONTACT,
      dataSubjectRightsEvidence: null,
      dataSubjectRightsStatement: null,
      interBranchTransferAllowed: true,
      policyRouteEn: CONTACT_POLICY_ROUTES.en,
      policyRouteVi: CONTACT_POLICY_ROUTES.vi,
      policyVersion: WINGSGROUP_PRIVACY_VERSION,
      retentionMonths: WINGSGROUP_LEAD_RETENTION_MONTHS,
    },
  }

  for (const locale of ['vi', 'en'] as const) {
    await payload.update({
      collection: 'site-settings',
      context: { disableRevalidate: true },
      data: { ...wingsGroupSettingsSeed[locale], ...(locale === 'vi' ? { wingsGroupV3: settingsGovernance } : {}) },
      id: settings.id,
      locale,
      overrideAccess: true,
      req,
    } as never)
  }

  const existingResult = await payload.find({ collection: 'pages', depth: 0, limit: 1000, locale: 'vi', overrideAccess: true, pagination: false, req, where: { site: { equals: site.id } } })
  const existingPages = existingResult.docs
  const result: SeedResult = { created: [], policyPending: [], preservedHome: false, updated: [] }

  for (const route of buildWingsGroupCorporateRouteSeeds()) {
    const action = resolveCorporateRouteSeedAction(existingPages, route)
    let page = existingPages.find((candidate) => candidate.pathname === route.path)
    const slug = route.path === '/' ? 'home' : route.path.slice(1)
    const base = { _status: 'draft' as const, pathname: route.path, site: site.id, slug, wingsGroupRoute: routeGovernanceForSeed(route) }

    if (action === 'create') {
      page = (await payload.create({ collection: 'pages', context: { disableRevalidate: true }, data: { ...base, hero: { type: 'none' }, layout: route.vi.layout, meta: { breadcrumbLabel: route.vi.title, description: route.vi.description, title: route.vi.title }, title: route.vi.title }, locale: 'vi', overrideAccess: true, req } as never)) as (typeof existingPages)[number]
      if (!existingPages.some((candidate) => String(candidate.id) === String(page!.id))) {
        existingPages.push(page)
      }
      result.created.push(route.path)
    } else {
      await payload.update({ collection: 'pages', context: { disableRevalidate: true }, data: base, id: page!.id, locale: 'vi', overrideAccess: true, req } as never)
      result.updated.push(route.path)
    }

    if (!route.preserveExisting || action === 'create') {
      for (const locale of ['vi', 'en'] as const) {
        const localized = route[locale]
        const layout = route.path === '/lien-he'
          ? [...localized.layout, { blockName: 'WingsGroup contact form', blockType: 'formBlock', enableIntro: false, form: formID, presentation: 'split-contact' }]
          : localized.layout
        await payload.update({ collection: 'pages', context: { disableRevalidate: true }, data: { hero: { type: 'none' }, layout, meta: { breadcrumbLabel: localized.title, description: localized.description, title: localized.title }, title: localized.title }, id: page!.id, locale, overrideAccess: true, req } as never)
      }
    } else {
      result.preservedHome = true
    }

    if (route.policy) {
      result.policyPending.push(route.path)
      continue
    }

    try {
      await payload.update({ collection: 'pages', context: { disableRevalidate: true }, data: { _status: 'published' }, id: page!.id, locale: 'vi', overrideAccess: true, req } as never)
    } catch (error) {
      if (route.path !== '/') throw error
      result.policyPending.push('/')
    }
  }

  return result
}
