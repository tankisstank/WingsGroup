import { createHash } from 'node:crypto'

import { sql } from '@payloadcms/db-postgres'
import type { PayloadRequest } from 'payload'
import { commitTransaction, createLocalReq, killTransaction } from 'payload'

import { contentPublishAccess, hasRole } from '@/access/roles'
import { createLayoutPresetData } from '@/utilities/layoutPresets'

export type AuthoringLocale = 'vi' | 'en'
export type AuthoringIssue = { code: string; severity: 'error' | 'info' | 'warning'; message: string }

type RelationID = number | string
type AnyDoc = Record<string, any> & { id: RelationID }
type PayloadLike = any

export class AuthoringError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = 'bad_request',
  ) {
    super(message)
    this.name = 'AuthoringError'
  }
}

const relationID = (value: unknown): RelationID | null => {
  if (typeof value === 'string' && value.trim()) return value
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (value && typeof value === 'object' && 'id' in value) return relationID((value as any).id)
  return null
}

const sameID = (left: unknown, right: unknown) => {
  const a = relationID(left)
  const b = relationID(right)
  return a !== null && b !== null && String(a) === String(b)
}

const isLocale = (value: unknown): value is AuthoringLocale => value === 'vi' || value === 'en'

const stringValue = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null

const localizedString = (value: unknown, locale: AuthoringLocale): string | null => {
  if (typeof value === 'string') return stringValue(value)
  if (!value || typeof value !== 'object') return null
  return stringValue((value as any)[locale]) || stringValue((value as any).vi) || stringValue((value as any).en)
}

const versionValue = (doc: AnyDoc | null) => ({
  id: doc?.id ?? null,
  status: doc?._status ?? null,
  updatedAt: doc?.updatedAt ?? null,
  version: doc?.version ?? doc?._version ?? null,
})

export const buildAuthoringRevision = ({
  departures,
  locale,
  product,
  wrapper,
}: {
  departures: AnyDoc[]
  locale: AuthoringLocale
  product: AnyDoc
  wrapper: AnyDoc | null
}) =>
  createHash('sha256')
    .update(
      JSON.stringify({
        departures: departures
          .map(versionValue)
          .sort((a, b) => String(a.id).localeCompare(String(b.id))),
        locale,
        product: versionValue(product),
        wrapper: versionValue(wrapper),
      }),
    )
    .digest('hex')

export const parseAuthoringLocale = (value: unknown): AuthoringLocale => {
  if (!isLocale(value)) throw new AuthoringError('Locale phải là vi hoặc en.')
  return value
}

export const parseAuthoringID = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > 160 || /[/?#]/.test(value)) {
    throw new AuthoringError('ID tour không hợp lệ.')
  }
  return value
}

export const parseAuthoringBody = (body: unknown) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AuthoringError('Dữ liệu authoring phải là JSON hợp lệ.')
  }
  const input = body as Record<string, unknown>
  if (input.action !== 'provision' && input.action !== 'publish') {
    throw new AuthoringError('Action phải là provision hoặc publish.')
  }
  const locale = parseAuthoringLocale(input.locale)
  const allowed = new Set(['action', 'locale', 'revision', 'departureIDs'])
  const unknown = Object.keys(input).find((key) => !allowed.has(key))
  if (unknown) throw new AuthoringError(`Trường không được phép: ${unknown}.`)

  if (input.revision !== undefined && (typeof input.revision !== 'string' || input.revision.length !== 64)) {
    throw new AuthoringError('revision không hợp lệ.')
  }

  let departureIDs: string[] | undefined
  if (input.departureIDs !== undefined) {
    if (!Array.isArray(input.departureIDs) || input.departureIDs.some((id) => typeof id !== 'string' && typeof id !== 'number')) {
      throw new AuthoringError('departureIDs phải là một mảng ID.')
    }
    departureIDs = input.departureIDs.map((id) => String(id))
    if (new Set(departureIDs).size !== departureIDs.length) {
      throw new AuthoringError('departureIDs không được trùng.')
    }
  }
  if (input.action === 'publish' && (!departureIDs || departureIDs.length === 0)) {
    throw new AuthoringError('Publish phải chọn ít nhất một departure.')
  }
  return { action: input.action, departureIDs, locale, revision: input.revision as string | undefined }
}

const findOne = async (payload: PayloadLike, req: PayloadRequest, collection: string, id: RelationID) =>
  payload.findByID({
    collection,
    depth: 0,
    draft: true,
    fallbackLocale: false,
    id,
    locale: req.locale || 'vi',
    overrideAccess: false,
    req,
  })

const relationSite = (doc: AnyDoc) => relationID(doc.site)

