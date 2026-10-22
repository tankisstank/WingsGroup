import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  assertSafeCleanupTarget,
  assertSafeFixtureIdentity,
  buildSimulatedLifecyclePlan,
  EXACT_CMS_BASE_URL,
  EXACT_PUBLIC_BASE_URL,
  executePhase,
  generateSafeQaSlug,
  parseLifecycleArgs,
  QA_MARKER,
  sanitizeEvidence,
  TARGET_SITE_CODE,
  TARGET_SITE_ID,
  verifyPublicEndpoint,
  type CmsLifecyclePhaseEvidence,
  type CmsLifecycleProofOptions,
  type CmsLifecycleProofResult,
  type HttpFetcher,
  type OwnedFixtureIDs,
} from './lib/cmsLifecycleProofSafety'
import { getMediaUrl } from '../src/utilities/getMediaUrl'
import { reconcileCmsProof } from './lib/cmsLifecycleProofRecovery'
import { CmsHttpClient } from './lib/cmsLifecycleProofClient'

export const runCmsProductionLifecycleProof = async (
  options: CmsLifecycleProofOptions,
  fetcherOverride?: HttpFetcher,
): Promise<CmsLifecycleProofResult> => {
  const executedAt = new Date().toISOString()
  const ownerMarker = `[proof:${randomUUID()}]`
  const phases: CmsLifecyclePhaseEvidence[] = []
  const ownedIDs: OwnedFixtureIDs = {
    departureID: null,
    productID: null,
    siteID: TARGET_SITE_ID,
    slug: null,
    wrapperID: null,
  }

  let cleanupVerified = false
  let preflightData: Record<string, unknown> = {}
  const fetcher = fetcherOverride || fetch
  const client = new CmsHttpClient(EXACT_CMS_BASE_URL, fetcher)

  if (!options.adminEmail || !options.adminPassword) {
    throw new Error('Authentication requires ADMIN_EMAIL and ADMIN_PASSWORD in environment')
  }

  const authInfo = await executePhase(phases, 'auth', async () => {
    const loginRes = await client.login(options.adminEmail!, options.adminPassword!)
    return { adminUserId: loginRes.adminUserId, authenticated: true }
  })
  preflightData.adminUserId = authInfo.adminUserId

  const slug = generateSafeQaSlug(options.uniqueSuffix)
  ownedIDs.slug = slug

  const preflightResult = await executePhase(phases, 'preflight', async () => {
    const siteRes = await client.request<{ docs?: Array<{ code?: string; id: number }> }>(
      `/api/sites?where[id][equals]=${TARGET_SITE_ID}&limit=1`,
    )
    const site = siteRes.data.docs?.[0]
    if (!site || site.code !== TARGET_SITE_CODE) {
      throw new Error(`Preflight Failed: WingsGo site (${TARGET_SITE_ID}/${TARGET_SITE_CODE}) not found`)
    }

    const mediaRes = await client.request<{ docs?: Array<{ filename?: string; id: number | string; url?: string }> }>(
      `/api/media?limit=10&where[or][0][site][equals]=${TARGET_SITE_ID}&where[or][1][site][exists]=false&draft=false`,
    )

    let verifiedHeroMediaId: number | string | null = null
    for (const candidate of mediaRes.data.docs || []) {
      const rawPath = candidate.url || (candidate.filename ? `/media/${candidate.filename}` : '')
      const relativePath = getMediaUrl(rawPath)
      if (!relativePath || !relativePath.startsWith('/media/')) continue

      const publicMediaUrl = `${EXACT_PUBLIC_BASE_URL}${relativePath}`
      try {
        const probe = await fetcher(publicMediaUrl, { cache: 'no-store' })
        if (probe.body) {
          await probe.body.cancel().catch(() => {})
        }
        if (probe.status === 200) {
          verifiedHeroMediaId = candidate.id
          break
        }
      } catch {
      }
    }

    if (verifiedHeroMediaId == null) {
      throw new Error('Preflight Failed: No unauthenticated public-readable media verified for WingsGo')
    }

    const hubRes = await client.request<{ docs?: Array<{ id: number | string }> }>(
      `/api/pages?where[and][0][site][equals]=${TARGET_SITE_ID}&where[and][1][pathname][equals]=%2Ftour&limit=1`,
    )
    const hub = hubRes.data.docs?.[0]
    if (!hub) {
      throw new Error('Preflight Failed: Tour hub page (/tour) missing on WingsGo site')
    }

    const tourCollision = await client.request<{ docs?: unknown[] }>(
      `/api/tour-products?where[and][0][site][equals]=${TARGET_SITE_ID}&where[and][1][slug][equals]=${slug}&limit=1`,
    )
    if (tourCollision.data.docs?.length) {
      throw new Error(`Preflight Failed: Tour with slug "${slug}" already exists`)
    }

    return {
      adminUserId: authInfo.adminUserId,
      cmsBaseUrl: EXACT_CMS_BASE_URL,
      heroMediaId: verifiedHeroMediaId,
      publicBaseUrl: EXACT_PUBLIC_BASE_URL,
      siteCode: site.code,
      siteId: site.id,
      slug,
      tourHubId: hub.id,
    }
  })
  preflightData = preflightResult
  preflightData.ownerMarker = ownerMarker

  if (options.dryRun) {
    const plan = buildSimulatedLifecyclePlan(options, preflightData)
    return {
      cleanupVerified: true,
      dryRun: true,
      executedAt,
      ok: true,
      ownedIDs,
      phases,
      plan,
      preflight: preflightData,
    }
  }

  let lifecycleError: Error | null = null
  let reconciliationFailed = false

  try {
    const product = await executePhase(phases, 'create', async () => {
      const res = await client.request<{ doc: { id: number | string; site: unknown; slug: string; _status: string } }>(
        '/api/tour-products?locale=vi&draft=true',
        {
          body: JSON.stringify({
            _status: 'draft',
            durationDays: 5,
            durationNights: 4,
            heroMedia: preflightData.heroMediaId,
            itineraryDays: [{ dayNumber: 1, summary: QA_MARKER, title: QA_MARKER }],
            market: 'japan',
            site: TARGET_SITE_ID,
            slug,
            summary: `[${QA_MARKER}] Fixture production lifecycle proof.`,
            title: `[${QA_MARKER}] Tour ${slug} ${ownerMarker}`,
          }),
          method: 'POST',
        },
      )

      ownedIDs.productID = res.data.doc.id
      assertSafeFixtureIdentity(res.data.doc as never)
      return { id: res.data.doc.id, site: TARGET_SITE_ID, slug, status: res.data.doc._status }
    })

    const departure = await executePhase(phases, 'edit', async () => {
      await client.request(`/api/tour-products/${product.id}?locale=vi&draft=true`, {
        body: JSON.stringify({ currency: 'VND', priceFrom: 18900000 }),
        method: 'PATCH',
      })

      const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const depRes = await client.request<{ doc: { id: number | string } }>(
        '/api/tour-departures?locale=vi&draft=true',
        {
          body: JSON.stringify({
            _status: 'draft',
            airline: 'QA Airways',
            availabilityStatus: 'open',
            currency: 'VND',
            departureDate: futureDate,
            expiresAt: '2099-12-31T23:59:59.000Z',
            priceFrom: 18900000,
            site: TARGET_SITE_ID,
            tourProduct: product.id,
            variantKey: ownerMarker,
            verifiedAt: new Date().toISOString(),
          }),
          method: 'POST',
        },
      )

      ownedIDs.departureID = depRes.data.doc.id
      return { departureDate: futureDate, id: depRes.data.doc.id, tourProductId: product.id }
    })

    const provisionState = await executePhase(phases, 'provision', async () => {
      const res = await client.request<{
        wrapper?: { id: number | string; path: string }
      }>(`/api/tour-authoring/${product.id}`, {
        body: JSON.stringify({ action: 'provision', locale: 'vi' }),
        method: 'POST',
      })

      if (!res.data.wrapper?.id) {
        throw new Error('Provisioning failed to return a wrapper page')
      }
      ownedIDs.wrapperID = res.data.wrapper.id
      return { path: res.data.wrapper.path, wrapperId: res.data.wrapper.id }
    })

    await executePhase(phases, 'publish', async () => {
      const stateRes = await client.request<{ canPublish?: boolean; revision?: string }>(
        `/api/tour-authoring/${product.id}?locale=vi`,
      )

      if (!stateRes.data.canPublish || !stateRes.data.revision) {
        throw new Error('Tour authoring state not ready to publish')
      }

      const publishRes = await client.request<{ committed?: boolean; refreshFailed?: boolean }>(
        `/api/tour-authoring/${product.id}`,
        {
          body: JSON.stringify({
            action: 'publish',
            departureIDs: [String(departure.id)],
            locale: 'vi',
            revision: stateRes.data.revision,
          }),
          method: 'POST',
        },
      )

      if (!publishRes.data.committed || publishRes.data.refreshFailed) {
        throw new Error(`Publish failed: committed=${publishRes.data.committed}, refreshFailed=${publishRes.data.refreshFailed}`)
      }

      return { committed: publishRes.data.committed, revision: stateRes.data.revision }
    })

    await executePhase(phases, 'public_read', async () => {
      const publicUrl = `${EXACT_PUBLIC_BASE_URL}/tour/${slug}`
      const publicCheck = await verifyPublicEndpoint(publicUrl, true, fetcher)
      if (!publicCheck.ok) {
        throw new Error(`Public read check failed at ${publicUrl}: HTTP ${publicCheck.status}`)
      }

      if (options.holdSeconds && options.holdSeconds > 0) {
        await new Promise((resolve) => setTimeout(resolve, options.holdSeconds! * 1000))
      }

      return {
        publicEndpointStatus: publicCheck.status,
        publicEndpointVerified: publicCheck.ok,
        publicUrl,
        qaMarkerVerified: publicCheck.markerFound,
      }
    })
  } catch (error) {
    lifecycleError = error instanceof Error ? error : new Error(String(error))
  } finally {
    if (lifecycleError) {
      await executePhase(phases, 'reconcile', async () => {
        await reconcileCmsProof(client, ownedIDs, ownerMarker)
        return { ownerMarker, recoveredIDs: { ...ownedIDs } }
      }).catch(() => {
        reconciliationFailed = true
      })
    }
    await executePhase(phases, 'cleanup', async () => {
      const failures: string[] = []
      const targets = [
        { col: 'tour-departures' as const, id: ownedIDs.departureID },
        { col: 'pages' as const, id: ownedIDs.wrapperID },
        { col: 'tour-products' as const, id: ownedIDs.productID },
      ]
      for (const { col, id } of targets) {
        if (id == null) continue
        try {
          const res = await client.request<{ doc?: Record<string, unknown> } | Record<string, unknown>>(
            `/api/${col}/${id}?locale=vi&draft=true`,
          )
          const doc = 'doc' in res.data ? res.data.doc : res.data
          assertSafeCleanupTarget(col, doc as never, ownedIDs)
          await client.request(`/api/${col}/${id}`, { method: 'DELETE' })
        } catch (e) {
          if ((e as { status?: number }).status !== 404) {
            failures.push(`${col}/${id}: ${e instanceof Error ? e.message : String(e)}`)
          }
        }
      }

      if (failures.length) throw new Error(`Cleanup failed: ${failures.join('; ')}`)

      return { cleanedOwnedIDs: { ...ownedIDs } }
    }).catch((error) => {
      lifecycleError ||= error instanceof Error ? error : new Error(String(error))
    })

    await executePhase(phases, 'cleanup_verify', async () => {
      const checks: Record<string, boolean> = {}
      const targets = [
        { col: 'tour-departures', id: ownedIDs.departureID, key: 'departureDeleted' },
        { col: 'pages', id: ownedIDs.wrapperID, key: 'wrapperDeleted' },
        { col: 'tour-products', id: ownedIDs.productID, key: 'productDeleted' },
      ]

      for (const { col, id, key } of targets) {
        if (id == null) continue
        const res = await client.request(`/api/${col}/${id}?locale=vi&draft=true`).catch((e) => e)
        checks[key] = res?.status === 404
      }

      const postCleanVerify = await verifyPublicEndpoint(
        `${EXACT_PUBLIC_BASE_URL}/tour/${slug}?verify=${Date.now()}`,
        false,
        fetcher,
      )
      checks.publicRouteCleaned = postCleanVerify.ok

      const allDeleted = Object.values(checks).every((v) => v === true)
      if (!allDeleted) {
        throw new Error(`Cleanup verification failed: ${JSON.stringify(checks)}`)
      }
      if (reconciliationFailed) {
        throw new Error('Cleanup cannot be verified because ownership reconciliation failed')
      }

      cleanupVerified = true
      return checks
    }).catch((error) => {
      lifecycleError ||= error instanceof Error ? error : new Error(String(error))
    })
  }

  const isOk = !lifecycleError && cleanupVerified
  return {
    cleanupVerified,
    dryRun: false,
    error: lifecycleError ? lifecycleError.message : undefined,
    executedAt,
    ok: isOk,
    ownedIDs,
    phases,
    preflight: preflightData,
  }
}

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('cms-production-lifecycle-proof.ts')) {
  const options = parseLifecycleArgs(process.argv, process.env)
  runCmsProductionLifecycleProof(options)
    .then(async (result) => {
      const sanitized = sanitizeEvidence(result)
      const formatted = JSON.stringify(sanitized, null, 2)
      console.log(formatted)
      if (options.outputPath) {
        await writeFile(path.resolve(options.outputPath), `${formatted}\n`, 'utf8')
      }
      process.exit(result.ok ? 0 : 1)
    })
    .catch(async (error) => {
      const payload = { error: error instanceof Error ? error.message : String(error), ok: false }
      console.error(JSON.stringify(payload, null, 2))
      if (options.outputPath) {
        await writeFile(path.resolve(options.outputPath), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
      }
      process.exit(1)
    })
}
