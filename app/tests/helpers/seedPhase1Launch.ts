import { createLocalReq, getPayload } from 'payload'

import type { Page, SiteSetting } from '../../src/payload-types.js'
import config from '../../src/payload.config.js'
import {
  heroPresentationDefinitions,
  type HeroPresentationKey,
} from '../../src/heros/presentations/registry.js'
import { ensureThemePresetSeeds, siteThemeAssignments } from '../../src/utilities/themeSeed.js'
import {
  ensureHeroPresentationPresetSeeds,
  heroPresentationPresetSeeds,
  siteHeroPresentationAssignments,
} from '../../src/utilities/heroPresentationSeed.js'
import type { CopyLocaleCode } from '../../src/utilities/locales.js'

type NavigationLocaleSeed = {
  footerNote: string
  headerNavItems: Array<{
    link: {
      label: string
      type: 'custom'
      url: string
    }
  }>
  tagline: string
}

const wingsPlusNavigationByLocale = {
  en: {
    footerNote:
      'WingsPlus serves private tours, MICE, special markets, and high-value briefs that require a dedicated proposal.',
    headerNavItems: [
      { link: { label: 'Home', type: 'custom' as const, url: '/' } },
      { link: { label: 'Private Tours', type: 'custom' as const, url: '/private-tours' } },
      { link: { label: 'MICE', type: 'custom' as const, url: '/mice' } },
      { link: { label: 'Special Markets', type: 'custom' as const, url: '/special-markets' } },
      { link: { label: 'Destinations', type: 'custom' as const, url: '/destinations' } },
      { link: { label: 'Request Proposal', type: 'custom' as const, url: '/request-proposal' } },
    ],
    tagline: 'Private, MICE, and special-market proposals for high-value travel needs.',
  },
  vi: {
    footerNote:
      'WingsPlus phục vụ private tours, MICE, special markets và các brief high-value cần proposal riêng.',
    headerNavItems: [
      { link: { label: 'Trang chủ', type: 'custom' as const, url: '/' } },
      { link: { label: 'Tour riêng', type: 'custom' as const, url: '/private-tours' } },
      { link: { label: 'MICE', type: 'custom' as const, url: '/mice' } },
      { link: { label: 'Thị trường đặc biệt', type: 'custom' as const, url: '/special-markets' } },
      { link: { label: 'Điểm đến', type: 'custom' as const, url: '/destinations' } },
      { link: { label: 'Gửi yêu cầu', type: 'custom' as const, url: '/request-proposal' } },
    ],
    tagline: 'Proposal private, MICE và special-market cho nhu cầu du lịch high-value.',
  },
} satisfies Record<CopyLocaleCode, NavigationLocaleSeed>

