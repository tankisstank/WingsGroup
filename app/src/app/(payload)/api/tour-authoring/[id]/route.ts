import config from '@payload-config'
import { getPayload } from 'payload'

import {
  AuthoringError,
  buildAuthoringState,
  createAuthoringRequest,
  parseAuthoringBody,
  parseAuthoringID,
  parseAuthoringLocale,
  provisionAuthoring,
  publishAuthoring,
} from '@/tours/authoring'
import { getTrustedCMSOrigins } from '@/utilities/previewHandoff'

type RouteContext = { params: Promise<{ id: string }> }

const json = (body: Record<string, unknown>, status = 200) =>
  Response.json(body, { headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' }, status })

const sameOriginCookieMutation = (request: Request) => {
  if (!request.headers.get('cookie')) return true
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false
  const expectedOrigins = new Set([new URL(request.url).origin, ...getTrustedCMSOrigins()])
  const origin = request.headers.get('origin')
  if (origin) return expectedOrigins.has(origin)
  const referer = request.headers.get('referer')
  if (!referer) return false
  try {
    return expectedOrigins.has(new URL(referer).origin)
  } catch {
    return false
  }
}

const errorResponse = (error: unknown) => {
  if (error instanceof AuthoringError) return json({ code: error.code, message: error.message }, error.status)
  console.error('WingsGo authoring request failed', error)
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
      : await publishAuthoring({ departureIDs: input.departureIDs!, id, locale: input.locale, payload, req, revision: input.revision })
    const { _private: privateState, ...publicResult } = result
    void privateState
    return json(publicResult)
  } catch (error) {
    return errorResponse(error)
  }
}
