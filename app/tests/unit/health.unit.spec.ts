import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  getPayload: vi.fn(),
  redisHealth: vi.fn(),
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: mocks.getPayload }))
vi.mock('@/lead-capture/redis', () => ({ checkLeadRedisHealth: mocks.redisHealth }))

import { GET as getLiveness } from '@/app/(payload)/api/health/live/route'
import { GET as getReadiness } from '@/app/(payload)/api/health/ready/route'

describe('health endpoints', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('LEAD_NOTIFICATION_TO', 'sales@example.com')
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'site-key')
    vi.stubEnv('SMTP_HOST', 'smtp.example.com')
    vi.stubEnv('SMTP_USER', 'smtp-user')
    vi.stubEnv('SMTP_PASSWORD', 'smtp-password')
    vi.stubEnv('SMTP_FROM_EMAIL', 'leads@example.com')
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'turnstile-secret')
    mocks.find.mockReset()
    mocks.getPayload.mockReset()
    mocks.redisHealth.mockReset()
    mocks.find.mockResolvedValue({ docs: [] })
    mocks.getPayload.mockResolvedValue({ find: mocks.find })
    mocks.redisHealth.mockResolvedValue('up')
  })

  it('returns a no-store liveness response with a request id', async () => {
    const response = getLiveness()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('x-request-id')).toBe(body.requestId)
    expect(body.status).toBe('ok')
  })

  it('reports readiness only after the database responds', async () => {
    const response = await getReadiness()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ checks: { database: 'up' }, status: 'ready' })
    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'sites', limit: 1, overrideAccess: true }),
    )
  })

  it('fails readiness without exposing the internal database error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.find.mockRejectedValue(new Error('postgresql://user:secret@database/private'))

    const response = await getReadiness()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(response.headers.get('retry-after')).toBe('5')
    expect(body).toMatchObject({ checks: { database: 'down' }, status: 'not_ready' })
    expect(JSON.stringify(body)).not.toContain('secret')
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret')
    consoleError.mockRestore()
  })

  it('reports degraded locally when Redis is intentionally disabled', async () => {
    mocks.redisHealth.mockResolvedValue('disabled')

    const response = await getReadiness()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ checks: { database: 'up', redis: 'disabled' }, status: 'degraded' })
  })

  it('fails production readiness when Redis is unavailable without exposing details', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.redisHealth.mockRejectedValue(new Error('redis://:secret@private-host'))

    const response = await getReadiness()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toMatchObject({ checks: { database: 'up', redis: 'down' }, status: 'not_ready' })
    expect(JSON.stringify(body)).not.toContain('secret')
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret')
    consoleError.mockRestore()
  })

  it('fails production readiness when lead delivery is not fully configured', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('SMTP_PASSWORD', '')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await getReadiness()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toMatchObject({
      checks: { database: 'up', leadDelivery: 'misconfigured', redis: 'up' },
      status: 'not_ready',
    })
    expect(JSON.stringify(body)).not.toContain('smtp-password')
    consoleError.mockRestore()
  })

  it('permits a controlled production deployment when lead delivery is explicitly disabled', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('SMTP_PASSWORD', '')
    vi.stubEnv('LEAD_DELIVERY_REQUIRED', 'false')

    const response = await getReadiness()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      checks: { database: 'up', leadDelivery: 'disabled', redis: 'up' },
      status: 'degraded',
    })
  })
})
