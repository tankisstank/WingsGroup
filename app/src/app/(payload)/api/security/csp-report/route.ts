const maxReportBytes = 16 * 1024

const bounded = (value: unknown): string | undefined =>
  typeof value === 'string' ? value.slice(0, 256) : undefined

const safeOrigin = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  try {
    return new URL(value).origin.slice(0, 256)
  } catch {
    return bounded(value)
  }
}

const knownDirectives = new Set([
  'base-uri',
  'child-src',
  'connect-src',
  'default-src',
  'font-src',
  'form-action',
  'frame-ancestors',
  'frame-src',
  'img-src',
  'media-src',
  'object-src',
  'script-src',
  'script-src-attr',
  'script-src-elem',
  'style-src',
  'style-src-attr',
  'style-src-elem',
  'worker-src',
])

const safeDirectiveLabel = (value: unknown): string => {
  const directive = bounded(value)
  if (!directive) return 'unknown'
  const normalized = directive.toLowerCase()
  return knownDirectives.has(normalized) ? normalized : 'other'
}

export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get('content-type') || ''
  if (!/application\/(?:csp-report|reports\+json|json)/i.test(contentType)) {
    return new Response(null, { status: 415 })
  }

  const body = await request.text()
  if (Buffer.byteLength(body, 'utf8') > maxReportBytes) {
    return new Response(null, { status: 413 })
  }

  try {
    const parsed = JSON.parse(body)
    const rawReport = Array.isArray(parsed) ? parsed[0]?.body : parsed?.['csp-report'] || parsed
    if (rawReport && typeof rawReport === 'object') {
      const report = rawReport as Record<string, unknown>
      incrementMetric('wingstravel_csp_reports_total', {
        directive: safeDirectiveLabel(report['effective-directive'] || report.effectiveDirective),
      })
      logOperationalEvent('warn', 'csp_violation', {
        blockedOrigin: safeOrigin(report['blocked-uri'] || report.blockedURL),
        directive: bounded(report['effective-directive'] || report.effectiveDirective),
        documentOrigin: safeOrigin(report['document-uri'] || report.documentURL),
        sourceFileOrigin: safeOrigin(report['source-file'] || report.sourceFile),
      })
    }
  } catch {
    return new Response(null, { status: 400 })
  }

  return new Response(null, {
    headers: { 'Cache-Control': 'no-store' },
    status: 204,
  })
}

export function GET(): Response {
  return new Response(null, { status: 405 })
}
import { incrementMetric, logOperationalEvent } from '@/observability'