const navigationCorrectionsBySite = {
  'wings-care': {
    vi: {
      footerNote:
        'WingsCare tập trung travel care, insurance support, quyền lợi và hướng dẫn hỗ trợ sau bán.',
      headerNavItems: [
        { link: { label: 'Trang chủ', type: 'custom' as const, url: '/' } },
        { link: { label: 'Sản phẩm', type: 'custom' as const, url: '/san-pham-bao-hiem' } },
        { link: { label: 'Quyền lợi', type: 'custom' as const, url: '/quyen-loi' } },
        { link: { label: 'Claim support', type: 'custom' as const, url: '/claim-support' } },
        { link: { label: 'FAQ', type: 'custom' as const, url: '/faq' } },
        { link: { label: 'Liên hệ', type: 'custom' as const, url: '/contact' } },
      ],
      tagline:
        'Site hỗ trợ và chăm sóc, để sẵn nền cho insurance và post-sales service trong hệ sinh thái.',
    },
  },
  'wings-go': {
    en: {
      footerNote:
        'WingsGo is the outbound retail site for clear schedules, tour pricing, market pages, and campaign traffic.',
      headerNavItems: [
        { link: { label: 'Home', type: 'custom' as const, url: '/' } },
        { link: { label: 'Markets', type: 'custom' as const, url: '/markets' } },
        { link: { label: 'Departures', type: 'custom' as const, url: '/departures' } },
        { link: { label: 'Campaign', type: 'custom' as const, url: '/campaign' } },
        { link: { label: 'Tours', type: 'custom' as const, url: '/tours' } },
        { link: { label: 'Contact', type: 'custom' as const, url: '/contact' } },
      ],
      tagline: 'Outbound tours with clear pricing, schedules, and campaign-led discovery.',
    },
  },
  'wings-pass': {
    en: {
      footerNote:
        'WingsPass prioritizes clear airport Fast Track pricing, add-ons, and service booking flows.',
      headerNavItems: [
        { link: { label: 'Home', type: 'custom' as const, url: '/' } },
        { link: { label: 'Pricing', type: 'custom' as const, url: '/bang-gia' } },
        { link: { label: 'Airports', type: 'custom' as const, url: '/san-bay' } },
        { link: { label: 'Add-ons', type: 'custom' as const, url: '/add-on' } },
        { link: { label: 'FAQ', type: 'custom' as const, url: '/faq' } },
        { link: { label: 'Contact', type: 'custom' as const, url: '/contact' } },
      ],
      tagline: 'Pricing-first airport Fast Track, add-ons, conditions, and service booking.',
    },
    vi: {
      footerNote: 'WingsPass ưu tiên bảng giá, sân bay, add-on và quy trình đặt dịch vụ rõ ràng.',
      headerNavItems: [
        { link: { label: 'Trang chủ', type: 'custom' as const, url: '/' } },
        { link: { label: 'Bảng giá', type: 'custom' as const, url: '/bang-gia' } },
        { link: { label: 'Sân bay', type: 'custom' as const, url: '/san-bay' } },
        { link: { label: 'Add-on', type: 'custom' as const, url: '/add-on' } },
        { link: { label: 'FAQ', type: 'custom' as const, url: '/faq' } },
        { link: { label: 'Liên hệ', type: 'custom' as const, url: '/contact' } },
      ],
      tagline:
        'Pricing-first site cho dịch vụ Fast Track theo sân bay, add-on, điều kiện áp dụng và đặt dịch vụ.',
    },
  },
  'wing-side': {
    en: {
      footerNote:
        'WingSide focuses on inbound planning, destination storytelling, travel styles, and trip inquiry instead of a retail tour grid.',
      headerNavItems: [
        { link: { label: 'Home', type: 'custom' as const, url: '/' } },
        { link: { label: 'Destinations', type: 'custom' as const, url: '/destinations' } },
        { link: { label: 'Travel Styles', type: 'custom' as const, url: '/styles' } },
        { link: { label: 'Vietnam Packages', type: 'custom' as const, url: '/packages' } },
        { link: { label: 'Travel Guide', type: 'custom' as const, url: '/travel-guide' } },
        { link: { label: 'About', type: 'custom' as const, url: '/about-us' } },
        { link: { label: 'Contact', type: 'custom' as const, url: '/contact-us' } },
      ],
      tagline:
        'Inbound Vietnam planning with destination-led discovery and consultative inquiry flow.',
    },
    vi: {
      footerNote:
        'WingSide tập trung inbound planning, destination storytelling, travel styles và trip inquiry thay vì retail tour grid.',
      headerNavItems: [
        { link: { label: 'Trang chủ', type: 'custom' as const, url: '/' } },
        { link: { label: 'Điểm đến', type: 'custom' as const, url: '/destinations' } },
        { link: { label: 'Phong cách du lịch', type: 'custom' as const, url: '/styles' } },
        { link: { label: 'Gói Việt Nam', type: 'custom' as const, url: '/packages' } },
        { link: { label: 'Cẩm nang du lịch', type: 'custom' as const, url: '/travel-guide' } },
        { link: { label: 'Giới thiệu', type: 'custom' as const, url: '/about-us' } },
        { link: { label: 'Liên hệ', type: 'custom' as const, url: '/contact-us' } },
      ],
      tagline: 'Lập kế hoạch inbound Vietnam với điểm đến, phong cách du lịch và luồng tư vấn.',
    },
  },
} satisfies Record<string, Partial<Record<CopyLocaleCode, NavigationLocaleSeed>>>

