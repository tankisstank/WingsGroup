import 'dotenv/config'

import { createLocalReq, getPayload } from 'payload'

import config from '../src/payload.config'
import { buildWingsGroupCorporateRouteSeeds } from './lib/wingsGroupCorporateRouteSeed'
import {
  WINGSGROUP_CONTENT_VALIDATION_MARKER,
  WINGSGROUP_SITE_CODE,
} from '../src/wingsgroup/corporateRoutes'

type UnknownRecord = Record<string, unknown>

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}

const argumentValue = (name: string): string | undefined => {
  const inline = process.argv.find((argument) => argument.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const canonicalRoute = buildWingsGroupCorporateRouteSeeds().find(
  (route) => route.path === '/he-sinh-thai',
)

if (!canonicalRoute) throw new Error('Canonical WingsGroup ecosystem route is unavailable.')

const canonicalEcosystemBlock = canonicalRoute.en.layout.find(
  (block) => block.blockType === 'wingsGroupEcosystem',
)

if (!canonicalEcosystemBlock) {
  throw new Error('Canonical English ecosystem block is unavailable.')
}

const canonicalProfiles = Array.isArray(canonicalEcosystemBlock.profiles)
  ? canonicalEcosystemBlock.profiles.map(asRecord)
  : []

const repairEnglishEcosystem = async () => {
  const payload = await getPayload({ config })
  try {
    const adminEmail = String(
      argumentValue('--admin-email') || process.env.IMPORT_ADMIN_EMAIL || '',
    ).trim()
    if (!adminEmail) throw new Error('Apply requires --admin-email or IMPORT_ADMIN_EMAIL.')

    const admins = await payload.find({
      collection: 'users',
      depth: 0,
      limit: 2,
      overrideAccess: true,
      pagination: false,
      where: { email: { equals: adminEmail } },
    })
    if (admins.docs.length !== 1 || admins.docs[0].role !== 'super-admin') {
      throw new Error('Repair requires exactly one configured super-admin operator.')
    }

    const req = await createLocalReq({ user: admins.docs[0] }, payload)
    const sites = await payload.find({
      collection: 'sites',
      depth: 0,
      limit: 2,
      overrideAccess: true,
      pagination: false,
      req,
      where: { code: { equals: WINGSGROUP_SITE_CODE } },
    })
    if (sites.docs.length !== 1) {
      throw new Error(`Expected exactly one ${WINGSGROUP_SITE_CODE} site.`)
    }

    const pages = await payload.find({
      collection: 'pages',
      depth: 2,
      fallbackLocale: false,
      limit: 2,
      locale: 'en',
      overrideAccess: true,
      pagination: false,
      req,
      where: {
        and: [
          { site: { equals: sites.docs[0].id } },
          { pathname: { equals: '/he-sinh-thai' } },
        ],
      },
    })
    if (pages.docs.length !== 1) {
      throw new Error('Expected exactly one English WingsGroup ecosystem page.')
    }

    const page = pages.docs[0] as unknown as UnknownRecord
    const governance = asRecord(page.wingsGroupRoute)
    const publication = asRecord(governance.publication)
    const contentApproval = asRecord(governance.contentApproval)
    if (
      page._status !== 'published' ||
      governance.managedBy !== 'wingsgroup-v3' ||
      governance.archetype !== 'ecosystem' ||
      publication.en !== 'approved' ||
      contentApproval.en !== WINGSGROUP_CONTENT_VALIDATION_MARKER
    ) {
      throw new Error(
        'English ecosystem page is not an approved published WingsGroup route; refusing partial repair.',
      )
    }

    const currentHero = asRecord(page.hero)
    const nextHero = {
      ...currentHero,
      richText: asRecord(canonicalRoute.en.hero).richText,
    }

    const currentLayout = Array.isArray(page.layout) ? page.layout : []
    let ecosystemBlockCount = 0
    const nextLayout = currentLayout.map((rawBlock) => {
      const block = asRecord(rawBlock)
      if (block.blockType !== 'wingsGroupEcosystem') return rawBlock

      ecosystemBlockCount += 1
      const currentProfiles = Array.isArray(block.profiles)
        ? block.profiles.map(asRecord)
        : []
      const canonicalByBrand = new Map(
        canonicalProfiles.map((profile) => [String(profile.brandKey), profile]),
      )
      const nextProfiles = currentProfiles.map((profile) => {
        const brandKey = String(profile.brandKey || '')
        const canonical = canonicalByBrand.get(brandKey)
        if (!canonical) {
          throw new Error(`Unexpected ecosystem profile in English page: ${brandKey || '(empty)'}`)
        }

        const currentServices = Array.isArray(profile.serviceScope)
          ? profile.serviceScope.map(asRecord)
          : []
        const canonicalServices = Array.isArray(canonical.serviceScope)
          ? canonical.serviceScope.map(asRecord)
          : []
        if (currentServices.length !== canonicalServices.length) {
          throw new Error(`Service scope shape changed for ${brandKey}; refusing repair.`)
        }

        const currentCTA = asRecord(profile.cta)
        const canonicalCTA = asRecord(canonical.cta)
        return {
          ...profile,
          brandName: canonical.brandName,
          description: canonical.description,
          cta: { ...currentCTA, label: canonicalCTA.label },
          serviceScope: currentServices.map((service, index) => ({
            ...service,
            label: canonicalServices[index]?.label,
          })),
        }
      })

      if (nextProfiles.length !== canonicalProfiles.length) {
        throw new Error('English ecosystem profile count changed; refusing repair.')
      }

      return {
        ...block,
        eyebrow: canonicalEcosystemBlock.eyebrow,
        title: canonicalEcosystemBlock.title,
        description: canonicalEcosystemBlock.description,
        profiles: nextProfiles,
      }
    })

    if (ecosystemBlockCount !== 1) {
      throw new Error(`Expected one English ecosystem block, found ${ecosystemBlockCount}.`)
    }

    const currentTarget = JSON.stringify({
      hero: currentHero.richText,
      layout: currentLayout,
    })
    const nextTarget = JSON.stringify({ hero: nextHero.richText, layout: nextLayout })
    if (currentTarget === nextTarget) {
      console.log(JSON.stringify({ changed: false, pageID: page.id, pathname: page.pathname }))
      return
    }

    const updated = await payload.update({
      collection: 'pages',
      context: { disableRevalidate: true },
      data: { hero: nextHero, layout: nextLayout } as never,
      id: page.id as number,
      locale: 'en',
      overrideAccess: true,
      req: { ...req, fallbackLocale: false, locale: 'en', payloadDataLoader: undefined },
    } as never)

    console.log(
      JSON.stringify(
        {
          changed: true,
          contentApproval: asRecord(asRecord(asRecord(updated).wingsGroupRoute).contentApproval).en,
          pageID: page.id,
          pathname: page.pathname,
          status: asRecord(updated)._status,
        },
        null,
        2,
      ),
    )
  } finally {
    await payload.destroy()
  }
}

if (process.argv.includes('--apply')) {
  repairEnglishEcosystem().catch((error) => {
    console.error(error)
    process.exit(1)
  })
} else {
  console.log(
    JSON.stringify(
      {
        apply: false,
        page: '/en/he-sinh-thai',
        scope: 'English hero and WingsGroup ecosystem labels only',
      },
      null,
      2,
    ),
  )
}
