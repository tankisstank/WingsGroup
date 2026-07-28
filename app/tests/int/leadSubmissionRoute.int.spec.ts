import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadMultisiteAuditInventory } from '../helpers/multisiteAuditInventory'

const mocks = vi.hoisted(() => ({
  checkIPRateLimit: vi.fn(),
  checkValidatedRateLimits: vi.fn(),
  completeIdempotency: vi.fn(),
  create: vi.fn(),
  find: vi.fn(),
  getCurrentSite: vi.fn(),
  getPayload: vi.fn(),
  jobsQueue: vi.fn(),
  releaseIdempotency: vi.fn(),
  reserveIdempotency: vi.fn(),
  update: vi.fn(),
  verifyTurnstile: vi.fn(),
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: mocks.getPayload }))
vi.mock('@/utilities/siteContext', () => ({ getCurrentSite: mocks.getCurrentSite }))
vi.mock('@/lead-capture/turnstile', () => ({ verifyTurnstile: mocks.verifyTurnstile }))
vi.mock('@/lead-capture/redis', () => ({
  createLeadRedisStore: () => ({
    checkIPRateLimit: mocks.checkIPRateLimit,
    checkValidatedRateLimits: mocks.checkValidatedRateLimits,
    completeIdempotency: mocks.completeIdempotency,
    releaseIdempotency: mocks.releaseIdempotency,
    reserveIdempotency: mocks.reserveIdempotency,
  }),
  getClientIP: () => '198.51.100.10',
}))

import { POST } from '@/app/(payload)/api/lead-submissions/route'

const inventory = loadMultisiteAuditInventory()
const sitesWithForms = inventory.sites.filter((site) => site.formRouteSample)

const request = (
  {
    bodyOverrides = {},
    host = 'www.wingsgo.vn',
  }: {
    bodyOverrides?: Record<string, unknown>
    host?: string
  } = {},
) =>
  new Request(`https://${host}/api/lead-submissions`, {
    body: JSON.stringify({
      formId: 7,
      idempotencyKey: '4cb68f3f-6dc9-4b3f-918b-74153f271abc',
      submissionData: [{ field: 'name', value: 'Alice' }],
      ...bodyOverrides,
    }),
    headers: {
      'content-type': 'application/json',
      'x-site-context-source': 'proxy',
      'x-client-ip': '198.51.100.10',
      'x-site-host': host,
    },
    method: 'POST',
  })

