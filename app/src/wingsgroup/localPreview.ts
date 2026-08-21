import { WINGSGROUP_LOCAL_DRAFT_PREVIEW_CONTEXT } from './corporateRoutes'

const localBootstrapHosts = new Set(['127.0.0.1', '::1', 'localhost'])

type PreviewRequestLike = {
  context?: Record<string, unknown> | null
  headers?: Headers | null
  user?: unknown
}

const normalizeHost = (value: string | null | undefined): string =>
  (value || '').trim().toLowerCase().split(':')[0] || ''

const isLocalHost = (headers: Headers | null | undefined): boolean => {
  if (!headers) return false
  const host = normalizeHost(headers.get('x-site-host') || headers.get('host'))
  return localBootstrapHosts.has(host) || host.endsWith('.local')
}

const hasDraftModeCookie = (headers: Headers | null | undefined): boolean =>
  Boolean(headers?.get('cookie')?.match(/(?:^|;\s*)__prerender_bypass=[^;]+/u))

export const hasExplicitWingsGroupLocalDraftPreviewSignal = ({
  context,
  headers,
}: Pick<PreviewRequestLike, 'context' | 'headers'>): boolean =>
  context?.[WINGSGROUP_LOCAL_DRAFT_PREVIEW_CONTEXT] === true ||
  (process.env.NODE_ENV !== 'production' && isLocalHost(headers) && hasDraftModeCookie(headers))

export const isExplicitWingsGroupLocalDraftPreviewRequest = ({
  context,
  headers,
  user,
}: PreviewRequestLike): boolean =>
  Boolean(user) && hasExplicitWingsGroupLocalDraftPreviewSignal({ context, headers })

export const getRunOwnedPreviewLeadPath = (): string | null => {
  const configured = process.env.E09_PREVIEW_LEAD_PATH?.trim()
  if (!configured || process.env.NODE_ENV === 'production') return null
  if (!configured.startsWith('/tmp/') || configured.includes('\u0000')) return null
  return configured
}