const loadProductContext = async ({ id, locale, payload, req }: { id: RelationID; locale: AuthoringLocale; payload: PayloadLike; req: PayloadRequest }) => {
  if (!hasRole(req.user as any, ['super-admin', 'site-manager', 'editor'])) {
    throw new AuthoringError('Bạn không có quyền authoring nội dung.', 403, 'forbidden')
  }
  let product: AnyDoc
  try {
    product = (await findOne(payload, { ...req, locale }, 'tour-products', id)) as AnyDoc
  } catch {
    throw new AuthoringError('Không tìm thấy tour trong phạm vi site được phép.', 404, 'not_found')
  }
  const siteID = relationSite(product)
  if (siteID === null) throw new AuthoringError('Tour chưa được gán site.', 409, 'missing_site')
  let site: AnyDoc
  try {
    site = (await findOne(payload, { ...req, locale }, 'sites', siteID)) as AnyDoc
  } catch {
    throw new AuthoringError('Site của tour không nằm trong phạm vi được phép.', 404, 'not_found')
  }
  if (site.code !== 'wings-go') throw new AuthoringError('API này chỉ dành cho WingsGo.', 404, 'not_wingsgo')
  return { product, site, siteID }
}

const loadWrapper = async (payload: PayloadLike, req: PayloadRequest, product: AnyDoc, locale: AuthoringLocale) => {
  const wrapperID = relationID(product.wrapperPage)
  if (wrapperID === null) return null
  try {
    return (await findOne(payload, { ...req, locale }, 'pages', wrapperID)) as AnyDoc
  } catch {
    return null
  }
}

const loadDepartures = async (payload: PayloadLike, req: PayloadRequest, product: AnyDoc, siteID: RelationID) => {
  const result = await payload.find({
    collection: 'tour-departures',
    depth: 0,
    draft: true,
    fallbackLocale: false,
    limit: 1000,
    locale: req.locale || 'vi',
    overrideAccess: false,
    pagination: false,
    req,
    where: { and: [{ site: { equals: siteID } }, { tourProduct: { equals: product.id } }] },
  })
  return result.docs as AnyDoc[]
}

const expectedPath = (product: AnyDoc) => {
  const slug = stringValue(product.slug)
  if (!slug || slug.includes('/') || slug === '.' || slug === '..') return null
  return `/tour/${slug}`
}

const wrapperIsValid = (wrapper: AnyDoc | null, product: AnyDoc, siteID: RelationID) =>
  Boolean(wrapper && sameID(wrapper.site, siteID) && wrapper.pathname === expectedPath(product))

export const authoringIssues = ({
  canPublish,
  departures,
  locale,
  product,
  wrapper,
}: {
  canPublish: boolean
  departures: AnyDoc[]
  locale: AuthoringLocale
  product: AnyDoc
  wrapper: AnyDoc | null
}) => {
  const issues: AuthoringIssue[] = []
  if (!expectedPath(product)) issues.push({ code: 'invalid_slug', severity: 'error', message: 'Tour chưa có slug hợp lệ để tạo đường dẫn.' })
  if (!localizedString(product.title, locale)) issues.push({ code: 'missing_title', severity: 'error', message: `Tour chưa có tiêu đề ${locale.toUpperCase()}.` })
  if (!wrapper) issues.push({ code: 'missing_wrapper', severity: 'warning', message: 'Tour chưa có trang wrapper; hãy provision trước khi publish.' })
  else if (!wrapperIsValid(wrapper, product, relationSite(product) as RelationID)) issues.push({ code: 'invalid_wrapper', severity: 'error', message: 'Wrapper không đúng site hoặc đường dẫn /tour/<slug>.' })
  if (!departures.length) issues.push({ code: 'no_departures', severity: 'warning', message: 'Tour chưa có departure để chọn publish.' })
  if (!canPublish) issues.push({ code: 'editor_cannot_publish', severity: 'info', message: 'Editor chỉ có thể lưu nháp; site manager hoặc super-admin mới được publish.' })
  return issues
}

export const canPublishForUser = (req: PayloadRequest) => contentPublishAccess({ req }) === true

export const buildAuthoringState = async ({ id, locale, payload, req }: { id: RelationID; locale: AuthoringLocale; payload: PayloadLike; req: PayloadRequest }) => {
  const { product, site, siteID } = await loadProductContext({ id, locale, payload, req })
  const wrapper = await loadWrapper(payload, req, product, locale)
  const departures = await loadDepartures(payload, { ...req, locale }, product, siteID)
  const canPublish = canPublishForUser(req)
  const issues = authoringIssues({ canPublish, departures, locale, product, wrapper })
  const hasPublishPrerequisites = Boolean(wrapper && departures.length)
  return {
    product: { id: product.id, updatedAt: product.updatedAt, status: product._status || 'draft', site: site.id },
    wrapper: wrapper && wrapperIsValid(wrapper, product, siteID)
      ? { id: wrapper.id, status: wrapper._status || 'draft', path: wrapper.pathname }
      : null,
    departures: departures.map((departure) => ({ id: departure.id, updatedAt: departure.updatedAt, status: departure._status || 'draft' })),
    issues,
    canPublish: canPublish && hasPublishPrerequisites && !issues.some((issue) => issue.severity === 'error'),
    revision: buildAuthoringRevision({ departures, locale, product, wrapper }),
    _private: { departures, product, site, siteID, wrapper },
  }
}

