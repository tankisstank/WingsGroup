import crypto from 'node:crypto'

export const QA_MARKER = 'QA ONLY / KHÔNG ĐẶT TOUR'
export const SLUG_PREFIX = 'cms-qa-20261022-'
export const TARGET_SITE_ID = 2
export const TARGET_SITE_CODE = 'wings-go'
export const EXACT_CMS_BASE_URL = 'https://wingsgroup.vn'
export const EXACT_PUBLIC_BASE_URL = 'https://wingsgo.vn'
export const ENV_CONFIRM_LIFECYCLE = 'CONFIRM_CMS_PRODUCTION_LIFECYCLE'
export const ENV_RUN_MUTATION = 'RUN_CMS_PRODUCTION_MUTATION'

export type HttpFetcher = typeof fetch

export type CmsLifecycleProofOptions = {
  adminEmail?: string
  adminPassword?: string
  cmsBaseUrl: string
  dryRun: boolean
  holdSeconds?: number
  locale: 'vi' | 'en'
  outputPath?: string
  publicBaseUrl: string
  uniqueSuffix?: string
}

export type OwnedFixtureIDs = {
  departureID: number | string | null
  productID: number | string | null
  siteID: number
  slug: string | null
  wrapperID: number | string | null
}

export type CmsLifecyclePhaseEvidence = {
  details?: Record<string, unknown>
  durationMs?: number
  error?: string
  finishedAt?: string
  phase:
    | 'auth'
    | 'preflight'
    | 'create'
    | 'edit'
    | 'provision'
    | 'publish'
    | 'public_read'
    | 'cleanup'
    | 'reconcile'
    | 'cleanup_verify'
  startedAt: string
  status: 'pending' | 'success' | 'failed' | 'skipped'
}

export type SimulatedPlanStep = {
  action: string
  description: string
  endpoint: string
  method: string
  order: number
  readOnly: boolean
}

export type CmsLifecycleProofResult = {
  cleanupVerified: boolean
  dryRun: boolean
  error?: string
  executedAt: string
  ok: boolean
  ownedIDs: OwnedFixtureIDs
  phases: CmsLifecyclePhaseEvidence[]
  plan?: SimulatedPlanStep[]
  preflight: Record<string, unknown>
}

export const generateSafeQaSlug = (uniqueSuffix?: string): string => {
  const sanitizedSuffix = (uniqueSuffix || crypto.randomBytes(4).toString('hex'))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 16)

  if (!sanitizedSuffix) {
    throw new Error('uniqueSuffix must contain at least one alphanumeric character')
  }

  const slug = `${SLUG_PREFIX}${sanitizedSuffix}`
  if (!slug.startsWith(SLUG_PREFIX)) {
    throw new Error(`Generated slug does not start with required prefix ${SLUG_PREFIX}`)
  }

  return slug
}

const extractStringField = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return String(obj.vi || obj.en || '')
  }
  return ''
}

export const assertSafeFixtureIdentity = (product: {
  site?: unknown
  slug?: unknown
  summary?: unknown
  title?: unknown
}): void => {
  const siteId = typeof product.site === 'object' && product.site && 'id' in product.site
    ? (product.site as { id: unknown }).id
    : product.site

  if (Number(siteId) !== TARGET_SITE_ID) {
    throw new Error(
      `Safety Violation: Fixture site must be WingsGo (site ${TARGET_SITE_ID}), got ${String(siteId)}`,
    )
  }

  const slug = String(product.slug || '')
  if (!slug.startsWith(SLUG_PREFIX)) {
    throw new Error(
      `Safety Violation: Fixture slug must start with ${SLUG_PREFIX}, got "${slug}"`,
    )
  }

  const title = extractStringField(product.title)
  const summary = extractStringField(product.summary)
  if (!title.includes(QA_MARKER) && !summary.includes(QA_MARKER)) {
    throw new Error(
      `Safety Violation: Fixture title or summary must explicitly include "${QA_MARKER}"`,
    )
  }
}

