import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import type { Media } from '@/payload-types'

import type { TourResolvedData } from './types'
import { buildTourEnquiryHref, type TourEnquiryContext } from './enquiryContext'
import {
  normalizeGovernedTourPrice,
  normalizeSupportedTourCurrency,
  type SupportedTourCurrencyCode,
} from './currency'

type LooseRecord = Record<string, unknown>
type WingSideDepartureDisplay = LooseRecord & {
  currency: SupportedTourCurrencyCode
  departureDate: string
  id?: number | string
  price: number
}
const asRecord = (value: unknown): LooseRecord =>
  value && typeof value === 'object' ? (value as LooseRecord) : {}
const asText = (value: unknown): string => (typeof value === 'string' ? value : '')
const asMedia = (value: unknown): Media | null =>
  value && typeof value === 'object' && 'url' in value ? (value as Media) : null

const technicalSentences = [
  'Imported from BestPrice Travel raw crawl for WingSide editorial review.',
  'BestPrice source does not provide fixed future departure dates in this raw batch.',
  'Sales must confirm final price and departure availability before publishing.',
]
const sourceBrandPattern = /\bbest\s*price(?:\s+travel)?\b|\bbestpricetravel\b/iu

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const technicalSentencePatterns = technicalSentences.map(
  (sentence) =>
    new RegExp(`(^|\\s+)${sentence.split(/\s+/u).map(escapeRegExp).join('\\s+')}(?=\\s+|$)`, 'giu'),
)

export const sanitizeWingSidePublicText = (value?: null | string): string => {
  let sanitized = String(value || '').normalize('NFKC')
  for (const pattern of technicalSentencePatterns) sanitized = sanitized.replace(pattern, '$1')
  sanitized = sanitized
    .split(/(?<=[.!?])\s+|\n+/u)
    .filter((sentence) => !sourceBrandPattern.test(sentence))
    .join(' ')
  return sanitized
    .replace(/([\p{Ll}\d][.!?])(?=\p{Lu})/gu, '$1 ')
    .replace(/\s+/g, ' ')
    .trim()
}