const productionDomainBySite = {
  'wings-care': 'wingscare.wingsgroup.vn',
  'wings-go': 'wingsgo.vn',
  'wings-group': 'wingsgroup.vn',
  'wings-pass': 'wingspass.wingsgroup.vn',
  'wings-plus': 'wingsplus.vn',
  'wing-side': 'wingside.vn',
} as const

type SeedPayloadLifecycleOptions = {
  destroyPayloadAfterSeed?: boolean
}

async function ensureSiteThemeMetadata({
  payload,
  presetIDs,
  heroPresetIDs,
  req,
  siteCode,
  siteID,
}: {
  payload: Awaited<ReturnType<typeof getPayload>>
  presetIDs: Record<string, number>
  heroPresetIDs: Record<string, number>
  req: Awaited<ReturnType<typeof createLocalReq>>
  siteCode: string
  siteID: number
}) {
  const assignment = siteThemeAssignments[siteCode]

  if (!assignment) {
    return
  }

  const settings = await payload.find({
    collection: 'site-settings',
    depth: 0,
    limit: 1,
    req,
    where: {
      site: {
        equals: siteID,
      },
    },
  })
  const existingSettings = settings.docs[0] as SiteSetting | undefined

  if (existingSettings) {
    await payload.update({
      collection: 'site-settings',
      data: {
        branding: {
          ...existingSettings.branding,
          themeKey: (siteCode === 'wing-side'
            ? 'custom'
            : siteCode) as SiteSetting['branding']['themeKey'],
          themePreset: presetIDs[assignment.themePreset],
        },
        heroDefaults: {
          presentationPreset:
            heroPresetIDs[
              siteHeroPresentationAssignments[siteCode]?.presetKey || 'centered-classic'
            ],
          variant: siteHeroPresentationAssignments[siteCode]?.variant || assignment.heroVariant,
        },
      },
      id: existingSettings.id,
      req,
    })
  }

  const homePages = await payload.find({
    collection: 'pages',
    depth: 0,
    limit: 1,
    req,
    where: {
      and: [
        {
          site: {
            equals: siteID,
          },
        },
        {
          slug: {
            equals: 'home',
          },
        },
      ],
    },
  })
  const homePage = homePages.docs[0] as Page | undefined

  if (homePage?.hero?.type === 'highImpact') {
    await payload.update({
      collection: 'pages',
      data: {
        hero: {
          ...homePage.hero,
          variant: assignment.heroVariant,
        },
      },
      id: homePage.id,
      req,
    })
  }
}

async function ensureWingsPlusNavigationLocales({
  payload,
  req,
}: {
  payload: Awaited<ReturnType<typeof getPayload>>
  req: Awaited<ReturnType<typeof createLocalReq>>
}) {
  const sites = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 1,
    req,
    where: {
      code: {
        equals: 'wings-plus',
      },
    },
  })
  const site = sites.docs[0]

  if (!site) {
    return
  }

  const settings = await payload.find({
    collection: 'site-settings',
    depth: 0,
    limit: 1,
    req,
    where: {
      site: {
        equals: site.id,
      },
    },
  })
  const siteSettings = settings.docs[0]

  if (!siteSettings) {
    return
  }

  for (const [locale, navigation] of Object.entries(wingsPlusNavigationByLocale)) {
    await payload.update({
      collection: 'site-settings',
      data: navigation,
      id: siteSettings.id,
      locale: locale as keyof typeof wingsPlusNavigationByLocale,
      req,
    })
  }
}

async function ensureProductionDomains({
  payload,
  req,
}: {
  payload: Awaited<ReturnType<typeof getPayload>>
  req: Awaited<ReturnType<typeof createLocalReq>>
}) {
  for (const [siteCode, domain] of Object.entries(productionDomainBySite)) {
    const sites = await payload.find({
      collection: 'sites',
      depth: 0,
      limit: 1,
      req,
      where: {
        code: {
          equals: siteCode,
        },
      },
    })
    const site = sites.docs[0]

    if (!site) {
      continue
    }

    await payload.update({
      collection: 'sites',
      data: {
        additionalDomains: domain.endsWith('.wingsgroup.vn') ? [] : [{ domain: `www.${domain}` }],
        primaryDomain: domain,
      },
      id: site.id,
      req,
    })

    const settings = await payload.find({
      collection: 'site-settings',
      depth: 0,
      limit: 1,
      req,
      where: {
        site: {
          equals: site.id,
        },
      },
    })
    const siteSettings = settings.docs[0] as SiteSetting | undefined

    if (!siteSettings) {
      continue
    }

    await payload.update({
      collection: 'site-settings',
      data: {
        seo: {
          ...siteSettings.seo,
          canonicalDomain: `https://${domain}`,
        },
      },
      id: siteSettings.id,
      req,
    })
  }
}