describe('lead submission endpoint integration', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
    mocks.getCurrentSite.mockResolvedValue({ code: 'wingsgo', id: 1, primaryDomain: 'wingsgo.vn' })
    mocks.getPayload.mockResolvedValue({
      create: mocks.create,
      find: mocks.find,
      jobs: { queue: mocks.jobsQueue },
      logger: { error: vi.fn() },
      update: mocks.update,
    })
    mocks.checkIPRateLimit.mockResolvedValue({ allowed: true, ipCount: 1, requiresChallenge: false })
    mocks.checkValidatedRateLimits.mockResolvedValue({ allowed: true, formCount: 1, ipCount: 1 })
    mocks.find.mockResolvedValue({
      docs: [{ fields: [{ blockType: 'text', label: 'Name', name: 'name', required: true }], id: 7, site: 1, title: 'Contact' }],
    })
    mocks.reserveIdempotency.mockResolvedValue(true)
    mocks.update.mockResolvedValue({ id: 99 })
    mocks.create.mockResolvedValue({ id: 99 })
    mocks.jobsQueue.mockResolvedValue({ id: 100 })
  })

  it('rejects requests that did not pass through trusted context middleware', async () => {
    const untrusted = new Request('https://www.wingsgo.vn/api/lead-submissions', {
      body: JSON.stringify({
        formId: 7,
        idempotencyKey: '4cb68f3f-6dc9-4b3f-918b-74153f271abc',
        submissionData: [{ field: 'name', value: 'Alice' }],
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })

    const response = await POST(untrusted)

    expect(response.status).toBe(400)
    expect(mocks.getPayload).not.toHaveBeenCalled()
  })

  it('fails closed when Redis is unavailable', async () => {
    mocks.checkIPRateLimit.mockRejectedValue(new Error('offline'))

    const response = await POST(request())

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'Service temporarily unavailable.' })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects a form that does not belong to the resolved site', async () => {
    mocks.find.mockResolvedValue({ docs: [{ id: 7, site: 2, fields: [], title: 'Other' }] })

    const response = await POST(request())

    expect(response.status).toBe(400)
    expect(mocks.reserveIdempotency).not.toHaveBeenCalled()
    expect(mocks.checkValidatedRateLimits).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('validates Turnstile against the trusted request host, including a www domain', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret')
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'test-site-key')
    mocks.checkIPRateLimit.mockResolvedValue({ allowed: true, ipCount: 3, requiresChallenge: true })
    mocks.verifyTurnstile.mockResolvedValue(true)

    const response = await POST(request({ bodyOverrides: { turnstileToken: 'verified-token' } }))

    expect(response.status).toBe(202)
    expect(mocks.verifyTurnstile).toHaveBeenCalledWith(expect.objectContaining({
      expectedHosts: expect.arrayContaining(['wingsgo.vn', 'www.wingsgo.vn']),
      token: 'verified-token',
    }))
  })

  it('validates, site-rate-limits, creates once and queues durable delivery', async () => {
    const response = await POST(request())

    expect(response.status).toBe(202)
    expect(mocks.checkValidatedRateLimits).toHaveBeenCalledWith({ formId: 7, siteCode: 'wingsgo' })
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'form-submissions',
      data: expect.objectContaining({ deliveryStatus: 'pending', form: 7, site: 1 }),
      overrideAccess: true,
    }))
    expect(mocks.completeIdempotency).toHaveBeenCalledWith(expect.any(String), 99)
    expect(mocks.jobsQueue).toHaveBeenCalledWith(expect.objectContaining({
      queue: 'lead-notifications',
      task: 'sendLeadNotification',
    }))
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ deliveryStatus: 'queued' }),
      id: 99,
    }))
  })

  it('accepts normalized enquiry context without mixing it into customer submission fields', async () => {
    const response = await POST(request({
      bodyOverrides: {
        context: {
          discovery: { destination: 'sapa', duration: 'multi-day', style: 'culture' },
          source: 'journeys',
          tourId: '42',
          tourSlug: 'sapa-trek-and-market',
        },
      },
    }))

    expect(response.status).toBe(202)
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        submissionData: [{ field: 'name', value: 'Alice' }],
      }),
    }))
  })

  it('rejects malformed or extended enquiry context before resolving a site', async () => {
    const response = await POST(request({
      bodyOverrides: {
        context: {
          discovery: { destination: 'Sa Pa!' },
          privileged: true,
        },
      },
    }))

    expect(response.status).toBe(400)
    expect(mocks.getCurrentSite).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns the generic accepted response for a duplicate idempotency key without creating twice', async () => {
    mocks.reserveIdempotency.mockResolvedValue(false)

    const response = await POST(request())

    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ status: 'accepted' })
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.jobsQueue).not.toHaveBeenCalled()
  })

  it('persists private reconciliation state after bounded queue retries fail', async () => {
    mocks.jobsQueue.mockRejectedValue(new Error('queue offline'))

    const response = await POST(request())

    expect(response.status).toBe(202)
    expect(mocks.jobsQueue).toHaveBeenCalledTimes(3)
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        deliveryErrorCode: 'queue_unavailable',
        deliveryStatus: 'queue_failed',
      }),
      id: 99,
    }))
  })

  it('keeps trusted host and form ownership scoped to each site with a public form route', async () => {
    for (const site of sitesWithForms) {
      vi.clearAllMocks()
      const host = site.hosts[0] || site.primaryDomain
      const currentSite = {
        additionalDomains: (site.additionalDomains || site.hosts.filter((candidate) => candidate !== site.primaryDomain)).map(
          (domain) => ({ domain }),
        ),
        code: site.name,
        id: site.id || 1,
        primaryDomain: site.primaryDomain,
      }

      mocks.getCurrentSite.mockResolvedValue(currentSite)
      mocks.getPayload.mockResolvedValue({
        create: mocks.create,
        find: mocks.find,
        jobs: { queue: mocks.jobsQueue },
        logger: { error: vi.fn() },
        update: mocks.update,
      })
      mocks.checkIPRateLimit.mockResolvedValue({ allowed: true, ipCount: 1, requiresChallenge: false })
      mocks.checkValidatedRateLimits.mockResolvedValue({ allowed: true, formCount: 1, ipCount: 1 })
      mocks.find.mockResolvedValue({
        docs: [
          {
            fields: [{ blockType: 'text', label: 'Name', name: 'name', required: true }],
            id: 7,
            site: currentSite.id,
            title: `${site.name} Contact`,
          },
        ],
      })
      mocks.reserveIdempotency.mockResolvedValue(true)
      mocks.update.mockResolvedValue({ id: 99 })
      mocks.create.mockResolvedValue({ id: 99 })
      mocks.jobsQueue.mockResolvedValue({ id: 100 })

      const response = await POST(request({ host }))

      expect(response.status, `${site.name} status`).toBe(202)
      expect(mocks.find).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'forms',
          where: {
            and: [{ id: { equals: 7 } }, { site: { equals: currentSite.id } }],
          },
        }),
      )
      expect(mocks.checkValidatedRateLimits).toHaveBeenCalledWith({
        formId: 7,
        siteCode: currentSite.code,
      })
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'form-submissions',
          data: expect.objectContaining({ form: 7, site: currentSite.id }),
        }),
      )
    }
  })

  it('builds Turnstile expected hosts from the resolved site inventory for subdomain and alternate-domain sites', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret')
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'test-site-key')

    const sampleSites = sitesWithForms.filter((site) =>
      ['wings-go', 'wings-care', 'wings-plus'].includes(site.name),
    )

    for (const site of sampleSites) {
      vi.clearAllMocks()
      const host = site.hosts[0] || site.primaryDomain
      const currentSite = {
        additionalDomains: (site.additionalDomains || site.hosts.filter((candidate) => candidate !== site.primaryDomain)).map(
          (domain) => ({ domain }),
        ),
        code: site.name,
        id: site.id || 1,
        primaryDomain: site.primaryDomain,
      }

      mocks.getCurrentSite.mockResolvedValue(currentSite)
      mocks.getPayload.mockResolvedValue({
        create: mocks.create,
        find: mocks.find,
        jobs: { queue: mocks.jobsQueue },
        logger: { error: vi.fn() },
        update: mocks.update,
      })
      mocks.checkIPRateLimit.mockResolvedValue({ allowed: true, ipCount: 3, requiresChallenge: true })
      mocks.checkValidatedRateLimits.mockResolvedValue({ allowed: true, formCount: 1, ipCount: 1 })
      mocks.find.mockResolvedValue({
        docs: [
          {
            fields: [{ blockType: 'text', label: 'Name', name: 'name', required: true }],
            id: 7,
            site: currentSite.id,
            title: `${site.name} Contact`,
          },
        ],
      })
      mocks.reserveIdempotency.mockResolvedValue(true)
      mocks.update.mockResolvedValue({ id: 99 })
      mocks.create.mockResolvedValue({ id: 99 })
      mocks.jobsQueue.mockResolvedValue({ id: 100 })
      mocks.verifyTurnstile.mockResolvedValue(true)

      const response = await POST(
        request({
          bodyOverrides: { turnstileToken: 'verified-token' },
          host,
        }),
      )

      expect(response.status, `${site.name} turnstile status`).toBe(202)
      expect(mocks.verifyTurnstile).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedHosts: expect.arrayContaining(site.hosts),
          token: 'verified-token',
        }),
      )
    }
  })
})