const isPostgres = (payload: PayloadLike) =>
  typeof payload.db?.beginTransaction === 'function' && String(payload.db.packageName || '').includes('db-postgres')

const startPostgresTransaction = async (payload: PayloadLike, req: PayloadRequest, key: string) => {
  if (!isPostgres(payload)) throw new AuthoringError('Authoring mutation requires PostgreSQL transactions.', 503, 'postgres_required')
  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) throw new AuthoringError('PostgreSQL transaction is unavailable; retry after database recovery.', 503, 'transaction_unavailable')
  req.transactionID = transactionID
  const session = payload.db.sessions?.[transactionID]
  if (!session?.db || typeof payload.db.execute !== 'function') {
    await killTransaction(req)
    throw new AuthoringError('PostgreSQL transaction adapter is incomplete.', 503, 'transaction_unavailable')
  }
  try {
    await payload.db.execute({ db: session.db, sql: sql`SELECT pg_advisory_xact_lock(hashtext(${key}))` })
  } catch {
    await killTransaction(req)
    throw new AuthoringError('Không thể khóa transaction PostgreSQL; vui lòng thử lại.', 503, 'transaction_unavailable')
  }
}

const finishTransaction = async (req: PayloadRequest, commit: boolean) => {
  if (!req.transactionID) return
  if (commit) await commitTransaction(req)
  else await killTransaction(req)
}

export const provisionAuthoring = async ({ id, locale, payload, req }: { id: RelationID; locale: AuthoringLocale; payload: PayloadLike; req: PayloadRequest }) => {
  const initial = await loadProductContext({ id, locale, payload, req })
  const path = expectedPath(initial.product)
  if (!path) throw new AuthoringError('Tour chưa có slug hợp lệ để provision.', 422, 'invalid_slug')
  if (!localizedString(initial.product.title, locale)) throw new AuthoringError(`Tour chưa có tiêu đề ${locale.toUpperCase()}.`, 422, 'missing_title')

  await startPostgresTransaction(payload, req, `wingsgo:${initial.siteID}:${path}`)
  try {
    const current = await loadProductContext({ id, locale, payload, req })
    if (current.siteID !== initial.siteID || expectedPath(current.product) !== path) {
      throw new AuthoringError('Tour đã đổi site hoặc đường dẫn trong lúc provision; tải lại rồi thử lại.', 409, 'stale_scope')
    }
    const currentWrapper = await loadWrapper(payload, req, current.product, locale)
    let wrapper: AnyDoc | null = null

    if (relationID(current.product.wrapperPage) !== null) {
      if (!wrapperIsValid(currentWrapper, current.product, current.siteID)) {
        throw new AuthoringError('Tour đang liên kết wrapper không hợp lệ; không tự sửa nội dung hiện có.', 409, 'invalid_wrapper')
      }
      wrapper = currentWrapper
    } else {
      const occupied = await payload.find({
        collection: 'pages',
        depth: 0,
        draft: true,
        limit: 2,
        locale,
        overrideAccess: false,
        pagination: false,
        req,
        where: { and: [{ pathname: { equals: path } }, { site: { equals: current.siteID } }] },
      })
      if (occupied.docs.length) throw new AuthoringError('Đường dẫn /tour/<slug> đã có page không được liên kết; không tự nhận hoặc ghi đè.', 409, 'path_occupied')
      const tourHub = await findTourHub(payload, req, current.siteID)
      if (!tourHub) throw new AuthoringError('WingsGo cần page /tour hiện có trước khi provision wrapper.', 409, 'tour_hub_required')
      const title = localizedString(current.product.title, locale)!
      const summary = localizedString(current.product.summary, locale) || title
      wrapper = (await payload.create({
        collection: 'pages',
        context: { disableRevalidate: true, wingsGoAuthoring: true },
        data: {
          _status: 'draft',
          layoutPresetKey: 'tour-conversion',
          meta: { description: summary, title },
          parentPage: tourHub.id,
          site: current.siteID,
          slug: current.product.slug,
          title,
          ...createLayoutPresetData('tour-conversion', { summary, title }),
        },
        locale,
        overrideAccess: false,
        req,
      })) as AnyDoc
    }

    if (!wrapper) throw new AuthoringError('Không tạo được wrapper tour.', 500, 'wrapper_create_failed')
    await payload.update({
      collection: 'tour-products',
      context: { disableRevalidate: true, wingsGoAuthoring: true },
      data: { wrapperPage: wrapper.id },
      id: current.product.id,
      locale,
      overrideAccess: false,
      req,
    })
    await finishTransaction(req, true)
    const responseReq = await createAuthoringRequest(payload, req.user, locale)
    return buildAuthoringState({ id, locale, payload, req: responseReq })
  } catch (error) {
    await finishTransaction(req, false)
    throw error
  }
}