const copyByLocale = {
  en: {
    accommodation: 'Accommodation',
    availableDepartures: 'Available departures',
    contact: 'Contact us',
    contactDetail:
      'Price on request · reply within 24h. Sales confirms final price before any hold.',
    contactEyebrow: 'Price on request',
    departure: 'Departure',
    destination: 'Destination',
    dayLabel: 'Day',
    durationLabel: 'Duration',
    duration: (days: number, nights: number) => `${days} days / ${nights} nights`,
    excludes: 'Not included',
    gallery: 'Journey gallery',
    includes: 'Included',
    itinerary: 'Day-by-day itinerary',
    journey: 'Tailor-made journey',
    journeyStop: 'Journey stop',
    leg: 'Leg',
    meals: 'Meals',
    noMeals: 'No meals',
    overview: 'Journey overview',
    price: 'From',
    priceOnRequestShort: 'On request · reply within 24h',
    request: 'Request consultation',
    route: 'Route',
    sleepStandard: 'Sleep standard',
    transport: 'Transport',
  },
  es: {
    accommodation: 'Alojamiento',
    availableDepartures: 'Salidas disponibles',
    contact: 'Contáctanos',
    contactDetail:
      'Precio bajo consulta · respuesta en 24h. Sales confirma el precio final antes de cualquier reserva.',
    contactEyebrow: 'Precio bajo consulta',
    departure: 'Salida',
    destination: 'Destino',
    dayLabel: 'Día',
    durationLabel: 'Duración',
    duration: (days: number, nights: number) => `${days} días / ${nights} noches`,
    excludes: 'No incluido',
    gallery: 'Galería del viaje',
    includes: 'Incluido',
    itinerary: 'Itinerario día a día',
    journey: 'Viaje a medida',
    journeyStop: 'Parada del viaje',
    leg: 'Etapa',
    meals: 'Comidas',
    noMeals: 'Sin comidas',
    overview: 'Resumen del viaje',
    price: 'Desde',
    priceOnRequestShort: 'Bajo consulta · respuesta en 24h',
    request: 'Solicitar asesoría',
    route: 'Ruta',
    sleepStandard: 'Estándar de alojamiento',
    transport: 'Transporte',
  },
  it: {
    accommodation: 'Sistemazione',
    availableDepartures: 'Partenze disponibili',
    contact: 'Contattaci',
    contactDetail:
      'Prezzo su richiesta · risposta entro 24h. Sales conferma il prezzo finale prima di qualsiasi blocco.',
    contactEyebrow: 'Prezzo su richiesta',
    departure: 'Partenza',
    destination: 'Destinazione',
    dayLabel: 'Giorno',
    durationLabel: 'Durata',
    duration: (days: number, nights: number) => `${days} giorni / ${nights} notti`,
    excludes: 'Non incluso',
    gallery: 'Galleria del viaggio',
    includes: 'Incluso',
    itinerary: 'Itinerario giorno per giorno',
    journey: 'Viaggio su misura',
    journeyStop: 'Tappa del viaggio',
    leg: 'Tappa',
    meals: 'Pasti',
    noMeals: 'Nessun pasto',
    overview: 'Panoramica del viaggio',
    price: 'Da',
    priceOnRequestShort: 'Su richiesta · risposta entro 24h',
    request: 'Richiedi una consulenza',
    route: 'Itinerario',
    sleepStandard: 'Standard del pernottamento',
    transport: 'Trasporto',
  },
  pt: {
    accommodation: 'Hospedagem',
    availableDepartures: 'Partidas disponíveis',
    contact: 'Fale conosco',
    contactDetail:
      'Preço sob consulta · resposta em 24h. Sales confirma o preço final antes de qualquer reserva.',
    contactEyebrow: 'Preço sob consulta',
    departure: 'Partida',
    destination: 'Destino',
    dayLabel: 'Dia',
    durationLabel: 'Duração',
    duration: (days: number, nights: number) => `${days} dias / ${nights} noites`,
    excludes: 'Não incluído',
    gallery: 'Galeria da viagem',
    includes: 'Incluído',
    itinerary: 'Roteiro dia a dia',
    journey: 'Viagem sob medida',
    journeyStop: 'Parada do roteiro',
    leg: 'Etapa',
    meals: 'Refeições',
    noMeals: 'Sem refeições',
    overview: 'Visão geral da viagem',
    price: 'A partir de',
    priceOnRequestShort: 'Sob consulta · resposta em 24h',
    request: 'Solicitar consultoria',
    route: 'Rota',
    sleepStandard: 'Padrão de hospedagem',
    transport: 'Transporte',
  },
  vi: {
    accommodation: 'Lưu trú',
    availableDepartures: 'Ngày khởi hành phù hợp',
    contact: 'Liên hệ',
    contactDetail:
      'Giá theo yêu cầu · phản hồi trong 24h. Sales xác nhận giá cuối trước khi giữ chỗ.',
    contactEyebrow: 'Giá theo yêu cầu',
    departure: 'Khởi hành',
    destination: 'Điểm đến',
    dayLabel: 'Ngày',
    durationLabel: 'Thời lượng',
    duration: (days: number, nights: number) => `${days} ngày / ${nights} đêm`,
    excludes: 'Không bao gồm',
    gallery: 'Thư viện hành trình',
    includes: 'Bao gồm',
    itinerary: 'Lịch trình từng ngày',
    journey: 'Hành trình thiết kế riêng',
    journeyStop: 'Điểm trong chương trình',
    leg: 'Bước',
    meals: 'Bữa ăn',
    noMeals: 'Không bao gồm bữa ăn',
    overview: 'Tổng quan hành trình',
    price: 'Từ',
    priceOnRequestShort: 'Theo yêu cầu · phản hồi trong 24h',
    request: 'Yêu cầu tư vấn',
    route: 'Tuyến điểm',
    sleepStandard: 'Tiêu chuẩn nghỉ',
    transport: 'Di chuyển',
  },
} as const

export type WingSideTourCopy = (typeof copyByLocale)[keyof typeof copyByLocale]