export const assertSafeCleanupTarget = (
  collection: 'tour-products' | 'tour-departures' | 'pages',
  doc: {
    id?: unknown
    pathname?: unknown
    site?: unknown
    slug?: unknown
    title?: unknown
    tourProduct?: unknown
  },
  owned: OwnedFixtureIDs,
): void => {
  if (!doc || doc.id == null) {
    throw new Error(`Safety Violation: Cannot clean up null or ID-less document in ${collection}`)
  }

  const docId = String(doc.id)
  const siteId = typeof doc.site === 'object' && doc.site && 'id' in doc.site
    ? (doc.site as { id: unknown }).id
    : doc.site

  if (Number(siteId) !== TARGET_SITE_ID) {
    throw new Error(
      `Safety Violation: Refusing to clean up ${collection} ID ${docId} on foreign site ${String(siteId)}`,
    )
  }

  if (collection === 'tour-products') {
    if (docId !== String(owned.productID)) {
      throw new Error(
        `Safety Violation: Refusing to delete tour-product ID ${docId}; does not match owned fixture ID ${String(owned.productID)}`,
      )
    }
    const slug = String(doc.slug || '')
    if (!slug.startsWith(SLUG_PREFIX) || slug !== owned.slug) {
      throw new Error(
        `Safety Violation: Refusing to delete tour-product with unowned slug "${slug}"`,
      )
    }
    const title = extractStringField(doc.title)
    if (!title.includes(QA_MARKER)) {
      throw new Error(
        `Safety Violation: Refusing to delete tour-product lacking QA marker "${QA_MARKER}"`,
      )
    }
  } else if (collection === 'tour-departures') {
    if (docId !== String(owned.departureID)) {
      throw new Error(
        `Safety Violation: Refusing to delete tour-departure ID ${docId}; does not match owned departure ID ${String(owned.departureID)}`,
      )
    }
    const tourProductRel = typeof doc.tourProduct === 'object' && doc.tourProduct && 'id' in doc.tourProduct
      ? (doc.tourProduct as { id: unknown }).id
      : doc.tourProduct
    if (String(tourProductRel) !== String(owned.productID)) {
      throw new Error(
        `Safety Violation: Refusing to delete departure not referencing owned tour-product ID ${String(owned.productID)}`,
      )
    }
  } else if (collection === 'pages') {
    if (docId !== String(owned.wrapperID)) {
      throw new Error(
        `Safety Violation: Refusing to delete page ID ${docId}; does not match owned wrapper ID ${String(owned.wrapperID)}`,
      )
    }
    const expectedPath = `/tour/${owned.slug}`
    if (doc.pathname !== expectedPath) {
      throw new Error(
        `Safety Violation: Refusing to delete page with pathname "${String(doc.pathname)}"; expected "${expectedPath}"`,
      )
    }
  }
}

export const parseLifecycleArgs = (
  argv: string[],
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): CmsLifecycleProofOptions => {
  // Anti-exfiltration: strict domain lock down
  if (env.CMS_BASE_URL && env.CMS_BASE_URL.trim() !== EXACT_CMS_BASE_URL) {
    throw new Error(`Security Violation: CMS_BASE_URL must be exact ${EXACT_CMS_BASE_URL}`)
  }
  if (env.PUBLIC_BASE_URL && env.PUBLIC_BASE_URL.trim() !== EXACT_PUBLIC_BASE_URL) {
    throw new Error(`Security Violation: PUBLIC_BASE_URL must be exact ${EXACT_PUBLIC_BASE_URL}`)
  }

  const isExplicitLive = argv.includes('--live')
  const confirmLifecycleEnv = env[ENV_CONFIRM_LIFECYCLE] === 'true'
  const runMutationEnv = env[ENV_RUN_MUTATION] === 'true'

  // Default to dry-run unless ALL confirmation criteria are satisfied
  const liveConfirmed = isExplicitLive && confirmLifecycleEnv && runMutationEnv
  const dryRun = !liveConfirmed

  const adminEmail = (env.ADMIN_EMAIL || env.CMS_PROOF_ADMIN_EMAIL)?.trim() || undefined
  const adminPassword = (env.ADMIN_PASSWORD || env.CMS_PROOF_ADMIN_PASSWORD)?.trim() || undefined

  const outputArg = argv.find((arg) => arg.startsWith('--output='))
  const outputPath = outputArg ? outputArg.slice('--output='.length).trim() : undefined

  const suffixArg = argv.find((arg) => arg.startsWith('--suffix='))
  const uniqueSuffix = suffixArg ? suffixArg.slice('--suffix='.length).trim() : undefined

  const holdArg = argv.find((arg) => arg.startsWith('--hold='))
  const rawHold = holdArg ? holdArg.slice('--hold='.length).trim() : env.CMS_PROOF_HOLD_SECONDS
  const parsedHold = rawHold ? Number(rawHold) : 0
  const holdSeconds = Number.isFinite(parsedHold) ? Math.min(60, Math.max(0, parsedHold)) : 0

  return {
    adminEmail,
    adminPassword,
    cmsBaseUrl: EXACT_CMS_BASE_URL,
    dryRun,
    holdSeconds,
    locale: 'vi',
    outputPath,
    publicBaseUrl: EXACT_PUBLIC_BASE_URL,
    uniqueSuffix,
  }
}