const findTourHub = async (payload: PayloadLike, req: PayloadRequest, siteID: RelationID) => {
  const result = await payload.find({
    collection: 'pages',
    depth: 0,
    draft: true,
    limit: 2,
    locale: req.locale || 'vi',
    overrideAccess: false,
    pagination: false,
    req,
    where: { and: [{ pathname: { equals: '/tour' } }, { site: { equals: siteID } }] },
  })
  return result.docs[0] as AnyDoc | undefined
}

export const publishAuthoring = async ({ id, locale, payload, req, revision, departureIDs }: { id: RelationID; locale: AuthoringLocale; payload: PayloadLike; req: PayloadRequest; revision?: string; departureIDs: string[] }) => {
  if (!canPublishForUser(req)) throw new AuthoringError('Bạn không có quyền publish; Editor chỉ có thể lưu nháp.', 403, 'forbidden')
  if (!revision) throw new AuthoringError('Publish cần revision hiện tại để tránh ghi đè cập nhật mới.', 428, 'revision_required')
  const initial = await loadProductContext({ id, locale, payload, req })
  const path = expectedPath(initial.product)
  if (!path) throw new AuthoringError('Tour chưa có slug hợp lệ.', 422, 'invalid_slug')
  await startPostgresTransaction(payload, req, `wingsgo:${initial.siteID}:${path}`)
  let previousProduct: AnyDoc
  let publishedProduct: AnyDoc
  try {
    const state = await buildAuthoringState({ id, locale, payload, req })
    if (state.revision !== revision) throw new AuthoringError('Dữ liệu tour đã thay đổi; tải lại trước khi publish.', 409, 'stale_revision')
    const privateState = state._private
    if (privateState.siteID !== initial.siteID || expectedPath(privateState.product) !== path) {
      throw new AuthoringError('Tour đã đổi site hoặc đường dẫn trong lúc publish; tải lại rồi thử lại.', 409, 'stale_scope')
    }
    if (!privateState.wrapper || !wrapperIsValid(privateState.wrapper, privateState.product, privateState.siteID)) throw new AuthoringError('Tour cần wrapper hợp lệ trước khi publish.', 409, 'wrapper_required')
    const selected = privateState.departures.filter((departure: AnyDoc) => departureIDs.includes(String(departure.id)))
    if (selected.length !== departureIDs.length) throw new AuthoringError('Có departure không thuộc tour/site hoặc không còn quyền truy cập.', 409, 'departure_scope')
    previousProduct = privateState.product

    await payload.update({ collection: 'pages', context: { disableRevalidate: true, wingsGoAuthoring: true }, data: { _status: 'published', publishedAt: new Date().toISOString() }, draft: true, id: privateState.wrapper.id, locale, overrideAccess: false, req })
    publishedProduct = (await payload.update({ collection: 'tour-products', context: { disableRevalidate: true, wingsGoAuthoring: true }, data: { _status: 'published' }, draft: true, id: privateState.product.id, locale, overrideAccess: false, req })) as AnyDoc
    for (const departure of selected) {
      await payload.update({ collection: 'tour-departures', context: { disableRevalidate: true, wingsGoAuthoring: true }, data: { _status: 'published' }, draft: true, id: departure.id, locale, overrideAccess: false, req })
    }
    await finishTransaction(req, true)
  } catch (error) {
    await finishTransaction(req, false)
    throw error
  }

  let refreshFailed = false
  try {
    const { revalidateTourProduct } = await import('@/collections/Tours/hooks/revalidateTourContent')
    await revalidateTourProduct({ doc: publishedProduct, previousDoc: previousProduct, req: { payload, context: {} } } as never)
  } catch {
    refreshFailed = true
  }
  const responseReq = await createAuthoringRequest(payload, req.user, locale)
  const result = await buildAuthoringState({ id, locale, payload, req: responseReq })
  return { ...result, committed: true, refreshFailed, refreshRetry: refreshFailed ? 'GET' : null }
}

export const createAuthoringRequest = async (payload: PayloadLike, user: unknown, locale: AuthoringLocale) => {
  const req = await createLocalReq({ user: user as any, locale }, payload)
  return req as PayloadRequest
}
