/**
 * Local-only E09-20 preview seed. The production content contract remains in
 * Payload; this command only exercises the final VI homepage composition and
 * governed media relations inside the authenticated in-memory preview store.
 */
import 'dotenv/config'

import fs from 'node:fs/promises'
import path from 'node:path'

import { createLocalReq, getPayload } from 'payload'

import {
  WINGSGROUP_LEGAL_IDENTITY,
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
import {
  isWingsGroupLocalPreviewStoreConfigured,
  startWingsGroupLocalPreviewStore,
} from '../src/utilities/localPreviewStore'
import {
  assertApplicableWingsGroupV3MediaPlan,
  buildWingsGroupV3MediaPlan,
  parseWingsGroupV3MediaManifest,
} from './lib/wingsGroupV3MediaPlan'
import { seedWingsGroupV3PreviewMedia } from './lib/wingsGroupV3PreviewMediaSeed'

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

const defaultManifestPath = path.resolve(
  process.cwd(),
  '../docs/product/wingsgroup-v3-media-manifest.json',
)

export const parseWingsGroupV3PreviewSeedCommand = (argv: string[]) => {
  const option = (name: string): string | undefined =>
    argv.find((argument) => argument.startsWith(`--${name}=`))?.slice(name.length + 3)
  const apply = argv.includes('--apply')
  const assetsDirectory = option('assets-dir')
  if (apply && !assetsDirectory) {
    throw new Error('--assets-dir is required with --apply.')
  }
  return {
    apply,
    assetsDirectory: assetsDirectory ? path.resolve(assetsDirectory) : null,
    manifestPath: path.resolve(option('manifest') || defaultManifestPath),
  }
}

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
  const command = parseWingsGroupV3PreviewSeedCommand(process.argv.slice(2))
  if (!command.apply) {
    console.log(
      JSON.stringify(
        {
          apply: false,
          storage: 'authenticated in-memory preview store',
          mediaStorage: 'authenticated in-memory preview media store',
          manifestPath: command.manifestPath,
          layout: ['ecosystem', 'trust', 'proof', 'editorial', 'contact'],
        },
        null,
        2,
      ),
    )
    return
  }

  let ownedStore: Awaited<ReturnType<typeof startWingsGroupLocalPreviewStore>> | undefined
  try {
    if (!isWingsGroupLocalPreviewStoreConfigured()) {
      ownedStore = await startWingsGroupLocalPreviewStore({
        baseDatabasePath:
          process.env.E09_PREVIEW_BASE_DATABASE?.trim() ||
          path.resolve(process.cwd(), 'e09-preview.db'),
      })
      process.env.DATABASE_URL = ownedStore.url
      process.env.E09_PREVIEW_STORE_URL = ownedStore.url
      process.env.E09_PREVIEW_STORE_TOKEN = ownedStore.token
      process.env.E09_PREVIEW_MEDIA_SEED = 'true'
    }

    if (process.env.NODE_ENV === 'production' || !isWingsGroupLocalPreviewStoreConfigured()) {
      throw new Error(
        'E09 preview seed requires the authenticated non-production in-memory preview store.',
      )
    }

    const mediaDirectory = process.env.E09_PREVIEW_MEDIA_DIRECTORY?.trim() || ''
    const assetsDirectory = command.assetsDirectory!
    const manifest = parseWingsGroupV3MediaManifest(
      JSON.parse(await fs.readFile(command.manifestPath, 'utf8')),
    )
    const plan = await buildWingsGroupV3MediaPlan({ assetsDirectory, manifest })
    assertApplicableWingsGroupV3MediaPlan(plan)

    const { default: config } = await import('../src/payload.config')
    const payload = await getPayload({ config })
    try {
      return await seedPreviewContent({ assetsDirectory, mediaDirectory, manifest, payload, plan })
    } finally {
      await payload.destroy()
    }
  } finally {
    await ownedStore?.close()
  }
}