export const getWingSideTourCopy = (locale?: null | string): WingSideTourCopy =>
  locale && locale in copyByLocale
    ? copyByLocale[locale as keyof typeof copyByLocale]
    : copyByLocale.en

export const relationID = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'number' || typeof id === 'string' ? id : null
  }
  return null
}

export const hasMatchingWingSideTourWrapper = (
  tour: { wrapperPage?: unknown },
  wrapperPageID: number | string,
): boolean => String(relationID(tour.wrapperPage)) === String(wrapperPageID)

const mediaKey = (value: unknown): null | string => {
  const id = relationID(value)
  if (id !== null) return `id:${id}`
  if (value && typeof value === 'object' && 'url' in value) {
    const url = (value as { url?: unknown }).url
    return typeof url === 'string' && url ? `url:${url}` : null
  }
  return null
}

export const mapWingSideGallery = (tour: LooseRecord) => {
  const heroMedia =
    asMedia(tour.heroMedia) || asMedia(Array.isArray(tour.gallery) ? tour.gallery[0] : null)
  const heroKey = mediaKey(heroMedia)
  const seen = new Set<string>(heroKey ? [heroKey] : [])
  const gallery = (Array.isArray(tour.gallery) ? tour.gallery : []).filter(
    (media): media is Media => {
      if (!asMedia(media)) return false
      const key = mediaKey(media)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    },
  )

  return { gallery, heroMedia }
}

const routeParts = (value?: null | string) =>
  sanitizeWingSidePublicText(value)
    .split(/\s*(?:→|->|–|—|\s-\s|\s\/\s)\s*/u)
    .map((part) => part.replace(/^day\s+\d+\s*[:.-]?\s*/iu, '').trim())
    .filter(Boolean)

const routePlaceAliases = [
  ['ho-chi-minh-city', /\b(?:ho chi minh city|saigon)\b/giu, 'Ho Chi Minh City'],
  ['ninh-binh', /\bninh binh\b/giu, 'Ninh Binh'],
  ['ha-long', /\b(?:ha long|halong)\b/giu, 'Halong'],
  ['phu-quoc', /\bphu quoc\b/giu, 'Phu Quoc'],
  ['da-nang', /\bda nang\b/giu, 'Da Nang'],
  ['hoi-an', /\bhoi an\b/giu, 'Hoi An'],
  ['mai-chau', /\bmai chau\b/giu, 'Mai Chau'],
  ['ha-noi', /\b(?:ha noi|hanoi)\b/giu, 'Hanoi'],
  ['fansipan', /\bfansipan\b/giu, 'Fansipan'],
  ['sapa', /\b(?:sa pa|sapa)\b/giu, 'Sapa'],
  ['cat-cat', /\bcat cat\b/giu, 'Cat Cat'],
  ['y-linh-ho', /\b(?:y|i) linh ho\b/giu, 'Y Linh Ho'],
  ['lao-chai', /\blao chai\b/giu, 'Lao Chai'],
  ['ta-van', /\bta van\b/giu, 'Ta Van'],
  ['bac-ha', /\bbac ha\b/giu, 'Bac Ha'],
  ['ban-pho', /\bban pho\b/giu, 'Ban Pho'],
  ['lao-cai', /\blao cai\b/giu, 'Lao Cai'],
  ['hue', /\bhue\b/giu, 'Hue'],
  ['mekong', /\bmekong\b/giu, 'Mekong'],
  ['can-tho', /\bcan tho\b/giu, 'Can Tho'],
  ['my-tho', /\bmy tho\b/giu, 'My Tho'],
  ['ben-tre', /\bben tre\b/giu, 'Ben Tre'],
  ['cu-chi', /\bcu chi\b/giu, 'Cu Chi'],
  ['phnom-penh', /\bphnom penh\b/giu, 'Phnom Penh'],
  ['siem-reap', /\bsiem reap\b/giu, 'Siem Reap'],
] as const

export type WingSideRouteEntity = {
  key: string
  label: string
}

