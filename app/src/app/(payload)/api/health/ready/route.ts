import config from '@payload-config'
import { getPayload } from 'payload'
import { checkLeadRedisHealth } from '@/lead-capture/redis'
import { incrementMetric, logOperationalEvent } from '@/observability'

const readinessTimeoutMs = 3_000

const withTimeout = async <T>(promise: Promise<T>): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('Readiness check timed out.')),
          readinessTimeoutMs,
        )
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export async function GET(): Promise<Response> {
  const requestID = crypto.randomUUID()
  const startedAt = performance.now()

  try {
    const payload = await withTimeout(getPayload({ config }))
    await withTimeout(
      payload.find({
        collection: 'sites',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        pagination: false,
      }),
    )

    let redis: 'disabled' | 'down' | 'up' = 'down'
    try {
      redis = await withTimeout(checkLeadRedisHealth())
    } catch {
      redis = 'down'
    }

    const redisReady = redis === 'up'
    const leadDeliveryConfigured = Boolean(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD &&
      process.env.SMTP_FROM_EMAIL &&
      process.env.LEAD_NOTIFICATION_TO &&
      process.env.TURNSTILE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    )
    const leadDeliveryRequired = process.env.LEAD_DELIVERY_REQUIRED !== 'false'
    const leadDelivery = leadDeliveryConfigured
      ? 'configured'
      : leadDeliveryRequired
        ? 'misconfigured'
        : 'disabled'
    const production = process.env.NODE_ENV === 'production'
    if (production && (!redisReady || (leadDeliveryRequired && !leadDeliveryConfigured))) {
      incrementMetric('wingstravel_readiness_checks_total', { result: 'not_ready' })
      logOperationalEvent('error', 'readiness_dependency_failed', {
        duration_ms: Math.round(performance.now() - startedAt),
        leadDelivery,
        redis,
        request_id: requestID,
        status_code: 503,
      })
      return Response.json(
        {
          checks: { database: 'up', leadDelivery, redis },
          durationMs: Math.round(performance.now() - startedAt),
          requestId: requestID,
          status: 'not_ready',
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Cache-Control': 'no-store',
            'Retry-After': '5',
            'X-Request-ID': requestID,
          },
          status: 503,
        },
      )
    }

    const readinessStatus = redisReady && leadDeliveryConfigured ? 'ready' : 'degraded'
    incrementMetric('wingstravel_readiness_checks_total', { result: readinessStatus })
    logOperationalEvent('info', 'readiness_checked', {
      duration_ms: Math.round(performance.now() - startedAt),
      leadDelivery,
      redis,
      request_id: requestID,
      status_code: 200,
    })
    return Response.json(
      {
        checks: { database: 'up', leadDelivery, redis },
        durationMs: Math.round(performance.now() - startedAt),
        requestId: requestID,
        status: readinessStatus,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store',
          'X-Request-ID': requestID,
        },
      },
    )
  } catch (error) {
    incrementMetric('wingstravel_readiness_checks_total', { result: 'not_ready' })
    logOperationalEvent('error', 'readiness_database_failed', {
      duration_ms: Math.round(performance.now() - startedAt),
      errorType: error instanceof Error ? error.name : 'UnknownError',
      request_id: requestID,
      status_code: 503,
    })

    return Response.json(
      {
        checks: { database: 'down' },
        durationMs: Math.round(performance.now() - startedAt),
        requestId: requestID,
        status: 'not_ready',
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': '5',
          'X-Request-ID': requestID,
        },
        status: 503,
      },
    )
  }
}

export const HEAD = GET
