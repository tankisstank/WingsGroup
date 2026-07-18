import { timingSafeEqual } from 'node:crypto'

import { renderMetrics } from '@/observability'

const unauthorized = () => new Response(null, { status: 404 })

export function GET(request: Request): Response {
  const token = process.env.METRICS_TOKEN
  const supplied = request.headers.get('authorization')
  if (!token || !supplied) return unauthorized()
  const expectedBuffer = Buffer.from(`Bearer ${token}`)
  const suppliedBuffer = Buffer.from(supplied)
  if (
    expectedBuffer.length !== suppliedBuffer.length ||
    !timingSafeEqual(expectedBuffer, suppliedBuffer)
  ) {
    return unauthorized()
  }

  return new Response(renderMetrics(), {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
    },
  })
}

export const HEAD = GET
