import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadMultisiteAuditInventory } from '../helpers/multisiteAuditInventory'

const mocks = vi.hoisted(() => ({
  checkIPRateLimit: vi.fn(),
  checkValidatedRateLimits: vi.fn(),
  completeIdempotency: vi.fn(),
  create: vi.fn(),
  find: vi.fn(),
  getCurrentLocale: vi.fn(),
  getCurrentPublicPathname: vi.fn(),
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
vi.mock('@/utilities/siteContext', () => ({
  getCurrentLocale: mocks.getCurrentLocale,
  getCurrentPublicPathname: mocks.getCurrentPublicPathname,
  getCurrentSite: mocks.getCurrentSite,
}))
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

import { GET, POST } from '@/app/(payload)/api/lead-submissions/route'

const inventory = loadMultisiteAuditInventory()
const sitesWithForms = inventory.sites.filter((site) => site.formRouteSample)

const request = ({
  bodyOverrides = {},
  host = 'www.wingsgo.vn',
  referer = `https://${host}/lien-he`,
}: {
  bodyOverrides?: Record<string, unknown>
  host?: string
  referer?: null | string
} = {}) =>
  new Request(`https://${host}/api/lead-submissions`, {
    body: JSON.stringify({
      formId: 7,
      idempotencyKey: '4cb68f3f-6dc9-4b3f-918b-74153f271abc',
      submissionData: [{ field: 'name', value: 'Alice' }],
      ...bodyOverrides,
    }),
    headers: new Headers({
      ...(referer ? { referer } : {}),
      'content-type': 'application/json',
      'x-site-context-source': 'proxy',
      'x-client-ip': '198.51.100.10',
      'x-site-host': host,
    }),
    method: 'POST',
  })

describe('lead submission endpoint integration', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
    mocks.getCurrentSite.mockResolvedValue({ code: 'wingsgo', id: 1, primaryDomain: 'wingsgo.vn' })
    mocks.getCurrentLocale.mockResolvedValue('vi')
    mocks.getCurrentPublicPathname.mockResolvedValue('/lien-he')
    mocks.getPayload.mockResolvedValue({
      create: mocks.create,
      find: mocks.find,
      jobs: { queue: mocks.jobsQueue },
      logger: { error: vi.fn() },
      update: mocks.update,
    })
    mocks.checkIPRateLimit.mockResolvedValue({
      allowed: true,
      ipCount: 1,
      requiresChallenge: false,
    })
    mocks.checkValidatedRateLimits.mockResolvedValue({ allowed: true, formCount: 1, ipCount: 1 })
    mocks.find.mockResolvedValue({
      docs: [
        {
          fields: [{ blockType: 'text', label: 'Name', name: 'name', required: true }],
          id: 7,
          site: 1,
          title: 'Contact',
        },
      ],
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
    expect(mocks.verifyTurnstile).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedHosts: expect.arrayContaining(['wingsgo.vn', 'www.wingsgo.vn']),
        token: 'verified-token',
      }),
    )
  })

  it('validates, site-rate-limits, creates once and queues durable delivery', async () => {
    const response = await POST(request())

    expect(response.status).toBe(202)
    expect(mocks.checkValidatedRateLimits).toHaveBeenCalledWith({ formId: 7, siteCode: 'wingsgo' })
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'form-submissions',
        data: expect.objectContaining({ deliveryStatus: 'pending', form: 7, site: 1 }),
        overrideAccess: true,
      }),
    )
    expect(mocks.completeIdempotency).toHaveBeenCalledWith(expect.any(String), 99)
    expect(mocks.jobsQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        queue: 'lead-notifications',
        task: 'sendLeadNotification',
      }),
    )
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deliveryStatus: 'queued' }),
        id: 99,
      }),
    )
  })

  it('accepts normalized enquiry context without mixing it into customer submission fields', async () => {
    const response = await POST(
      request({
        bodyOverrides: {
          context: {
            discovery: { destination: 'sapa', duration: 'multi-day', style: 'culture' },
            source: 'journeys',
            tourId: '42',
            tourSlug: 'sapa-trek-and-market',
          },
        },
      }),
    )

    expect(response.status).toBe(202)
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          enquiryContext: {
            discovery: { destination: 'sapa', duration: 'multi-day', style: 'culture' },
            source: 'journeys',
            tourId: '42',
            tourSlug: 'sapa-trek-and-market',
          },
          submissionData: [{ field: 'name', value: 'Alice' }],
        }),
      }),
    )
  })

  it('fails closed for WingsGroup without consent and never persists a forged site/source context', async () => {
    mocks.getCurrentSite.mockResolvedValue({
      code: 'wings-group',
      id: 9,
      primaryDomain: 'wingsgroup.vn',
    })
    mocks.find.mockImplementation(async ({ collection }: { collection: string }) =>
      collection === 'site-settings'
        ? {
            docs: [
              {
                site: 9,
                wingsGroupV3: {
                  enabled: true,
                  privacy: {
                    approvalReference: 'privacy-approval-2026-08-14',
                    approvalState: 'approved',
                    consentEvidenceReference: 'consent-evidence-2026-08-14',
                    consentRequired: true,
                    consentVersion: 'wingsgroup-contact-v1',
                    dataSubjectContact: 'info@doicanhviet.com',
                    dataSubjectRightsEvidence: 'rights-evidence-2026-08-14',
                    dataSubjectRightsStatement: 'Legal-owner supplied rights statement.',
                    interBranchTransferAllowed: true,
                    policyRouteEn: '/en/chinh-sach-bao-mat',
                    policyRouteVi: '/chinh-sach-bao-mat',
                    policyVersion: 'wingsgroup-privacy-v1',
                    retentionMonths: 24,
                  },
                },
              },
            ],
          }
        : {
            docs: [
              {
                fields: [
                  { blockType: 'text', label: 'Name', name: 'name', required: true },
                  { blockType: 'textarea', label: 'Need', name: 'message', required: true },
                ],
                id: 7,
                site: 9,
                title: 'WingsGroup Contact',
              },
            ],
          },
    )

    const response = await POST(
      request({
        bodyOverrides: {
          context: { source: 'forged-client-source' },
          submissionData: [
            { field: 'name', value: 'Alice' },
            { field: 'message', value: 'Private consultation need' },
          ],
        },
        host: 'wingsgroup.vn',
      }),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Invalid submission.' })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('persists trusted WingsGroup locale/path and server consent time without PII in audit logs', async () => {
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    mocks.getCurrentSite.mockResolvedValue({
      code: 'wings-group',
      id: 9,
      primaryDomain: 'wingsgroup.vn',
    })
    mocks.getCurrentLocale.mockResolvedValue('en')
    mocks.find.mockImplementation(async ({ collection }: { collection: string }) =>
      collection === 'site-settings'
        ? {
            docs: [
              {
                site: 9,
                wingsGroupV3: {
                  consultationChannels: [{ key: 'zalo', state: 'unconfigured' }],
                  enabled: true,
                  privacy: {
                    approvalReference: 'privacy-approval-2026-08-14',
                    approvalState: 'approved',
                    consentEvidenceReference: 'consent-evidence-2026-08-14',
                    consentRequired: true,
                    consentVersion: 'wingsgroup-contact-v1',
                    dataSubjectContact: 'info@doicanhviet.com',
                    dataSubjectRightsEvidence: 'rights-evidence-2026-08-14',
                    dataSubjectRightsStatement: 'Legal-owner supplied rights statement.',
                    interBranchTransferAllowed: true,
                    policyRouteEn: '/en/chinh-sach-bao-mat',
                    policyRouteVi: '/chinh-sach-bao-mat',
                    policyVersion: 'wingsgroup-privacy-v1',
                    retentionMonths: 24,
                  },
                },
              },
            ],
          }
        : {
            docs: [
              {
                fields: [
                  { blockType: 'text', label: 'Name', name: 'name', required: true },
                  { blockType: 'textarea', label: 'Need', name: 'message', required: true },
                ],
                id: 7,
                site: 9,
                title: 'WingsGroup Contact',
              },
            ],
          },
    )

    const response = await POST(
      request({
        bodyOverrides: {
          context: { source: 'forged-client-source' },
          leadContract: {
            consent: true,
            consentVersion: 'wingsgroup-contact-v1',
            preferredChannel: 'zalo',
          },
          submissionData: [
            { field: 'name', value: 'Alice Private' },
            { field: 'message', value: 'Private consultation need' },
          ],
        },
        host: 'wingsgroup.vn',
        referer: 'https://wingsgroup.vn/en/lien-he',
      }),
    )

    expect(response.status).toBe(202)
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          enquiryContext: {
            discovery: undefined,
            tourId: undefined,
            tourSlug: undefined,
          },
          site: 9,
          submissionData: [
            { field: 'name', value: 'Alice Private' },
            { field: 'message', value: 'Private consultation need' },
          ],
          wingsGroupLead: expect.objectContaining({
            consentVersion: 'wingsgroup-contact-v1',
            locale: 'en',
            preferredChannel: 'zalo',
            sourcePath: '/lien-he',
          }),
        }),
      }),
    )
    const governance = mocks.create.mock.calls[0]?.[0]?.data.wingsGroupLead as {
      consentedAt: string
      retentionUntil: string
    }
    expect(governance.consentedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(governance.retentionUntil).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(JSON.stringify([...consoleInfo.mock.calls, ...consoleWarn.mock.calls])).not.toMatch(
      /Alice Private|Private consultation need/,
    )
    consoleInfo.mockRestore()
    consoleWarn.mockRestore()
  })

  it('persists the same-origin public form route and ignores forged source assertions', async () => {
    mocks.getCurrentSite.mockResolvedValue({
      additionalDomains: [{ domain: 'www.wingsgroup.vn' }],
      code: 'wings-group',
      id: 9,
      primaryDomain: 'wingsgroup.vn',
    })
    mocks.getCurrentLocale.mockResolvedValue('vi')
    mocks.find.mockImplementation(async ({ collection }: { collection: string }) =>
      collection === 'site-settings'
        ? {
            docs: [
              {
                site: 9,
                wingsGroupV3: {
                  enabled: true,
                  privacy: {
                    approvalReference: 'privacy-approval-2026-08-14',
                    approvalState: 'approved',
                    consentEvidenceReference: 'consent-evidence-2026-08-14',
                    consentRequired: true,
                    consentVersion: 'wingsgroup-contact-v1',
                    dataSubjectContact: 'info@doicanhviet.com',
                    dataSubjectRightsEvidence: 'rights-evidence-2026-08-14',
                    dataSubjectRightsStatement: 'Legal-owner supplied rights statement.',
                    interBranchTransferAllowed: true,
                    policyRouteEn: '/en/chinh-sach-bao-mat',
                    policyRouteVi: '/chinh-sach-bao-mat',
                    policyVersion: 'wingsgroup-privacy-v1',
                    retentionMonths: 24,
                  },
                },
              },
            ],
          }
        : {
            docs: [
              {
                fields: [
                  { blockType: 'text', label: 'Name', name: 'name', required: true },
                  { blockType: 'textarea', label: 'Need', name: 'message', required: true },
                ],
                id: 7,
                site: 9,
                title: 'WingsGroup Contact',
              },
            ],
          },
    )

    const cases = [
      { expected: '/lien-he', referer: 'https://wingsgroup.vn/lien-he' },
      { expected: '/', referer: 'https://attacker.example/lien-he' },
      { expected: '/', referer: 'https://wingsgroup.vn/wingsgo/lien-he' },
      { expected: '/', referer: 'https://wingsgroup.vn/en/lien-he' },
      { expected: '/', referer: 'https://wingsgroup.vn/api/lead-submissions' },
      { expected: '/', referer: 'malformed-referer' },
    ]

    for (const { expected, referer } of cases) {
      mocks.create.mockClear()
      const response = await POST(
        request({
          bodyOverrides: {
            context: { source: 'forged-client-source' },
            leadContract: {
              consent: true,
              consentVersion: 'wingsgroup-contact-v1',
            },
            submissionData: [
              { field: 'name', value: 'Alice' },
              { field: 'message', value: 'Consultation request' },
            ],
          },
          host: 'wingsgroup.vn',
          referer,
        }),
      )

      expect(response.status, referer).toBe(202)
      expect(mocks.create.mock.calls.at(-1)?.[0]?.data.wingsGroupLead.sourcePath, referer).toBe(
        expected,
      )
    }
  })

  it('does not expose or persist WingsGroup leads while privacy approval is pending', async () => {
    vi.stubEnv('LEAD_DELIVERY_REQUIRED', 'true')
    mocks.getCurrentSite.mockResolvedValue({
      code: 'wings-group',
      id: 9,
      primaryDomain: 'wingsgroup.vn',
    })
    mocks.find.mockImplementation(async ({ collection }: { collection: string }) =>
      collection === 'site-settings'
        ? {
            docs: [
              {
                site: 9,
                wingsGroupV3: {
                  enabled: true,
                  privacy: {
                    approvalReference: null,
                    approvalState: 'pending',
                    consentEvidenceReference: null,
                    consentRequired: true,
                    consentVersion: 'wingsgroup-contact-v1',
                    dataSubjectContact: 'info@doicanhviet.com',
                    dataSubjectRightsEvidence: null,
                    dataSubjectRightsStatement: null,
                    interBranchTransferAllowed: true,
                    policyRouteEn: '/en/chinh-sach-bao-mat',
                    policyRouteVi: '/chinh-sach-bao-mat',
                    policyVersion: 'wingsgroup-privacy-v1',
                    retentionMonths: 24,
                  },
                },
              },
            ],
          }
        : {
            docs: [
              {
                fields: [
                  { blockType: 'text', label: 'Name', name: 'name', required: true },
                  { blockType: 'textarea', label: 'Need', name: 'message', required: true },
                ],
                id: 7,
                site: 9,
                title: 'WingsGroup Contact',
              },
            ],
          },
    )

    const publicConfig = await GET(request({ host: 'wingsgroup.vn' }))
    expect(publicConfig.status).toBe(200)
    expect(await publicConfig.json()).toMatchObject({
      available: false,
      reason: 'configuration-unavailable',
    })

    const response = await POST(
      request({
        bodyOverrides: {
          leadContract: {
            consent: true,
            consentVersion: 'wingsgroup-contact-v1',
          },
          submissionData: [
            { field: 'name', value: 'Alice' },
            { field: 'message', value: 'Consultation request' },
          ],
        },
        host: 'wingsgroup.vn',
      }),
    )

    expect(response.status).toBe(503)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns only fail-closed public consultation-channel state for WingsGroup', async () => {
    mocks.getCurrentSite.mockResolvedValue({
      code: 'wings-group',
      id: 9,
      primaryDomain: 'wingsgroup.vn',
    })
    mocks.getCurrentLocale.mockResolvedValue('vi')
    mocks.find.mockResolvedValue({
      docs: [
        {
          site: 9,
          wingsGroupV3: {
            consultationChannels: [
              { key: 'zalo', state: 'unconfigured' },
              {
                key: 'whatsapp',
                owner: 'Operations',
                sla: '4 business hours',
                state: 'approved',
                trackingReference: 'tracking-proof',
                url: 'https://example.com/whatsapp',
              },
              { key: 'messenger', state: 'disabled' },
            ],
            enabled: true,
            privacy: {
              approvalReference: 'privacy-approval-2026-08-14',
              approvalState: 'approved',
              consentEvidenceReference: 'consent-evidence-2026-08-14',
              consentRequired: true,
              consentVersion: 'wingsgroup-contact-v1',
              dataSubjectContact: 'info@doicanhviet.com',
              dataSubjectRightsEvidence: 'rights-evidence-2026-08-14',
              dataSubjectRightsStatement: 'Legal-owner supplied rights statement.',
              interBranchTransferAllowed: true,
              policyRouteEn: '/en/chinh-sach-bao-mat',
              policyRouteVi: '/chinh-sach-bao-mat',
              policyVersion: 'wingsgroup-privacy-v1',
              retentionMonths: 24,
            },
          },
        },
      ],
    })

    const response = await GET(request({ host: 'wingsgroup.vn' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.channels).toEqual([
      { key: 'zalo', label: 'Zalo', state: 'pending-update' },
      {
        href: 'https://example.com/whatsapp',
        key: 'whatsapp',
        label: 'WhatsApp',
        state: 'approved',
      },
    ])
    expect(JSON.stringify(body)).not.toContain('messenger')
  })

  it('rejects malformed or extended enquiry context before resolving a site', async () => {
    const response = await POST(
      request({
        bodyOverrides: {
          context: {
            discovery: { destination: 'Sa Pa!' },
            privileged: true,
          },
        },
      }),
    )

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
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deliveryErrorCode: 'queue_unavailable',
          deliveryStatus: 'queue_failed',
        }),
        id: 99,
      }),
    )
  })

  it('keeps trusted host and form ownership scoped to each site with a public form route', async () => {
    for (const site of sitesWithForms) {
      vi.clearAllMocks()
      const host = site.hosts[0] || site.primaryDomain
      const currentSite = {
        additionalDomains: (
          site.additionalDomains ||
          site.hosts.filter((candidate) => candidate !== site.primaryDomain)
        ).map((domain) => ({ domain })),
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
      mocks.checkIPRateLimit.mockResolvedValue({
        allowed: true,
        ipCount: 1,
        requiresChallenge: false,
      })
      mocks.checkValidatedRateLimits.mockResolvedValue({ allowed: true, formCount: 1, ipCount: 1 })
      const formResult = {
        docs: [
          {
            fields: [
              { blockType: 'text', label: 'Name', name: 'name', required: true },
              ...(site.name === 'wings-group'
                ? [{ blockType: 'textarea', label: 'Need', name: 'message', required: true }]
                : []),
            ],
            id: 7,
            site: currentSite.id,
            title: `${site.name} Contact`,
          },
        ],
      }
      mocks.find.mockImplementation(async ({ collection }: { collection: string }) =>
        collection === 'site-settings'
          ? {
              docs: [
                {
                  site: currentSite.id,
                  wingsGroupV3: {
                    enabled: true,
                    privacy: {
                      approvalReference: 'privacy-approval-2026-08-14',
                      approvalState: 'approved',
                      consentEvidenceReference: 'consent-evidence-2026-08-14',
                      consentRequired: true,
                      consentVersion: 'wingsgroup-contact-v1',
                      dataSubjectContact: 'info@doicanhviet.com',
                      dataSubjectRightsEvidence: 'rights-evidence-2026-08-14',
                      dataSubjectRightsStatement: 'Legal-owner supplied rights statement.',
                      interBranchTransferAllowed: true,
                      policyRouteEn: '/en/chinh-sach-bao-mat',
                      policyRouteVi: '/chinh-sach-bao-mat',
                      policyVersion: 'wingsgroup-privacy-v1',
                      retentionMonths: 24,
                    },
                  },
                },
              ],
            }
          : formResult,
      )
      mocks.reserveIdempotency.mockResolvedValue(true)
      mocks.update.mockResolvedValue({ id: 99 })
      mocks.create.mockResolvedValue({ id: 99 })
      mocks.jobsQueue.mockResolvedValue({ id: 100 })

      const response = await POST(
        request({
          bodyOverrides:
            site.name === 'wings-group'
              ? {
                  leadContract: {
                    consent: true,
                    consentVersion: 'wingsgroup-contact-v1',
                  },
                  submissionData: [
                    { field: 'name', value: 'Alice' },
                    { field: 'message', value: 'Consultation request' },
                  ],
                }
              : {},
          host,
        }),
      )

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
        additionalDomains: (
          site.additionalDomains ||
          site.hosts.filter((candidate) => candidate !== site.primaryDomain)
        ).map((domain) => ({ domain })),
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
      mocks.checkIPRateLimit.mockResolvedValue({
        allowed: true,
        ipCount: 3,
        requiresChallenge: true,
      })
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
