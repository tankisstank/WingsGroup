import config from '@payload-config'
import { headers } from 'next/headers'
import { createLocalReq, getPayload } from 'payload'

import { hasRole } from '@/access/roles'
import type { AppUser, RelationID } from '@/types/auth'
import {
  isSalesStatus,
  SALES_NOTE_MAX_LENGTH,
  type SalesStatus,
} from '@/lead-capture/triage'

type RouteContext = {
  params: Promise<{ id: string }>
}

type LeadDocument = {
  assignedTo?: unknown
  id: RelationID
  salesNote?: unknown
  salesStatus?: unknown
  salesStatusFrom?: unknown
  salesStatusTo?: unknown
  salesTriageVersion?: unknown
  salesUpdatedAt?: unknown
  salesUpdatedBy?: unknown
  site?: unknown
}

type TriageErrorCode = 'bad_request' | 'conflict' | 'forbidden' | 'not_found' | 'unauthorized'

class TriageError extends Error {
  code: TriageErrorCode
  status: number

  constructor(message: string, status = 400, code: TriageErrorCode = 'bad_request') {
    super(message)
    this.name = 'TriageError'
    this.code = code
    this.status = status
  }
}

const json = (body: Record<string, unknown>, status = 200): Response =>
  Response.json(body, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
    },
    status,
  })

const relationID = (value: unknown): RelationID | null => {
  if (typeof value === 'string' && value.trim()) return value
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (value && typeof value === 'object' && 'id' in value) {
    return relationID((value as { id?: unknown }).id)
  }
  return null
}

const version = (value: unknown): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0

const statusValue = (value: unknown): SalesStatus | null => (isSalesStatus(value) ? value : null)

const stringValue = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null

const getParamsID = async (context: RouteContext): Promise<string> => {
  const { id } = await context.params
  if (!id || id.length > 160 || /[/?#]/.test(id)) {
    throw new TriageError('ID lead không hợp lệ.', 400)
  }
  return id
}

const findSubmission = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  req: Awaited<ReturnType<typeof createLocalReq>>,
  id: string,
): Promise<LeadDocument | null> => {
  try {
    return (await payload.findByID({
      collection: 'form-submissions',
      depth: 0,
      id,
      overrideAccess: false,
      req,
    })) as unknown as LeadDocument
  } catch {
    // Treat an access failure and a missing document identically so an
    // operator cannot probe submissions outside their site scope.
    return null
  }
}

const findAssignees = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  req: Awaited<ReturnType<typeof createLocalReq>>,
  siteID: RelationID,
) => {
  const result = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 100,
    pagination: false,
    overrideAccess: false,
    req,
    sort: 'name',
    where: {
      or: [{ role: { equals: 'super-admin' } }, { sites: { in: [siteID] } }],
    },
  })

  return result.docs.map((user) => ({
    id: user.id,
    name: typeof user.name === 'string' ? user.name : null,
    role: typeof user.role === 'string' ? user.role : null,
  }))
}

const serialize = async ({
  canUpdate,
  doc,
  assignees,
}: {
  assignees: Array<{ id: RelationID; name: string | null; role: string | null }>
  canUpdate: boolean
  doc: LeadDocument
}) => ({
  assignedTo: relationID(doc.assignedTo),
  assignees,
  canUpdate,
  salesNote: stringValue(doc.salesNote),
  salesStatus: statusValue(doc.salesStatus),
  salesStatusFrom: statusValue(doc.salesStatusFrom),
  salesStatusTo: statusValue(doc.salesStatusTo),
  salesUpdatedAt: typeof doc.salesUpdatedAt === 'string' ? doc.salesUpdatedAt : null,
  salesUpdatedBy: relationID(doc.salesUpdatedBy),
  version: version(doc.salesTriageVersion),
})

const getOperatorContext = async () => {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    throw new TriageError('Bạn cần đăng nhập để xem lead.', 401, 'unauthorized')
  }

  const req = await createLocalReq({ user }, payload)
  return { payload, req, user: user as AppUser }
}

