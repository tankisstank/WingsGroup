import {
  normalizeDiscoveryQuery,
  serializeDiscoveryQuery,
  stripDiscoveryQueryMeta,
  type DiscoveryQuery,
} from './discoveryCore'

export type TourEnquiryContext = {
  departureDate?: null | string
  departureId?: null | number | string
  discovery?: Omit<DiscoveryQuery, 'unknownValueCount'>
  intent?: TourEnquiryIntent
  source?: null | string
  tourId?: null | number | string
  tourSlug?: null | string
  tourTitle?: null | string
}

export type TourEnquiryIntent = 'contact' | 'hold-seat' | 'inquiry' | 'request-quote'

export const sanitizeContextSource = (value?: null | string): string | undefined => {
  const source = String(value || '').trim()
  return /^[a-z0-9-]{1,48}$/i.test(source) ? source : undefined
}

const stripBoundaryControls = (value: unknown) =>
  String(value || '')
    .normalize('NFKC')
    .replace(/[\p{Cc}\p{Cf}]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()

const boundText = (value: string, maxLength: number) =>
  Array.from(value).slice(0, maxLength).join('')

export const sanitizeTourContextID = (value?: null | number | string): string | undefined => {
  const id = stripBoundaryControls(value)
  return /^[a-z0-9_-]{1,64}$/i.test(id) ? id : undefined
}

export const sanitizeTourContextSlug = (value?: null | string): string | undefined => {
  const slug = stripBoundaryControls(value)
  return /^[a-z0-9][a-z0-9-]{0,95}$/i.test(slug) ? slug : undefined
}

export const sanitizeTourContextTitle = (value?: null | string): string | undefined => {
  const title = boundText(stripBoundaryControls(value), 160)
  return title ? title : undefined
}

export const sanitizeTourContextDepartureDate = (value?: null | string): string | undefined => {
  const date = stripBoundaryControls(value)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined
  const parsed = new Date(`${date}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
    ? date
    : undefined
}

const sanitizeTourContextIntent = (value?: null | string): TourEnquiryIntent | undefined =>
  value === 'contact' ||
  value === 'hold-seat' ||
  value === 'inquiry' ||
  value === 'request-quote'
    ? value
    : undefined

const toParams = (
  input?: URLSearchParams | Record<string, string | string[] | null | undefined>,
) => {
  if (input instanceof URLSearchParams) return input
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(input || {})) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item))
    else if (value != null) params.append(key, value)
  }
  return params
}

export const readSafeTourEnquiryContext = (
  input?: URLSearchParams | Record<string, string | string[] | null | undefined>,
): TourEnquiryContext => {
  const params = toParams(input)
  const first = (key: string) => params.get(key) || undefined

  return {
    departureDate: sanitizeTourContextDepartureDate(first('departureDate')),
    departureId: sanitizeTourContextID(first('departureId')),
    discovery: stripDiscoveryQueryMeta(normalizeDiscoveryQuery(params)),
    intent: sanitizeTourContextIntent(first('intent')),
    source: sanitizeContextSource(first('source')),
    tourId: sanitizeTourContextID(first('tourId')),
    tourSlug: sanitizeTourContextSlug(first('tour')),
    tourTitle: sanitizeTourContextTitle(first('tourTitle')),
  }
}

export const appendTourEnquiryContextParams = (
  params: URLSearchParams,
  context?: TourEnquiryContext,
) => {
  if (!context) return
  const source = sanitizeContextSource(context.source)
  if (source) params.set('source', source)
  const departureId = sanitizeTourContextID(context.departureId)
  if (departureId) params.set('departureId', departureId)
  const departureDate = sanitizeTourContextDepartureDate(context.departureDate)
  if (departureDate) params.set('departureDate', departureDate)
  const intent = sanitizeTourContextIntent(context.intent)
  if (intent) params.set('intent', intent)
  const tourSlug = sanitizeTourContextSlug(context.tourSlug)
  if (tourSlug) params.set('tour', tourSlug)
  const tourId = sanitizeTourContextID(context.tourId)
  if (tourId) params.set('tourId', tourId)
  const tourTitle = sanitizeTourContextTitle(context.tourTitle)
  if (tourTitle) params.set('tourTitle', tourTitle)
  for (const [key, value] of new URLSearchParams(
    serializeDiscoveryQuery(context.discovery || {}),
  ).entries()) {
    params.set(key, value)
  }
}

export const buildTourEnquiryHref = ({
  basePath,
  context,
  intent,
}: {
  basePath: string
  context?: TourEnquiryContext
  intent: TourEnquiryIntent
}) => {
  const params = new URLSearchParams()
  params.set('intent', intent)
  appendTourEnquiryContextParams(params, context)
  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

export const buildTourDetailDiscoveryHref = (
  href: string,
  discovery: Omit<DiscoveryQuery, 'unknownValueCount'>,
) => {
  const [path, suffix = ''] = href.split('#')
  const [pathname, query = ''] = path.split('?')
  const params = new URLSearchParams(query)
  params.set('source', 'journeys')
  for (const [key, value] of new URLSearchParams(serializeDiscoveryQuery(discovery)).entries()) {
    params.set(key, value)
  }
  const serialized = params.toString()
  return `${pathname}${serialized ? `?${serialized}` : ''}${suffix ? `#${suffix}` : ''}`
}

export const getTourEnquiryContextMessage = ({
  discovery,
  tourTitle,
}: TourEnquiryContext) =>
  [
    tourTitle ? `Tour: ${tourTitle}` : null,
    // Identifiers and source are structured context only; never prefill a
    // visitor's free-text message with internal metadata.
    discovery?.q ? `Discovery search: ${discovery.q}` : null,
    discovery?.type ? `Tour type: ${discovery.type}` : null,
    discovery?.destination ? `Discovery destination: ${discovery.destination}` : null,
    discovery?.style ? `Discovery style: ${discovery.style}` : null,
    discovery?.duration ? `Discovery duration: ${discovery.duration}` : null,
  ]
    .filter(Boolean)
    .join('\n')
