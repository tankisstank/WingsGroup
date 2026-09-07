import { parseArgs, selectedSourceIDs } from './lib/doicanhviet'

export const DOICANHVIET_SITE_CODE = 'wings-go'

export type LifecycleOperation = 'clean' | 'contact-only' | 'delete' | 'publish' | 'rollback'

export type LifecyclePlan = {
  adminEmail: string | null
  apply: boolean
  args: Record<string, string | boolean>
  batchId: string | null
  only: Set<string>
  operation: LifecycleOperation
  siteCode: string
}

const textArg = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const sortValues = (values: Iterable<string>) =>
  [...new Set(values)].sort((left, right) => left.localeCompare(right, 'en', { numeric: true }))

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right, 'en'))
      .map(([key, item]) => [key, stableValue(item)]),
  )
}

export const stableJSONStringify = (value: unknown) => JSON.stringify(stableValue(value), null, 2)

export const printLifecycleJSON = (value: unknown) => console.log(stableJSONStringify(value))

export const lifecycleErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

export const printLifecycleError = (error: unknown) =>
  console.error(stableJSONStringify({ error: lifecycleErrorMessage(error) }))

export const sourceSelection = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error('--only requires source IDs')

  const selected = selectedSourceIDs(value)
  if (selected.size === 0) throw new Error('--only requires source IDs')

  return new Set(
    [...selected].map((item) => (item.toUpperCase().startsWith('DCV-') ? item.slice(4) : item)),
  )
}

export const sourceIDsFromPlan = (plan: Pick<LifecyclePlan, 'only'>) => sortValues(plan.only)

export const tourCodesFromSourceIDs = (sourceIDs: Iterable<string>) =>
  sortValues(sourceIDs).map((sourceId) => `DCV-${sourceId}`)

export const mediaFilenamePrefixesFromSourceIDs = (sourceIDs: Iterable<string>) =>
  sortValues(sourceIDs).map((sourceId) => `dcv-${sourceId}-`)

export const createLifecyclePlan = (
  argv: string[],
  operation: LifecycleOperation,
): LifecyclePlan => {
  const args = parseArgs(argv)
  const apply = args.apply === true
  const suppliedSiteCode = args['site-code']
  const siteCode = textArg(suppliedSiteCode) || DOICANHVIET_SITE_CODE

  if (suppliedSiteCode !== undefined && typeof suppliedSiteCode !== 'string') {
    throw new Error('--site-code requires a value')
  }
  if (suppliedSiteCode !== undefined && siteCode !== DOICANHVIET_SITE_CODE) {
    throw new Error(
      `--site-code must be ${DOICANHVIET_SITE_CODE}; received ${JSON.stringify(suppliedSiteCode)}`,
    )
  }
  if (apply && siteCode !== DOICANHVIET_SITE_CODE) {
    throw new Error(`Apply requires --site-code ${DOICANHVIET_SITE_CODE}`)
  }
  if (apply && suppliedSiteCode === undefined) {
    throw new Error(`Apply requires explicit --site-code ${DOICANHVIET_SITE_CODE}`)
  }

  const batchId =
    typeof args['batch-id'] === 'string' && args['batch-id'].trim() ? args['batch-id'].trim() : null
  if (operation === 'rollback' && args['batch-id'] === true) {
    throw new Error('--batch-id requires a value')
  }

  const only = args.only === undefined ? new Set<string>() : sourceSelection(args.only)
  if (apply && operation !== 'rollback' && only.size === 0) {
    throw new Error('Apply requires explicit --only source IDs')
  }
  if ((operation === 'rollback' || operation === 'publish' || operation === 'contact-only') && apply && !batchId) {
    throw new Error(`${operation} apply requires --batch-id`)
  }

  const adminEmail = textArg(args['admin-email']) || null
  if (apply && !adminEmail) throw new Error('Apply requires explicit --admin-email')
  if (apply && args['admin-email'] === true) throw new Error('--admin-email requires a value')

  return { adminEmail, apply, args, batchId, only, operation, siteCode }
}

export const relationID = (value: unknown): number | string | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') {
    const id = (value as { id?: number | string }).id
    return id === undefined || id === null ? null : id
  }
  return typeof value === 'number' || typeof value === 'string' ? value : null
}

export const sameID = (left: unknown, right: unknown) => {
  const leftID = relationID(left)
  const rightID = relationID(right)
  return leftID !== null && rightID !== null && String(leftID) === String(rightID)
}

export const initializePayloadForApply = async () => {
  const [{ createLocalReq, getPayload }, { default: config }] = await Promise.all([
    import('payload'),
    import('../src/payload.config'),
  ])
  const payload = await getPayload({ config })
  return { createLocalReq, payload }
}

export const resolveSuperAdmin = async (payload: any, email: string) => {
  const result = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 2,
    pagination: false,
    overrideAccess: true,
    where: { email: { equals: email } },
  })
  const user = result.docs[0]
  if (!user) throw new Error(`Admin user not found: ${email}`)
  if (user.role !== 'super-admin') throw new Error(`Admin user ${email} must have role super-admin`)
  return user
}

export const resolveWingsGoSite = async (payload: any, req?: any) => {
  const result = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 2,
    pagination: false,
    overrideAccess: true,
    req,
    where: { code: { equals: DOICANHVIET_SITE_CODE } },
  })
  if (result.docs.length !== 1) {
    throw new Error(
      `Expected exactly one target site (${DOICANHVIET_SITE_CODE}), found ${result.docs.length}`,
    )
  }
  return result.docs[0]
}

export const applySelection = (plan: Pick<LifecyclePlan, 'only'>) => ({
  sourceIds: sourceIDsFromPlan(plan),
  tourCodes: tourCodesFromSourceIDs(plan.only),
})