export const buildSimulatedLifecyclePlan = (
  options: CmsLifecycleProofOptions,
  preflight: Record<string, unknown>,
): SimulatedPlanStep[] => {
  const slug = `${SLUG_PREFIX}${options.uniqueSuffix || '<unique-suffix>'}`
  const cms = options.cmsBaseUrl
  const pub = options.publicBaseUrl

  return [
    {
      action: 'AUTH_LOGIN',
      description: `Authenticate as superadmin using ADMIN_EMAIL and ADMIN_PASSWORD (never logged) to obtain token`,
      endpoint: `${cms}/api/users/login`,
      method: 'POST',
      order: 1,
      readOnly: true,
    },
    {
      action: 'PREFLIGHT_DISCOVERY',
      description: `Verify WingsGo site (id ${TARGET_SITE_ID}), unauth-verified public media, and /tour hub page via CMS HTTP APIs`,
      endpoint: `${cms}/api/sites, ${cms}/api/media, ${cms}/api/pages`,
      method: 'GET',
      order: 2,
      readOnly: true,
    },
    {
      action: 'CREATE_FIXTURE_TOUR',
      description: `Create draft tour product with slug ${slug}, WingsGo site ${TARGET_SITE_ID}, marker "${QA_MARKER}", and media id ${String(preflight.heroMediaId ?? '<id>')}`,
      endpoint: `${cms}/api/tour-products?locale=vi&draft=true`,
      method: 'POST',
      order: 3,
      readOnly: false,
    },
    {
      action: 'EDIT_TOUR_AND_CREATE_DEPARTURE',
      description: `Patch tour price and create draft future departure with verified price/availability window and marker`,
      endpoint: `${cms}/api/tour-products/:id?locale=vi&draft=true, ${cms}/api/tour-departures?locale=vi&draft=true`,
      method: 'PATCH, POST',
      order: 4,
      readOnly: false,
    },
    {
      action: 'PROVISION_WRAPPER_PAGE',
      description: `Call authoring provision route to create wrapper page at /tour/${slug} under tour hub`,
      endpoint: `${cms}/api/tour-authoring/:id`,
      method: 'POST',
      order: 5,
      readOnly: false,
    },
    {
      action: 'PUBLISH_LIFECYCLE',
      description: `Call authoring publish route to publish product, departure, and wrapper page with cache invalidation`,
      endpoint: `${cms}/api/tour-authoring/:id`,
      method: 'POST',
      order: 6,
      readOnly: false,
    },
    {
      action: 'PUBLIC_READ_EVIDENCE',
      description: `Fetch public website ${pub}/tour/${slug} with no-cache, verify HTTP 200 and "${QA_MARKER}"`,
      endpoint: `${pub}/tour/${slug}`,
      method: 'GET',
      order: 7,
      readOnly: true,
    },
    {
      action: 'FINALLY_CLEANUP_AND_VERIFY',
      description: `Delete owned departure, wrapper, and product via CMS DELETE APIs; verify HTTP 404 on ${pub}/tour/${slug}`,
      endpoint: `${cms}/api/* (DELETE), ${pub}/tour/${slug} (GET 404)`,
      method: 'DELETE, GET',
      order: 8,
      readOnly: false,
    },
  ]
}

const REDACTED_KEYS = new Set([
  'adminpassword',
  'authorization',
  'cookie',
  'database_url',
  'password',
  'payload_secret',
  'secret',
  'token',
])

export const sanitizeEvidence = <T extends Record<string, unknown>>(data: T): T => {
  const sanitize = (val: unknown): unknown => {
    if (val === null || val === undefined) return val
    if (typeof val === 'string') {
      if (val.includes('postgres://') || val.includes('postgresql://')) {
        return val.replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/g, '$1***$3')
      }
      return val
    }
    if (Array.isArray(val)) {
      return val.map(sanitize)
    }
    if (typeof val === 'object') {
      const sanitizedObj: Record<string, unknown> = {}
      for (const [key, v] of Object.entries(val as Record<string, unknown>)) {
        if (REDACTED_KEYS.has(key.toLowerCase())) {
          sanitizedObj[key] = '***REDACTED***'
        } else {
          sanitizedObj[key] = sanitize(v)
        }
      }
      return sanitizedObj
    }
    return val
  }

  return sanitize(data) as T
}

export const executePhase = async <T>(
  phases: CmsLifecyclePhaseEvidence[],
  phaseName: CmsLifecyclePhaseEvidence['phase'],
  action: () => Promise<T>,
): Promise<T> => {
  const startedAt = new Date().toISOString()
  const startMs = Date.now()
  const evidence: CmsLifecyclePhaseEvidence = {
    phase: phaseName,
    startedAt,
    status: 'pending',
  }
  phases.push(evidence)

  try {
    const result = await action()
    evidence.status = 'success'
    evidence.finishedAt = new Date().toISOString()
    evidence.durationMs = Date.now() - startMs
    if (result && typeof result === 'object') {
      evidence.details = result as Record<string, unknown>
    }
    return result
  } catch (error) {
    evidence.status = 'failed'
    evidence.finishedAt = new Date().toISOString()
    evidence.durationMs = Date.now() - startMs
    evidence.error = error instanceof Error ? error.message : String(error)
    throw error
  }
}

export const verifyPublicEndpoint = async (
  url: string,
  expectMarker: boolean,
  fetcher: HttpFetcher = fetch,
): Promise<{ markerFound: boolean; ok: boolean; status: number }> => {
  const res = await fetcher(url, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-store' },
  })
  const text = await res.text()
  const markerFound = text.includes(QA_MARKER)
  // When verifying deletion, strictly require HTTP 404 (never accept 500 or other errors)
  const ok = expectMarker
    ? res.status === 200 && markerFound
    : res.status === 404 && !markerFound

  return { markerFound, ok, status: res.status }
}
