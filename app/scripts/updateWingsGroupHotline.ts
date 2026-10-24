import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Payload } from 'payload'

export interface UpdateHotlineResult {
  siteCode: string
  status: 'updated' | 'noop'
  previousPhone?: string | null
  currentPhone: string
  message: string
}

export const EXPECTED_OLD_HOTLINE = '0912910101'
export const NEW_WINGSGROUP_HOTLINE = '0948786775'

/**
 * Pure evaluation function for hotline transition safety and idempotency.
 * Enforces:
 * - Target tenant must be 'wings-group'
 * - Old value (0912910101) -> update to 0948786775
 * - Already 0948786775 -> idempotent noop (shouldUpdate: false)
 * - Empty / null -> preserve CMS-cleared state without modifications (shouldUpdate: false)
 * - Unexpected custom value -> throw error without modifying data
 */
export function evaluateHotlineTransition(
  siteCode: string,
  currentSupportPhone: string | null | undefined,
): { shouldUpdate: boolean; result: UpdateHotlineResult } {
  if (siteCode !== 'wings-group') {
    throw new Error(`Target tenant must be 'wings-group', received '${siteCode}'`)
  }

  const normalizedCurrent = currentSupportPhone ? currentSupportPhone.replace(/[\s.\-()]/g, '') : ''

  if (normalizedCurrent === NEW_WINGSGROUP_HOTLINE) {
    return {
      shouldUpdate: false,
      result: {
        siteCode,
        status: 'noop',
        previousPhone: currentSupportPhone,
        currentPhone: NEW_WINGSGROUP_HOTLINE,
        message: 'Hotline is already up-to-date (0948786775). No change needed.',
      },
    }
  }

  if (!normalizedCurrent) {
    return {
      shouldUpdate: false,
      result: {
        siteCode,
        status: 'noop',
        previousPhone: currentSupportPhone,
        currentPhone: currentSupportPhone || '',
        message: 'WingsGroup supportPhone is empty or cleared by CMS. Preserving CMS-cleared state without modifications.',
      },
    }
  }

  if (normalizedCurrent === EXPECTED_OLD_HOTLINE) {
    return {
      shouldUpdate: true,
      result: {
        siteCode,
        status: 'updated',
        previousPhone: currentSupportPhone,
        currentPhone: NEW_WINGSGROUP_HOTLINE,
        message: `Updated WingsGroup hotline from ${currentSupportPhone} to ${NEW_WINGSGROUP_HOTLINE}.`,
      },
    }
  }

  throw new Error(
    `Safety abort: Unexpected custom supportPhone '${currentSupportPhone}' found on tenant 'wings-group'. Only expected old number '${EXPECTED_OLD_HOTLINE}' can be updated automatically.`,
  )
}

/**
 * Executes idempotent WingsGroup hotline update using Payload instance.
 * Updates ONLY main supportPhone when transition is required.
 * Never modifies or restores additionalHotlines.
 * Truly does not call payload.update when transition is a no-op.
 * Triggers standard Payload update hooks which execute invalidateSettingsAfterChange.
 */
export async function updateWingsGroupHotlineInPayload(
  payload: Payload,
): Promise<UpdateHotlineResult> {
  const sites = await payload.find({
    collection: 'sites',
    where: { code: { equals: 'wings-group' } },
    limit: 1,
    overrideAccess: true,
  })

  const site = sites.docs[0]
  if (!site) {
    throw new Error("Tenant site with code 'wings-group' not found")
  }

  const settingsDocs = await payload.find({
    collection: 'site-settings',
    where: { site: { equals: site.id } },
    limit: 1,
    overrideAccess: true,
  })

  const settings = settingsDocs.docs[0]
  if (!settings) {
    throw new Error("SiteSettings document for tenant 'wings-group' not found")
  }

  const { shouldUpdate, result } = evaluateHotlineTransition('wings-group', settings.supportPhone)

  if (shouldUpdate) {
    await payload.update({
      collection: 'site-settings',
      id: settings.id,
      data: {
        supportPhone: NEW_WINGSGROUP_HOTLINE,
      },
      context: { seed: true },
      overrideAccess: true,
    })
    payload.logger.info(`[US-085] ${result.message}`)
  } else {
    payload.logger.info(`[US-085] ${result.message}`)
  }

  return result
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  ;(async () => {
    const { getPayload } = await import('payload')
    const configPromise = (await import('@payload-config')).default
    const payload = await getPayload({ config: configPromise })
    const result = await updateWingsGroupHotlineInPayload(payload)
    console.log(JSON.stringify(result, null, 2))
    process.exit(0)
  })().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