const extractKnownRouteEntities = (value: unknown): WingSideRouteEntity[] => {
  const comparable = sanitizeWingSidePublicText(asText(value))
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[đĐ]/gu, 'd')
    .replace(/[-_]+/gu, ' ')
    .toLowerCase()
  const matches = routePlaceAliases.flatMap(([key, pattern, label]) => {
    pattern.lastIndex = 0
    const match = pattern.exec(comparable)
    return match ? [{ index: match.index, key, label }] : []
  })

  return matches
    .sort((left, right) => left.index - right.index)
    .map(({ key, label }) => ({ key, label }))
}

const mergeRouteSequences = (sequences: WingSideRouteEntity[][]): WingSideRouteEntity[] => {
  const nodes = new Map<string, { label: string; order: number }>()
  const edges = new Map<string, Set<string>>()
  const indegree = new Map<string, number>()
  let order = 0

  for (const sequence of sequences) {
    const unique = sequence.filter(
      (entity, index) => sequence.findIndex((candidate) => candidate.key === entity.key) === index,
    )
    for (const entity of unique) {
      const { key, label } = entity
      if (!nodes.has(key)) nodes.set(key, { label, order: order++ })
      if (!edges.has(key)) edges.set(key, new Set())
      if (!indegree.has(key)) indegree.set(key, 0)
    }
    for (let index = 1; index < unique.length; index += 1) {
      const from = unique[index - 1].key
      const to = unique[index].key
      if (from === to || edges.get(from)?.has(to)) continue
      edges.get(from)?.add(to)
      indegree.set(to, (indegree.get(to) || 0) + 1)
    }
  }

  const queue = [...nodes.keys()]
    .filter((key) => indegree.get(key) === 0)
    .sort((left, right) => (nodes.get(left)?.order || 0) - (nodes.get(right)?.order || 0))
  const result: string[] = []
  while (queue.length > 0) {
    const key = queue.shift()
    if (!key) break
    result.push(key)
    for (const next of edges.get(key) || []) {
      indegree.set(next, (indegree.get(next) || 0) - 1)
      if (indegree.get(next) === 0) {
        queue.push(next)
        queue.sort((left, right) => (nodes.get(left)?.order || 0) - (nodes.get(right)?.order || 0))
      }
    }
  }

  const orderedKeys =
    result.length === nodes.size
      ? result
      : [...nodes.entries()]
          .sort(([, left], [, right]) => left.order - right.order)
          .map(([key]) => key)
  return orderedKeys.map((key) => ({ key, label: nodes.get(key)?.label || key }))
}

const fallbackRouteEntity = (label: string): WingSideRouteEntity => ({
  key: label
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[đĐ]/gu, 'd')
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/gu, ''),
  label,
})

export const deriveWingSideRouteEntities = (tour: LooseRecord): WingSideRouteEntity[] => {
  const routeViz = asRecord(tour.routeViz)
  const configuredStops = [...(Array.isArray(routeViz.stops) ? routeViz.stops : [])]
    .sort(
      (left: LooseRecord, right: LooseRecord) => Number(left.order || 0) - Number(right.order || 0),
    )
    .flatMap((stop: LooseRecord) =>
      routeParts(asText(stop.label)).map((label) => {
        const known = extractKnownRouteEntities(label)[0]
        return known || fallbackRouteEntity(label)
      }),
    )
  if (
    configuredStops.length > 0 &&
    !configuredStops.every((stop) => /^(?:vietnam|tours?)$/iu.test(stop.label))
  ) {
    return configuredStops.filter(
      (stop, index) =>
        configuredStops.findIndex((candidate) => candidate.key === stop.key) === index,
    )
  }

  const days = Array.isArray(tour.itineraryDays) ? tour.itineraryDays : []
  const slugAndTitleStops = extractKnownRouteEntities(`${asText(tour.slug)} ${asText(tour.title)}`)
  const itineraryStopSequence = days.flatMap((day: LooseRecord) =>
    extractKnownRouteEntities(`${asText(day.route)} ${asText(day.title)}`),
  )
  const knownStops = mergeRouteSequences([slugAndTitleStops, itineraryStopSequence])

  const derivedStops = days.flatMap((day: LooseRecord) => routeParts(asText(day.route)))
  if (knownStops.length > 0) {
    const conciseEditorialStops = derivedStops.filter(
      (stop) =>
        stop.split(/\s+/u).length <= 2 &&
        !knownStops.some((known) =>
          stop.toLocaleLowerCase('en').includes(known.label.toLocaleLowerCase('en')),
        ),
    )
    return [
      ...knownStops,
      ...(knownStops.length <= 2 ? conciseEditorialStops.map(fallbackRouteEntity) : []),
    ]
  }
  const titleFallback =
    derivedStops.length === 0
      ? days.flatMap((day: LooseRecord) => routeParts(asText(day.title)))
      : []
  const source =
    configuredStops.length > 0
      ? configuredStops
      : [...derivedStops, ...titleFallback].map(fallbackRouteEntity)
  const seen = new Set<string>()

  return source.filter((stop) => {
    if (seen.has(stop.key)) return false
    seen.add(stop.key)
    return true
  })
}

