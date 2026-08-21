/**
 * Local-only E09-20 preview seed. The production content contract remains in
 * Payload; this command only makes the run-owned e09-preview.db exercise the
 * final VI homepage composition and governed media relations.
 */
import 'dotenv/config'

import path from 'node:path'

import { createLocalReq, getPayload } from 'payload'

import config from '../src/payload.config'
import {
  WINGSGROUP_LOCAL_DRAFT_PREVIEW_CONTEXT,
  WINGSGROUP_SITE_CODE,
} from '../src/wingsgroup/corporateRoutes'
import {
  WINGSGROUP_CONSENT_VERSION,
  WINGSGROUP_DATA_CONTACT,
  WINGSGROUP_LEAD_RETENTION_MONTHS,
  WINGSGROUP_POLICY_ROUTES,
  WINGSGROUP_PRIVACY_VERSION,
} from '../src/lead-capture/wingsGroupV3'
import { resolveLocalDatabaseURL } from '../src/utilities/localDatabase'

export const WINGSGROUP_PREVIEW_MEDIA_FILENAMES = [
  'wingsgroup-hero-discovery-guide.png',
  'wingsgroup-hero-private-consultation.png',
  'wingsgroup-hero-airport-welcome.png',
  'wingsgroup-hero-partner-meeting.png',
  'wingsgroup-ecosystem-hero.png',
  'wingsgroup-vietnam-discovery.png',
  'wingsgroup-airport-service.png',
  'wingsgroup-corporate-partnership.png',
  'wingsgroup-travel-support.png',
  'wingsgroup-journey-consultation.png',
  'wingsgroup-journey-guide.png',
  'wingsgroup-selection-guide.png',
  'wingsgroup-travel-trends.png',
] as const

export const assertWingsGroupPreviewMediaPending = (mediaDocs: readonly unknown[]): void => {
  const governed = mediaDocs.filter(
    (media): media is { governance?: Record<string, unknown> } =>
      Boolean(media) &&
      typeof media === 'object' &&
      (media as { governance?: { managedBy?: unknown } }).governance?.managedBy === 'wingsgroup-v3',
  )
  if (governed.length !== WINGSGROUP_PREVIEW_MEDIA_FILENAMES.length) {
    throw new Error(
      `Expected exactly ${WINGSGROUP_PREVIEW_MEDIA_FILENAMES.length} governed preview media records.`,
    )
  }
  const filenames = new Set(governed.map((media) => String(media.governance?.sourceFilename || '')))
  const missing = WINGSGROUP_PREVIEW_MEDIA_FILENAMES.filter((filename) => !filenames.has(filename))
  if (missing.length > 0) throw new Error(`Missing governed preview media: ${missing.join(', ')}`)
  if (governed.some((media) => media.governance?.publicationState !== 'pending')) {
    throw new Error(
      'The local E09-20 preview seed requires every governed media record to remain pending.',
    )
  }
}

export const WINGSGROUP_PREVIEW_CONTACT_FORM_TITLE = 'WingsGroup local draft contact intake'

export const WINGSGROUP_PREVIEW_CONTACT_FIELDS = [
  {
    blockName: 'full-name',
    blockType: 'text',
    label: 'Họ và tên',
    name: 'full-name',
    required: true,
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
] as const

const databaseURL = resolveLocalDatabaseURL(process.env.DATABASE_URL)

const lexical = (heading: string, paragraph: string) => ({
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
        tag: 'h1',
        type: 'heading',
        version: 1,
      },
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: paragraph,
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        textFormat: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
})

const sourceFile = (value: string) => value

