import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import type { Media } from '@/payload-types'

import type { TourResolvedData } from './types'

type LooseRecord = Record<string, unknown>
type WingSideDepartureDisplay = LooseRecord & {
  currency: string
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

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const technicalSentencePatterns = technicalSentences.map((sentence) =>
  new RegExp(
    `(^|\\s+)${sentence.split(/\s+/u).map(escapeRegExp).join('\\s+')}(?=\\s+|$)`,
    'giu',
  ),
)

export const sanitizeWingSidePublicText = (value?: null | string): string => {
  let sanitized = String(value || '').normalize('NFKC')
  for (const pattern of technicalSentencePatterns) sanitized = sanitized.replace(pattern, '$1')
  return sanitized.replace(/\s+/g, ' ').trim()
}

const copyByLocale = {
  en: {
    accommodation: 'Accommodation',
    availableDepartures: 'Available departures',
    contact: 'Contact us',
    contactDetail: 'Price and departure timing are confirmed around your preferred travel dates.',
    contactEyebrow: 'Flexible departure',
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
    meals: 'Meals',
    overview: 'Journey overview',
    price: 'From',
    request: 'Request consultation',
    route: 'Route',
  },
  es: {
    accommodation: 'Alojamiento',
    availableDepartures: 'Salidas disponibles',
    contact: 'Contáctanos',
    contactDetail: 'Confirmamos el precio y la salida según tus fechas preferidas.',
    contactEyebrow: 'Salida flexible',
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
    meals: 'Comidas',
    overview: 'Resumen del viaje',
    price: 'Desde',
    request: 'Solicitar asesoría',
    route: 'Ruta',
  },
  it: {
    accommodation: 'Sistemazione',
    availableDepartures: 'Partenze disponibili',
    contact: 'Contattaci',
    contactDetail: 'Prezzo e partenza vengono confermati in base alle date preferite.',
    contactEyebrow: 'Partenza flessibile',
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
    meals: 'Pasti',
    overview: 'Panoramica del viaggio',
    price: 'Da',
    request: 'Richiedi una consulenza',
    route: 'Itinerario',
  },
  pt: {
    accommodation: 'Hospedagem',
    availableDepartures: 'Partidas disponíveis',
    contact: 'Fale conosco',
    contactDetail: 'O preço e a partida são confirmados de acordo com as datas desejadas.',
    contactEyebrow: 'Partida flexível',
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
    meals: 'Refeições',
    overview: 'Visão geral da viagem',
    price: 'A partir de',
    request: 'Solicitar consultoria',
    route: 'Rota',
  },
  vi: {
    accommodation: 'Lưu trú',
    availableDepartures: 'Ngày khởi hành phù hợp',
    contact: 'Liên hệ',
    contactDetail: 'Giá và thời điểm khởi hành được xác nhận theo ngày đi mong muốn của bạn.',
    contactEyebrow: 'Khởi hành linh hoạt',
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
    meals: 'Bữa ăn',
    overview: 'Tổng quan hành trình',
    price: 'Từ',
    request: 'Yêu cầu tư vấn',
    route: 'Tuyến điểm',
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
  const heroMedia = asMedia(tour.heroMedia) || asMedia(Array.isArray(tour.gallery) ? tour.gallery[0] : null)
  const heroKey = mediaKey(heroMedia)
  const seen = new Set<string>(heroKey ? [heroKey] : [])
  const gallery = (Array.isArray(tour.gallery) ? tour.gallery : []).filter((media): media is Media => {
    if (!asMedia(media)) return false
    const key = mediaKey(media)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })

  return { gallery, heroMedia }
}

const routeParts = (value?: null | string) =>
  sanitizeWingSidePublicText(value)
    .split(/\s*(?:→|->|–|—|\s-\s|\s\/\s)\s*/u)
    .map((part) => part.replace(/^day\s+\d+\s*[:.-]?\s*/iu, '').trim())
    .filter(Boolean)

export const deriveWingSideRoute = (tour: LooseRecord): string[] => {
  const routeViz = asRecord(tour.routeViz)
  const configuredStops = [...(Array.isArray(routeViz.stops) ? routeViz.stops : [])]
    .sort((left: LooseRecord, right: LooseRecord) => Number(left.order || 0) - Number(right.order || 0))
    .flatMap((stop: LooseRecord) => routeParts(asText(stop.label)))
  const days = Array.isArray(tour.itineraryDays) ? tour.itineraryDays : []
  const derivedStops = days.flatMap((day: LooseRecord) => routeParts(asText(day.route)))
  const titleFallback = derivedStops.length === 0
    ? days.flatMap((day: LooseRecord) => routeParts(asText(day.title)))
    : []
  const source = configuredStops.length > 0 ? configuredStops : [...derivedStops, ...titleFallback]
  const seen = new Set<string>()

  return source.filter((stop: string) => {
    const key = stop.toLocaleLowerCase('en')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const startOfUTCDate = (value: Date) =>
  Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())

export const isFutureWingSideDeparture = (value?: null | string, now = new Date()): boolean => {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && startOfUTCDate(date) >= startOfUTCDate(now)
}

export const buildWingSideTourCTA = (slug: string, id: number | string) => {
  const params = new URLSearchParams({
    tour: slug,
    tourId: String(id),
    source: 'tour-detail',
  })
  return `/contact-us?${params.toString()}`
}

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
  (Array.isArray(day.gallery) ? day.gallery.map(asMedia).find((media): media is Media => Boolean(media)) : null) ||
  null

export type WingSideTourViewModel = ReturnType<typeof buildWingSideTourViewModel>

export const buildWingSideTourViewModel = ({
  data,
  locale,
  now = new Date(),
}: {
  data: TourResolvedData
  locale: SupportedLocaleCode | string
  now?: Date
}) => {
  const tour = data.tour || {}
  const copy = getWingSideTourCopy(locale)
  const { gallery, heroMedia } = mapWingSideGallery(tour)
  const futureDepartures = (data.departures || [])
    .filter((departure) => isFutureWingSideDeparture(departure.departureDate, now))
    .sort((left, right) => String(left.departureDate).localeCompare(String(right.departureDate)))
  const productPrice = typeof tour.priceFrom === 'number' && tour.priceFrom > 0 ? tour.priceFrom : null
  const productCurrency = asText(tour.currency) || 'USD'
  const displayDepartures = futureDepartures.flatMap<WingSideDepartureDisplay>((departure) => {
    const departurePrice =
      typeof departure.priceFrom === 'number' && departure.priceFrom > 0
        ? departure.priceFrom
        : null
    const price = departurePrice ?? productPrice
    if (price === null) return []
    return [{
      ...departure,
      currency: departurePrice ? asText(departure.currency) || productCurrency : productCurrency,
      departureDate: asText(departure.departureDate),
      id: relationID(departure.id) ?? undefined,
      price,
    }]
  })
  const priceState = displayDepartures.length > 0
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
      meals: sanitizeWingSidePublicText(asText(day.meals)),
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
    Number.isFinite(durationDays) && durationDays > 0 && Number.isFinite(durationNights) && durationNights >= 0
      ? copy.duration(durationDays, durationNights)
      : null
  const marketKey = asText(tour.market).toLowerCase()
  const market =
    ({
      cambodia: 'Cambodia',
      china: 'China',
      indochina: 'Indochina',
      japan: 'Japan',
      korea: 'South Korea',
      laos: 'Laos',
      myanmar: 'Myanmar',
      thailand: 'Thailand',
      vietnam: 'Vietnam',
    } as Record<string, string>)[marketKey] || sanitizeWingSidePublicText(asText(tour.market))

  if (id === null || !slug) throw new Error('WingSide tour detail requires a TourProduct ID and slug')

  return {
    copy,
    ctaHref: buildWingSideTourCTA(slug, id),
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
