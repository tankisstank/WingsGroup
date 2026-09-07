import { logOperationalEvent } from '@/observability'
import { WINGSGROUP_CONSENT_VERSION, WINGSGROUP_SITE_CODE } from './wingsGroupV3'

export const WINGSGROUP_RETENTION_BATCH_LIMIT = 100

type RetentionRecord = {
  id: number | string
}

type RetentionPayload = {
  delete(args: Record<string, unknown>): Promise<unknown>
  find(args: Record<string, unknown>): Promise<{ docs: RetentionRecord[] }>
}

export type WingsGroupRetentionResult = {
  deleted: number
  enabled: boolean
  failed: number
  hasMore: boolean
}

const relationID = (value: unknown): number | string | null =>
  value && typeof value === 'object' && 'id' in value
    ? ((value as { id?: unknown }).id as number | string)
    : typeof value === 'number' || typeof value === 'string'
      ? value
      : null

export const runWingsGroupLeadRetentionBatch = async ({
  enabled,
  now = new Date(),
  payload,
  req,
}: {
  enabled: boolean
  now?: Date
  payload: RetentionPayload
  req?: unknown
}): Promise<WingsGroupRetentionResult> => {
  if (!enabled) {
    return { deleted: 0, enabled: false, failed: 0, hasMore: false }
  }

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
    logOperationalEvent('warn', 'lead_retention_site_unresolved', {
      result: 'skipped',
      site_code: WINGSGROUP_SITE_CODE,
    })
    return { deleted: 0, enabled: true, failed: 0, hasMore: false }
  }

  const siteID = relationID(sites.docs[0]?.id)
  if (!siteID) {
    return { deleted: 0, enabled: true, failed: 0, hasMore: false }
  }

  const expired = await payload.find({
    collection: 'form-submissions',
    depth: 0,
    limit: WINGSGROUP_RETENTION_BATCH_LIMIT,
    overrideAccess: true,
    pagination: false,
    req,
    sort: 'wingsGroupLead.retentionUntil',
    where: {
      and: [
        { site: { equals: siteID } },
        {
          'wingsGroupLead.consentVersion': {
            equals: WINGSGROUP_CONSENT_VERSION,
          },
        },
        {
          'wingsGroupLead.retentionUntil': {
            less_than_equal: now.toISOString(),
          },
        },
      ],
    },
  })

  let deleted = 0
  let failed = 0
  for (const submission of expired.docs) {
    try {
      await payload.delete({
        collection: 'form-submissions',
        id: submission.id,
        overrideAccess: true,
        req,
      })
      deleted += 1
    } catch {
      failed += 1
    }
  }

  const result = {
    deleted,
    enabled: true,
    failed,
    hasMore: expired.docs.length === WINGSGROUP_RETENTION_BATCH_LIMIT,
  }
  logOperationalEvent(failed > 0 ? 'warn' : 'info', 'lead_retention_batch_completed', {
    deleted,
    failed,
    has_more: result.hasMore,
    site_code: WINGSGROUP_SITE_CODE,
  })
  return result
}