const seedPreviewContent = async ({
  assetsDirectory,
  mediaDirectory,
  manifest,
  payload,
  plan,
}: {
  assetsDirectory: string
  mediaDirectory: string
  manifest: Awaited<ReturnType<typeof parseWingsGroupV3MediaManifest>>
  payload: Awaited<ReturnType<typeof getPayload>>
  plan: Awaited<ReturnType<typeof buildWingsGroupV3MediaPlan>>
}) => {
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
    e09PreviewMediaSeed: true,
    [WINGSGROUP_LOCAL_DRAFT_PREVIEW_CONTEXT]: true,
  }

  const mediaSeed = await seedWingsGroupV3PreviewMedia({
    assetsDirectory,
    manifest,
    mediaDirectory,
    payload,
    plan,
    req,
    siteID: site.id,
  })

  const mediaResult = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 30,
    overrideAccess: true,
    pagination: false,
    req,
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
    legalIdentity: WINGSGROUP_LEGAL_IDENTITY,
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
        'Từ chuyến đi xa đến những nhu cầu rất riêng — luôn có một Wings dành cho bạn.',
      eyebrow: 'Hệ sinh thái dịch vụ',
      profiles: [
        profile(
          'wingsgo',
          'WingsGo',
          'wingsgroup-ecosystem-hero.png',
          ['Du lịch nước ngoài', 'Lịch khởi hành', 'Thông tin trước chuyến đi'],
          'Đi xa, mọi thứ đã có WingsGo lo. Tour theo lịch và tư vấn hành trình nước ngoài cho khách cần một điểm bắt đầu rõ ràng.',
        ),
        profile(
          'wing-side',
          'WingSide',
          'wingsgroup-vietnam-discovery.png',
          [
            'Du lịch Việt Nam',
            'Điểm đến bản địa',
            'Hành trình linh hoạt',
          ],
          'Đi gần, trải nghiệm đáng nhớ hơn. Một hành trình gần gũi hơn với cảnh sắc, nhịp sống và những trải nghiệm địa phương bạn thật sự muốn có.',
        ),
        profile(
          'wingspass',
          'WingsPass',
          'wingsgroup-airport-service.png',
          ['Dịch vụ sân bay', 'Fast Track theo nhu cầu', 'Đón & tiễn sân bay'],
          'Đến sân bay, có người đồng hành. Bớt bối rối ở những điểm chạm đầu và cuối hành trình, để thời gian tại sân bay trở nên nhẹ nhàng hơn.',
        ),
        profile(
          'wingsplus',
          'WingsPlus',
          'wingsgroup-corporate-partnership.png',
          [
            'Hành trình riêng',
            'MICE',
            'Trọn vẹn từ ý tưởng đến hành trình',
          ],
          'Bạn có mục tiêu. Chúng tôi tạo hành trình. Khi một chuyến đi cần phục vụ cả mục tiêu của tập thể, từng chi tiết phải được đặt trong cùng một kế hoạch.',
        ),
        profile(
          'wingscare',
          'WingsCare',
          'wingsgroup-travel-support.png',
          ['Chăm sóc hành trình', 'Đồng hành trong hành trình', 'Chăm sóc sau chuyến đi'],
          'Cần hỗ trợ? WingsCare luôn ở đó. Sự an tâm không đến từ lời hứa chung chung, mà từ việc hiểu rõ quyền lợi và cách nhận hỗ trợ khi cần.',
        ),
      ],
      title: 'MỘT HỆ SINH THÁI. NĂM CÁCH ĐỒNG HÀNH',
    },
    {
      blockType: 'infoStrip',
      blockName: 'WingsGroup trust and legal identity',
      description:
        'Thông tin pháp nhân đã được ghi nhận; các hồ sơ chứng minh khác vẫn chờ kiểm tra.',
      eyebrow: 'Thông tin doanh nghiệp',
      items: [
        { label: 'Pháp nhân đã được xác nhận' },
        {
          description: 'Số liệu do WingsGroup cung cấp.',
          label: 'Khách hàng cá nhân đồng hành',
          value: '10.000+',
        },
        {
          description: 'Số liệu do WingsGroup cung cấp.',
          label: 'Chương trình MICE doanh nghiệp',
          value: '500+',
        },
        {
          description: 'Số liệu do WingsGroup cung cấp.',
          label: 'Đánh giá hài lòng về dịch vụ Fast Track',
          value: '98%',
        },
      ],
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

  const existingHome = await payload.find({
    collection: 'pages',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [{ site: { equals: site.id } }, { pathname: { equals: '/' } }],
    },
  })
  if (existingHome.docs.length > 1) {
    throw new Error('Expected at most one WingsGroup homepage.')
  }

  const homePageData = {
    _status: 'draft',
    site: site.id,
    slug: 'home',
    wingsGroupRoute: {
      archetype: 'home',
      managedBy: 'wingsgroup-v3',
      publication: { en: 'hidden', vi: 'hidden' },
    },
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
            label: 'Tham khảo dịch vụ',
            type: 'custom',
            url: '#services',
          },
        },
        {
          link: {
            appearance: 'outline',
            label: 'Nhận tư vấn 🎧',
            type: 'custom',
            url: '/lien-he#contact-form',
          },
        },
      ],
      richText: lexical(
        'Một hệ sinh thái - Trọn vẹn hành trình.',
        'Từ tour du lịch quốc tế, du lịch Việt Nam đến vé máy bay, visa, dịch vụ sân bay, MICE và hành trình thiết kế riêng – WingsGroup cung cấp giải pháp du lịch trọn vẹn, kết nối bạn với đúng dịch vụ và đội ngũ phù hợp cho từng nhu cầu.',
      ),
      slides: [
        {
          description: 'Từ tour du lịch quốc tế, du lịch Việt Nam đến vé máy bay, visa, dịch vụ sân bay, MICE và hành trình thiết kế riêng.',
          eyebrow: 'HỆ SINH THÁI DỊCH VỤ DU LỊCH WINGSGROUP',
          media: mediaID('wingsgroup-hero-discovery-guide.png'),
          title: 'Một hệ sinh thái - Trọn vẹn hành trình.',
        },
        {
          description: 'Hành trình riêng, đoàn doanh nghiệp và MICE được thiết kế theo đúng mục tiêu.',
          eyebrow: 'HỆ SINH THÁI DỊCH VỤ DU LỊCH WINGSGROUP',
          media: mediaID('wingsgroup-hero-private-consultation.png'),
          title: 'Tư vấn hành trình riêng',
        },
        {
          description: 'Đón tiễn chu đáo, Fast Track thuận tiện cho điểm chạm đầu và cuối hành trình.',
          eyebrow: 'HỆ SINH THÁI DỊCH VỤ DU LỊCH WINGSGROUP',
          media: mediaID('wingsgroup-hero-airport-welcome.png'),
          title: 'Dịch vụ tại sân bay',
        },
        {
          description: 'Đối tác tin cậy cho các chương trình hội nghị, teambuilding và tri ân đối tác.',
          eyebrow: 'HỆ SINH THÁI DỊCH VỤ DU LỊCH WINGSGROUP',
          media: mediaID('wingsgroup-hero-partner-meeting.png'),
          title: 'Hợp tác doanh nghiệp',
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
  } as never
  const homePageWrite = {
    collection: 'pages' as const,
    data: homePageData,
    locale: 'vi',
    overrideAccess: true,
    req,
  }
  const homePage = (
    existingHome.docs[0]
      ? await payload.update({ ...homePageWrite, id: existingHome.docs[0].id } as never)
      : await payload.create(homePageWrite as never)
  ) as (typeof existingHome.docs)[number]

  console.log(
    JSON.stringify(
      {
        apply: true,
        pageID: homePage.id,
        siteCode: WINGSGROUP_SITE_CODE,
        mediaCount: mediaSeed.verified,
        mediaSeed,
        contactFormID: contactForm.id,
        layout: ['ecosystem', 'trust', 'proof', 'editorial', 'contact'],
      },
      null,
      2,
    ),
  )
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
