import config from '@payload-config'
import { getPayload } from 'payload'

import {
  AuthoringError,
  buildAuthoringState,
  createAuthoringRequest,
  normalizeAuthoringError,
  parseAuthoringBody,
  parseAuthoringID,
  parseAuthoringLocale,
  provisionAuthoring,
  publishAuthoring,
  relinkAuthoring,
} from '@/tours/authoring'
import { sameOriginCookieMutation } from '@/utilities/tourAuthoringOrigin'

type RouteContext = { params: Promise<{ id: string }> }

const json = (body: Record<string, unknown>, status = 200) =>
  Response.json(body, { headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' }, status })

const errorResponse = (error: unknown) => {
  const normalizedError = normalizeAuthoringError(error)
  if (normalizedError instanceof AuthoringError) {
    return json({ code: normalizedError.code, message: normalizedError.message }, normalizedError.status)
  }
  const record = normalizedError && typeof normalizedError === 'object'
    ? normalizedError as { code?: unknown; name?: unknown; status?: unknown }
    : undefined
  console.error('WingsGo authoring request failed', {
    code: typeof record?.code === 'string' ? record.code.slice(0, 80) : undefined,
    name: typeof record?.name === 'string' ? record.name.slice(0, 80) : typeof normalizedError,
    status: typeof record?.status === 'number' ? record.status : undefined,
    stack: normalizedError instanceof Error ? normalizedError.stack?.split('\n').slice(1, 7).join('\n') : undefined,
  })
  return json({ code: 'internal_error', message: 'Không thể hoàn tất yêu cầu authoring.' }, 500)
}

const authenticatedRequest = async (request: Request) => {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user) throw new AuthoringError('Bạn cần đăng nhập để sử dụng authoring.', 401, 'unauthorized')
  return { payload, user }
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { payload, user } = await authenticatedRequest(request)
    const id = parseAuthoringID((await context.params).id)
    const locale = parseAuthoringLocale(new URL(request.url).searchParams.get('locale'))
    const req = await createAuthoringRequest(payload, user, locale)
    const { _private: privateState, ...state } = await buildAuthoringState({ id, locale, payload, req })
    void privateState
    return json(state)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    if (!sameOriginCookieMutation(request)) return json({ code: 'csrf', message: 'Origin không hợp lệ.' }, 403)
    const { payload, user } = await authenticatedRequest(request)
    const id = parseAuthoringID((await context.params).id)
    const input = parseAuthoringBody(await request.json())
    const req = await createAuthoringRequest(payload, user, input.locale)
    const result = input.action === 'provision'
      ? await provisionAuthoring({ id, locale: input.locale, payload, req })
      : input.action === 'relink'
        ? await relinkAuthoring({ id, locale: input.locale, payload, req, wrapperID: input.wrapperID! })
        : await publishAuthoring({ departureIDs: input.departureIDs!, id, locale: input.locale, payload, req, revision: input.revision })
    const { _private: privateState, ...publicResult } = result
    void privateState
    return json(publicResult)
  } catch (error) {
    return errorResponse(error)
  }
}
