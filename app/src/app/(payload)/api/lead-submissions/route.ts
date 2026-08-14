import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { Form } from '@/payload-types'
import { createLeadRedisStore, getClientIP } from '@/lead-capture/redis'
import {
  parseLeadRequest,
  LeadValidationError,
  MAX_LEAD_BODY_BYTES,
  validateFieldsForForm,
} from '@/lead-capture/validation'
import { verifyTurnstile } from '@/lead-capture/turnstile'
import {
  buildWingsGroupOperationalFields,
  resolveWingsGroupLeadGovernance,
  toWingsGroupLeadPublicConfig,
  validateWingsGroupLeadContract,
  validateWingsGroupRequiredFields,
  WINGSGROUP_SITE_CODE,
} from '@/lead-capture/wingsGroupV3'
import {
  getCurrentLocale,
  getCurrentPublicPathname,
  getCurrentSite,
} from '@/utilities/siteContext'
import { domainCandidates } from '@/utilities/siteDomains'
import { incrementMetric, logOperationalEvent } from '@/observability'

const json = (body: Record<string, unknown>, status: number): Response =>
  Response.json(body, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
    },
    status,
  })

const accepted = (): Response => json({ status: 'accepted' }, 202)
const relationID = (value: Form['site']): number | string | null =>
  value && typeof value === 'object' ? value.id : value || null

type PayloadClient = Awaited<ReturnType<typeof getPayload>>

const getWingsGroupSettings = async (
  payload: PayloadClient,
  siteID: number | string,
): Promise<unknown | null> => {
  const settings = await payload.find({
    collection: 'site-settings',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    where: { site: { equals: siteID } },
  })

  return settings.docs.length === 1 ? settings.docs[0] : null
}

const trustedContextHeadersPresent = (request: Request): boolean =>
  request.headers.get('x-site-context-source') === 'proxy' &&
  Boolean(request.headers.get('x-site-host')) &&
  Boolean(request.headers.get('x-client-ip'))