export const deriveWingSideRoute = (tour: LooseRecord): string[] =>
  deriveWingSideRouteEntities(tour).map(({ label }) => label)

const missingMealPattern = /^(?:n\/?a|none|no meals?|not included|không có)$/iu

export const normalizeWingSideDayMeal = ({
  dayIndex,
  locale,
  totalDays,
  value,
}: {
  dayIndex: number
  locale?: null | string
  totalDays: number
  value: unknown
}): string => {
  const raw = sanitizeWingSidePublicText(asText(value))
  const segments = raw.split(/\s*;\s*/u)
  const selected = segments.length === totalDays ? segments[dayIndex] || '' : raw
  if (!selected) return ''
  if (missingMealPattern.test(selected.trim())) {
    return getWingSideTourCopy(locale).noMeals
  }
  // A serialized multi-day source value is never safe to expose as one day's meals.
  if (selected.includes(';')) return ''
  return selected.trim()
}

const peakChargePattern = /\b(?:peak|high) season\b|\bsurcharge\b|\bcompulsory dinner\b/iu
const excludedServicePattern =
  /\binternational flights?\b|\bvisa\b|\bpassport fees?\b|\btravel insurance\b|\btips?\b|\btipping\b|\bgratuities\b|\blaundry\b|\bmeals? not (?:marked|included)\b|\bwater during meals\b|\bearly check[ -]?in\b|\blate check[ -]?out\b|\btransfer from and to airport\b|\bpersonal expenses?\b/iu

export const classifyWingSideServices = (tour: LooseRecord) => {
  const configuredIncludes = publicList(tour.includes)
  const configuredExcludes = publicList(tour.excludes)
  const peakNotes: string[] = []
  const includes: string[] = []
  const excludes: string[] = []

  const addUnique = (target: string[], label: string) => {
    if (!target.some((item) => item.toLocaleLowerCase('en') === label.toLocaleLowerCase('en'))) {
      target.push(label)
    }
  }
  const classify = (label: string, source: 'excludes' | 'includes') => {
    if (peakChargePattern.test(label)) return addUnique(peakNotes, label)
    if (source === 'excludes' || excludedServicePattern.test(label))
      return addUnique(excludes, label)
    addUnique(includes, label)
  }

  configuredIncludes.forEach((label) => classify(label, 'includes'))
  configuredExcludes.forEach((label) => classify(label, 'excludes'))

  return { excludes, includes, peakNotes }
}

const sanitizeListItems = (value: unknown) => publicList(value).map((label) => ({ label }))