async function ensureNavigationCorrections({
  payload,
  req,
}: {
  payload: Awaited<ReturnType<typeof getPayload>>
  req: Awaited<ReturnType<typeof createLocalReq>>
}) {
  for (const [siteCode, localeCorrections] of Object.entries(navigationCorrectionsBySite)) {
    const sites = await payload.find({
      collection: 'sites',
      depth: 0,
      limit: 1,
      req,
      where: {
        code: {
          equals: siteCode,
        },
      },
    })
    const site = sites.docs[0]

    if (!site) {
      continue
    }

    const settings = await payload.find({
      collection: 'site-settings',
      depth: 0,
      limit: 1,
      req,
      where: {
        site: {
          equals: site.id,
        },
      },
    })
    const siteSettings = settings.docs[0]

    if (!siteSettings) {
      continue
    }

    for (const [locale, navigation] of Object.entries(localeCorrections)) {
      await payload.update({
        collection: 'site-settings',
        data: navigation,
        id: siteSettings.id,
        locale: locale as CopyLocaleCode,
        req,
      })
    }
  }
}

export const heroPresentationFixturePaths: Record<HeroPresentationKey, string> = Object.fromEntries(
  heroPresentationDefinitions.map(({ value }) => [value, `/hero-${value}`]),
) as Record<HeroPresentationKey, string>

export async function ensureHeroPresentationFixtures({
  payload,
  req,
}: {
  payload: Awaited<ReturnType<typeof getPayload>>
  req: Awaited<ReturnType<typeof createLocalReq>>
}): Promise<Record<HeroPresentationKey, number>> {
  const heroPresetIDs = await ensureHeroPresentationPresetSeeds(payload, req)
  const rootSites = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 1,
    req,
    where: {
      code: {
        equals: 'wings-group',
      },
    },
  })
  const rootSite = rootSites.docs[0]

  if (!rootSite) {
    throw new Error(
      'The WingsGroup root site must exist before seeding hero presentation fixtures.',
    )
  }

  const homePages = await payload.find({
    collection: 'pages',
    depth: 0,
    locale: 'vi',
    limit: 1,
    req,
    where: {
      and: [
        {
          site: {
            equals: rootSite.id,
          },
        },
        {
          pathname: {
            equals: '/',
          },
        },
      ],
    },
  })
  const homePage = homePages.docs[0] as Page | undefined

  if (!homePage?.hero || homePage.hero.type !== 'highImpact') {
    throw new Error('The WingsGroup home page must use a high-impact hero for fixture seeding.')
  }

  const media = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 3,
    pagination: false,
    req,
    where: {
      site: {
        equals: rootSite.id,
      },
    },
  })
  const supportingMedia = media.docs.map((item) => item.id)
  const fixtureIDs = {} as Record<HeroPresentationKey, number>

  for (const definition of heroPresentationDefinitions) {
    const presentationPreset = heroPresentationPresetSeeds.find(
      (preset) => preset.baseTemplate === definition.value,
    )

    if (!presentationPreset) {
      throw new Error(`Missing governed hero preset for fixture ${definition.value}.`)
    }

    const slug = `hero-${definition.value}`
    const existingPages = await payload.find({
      collection: 'pages',
      depth: 0,
      limit: 1,
      req,
      where: {
        and: [
          {
            site: {
              equals: rootSite.id,
            },
          },
          {
            slug: {
              equals: slug,
            },
          },
        ],
      },
    })
    const data = {
      _status: 'published' as const,
      hero: {
        links: homePage.hero.links?.map(({ link }) => ({ link })),
        media: homePage.hero.media,
        presentation: definition.value,
        presentationMode: 'override' as const,
        presentationPreset: heroPresetIDs[presentationPreset.key],
        richText: homePage.hero.richText,
        slides:
          definition.value === 'cinematic-carousel'
            ? supportingMedia.slice(0, 3).map((mediaID, index) => ({
                description: `Governed carousel slide ${index + 1}`,
                links: homePage.hero.links?.slice(0, 1).map(({ link }) => ({ link })),
                media: mediaID,
                title: `Journey ${index + 1}`,
              }))
            : [],
        supportingMedia: definition.value === 'layered-visuals' ? supportingMedia : [],
        type: 'highImpact' as const,
        variant: homePage.hero.variant,
        video:
          definition.value === 'video-background'
            ? {
                poster: supportingMedia[0] || homePage.hero.media,
              }
            : {},
      },
      layout: [
        {
          blockType: 'content' as const,
          columns: [],
        },
      ],
      meta: {
        breadcrumbLabel: definition.label,
        description: definition.description,
        title: definition.label,
      },
      pathname: `/${slug}`,
      site: rootSite.id,
      slug,
      title: definition.label,
    }
    const page = existingPages.docs[0]
      ? await payload.update({
          collection: 'pages',
          context: {
            disableRevalidate: true,
          },
          data,
          id: existingPages.docs[0].id,
          req,
        })
      : await payload.create({
          collection: 'pages',
          context: {
            disableRevalidate: true,
          },
          data,
          req,
        })

    fixtureIDs[definition.value] = page.id
  }

  return fixtureIDs
}

