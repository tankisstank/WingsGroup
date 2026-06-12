import { createLocalReq, getPayload } from 'payload'

import type { Page, SiteSetting } from '../../src/payload-types.js'
import config from '../../src/payload.config.js'
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

export async function seedPhase1LaunchSmoke(): Promise<void> {
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
}