export const normalizeWingSideConsultativeTour = <T extends LooseRecord>(
  tour: T,
  locale?: null | string,
): T => {
  const routeStops = deriveWingSideRoute(tour)
  const services = classifyWingSideServices(tour)
  const factSummary = asRecord(tour.factSummary)
  const servicesSummary = asRecord(tour.servicesSummary)
  const routeViz = asRecord(tour.routeViz)
  const sanitizeField = (value: unknown) => sanitizeWingSidePublicText(asText(value)) || null
  const title = sanitizeField(tour.title)
  const inferredDestination = /northern|\bnorth\b/i.test(String(title || ''))
    ? 'Northern Vietnam'
    : /southern|\bsouth\b/i.test(String(title || ''))
      ? 'Southern Vietnam'
      : /central/i.test(String(title || ''))
        ? 'Central Vietnam'
        : null

  return {
    ...tour,
    destinationLabel: sanitizeField(tour.destinationLabel) || inferredDestination,
    excludes: services.excludes.map((label) => ({ label })),
    factSummary: {
      ...factSummary,
      groupSizeSummary: sanitizeField(factSummary.groupSizeSummary),
      holdNote: sanitizeField(factSummary.holdNote),
      hotelSummary: sanitizeField(factSummary.hotelSummary),
      mealsSummary: sanitizeField(factSummary.mealsSummary),
      operatorNote: null,
      routeSummary: routeStops.join(' → ') || null,
    },
    includes: services.includes.map((label) => ({ label })),
    itineraryDays: (Array.isArray(tour.itineraryDays) ? tour.itineraryDays : []).map(
      (day: LooseRecord, index: number, days: LooseRecord[]) => ({
        ...day,
        accommodation: sanitizeField(day.accommodation),
        meals: normalizeWingSideDayMeal({
          dayIndex: index,
          locale,
          totalDays: days.length,
          value: day.meals,
        }),
        notes: sanitizeField(day.notes),
        route: sanitizeField(day.route),
        summary: sanitizeField(day.summary),
        title: sanitizeField(day.title),
      }),
    ),
    meta: {
      ...asRecord(tour.meta),
      description: sanitizeField(asRecord(tour.meta).description),
      title: sanitizeField(asRecord(tour.meta).title),
    },
    routeViz: {
      ...routeViz,
      routeCaption: sanitizeField(routeViz.routeCaption),
      stops: deriveWingSideRouteEntities(tour).map(({ key, label }, index) => ({
        key,
        label,
        order: index + 1,
        type: 'sightseeing',
      })),
    },
    servicesSummary: {
      ...servicesSummary,
      hotelSummary: sanitizeField(servicesSummary.hotelSummary),
      mealsSummary: sanitizeField(servicesSummary.mealsSummary),
      notes: sanitizeListItems(servicesSummary.notes),
      operatorNotes: null,
      peakNote: services.peakNotes.join(' ') || null,
      transportSummary: sanitizeField(servicesSummary.transportSummary),
    },
    summary: sanitizeField(tour.summary),
    title,
  } as T
}

const startOfUTCDate = (value: Date) =>
  Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())

export const isFutureWingSideDeparture = (value?: null | string, now = new Date()): boolean => {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && startOfUTCDate(date) >= startOfUTCDate(now)
}

export type WingSideTourCTAIntent = 'contact' | 'inquiry'

export const buildWingSideTourCTA = (
  slug: string,
  id: number | string,
  intent: WingSideTourCTAIntent = 'inquiry',
  source = intent === 'contact' ? 'tour-detail-contact' : 'tour-detail',
  discoveryContext?: Omit<TourEnquiryContext, 'source' | 'tourId' | 'tourSlug'>,
) =>
  buildTourEnquiryHref({
    basePath: '/contact-us',
    context: {
      ...discoveryContext,
      source,
      tourId: id,
      tourSlug: slug,
    },
    intent,
  })

const publicList = (value: unknown) =>
  (Array.isArray(value) ? value : [])
    .map((item) =>
      sanitizeWingSidePublicText(
        typeof item === 'string'
          ? item
          : item && typeof item === 'object' && 'label' in item
            ? String((item as { label?: unknown }).label || '')
            : '',
      ),
    )
    .filter(Boolean)

const getDayMedia = (day: LooseRecord): Media | null =>
  asMedia(day.media) ||
  (Array.isArray(day.gallery)
    ? day.gallery.map(asMedia).find((media): media is Media => Boolean(media))
    : null) ||
  null

export type WingSideTourViewModel = ReturnType<typeof buildWingSideTourViewModel>

