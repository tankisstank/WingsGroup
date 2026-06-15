import { createLocalReq, getPayload } from 'payload'

import type { Page, SiteSetting } from '../../src/payload-types.js'
import config from '../../src/payload.config.js'
import {
  heroPresentationDefinitions,
  type HeroPresentationKey,
} from '../../src/heros/presentations/registry.js'
import { ensureThemePresetSeeds, siteThemeAssignments } from '../../src/utilities/themeSeed.js'
import type { ThemePresetKey } from '../../src/utilities/themeTokens.js'

async function ensureSiteThemeMetadata({
  payload,
  presetIDs,
  req,
  siteCode,
  siteID,
}: {
  payload: Awaited<ReturnType<typeof getPayload>>
  presetIDs: Record<ThemePresetKey, number>
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
          themeKey: siteCode as SiteSetting['branding']['themeKey'],
          themePreset: presetIDs[assignment.themePreset],
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
  const rootSites = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 1,
    req,
    where: {
      code: {
        equals: 'wings-travel',
      },
    },
  })
  const rootSite = rootSites.docs[0]

  if (!rootSite) {
    throw new Error('The WingsTravel root site must exist before seeding hero presentation fixtures.')
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
    throw new Error('The WingsTravel home page must use a high-impact hero for fixture seeding.')
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
        richText: homePage.hero.richText,
        supportingMedia:
          definition.value === 'layered-visuals' ? supportingMedia : [],
        type: 'highImpact' as const,
        variant: homePage.hero.variant,
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

export async function seedHeroPresentationSmoke(): Promise<
  Record<HeroPresentationKey, number>
> {
  const { payload, req } = await getAdminRequestContext()

  return ensureHeroPresentationFixtures({ payload, req })
}

export async function seedPhase1LaunchSmoke(): Promise<void> {
  const { payload, req } = await getAdminRequestContext()
  const requiredSiteCodes = ['wings-go', 'wings-side', 'wings-plus', 'wings-care', 'wings-pass']
  const presetIDs = await ensureThemePresetSeeds(payload, req)
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
      req,
      siteCode: site.code,
      siteID: site.id,
    })
  }

  await ensureHeroPresentationFixtures({ payload, req })
}
