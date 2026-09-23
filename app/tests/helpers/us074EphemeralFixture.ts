import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { createLocalReq, getPayload } from 'payload'

import type { AdminE2EConfig, AdminE2ECredentials, AdminE2ERoleScope } from './adminE2EConfig'
import config from '../../src/payload.config.js'
import { createLayoutPresetData } from '../../src/utilities/layoutPresets.js'

type FixtureUserKey = 'editor' | 'siteManager' | 'superAdmin'
type FixtureIDs = Readonly<{
  leads: Array<number | string>
  pages: Array<number | string>
  users: Array<number | string>
}>

const execFileAsync = promisify(execFile)

export type Us074EphemeralFixture = Readonly<{
  cleanup: () => Promise<void>
  credentials: Readonly<Record<FixtureUserKey, AdminE2ECredentials>>
  heroPageID: number | string
  leadID: number | string
  roleScope: AdminE2ERoleScope
}>

const asSiteID = (value: string): number | string => (/^\d+$/.test(value) ? Number(value) : value)

const makeCredentials = (suffix: string, key: FixtureUserKey, name: string) => ({
  email: `us074-ephemeral-${suffix}-${key}@internal.invalid`,
  name,
  password: `Us074-${randomUUID()}-Staging!`,
})

const leadValue = (field: {
  blockType?: string
  name?: string
  options?: Array<{ value: string }> | null
}) => {
  if (field.blockType === 'email') return 'us074-ephemeral-lead@example.invalid'
  if (field.blockType === 'number') return '2'
  if (field.blockType === 'checkbox') return 'true'
  if (field.blockType === 'select') return field.options?.[0]?.value || 'fixture'
  if (field.name === 'phone') return '+84900074074'
  return 'US074 synthetic staging fixture'
}

const deleteFixtureRecords = async (payload: Awaited<ReturnType<typeof getPayload>>, ids: FixtureIDs) => {
  const errors: unknown[] = []
  const remove = async (collection: 'form-submissions' | 'pages' | 'users', values: Array<number | string>) => {
    for (const id of [...values].reverse()) {
      try {
        await payload.delete({
          collection,
          context: { disableRevalidate: true },
          id,
          overrideAccess: true,
        })
      } catch (error) {
        errors.push(error)
      }
    }
  }

  await remove('form-submissions', ids.leads)
  await remove('pages', ids.pages)
  await remove('users', ids.users)

  if (errors.length > 0) {
    throw new AggregateError(errors, 'US-074 ephemeral fixture cleanup failed.')
  }
}

export async function cleanupUs074EphemeralFixtureRecords(ids: FixtureIDs): Promise<void> {
  const payload = await getPayload({ config })
  try {
    await deleteFixtureRecords(payload, ids)
  } finally {
    await payload.destroy()
  }
}

const cleanupInChildProcess = async (ids: FixtureIDs): Promise<void> => {
  const cleanupScript = `
    import { cleanupUs074EphemeralFixtureRecords } from './tests/helpers/us074EphemeralFixture.ts'
    await cleanupUs074EphemeralFixtureRecords(JSON.parse(process.env.US074_E2E_CLEANUP_IDS))
  `
  await execFileAsync(
    process.execPath,
    ['--import', 'tsx/esm', '--input-type=module', '-e', cleanupScript],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        US074_E2E_CLEANUP_IDS: JSON.stringify(ids),
      },
      maxBuffer: 1024 * 1024,
    },
  )
}