async function getAdminRequestContext() {
  const payload = await getPayload({ config })
  const adminResult = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    where: {
      role: {
        equals: 'super-admin',
      },
    },
  })
  const adminUser = adminResult.docs[0]

  if (!adminUser) {
    throw new Error('A super-admin user must exist before running Phase 1 E2E smoke tests.')
  }

  const req = await createLocalReq({ user: adminUser }, payload)

  return { payload, req }
}

export async function seedHeroPresentationSmoke({
  destroyPayloadAfterSeed = false,
}: SeedPayloadLifecycleOptions = {}): Promise<Record<HeroPresentationKey, number>> {
  const { payload, req } = await getAdminRequestContext()

  try {
    return await ensureHeroPresentationFixtures({ payload, req })
  } finally {
    if (destroyPayloadAfterSeed) {
      await payload.destroy()
    }
  }
}

export async function seedPhase1LaunchSmoke({
  destroyPayloadAfterSeed = false,
}: SeedPayloadLifecycleOptions = {}): Promise<void> {
  const { payload, req } = await getAdminRequestContext()
  try {
    const requiredSiteCodes = ['wings-go', 'wing-side', 'wings-plus', 'wings-care', 'wings-pass']
    const presetIDs = await ensureThemePresetSeeds(payload, req)
    const heroPresetIDs = await ensureHeroPresentationPresetSeeds(payload, req)
    const sites = await payload.find({
      collection: 'sites',
      depth: 0,
      limit: 10,
      pagination: false,
      req,
      where: {
        code: {
          in: requiredSiteCodes,
        },
      },
    })

    const missingSiteCodes = requiredSiteCodes.filter(
      (code) => !sites.docs.some((site) => site.code === code),
    )

    if (missingSiteCodes.length > 0) {
      throw new Error(
        `Missing seeded sites for smoke tests: ${missingSiteCodes.join(', ')}. Run the subsites seed first.`,
      )
    }

    for (const site of sites.docs) {
      await ensureSiteThemeMetadata({
        payload,
        presetIDs,
        heroPresetIDs,
        req,
        siteCode: site.code,
        siteID: site.id,
      })
    }

    await ensureProductionDomains({ payload, req })
    await ensureWingsPlusNavigationLocales({ payload, req })
    await ensureNavigationCorrections({ payload, req })
    await ensureHeroPresentationFixtures({ payload, req })
  } finally {
    if (destroyPayloadAfterSeed) {
      await payload.destroy()
    }
  }
}