export async function POST(request: Request): Promise<Response> {
  // A release may intentionally defer email-provider configuration. Refuse the
  // submission explicitly instead of accepting a customer lead that cannot be
  // delivered to an operator.
  if (process.env.LEAD_DELIVERY_REQUIRED === 'false') {
    return json({ error: 'Lead delivery is temporarily unavailable.' }, 503)
  }

  if (!trustedContextHeadersPresent(request)) {
    return json({ error: 'Invalid submission.' }, 400)
  }

  const contentType = request.headers.get('content-type') || ''
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return json({ error: 'Invalid submission.' }, 415)
  }

  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (Number.isFinite(declaredLength) && declaredLength > MAX_LEAD_BODY_BYTES) {
    return json({ error: 'Invalid submission.' }, 413)
  }

  let input
  try {
    input = parseLeadRequest(await request.text())
  } catch (error) {
    return json({ error: 'Invalid submission.' }, error instanceof LeadValidationError ? 400 : 500)
  }

  // The domain/proxy-derived resolver is authoritative. Public form data never
  // supplies a site identifier.
  const site = await getCurrentSite()
  const payload = await getPayload({ config: configPromise })
  const isWingsGroupV3 = site.code === WINGSGROUP_SITE_CODE

  let store
  try {
    store = createLeadRedisStore()
  } catch {
    return json({ error: 'Service temporarily unavailable.' }, 503)
  }

  const ip = getClientIP(request.headers)
  let rate
  try {
    rate = await store.checkIPRateLimit({ ip })
  } catch {
    return json({ error: 'Service temporarily unavailable.' }, 503)
  }

  if (!rate.allowed) return json({ error: 'Please try again later.' }, 429)

  const forms = await payload.find({
    collection: 'forms',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      and: [{ id: { equals: input.formId } }, { site: { equals: site.id } }],
    },
  })
  const form = forms.docs[0]
  if (!form || String(relationID(form.site)) !== String(site.id)) {
    return json({ error: 'Invalid submission.' }, 400)
  }

  // A filled honeypot receives the same success response as a real lead so it
  // cannot be used to tune a bot. No submission or email is created.
  if (input.honeypot) return accepted()

  if (rate.requiresChallenge) {
    if (!process.env.TURNSTILE_SECRET_KEY || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      return json({ error: 'Service temporarily unavailable.' }, 503)
    }

    const verified = await verifyTurnstile({
      expectedHosts: [
        ...domainCandidates(site.primaryDomain),
        ...((site.additionalDomains || []) as Array<{ domain?: null | string }>).flatMap(
          ({ domain }) => domainCandidates(domain),
        ),
      ],
      ip,
      token: input.turnstileToken,
    }).catch(() => false)

    if (!verified) {
      return json(
        {
          challengeRequired: true,
          error: 'Additional verification is required.',
          siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null,
        },
        403,
      )
    }
  }

  let normalizedFields
  try {
    normalizedFields = validateFieldsForForm(form, input.submissionData)
  } catch {
    return json({ error: 'Invalid submission.' }, 400)
  }

  let wingsGroupContext:
    | {
        locale: string
        operationalFields: ReturnType<typeof buildWingsGroupOperationalFields>
      }
    | undefined

  if (isWingsGroupV3) {
    const [settings, locale, sourcePath] = await Promise.all([
      getWingsGroupSettings(payload, site.id),
      getCurrentLocale(),
      getCurrentPublicPathname(),
    ])
    const governance = resolveWingsGroupLeadGovernance(settings, locale)
    if (!governance) {
      logOperationalEvent('warn', 'lead_configuration_unavailable', {
        locale,
        request_id: request.headers.get('x-request-id'),
        site_code: site.code,
        status_code: 503,
      })
      return json({ error: 'Service temporarily unavailable.' }, 503)
    }

    try {
      validateWingsGroupRequiredFields(normalizedFields)
      const contract = validateWingsGroupLeadContract(input.leadContract, governance)
      const consentedAt = new Date()
      wingsGroupContext = {
        locale,
        operationalFields: buildWingsGroupOperationalFields({
          consentedAt,
          contract,
          locale,
          sourcePath,
        }),
      }
    } catch {
      logOperationalEvent('warn', 'lead_validation_rejected', {
        locale,
        request_id: request.headers.get('x-request-id'),
        result: 'rejected',
        site_code: site.code,
        status_code: 400,
      })
      return json({ error: 'Invalid submission.' }, 400)
    }
  }

  try {
    const siteFormRate = await store.checkValidatedRateLimits({
      formId: form.id,
      siteCode: site.code,
    })
    if (!siteFormRate.allowed) return json({ error: 'Please try again later.' }, 429)
  } catch {
    return json({ error: 'Service temporarily unavailable.' }, 503)
  }

  let reserved
  try {
    reserved = await store.reserveIdempotency(input.idempotencyKey)
  } catch {
    return json({ error: 'Service temporarily unavailable.' }, 503)
  }
  if (!reserved) return accepted()

  let submission
  try {
    const enquiryContext = isWingsGroupV3
      ? input.context
        ? {
            discovery: input.context.discovery,
            tourId: input.context.tourId,
            tourSlug: input.context.tourSlug,
          }
        : undefined
      : input.context
    submission = await payload.create({
      collection: 'form-submissions',
      data: {
        deliveryStatus: 'pending',
        deliveryUpdatedAt: new Date().toISOString(),
        enquiryContext,
        form: form.id,
        site: site.id,
        submissionData: [
          ...normalizedFields.map(({ field, value }) => ({ field, value })),
          ...(wingsGroupContext?.operationalFields || []),
        ],
      },
      overrideAccess: true,
    })
    await store.completeIdempotency(input.idempotencyKey, submission.id)
    incrementMetric('wingstravel_lead_submissions_total', { site: site.code })
  } catch {
    await store.releaseIdempotency(input.idempotencyKey).catch(() => undefined)
    return json({ error: 'Service temporarily unavailable.' }, 503)
  }

  try {
    // The task is persisted by Payload. Its configured exponential retries and
    // failed job state provide durable retry/dead-letter behavior.
    const queue = payload.jobs.queue as (args: {
      input: {
        fields: Array<{ label: string; value: string }>
        formTitle: string
        siteCode: string
        submissionId: string
      }
      overrideAccess: boolean
      queue: string
      task: string
    }) => Promise<unknown>
    const job = {
      input: {
        fields: normalizedFields.map(({ label, value }) => ({ label, value })),
        formTitle: form.title,
        siteCode: site.code,
        submissionId: String(submission.id),
      },
      overrideAccess: true,
      queue: 'lead-notifications',
      task: 'sendLeadNotification',
    }
    let queued = false
    for (let attempt = 0; attempt < 3 && !queued; attempt += 1) {
      try {
        await queue(job)
        queued = true
      } catch {
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt))
      }
    }
    if (!queued) throw new Error('Lead notification queue failed.')
    await payload.update({
      collection: 'form-submissions',
      id: submission.id,
      data: {
        deliveryErrorCode: null,
        deliveryStatus: 'queued',
        deliveryUpdatedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    })
  } catch {
    // The record starts as pending, so even if this status update fails the
    // database-backed reconciler can still recover it. Redis is not used as a
    // delivery ledger.
    await payload
      .update({
        collection: 'form-submissions',
        id: submission.id,
        data: {
          deliveryErrorCode: 'queue_unavailable',
          deliveryStatus: 'queue_failed',
          deliveryUpdatedAt: new Date().toISOString(),
        },
        overrideAccess: true,
      })
      .catch(() => undefined)
    payload.logger.error({
      msg: 'Lead notification could not be queued.',
      siteCode: site.code,
      submissionId: submission.id,
    })
    incrementMetric('wingstravel_lead_queue_failures_total', { site: site.code })
    logOperationalEvent('error', 'lead_queue_failed', {
      site_code: site.code,
      submission_id: submission.id,
    })
  }

  logOperationalEvent('info', 'lead_submission_accepted', {
    locale: wingsGroupContext?.locale,
    request_id: request.headers.get('x-request-id'),
    result: 'accepted',
    site_code: site.code,
    status_code: 202,
  })

  return accepted()
}

export async function GET(request: Request): Promise<Response> {
  if (!trustedContextHeadersPresent(request)) {
    return json({ error: 'Invalid request.' }, 400)
  }

  const site = await getCurrentSite()
  if (site.code !== WINGSGROUP_SITE_CODE) return json({ enabled: false }, 200)

  if (process.env.LEAD_DELIVERY_REQUIRED === 'false') {
    return json(
      { available: false, enabled: true, reason: 'configuration-unavailable' },
      200,
    )
  }

  const [payload, locale] = await Promise.all([
    getPayload({ config: configPromise }),
    getCurrentLocale(),
  ])
  const settings = await getWingsGroupSettings(payload, site.id).catch(() => null)

  return json(toWingsGroupLeadPublicConfig(settings, locale), 200)
}