const main = async () => {
  const apply = process.argv.includes('--apply')
  if (!apply) {
    console.log(
      JSON.stringify(
        {
          apply: false,
          databaseURL,
          expected: 'file:./e09-preview.db',
          layout: ['ecosystem', 'trust', 'proof', 'editorial', 'contact'],
        },
        null,
        2,
      ),
    )
    return
  }

  if (
    !databaseURL.startsWith('file:') ||
    !path.basename(databaseURL.replace(/^file:/, '')).includes('e09-preview')
  ) {
    throw new Error(
      'This preview seed is restricted to the run-owned e09-preview.db SQLite database.',
    )
  }

  const payload = await getPayload({ config })
  try {
    const sites = await payload.find({
      collection: 'sites',
      depth: 0,
      limit: 2,
      overrideAccess: true,
      pagination: false,
      where: { code: { equals: WINGSGROUP_SITE_CODE } },
    })
    if (sites.docs.length !== 1) throw new Error('Expected exactly one WingsGroup site.')
    const site = sites.docs[0]

    const settingsResult = await payload.find({
      collection: 'site-settings',
      depth: 0,
      limit: 2,
      overrideAccess: true,
      pagination: false,
      where: { site: { equals: site.id } },
    })
    if (settingsResult.docs.length !== 1) {
      throw new Error('Expected exactly one WingsGroup site-settings record.')
    }
    const siteSettings = settingsResult.docs[0]

    const users = await payload.find({
      collection: 'users',
      depth: 0,
      limit: 10,
      overrideAccess: true,
      pagination: false,
      where: { role: { equals: 'super-admin' } },
    })
    const operator = users.docs[0]
    if (!operator) throw new Error('A local super-admin is required for the governed page hook.')
    const req = await createLocalReq({ user: operator }, payload)
    req.context = {
      ...(req.context || {}),
      disableRevalidate: true,
      [WINGSGROUP_LOCAL_DRAFT_PREVIEW_CONTEXT]: true,
    }

    const mediaResult = await payload.find({
      collection: 'media',
      depth: 0,
      limit: 30,
      overrideAccess: true,
      pagination: false,
      where: { site: { equals: site.id } },
    })
    assertWingsGroupPreviewMediaPending(mediaResult.docs)
    const mediaBySource = new Map(
      mediaResult.docs.map((media) => [media.governance?.sourceFilename || '', media.id]),
    )
    const mediaID = (filename: string) => {
      const id = mediaBySource.get(sourceFile(filename))
      if (id === undefined) throw new Error(`Missing governed media record for ${filename}.`)
      return id
    }

    const settingsGovernance = {
      ...(siteSettings.wingsGroupV3 || {}),
      enabled: true,
      englishPublicationState: 'hidden',
      privacy: {
        ...(siteSettings.wingsGroupV3?.privacy || {}),
        consentRequired: true,
        consentVersion: WINGSGROUP_CONSENT_VERSION,
        dataSubjectContact: WINGSGROUP_DATA_CONTACT,
        interBranchTransferAllowed: true,
        policyRouteEn: WINGSGROUP_POLICY_ROUTES.en,
        policyRouteVi: WINGSGROUP_POLICY_ROUTES.vi,
        policyVersion: WINGSGROUP_PRIVACY_VERSION,
        retentionMonths: WINGSGROUP_LEAD_RETENTION_MONTHS,
      },
      consultationChannels: [
        { key: 'zalo', state: 'pending' },
        { key: 'whatsapp', state: 'pending' },
        { key: 'messenger', state: 'pending' },
      ],
    }

    await payload.update({
      collection: 'site-settings',
      data: { wingsGroupV3: settingsGovernance },
      id: siteSettings.id,
      locale: 'vi',
      overrideAccess: true,
      req,
    } as never)

    const formsResult = await payload.find({
      collection: 'forms',
      depth: 0,
      limit: 100,
      overrideAccess: true,
      pagination: false,
      req,
      where: { site: { equals: site.id } },
    })
    const existingContactForm = formsResult.docs.find(
      (form) => form.title === WINGSGROUP_PREVIEW_CONTACT_FORM_TITLE,
    )
    const contactFormData = {
      confirmationMessage: lexical(
        'Đã nhận yêu cầu',
        'Đây là bản xem trước cục bộ. Đội ngũ sẽ phản hồi sau khi kênh tiếp nhận chính thức được cấu hình.',
      ),
      confirmationType: 'message',
      fields: WINGSGROUP_PREVIEW_CONTACT_FIELDS,
      site: site.id,
      submitButtonLabel: 'Nhận tư vấn phù hợp',
      title: WINGSGROUP_PREVIEW_CONTACT_FORM_TITLE,
    }
    const contactForm = (
      existingContactForm
        ? await payload.update({
            collection: 'forms',
            data: contactFormData,
            id: existingContactForm.id,
            locale: 'vi',
            overrideAccess: true,
            req,
          } as never)
        : await payload.create({
            collection: 'forms',
            data: contactFormData,
            locale: 'vi',
            overrideAccess: true,
            req,
          } as never)
    ) as (typeof formsResult.docs)[number]

    const profile = (
      brandKey: 'wingsgo' | 'wing-side' | 'wingspass' | 'wingsplus' | 'wingscare',
      brandName: string,
      filename: string,
      serviceScope: string[],
      description: string,
    ) => ({
      brandKey,
      brandName,
      cta: {
        contactPath: '/lien-he#contact-form',
        label: `Trao đổi với ${brandName}`,
        state: 'contact-fallback',
      },
      description,
      proofState: 'pending',
      serviceScope: serviceScope.map((label) => ({ label })),
      stageMedia: mediaID(filename),
    })

    const layout = [
      {
        blockType: 'wingsGroupEcosystem',
        description:
          'Chọn điều bạn đang cần. Mỗi thương hiệu kết nối bạn với một đội ngũ, dịch vụ và điểm bắt đầu riêng.',
        eyebrow: 'Hệ sinh thái dịch vụ',
        profiles: [
          profile(
            'wingsgo',
            'WingsGo',
            'wingsgroup-ecosystem-hero.png',
            ['Điểm đến & lịch tour', 'Lựa chọn hành trình', 'Thông tin trước chuyến đi'],
            'Tour theo lịch và tư vấn hành trình nước ngoài cho khách cần một điểm bắt đầu rõ ràng.',
          ),
          profile(
            'wing-side',
            'WingsSide',
            'wingsgroup-vietnam-discovery.png',
            [
              'Thiết kế theo sở thích & nhịp đi',
              'Gợi ý trải nghiệm địa phương',
              'Linh hoạt cho nhóm riêng',
            ],
            'Một hành trình gần gũi hơn với cảnh sắc, nhịp sống và những trải nghiệm địa phương bạn thật sự muốn có.',
          ),
          profile(
            'wingspass',
            'WingsPass',
            'wingsgroup-airport-service.png',
            ['Fast Track theo nhu cầu', 'Đón & tiễn sân bay', 'Hỗ trợ tại điểm chạm'],
            'Bớt bối rối ở những điểm chạm đầu và cuối hành trình, để thời gian tại sân bay trở nên nhẹ nhàng hơn.',
          ),
          profile(
            'wingsplus',
            'WingsPlus',
            'wingsgroup-corporate-partnership.png',
            [
              'Chương trình theo mục tiêu đoàn',
              'Điều phối trải nghiệm doanh nghiệp',
              'Sự kiện & MICE',
            ],
            'Khi một chuyến đi cần phục vụ cả mục tiêu của tập thể, từng chi tiết phải được đặt trong cùng một kế hoạch.',
          ),
          profile(
            'wingscare',
            'WingsCare',
            'wingsgroup-travel-support.png',
            ['Làm rõ quyền lợi', 'Giải thích phạm vi hỗ trợ', 'Lưu ý trước hành trình'],
            'Sự an tâm không đến từ lời hứa chung chung, mà từ việc hiểu rõ quyền lợi và cách nhận hỗ trợ khi cần.',
          ),
        ],
        title: 'Một hệ sinh thái. Năm cách đồng hành.',
      },
      {
        blockType: 'infoStrip',
        blockName: 'WingsGroup trust and legal identity',
        description:
          'Thông tin pháp nhân đã được ghi nhận; các hồ sơ chứng minh khác vẫn chờ kiểm tra.',
        eyebrow: 'Thông tin doanh nghiệp',
        items: [{ label: 'Pháp nhân đã được xác nhận' }],
        title: 'Minh bạch để bạn an tâm lựa chọn.',
      },
      {
        blockType: 'wingsGroupProofArchive',
        description:
          'Hồ sơ chỉ xuất hiện sau khi nguồn, ngữ cảnh, quyền công bố và provenance của media đã được xác minh.',
        eyebrow: 'Dẫn chứng năng lực',
        records: [
          {
            key: 'proof-archive-intro',
            kind: 'other',
            media: mediaID('wingsgroup-journey-consultation.png'),
            permissionState: 'pending',
            publicationState: 'pending',
            title: 'Dấu mốc nổi bật',
          },
          {
            key: 'proof-certificates',
            kind: 'certificate',
            permissionState: 'pending',
            publicationState: 'pending',
            title: 'Tiêu chuẩn phục vụ được ghi nhận.',
          },
          {
            key: 'proof-partner-reviews',
            kind: 'membership',
            permissionState: 'pending',
            publicationState: 'pending',
            title: 'Đồng hành để tạo nên những hành trình tốt hơn.',
          },
          {
            key: 'proof-customer-reviews',
            kind: 'other',
            permissionState: 'pending',
            publicationState: 'pending',
            title: 'Những hành trình được sẻ chia.',
          },
        ],
        title: 'Những dấu mốc tạo nên niềm tin bền vững.',
      },
      {
        blockType: 'archive',
        limit: 3,
        populateBy: 'collection',
        presentation: 'magazine',
        relationTo: 'posts',
      },
      {
        blockType: 'formBlock',
        enableIntro: false,
        form: contactForm.id,
        presentation: 'split-contact',
      },
    ]

    await payload.update({
      collection: 'pages',
      data: {
        _status: 'draft',
        hero: {
          behaviorMode: 'override',
          behaviorOverrides: {
            autoplay: true,
            intervalMs: 6500,
            loop: true,
            pauseOnHover: true,
            showArrows: true,
            showDots: true,
            transition: 'crossfade',
            transitionMs: 600,
          },
          links: [
            {
              link: {
                appearance: 'default',
                label: 'Khám phá dịch vụ',
                type: 'custom',
                url: '#services',
              },
            },
            {
              link: {
                appearance: 'outline',
                label: 'Trao đổi với chuyên viên',
                type: 'custom',
                url: '/lien-he#contact-form',
              },
            },
          ],
          richText: lexical(
            'Tìm đúng dịch vụ cho hành trình của bạn.',
            'Từ chuyến đi nước ngoài đến trải nghiệm tại Việt Nam, dịch vụ sân bay và đoàn riêng, WingsGroup kết nối bạn với đội ngũ phù hợp cho từng nhu cầu.',
          ),
          slides: [
            {
              description: 'Một điểm chạm cho nhiều nhu cầu du lịch.',
              eyebrow: 'WingsGroup',
              media: mediaID('wingsgroup-hero-discovery-guide.png'),
              title: 'Khám phá Việt Nam',
            },
            {
              description: 'Một điểm chạm cho nhiều nhu cầu du lịch.',
              eyebrow: 'WingsGroup',
              media: mediaID('wingsgroup-hero-private-consultation.png'),
              title: 'Tư vấn hành trình riêng',
            },
            {
              description: 'Một điểm chạm cho nhiều nhu cầu du lịch.',
              eyebrow: 'WingsGroup',
              media: mediaID('wingsgroup-hero-airport-welcome.png'),
              title: 'Đón khách tại sân bay',
            },
            {
              description: 'Một điểm chạm cho nhiều nhu cầu du lịch.',
              eyebrow: 'WingsGroup',
              media: mediaID('wingsgroup-hero-partner-meeting.png'),
              title: 'Gặp gỡ đối tác doanh nghiệp',
            },
          ],
          type: 'highImpact',
        },
        layout,
        meta: {
          description:
            'WingsGroup — điểm bắt đầu để tìm đúng dịch vụ du lịch, thông tin doanh nghiệp và đầu mối phù hợp.',
          title: 'WingsGroup — Hệ sinh thái dịch vụ du lịch',
        },
        title: 'WingsGroup',
      } as never,
      id: 1,
      locale: 'vi',
      overrideAccess: true,
      req,
    })

    console.log(
      JSON.stringify(
        {
          apply: true,
          pageID: 1,
          siteCode: WINGSGROUP_SITE_CODE,
          mediaCount: mediaBySource.size,
          contactFormID: contactForm.id,
          layout: ['ecosystem', 'trust', 'proof', 'editorial', 'contact'],
        },
        null,
        2,
      ),
    )
  } finally {
    await payload.destroy()
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