export const buildWingSideTourViewModel = ({
  data,
  discoveryContext,
  locale,
  now = new Date(),
}: {
  data: TourResolvedData
  discoveryContext?: Omit<TourEnquiryContext, 'source' | 'tourId' | 'tourSlug'>
  locale: SupportedLocaleCode | string
  now?: Date
}) => {
  const tour = data.tour || {}
  const copy = getWingSideTourCopy(locale)
  const { gallery, heroMedia } = mapWingSideGallery(tour)
  const futureDepartures = (data.departures || [])
    .filter((departure) => isFutureWingSideDeparture(departure.departureDate, now))
    .sort((left, right) => String(left.departureDate).localeCompare(String(right.departureDate)))
  const productPrice = normalizeGovernedTourPrice({
    currency: tour.currency,
    value: tour.priceFrom,
  })
  const displayDepartures = futureDepartures.flatMap<WingSideDepartureDisplay>((departure) => {
    const departureCurrency = normalizeSupportedTourCurrency(departure.currency)
    const departurePrice = normalizeGovernedTourPrice({
      currency: departure.currency,
      value: departure.priceFrom,
    })
    const governedPrice = departurePrice ?? (departureCurrency ? productPrice : null)
    if (!governedPrice) return []
    return [
      {
        ...departure,
        currency: governedPrice.currency,
        departureDate: asText(departure.departureDate),
        id: relationID(departure.id) ?? undefined,
        price: governedPrice.value,
      },
    ]
  })
  const priceState =
    displayDepartures.length > 0
      ? {
          currency: displayDepartures[0].currency,
          departures: displayDepartures,
          kind: 'available' as const,
          price: displayDepartures[0].price,
        }
      : { departures: [] as WingSideDepartureDisplay[], kind: 'contact' as const }
  const itinerary = (Array.isArray(tour.itineraryDays) ? tour.itineraryDays : [])
    .map((day: LooseRecord, index: number) => ({
      accommodation: sanitizeWingSidePublicText(asText(day.accommodation)),
      dayNumber: Number(day.dayNumber || index + 1),
      meals: normalizeWingSideDayMeal({
        dayIndex: index,
        locale,
        totalDays: Array.isArray(tour.itineraryDays) ? tour.itineraryDays.length : 0,
        value: day.meals,
      }),
      media: getDayMedia(day),
      route: sanitizeWingSidePublicText(asText(day.route)),
      summary: sanitizeWingSidePublicText(asText(day.summary)),
      title: sanitizeWingSidePublicText(asText(day.title)),
    }))
    .filter((day) => day.title || day.summary || day.route)
  const id = relationID(tour.id)
  const slug = sanitizeWingSidePublicText(asText(tour.slug))
  const durationDays = Number(tour.durationDays)
  const durationNights = Number(tour.durationNights)
  const duration =
    Number.isFinite(durationDays) &&
    durationDays > 0 &&
    Number.isFinite(durationNights) &&
    durationNights >= 0
      ? copy.duration(durationDays, durationNights)
      : null
  const marketKey = asText(tour.market).toLowerCase()
  const market =
    (
      {
        cambodia: 'Cambodia',
        china: 'China',
        indochina: 'Indochina',
        japan: 'Japan',
        korea: 'South Korea',
        laos: 'Laos',
        myanmar: 'Myanmar',
        thailand: 'Thailand',
        vietnam: 'Vietnam',
      } as Record<string, string>
    )[marketKey] || sanitizeWingSidePublicText(asText(tour.market))

  if (id === null || !slug)
    throw new Error('WingSide tour detail requires a TourProduct ID and slug')

  return {
    contactHref: buildWingSideTourCTA(slug, id, 'contact', undefined, discoveryContext),
    copy,
    ctaHref: buildWingSideTourCTA(slug, id, 'inquiry', undefined, discoveryContext),
    duration,
    excludes: publicList(tour.excludes),
    gallery,
    heroMedia,
    id,
    includes: publicList(tour.includes),
    itinerary,
    market,
    priceState,
    routeStops: deriveWingSideRoute(tour),
    slug,
    summary: sanitizeWingSidePublicText(asText(tour.summary)),
    title: sanitizeWingSidePublicText(asText(tour.title)),
  }
}
