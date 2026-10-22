import { describe, expect, it, vi } from 'vitest'

import {
  assertSafeCleanupTarget,
  assertSafeFixtureIdentity,
  buildSimulatedLifecyclePlan,
  ENV_CONFIRM_LIFECYCLE,
  ENV_RUN_MUTATION,
  EXACT_CMS_BASE_URL,
  EXACT_PUBLIC_BASE_URL,
  generateSafeQaSlug,
  parseLifecycleArgs,
  QA_MARKER,
  sanitizeEvidence,
  SLUG_PREFIX,
  TARGET_SITE_CODE,
  TARGET_SITE_ID,
  verifyPublicEndpoint,
  type OwnedFixtureIDs,
} from '../../scripts/lib/cmsLifecycleProofSafety'
import { runCmsProductionLifecycleProof } from '../../scripts/cms-production-lifecycle-proof'

describe('CMS Production Lifecycle Proof - Safety Gates & Invariants', () => {
  it('defaults to dryRun when flags and confirmation env are omitted', () => {
    const options = parseLifecycleArgs([])
    expect(options.dryRun).toBe(true)
    expect(options.adminEmail).toBeUndefined()
    expect(options.adminPassword).toBeUndefined()
  })

  it('rejects foreign CMS_BASE_URL or PUBLIC_BASE_URL to prevent credentials exfiltration', () => {
    expect(() =>
      parseLifecycleArgs([], { CMS_BASE_URL: 'https://evil.attacker.com' }),
    ).toThrow('Security Violation')

    expect(() =>
      parseLifecycleArgs([], { PUBLIC_BASE_URL: 'https://evil.attacker.com' }),
    ).toThrow('Security Violation')
  })

  it('maintains dryRun=true if --live is passed without required confirmation env vars', () => {
    expect(parseLifecycleArgs(['--live'], {}).dryRun).toBe(true)
    expect(parseLifecycleArgs(['--live'], { [ENV_CONFIRM_LIFECYCLE]: 'true' }).dryRun).toBe(true)
    expect(parseLifecycleArgs(['--live'], { [ENV_RUN_MUTATION]: 'true' }).dryRun).toBe(true)
  })

  it('enables live mutations ONLY when --live and BOTH confirmation env vars are true', () => {
    const options = parseLifecycleArgs(['--live'], {
      [ENV_CONFIRM_LIFECYCLE]: 'true',
      [ENV_RUN_MUTATION]: 'true',
      ADMIN_EMAIL: 'ops@wingstravel.vn',
      ADMIN_PASSWORD: 'secretpassword',
    })
    expect(options.dryRun).toBe(false)
    expect(options.adminEmail).toBe('ops@wingstravel.vn')
    expect(options.adminPassword).toBe('secretpassword')
  })

  it('parses holdSeconds and caps at 60 seconds', () => {
    expect(parseLifecycleArgs(['--hold=25'], {}).holdSeconds).toBe(25)
    expect(parseLifecycleArgs(['--hold=120'], {}).holdSeconds).toBe(60)
  })

  it('generates safe QA slug with required prefix and valid suffix', () => {
    const slug1 = generateSafeQaSlug('run99')
    expect(slug1).toBe(`${SLUG_PREFIX}run99`)
    expect(slug1.startsWith(SLUG_PREFIX)).toBe(true)

    const slugRandom = generateSafeQaSlug()
    expect(slugRandom.startsWith(SLUG_PREFIX)).toBe(true)
  })

  it('assertSafeFixtureIdentity enforces site 2, slug prefix, and QA marker', () => {
    expect(() =>
      assertSafeFixtureIdentity({
        site: TARGET_SITE_ID,
        slug: `${SLUG_PREFIX}valid01`,
        title: `[${QA_MARKER}] Test Tour`,
      }),
    ).not.toThrow()

    expect(() =>
      assertSafeFixtureIdentity({
        site: 1,
        slug: `${SLUG_PREFIX}valid01`,
        title: `[${QA_MARKER}] Test Tour`,
      }),
    ).toThrow('WingsGo (site 2)')

    expect(() =>
      assertSafeFixtureIdentity({
        site: TARGET_SITE_ID,
        slug: 'regular-tour-tokyo',
        title: `[${QA_MARKER}] Test Tour`,
      }),
    ).toThrow(SLUG_PREFIX)

    expect(() =>
      assertSafeFixtureIdentity({
        site: TARGET_SITE_ID,
        slug: `${SLUG_PREFIX}valid01`,
        title: 'Regular Commercial Tour Name',
      }),
    ).toThrow(QA_MARKER)
  })

  it('assertSafeCleanupTarget prevents deletion of non-owned or foreign documents', () => {
    const owned: OwnedFixtureIDs = {
      departureID: 501,
      productID: 101,
      siteID: TARGET_SITE_ID,
      slug: `${SLUG_PREFIX}cleanup01`,
      wrapperID: 201,
    }

    expect(() =>
      assertSafeCleanupTarget(
        'tour-products',
        { id: 101, site: TARGET_SITE_ID, slug: owned.slug, title: QA_MARKER },
        owned,
      ),
    ).not.toThrow()

    expect(() =>
      assertSafeCleanupTarget(
        'tour-departures',
        { id: 501, site: TARGET_SITE_ID, tourProduct: 101 },
        owned,
      ),
    ).not.toThrow()

    expect(() =>
      assertSafeCleanupTarget(
        'pages',
        { id: 201, pathname: `/tour/${owned.slug}`, site: TARGET_SITE_ID },
        owned,
      ),
    ).not.toThrow()

    expect(() =>
      assertSafeCleanupTarget(
        'tour-products',
        { id: 999, site: TARGET_SITE_ID, slug: owned.slug, title: QA_MARKER },
        owned,
      ),
    ).toThrow('does not match owned fixture ID')

    expect(() =>
      assertSafeCleanupTarget(
        'tour-products',
        { id: 101, site: TARGET_SITE_ID, slug: owned.slug, title: 'Commercial Tour' },
        owned,
      ),
    ).toThrow('lacking QA marker')
  })

  it('buildSimulatedLifecyclePlan generates 8 explicit HTTP lifecycle steps', () => {
    const plan = buildSimulatedLifecyclePlan(
      { cmsBaseUrl: EXACT_CMS_BASE_URL, dryRun: true, locale: 'vi', publicBaseUrl: EXACT_PUBLIC_BASE_URL },
      { heroMediaId: 42 },
    )
    expect(plan).toHaveLength(8)
    expect(plan[0].action).toBe('AUTH_LOGIN')
    expect(plan[1].action).toBe('PREFLIGHT_DISCOVERY')
    expect(plan[7].action).toBe('FINALLY_CLEANUP_AND_VERIFY')
  })

  it('sanitizeEvidence redacts sensitive credentials and connection strings', () => {
    const dirty = {
      adminPassword: 'secret_password_123',
      database_url: 'postgres://user:super_secret_pw@127.0.0.1:5432/wings_db',
      nested: { password: 'plain', token: 'jwt' },
      ok: true,
      rawUrl: 'postgresql://postgres:secret123@db.internal:5432/app',
    }

    const sanitized = sanitizeEvidence(dirty)
    expect(sanitized.adminPassword).toBe('***REDACTED***')
    expect(sanitized.database_url).toBe('***REDACTED***')
    expect(sanitized.nested.password).toBe('***REDACTED***')
    expect(sanitized.nested.token).toBe('***REDACTED***')
    expect(sanitized.rawUrl).not.toContain('secret123')
  })

  it('verifyPublicEndpoint strictly requires HTTP 404 for cleanup and 200 with marker for read', async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const urlStr = String(url)
      if (urlStr.includes('server-error')) {
        return { ok: false, status: 500, text: async () => '500 Server Error' }
      }
      if (urlStr.includes('verify=')) {
        return { ok: false, status: 404, text: async () => '404 Not Found' }
      }
      return { ok: true, status: 200, text: async () => `<html>[${QA_MARKER}]</html>` }
    })

    const preCheck = await verifyPublicEndpoint('https://wingsgo.vn/tour/sample', true, fetchMock as never)
    expect(preCheck.ok).toBe(true)
    expect(preCheck.status).toBe(200)

    const postCheck = await verifyPublicEndpoint('https://wingsgo.vn/tour/sample?verify=123', false, fetchMock as never)
    expect(postCheck.ok).toBe(true)
    expect(postCheck.status).toBe(404)

    // Critical invariant: 500 is NOT accepted as deleted
    const errorCheck = await verifyPublicEndpoint('https://wingsgo.vn/tour/server-error?verify=123', false, fetchMock as never)
    expect(errorCheck.ok).toBe(false)
    expect(errorCheck.status).toBe(500)
  })
})