export async function createUs074EphemeralFixture(
  adminE2EConfig: Extract<AdminE2EConfig, { enabled: true }>,
): Promise<Us074EphemeralFixture> {
  if (adminE2EConfig.fixtureMode !== 'ephemeral' || !adminE2EConfig.bootstrap) {
    throw new Error('US-074 ephemeral fixture requires fixtureMode=ephemeral and bootstrap credentials.')
  }

  const payload = await getPayload({ config })
  const createdUsers: Array<number | string> = []
  const createdPages: Array<number | string> = []
  const createdLeads: Array<number | string> = []
  let setupPayloadDestroyed = false
  let cleaned = false

  const cleanup = async () => {
    if (cleaned) return
    cleaned = true
    const ids = { leads: createdLeads, pages: createdPages, users: createdUsers }
    if (setupPayloadDestroyed) await cleanupInChildProcess(ids)
    else {
      try {
        await deleteFixtureRecords(payload, ids)
      } finally {
        await payload.destroy()
      }
    }
  }

  try {
    const login = await payload.login({
      collection: 'users',
      data: adminE2EConfig.bootstrap,
    })
    if (!login.user || login.user.role !== 'super-admin') {
      throw new Error('US-074 ephemeral fixture bootstrap must authenticate as Super Admin.')
    }

    const req = await createLocalReq({ user: login.user }, payload)
    const wingsGoSiteID = asSiteID(adminE2EConfig.roleScope.wingsGoSiteID)
    const wingsCareSiteID = asSiteID(adminE2EConfig.roleScope.wingsCareSiteID)
    const [wingsGo, wingsCare] = await Promise.all([
      payload.findByID({ collection: 'sites', depth: 0, id: wingsGoSiteID, req }),
      payload.findByID({ collection: 'sites', depth: 0, id: wingsCareSiteID, req }),
    ])
    if (wingsGo.code !== 'wings-go' || wingsCare.code !== 'wings-care') {
      throw new Error('US-074 ephemeral fixture site IDs do not match WingsGo/WingsCare.')
    }

    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`
    const userSeeds = [
      { key: 'siteManager' as const, data: makeCredentials(suffix, 'siteManager', 'US-074 Fixture Site Manager'), sites: [wingsGoSiteID], role: 'site-manager' },
      { key: 'editor' as const, data: makeCredentials(suffix, 'editor', 'US-074 Fixture Editor'), sites: [wingsCareSiteID], role: 'editor' },
    ]
    const credentials = {
      superAdmin: adminE2EConfig.bootstrap,
    } as Record<FixtureUserKey, AdminE2ECredentials>

    for (const seed of userSeeds) {
      const user = await payload.create({
        collection: 'users',
        data: {
          email: seed.data.email,
          name: seed.data.name,
          password: seed.data.password,
          role: seed.role || 'super-admin',
          sites: seed.sites,
        } as never,
        overrideAccess: false,
        req,
      })
      createdUsers.push(user.id)
      credentials[seed.key] = { email: seed.data.email, password: seed.data.password }
    }

    const formResult = await payload.find({
      collection: 'forms',
      depth: 0,
      limit: 1,
      pagination: false,
      req,
      where: { site: { equals: wingsGoSiteID } },
    })
    const form = formResult.docs[0]
    if (!form) throw new Error('US-074 ephemeral fixture requires a WingsGo form.')

    const heroPresetResult = await payload.find({
      collection: 'hero-presentation-presets',
      depth: 0,
      limit: 1,
      pagination: false,
      req,
      where: {
        and: [
          { baseTemplate: { equals: 'gradient-mesh' } },
          { isActive: { equals: true } },
        ],
      },
    })
    const heroPreset = heroPresetResult.docs[0]
    if (!heroPreset) {
      throw new Error('US-074 ephemeral fixture requires an active gradient-mesh hero preset.')
    }

    const title = `US-074 ephemeral page ${suffix}`
    const slug = `us074-ephemeral-${suffix}`
    const summary = 'Synthetic staging page for US-074 browser validation.'
    const layoutPresetData = createLayoutPresetData('campaign-launch', {
      formID: form.id,
      summary,
      title,
    })
    const page = await payload.create({
      collection: 'pages',
      context: { disableRevalidate: true },
      data: {
        _status: 'draft',
        layoutPresetKey: 'campaign-launch',
        meta: { description: summary, title },
        site: wingsGoSiteID,
        slug,
        title,
        ...layoutPresetData,
        hero: {
          ...layoutPresetData.hero,
          presentationMode: 'override',
          presentationPreset: heroPreset.id,
        },
      } as never,
      locale: 'vi',
      overrideAccess: false,
      req,
    })
    createdPages.push(page.id)

    const lead = await payload.create({
      collection: 'form-submissions',
      data: {
        deliveryStatus: 'delivered',
        deliveryUpdatedAt: new Date().toISOString(),
        form: form.id,
        salesStatus: 'new',
        salesTriageVersion: 0,
        site: wingsGoSiteID,
        submissionData: (form.fields || []).flatMap((field) => {
          if (!('name' in field) || typeof field.name !== 'string') return []
          return [{ field: field.name, value: leadValue(field) }]
        }),
      } as never,
      overrideAccess: true,
      req,
    })
    createdLeads.push(lead.id)

    await payload.destroy()
    setupPayloadDestroyed = true

    return {
      cleanup,
      credentials,
      heroPageID: page.id,
      leadID: lead.id,
      roleScope: adminE2EConfig.roleScope,
    }
  } catch (error) {
    await cleanup().catch((cleanupError) => {
      throw new AggregateError([error, cleanupError], 'US-074 ephemeral fixture setup and cleanup failed.')
    })
    throw error
  }
}