const parsePatch = (body: unknown) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new TriageError('Dữ liệu xử lý lead không hợp lệ.')
  }

  const value = body as Record<string, unknown>
  const allowed = new Set(['assignedTo', 'expectedVersion', 'salesNote', 'salesStatus'])
  const unknown = Object.keys(value).find((key) => !allowed.has(key))
  if (unknown) {
    throw new TriageError(`Trường xử lý lead không được phép: ${unknown}.`)
  }

  if (
    typeof value.expectedVersion !== 'number' ||
    !Number.isInteger(value.expectedVersion) ||
    value.expectedVersion < 0
  ) {
    throw new TriageError('Thiếu expectedVersion hợp lệ để tránh ghi đè cập nhật đồng thời.', 428)
  }

  let salesStatus: SalesStatus | null | undefined
  if (Object.prototype.hasOwnProperty.call(value, 'salesStatus')) {
    if (value.salesStatus !== null && !isSalesStatus(value.salesStatus)) {
      throw new TriageError('Trạng thái xử lý lead không hợp lệ.')
    }
    salesStatus = value.salesStatus as SalesStatus | null
  }

  let assignedTo: RelationID | null | undefined
  if (Object.prototype.hasOwnProperty.call(value, 'assignedTo')) {
    if (value.assignedTo !== null) {
      assignedTo = relationID(value.assignedTo)
      if (assignedTo === null) throw new TriageError('Nhân viên phụ trách không hợp lệ.')
    } else {
      assignedTo = null
    }
  }

  let salesNote: string | null | undefined
  if (Object.prototype.hasOwnProperty.call(value, 'salesNote')) {
    if (value.salesNote !== null && typeof value.salesNote !== 'string') {
      throw new TriageError('Ghi chú xử lý lead phải là chuỗi hoặc null.')
    }
    salesNote = typeof value.salesNote === 'string' ? value.salesNote.trim() || null : null
    if (salesNote && salesNote.length > SALES_NOTE_MAX_LENGTH) {
      throw new TriageError(`Ghi chú xử lý lead tối đa ${SALES_NOTE_MAX_LENGTH} ký tự.`)
    }
  }

  if (salesStatus === undefined && assignedTo === undefined && salesNote === undefined) {
    throw new TriageError('Cần có ít nhất một trường triage để cập nhật.')
  }

  return {
    assignedTo,
    expectedVersion: value.expectedVersion,
    salesNote,
    salesStatus,
  }
}

const handleError = (error: unknown): Response => {
  if (error instanceof TriageError) {
    return json({ code: error.code, message: error.message }, error.status)
  }

  return json({ code: 'server_error', message: 'Không thể xử lý lead lúc này.' }, 500)
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const id = await getParamsID(context)
    const { payload, req, user } = await getOperatorContext()
    const doc = await findSubmission(payload, req, id)

    if (!doc) return json({ code: 'not_found', message: 'Không tìm thấy lead.' }, 404)

    const siteID = relationID(doc.site)
    const canUpdate = Boolean(siteID && hasRole(user, ['super-admin', 'site-manager']))
    const assignees = canUpdate ? await findAssignees(payload, req, siteID as RelationID) : []

    return json(await serialize({ assignees, canUpdate, doc }))
  } catch (error) {
    return handleError(error)
  }
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const id = await getParamsID(context)
    const patch = parsePatch(await request.json().catch(() => null))
    const { payload, req, user } = await getOperatorContext()

    if (!hasRole(user, ['super-admin', 'site-manager'])) {
      throw new TriageError('Chỉ Site Manager hoặc Super Admin được cập nhật triage lead.', 403, 'forbidden')
    }

    const doc = await findSubmission(payload, req, id)
    if (!doc) throw new TriageError('Không tìm thấy lead.', 404, 'not_found')

    const siteID = relationID(doc.site)
    if (siteID === null) {
      throw new TriageError('Lead chưa có site nên chưa thể cập nhật triage.', 422)
    }

    const currentVersion = version(doc.salesTriageVersion)
    if (patch.expectedVersion !== currentVersion) {
      throw new TriageError('Lead đã thay đổi. Hãy tải lại trước khi cập nhật.', 409, 'conflict')
    }

    let assignees: Array<{ id: RelationID; name: string | null; role: string | null }> = []
    if (patch.assignedTo !== undefined && patch.assignedTo !== null) {
      assignees = await findAssignees(payload, req, siteID)
      if (!assignees.some((assignee) => String(assignee.id) === String(patch.assignedTo))) {
        throw new TriageError('Nhân viên phụ trách không thuộc phạm vi site của lead.', 422)
      }
    } else if (patch.assignedTo === undefined) {
      assignees = await findAssignees(payload, req, siteID)
    }

    const currentStatus = statusValue(doc.salesStatus)
    const nextStatus = patch.salesStatus === undefined ? currentStatus : patch.salesStatus
    const updateData: Record<string, unknown> = {
      salesTriageVersion: currentVersion + 1,
      salesUpdatedAt: new Date().toISOString(),
      salesUpdatedBy: user.id,
    }

    if (patch.salesStatus !== undefined) {
      updateData.salesStatus = nextStatus
      updateData.salesStatusFrom = currentStatus
      updateData.salesStatusTo = nextStatus
    }
    if (patch.assignedTo !== undefined) updateData.assignedTo = patch.assignedTo
    if (patch.salesNote !== undefined) updateData.salesNote = patch.salesNote

    // The version predicate makes the write conditional in the database: two
    // operators reading the same version cannot both update successfully.
    const updated = (await payload.update({
      collection: 'form-submissions',
      data: updateData as never,
      depth: 0,
      limit: 1,
      overrideAccess: true,
      req,
      where: {
        and: [
          { id: { equals: id } },
          { salesTriageVersion: { equals: currentVersion } },
        ],
      },
    })) as unknown as { docs?: LeadDocument[] }

    const updatedDoc = updated.docs?.[0]
    if (!updatedDoc) {
      throw new TriageError('Lead đã thay đổi. Hãy tải lại trước khi cập nhật.', 409, 'conflict')
    }

    if (assignees.length === 0) assignees = await findAssignees(payload, req, siteID)
    return json(await serialize({ assignees, canUpdate: true, doc: updatedDoc }))
  } catch (error) {
    return handleError(error)
  }
}
