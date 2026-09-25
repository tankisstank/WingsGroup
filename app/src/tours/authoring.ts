import { createHash } from 'node:crypto'

import { sql } from '@payloadcms/db-postgres'
import { Forbidden, ValidationError, type PayloadRequest } from 'payload'
import { commitTransaction, createLocalReq, killTransaction } from 'payload'
import { revalidateTag } from 'next/cache.js'

import { contentPublishAccess, hasRole } from '@/access/roles'
import { createLayoutPresetData } from '@/utilities/layoutPresets'

export type AuthoringLocale = 'vi' | 'en'
export type AuthoringIssue = { code: string; severity: 'error' | 'info' | 'warning'; message: string }
export type WrapperHealth = 'valid' | 'invalid_path' | 'invalid_site' | 'orphan' | 'shared'

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

const wrapperValidationLabels: Record<string, string> = {
  hero: 'nội dung mở đầu',
  layout: 'bố cục nội dung',
  meta: 'thông tin SEO',
  parentPage: 'trang cha',
  pathname: 'đường dẫn',
  site: 'site',
  slug: 'đường dẫn',
  title: 'tiêu đề',
}

export const normalizeAuthoringError = (error: unknown): unknown => {
  if (error instanceof ValidationError) {
    const fields = [...new Set(error.data?.errors?.map(({ path }) => path.split('.')[0]) || [])]
      .map((path) => wrapperValidationLabels[path] || 'nội dung trang')
    const fieldSummary = fields.length ? ` Kiểm tra: ${fields.join(', ')}.` : ''
    return new AuthoringError(
      `Không thể tạo trang tour vì dữ liệu chưa hợp lệ.${fieldSummary}`,
      422,
      'wrapper_validation_failed',
    )
  }

  if (error instanceof Forbidden) {
    return new AuthoringError(
      'Bạn không có quyền tạo trang tour trong site này; hãy nhờ quản trị viên kiểm tra phân quyền.',
      403,
      'wrapper_forbidden',
    )
  }

  return error
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

export const hasHeroMedia = (product: AnyDoc): boolean =>
  relationID(product.heroMedia) !== null ||
  (Array.isArray(product.gallery) && product.gallery.some((item) => relationID(item) !== null))

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
  if (input.action !== 'provision' && input.action !== 'relink' && input.action !== 'publish') {
    throw new AuthoringError('Action phải là provision, relink hoặc publish.')
  }
  const locale = parseAuthoringLocale(input.locale)
  const allowed = new Set(['action', 'locale', 'revision', 'departureIDs', 'wrapperID'])
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
  let wrapperID: RelationID | undefined
  if (input.wrapperID !== undefined) {
    const parsedWrapperID = relationID(input.wrapperID)
    if (parsedWrapperID === null) throw new AuthoringError('wrapperID không hợp lệ.')
    wrapperID = parsedWrapperID
  }
  if (input.action === 'relink' && wrapperID === undefined) {
    throw new AuthoringError('Relink cần wrapperID.')
  }
  return { action: input.action, departureIDs, locale, revision: input.revision as string | undefined, wrapperID }
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

export const getExpectedTourPath = (product: AnyDoc) => expectedPath(product)

const wrapperIsValid = (wrapper: AnyDoc | null, product: AnyDoc, siteID: RelationID) =>
  Boolean(wrapper && sameID(wrapper.site, siteID) && wrapper.pathname === expectedPath(product))

export const getWrapperHealth = ({ linkedProductIDs, product, siteID, wrapper }: { linkedProductIDs: RelationID[]; product: AnyDoc; siteID: RelationID; wrapper: AnyDoc | null }): WrapperHealth | null => {
  if (!wrapper) return null
  if (!sameID(wrapper.site, siteID)) return 'invalid_site'
  if (wrapper.pathname !== expectedPath(product)) return 'invalid_path'
  if (linkedProductIDs.length === 0) return 'orphan'
  if (linkedProductIDs.length > 1) return 'shared'
  return 'valid'
}

export const authoringIssues = ({
  canPublish,
  departures,
  locale,
  product,
  wrapper,
  wrapperHealth,
}: {
  canPublish: boolean
  departures: AnyDoc[]
  locale: AuthoringLocale
  product: AnyDoc
  wrapper: AnyDoc | null
  wrapperHealth?: WrapperHealth | null
}) => {
  const issues: AuthoringIssue[] = []
  if (!expectedPath(product)) issues.push({ code: 'invalid_slug', severity: 'error', message: 'Tour chưa có slug hợp lệ để tạo đường dẫn.' })
  if (!localizedString(product.title, locale)) issues.push({ code: 'missing_title', severity: 'error', message: `Tour chưa có tiêu đề ${locale.toUpperCase()}.` })
  if (!hasHeroMedia(product)) issues.push({ code: 'missing_hero_media', severity: 'error', message: 'Tour chưa có ảnh hero public. Nhập ảnh tại trường Hero media hoặc Gallery trong TourProduct, không nhập ở Wrapper Page.' })
  if (!wrapper) issues.push({ code: 'missing_wrapper', severity: 'warning', message: 'Tour chưa có trang wrapper; hãy provision trước khi publish.' })
  else if (wrapperHealth === 'shared') issues.push({ code: 'shared_wrapper', severity: 'error', message: 'Wrapper đang được nhiều tour dùng chung; hãy gán một wrapper riêng trước khi publish.' })
  else if (wrapperHealth === 'orphan') issues.push({ code: 'orphan_wrapper', severity: 'error', message: 'Wrapper chưa được liên kết với TourProduct; hãy gán lại wrapper trước khi publish.' })
  else if (wrapperHealth === 'invalid_site') issues.push({ code: 'invalid_wrapper_site', severity: 'error', message: 'Wrapper thuộc site khác; hãy gán một wrapper trong cùng site.' })
  else if (wrapperHealth === 'invalid_path' || !wrapperIsValid(wrapper, product, relationSite(product) as RelationID)) issues.push({ code: 'invalid_wrapper', severity: 'error', message: 'Wrapper không đúng đường dẫn dự kiến /tour/<slug>.' })
  if (!departures.length) issues.push({ code: 'no_departures', severity: 'warning', message: 'Tour chưa có departure để chọn publish.' })
  if (!canPublish) issues.push({ code: 'editor_cannot_publish', severity: 'info', message: 'Editor chỉ có thể lưu nháp; site manager hoặc super-admin mới được publish.' })
  return issues
}

export const canPublishForUser = (req: PayloadRequest) => contentPublishAccess({ req }) === true

const loadLinkedProductIDs = async (payload: PayloadLike, req: PayloadRequest, wrapperID: RelationID) => {
  const result = await payload.find({
    collection: 'tour-products',
    depth: 0,
    draft: true,
    fallbackLocale: false,
    limit: 100,
    locale: req.locale || 'vi',
    overrideAccess: false,
    pagination: false,
    req,
    select: { id: true, wrapperPage: true },
    where: { wrapperPage: { equals: wrapperID } },
  })
  return (result.docs as AnyDoc[]).map((doc) => doc.id).filter((value): value is RelationID => relationID(value) !== null)
}

const loadWrapperLinkMap = async (payload: PayloadLike, req: PayloadRequest, siteID: RelationID) => {
  const result = await payload.find({
    collection: 'tour-products',
    depth: 0,
    draft: true,
    fallbackLocale: false,
    limit: 1000,
    locale: req.locale || 'vi',
    overrideAccess: false,
    pagination: false,
    req,
    select: { id: true, wrapperPage: true },
    where: { site: { equals: siteID } },
  })
  const links = new Map<string, RelationID[]>()
  for (const doc of result.docs as AnyDoc[]) {
    const wrapperID = relationID(doc.wrapperPage)
    const productID = relationID(doc.id)
    if (wrapperID === null || productID === null) continue
    const key = String(wrapperID)
    links.set(key, [...(links.get(key) || []), productID])
  }
  return links
}

const describeWrapper = async ({ linkedProductIDs, product, siteID, wrapper }: { linkedProductIDs: RelationID[]; product: AnyDoc; siteID: RelationID; wrapper: AnyDoc }) => ({
  id: wrapper.id,
  path: wrapper.pathname || null,
  status: wrapper._status || 'draft',
  site: relationID(wrapper.site),
  health: getWrapperHealth({ linkedProductIDs, product, siteID, wrapper }),
  linkedProductIDs,
})

const loadWrapperCandidates = async (payload: PayloadLike, req: PayloadRequest, siteID: RelationID, product: AnyDoc, locale: AuthoringLocale) => {
  const tourHub = await findTourHub(payload, { ...req, locale }, siteID)
  if (!tourHub) return []
  const links = await loadWrapperLinkMap(payload, req, siteID)
  const result = await payload.find({
    collection: 'pages',
    depth: 0,
    draft: true,
    fallbackLocale: false,
    limit: 100,
    locale,
    overrideAccess: false,
    pagination: false,
    req,
    where: { and: [{ parentPage: { equals: tourHub.id } }, { site: { equals: siteID } }] },
  })
  const candidates: Array<Record<string, unknown>> = []
  for (const candidate of result.docs as AnyDoc[]) {
    if (typeof candidate.pathname !== 'string' || !candidate.pathname.startsWith('/tour/')) continue
    const linkedProductIDs = links.get(String(candidate.id)) || []
    const health = getWrapperHealth({ linkedProductIDs, product, siteID, wrapper: candidate })
    candidates.push({ id: candidate.id, path: candidate.pathname, status: candidate._status || 'draft', site: relationID(candidate.site), health, linkedProductIDs })
  }
  return candidates
}

export const buildAuthoringState = async ({ id, locale, payload, req }: { id: RelationID; locale: AuthoringLocale; payload: PayloadLike; req: PayloadRequest }) => {
  const { product, site, siteID } = await loadProductContext({ id, locale, payload, req })
  const wrapper = await loadWrapper(payload, req, product, locale)
  const linkedProductIDs = wrapper ? await loadLinkedProductIDs(payload, req, wrapper.id) : []
  const wrapperHealth = getWrapperHealth({ linkedProductIDs, product, siteID, wrapper })
  const wrapperState = wrapper ? await describeWrapper({ linkedProductIDs, product, siteID, wrapper }) : null
  const wrapperCandidates = await loadWrapperCandidates(payload, req, siteID, product, locale)
  const departures = await loadDepartures(payload, { ...req, locale }, product, siteID)
  const canPublish = canPublishForUser(req)
  const issues = authoringIssues({ canPublish, departures, locale, product, wrapper, wrapperHealth })
  const hasPublishPrerequisites = Boolean(wrapperHealth === 'valid' && departures.length)
  return {
    product: { id: product.id, updatedAt: product.updatedAt, status: product._status || 'draft', site: site.id, slug: stringValue(product.slug), expectedPath: expectedPath(product), hasHeroMedia: hasHeroMedia(product) },
    wrapper: wrapperState,
    wrapperCandidates,
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

    if (relationID(current.product.wrapperPage) !== null && wrapperIsValid(currentWrapper, current.product, current.siteID)) {
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

export const relinkAuthoring = async ({ id, locale, payload, req, wrapperID }: { id: RelationID; locale: AuthoringLocale; payload: PayloadLike; req: PayloadRequest; wrapperID: RelationID }) => {
  const initial = await loadProductContext({ id, locale, payload, req })
  const path = expectedPath(initial.product)
  if (!path) throw new AuthoringError('Tour chưa có slug hợp lệ để gán wrapper.', 422, 'invalid_slug')

  await startPostgresTransaction(payload, req, `wingsgo:${initial.siteID}:${path}`)
  try {
    const current = await loadProductContext({ id, locale, payload, req })
    if (current.siteID !== initial.siteID || expectedPath(current.product) !== path) {
      throw new AuthoringError('Tour đã đổi site hoặc đường dẫn trong lúc gán wrapper; tải lại rồi thử lại.', 409, 'stale_scope')
    }
    let wrapper: AnyDoc
    try {
      wrapper = (await findOne(payload, { ...req, locale }, 'pages', wrapperID)) as AnyDoc
    } catch {
      throw new AuthoringError('Không tìm thấy wrapper trong phạm vi site được phép.', 404, 'wrapper_not_found')
    }
    if (!sameID(wrapper.site, current.siteID)) throw new AuthoringError('Wrapper phải thuộc cùng site với tour.', 409, 'wrapper_site_mismatch')
    if (wrapper.pathname !== path) throw new AuthoringError(`Wrapper phải có đường dẫn ${path}.`, 409, 'wrapper_path_mismatch')
    const linkedProductIDs = await loadLinkedProductIDs(payload, req, wrapper.id)
    const otherProductIDs = linkedProductIDs.filter((linkedID) => !sameID(linkedID, current.product.id))
    if (otherProductIDs.length) throw new AuthoringError('Wrapper đã được gán cho tour khác; hãy dùng wrapper riêng.', 409, 'wrapper_conflict')
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

const loadPublishedProduct = async ({ id, locale, payload, req }: { id: RelationID; locale: AuthoringLocale; payload: PayloadLike; req: PayloadRequest }) => {
  try {
    return (await payload.findByID({
      collection: 'tour-products',
      depth: 0,
      draft: false,
      fallbackLocale: false,
      id,
      locale,
      overrideAccess: false,
      req,
    })) as AnyDoc
  } catch {
    return null
  }
}

export const ensurePublishedTourRedirect = async ({
  from,
  payload,
  req,
  to,
}: {
  from: string | null
  payload: PayloadLike
  req: PayloadRequest
  to: string | null
}) => {
  if (!from || !to || from === to) return false

  const existingResult = await payload.find({
    collection: 'redirects',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    where: { from: { equals: from } },
  })
  const existing = existingResult.docs?.[0] as AnyDoc | undefined
  if (existing) {
    const existingTarget = existing.to?.url
    if (existingTarget !== to) {
      throw new AuthoringError(`URL cũ ${from} đã được dùng cho redirect khác.`, 409, 'redirect_conflict')
    }

    if (existing.type !== '301') {
      await payload.update({
        collection: 'redirects',
        context: { disableRevalidate: true, wingsGoAuthoring: true },
        data: { type: '301' },
        id: existing.id,
        overrideAccess: true,
        req,
      })
      return true
    }

    return false
  }

  await payload.create({
    collection: 'redirects',
    context: { disableRevalidate: true, wingsGoAuthoring: true },
    data: { from, to: { type: 'custom', url: to }, type: '301' },
    overrideAccess: true,
    req,
  })
  return true
}

export const publishAuthoring = async ({ id, locale, payload, req, revision, departureIDs }: { id: RelationID; locale: AuthoringLocale; payload: PayloadLike; req: PayloadRequest; revision?: string; departureIDs: string[] }) => {
  if (!canPublishForUser(req)) throw new AuthoringError('Bạn không có quyền publish; Editor chỉ có thể lưu nháp.', 403, 'forbidden')
  if (!revision) throw new AuthoringError('Publish cần revision hiện tại để tránh ghi đè cập nhật mới.', 428, 'revision_required')
  const initial = await loadProductContext({ id, locale, payload, req })
  const path = expectedPath(initial.product)
  if (!path) throw new AuthoringError('Tour chưa có slug hợp lệ.', 422, 'invalid_slug')
  await startPostgresTransaction(payload, req, `wingsgo:${initial.siteID}:tour:${id}`)
  let previousProduct: AnyDoc
  let publishedProduct: AnyDoc
  let redirectCreated = false
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

    const publishedBefore = await loadPublishedProduct({ id, locale, payload, req })
    redirectCreated = await ensurePublishedTourRedirect({
      from: publishedBefore ? expectedPath(publishedBefore) : null,
      payload,
      req,
      to: path,
    })

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

  if (redirectCreated) revalidateTag('redirects', 'max')

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