describe('runCmsProductionLifecycleProof - HTTP Flow', () => {
  it('executes preflight discovery after auth in dry-run mode without mutations', async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const urlStr = String(url)
      const method = init?.method || 'GET'

      if (method === 'POST' && urlStr.endsWith('/api/users/login')) {
        return { json: async () => ({ token: 'mock-jwt-token', user: { id: 7, role: 'super-admin' } }), ok: true, status: 200 }
      }

      if (method === 'GET') {
        if (urlStr.includes('/api/sites')) {
          return { json: async () => ({ docs: [{ code: TARGET_SITE_CODE, id: TARGET_SITE_ID }] }), ok: true, status: 200 }
        }
        if (urlStr.includes('/api/media')) {
          return { json: async () => ({ docs: [{ id: 88, url: '/media/sample.jpg' }] }), ok: true, status: 200 }
        }
        if (urlStr.endsWith('/media/sample.jpg')) {
          return { ok: true, status: 200, text: async () => 'image-bytes' }
        }
        if (urlStr.includes('/api/pages')) {
          return { json: async () => ({ docs: [{ id: 10, pathname: '/tour', site: TARGET_SITE_ID, slug: 'tour' }] }), ok: true, status: 200 }
        }
        if (urlStr.includes('/api/tour-products')) {
          return { json: async () => ({ docs: [] }), ok: true, status: 200 }
        }
      }

      throw new Error(`Unexpected call in dry-run: ${method} ${urlStr}`)
    })

    const result = await runCmsProductionLifecycleProof(
      {
        adminEmail: 'ops@wingstravel.vn',
        adminPassword: 'pw',
        cmsBaseUrl: EXACT_CMS_BASE_URL,
        dryRun: true,
        locale: 'vi',
        publicBaseUrl: EXACT_PUBLIC_BASE_URL,
        uniqueSuffix: 'dryrun1',
      },
      fetchMock as never,
    )

    expect(result.ok).toBe(true)
    expect(result.dryRun).toBe(true)
    expect(result.preflight.adminUserId).toBe(7)
    expect(result.preflight.heroMediaId).toBe(88)
    expect(result.plan).toHaveLength(8)
    expect(result.cleanupVerified).toBe(true)
    expect(fetchMock.mock.calls[0][1]?.redirect).toBe('error')
  })

  it.each(['happy', 'delete-failure', 'lost-create-response', 'lost-create-response-recovery-failure'])(
    'cleans only owned records after %s', async (scenario) => {
    const deleteFails = scenario === 'delete-failure'
    const responseLost = scenario.startsWith('lost-create-response')
    const recoveryFails = scenario === 'lost-create-response-recovery-failure'
    let committedProduct: Record<string, unknown> | null = null
    let tourProductDeleted = false
    let departureDeleted = false
    let wrapperDeleted = false

    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const urlStr = String(url)
      const method = init?.method || 'GET'

      if (urlStr.startsWith('https://wingsgo.vn/tour/')) {
        if (urlStr.includes('verify=')) return { ok: false, status: 404, text: async () => '404' }
        return { ok: true, status: 200, text: async () => `<html><body>[${QA_MARKER}]</body></html>` }
      }

      if (urlStr.endsWith('/api/users/login') && method === 'POST') {
        return { json: async () => ({ token: 'mock-jwt-token', user: { id: 7, role: 'super-admin' } }), ok: true, status: 200 }
      }

      if (method === 'GET' && urlStr.includes('/api/sites')) {
        return { json: async () => ({ docs: [{ code: TARGET_SITE_CODE, id: TARGET_SITE_ID }] }), ok: true, status: 200 }
      }
      if (method === 'GET' && urlStr.includes('/api/media')) {
        return { json: async () => ({ docs: [{ id: 88, url: '/media/sample.jpg' }] }), ok: true, status: 200 }
      }
      if (urlStr.endsWith('/media/sample.jpg')) {
        return { ok: true, status: 200, text: async () => 'image-bytes' }
      }
      if (method === 'GET' && urlStr.includes('/api/pages?') && urlStr.includes('pathname][equals]=%2Ftour')) {
        return { json: async () => ({ docs: [{ id: 10, pathname: '/tour', site: TARGET_SITE_ID }] }), ok: true, status: 200 }
      }
      if (method === 'GET' && urlStr.includes('/api/tour-products?')) {
        if (committedProduct && recoveryFails) {
          return { json: async () => ({ message: 'Recovery unavailable' }), ok: false, status: 503 }
        }
        return { json: async () => ({ docs: committedProduct && !tourProductDeleted ? [committedProduct] : [] }), ok: true, status: 200 }
      }
      if (method === 'GET' && (urlStr.includes('/api/pages?') || urlStr.includes('/api/tour-departures?'))) {
        return { json: async () => ({ docs: [] }), ok: true, status: 200 }
      }

      if (method === 'POST' && urlStr.includes('/api/tour-products')) {
        committedProduct = { ...JSON.parse(String(init?.body)), id: 101 }
        expect(committedProduct?.itineraryDays).toEqual([
          { dayNumber: 1, summary: QA_MARKER, title: QA_MARKER },
        ])
        if (responseLost) throw new Error('Response lost after committed create')
        return { json: async () => ({ doc: { id: 101, site: TARGET_SITE_ID, slug: 'cms-qa-20261022-live01', title: `[${QA_MARKER}] Proof`, _status: 'draft' } }), ok: true, status: 201 }
      }

      if (method === 'PATCH' && urlStr.includes('/api/tour-products/101')) {
        return { json: async () => ({ doc: { id: 101, priceFrom: 18900000 } }), ok: true, status: 200 }
      }

      if (method === 'POST' && urlStr.includes('/api/tour-departures')) {
        // Known fields only
        const body = JSON.parse(String(init?.body || '{}'))
        expect(body.holdNote).toBeUndefined()
        expect(body.bookingNote).toBeUndefined()
        return { json: async () => ({ doc: { id: 501, site: TARGET_SITE_ID, tourProduct: 101 } }), ok: true, status: 201 }
      }

      if (method === 'POST' && urlStr.includes('/api/tour-authoring/101')) {
        const body = JSON.parse(String(init?.body || '{}'))
        if (body.action === 'provision') {
          return { json: async () => ({ wrapper: { id: 201, path: '/tour/cms-qa-20261022-live01' } }), ok: true, status: 200 }
        }
        if (body.action === 'publish') {
          return { json: async () => ({ committed: true, refreshFailed: false }), ok: true, status: 200 }
        }
      }

      if (method === 'GET' && urlStr.includes('/api/tour-authoring/101')) {
        return { json: async () => ({ canPublish: true, revision: 'rev-abc-123' }), ok: true, status: 200 }
      }

      // Cleanup
      if (urlStr.includes('/api/tour-departures/501')) {
        if (method === 'GET') {
          return departureDeleted
            ? { json: async () => ({ errors: [{ message: 'Not found' }] }), ok: false, status: 404 }
            : { json: async () => ({ doc: { id: 501, site: TARGET_SITE_ID, tourProduct: 101 } }), ok: true, status: 200 }
        }
        if (method === 'DELETE') {
          if (deleteFails) {
            return { json: async () => ({ message: 'Injected delete failure' }), ok: false, status: 500 }
          }
          departureDeleted = true
          return { json: async () => ({ message: 'Deleted' }), ok: true, status: 200 }
        }
      }

      if (urlStr.includes('/api/pages/201')) {
        if (method === 'GET') {
          return wrapperDeleted
            ? { json: async () => ({ errors: [{ message: 'Not found' }] }), ok: false, status: 404 }
            : { json: async () => ({ doc: { id: 201, pathname: '/tour/cms-qa-20261022-live01', site: TARGET_SITE_ID } }), ok: true, status: 200 }
        }
        if (method === 'DELETE') {
          wrapperDeleted = true
          return { json: async () => ({ message: 'Deleted' }), ok: true, status: 200 }
        }
      }

      if (urlStr.includes('/api/tour-products/101')) {
        if (method === 'GET') {
          return tourProductDeleted
            ? { json: async () => ({ errors: [{ message: 'Not found' }] }), ok: false, status: 404 }
            : { json: async () => ({ doc: { id: 101, site: TARGET_SITE_ID, slug: 'cms-qa-20261022-live01', title: QA_MARKER } }), ok: true, status: 200 }
        }
        if (method === 'DELETE') {
          tourProductDeleted = true
          return { json: async () => ({ message: 'Deleted' }), ok: true, status: 200 }
        }
      }

      throw new Error(`Unhandled mock fetch: ${method} ${urlStr}`)
    })

    const result = await runCmsProductionLifecycleProof(
      {
        adminEmail: 'ops@wingstravel.vn',
        adminPassword: 'securepassword',
        cmsBaseUrl: EXACT_CMS_BASE_URL,
        dryRun: false,
        locale: 'vi',
        publicBaseUrl: EXACT_PUBLIC_BASE_URL,
        uniqueSuffix: 'live01',
      },
      fetchMock as never,
    )

    expect(result.ok).toBe(!deleteFails && !responseLost)
    expect(result.dryRun).toBe(false)
    expect(result.cleanupVerified).toBe(!deleteFails && !recoveryFails)
    expect(result.ownedIDs.productID).toBe(recoveryFails ? null : 101)
    expect(result.ownedIDs.departureID).toBe(responseLost ? null : 501)
    expect(result.ownedIDs.wrapperID).toBe(responseLost ? null : 201)
    expect(departureDeleted).toBe(!deleteFails && !responseLost)
    expect(wrapperDeleted).toBe(!responseLost)
    expect(tourProductDeleted).toBe(!recoveryFails)
    if (responseLost) {
      expect(result.phases.find(({ phase }) => phase === 'reconcile')?.status).toBe(recoveryFails ? 'failed' : 'success')
    }
  })
})
