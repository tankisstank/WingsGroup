'use client'
import { cn } from '@/utilities/ui'

import React from 'react'

import { FormBlock } from '@/blocks/Form/Component'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import { SiteLink } from '@/components/SiteLink'
import type { Media as MediaType } from '@/payload-types'
import type { Form as FormType } from '@payloadcms/plugin-form-builder/types'

import type { WingsGoScheduleSnapshot } from './wingsGoScheduleModel'
import { WingsGoScheduleBrowser } from './WingsGoScheduleBrowser'
import { WingsGoScheduleAssurance } from './WingsGoScheduleAssurance'
import { defaultTourSectionOrder, defaultTourSectionVisibility } from './sectionRegistry'
import { ScheduleInteractiveDepartures } from './ScheduleInteractiveDepartures'
import { TourItineraryAccordion } from './TourItineraryAccordion'
import { TourItineraryDayDetails } from './TourItineraryDayDetails'
import { TourDepartureMatrix, monthKey } from './TourDepartureMatrix'
import {
  findBestDeparture,
  TourDepartureSelectionProvider,
  useTourDepartureSelection,
} from './TourDepartureSelectionContext'
import { RetailTourConsultationDialog } from './RetailTourConsultationDialog'
import { normalizeGovernedTourPrice } from './currency'
import { isDepartureVerificationCurrent } from './departureCommerce'
import type {
  DepartureCardViewModel,
  SchedulePageViewModel,
  TourCardViewModel,
  TourResolvedData,
  TourSectionID,
} from './types'
import {
  formatTourDate,
  canHoldSeat as canHoldSeatDeparture,
  formatTourPrice,
  getAvailabilityLabel,
  getContactPath,
  getDurationLabel,
  getFutureDepartures,
  getMarketConfig,
  getMealChipFlags,
  getPriorityMarketDeparture,
  getSchedulePath,
  getTourInquiryPath,
  getTourPath,
  getTourPricePosture,
  getTourRouteChips,
  resolveConsultativeCtaHref,
  resolveRetailCtaHref,
  type TourInquiryIntent,
} from './utils'
import { isConsultativeTourSiteCode } from '@/utilities/siteCapabilities'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import { TourEnquiryContextBridge } from './TourEnquiryContextBridge'
import type { TourEnquiryContext } from './enquiryContext'
import { getWingSideTourCopy, normalizeWingSideConsultativeTour } from './wingsSideTourViewModel'
import { getSharedZaloCTA } from '@/utilities/sharedConsultationChannels'
import type { HotlineItem } from '@/utilities/siteHotlines'
import { formatHotlineDisplay, resolveSiteHotlines } from '@/utilities/siteHotlines'
import { PromotionBadge, PromotionPrice } from './PromotionPrice'

/** Retail = WingsGo dense conversion. Consultative = Wingside private inbound. */
export type TourDetailPresentation = 'consultative' | 'retail'

const consultativeChrome = {
  en: {
    factsDescription:
      'Duration, route rhythm, lodging and group style — what guests need before a private consult.',
    factsEyebrow: 'Trip at a glance',
    factsTitle: 'What you need to know first',
    galleryDescription: 'A visual read of the route before the day-by-day detail.',
    galleryTitle: "Places you'll move through",
    enquiryContext: 'Journey context',
    enquiryDescription:
      'Tell us your dates and group size. A local planner replies within 24 hours (GMT+7).',
    enquiryEyebrow: 'Next step',
    planningNotes: 'Planning notes',
    priceDescription:
      'Share your preferred dates and group size. We will confirm a tailored quote before any deposit.',
    priceEyebrow: 'Dates & price',
    priceHow: 'How booking works',
    priceReply: 'We reply within 24 hours with a tailored outline.',
    priceShare: 'Share dates, party size, and pace preference.',
    priceTitle: 'A private quote for your dates',
    relatedDescription: 'Nearby private journeys to compare pace, style, and destinations.',
    relatedEyebrow: 'Related journeys',
    relatedTitle: 'Other itineraries near this need',
    railAvailability: 'Dates and availability confirmed for your trip',
    railPace: 'A private journey shaped around your pace',
    railReply: 'Reply within 24 hours',
  },
  es: {
    factsDescription:
      'Duración, ritmo de la ruta, alojamiento y tipo de grupo: lo esencial antes de hablar con un especialista.',
    factsEyebrow: 'El viaje de un vistazo',
    factsTitle: 'Lo primero que conviene saber',
    galleryDescription: 'Una mirada visual a la ruta antes del itinerario día a día.',
    galleryTitle: 'Lugares que forman parte del viaje',
    enquiryContext: 'Contexto del viaje',
    enquiryDescription:
      'Cuéntanos tus fechas y el tamaño del grupo. Un especialista local responde en 24 horas (GMT+7).',
    enquiryEyebrow: 'Siguiente paso',
    planningNotes: 'Notas para planificar',
    priceDescription:
      'Comparte tus fechas y el tamaño del grupo. Confirmaremos una propuesta personalizada antes de cualquier depósito.',
    priceEyebrow: 'Fechas y precio',
    priceHow: 'Cómo funciona la reserva',
    priceReply: 'Respondemos en 24 horas con una primera propuesta personalizada.',
    priceShare: 'Comparte fechas, número de viajeros y ritmo preferido.',
    priceTitle: 'Una propuesta privada para tus fechas',
    relatedDescription: 'Viajes privados cercanos por ritmo, estilo y destinos.',
    relatedEyebrow: 'Viajes relacionados',
    relatedTitle: 'Otros itinerarios afines a tu idea',
    railAvailability: 'Fechas y disponibilidad confirmadas para tu viaje',
    railPace: 'Un viaje privado adaptado a tu ritmo',
    railReply: 'Respuesta en 24 horas',
  },
  it: {
    factsDescription:
      'Durata, ritmo dell’itinerario, sistemazioni e tipo di gruppo: ciò che serve prima della consulenza.',
    factsEyebrow: 'Il viaggio in breve',
    factsTitle: 'Le informazioni da conoscere subito',
    galleryDescription: 'Uno sguardo visivo al percorso prima dell’itinerario giorno per giorno.',
    galleryTitle: 'I luoghi che attraverserai',
    enquiryContext: 'Contesto del viaggio',
    enquiryDescription:
      'Indicaci le date e il numero di partecipanti. Un esperto locale risponde entro 24 ore (GMT+7).',
    enquiryEyebrow: 'Passo successivo',
    planningNotes: 'Note per la pianificazione',
    priceDescription:
      'Indicaci le date e il numero di partecipanti. Confermeremo un preventivo su misura prima di qualsiasi acconto.',
    priceEyebrow: 'Date e prezzo',
    priceHow: 'Come funziona la prenotazione',
    priceReply: 'Rispondiamo entro 24 ore con una prima proposta su misura.',
    priceShare: 'Indicaci date, numero di partecipanti e ritmo preferito.',
    priceTitle: 'Un preventivo privato per le tue date',
    relatedDescription: 'Viaggi privati simili per ritmo, stile e destinazioni.',
    relatedEyebrow: 'Viaggi correlati',
    relatedTitle: 'Altri itinerari vicini alle tue esigenze',
    railAvailability: 'Date e disponibilità confermate per il tuo viaggio',
    railPace: 'Un viaggio privato costruito sul tuo ritmo',
    railReply: 'Risposta entro 24 ore',
  },
  pt: {
    factsDescription:
      'Duração, ritmo do roteiro, hospedagem e perfil do grupo: o essencial antes da consultoria.',
    factsEyebrow: 'A viagem em resumo',
    factsTitle: 'O que você precisa saber primeiro',
    galleryDescription: 'Uma visão da rota antes do roteiro dia a dia.',
    galleryTitle: 'Lugares que fazem parte da viagem',
    enquiryContext: 'Contexto da viagem',
    enquiryDescription:
      'Informe as datas e o tamanho do grupo. Um especialista local responde em até 24 horas (GMT+7).',
    enquiryEyebrow: 'Próximo passo',
    planningNotes: 'Notas de planejamento',
    priceDescription:
      'Informe as datas e o tamanho do grupo. Confirmaremos uma proposta personalizada antes de qualquer depósito.',
    priceEyebrow: 'Datas e preço',
    priceHow: 'Como funciona a reserva',
    priceReply: 'Respondemos em até 24 horas com uma proposta inicial personalizada.',
    priceShare: 'Informe datas, número de viajantes e ritmo desejado.',
    priceTitle: 'Uma proposta privativa para suas datas',
    relatedDescription: 'Viagens privativas próximas em ritmo, estilo e destinos.',
    relatedEyebrow: 'Viagens relacionadas',
    relatedTitle: 'Outros roteiros próximos do que você procura',
    railAvailability: 'Datas e disponibilidade confirmadas para sua viagem',
    railPace: 'Uma viagem privativa no seu ritmo',
    railReply: 'Resposta em até 24 horas',
  },
  vi: {
    factsDescription:
      'Thời lượng, tuyến điểm, lưu trú và nhịp hành trình để bạn cân nhắc trước khi trao đổi với chuyên viên.',
    factsEyebrow: 'Tổng quan chuyến đi',
    factsTitle: 'Thông tin cần biết trước',
    galleryDescription: 'Hình ảnh thực tế của tuyến trước phần lịch trình từng ngày.',
    galleryTitle: 'Những nơi bạn sẽ đi qua',
    enquiryContext: 'Thông tin hành trình',
    enquiryDescription:
      'Gửi ngày đi và số khách. Chuyên viên địa phương phản hồi trong 24 giờ (GMT+7).',
    enquiryEyebrow: 'Bước tiếp theo',
    planningNotes: 'Lưu ý lập kế hoạch',
    priceDescription:
      'Chia sẻ ngày đi và số khách dự kiến. Chúng tôi sẽ xác nhận báo giá thiết kế riêng trước khi bạn đặt cọc.',
    priceEyebrow: 'Thời điểm & giá',
    priceHow: 'Cách xác nhận hành trình',
    priceReply: 'Chúng tôi phản hồi trong 24 giờ với đề xuất ban đầu.',
    priceShare: 'Chia sẻ ngày đi, số khách và nhịp mong muốn.',
    priceTitle: 'Báo giá riêng theo ngày đi',
    relatedDescription:
      'Các hành trình có tuyến điểm, phong cách và thời lượng gần với lựa chọn này.',
    relatedEyebrow: 'Hành trình liên quan',
    relatedTitle: 'Hành trình gần với nhu cầu này',
    railAvailability: 'Ngày đi và tình trạng dịch vụ được xác nhận theo chuyến của bạn',
    railPace: 'Hành trình riêng theo nhịp của bạn',
    railReply: 'Phản hồi trong 24 giờ',
  },
} as const

const getConsultativeChrome = (locale: SupportedLocaleCode) =>
  locale in consultativeChrome
    ? consultativeChrome[locale as keyof typeof consultativeChrome]
    : consultativeChrome.en

const resolveTourSiteCode = (siteCode?: null | string, presentation?: TourDetailPresentation) => {
  if (siteCode) {
    return siteCode
  }

  // Fallback when caller omits siteCode — only used for consultative inquiry paths.
  return presentation === 'consultative' ? 'wing-side' : undefined
}

const asArray = <T,>(value?: T[] | null) => (Array.isArray(value) ? value : [])

const asDoc = <T extends object>(value: T | number | string | null | undefined): T | null =>
  value && typeof value === 'object' ? value : null

const getGovernedPricePostureInput = ({
  nextDeparture,
  tour,
}: {
  nextDeparture?: null | {
    availabilityStatus?: unknown
    currency?: unknown
    expiresAt?: null | string
    priceBasis?: unknown
    priceFrom?: unknown
    verifiedAt?: null | string
  }
  tour: { tourType?: unknown }
}) => {
  // WingSide never turns a product-level price into a per-person claim.
  // Commerce is reserved for a group product with an explicit verified
  // departure capability; every other posture remains consultative.
  if (
    !['group', 'hybrid'].includes(String(tour.tourType || '')) ||
    !nextDeparture ||
    !isDepartureVerificationCurrent(nextDeparture) ||
    nextDeparture?.priceBasis !== 'per-person' ||
    !['open', 'limited'].includes(String(nextDeparture?.availabilityStatus || ''))
  ) return {}
  const departurePrice = normalizeGovernedTourPrice({
    currency: nextDeparture?.currency,
    value: nextDeparture?.priceFrom,
  })

  if (departurePrice) {
    return { currency: departurePrice.currency, priceFrom: departurePrice.value }
  }
  return {}
}

const splitSummaryParagraphs = (summary?: null | string) =>
  String(summary || '')
    .split(/(?<=\.)\s+/)
    .filter(Boolean)

const unusableContentPatterns = [
  /^dang cap nhat$/iu,
  /^chua cap nhat$/iu,
  /^tba$/iu,
  /^tbd$/iu,
  /^(na|n\/?a)$/iu,
  /^khong ap dung$/iu,
  /^theo line ban$/iu,
  /theo line ban tai (khong ap dung|dang cap nhat|chua cap nhat|tba|tbd|na)$/iu,
  /^route fallback$/iu,
  /^khach retail can route ro$/iu,
  /^can bang tham quan, nghi va thoi gian tu do$/iu,
  /diem nhan cua ngay duoc giu du ro/iu,
]

const normalizeComparableText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()

const isUsableText = (value: unknown): value is string => {
  const text = String(value || '').trim()
  if (!text) return false

  const comparable = normalizeComparableText(text)
  if (!comparable) return false

  return !unusableContentPatterns.some((pattern) => pattern.test(comparable))
}

const compactInfoItems = (items: Array<[string, unknown]>) =>
  items
    .filter(([, value]) => isUsableText(value))
    .map(([label, value]) => [label, String(value).trim()] as const)

const Panel = ({ children, className = '', ...props }: React.HTMLAttributes<HTMLElement>) => (
  <section
    className={`rounded-[28px] border border-border/70 bg-card/95 p-6 shadow-sm ${className}`}
    {...props}
  >
    {children}
  </section>
)

const SectionHeading = ({
  eyebrow,
  title,
  description,
  level = 'h2',
}: {
  description?: null | string
  eyebrow: string
  level?: 'h1' | 'h2'
  title: string
}) => (
  <div className="mb-6">
    <p className="site-brand-kicker text-xs font-semibold uppercase tracking-[0.18em]">{eyebrow}</p>
    {level === 'h1' ? (
      <h1 className="mt-2 text-3xl font-semibold text-foreground md:text-4xl">{title}</h1>
    ) : (
      <h2 className="mt-2 text-2xl font-semibold text-foreground md:text-3xl">{title}</h2>
    )}
    {description ? (
      <p className="mt-2 max-w-4xl text-sm text-muted-foreground md:text-base">{description}</p>
    ) : null}
  </div>
)

const getBadgeGroups = (badges: Array<Record<string, any>>) => {
  const groups = {
    categories: [] as string[],
    suitable: [] as string[],
    themes: [] as string[],
    trust: [] as string[],
    types: [] as string[],
  }

  for (const badge of badges) {
    const label = String(badge.label || '')

    if (label.startsWith('Category:')) {
      groups.categories.push(label.replace('Category:', '').trim())
      continue
    }

    if (label.startsWith('Theme:')) {
      groups.themes.push(label.replace('Theme:', '').trim())
      continue
    }

    if (label.startsWith('Type:')) {
      groups.types.push(label.replace('Type:', '').trim())
      continue
    }

    if (label.startsWith('Suitable:')) {
      groups.suitable.push(label.replace('Suitable:', '').trim())
      continue
    }

    groups.trust.push(label)
  }

  return groups
}

const collectAccommodationStops = (days: Array<Record<string, any>>) => {
  const seen = new Set<string>()
  const items: Array<Record<string, any>> = []

  for (const day of days) {
    const rawAccommodation = String(day.accommodation || '').trim()
    const accommodation = isUsableText(rawAccommodation) ? rawAccommodation : ''

    if (!accommodation || seen.has(accommodation)) {
      continue
    }

    seen.add(accommodation)
    items.push({
      accommodation,
      dayNumber: day.dayNumber,
      notes: isUsableText(day.notes) ? day.notes : null,
      route: isUsableText(day.route) ? day.route : null,
      sleepingStandard: isUsableText(day.sleepingStandard) ? day.sleepingStandard : null,
    })
  }

  return items
}

const getMarketTourBadges = (tour: Record<string, any>) => {
  const governedBadges = asArray<Record<string, any>>(tour.marketCard?.badges)
    .map((badge) => String(badge.label || '').trim())
    .filter(Boolean)

  if (governedBadges.length > 0) {
    return Array.from(new Set(governedBadges)).slice(0, 3)
  }

  const explicitBadges = getBadgeGroups(asArray<Record<string, any>>(tour.badges))
  const fallbackBadges = [
    ...explicitBadges.suitable,
    ...explicitBadges.themes,
    ...explicitBadges.trust,
  ].filter(Boolean)

  return Array.from(new Set(fallbackBadges)).slice(0, 3)
}

const ReviewSnapshotCard = ({
  reviewSnapshot,
}: {
  reviewSnapshot?: null | Record<string, any>
}) => {
  if (!reviewSnapshot || !reviewSnapshot.score) {
    return null
  }

  return (
    <div className="rounded-[24px] border border-border/60 bg-muted/20 p-4">
      <div className="flex items-end gap-3">
        <p className="text-4xl font-semibold leading-none text-foreground">
          {Number(reviewSnapshot.score).toFixed(1)}
        </p>
        <div>
          <p className="text-sm font-semibold text-foreground">Đánh giá tour</p>
          <p className="text-sm text-muted-foreground">
            {reviewSnapshot.reviewCount || 0} review • {reviewSnapshot.travelerCount || 0}+ khách đã
            đi
          </p>
        </div>
      </div>
      {reviewSnapshot.sourceLabel ? (
        <p className="mt-2 text-sm text-muted-foreground">{reviewSnapshot.sourceLabel}</p>
      ) : null}
    </div>
  )
}

const MealChips = ({ meals }: { meals?: null | string }) => {
  const flags = getMealChipFlags(meals)
  const chips = [
    flags.breakfast ? 'B' : null,
    flags.lunch ? 'L' : null,
    flags.dinner ? 'D' : null,
  ].filter(Boolean) as string[]

  if (chips.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Meals">
      {chips.map((chip) => (
        <span
          className="inline-flex min-h-7 min-w-7 items-center justify-center rounded-full border border-border/70 bg-background px-2 text-[11px] font-semibold tracking-wide text-foreground"
          key={chip}
        >
          {chip}
        </span>
      ))}
    </div>
  )
}

const TourPrimaryCtaClass =
  'tour-cta-primary inline-flex min-h-11 min-h-[44px] items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold no-underline'
const TourGhostCtaClass =
  'inline-flex min-h-11 min-h-[44px] items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground no-underline hover:bg-muted/40'

const isRetailOrBareContactLabel = (value?: null | string) => {
  const label = String(value || '').trim()
  if (!label) {
    return true
  }

  const comparable = normalizeComparableText(label)
  return /giu cho|hold seat|reserve|lien he|^contact$|^contact us$/.test(comparable)
}

/** Consultative primary should not reuse retail hold-seat or bare contact labels. */
const getConsultativePrimaryLabel = ({
  compact = false,
  ctaLabel,
  locale,
  override,
}: {
  compact?: boolean
  ctaLabel?: null | string
  locale: SupportedLocaleCode
  override?: null | string
}) => {
  const copy = getWingSideTourCopy(locale)
  const fallback = compact
    ? {
        en: 'Consult',
        es: 'Consultar',
        it: 'Consulenza',
        pt: 'Consultar',
        vi: 'Tư vấn',
      }[locale as 'en' | 'es' | 'it' | 'pt' | 'vi'] || 'Consult'
    : copy.request

  // Sanitize override the same way as CMS CTA labels (do not trust retail hold-seat copy).
  if (isUsableText(override) && !isRetailOrBareContactLabel(override)) {
    return String(override).trim()
  }

  const label = String(ctaLabel || '').trim()
  if (label && !isRetailOrBareContactLabel(label)) {
    return label
  }

  return fallback
}

const getConsultativePrimaryIntent = (mode?: null | string): TourInquiryIntent => {
  if (mode === 'request-quote' || mode === 'inquiry') {
    return mode
  }

  // contact / hold-seat / empty → private consult inquiry
  return 'inquiry'
}

export const RetailDecisionRail = ({
  className,
  cta = {},
  hasCollage: _hasCollage,
  locale,
  nextDeparture: nextDepartureProp,
  presentation = 'retail',
  reviewSnapshot,
  siteCode: siteCodeProp,
  tour,
  variants = [],
}: {
  className?: string
  cta?: Record<string, any>
  hasCollage?: boolean
  locale: SupportedLocaleCode
  nextDeparture: Record<string, any> | null
  presentation?: TourDetailPresentation
  reviewSnapshot?: Record<string, any> | null
  siteCode?: null | string
  tour: Record<string, any>
  variants?: Array<Record<string, any>>
}) => {
  const context = useTourDepartureSelection()
  const nextDeparture = context
    ? context.isPrivateTour
      ? null
      : context.selectedDeparture
    : nextDepartureProp
  const siteCode = resolveTourSiteCode(siteCodeProp, presentation)
  const retailCtaIntent: TourInquiryIntent = cta.mode || tour.bcfg?.ctaStyle || 'hold-seat'

  const nextDepDate = nextDeparture?.departureDate ? new Date(nextDeparture.departureDate) : null
  const now = new Date()
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const hasFutureDeparture = Boolean(
    nextDeparture &&
      nextDepDate &&
      !Number.isNaN(nextDepDate.getTime()) &&
      new Date(Date.UTC(nextDepDate.getUTCFullYear(), nextDepDate.getUTCMonth(), nextDepDate.getUTCDate())).getTime() >= todayUtc.getTime(),
  )
  const isPrivateTour = Boolean(context?.isPrivateTour)
  const isSoldOut = nextDeparture?.availabilityStatus === 'sold-out'
  const commerceVerified = Boolean(nextDeparture?.commerceVerified)
  const isSellable = !isPrivateTour && hasFutureDeparture && !isSoldOut && commerceVerified
  const effectiveRetailIntent: TourInquiryIntent = isPrivateTour
    ? 'request-quote'
    : isSellable
      ? retailCtaIntent
      : 'inquiry'
  const effectivePrimaryLabel = isPrivateTour
    ? 'Tư vấn lịch riêng'
    : isSellable
      ? nextDeparture?.ctaLabelOverride || cta.label || 'Giữ chỗ ngay'
      : hasFutureDeparture && isSoldOut
        ? 'Tư vấn đợt khác'
        : 'Nhận tư vấn lịch mới'

  const allDepartures = context?.departures && context.departures.length > 0 ? context.departures : []
  const activeCity = context?.selectedCity || 'all'
  const activeMonth = context?.activeMonth || 'all'

  const cities = Array.from(
    new Set(allDepartures.map((d) => d.departureCity).filter(Boolean)),
  ) as string[]

  const months = Array.from(
    new Set(allDepartures.map((d) => monthKey(d.departureDate))),
  )
    .filter((value) => /^\d{4}-\d{2}$/.test(value))
    .sort()

  const visibleDepartures = allDepartures.filter((d) => {
    const matchCity = activeCity === 'all' || !activeCity || d.departureCity === activeCity
    const matchMonth = activeMonth === 'all' || !activeMonth || monthKey(d.departureDate) === activeMonth
    return matchCity && matchMonth
  })

  const usableRouteSummary = isUsableText(tour.factSummary?.routeSummary)
    ? tour.factSummary?.routeSummary
    : null
  const usableHotelSummary = isUsableText(tour.factSummary?.hotelSummary)
    ? tour.factSummary?.hotelSummary
    : isUsableText(tour.servicesSummary?.hotelSummary)
      ? tour.servicesSummary?.hotelSummary
      : null
  const usableMealsSummary = isUsableText(tour.factSummary?.mealsSummary)
    ? tour.factSummary?.mealsSummary
    : isUsableText(tour.servicesSummary?.mealsSummary)
      ? tour.servicesSummary?.mealsSummary
      : null
  const hasFactSummary = Boolean(usableRouteSummary || usableHotelSummary || usableMealsSummary)

  const retailInquiryHref = getTourInquiryPath({
    departureId: !isPrivateTour && hasFutureDeparture ? nextDeparture?.id : undefined,
    departureDate: !isPrivateTour && hasFutureDeparture ? nextDeparture?.departureDate : undefined,
    intent: effectiveRetailIntent,
    source: 'tour-detail-hero',
    tourId: tour.id,
    tourSlug: tour.slug,
    discoveryContext: tour.discoveryContext,
  })
  const retailPrimaryHref = isPrivateTour
    ? retailInquiryHref
    : resolveRetailCtaHref({
        cmsHref: cta.href,
        expectedDepartureDate: hasFutureDeparture ? nextDeparture?.departureDate : undefined,
        expectedDepartureId: hasFutureDeparture ? nextDeparture?.id : undefined,
        expectedTourId: tour.id,
        expectedTourSlug: tour.slug,
        hasFutureDeparture,
        inquiryPath: retailInquiryHref,
        isSellable,
      })

  const openDepartures = allDepartures.filter(
    (d) =>
      (d.commerceVerified && d.availabilityStatus !== 'sold-out' && Number(d.priceFrom) > 0) ||
      d.availabilityStatus === 'open' ||
      d.availabilityStatus === 'limited',
  )
  const lowestDeparturePrice = openDepartures.reduce((min, d) => {
    const p = Number(d.priceFrom)
    return p > 0 && p < min ? p : min
  }, Infinity)

  const floorPrice =
    lowestDeparturePrice !== Infinity
      ? lowestDeparturePrice
      : Number(tour.priceFrom) > 0
        ? Number(tour.priceFrom)
        : 0

  const selectedPrice = Number(nextDeparture?.priceFrom) || 0
  const isHigherPrice = floorPrice > 0 && selectedPrice > floorPrice
  const isEn = locale === 'en'
  const priceLabel = isPrivateTour
    ? isEn
      ? 'Private quote'
      : 'Báo giá theo đoàn'
    : isHigherPrice
      ? isEn
        ? 'Departure price'
        : 'Giá đợt này'
      : isEn
        ? 'From'
        : 'Giá từ'

  return (
    <aside
      className={`w-full space-y-4 lg:w-[340px] shrink-0 ${className || ''}`.trim()}
      data-od-id="decision-rail"
      data-tour-presentation={presentation}
    >
      <div className="lg:sticky lg:top-[92px] space-y-4">
        <Panel className="p-6 border-border/80 shadow-md flex flex-col [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Price section - Fixed top tier (never scrolls) */}
          <div className="shrink-0 border-b border-border/60 pb-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {priceLabel}
              </p>
              {context ? (
                <button
                  type="button"
                  onClick={() => context.setIsPrivateTour(!isPrivateTour)}
                  className="text-xs font-medium text-[var(--site-brand)] hover:underline"
                  data-od-id="tour-toggle-private-tour"
                >
                  {isPrivateTour
                    ? isEn
                      ? 'View group tour dates'
                      : 'Xem lịch tour ghép'
                    : isEn
                      ? 'Private quote'
                      : 'Tư vấn lịch riêng'}
                </button>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              {isSellable ? (
                <span className="font-mono text-3xl font-extrabold text-[var(--site-brand)]">
                  <PromotionPrice
                    contactLabel={isEn ? 'Contact' : 'Liên hệ'}
                    currency={nextDeparture?.currency}
                    originalPrice={nextDeparture?.originalPrice}
                    price={nextDeparture?.priceFrom}
                  />
                </span>
              ) : (
                <span className="font-mono text-3xl font-extrabold text-[var(--site-brand)]">
                  {isEn ? 'Contact' : 'Liên hệ'}
                </span>
              )}
              {isSellable && nextDeparture?.priceFrom ? (
                <span className="text-xs text-muted-foreground">{isEn ? '/ guest' : '/ khách'}</span>
              ) : null}
            </div>
            {isHigherPrice ? (
              <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                {isEn
                  ? `Tour starts from ${formatTourPrice(floorPrice, nextDeparture?.currency)} on other dates`
                  : `Tour có đợt từ ${formatTourPrice(floorPrice, nextDeparture?.currency)} cho các ngày khác`}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              {isPrivateTour
                ? isEn
                  ? 'Private tours are priced based on custom request and party size.'
                  : 'Không áp dụng giá tour ghép cho lịch riêng. Lịch và báo giá theo nhu cầu.'
                : isSellable
                  ? nextDeparture?.depositNote ||
                    tour.factSummary?.holdNote ||
                    (isEn
                      ? 'Sales will confirm availability and price before deposit.'
                      : 'Sales xác nhận lại tình trạng chỗ và giá trước khi đặt cọc.')
                  : hasFutureDeparture && isSoldOut
                    ? isEn
                      ? 'This departure is sold out. Please contact us for other options.'
                      : 'Đợt này đã hết chỗ. Vui lòng liên hệ để tư vấn đợt khác phù hợp.'
                    : hasFutureDeparture && !commerceVerified
                      ? isEn
                        ? 'Pricing and availability are being updated. Please contact us.'
                        : 'Giá và tình trạng chỗ đang được chuyên viên cập nhật. Vui lòng liên hệ.'
                      : isEn
                        ? 'No scheduled departures on sale yet. Please contact us for future dates.'
                        : 'Hiện chưa có lịch khởi hành mở bán. Vui lòng liên hệ chuyên viên để nhận lịch mới.'}
            </p>
          </div>

          {/* Middle Tier - Natural height without internal vertical scrollbar */}
          <div className="py-2 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {/* Booking Controls (Giai đoạn 2) */}
            <div className="space-y-3 border-b border-border/60 pb-4">
              {/* 1. Nơi khởi hành */}
              {cities.length > 0 ? (
                <div className="space-y-1.5">
                  <label htmlFor="departureCity" className="text-xs font-semibold text-foreground">
                    Nơi khởi hành
                  </label>
                  <select
                    id="departureCity"
                    data-od-id="departureCity"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    value={activeCity}
                    onChange={(e) => context?.setSelectedCity?.(e.target.value)}
                  >
                    <option value="all">Tất cả nơi đi</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {/* 2. Tháng khởi hành */}
              <div className="space-y-1.5">
                <label htmlFor="departureMonth" className="text-xs font-semibold text-foreground">
                  Tháng khởi hành
                </label>
                <select
                  id="departureMonth"
                  data-od-id="departureMonth"
                  aria-label="Tháng khởi hành"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  value={activeMonth}
                  onChange={(e) => context?.setActiveMonth?.(e.target.value)}
                >
                  <option value="all">Tất cả tháng</option>
                  {months.map((m) => {
                    const [year, month] = m.split('-')
                    const label = locale === 'en' ? `${month}/${year}` : `Tháng ${month}/${year}`
                    return (
                      <option key={m} value={m}>
                        {label}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* 3. Nhu cầu của bạn */}
              <div className="space-y-1.5">
                <label htmlFor="requestType" className="text-xs font-semibold text-foreground">
                  Nhu cầu của bạn
                </label>
                <select
                  id="requestType"
                  data-od-id="requestType"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  value={isPrivateTour ? 'private' : 'group'}
                  onChange={(e) => context?.setIsPrivateTour?.(e.target.value === 'private')}
                >
                  <option value="group">Chọn lịch tour ghép</option>
                  <option value="private">Tư vấn lịch riêng</option>
                </select>
              </div>

              {/* 4. Đợt khởi hành (ẩn khi chọn tour riêng) */}
              {!isPrivateTour ? (
                <div className="space-y-1.5" id="departureSelectGroup">
                  <label htmlFor="departureSelect" className="text-xs font-semibold text-foreground">
                    Đợt khởi hành
                  </label>
                  <select
                    id="departureSelect"
                    data-od-id="departureSelect"
                    aria-describedby="airlineHint"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    disabled={visibleDepartures.length === 0}
                    value={nextDeparture?.id ? String(nextDeparture.id) : ''}
                    onChange={(e) => {
                      const selectedId = e.target.value
                      const targetDep = visibleDepartures.find((d) => String(d.id) === String(selectedId))
                      if (targetDep) {
                        context?.setSelectedDeparture?.(targetDep)
                      }
                    }}
                  >
                    {visibleDepartures.length > 0 ? (
                      visibleDepartures.map((d) => {
                        const dateStr = formatTourDate(d.departureDate, locale) || d.departureDate
                        const cityStr = d.departureCity || ''
                        const stateStr = !d.commerceVerified
                          ? 'Cần xác nhận lại giá'
                          : d.availabilityStatus === 'sold-out'
                            ? 'Đã hết chỗ'
                            : d.availabilityStatus === 'limited'
                              ? 'Sắp hết chỗ'
                              : d.availabilityStatus === 'open'
                                ? 'Đang mở bán'
                                : ''
                        const [dY, dM, dD] = String(d.departureDate || '').slice(0, 10).split('-')
                        const formattedOptDate = dD && dM ? `D${dD}.M${dM}` : (dateStr || '')
                        const optLabel = [`Đợt ${d.id}`, formattedOptDate, cityStr, stateStr].filter(Boolean).join(' · ')
                        return (
                          <option key={d.id} value={String(d.id)}>
                            {optLabel}
                          </option>
                        )
                      })
                    ) : (
                      <option value="">Chưa có lịch phù hợp</option>
                    )}
                  </select>
                  {!isPrivateTour && hasFutureDeparture && nextDeparture?.airline ? (
                    <p id="airlineHint" className="text-xs text-muted-foreground">
                      {[nextDeparture.departureCity, nextDeparture.airline].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* 4. Số khách dự kiến */}
              <div className="space-y-1.5">
                <label htmlFor="paxCount" className="text-xs font-semibold text-foreground">
                  Số khách dự kiến
                </label>
                <input
                  id="paxCount"
                  data-od-id="paxCount"
                  type="number"
                  min="1"
                  max="99"
                  step="1"
                  inputMode="numeric"
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  value={context?.guestCount ?? 2}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10)
                    if (!Number.isNaN(parsed)) {
                      context?.setGuestCount?.(parsed)
                    }
                  }}
                />
              </div>
            </div>

            {/* Departure Info & Facts */}
            <div className="py-2 border-b border-border/60 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  {isPrivateTour ? 'Hình thức:' : 'Khởi hành gần nhất:'}
                </span>
                <span className="font-semibold text-foreground">
                  {isPrivateTour
                    ? 'Lịch riêng theo đoàn'
                    : hasFutureDeparture
                      ? formatTourDate(nextDeparture?.departureDate, locale)
                      : 'Chưa có lịch mới'}
                </span>
              </div>
              {!isPrivateTour && hasFutureDeparture &&
              [nextDeparture?.airline, nextDeparture?.departureCity].filter(Boolean).length > 0 ? (
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Khởi hành & bay:</span>
                  <span>
                    {[
                      nextDeparture?.departureCity,
                      nextDeparture?.airline
                        ? `${nextDeparture.airline}${nextDeparture?.flightNumber ? ` (${nextDeparture.flightNumber})` : ''}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </span>
                </div>
              ) : null}
              {hasFutureDeparture &&
              getAvailabilityLabel(nextDeparture?.availabilityStatus, locale) ? (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Tình trạng chỗ:</span>
                  <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 font-semibold text-foreground">
                    {getAvailabilityLabel(nextDeparture?.availabilityStatus, locale)}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Quick Fact Summary - Only render if usable facts exist */}
            {hasFactSummary ? (
              <div className="py-2 border-b border-border/60 space-y-1.5 text-xs text-muted-foreground">
                {usableRouteSummary ? (
                  <p>
                    <strong className="font-medium text-foreground">Tuyến:</strong>{' '}
                    {usableRouteSummary}
                  </p>
                ) : null}
                {usableHotelSummary ? (
                  <p>
                    <strong className="font-medium text-foreground">Lưu trú:</strong>{' '}
                    {usableHotelSummary}
                  </p>
                ) : null}
                {usableMealsSummary ? (
                  <p>
                    <strong className="font-medium text-foreground">Bữa ăn:</strong>{' '}
                    {usableMealsSummary}
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* Variants pill list if any */}
            {variants.length > 0 ? (
              <div className="pt-2 border-t border-border/60">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">
                  Biến thể hành trình
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {variants.map((variant) => (
                    <span
                      className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground"
                      key={variant.id}
                    >
                      {[variant.label, variant.airline, variant.departureCity]
                        .filter(Boolean)
                        .join(' • ')}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Bottom Tier - Fixed CTAs (never scrolls away) */}
          <div className="shrink-0 pt-4 border-t border-border/60 space-y-2.5">
            <SiteLink
              className="flex w-full min-h-12 items-center justify-center rounded-xl bg-[var(--site-brand)] px-5 text-sm font-bold text-white no-underline shadow-sm transition hover:opacity-95"
              data-od-id="tour-decision-primary-cta"
              href={retailPrimaryHref}
            >
              {effectivePrimaryLabel}
            </SiteLink>

            <div className="grid grid-cols-2 gap-2">
              <SiteLink
                className="flex min-h-10 items-center justify-center rounded-lg border border-border px-3 text-center text-xs font-semibold no-underline hover:bg-muted/30"
                href={getSchedulePath()}
              >
                Xem các đợt đi
              </SiteLink>
              <SiteLink
                className="flex min-h-10 items-center justify-center rounded-lg border border-border px-3 text-center text-xs font-semibold no-underline hover:bg-muted/30"
                data-od-id="tour-decision-consultation-trigger"
                href={getTourInquiryPath({
                  departureDate: !isPrivateTour && hasFutureDeparture ? nextDeparture?.departureDate : undefined,
                  departureId: !isPrivateTour && hasFutureDeparture ? nextDeparture?.id : undefined,
                  discoveryContext: tour.discoveryContext,
                  guests: context?.guestCount ?? 2,
                  intent: isPrivateTour ? 'request-quote' : 'inquiry',
                  siteCode,
                  source: 'tour-detail-hero',
                  tourId: tour.id,
                  tourSlug: tour.slug,
                  tourTitle: tour.title,
                })}
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                    e.preventDefault()
                    context?.setIsConsultationOpen?.(true)
                  }
                }}
              >
                Nhận tư vấn
              </SiteLink>
            </div>
          </div>
        </Panel>

        {/* Social Proof / Review Snapshot Card if exists */}
        {reviewSnapshot?.score || asArray(reviewSnapshot?.proofQuotes).length > 0 ? (
          <ReviewSnapshotCard reviewSnapshot={reviewSnapshot} />
        ) : null}
      </div>
    </aside>
  )
}

const TourDecisionHeader = ({
  locale,
  nextDeparture: nextDepartureProp,
  presentation = 'retail',
  siteCode: siteCodeProp,
  tour,
  variants = [],
}: {
  locale: SupportedLocaleCode
  nextDeparture: Record<string, any> | null
  presentation?: TourDetailPresentation
  siteCode?: null | string
  tour: Record<string, any>
  variants?: Array<Record<string, any>>
}) => {
  const context = useTourDepartureSelection()
  const nextDeparture = context
    ? context.isPrivateTour
      ? null
      : context.selectedDeparture
    : nextDepartureProp
  const isConsultative = presentation === 'consultative'
  const wingSideCopy = getWingSideTourCopy(locale)
  const durationLabel = getDurationLabel(tour.durationDays, tour.durationNights, locale)
  const cta = tour.primaryCTA || {}
  const siteCode = resolveTourSiteCode(siteCodeProp, presentation)
  const consultativeCtaIntent = getConsultativePrimaryIntent(cta.mode || tour.bcfg?.ctaStyle)
  const routeChips = getTourRouteChips(tour)
  const displayTitle = isConsultative
    ? String(tour.title || '').replace(
        new RegExp(`\\s+${Number(tour.durationDays) || ''}\\s+days?$`, 'i'),
        '',
      )
    : tour.title
  const heroMedia = tour.heroMedia || asArray(tour.gallery)[0] || null
  const heroCaption =
    heroMedia &&
    typeof heroMedia === 'object' &&
    isUsableText(heroMedia.alt) &&
    !/^img[- ]?video$/i.test(String(heroMedia.alt))
      ? heroMedia.alt
      : routeChips.length > 0
        ? `${routeChips[routeChips.length - 1]} · ${wingSideCopy.journey.toLowerCase()}`
        : null
  const consultPrimaryFallback = getTourInquiryPath({
    intent: consultativeCtaIntent,
    siteCode,
    source: 'tour-detail-hero',
    tourId: tour.id,
    tourSlug: tour.slug,
    tourTitle: tour.title,
    discoveryContext: tour.discoveryContext,
  })
  const consultPrimaryHref = resolveConsultativeCtaHref({
    cmsHref: cta.href,
    fallbackPath: consultPrimaryFallback,
  })
  const consultSecondaryHref = getTourInquiryPath({
    intent: 'contact',
    siteCode,
    source: 'tour-detail-hero-contact',
    tourId: tour.id,
    tourSlug: tour.slug,
    tourTitle: tour.title,
    discoveryContext: tour.discoveryContext,
  })
  const consultPrimaryLabel = getConsultativePrimaryLabel({
    ctaLabel: cta.label,
    locale,
    override: nextDeparture?.ctaLabelOverride,
  })
  const consultSecondaryLabel = wingSideCopy.contact
  const heroEyebrow = [
    isUsableText(tour.market) ? String(tour.market).toUpperCase() : null,
    wingSideCopy.journey.toUpperCase(),
    durationLabel ? durationLabel.toUpperCase() : null,
  ]
    .filter(Boolean)
    .join(' · ')

  if (isConsultative) {
    const summaryParagraphs = splitSummaryParagraphs(tour.summary)
    const badgeGroups = getBadgeGroups(asArray<Record<string, any>>(tour.badges))
    // Single split surface (image | body) — no dual-panel gap on wide screens.
    return (
      <div
        className="lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-8"
        data-od-id="tour-hero"
        data-tour-presentation="consultative"
      >
        <div
          className="relative aspect-[3/2] overflow-hidden rounded-[24px] bg-muted sm:aspect-[16/10] sm:min-h-[18rem] lg:aspect-auto lg:min-h-[38rem]"
          data-od-id="tour-hero-media"
        >
          <Media
            fill
            imgClassName="object-cover"
            pictureClassName="absolute inset-0"
            priority
            resource={heroMedia}
            size="(max-width: 1024px) 100vw, 50vw"
          />
          {heroCaption ? (
            <span className="absolute bottom-4 left-4 max-w-[calc(100%-2rem)] rounded-full bg-white/90 px-3 py-2 text-xs font-medium text-foreground shadow-sm backdrop-blur">
              {heroCaption}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col justify-center gap-4 py-6 sm:py-7 lg:py-8">
          <p
            className="site-brand-kicker break-words text-xs font-semibold uppercase tracking-[0.18em]"
            data-od-id="tour-eyebrow"
            style={{ whiteSpace: 'normal' }}
          >
            {heroEyebrow}
          </p>
          <h1
            className="text-3xl font-semibold leading-tight md:text-[2.15rem] md:leading-[1.15]"
            data-od-id="tour-title"
          >
            {displayTitle}
          </h1>
          {summaryParagraphs[0] ? (
            <p
              className="text-sm leading-7 text-muted-foreground md:text-base"
              data-od-id="tour-summary"
            >
              {summaryParagraphs[0]}
            </p>
          ) : null}
          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            {durationLabel ? (
              <div
                className="rounded-[12px] border border-border/70 bg-background p-4"
                data-od-id="tour-duration"
              >
                <span className="block text-xs font-semibold uppercase text-muted-foreground">
                  {wingSideCopy.durationLabel}
                </span>
                <strong className="mt-1 block text-sm text-foreground">{durationLabel}</strong>
              </div>
            ) : null}
            {isUsableText(tour.destinationLabel) ? (
              <div
                className="rounded-[12px] border border-border/70 bg-background p-4"
                data-od-id="tour-destination"
              >
                <span className="block text-xs font-semibold uppercase text-muted-foreground">
                  {wingSideCopy.destination}
                </span>
                <strong className="mt-1 block text-sm text-foreground">
                  {tour.destinationLabel}
                </strong>
              </div>
            ) : isUsableText(tour.market) ? (
              <div
                className="rounded-[12px] border border-border/70 bg-background p-4"
                data-od-id="tour-destination"
              >
                <span className="block text-xs font-semibold uppercase text-muted-foreground">
                  {wingSideCopy.destination}
                </span>
                <strong className="mt-1 block text-sm capitalize text-foreground">
                  {tour.market}
                </strong>
              </div>
            ) : null}
          </div>
          {routeChips.length > 0 ? (
            <div data-od-id="tour-route">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                {wingSideCopy.route}
              </p>
              <div className="flex flex-wrap gap-2" aria-label={wingSideCopy.route}>
                {routeChips.map((chip) => (
                  <span
                    className="rounded-full border border-[color:var(--site-brand)]/20 bg-[color:var(--site-brand)]/8 px-3 py-1.5 text-xs font-semibold text-[var(--site-brand)]"
                    key={chip}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3" data-od-id="tour-hero-actions">
            <SiteLink
              className={`${TourPrimaryCtaClass} tour-cta-primary--pulse`}
              data-od-id="tour-primary-cta"
              href={consultPrimaryHref}
            >
              {consultPrimaryLabel}
            </SiteLink>
            <SiteLink
              className={TourGhostCtaClass}
              data-od-id="tour-secondary-cta"
              href={consultSecondaryHref}
            >
              {consultSecondaryLabel}
            </SiteLink>
          </div>
          {badgeGroups.trust.slice(0, 4).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {badgeGroups.trust.slice(0, 4).map((label, index) => (
                <span
                  className="inline-flex rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]"
                  key={`${label}-${index}`}
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  const galleryImages = asArray<Record<string, any>>(tour.gallery).filter(
    (item) => typeof item === 'object' && item !== null,
  )
  const heroImage = tour.heroMedia || galleryImages[0] || null
  const hasCollage = galleryImages.length >= 3

  const nextDepDate = nextDeparture?.departureDate ? new Date(nextDeparture.departureDate) : null
  const now = new Date()
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const hasFutureDeparture = Boolean(
    nextDeparture &&
      nextDepDate &&
      !Number.isNaN(nextDepDate.getTime()) &&
      new Date(Date.UTC(nextDepDate.getUTCFullYear(), nextDepDate.getUTCMonth(), nextDepDate.getUTCDate())).getTime() >= todayUtc.getTime(),
  )
  const summaryParagraphs = splitSummaryParagraphs(tour.summary)
  const badgeGroups = getBadgeGroups(asArray<Record<string, any>>(tour.badges))

  return (
    <div className="space-y-6" data-tour-presentation="retail">
      {/* Top Meta Row: Tour Code, Duration, Departure City, Flight / Airline */}
      <div className="flex flex-wrap items-center gap-2.5">
        {tour.tourCode ? (
          <span className="font-mono text-xs font-semibold uppercase tracking-wider rounded-md border border-border/80 bg-muted/60 px-2.5 py-1 text-foreground">
            {tour.tourCode}
          </span>
        ) : null}
        {durationLabel ? (
          <span className="rounded-md border border-border/70 bg-background px-3 py-1 text-xs font-medium text-foreground">
            {durationLabel}
          </span>
        ) : null}
        {isUsableText(tour.market) ? (
          <span className="rounded-md border border-border/70 bg-background px-3 py-1 text-xs font-medium capitalize text-muted-foreground">
            {tour.market}
          </span>
        ) : null}
        {hasFutureDeparture && nextDeparture?.departureCity ? (
          <span className="rounded-md border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            Khởi hành: {nextDeparture.departureCity}
          </span>
        ) : null}
        {hasFutureDeparture && nextDeparture?.airline ? (
          <span className="rounded-md border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            Bay {nextDeparture.airline}
            {nextDeparture?.flightNumber ? ` (${nextDeparture.flightNumber})` : ''}
          </span>
        ) : null}
      </div>

      {/* Hero Media & Summary Presentation */}
      <div className="space-y-4 min-w-0">
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl md:text-4xl text-foreground">
          {tour.title}
        </h1>

        {summaryParagraphs[0] ? (
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            {summaryParagraphs[0]}
          </p>
        ) : null}

        {/* Route Chips in retail mode */}
        {routeChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-1" aria-label="Tuyến hành trình" data-od-id="tour-route-chips">
            <span className="text-xs font-medium text-muted-foreground mr-1">Tuyến:</span>
            {routeChips.map((chip, idx) => (
              <span
                className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium text-foreground"
                key={`${chip}-${idx}`}
              >
                {chip}
              </span>
            ))}
          </div>
        ) : null}

        {/* Media Presentation: Collage if >=3 images, otherwise single hero frame */}
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-muted shadow-sm">
          {hasFutureDeparture && nextDeparture?.commerceVerified && nextDeparture?.availabilityStatus !== 'sold-out' && normalizeGovernedTourPrice({ currency: nextDeparture?.currency, value: nextDeparture?.priceFrom }) ? (
            <div className="absolute inset-x-3 top-3 z-10 flex justify-start">
              <PromotionBadge label={nextDeparture?.promoLabel} />
            </div>
          ) : null}
          {hasCollage ? (
            <div className="grid grid-cols-3 gap-1.5 aspect-[16/10] sm:aspect-[16/9]" data-od-id="tour-gallery-collage">
              <div className="relative col-span-2 h-full bg-muted">
                <Media
                  fill
                  imgClassName="object-cover"
                  pictureClassName="absolute inset-0"
                  priority
                  resource={heroImage}
                  size="(max-width: 768px) 67vw, (max-width: 1280px) 55vw, 850px"
                />
              </div>
              <div className="grid grid-rows-2 gap-1.5 h-full">
                <div className="relative h-full bg-muted">
                  <Media
                    fill
                    imgClassName="object-cover"
                    pictureClassName="absolute inset-0"
                    resource={galleryImages[1] as any}
                    size="(max-width: 768px) 33vw, (max-width: 1280px) 25vw, 420px"
                  />
                </div>
                <div className="relative h-full bg-muted">
                  <Media
                    fill
                    imgClassName="object-cover"
                    pictureClassName="absolute inset-0"
                    resource={galleryImages[2] as any}
                    size="(max-width: 768px) 33vw, (max-width: 1280px) 25vw, 420px"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="relative aspect-[16/10] sm:aspect-[16/9] bg-muted" data-od-id="tour-hero-fallback">
              <Media
                fill
                imgClassName="object-cover"
                pictureClassName="absolute inset-0"
                priority
                resource={heroImage}
                size="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 1200px"
              />
            </div>
          )}
        </div>

        {/* Badges / Trust signals */}
        {badgeGroups.trust.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {badgeGroups.trust.slice(0, 6).map((label, index) => (
              <span
                className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                key={`${label}-${index}`}
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

const TourFactGrid = ({
  locale = 'vi',
  presentation = 'retail',
  tour,
}: {
  locale?: SupportedLocaleCode
  presentation?: TourDetailPresentation
  tour: Record<string, any>
}) => {
  const isConsultative = presentation === 'consultative'
  const durationLabel = getDurationLabel(tour.durationDays, tour.durationNights, locale)
  const wingSideCopy = getWingSideTourCopy(locale)
  const chrome = getConsultativeChrome(locale)
  const labels = isConsultative
    ? {
        description: chrome.factsDescription,
        duration: wingSideCopy.durationLabel,
        eyebrow: chrome.factsEyebrow,
        group:
          locale === 'vi'
            ? 'Đoàn khách'
            : locale === 'it'
              ? 'Tipo di gruppo'
              : locale === 'es'
                ? 'Tipo de grupo'
                : locale === 'pt'
                  ? 'Perfil do grupo'
                  : 'Group style',
        hotel: wingSideCopy.accommodation,
        meals: wingSideCopy.meals,
        operator: chrome.planningNotes,
        route: wingSideCopy.route,
        title: chrome.factsTitle,
      }
    : {
        description:
          'Thời lượng, tuyến điểm, lưu trú và nhịp hành trình để bạn cân nhắc trước khi trao đổi với chuyên viên.',
        duration: 'Thời lượng',
        eyebrow: 'Tổng quan chuyến đi',
        group: 'Đoàn khách',
        hotel: 'Khách sạn',
        meals: 'Bữa ăn',
        operator: 'Lưu ý lập kế hoạch',
        route: 'Tuyến điểm',
        title: 'Thông tin cần biết trước',
      }

  return (
    <Panel data-od-id="tour-facts" id="facts">
      <SectionHeading
        eyebrow={labels.eyebrow}
        title={labels.title}
        description={labels.description}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          [labels.duration, durationLabel],
          [labels.route, tour.factSummary?.routeSummary],
          [labels.meals, tour.factSummary?.mealsSummary || tour.servicesSummary?.mealsSummary],
          [labels.group, tour.factSummary?.groupSizeSummary],
          [labels.operator, tour.factSummary?.operatorNote],
          [labels.hotel, tour.factSummary?.hotelSummary || tour.servicesSummary?.hotelSummary],
        ].map(([label, value], index) =>
          isUsableText(value) ? (
            <div
              className="rounded-[24px] border border-border/60 bg-muted/35 p-5"
              data-od-id={
                [
                  'tour-fact-duration',
                  'tour-fact-route',
                  'tour-fact-meals',
                  'tour-fact-group',
                  'tour-fact-operations',
                  'tour-fact-lodging',
                ][index]
              }
              key={label}
            >
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
              <p className="mt-2 text-sm font-medium leading-7 text-foreground">{value}</p>
            </div>
          ) : null,
        )}
      </div>
    </Panel>
  )
}

const TourReviewsProofSection = ({
  locale = 'vi',
  presentation = 'retail',
  tour,
}: {
  locale?: SupportedLocaleCode
  presentation?: TourDetailPresentation
  tour: Record<string, any>
}) => {
  const snapshot = tour.reviewSnapshot || {}
  const quotes = asArray<Record<string, any>>(snapshot.proofQuotes)
  const isEn = presentation === 'consultative' && locale === 'en'

  if (!snapshot.score && quotes.length === 0) {
    return null
  }

  return (
    <Panel id="reviews">
      <SectionHeading
        eyebrow={isEn ? 'Reviews & trust' : 'Đánh giá & trust'}
        title={isEn ? 'Why guests choose this journey' : 'Khách chốt tour này vì điều gì'}
        description={
          snapshot.whyGuestsChoose ||
          (isEn
            ? 'Real guest signals and reasons people choose this private itinerary.'
            : 'Đánh giá thực tế, tín hiệu trust và lý do khách chọn line này được gom lại để người xem quyết nhanh hơn.')
        }
      />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="rounded-[28px] border border-border/60 bg-muted/25 p-5">
          <p className="text-5xl font-semibold text-foreground">
            {snapshot.score ? Number(snapshot.score).toFixed(1) : '--'}
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {snapshot.sourceLabel || (isEn ? 'Guest reviews' : 'Đánh giá khách đã đi')}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {snapshot.reviewCount || 0} review • {snapshot.travelerCount || 0}+{' '}
            {isEn ? 'guests' : 'khách đã trải nghiệm'}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quotes.map((quote, index) => (
            <div
              className="rounded-[24px] border border-border/60 bg-background p-5"
              key={`${quote.author}-${index}`}
            >
              <p className="text-sm leading-7 text-muted-foreground">“{quote.quote}”</p>
              {quote.author ? (
                <p className="mt-4 text-sm font-semibold text-foreground">{quote.author}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

const TourWhyChooseSection = ({
  locale = 'vi',
  presentation = 'retail',
  tour,
}: {
  locale?: SupportedLocaleCode
  presentation?: TourDetailPresentation
  tour: Record<string, any>
}) => {
  const highlights = asArray<Record<string, any>>(tour.highlights)
  const isEn = presentation === 'consultative' && locale === 'en'

  if (highlights.length === 0) {
    return null
  }

  return (
    <Panel id="why-choose">
      <SectionHeading
        eyebrow={isEn ? 'Highlights' : 'Điểm nổi bật'}
        title={isEn ? 'Why this itinerary works' : 'Vì sao khách dễ chọn chương trình này'}
        description={null}
      />
      <div className="grid gap-4 md:grid-cols-3">
        {highlights.map((item, index) => (
          <div
            className="rounded-[24px] border border-border/60 bg-muted/35 p-5"
            key={`${item.title}-${index}`}
          >
            <h3 className="text-lg font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </Panel>
  )
}

const TourJourneyGallerySection = ({
  locale,
  tour,
}: {
  locale: SupportedLocaleCode
  tour: Record<string, any>
}) => {
  const chrome = getConsultativeChrome(locale)
  const wingSideCopy = getWingSideTourCopy(locale)
  const gallery = asArray<Record<string, any>>(tour.gallery)
    .filter((item) => typeof item === 'object')
    .slice(0, 5)
  if (gallery.length === 0) return null

  return (
    <Panel data-od-id="tour-gallery" id="gallery">
      <SectionHeading
        eyebrow={wingSideCopy.gallery}
        title={chrome.galleryTitle}
        description={chrome.galleryDescription}
      />
      <div className="grid auto-rows-[9rem] grid-cols-2 gap-3 sm:auto-rows-[11rem] md:grid-cols-4">
        {gallery.map((media, index) => (
          <div
            className={`relative overflow-hidden rounded-[18px] bg-muted ${index === 0 ? 'row-span-2 md:col-span-2' : ''}`}
            data-od-id={`tour-gallery-${index + 1}`}
            key={media.id || media.url || index}
          >
            <Media
              fill
              imgClassName="object-cover"
              pictureClassName="absolute inset-0"
              resource={media as MediaType}
              size={index === 0 ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 50vw, 25vw"}
            />
          </div>
        ))}
      </div>
    </Panel>
  )
}

const TourConsultationSection = ({
  enquiryForm,
  locale,
  siteCode,
  tour,
}: {
  enquiryForm?: FormType | null
  locale: SupportedLocaleCode
  siteCode?: null | string
  tour: Record<string, any>
}) => {
  const chrome = getConsultativeChrome(locale)
  const wingSideCopy = getWingSideTourCopy(locale)
  const href = getTourInquiryPath({
    intent: 'inquiry',
    siteCode: resolveTourSiteCode(siteCode, 'consultative'),
    source: 'tour-detail-enquiry',
    tourId: tour.id,
    tourSlug: tour.slug,
    tourTitle: tour.title,
    discoveryContext: tour.discoveryContext,
  })
  const context = {
    discovery: tour.discoveryContext?.discovery,
    source: 'tour-detail-enquiry',
    tourId: tour.id,
    tourSlug: tour.slug,
    tourTitle: tour.title,
  }
  return (
    <Panel id="enquire">
      <div data-od-id="tour-enquiry">
        <SectionHeading
          eyebrow={chrome.enquiryEyebrow}
          title={wingSideCopy.request}
          description={chrome.enquiryDescription}
        />
        <div className="mt-5 rounded-[20px] border border-border/70 bg-muted/20 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {chrome.enquiryContext}
          </p>
          <p className="mt-2 font-semibold text-foreground">{tour.title}</p>
        </div>
        {enquiryForm ? (
          <div className="tour-enquiry-form mt-6">
            <FormBlock
              anchorId={null}
              enableIntro={false}
              form={enquiryForm}
              formOdId="tour-enquiry-form"
              presentation="minimal"
              submitOdId="tour-enquiry-submit"
            />
            <TourEnquiryContextBridge context={context} rootSelector=".tour-enquiry-form" />
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap gap-3">
            <SiteLink className={`${TourPrimaryCtaClass} tour-cta-primary--pulse`} href={href}>
              {wingSideCopy.request}
            </SiteLink>
          </div>
        )}
        <SiteLink className={`${TourGhostCtaClass} mt-4`} href={href}>
          {wingSideCopy.contact}
        </SiteLink>
      </div>
    </Panel>
  )
}

const TourRouteVisualSection = ({
  locale = 'vi',
  presentation = 'retail',
  tour,
}: {
  locale?: SupportedLocaleCode
  presentation?: TourDetailPresentation
  tour: Record<string, any>
}) => {
  const routeStops = asArray<Record<string, any>>(tour.routeViz?.stops)
  const travelLegs = asArray<Record<string, any>>(tour.routeViz?.travelLegs)
  const mapImage = tour.routeViz?.mapImage
  const summaryParagraphs = splitSummaryParagraphs(tour.summary)
  const wingSideCopy = getWingSideTourCopy(locale)

  return (
    <Panel data-od-id="tour-overview" id="route">
      <SectionHeading
        eyebrow={presentation === 'consultative' ? wingSideCopy.overview : 'Hành trình trực quan'}
        title={presentation === 'consultative' ? wingSideCopy.overview : 'Nhịp hành trình thực tế'}
        description={isUsableText(tour.routeViz?.routeCaption) ? tour.routeViz.routeCaption : null}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-border/60 bg-muted/20 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {presentation === 'consultative' ? wingSideCopy.route : 'Tóm tắt tuyến điểm'}
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {tour.factSummary?.routeSummary || tour.title}
            </p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {summaryParagraphs[1] || summaryParagraphs[0] || tour.summary}
            </p>
          </div>
          <div className="grid gap-4">
            {routeStops.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {routeStops
                  .slice()
                  .sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
                  .map((stop, index) => (
                    <div
                      className="rounded-[24px] border border-border/60 bg-background p-4"
                      key={`${stop.label}-${index}`}
                    >
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {wingSideCopy.leg} {String(index + 1).padStart(2, '0')}
                      </p>
                      <p className="mt-2 text-base font-semibold text-foreground">{stop.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {stop.type && stop.type !== 'sightseeing'
                          ? stop.type
                          : wingSideCopy.journeyStop}
                      </p>
                    </div>
                  ))}
              </div>
            ) : null}
            {travelLegs.length > 0 ? (
              <div className="rounded-[24px] border border-border/60 bg-background p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {presentation === 'consultative' ? wingSideCopy.transport : 'Chặng di chuyển'}
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {travelLegs.map((leg, index) => (
                    <div
                      className="rounded-[20px] bg-muted/35 p-4"
                      key={`${leg.from}-${leg.to}-${index}`}
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {leg.from} → {leg.to}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {leg.mode ||
                          (presentation === 'consultative' ? wingSideCopy.transport : 'Theo tuyến')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="relative min-h-80 overflow-hidden rounded-[28px] border border-border/60 bg-muted">
          {mapImage ? (
            <Media
              fill
              imgClassName="object-cover"
              pictureClassName="absolute inset-0"
              resource={mapImage}
            />
          ) : (
            <div className="flex h-full flex-col justify-center gap-4 p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {presentation === 'consultative' ? wingSideCopy.destination : 'Các điểm chính'}
              </p>
              <div className="flex flex-wrap gap-3">
                {routeStops.length > 0
                  ? routeStops.map((stop, index) => (
                      <React.Fragment key={`${stop.label}-${index}`}>
                        <span className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground">
                          {stop.label}
                        </span>
                        {index < routeStops.length - 1 ? (
                          <span className="self-center text-muted-foreground">→</span>
                        ) : null}
                      </React.Fragment>
                    ))
                  : summaryParagraphs.slice(0, 2).map((paragraph, index) => (
                      <p className="text-sm leading-7 text-muted-foreground" key={index}>
                        {paragraph}
                      </p>
                    ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}

const TourItinerarySection = ({
  locale = 'vi',
  presentation = 'retail',
  tour,
}: {
  locale?: SupportedLocaleCode
  presentation?: TourDetailPresentation
  tour: Record<string, any>
}) => {
  const isConsultative = presentation === 'consultative'
  const itineraryDays = asArray<Record<string, any>>(tour.itineraryDays)
  const groupedThemeCount = new Set(itineraryDays.map((day) => day.route).filter(Boolean)).size
  const isEn = locale === 'en'
  const itineraryPdf = asDoc<Record<string, any>>(tour.itineraryPdf)
  const itineraryPdfURL =
    itineraryPdf?.mimeType === 'application/pdf' && typeof itineraryPdf.url === 'string'
      ? itineraryPdf.url
      : null
  const wingSideCopy = getWingSideTourCopy(locale)
  const heading = isConsultative
    ? { eyebrow: wingSideCopy.itinerary, title: wingSideCopy.itinerary }
    : isEn
      ? { eyebrow: 'Itinerary', title: 'Day-by-day journey' }
      : { eyebrow: 'Lịch trình', title: 'Lịch trình theo ngày' }

  const teaser = (summary?: null | string) => {
    const text = String(summary || '').trim()
    if (!text) return null
    if (text.length <= 140) return text
    return `${text.slice(0, 137).trim()}…`
  }

  const extractLexicalText = (node: unknown): string => {
    if (!node || typeof node !== 'object') return ''
    if ('text' in node && typeof (node as { text: unknown }).text === 'string') {
      return (node as { text: string }).text
    }
    if ('children' in node && Array.isArray((node as { children: unknown[] }).children)) {
      return (node as { children: unknown[] }).children.map(extractLexicalText).join(' ')
    }
    return ''
  }

  const getItineraryDayTeaser = (day: Record<string, any>) => {
    if (isUsableText(day.summary)) return teaser(day.summary)
    if (day.content && typeof day.content === 'object') {
      const plain = extractLexicalText(day.content.root).trim()
      if (plain) return teaser(plain)
    }
    return null
  }

  const renderItineraryDayContent = (day: Record<string, any>) => {
    const hasRichText =
      day.content &&
      typeof day.content === 'object' &&
      Array.isArray(day.content.root?.children) &&
      extractLexicalText(day.content.root).trim().length > 0

    if (hasRichText) {
      return (
        <div className="mt-3 text-sm leading-7 text-muted-foreground prose prose-sm max-w-none [&_p]:my-2 [&_ul]:my-2 [&_li]:my-0.5">
          <RichText data={day.content} enableGutter={false} />
        </div>
      )
    }

    if (isUsableText(day.summary)) {
      return (
        <p className="mt-3 text-sm leading-7 text-muted-foreground whitespace-pre-line">
          {day.summary}
        </p>
      )
    }

    return null
  }

  if (isConsultative) {
    return (
      <Panel className="scroll-mt-28 md:scroll-mt-24" data-od-id="tour-itinerary" id="itinerary">
        <SectionHeading eyebrow={heading.eyebrow} title={heading.title} description={null} />
        <div className="tour-itinerary-accordion space-y-2 sm:space-y-3">
          {itineraryDays.map((day, index) => {
            const gallery = asArray(day.gallery)
            const dayId = `itinerary-day-${day.dayNumber || index + 1}`
            const panelId = `${dayId}-panel`
            const infoItems = compactInfoItems([
              [wingSideCopy.meals, day.meals],
              [wingSideCopy.transport, day.transport],
              [wingSideCopy.accommodation, day.accommodation],
              [wingSideCopy.sleepStandard, day.sleepingStandard],
            ])

            return (
              <TourItineraryDayDetails
                className="tour-itinerary-day group rounded-[22px] border border-border/60 bg-muted/15 open:bg-card/90 sm:rounded-[28px]"
                initiallyOpen={index === 0}
                key={`${day.dayNumber}-${index}`}
              >
                <summary
                  aria-controls={panelId}
                  className="flex cursor-pointer list-none items-start gap-3 rounded-[22px] px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--site-accent)] sm:gap-4 sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden"
                  data-od-id={dayId}
                  id={dayId}
                >
                  <div className="shrink-0 rounded-[16px] bg-muted/50 px-3 py-2 text-center sm:rounded-[20px] sm:px-4 sm:py-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {wingSideCopy.dayLabel}
                    </p>
                    <p className="text-xl font-semibold sm:text-2xl">
                      {String(day.dayNumber || index + 1).padStart(2, '0')}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-base font-semibold text-foreground sm:text-lg">
                      {day.title}
                    </h3>
                    {getItineraryDayTeaser(day) ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground group-open:hidden">
                        {getItineraryDayTeaser(day)}
                      </p>
                    ) : null}
                    <div className="mt-2">
                      <MealChips meals={day.meals} />
                    </div>
                  </div>
                  <span
                    aria-hidden
                    className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  >
                    ▾
                  </span>
                </summary>
                <div
                  aria-labelledby={dayId}
                  className="border-t border-border/50 px-3 pb-4 pt-1 sm:px-5 sm:pb-5"
                  id={panelId}
                >
                  <div
                    className={`grid gap-4 ${gallery.length > 0 ? 'lg:grid-cols-[1fr_280px]' : ''}`}
                  >
                    <div>
                      {day.dayTheme ? (
                        <p className="text-sm font-semibold text-[var(--site-brand)]">
                          {day.dayTheme}
                        </p>
                      ) : null}
                      {isUsableText(day.route) ? (
                        <p className="mt-1 text-sm font-medium text-foreground">{day.route}</p>
                      ) : null}
                      {renderItineraryDayContent(day)}
                      {day.dayHighlight ? (
                        <div className="mt-4 rounded-[20px] border border-border/60 bg-background p-4">
                          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                            {isEn ? 'Highlight' : 'Điểm nhấn'}
                          </p>
                          <p className="mt-2 text-sm leading-7 text-foreground whitespace-pre-line">
                            {day.dayHighlight}
                          </p>
                        </div>
                      ) : null}
                      {infoItems.length > 0 ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {infoItems.map(([label, value]) => (
                            <div
                              className="rounded-[18px] border border-border/60 bg-background p-3"
                              key={label}
                            >
                              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                {label}
                              </p>
                              <p className="mt-1 text-sm font-medium leading-6 text-foreground">
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {[day.equipmentNote, day.notes].some(isUsableText) ? (
                        <p className="mt-4 text-sm leading-7 text-muted-foreground whitespace-pre-line">
                          {[day.equipmentNote, day.notes].filter(isUsableText).join('\n')}
                        </p>
                      ) : null}
                    </div>
                    {gallery.length > 0 ? (
                      <div className="hidden space-y-3 lg:block">
                        <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] border border-border/60 bg-muted">
                          <Media
                            fill
                            imgClassName="object-cover"
                            pictureClassName="absolute inset-0"
                            resource={gallery[0] as any}
                            size="(max-width: 1024px) 100vw, 360px"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </TourItineraryDayDetails>
            )
          })}
        </div>
      </Panel>
    )
  }

  return (
    <Panel className="scroll-mt-48 lg:scroll-mt-36" id="itinerary">
      <SectionHeading eyebrow={heading.eyebrow} title={heading.title} description={null} />
      <div className="mb-5">
        {itineraryPdfURL ? (
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold text-foreground no-underline hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)]"
            download
            href={itineraryPdfURL}
          >
            {isEn ? 'Download tour itinerary (PDF)' : 'Tải lịch trình tour (file PDF)'}
          </a>
        ) : (
          <button
            aria-disabled="true"
            className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-full border border-border px-5 text-sm font-semibold text-muted-foreground opacity-70"
            disabled
            title={isEn ? 'The itinerary PDF is being prepared.' : 'Lịch trình PDF đang được cập nhật.'}
            type="button"
          >
            {isEn ? 'Download tour itinerary (PDF)' : 'Tải lịch trình tour (file PDF)'}
          </button>
        )}
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {compactInfoItems([
          [
            locale === 'en' ? 'Duration' : 'Thời lượng',
            getDurationLabel(tour.durationDays, tour.durationNights, locale),
          ],
          [
            locale === 'en' ? 'Clusters' : 'Cụm điểm đến',
            groupedThemeCount
              ? locale === 'en'
                ? `${groupedThemeCount} clusters`
                : `${groupedThemeCount} cụm`
              : null,
          ],
          [
            locale === 'en' ? 'Best for' : 'Phù hợp',
            getBadgeGroups(asArray<Record<string, any>>(tour.badges)).suitable.join(' · ') || null,
          ],
        ]).map(([label, value]) => (
          <div className="rounded-[24px] border border-border/60 bg-muted/25 p-5" key={label}>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            <p className="mt-2 text-sm font-semibold leading-7 text-foreground">{value}</p>
          </div>
        ))}
      </div>
      <TourItineraryAccordion dayCount={itineraryDays.length} isEn={isEn}>
        <div className="tour-itinerary-accordion space-y-2 sm:space-y-3">
          {itineraryDays.map((day, index) => {
            const gallery = asArray(day.gallery)
            const infoItems = compactInfoItems([
              ['Bữa ăn', day.meals],
              ['Di chuyển', day.transport],
              ['Lưu trú', day.accommodation],
              ['Tiêu chuẩn nghỉ', day.sleepingStandard],
            ])
            const dayId = `retail-itinerary-day-${day.dayNumber || index + 1}`
            const panelId = `${dayId}-panel`

            return (
              <TourItineraryDayDetails
                className="tour-itinerary-day group rounded-[22px] border border-border/60 bg-muted/15 open:bg-card/90 sm:rounded-[28px]"
                initiallyOpen={index === 0}
                key={`${day.dayNumber}-${index}`}
              >
                <summary
                  aria-controls={panelId}
                  className="flex cursor-pointer list-none items-start gap-3 rounded-[22px] px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--site-accent)] sm:gap-4 sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden"
                  data-od-id={dayId}
                  id={dayId}
                >
                  <div className="shrink-0 rounded-[16px] bg-muted/50 px-3 py-2 text-center sm:rounded-[20px] sm:px-4 sm:py-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {isEn ? 'Day' : 'Ngày'}
                    </p>
                    <p className="text-xl font-semibold sm:text-2xl">
                      {String(day.dayNumber || index + 1).padStart(2, '0')}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-base font-semibold text-foreground sm:text-lg">
                      {day.title}
                    </h3>
                    {isUsableText(day.route) ? (
                      <p className="mt-1 text-sm font-medium text-foreground">{day.route}</p>
                    ) : null}
                    {getItineraryDayTeaser(day) ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground group-open:hidden">
                        {getItineraryDayTeaser(day)}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5" data-od-id={`${dayId}-pills`}>
                      <MealChips meals={day.meals} />
                      {isUsableText(day.accommodation) ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground">
                          <span aria-hidden="true">🏨</span>
                          <span className="line-clamp-1">{day.accommodation}</span>
                        </span>
                      ) : isUsableText(day.sleepingStandard) ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground">
                          <span aria-hidden="true">🏨</span>
                          <span className="line-clamp-1">{day.sleepingStandard}</span>
                        </span>
                      ) : null}
                      {isUsableText(day.transport) ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground">
                          <span aria-hidden="true">🚌</span>
                          <span className="line-clamp-1">{day.transport}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <span
                    aria-hidden
                    className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  >
                    ▾
                  </span>
                </summary>
                <div
                  aria-labelledby={dayId}
                  className="border-t border-border/50 px-3 pb-4 pt-4 sm:px-5 sm:pb-5"
                  id={panelId}
                >
                  <div className={`grid gap-5 ${gallery.length > 0 ? 'xl:grid-cols-[1fr_260px]' : ''}`}>
                    <div>
                      {isUsableText(day.dayTheme) ? (
                        <p className="text-sm font-semibold text-[var(--site-brand)]">{day.dayTheme}</p>
                      ) : null}
                      {isUsableText(day.route) ? (
                        <p className="mt-2 text-sm font-medium text-foreground">{day.route}</p>
                      ) : null}
                      {renderItineraryDayContent(day)}
                      {isUsableText(day.dayHighlight) ? (
                        <div className="mt-4 rounded-[20px] border border-border/60 bg-background p-4">
                          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                            {isEn ? 'Day highlight' : 'Điểm nhấn bán hàng'}
                          </p>
                          <p className="mt-2 text-sm leading-7 text-foreground whitespace-pre-line">{day.dayHighlight}</p>
                        </div>
                      ) : null}
                      {infoItems.length > 0 ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {infoItems.map(([label, value]) => (
                            <div
                              className="rounded-[20px] border border-border/60 bg-background p-4"
                              key={label}
                            >
                              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                {label}
                              </p>
                              <p className="mt-2 text-sm font-medium leading-7 text-foreground">
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {[day.equipmentNote, day.notes].some(isUsableText) ? (
                        <p className="mt-4 text-sm leading-7 text-muted-foreground whitespace-pre-line">
                          {[day.equipmentNote, day.notes].filter(isUsableText).join('\n')}
                        </p>
                      ) : null}
                    </div>
                    {gallery.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          {isEn ? 'Photos of the day' : 'Hình ảnh trong ngày'}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                          {gallery.slice(0, 3).map((item, imageIndex) => (
                            <div
                              className="relative aspect-[4/3] overflow-hidden rounded-[22px] border border-border/60 bg-muted"
                              key={imageIndex}
                            >
                              <Media
                                fill
                                imgClassName="object-cover"
                                pictureClassName="absolute inset-0"
                                resource={item as any}
                                size="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 360px"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </TourItineraryDayDetails>
            )
          })}
        </div>
      </TourItineraryAccordion>
    </Panel>
  )
}

const TourServicesSection = ({
  locale = 'vi',
  presentation = 'retail',
  tour,
}: {
  locale?: SupportedLocaleCode
  presentation?: TourDetailPresentation
  tour: Record<string, any>
}) => {
  const isConsultative = presentation === 'consultative'
  const isEn = locale === 'en'
  const wingSideCopy = getWingSideTourCopy(locale)
  const includes = asArray<Record<string, any>>(tour.includes)
  const excludes = asArray<Record<string, any>>(tour.excludes)
  const accommodationStops = collectAccommodationStops(
    asArray<Record<string, any>>(tour.itineraryDays),
  )
  const servicesSummary = tour.servicesSummary || {}
  const peakNote =
    servicesSummary.peakNote ||
    servicesSummary.peakSurchargeNote ||
    tour.factSummary?.peakNote ||
    null

  if (isConsultative) {
    return (
      <Panel className="scroll-mt-48 lg:scroll-mt-36" data-od-id="tour-services" id="services">
        <SectionHeading
          eyebrow={`${wingSideCopy.includes} & ${wingSideCopy.excludes}`}
          title={`${wingSideCopy.includes} — ${wingSideCopy.excludes}`}
          description={null}
        />
        <div className="grid gap-5 md:grid-cols-2">
          <div
            className="rounded-[24px] border border-border/60 bg-muted/20 p-5"
            data-od-id="tour-included"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--site-brand)]">
              {wingSideCopy.includes}
            </p>
            <ul className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
              {includes.length > 0 ? (
                includes.map((item, index) => <li key={`${item.label}-${index}`}>{item.label}</li>)
              ) : (
                <li>{isEn ? 'Confirmed on consultation.' : 'Xác nhận khi tư vấn.'}</li>
              )}
            </ul>
          </div>
          <div
            className="rounded-[24px] border border-border/60 bg-muted/20 p-5"
            data-od-id="tour-excluded"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {wingSideCopy.excludes}
            </p>
            <ul className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
              {excludes.length > 0 ? (
                excludes.map((item, index) => <li key={`${item.label}-${index}`}>{item.label}</li>)
              ) : (
                <li>{isEn ? 'Confirmed on consultation.' : 'Xác nhận khi tư vấn.'}</li>
              )}
            </ul>
          </div>
        </div>
        <div
          aria-hidden={!isUsableText(peakNote)}
          className="mt-5 rounded-[22px] border border-border/60 bg-background p-4"
          data-od-id="tour-surcharge"
          hidden={!isUsableText(peakNote)}
        >
          {isUsableText(peakNote) ? (
            <>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {isEn ? 'Peak / surcharge note' : 'Lưu ý mùa cao điểm'}
              </p>
              <p className="mt-2 text-sm leading-7 text-foreground">{peakNote}</p>
            </>
          ) : null}
        </div>
        {(servicesSummary.hotelSummary ||
          tour.factSummary?.hotelSummary ||
          servicesSummary.transportSummary ||
          servicesSummary.mealsSummary) && (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {servicesSummary.hotelSummary || tour.factSummary?.hotelSummary ? (
              <div className="rounded-[22px] border border-border/60 bg-background p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {wingSideCopy.accommodation}
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {servicesSummary.hotelSummary || tour.factSummary?.hotelSummary}
                </p>
              </div>
            ) : null}
            {servicesSummary.transportSummary || servicesSummary.mealsSummary ? (
              <div className="rounded-[22px] border border-border/60 bg-background p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {wingSideCopy.transport} & {wingSideCopy.meals}
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {[servicesSummary.transportSummary, servicesSummary.mealsSummary]
                    .filter(Boolean)
                    .join(' ')}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </Panel>
    )
  }

  return (
    <Panel className="scroll-mt-48 lg:scroll-mt-36" data-od-id="tour-services" id="services">
      <SectionHeading
        eyebrow="Dịch vụ & lưu trú"
        title="Giá đã gồm gì, ngủ ở đâu, lưu ý điều hành nào cần biết"
        description={null}
      />
      <div className="space-y-6">
        {/* Row 1: 2-column compare grid across full main content width */}
        <div className="grid gap-5 sm:grid-cols-2">
          {(() => {
            const usableIncludes = includes.filter((item) => isUsableText(item.label))
            return (
              <div
                className="rounded-[24px] border border-border/60 bg-muted/20 p-5 sm:p-6"
                data-od-id="tour-services-included"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                    {isEn ? 'Services included' : 'Giá đã gồm'}
                  </p>
                </div>
                <ul className="mt-3.5 space-y-3 text-sm leading-7 text-muted-foreground">
                  {usableIncludes.length > 0 ? (
                    usableIncludes.map((item, index) => (
                      <li className="flex items-start gap-2" key={`${item.label}-${index}`}>
                        <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                        <span>{item.label}</span>
                      </li>
                    ))
                  ) : (
                    <li>{isEn ? 'Confirmed on consultation.' : 'Xác nhận khi tư vấn.'}</li>
                  )}
                </ul>
              </div>
            )
          })()}
          {(() => {
            const usableExcludes = excludes.filter((item) => isUsableText(item.label))
            return (
              <div
                className="rounded-[24px] border border-border/60 bg-muted/20 p-5 sm:p-6"
                data-od-id="tour-services-excluded"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
                    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <line x1="5" x2="19" y1="12" y2="12" />
                    </svg>
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                    {isEn ? 'Not included' : 'Chi phí tự túc'}
                  </p>
                </div>
                <ul className="mt-3.5 space-y-3 text-sm leading-7 text-muted-foreground">
                  {usableExcludes.length > 0 ? (
                    usableExcludes.map((item, index) => (
                      <li className="flex items-start gap-2" key={`${item.label}-${index}`}>
                        <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                        <span>{item.label}</span>
                      </li>
                    ))
                  ) : (
                    <li>{isEn ? 'Confirmed on consultation.' : 'Xác nhận khi tư vấn.'}</li>
                  )}
                </ul>
              </div>
            )
          })()}
        </div>

        {/* Row 2: Hotel & Transport */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div
            className="rounded-[24px] border border-border/60 bg-background p-5"
            data-od-id="tour-services-hotel"
          >
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {isEn ? 'Hotel / Accommodation' : 'Khách sạn / nghỉ đêm'}
            </p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {(isUsableText(servicesSummary.hotelSummary) && servicesSummary.hotelSummary) ||
                (isUsableText(tour.factSummary?.hotelSummary) && tour.factSummary?.hotelSummary) ||
                (isEn
                  ? 'Accommodation standards confirmed per program.'
                  : 'Tiêu chuẩn lưu trú được xác nhận theo từng chương trình.')}
            </p>
          </div>
          <div
            className="rounded-[24px] border border-border/60 bg-background p-5"
            data-od-id="tour-services-transport"
          >
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {isEn ? 'Transport & Meals' : 'Di chuyển & ăn uống'}
            </p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {[
                isUsableText(servicesSummary.transportSummary) ? servicesSummary.transportSummary : null,
                isUsableText(servicesSummary.mealsSummary) ? servicesSummary.mealsSummary : null,
              ]
                .filter(Boolean)
                .join(' ') ||
                (isEn
                  ? 'Per detailed itinerary and direct consultation.'
                  : 'Theo lịch trình chi tiết và tư vấn cụ thể.')}
            </p>
          </div>
        </div>

        {/* Row 3: Overnight stops & Operator notes */}
        {(accommodationStops.length > 0 ||
          isUsableText(servicesSummary.operatorNotes) ||
          asArray<Record<string, any>>(servicesSummary.notes).filter((n) => isUsableText(n.label)).length > 0) && (
          <div className="grid gap-5 sm:grid-cols-2">
            {accommodationStops.length > 0 ? (
              <div
                className="rounded-[24px] border border-border/60 bg-background p-5"
                data-od-id="tour-services-stops"
              >
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {isEn ? 'Overnight stops in tour' : 'Điểm ngủ đêm trong tour'}
                </p>
                <div className="mt-4 grid gap-3">
                  {accommodationStops.map((stop, index) => (
                    <div
                      className="rounded-[20px] bg-muted/25 p-4"
                      key={`${stop.accommodation}-${index}`}
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {isEn ? `Night ${stop.dayNumber}: ` : `Đêm ${stop.dayNumber}: `}
                        {stop.accommodation}
                      </p>
                      {stop.sleepingStandard ? (
                        <p className="mt-1 text-sm text-muted-foreground">{stop.sleepingStandard}</p>
                      ) : null}
                      {stop.route ? (
                        <p className="mt-1 text-sm text-muted-foreground">{stop.route}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {isUsableText(servicesSummary.operatorNotes) ||
            asArray<Record<string, any>>(servicesSummary.notes).filter((n) => isUsableText(n.label)).length > 0 ? (
              <div
                className={`rounded-[24px] border border-border/60 bg-background p-5 ${
                  accommodationStops.length === 0 ? 'sm:col-span-2' : ''
                }`}
                data-od-id="tour-services-notes"
              >
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {isEn ? 'Operator notes' : 'Lưu ý điều hành'}
                </p>
                {isUsableText(servicesSummary.operatorNotes) ? (
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {servicesSummary.operatorNotes}
                  </p>
                ) : null}
                <ul className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
                  {asArray<Record<string, any>>(servicesSummary.notes)
                    .filter((item) => isUsableText(item.label))
                    .map((item, index) => (
                      <li key={`${item.label}-${index}`}>{item.label}</li>
                    ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Panel>
  )
}

const TourPricePostureSection = ({
  locale,
  nextDeparture,
  tour,
}: {
  locale: SupportedLocaleCode
  nextDeparture: Record<string, any> | null
  tour: Record<string, any>
}) => {
  const chrome = getConsultativeChrome(locale)
  const pricePosture = getTourPricePosture({
    locale,
    ...getGovernedPricePostureInput({ nextDeparture, tour }),
  })
  const seasonNotes = [
    tour.factSummary?.seasonNote,
    tour.servicesSummary?.seasonNote,
    tour.bcfg?.seasonNote,
  ].filter((value) => isUsableText(value)) as string[]

  return (
    <Panel data-od-id="tour-price" id="departures">
      <SectionHeading
        eyebrow={chrome.priceEyebrow}
        title={chrome.priceTitle}
        description={chrome.priceDescription}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[24px] border border-border/60 bg-muted/25 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {pricePosture.label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{pricePosture.value}</p>
          <p className="mt-2 text-sm text-muted-foreground">{pricePosture.honesty}</p>
        </div>
        <div className="rounded-[24px] border border-border/60 bg-background p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {chrome.priceHow}
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
            <li>{chrome.priceShare}</li>
            <li>{chrome.priceReply}</li>
            <li>{pricePosture.honesty}</li>
          </ul>
        </div>
      </div>
      {seasonNotes.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {seasonNotes.map((note, index) => (
            <div
              className="rounded-[20px] border border-border/60 bg-muted/20 p-4 text-sm leading-7 text-muted-foreground"
              key={`${index}-${note.slice(0, 24)}`}
            >
              {note}
            </div>
          ))}
        </div>
      ) : null}
    </Panel>
  )
}

const TourDecisionRail = ({
  locale,
  nextDeparture,
  siteCode: siteCodeProp,
  tour,
}: {
  locale: SupportedLocaleCode
  nextDeparture: Record<string, any> | null
  siteCode?: null | string
  tour: Record<string, any>
}) => {
  const chrome = getConsultativeChrome(locale)
  const wingSideCopy = getWingSideTourCopy(locale)
  const cta = tour.primaryCTA || {}
  const intent = getConsultativePrimaryIntent(cta.mode || tour.bcfg?.ctaStyle)
  const siteCode = resolveTourSiteCode(siteCodeProp, 'consultative')
  const pricePosture = getTourPricePosture({
    locale,
    ...getGovernedPricePostureInput({ nextDeparture, tour }),
  })
  const durationLabel = getDurationLabel(tour.durationDays, tour.durationNights, locale)
  const primaryLabel = getConsultativePrimaryLabel({
    ctaLabel: cta.label,
    locale,
    override: nextDeparture?.ctaLabelOverride,
  })
  const primaryFallback = getTourInquiryPath({
    intent,
    siteCode,
    source: 'tour-detail-rail',
    tourId: tour.id,
    tourSlug: tour.slug,
    tourTitle: tour.title,
    discoveryContext: tour.discoveryContext,
  })
  const primaryHref = resolveConsultativeCtaHref({
    cmsHref: cta.href,
    fallbackPath: primaryFallback,
  })

  return (
    <aside
      className="tour-decision-rail hidden lg:block"
      aria-label={wingSideCopy.request}
      data-od-id="tour-decision-rail"
    >
      <div className="sticky top-24 space-y-4 rounded-[28px] border border-border/70 bg-card/95 p-5 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {pricePosture.label}
          </p>
          <p className="mt-1 text-xl font-semibold text-foreground">{pricePosture.value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{pricePosture.honesty}</p>
        </div>
        {durationLabel ? (
          <p className="text-sm font-medium text-foreground">{durationLabel}</p>
        ) : null}
        <div className="flex flex-col gap-3">
          <SiteLink
            className={`${TourPrimaryCtaClass} tour-cta-primary--pulse w-full`}
            href={primaryHref}
          >
            {primaryLabel}
          </SiteLink>
          <SiteLink
            className={`${TourGhostCtaClass} w-full`}
            href={getTourInquiryPath({
              intent: 'contact',
              siteCode,
              source: 'tour-detail-rail-contact',
              tourId: tour.id,
              tourSlug: tour.slug,
              tourTitle: tour.title,
              discoveryContext: tour.discoveryContext,
            })}
          >
            {wingSideCopy.contact}
          </SiteLink>
        </div>
        <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
          <li>{chrome.railPace}</li>
          <li>{chrome.railReply}</li>
          <li>{chrome.railAvailability}</li>
        </ul>
      </div>
    </aside>
  )
}

const DepartureMatrix = ({
  departures,
  locale,
  onSelectDeparture,
  selectedDepartureId,
  tour,
}: {
  departures: DepartureCardViewModel[]
  locale: SupportedLocaleCode
  onSelectDeparture?: (departure: DepartureCardViewModel) => void
  selectedDepartureId?: null | number | string
  tour: Record<string, any>
}) => {
  const isEn = locale === 'en'
  if (departures.length === 0) {
    return (
      <div
        className="rounded-[24px] border border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground"
        data-od-id="tour-departures-empty"
      >
        <p className="font-semibold text-foreground">
          {isEn ? 'No scheduled departures at this time' : 'Hiện chưa có lịch khởi hành mở bán mới'}
        </p>
        <p className="mt-1">
          {isEn
            ? 'Please contact our tour specialists to request custom departures or receive upcoming schedule alerts.'
            : 'Vui lòng liên hệ chuyên viên để nhận thông tin đợt khởi hành tiếp theo hoặc yêu cầu lịch riêng.'}
        </p>
      </div>
    )
  }

  return (
    <TourDepartureMatrix
      departures={departures}
      locale={locale}
      onSelectDeparture={onSelectDeparture}
      selectedDepartureId={selectedDepartureId}
      tour={tour}
    />
  )
}

const TourDepartureSection = ({
  departures,
  locale,
  onSelectDeparture,
  selectedDepartureId,
  tour,
}: {
  departures: DepartureCardViewModel[]
  locale: SupportedLocaleCode
  onSelectDeparture?: (departure: DepartureCardViewModel) => void
  selectedDepartureId?: null | number | string
  tour: Record<string, any>
}) => (
  <Panel id="departures">
    <SectionHeading
      eyebrow="Khởi hành mở bán"
      title="Các đợt đang mở bán cho line tour này"
      description="Ngày khởi hành, hãng bay và giá từ được hiển thị theo từng đợt mở bán."
    />
    <DepartureMatrix
      departures={departures}
      locale={locale}
      onSelectDeparture={onSelectDeparture}
      selectedDepartureId={selectedDepartureId}
      tour={tour}
    />
  </Panel>
)

const TourFAQSection = ({
  locale = 'vi',
  presentation = 'retail',
  tour,
}: {
  locale?: SupportedLocaleCode
  presentation?: TourDetailPresentation
  tour: Record<string, any>
}) => {
  const faqItems = asArray<Record<string, any>>(tour.faqItems)
  const isEn = presentation === 'consultative' && locale === 'en'

  if (faqItems.length === 0) {
    return null
  }

  return (
    <Panel id="faq">
      <SectionHeading
        eyebrow="FAQ"
        title={
          isEn
            ? 'Questions guests usually ask before booking'
            : 'Câu hỏi khách thường hỏi trước khi chốt'
        }
      />
      <div className="space-y-4">
        {faqItems.map((item, index) => (
          <div
            className="rounded-[24px] border border-border/60 bg-background p-5"
            key={`${item.question}-${index}`}
          >
            <h3 className="text-lg font-semibold text-foreground">{item.question}</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.answer}</p>
          </div>
        ))}
      </div>
    </Panel>
  )
}

const TourRelatedSection = ({
  locale = 'vi',
  presentation = 'retail',
  tour,
}: {
  locale?: SupportedLocaleCode
  presentation?: TourDetailPresentation
  tour: Record<string, any>
}) => {
  const relatedTours = asArray<Record<string, any>>(tour.relatedTours).filter(
    (item) => typeof item === 'object',
  )
  const isEn = presentation === 'consultative' && locale === 'en'
  const chrome = getConsultativeChrome(locale)
  const wingSideCopy = getWingSideTourCopy(locale)

  const fallback = [
    {
      href: '/packages',
      summary: isEn
        ? 'Compare private journey shapes and pacing.'
        : 'So sánh các khung hành trình private.',
      title: isEn ? 'Sample journeys' : 'Hành trình mẫu',
    },
    {
      href: '/destinations',
      summary: isEn
        ? 'Choose the regions that belong in your brief.'
        : 'Chọn vùng muốn đưa vào brief.',
      title: isEn ? 'Explore destinations' : 'Khám phá điểm đến',
    },
    {
      href: '/styles',
      summary: isEn
        ? 'Match pace, stays, and travel priorities.'
        : 'Ghép nhịp, lưu trú và ưu tiên chuyến đi.',
      title: isEn ? 'Match travel style' : 'Ghép phong cách',
    },
  ]
  const items = relatedTours.length
    ? relatedTours.map((item) => ({
        href: item.slug ? getTourPath(item.slug) : '/packages',
        id: item.id || item.slug,
        media: item.heroMedia,
        slug: item.slug,
        summary: item.summary,
        title: item.title,
      }))
    : presentation === 'consultative'
      ? []
      : fallback.map((item, index) => ({
          ...item,
          id: `fallback-${index}`,
          media: null,
          slug: null,
        }))

  if (items.length === 0 && presentation === 'consultative') return null

  return (
    <Panel data-od-id="tour-related" id="related">
      <SectionHeading
        eyebrow={presentation === 'consultative' ? chrome.relatedEyebrow : 'Tour liên quan'}
        title={
          presentation === 'consultative' ? chrome.relatedTitle : 'Hành trình gần với nhu cầu này'
        }
        description={
          presentation === 'consultative'
            ? chrome.relatedDescription
            : 'Các hành trình có tuyến điểm, phong cách và thời lượng gần với lựa chọn này.'
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article
            className="overflow-hidden rounded-[24px] border border-border/60 bg-background"
            data-od-id={item.slug ? `related-tour-${item.slug}` : undefined}
            key={item.id}
          >
            {item.media ? (
              <div className="relative aspect-[16/10] bg-muted">
                <Media
                  fill
                  imgClassName="object-cover"
                  pictureClassName="absolute inset-0"
                  resource={item.media as MediaType}
                  size="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 400px"
                />
              </div>
            ) : null}
            <div className="p-5">
              <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.summary}</p>
              {item.href ? (
                <SiteLink
                  className="mt-4 inline-flex text-sm font-semibold no-underline"
                  href={item.href}
                >
                  {presentation === 'consultative' ? `${wingSideCopy.overview} →` : 'Khám phá →'}
                </SiteLink>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </Panel>
  )
}

const StickyBookingCTASection = ({
  locale = 'vi',
  nextDeparture: nextDepartureProp,
  presentation = 'retail',
  siteCode: siteCodeProp,
  tour,
}: {
  locale?: SupportedLocaleCode
  nextDeparture: Record<string, any> | null
  presentation?: TourDetailPresentation
  siteCode?: null | string
  tour: Record<string, any>
}) => {
  const context = useTourDepartureSelection()
  const nextDeparture = context
    ? context.isPrivateTour
      ? null
      : context.selectedDeparture
    : nextDepartureProp

  const isConsultative = presentation === 'consultative'
  const siteCode = isConsultative ? resolveTourSiteCode(siteCodeProp, presentation) : undefined
  const pricePosture = getTourPricePosture({
    locale,
    ...getGovernedPricePostureInput({ nextDeparture, tour }),
  })

  if (isConsultative) {
    return (
      <div
        className="fixed inset-x-3 bottom-3 z-40 max-w-full pb-[env(safe-area-inset-bottom)] lg:hidden"
        data-od-id="tour-mobile-consult"
      >
        <div className="overflow-hidden rounded-[22px] border border-border/70 bg-background/95 px-3 py-2 shadow-lg backdrop-blur sm:rounded-[28px] sm:px-5 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-foreground">
                {tour.title}
              </p>
              <p className="mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground">
                {pricePosture.value}
              </p>
            </div>
            <SiteLink
              className={`${TourPrimaryCtaClass} tour-cta-primary--pulse shrink-0 px-4`}
              href={getTourInquiryPath({
                intent: getConsultativePrimaryIntent(tour.primaryCTA?.mode || tour.bcfg?.ctaStyle),
                siteCode,
                source: 'tour-detail-sticky',
                tourId: tour.id,
                tourSlug: tour.slug,
                tourTitle: tour.title,
                discoveryContext: tour.discoveryContext,
              })}
            >
              {getConsultativePrimaryLabel({
                compact: true,
                ctaLabel: tour.primaryCTA?.label,
                locale,
                override: nextDeparture?.ctaLabelOverride,
              })}
            </SiteLink>
          </div>
        </div>
      </div>
    )
  }

  const isPrivateTour = Boolean(context?.isPrivateTour)
  const nextDepDate = nextDeparture?.departureDate ? new Date(nextDeparture.departureDate) : null
  const now = new Date()
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const hasFutureDeparture = Boolean(
    !isPrivateTour &&
      nextDeparture &&
      nextDepDate &&
      !Number.isNaN(nextDepDate.getTime()) &&
      new Date(Date.UTC(nextDepDate.getUTCFullYear(), nextDepDate.getUTCMonth(), nextDepDate.getUTCDate())).getTime() >= todayUtc.getTime(),
  )
  const isSoldOut = nextDeparture?.availabilityStatus === 'sold-out'
  const commerceVerified = Boolean(nextDeparture?.commerceVerified)
  const isSellable = !isPrivateTour && hasFutureDeparture && !isSoldOut && commerceVerified
  const stickySubtitle = isPrivateTour
    ? 'Lịch riêng theo đoàn • Nhận báo giá'
    : isSellable
      ? [
          formatTourPrice(nextDeparture?.priceFrom, nextDeparture?.currency),
          formatTourDate(nextDeparture?.departureDate),
          nextDeparture?.airline || null,
        ]
          .filter(Boolean)
          .join(' • ')
      : hasFutureDeparture && isSoldOut
        ? `Đã hết chỗ • ${formatTourDate(nextDeparture?.departureDate)}${nextDeparture?.airline ? ` • ${nextDeparture.airline}` : ''}`
        : 'Chưa có lịch mới • Nhận tư vấn trực tiếp'

  return (
    <div className="sticky bottom-2 fixed inset-x-3 bottom-3 z-40 max-w-full pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="overflow-hidden rounded-[22px] border border-border/70 bg-background/95 px-3 py-2 shadow-lg backdrop-blur sm:rounded-[28px] sm:px-5 sm:py-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-foreground sm:text-sm">
              {tour.title}
            </p>
            <p className="mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground sm:text-sm">
              {stickySubtitle}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-3">
            {(() => {
              const isSoldOut = nextDeparture?.availabilityStatus === 'sold-out'
              const commerceVerified = Boolean(nextDeparture?.commerceVerified)
              const isSellable = !isPrivateTour && hasFutureDeparture && !isSoldOut && commerceVerified

              const stickyIntent: TourInquiryIntent = isPrivateTour
                ? 'request-quote'
                : isSellable
                  ? (tour.bcfg?.ctaStyle || 'hold-seat')
                  : 'inquiry'
              const stickyLabel = isPrivateTour
                ? 'Tư vấn lịch riêng'
                : isSellable
                  ? (nextDeparture?.ctaLabelOverride || 'Giữ chỗ ngay')
                  : hasFutureDeparture && isSoldOut
                    ? 'Tư vấn đợt khác'
                    : 'Nhận tư vấn lịch mới'
              const stickyMobileLabel = isPrivateTour
                ? 'Lịch riêng'
                : isSellable
                  ? (nextDeparture?.ctaLabelOverride || 'Tư vấn')
                  : 'Tư vấn'

              return (
                <SiteLink
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--site-brand)] px-3 text-sm font-semibold text-white no-underline transition-colors hover:bg-[var(--site-brand)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)] sm:px-4"
                  data-od-id="tour-sticky-primary-cta"
                  href={getTourInquiryPath({
                    departureDate: !isPrivateTour && hasFutureDeparture ? (nextDeparture?.departureDate || nextDeparture?.date) : undefined,
                    departureId: !isPrivateTour && hasFutureDeparture ? nextDeparture?.id : undefined,
                    discoveryContext: tour.discoveryContext,
                    guests: context?.guestCount ?? 2,
                    intent: stickyIntent,
                    siteCode,
                    source: 'tour-detail-sticky',
                    tourId: tour.id,
                    tourSlug: tour.slug,
                    tourTitle: tour.title,
                  })}
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    if (stickyIntent === 'inquiry' || stickyIntent === 'request-quote') {
                      if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                        e.preventDefault()
                        context?.setIsConsultationOpen?.(true)
                      }
                    }
                  }}
                >
                  <span className="sm:hidden">{stickyMobileLabel}</span>
                  <span className="hidden sm:inline">{stickyLabel}</span>
                </SiteLink>
              )
            })()}
            <SiteLink
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-3 text-sm font-semibold no-underline transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)] sm:px-4"
              data-od-id="tour-sticky-secondary-cta"
              href={getSchedulePath()}
            >
              <span className="sm:hidden">Các đợt đi</span>
              <span className="hidden sm:inline">So sánh các đợt đi</span>
            </SiteLink>
          </div>
        </div>
      </div>
    </div>
  )
}

const RetailTourConsultationDialogMount = ({
  hotlines,
  locale,
  nextDeparture,
  siteCode,
  tour,
}: {
  hotlines?: HotlineItem[]
  locale: SupportedLocaleCode
  nextDeparture: Record<string, any> | null
  siteCode?: null | string
  tour: Record<string, any>
}) => {
  const context = useTourDepartureSelection()
  return (
    <RetailTourConsultationDialog
      hotlines={hotlines}
      isOpen={Boolean(context?.isConsultationOpen)}
      locale={locale}
      nextDeparture={nextDeparture}
      onClose={() => context?.setIsConsultationOpen?.(false)}
      siteCode={siteCode}
      tour={tour}
    />
  )
}

const RetailTourJumpNav = ({
  isEn,
  navLabels,
  navSections,
}: {
  isEn: boolean
  navLabels: Record<string, { long: string; short: string }>
  navSections: string[]
}) => {
  const [isSticky, setIsSticky] = React.useState(false)
  const [activeSection, setActiveSection] = React.useState<string>(navSections[0] || '')
  const wrapperRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect()
            setIsSticky(rect.top <= 12)
          }

          let current = navSections[0] || ''
          for (const section of navSections) {
            const el = document.getElementById(section)
            if (el) {
              const rect = el.getBoundingClientRect()
              if (rect.top <= 140) {
                current = section
              }
            }
          }
          setActiveSection(current)
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [navSections])

  const renderNavLinks = () =>
    navSections.map((section) => {
      const isActive = activeSection === section
      return (
        <a
          className={`flex min-h-9 sm:min-h-10 shrink-0 snap-start items-center justify-center rounded-full px-3 py-1.5 text-center text-xs sm:text-sm font-semibold transition-all duration-200 no-underline ${
            isActive
              ? 'bg-[var(--site-brand,#0f172a)] text-white shadow-sm'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
          href={`#${section}`}
          key={section}
          aria-current={isActive ? 'true' : undefined}
          onClick={() => setActiveSection(section)}
        >
          <span className="sm:hidden">{navLabels[section]?.short || section}</span>
          <span className="hidden sm:inline">{navLabels[section]?.long || section}</span>
        </a>
      )
    })

  return (
    <div
      ref={wrapperRef}
      className="order-3 min-h-[56px] lg:col-start-1 lg:row-start-2"
    >
      {/* When sticky: placeholder keeps natural spacing in grid so layout never shifts */}
      {isSticky ? (
        <div
          className="invisible pointer-events-none min-h-[100px]"
          aria-hidden="true"
        />
      ) : (
        /* Initial state (in-flow, wraps to 2 lines on desktop) */
        <div
          data-od-id="tour-jump-nav"
          className="rounded-[20px] border border-border/70 bg-background/95 p-1.5 shadow-sm backdrop-blur sm:rounded-[28px] sm:p-2.5"
        >
          <nav
            aria-label={isEn ? 'Tour sections' : 'Mục lục tour'}
            className="flex snap-x gap-1.5 overflow-x-auto whitespace-nowrap text-xs font-semibold [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-2 sm:text-sm lg:flex-wrap lg:items-center lg:gap-2.5 xl:gap-3 [&::-webkit-scrollbar]:hidden"
          >
            {renderNavLinks()}
          </nav>
        </div>
      )}

      {/* Sticky floating state (flush at top-0, perfectly bounded within container max-w-[1200px]) */}
      {isSticky ? (
        <div className="fixed top-0 inset-x-0 z-40 pointer-events-none">
          <div className="container max-w-[1200px]">
            <div
              data-od-id="tour-jump-nav"
              className="w-full border-b border-x border-border/80 bg-background/95 shadow-md backdrop-blur-md transition-all duration-200 rounded-b-2xl pointer-events-auto p-1.5 sm:p-2"
            >
              <nav
                aria-label={isEn ? 'Tour sections' : 'Mục lục tour'}
                className="flex flex-nowrap items-center justify-start lg:justify-between gap-1 sm:gap-2 overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-xs sm:text-sm font-semibold"
              >
                {renderNavLinks()}
              </nav>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export const TourDetailPage = ({
  data,
  discoveryContext,
  enquiryForm,
  hotlines,
  locale,
  presentation = 'retail',
  siteCode: siteCodeProp,
}: {
  data: TourResolvedData
  discoveryContext?: Omit<TourEnquiryContext, 'source' | 'tourId' | 'tourSlug' | 'tourTitle'>
  enquiryForm?: FormType | null
  hotlines?: HotlineItem[]
  locale: SupportedLocaleCode
  presentation?: TourDetailPresentation
  siteCode?: null | string
}) => {
  const isConsultative = presentation === 'consultative' || isConsultativeTourSiteCode(siteCodeProp)
  const resolvedPresentation: TourDetailPresentation = isConsultative ? 'consultative' : 'retail'
  const baseTour: TourResolvedData['tour'] = isConsultative
    ? normalizeWingSideConsultativeTour(data.tour, locale)
    : data.tour
  const tour: TourResolvedData['tour'] = { ...baseTour, discoveryContext }
  const siteCode = resolveTourSiteCode(siteCodeProp, resolvedPresentation)
  const isEn = locale === 'en'
  const chrome = getConsultativeChrome(locale)
  const wingSideCopy = getWingSideTourCopy(locale)
  const visibleSections = new Set(data.sectionVisibility || defaultTourSectionVisibility)
  let sectionOrder = (data.sectionOrder || defaultTourSectionOrder).filter((section) =>
    visibleSections.has(section),
  )

  // Consultative private: hide empty retail-only surfaces; replace empty departures with posture.
  if (isConsultative) {
    sectionOrder = sectionOrder.filter((section) => {
      if (section === 'reviews') {
        const snapshot = tour.reviewSnapshot || {}
        return Boolean(snapshot.score) || asArray(snapshot.proofQuotes).length > 0
      }
      return true
    })
    sectionOrder = [
      'hero',
      'facts',
      'route',
      'itinerary',
      'services',
      'departures',
      'related',
      'sticky-cta',
    ]
  }

  const navSections = sectionOrder.filter((section) => !['hero', 'sticky-cta'].includes(section))
  const navLabels: Record<string, { long: string; short: string }> = isConsultative
    ? {
        departures: { long: chrome.priceEyebrow, short: chrome.priceEyebrow },
        facts: { long: chrome.factsEyebrow, short: chrome.factsEyebrow },
        faq: { long: 'FAQ', short: 'FAQ' },
        itinerary: { long: wingSideCopy.itinerary, short: wingSideCopy.itinerary },
        related: { long: chrome.relatedEyebrow, short: chrome.relatedEyebrow },
        reviews: { long: 'Reviews', short: 'Reviews' },
        route: { long: wingSideCopy.overview, short: wingSideCopy.route },
        services: { long: wingSideCopy.includes, short: wingSideCopy.includes },
        'why-choose': { long: 'Highlights', short: 'Why' },
      }
    : {
        departures: { long: 'Lịch khởi hành', short: 'Khởi hành' },
        facts: { long: 'Thông tin tour', short: 'Thông tin' },
        faq: { long: 'FAQ', short: 'FAQ' },
        itinerary: { long: 'Lịch trình', short: 'Lịch trình' },
        related: { long: 'Tour liên quan', short: 'Liên quan' },
        reviews: { long: 'Đánh giá', short: 'Đánh giá' },
        route: { long: 'Hành trình', short: 'Hành trình' },
        services: { long: 'Dịch vụ & lưu trú', short: 'Dịch vụ' },
        'why-choose': { long: 'Điểm nổi bật', short: 'Nổi bật' },
      }

  const bodySections = sectionOrder.filter(
    (section) => section !== 'hero' && section !== 'sticky-cta',
  )

  return (
    <TourDepartureSelectionProvider
      departures={data.departures}
      initialDeparture={data.nextDeparture}
      locale={locale}
    >
      {(() => {
        const sections: Record<TourSectionID, React.ReactNode> = {
          hero: (
            <TourDecisionHeader
              locale={locale}
              nextDeparture={data.nextDeparture}
              presentation={resolvedPresentation}
              siteCode={siteCode}
              tour={tour}
              variants={isConsultative ? [] : data.variants}
            />
          ),
          facts: <TourFactGrid locale={locale} presentation={resolvedPresentation} tour={tour} />,
          reviews: (
            <TourReviewsProofSection locale={locale} presentation={resolvedPresentation} tour={tour} />
          ),
          'why-choose': (
            <TourWhyChooseSection locale={locale} presentation={resolvedPresentation} tour={tour} />
          ),
          route: (
            <TourRouteVisualSection locale={locale} presentation={resolvedPresentation} tour={tour} />
          ),
          itinerary: (
            <TourItinerarySection locale={locale} presentation={resolvedPresentation} tour={tour} />
          ),
          services: (
            <TourServicesSection locale={locale} presentation={resolvedPresentation} tour={tour} />
          ),
          departures: isConsultative ? (
            <TourPricePostureSection locale={locale} nextDeparture={data.nextDeparture} tour={tour} />
          ) : (
            <TourDepartureSection
              departures={data.departures}
              locale={locale}
              tour={tour}
            />
          ),
          faq: <TourFAQSection locale={locale} presentation={resolvedPresentation} tour={tour} />,
          related: <TourRelatedSection locale={locale} presentation={resolvedPresentation} tour={tour} />,
          'sticky-cta': (
            <StickyBookingCTASection
              locale={locale}
              nextDeparture={data.nextDeparture}
              presentation={resolvedPresentation}
              siteCode={siteCode}
              tour={tour}
            />
          ),
        }

        return (
          <div
            className={
              isConsultative
                ? 'container tour-detail--consultative max-w-[1120px] space-y-5 pb-28 md:space-y-6 lg:pb-8'
                : 'container max-w-[1200px] space-y-8 pb-24 md:pb-28'
            }
            data-tour-presentation={resolvedPresentation}
            data-od-id={isConsultative ? 'tour-root' : undefined}
          >
            {isConsultative ? (
              <>
                {sections.hero}
                <div
                  className="sticky top-0 z-10 rounded-[20px] border border-border/70 bg-background/95 p-1.5 shadow-sm backdrop-blur sm:rounded-[28px] sm:p-3"
                  data-od-id="tour-jump-nav"
                >
                  <nav
                    aria-label={wingSideCopy.overview}
                    className="flex snap-x gap-1.5 overflow-x-auto whitespace-nowrap text-xs font-semibold [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-2 sm:text-sm lg:flex-wrap lg:items-center lg:gap-3 [&::-webkit-scrollbar]:hidden"
                  >
                    {navSections.map((section) => (
                      <React.Fragment key={section}>
                        <a
                          className="flex min-h-11 shrink-0 snap-start items-center justify-center rounded-full px-3 py-1.5 text-center text-muted-foreground no-underline hover:bg-muted/35 hover:text-foreground sm:px-4 sm:py-2"
                          href={`#${section}`}
                        >
                          <span className="sm:hidden">{navLabels[section]?.short || section}</span>
                          <span className="hidden sm:inline">{navLabels[section]?.long || section}</span>
                        </a>
                        {section === 'facts' ? (
                          <a
                            className="flex min-h-11 shrink-0 snap-start items-center justify-center rounded-full px-3 py-1.5 text-center text-muted-foreground no-underline hover:bg-muted/35 hover:text-foreground sm:px-4 sm:py-2"
                            href="#gallery"
                          >
                            {wingSideCopy.gallery}
                          </a>
                        ) : null}
                        {section === 'departures' ? (
                          <a
                            className="flex min-h-11 shrink-0 snap-start items-center justify-center rounded-full px-3 py-1.5 text-center text-muted-foreground no-underline hover:bg-muted/35 hover:text-foreground sm:px-4 sm:py-2"
                            href="#enquire"
                          >
                            {wingSideCopy.request}
                          </a>
                        ) : null}
                      </React.Fragment>
                    ))}
                  </nav>
                </div>

                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-w-0 space-y-8">
                    {bodySections.map((section) => (
                      <React.Fragment key={section}>
                        {sections[section]}
                        {section === 'facts' ? (
                          <TourJourneyGallerySection locale={locale} tour={tour} />
                        ) : null}
                        {section === 'departures' ? (
                          <TourConsultationSection
                            enquiryForm={enquiryForm}
                            locale={locale}
                            siteCode={siteCode}
                            tour={tour}
                          />
                        ) : null}
                      </React.Fragment>
                    ))}
                  </div>
                  <TourDecisionRail
                    locale={locale}
                    nextDeparture={data.nextDeparture}
                    siteCode={siteCode}
                    tour={tour}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_340px] gap-8 xl:gap-10">
                {/* On mobile: Hero (order 1) -> Rail (order 2) -> Jump Nav (order 3) -> Body (order 4) */}
                {/* In DOM order for test / accessibility: Hero -> Rail -> Body */}
                <div className="order-1 min-w-0 lg:col-start-1 lg:row-start-1">
                  {sections.hero}
                </div>

                <RetailDecisionRail
                  className="order-2 w-full lg:col-start-2 lg:row-span-3 lg:row-start-1"
                  cta={tour.primaryCTA}
                  locale={locale}
                  nextDeparture={data.nextDeparture}
                  presentation={resolvedPresentation}
                  reviewSnapshot={tour.reviewSnapshot}
                  siteCode={siteCode}
                  tour={tour}
                  variants={data.variants}
                />

                <RetailTourJumpNav
                  isEn={isEn}
                  navLabels={navLabels}
                  navSections={navSections}
                />

                <div className="order-4 min-w-0 space-y-8 lg:col-start-1 lg:row-start-3">
                  {bodySections.map((section) => (
                    <React.Fragment key={section}>{sections[section]}</React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {visibleSections.has('sticky-cta') ? sections['sticky-cta'] : null}
            {!isConsultative ? (
              <RetailTourConsultationDialogMount
                hotlines={hotlines}
                locale={locale}
                nextDeparture={data.nextDeparture}
                siteCode={siteCode}
                tour={tour}
              />
            ) : null}
          </div>
        )
      })()}
    </TourDepartureSelectionProvider>
  )
}

const DepartureStrip = ({
  departures,
  locale,
}: {
  departures: DepartureCardViewModel[]
  locale: SupportedLocaleCode
}) => {
  const items = departures.slice(0, 6)

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {items.map((departure) => {
        const product = asDoc<Record<string, any>>(departure.tourProduct)
        const canHoldSeat = canHoldSeatDeparture(departure)

        return (
          <article
            className="group relative rounded-[28px] border border-border/70 bg-card/95 p-5 shadow-sm transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-1 hover:border-[color:var(--site-accent)]/40 hover:bg-background hover:shadow-[0_20px_52px_color-mix(in_oklch,var(--site-brand)_14%,transparent)]"
            key={departure.id}
          >
            <div>
              {product?.slug ? (
                <SiteLink
                  className="text-sm font-semibold text-foreground no-underline transition-colors duration-200 hover:text-[var(--site-brand)] group-hover:text-[var(--site-brand)]"
                  href={getTourPath(product.slug)}
                >
                  {product.title || 'Tour'}
                </SiteLink>
              ) : (
                <p className="text-sm font-semibold text-foreground">{product?.title || 'Tour'}</p>
              )}
              <p className="mt-1 text-sm text-muted-foreground">
                {[formatTourDate(departure.departureDate, locale), departure.airline]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
              <p className="mt-4 text-2xl font-semibold text-foreground transition-colors duration-200 group-hover:text-[var(--site-brand)]">
                {canHoldSeat ? (
                  <PromotionPrice
                    contactLabel={locale === 'en' ? 'Contact us' : 'Liên hệ'}
                    currency={departure.currency}
                    originalPrice={departure.originalPrice}
                    price={departure.priceFrom}
                  />
                ) : (
                  formatTourPrice(departure.priceFrom, departure.currency) || 'Liên hệ'
                )}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                  {departure.availabilityBadge ||
                    getAvailabilityLabel(departure.availabilityStatus, locale)}
                </span>
                {canHoldSeat ? (
                  <PromotionBadge label={departure.promoLabel} />
                ) : null}
              </div>
              <div className="mt-5 flex gap-3">
                <SiteLink
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--site-brand)] px-4 text-sm font-semibold text-white no-underline transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_color-mix(in_oklch,var(--site-brand)_18%,transparent)]"
                  href={getTourInquiryPath({
                    departureId: departure.id,
                    intent: canHoldSeat ? 'hold-seat' : 'inquiry',
                    source: 'departure-strip',
                    tourId: product?.id,
                    tourSlug: product?.slug,
                  })}
                >
                  {canHoldSeat
                    ? departure.ctaLabelOverride || (locale === 'en' ? 'Hold a seat' : 'Giữ chỗ')
                    : locale === 'en' ? 'Request consultation' : 'Liên hệ tư vấn'}
                </SiteLink>
                {product?.slug ? (
                  <SiteLink
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-4 text-sm font-semibold no-underline transition-[transform,color,border-color,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[var(--site-brand)]/30 hover:bg-[var(--site-brand)]/6 hover:text-[var(--site-brand)] hover:shadow-[0_12px_28px_color-mix(in_oklch,var(--site-brand)_10%,transparent)]"
                    href={getTourPath(product.slug)}
                  >
                    Xem tour
                  </SiteLink>
                ) : null}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export const TourMarketPage = ({
  departures,
  locale,
  marketKey,
  tours,
}: {
  departures: DepartureCardViewModel[]
  locale: 'en' | 'vi'
  marketKey: string
  tours: TourCardViewModel[]
}) => {
  const market = getMarketConfig(marketKey)

  return (
    <div className="container space-y-8">
      <Panel>
        <SectionHeading
          eyebrow="Thị trường outbound"
          level="h1"
          title={market?.heading || 'Tour outbound'}
          description="Các line tour được tổ chức theo thị trường để khách so sánh route, mức giá và nhịp khởi hành trước khi đi vào từng tour detail."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tours.map((tour) => {
            const tourBadges = getMarketTourBadges(tour)
            const departure = tour.nextDeparture
            const editorialBadges = tour.editorialBadges || []
            const hasHot = Boolean(tour.hasHotEditorialBadge)
            const hotBadge = editorialBadges.find((b: any) => b.kind === 'hot')
            const cornerStickers = editorialBadges.filter(
              (b: any) => b.kind === 'specialized' || b.kind === 'vip',
            )
            const canPromote = Boolean(
              departure?.commerceVerified === true &&
              departure.availabilityStatus !== 'sold-out' &&
              getFutureDepartures([departure]).length > 0 &&
              normalizeGovernedTourPrice({ currency: departure.currency, value: departure.priceFrom }),
            )

            return (
              <article
                className={cn(
                  'group relative rounded-[24px] border border-border/60 bg-background p-5 shadow-sm transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-1 hover:border-[color:var(--site-accent)]/40 hover:bg-card hover:shadow-[0_18px_46px_color-mix(in_oklch,var(--site-brand)_14%,transparent)]',
                  hasHot && 'hot-rainbow-card border-transparent',
                )}
                data-has-hot={hasHot ? 'true' : undefined}
                key={tour.id}
              >
                {hasHot && hotBadge?.label ? (
                  <span className="sr-only">{hotBadge.label}</span>
                ) : null}
                <div className="relative z-10">
                  <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-[20px] bg-muted">
                    <Media
                      fill
                      imgClassName="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      pictureClassName="absolute inset-0"
                      resource={tour.heroMedia || asArray(tour.gallery)[0] || null}
                      size="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 400px"
                    />
                    {cornerStickers.length > 0 || canPromote ? (
                      <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2 pointer-events-none">
                        {cornerStickers.length > 0 ? (
                          <div
                            className={cn(
                              'flex flex-col items-start gap-1.5 min-w-0',
                              canPromote ? 'max-w-[calc(100%-110px)]' : 'max-w-full',
                            )}
                            data-editorial-stickers="true"
                          >
                            {cornerStickers.map((sticker: any, idx: number) => (
                              <span
                                className={cn(
                                  'inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide shadow-sm backdrop-blur-[2px] truncate',
                                  sticker.kind === 'vip'
                                    ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 text-slate-950 uppercase tracking-wider font-extrabold shadow-amber-500/20'
                                    : 'bg-slate-900/90 text-white dark:bg-slate-100/95 dark:text-slate-900',
                                )}
                                key={`${sticker.kind}-${idx}`}
                              >
                                {sticker.label}
                              </span>
                            ))}
                          </div>
                        ) : <div />}
                        {canPromote ? (
                          <div className="flex justify-end shrink-0 max-w-[50%]">
                            <PromotionBadge label={departure?.promoLabel} />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/90">
                        {tour.hasFutureDepartures === false
                          ? 'Đang cập nhật đợt mới'
                          : tour.departureCount
                            ? `${tour.departureCount} đợt đang mở bán`
                            : 'Line tour đang bán'}
                      </p>
                    </div>
                  </div>
                  {tourBadges.length > 0 ? (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {tourBadges.map((badge) => (
                        <span
                          className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground transition-colors duration-200 group-hover:border-[var(--site-brand)]/20 group-hover:text-[var(--site-brand)]"
                          key={badge}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {tour.slug ? (
                    <SiteLink
                      className="text-lg font-semibold text-foreground no-underline transition-colors duration-200 group-hover:text-[var(--site-brand)]"
                      href={getTourPath(tour.slug)}
                    >
                      {tour.title}
                    </SiteLink>
                  ) : (
                    <p className="text-lg font-semibold text-foreground transition-colors duration-200 group-hover:text-[var(--site-brand)]">
                      {tour.title}
                    </p>
                  )}
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{tour.summary}</p>
                  <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                    <p className="text-2xl font-semibold text-foreground transition-colors duration-200 group-hover:text-[var(--site-brand)]">
                      {canPromote ? (
                        <PromotionPrice
                          contactLabel={locale === 'en' ? 'Contact us' : 'Liên hệ'}
                          currency={departure?.currency}
                          originalPrice={departure?.originalPrice}
                          price={departure?.priceFrom}
                        />
                      ) : (locale === 'en' ? 'Contact us' : 'Liên hệ')}
                    </p>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors duration-200 group-hover:text-[var(--site-brand)]">
                      {locale === 'en' ? 'Selected departure' : 'Giá theo đợt'}
                    </span>
                  </div>
                  {tour.nextDeparture ? (
                    <div className="mt-3 rounded-[18px] border border-border/60 bg-muted/25 px-4 py-3 transition-colors duration-200 group-hover:border-[var(--site-brand)]/18 group-hover:bg-[var(--site-brand)]/4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {tour.hasFutureDepartures === false
                          ? 'Đang cập nhật đợt mới'
                          : 'Đợt gần nhất'}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {tour.hasFutureDepartures === false
                          ? 'Liên hệ để nhận lịch khởi hành sắp mở'
                          : [
                              formatTourDate(tour.nextDeparture.departureDate, locale),
                              tour.nextDeparture.airline,
                            ]
                              .filter(Boolean)
                              .join(' • ')}
                      </p>
                    </div>
                  ) : null}
                  {tour.slug ? (
                    <div className="mt-5 flex flex-wrap gap-3">
                      <SiteLink
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-4 text-sm font-semibold no-underline transition-[transform,color,border-color,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[var(--site-brand)]/30 hover:bg-[var(--site-brand)]/6 hover:text-[var(--site-brand)] hover:shadow-[0_12px_28px_color-mix(in_oklch,var(--site-brand)_10%,transparent)]"
                        href={getTourPath(tour.slug)}
                      >
                        Xem chi tiết tour
                      </SiteLink>
                      <SiteLink
                        className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--site-brand)] px-4 text-sm font-semibold text-white no-underline transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_color-mix(in_oklch,var(--site-brand)_18%,transparent)]"
                        href={
                          tour.nextDeparture
                            ? `${getTourPath(tour.slug)}#departures`
                            : getTourPath(tour.slug)
                        }
                      >
                        {tour.nextDeparture ? 'Xem lịch đi gần nhất' : 'Xem đợt đi'}
                      </SiteLink>
                    </div>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      </Panel>
      <Panel>
        <SectionHeading
          eyebrow="Đợt đi gần"
          title="Một số đợt khởi hành đang mở bán"
          description="Khách có thể nhìn nhanh các đợt gần nhất theo thị trường trước khi đi sâu vào từng line tour."
        />
        <DepartureStrip departures={departures} locale={locale} />
      </Panel>
    </div>
  )
}

export const TourCampaignPage = ({
  campaign,
  departures,
  locale,
}: {
  campaign: Record<string, any>
  departures: Array<Record<string, any>>
  locale: 'en' | 'vi'
}) => (
  <div className="container space-y-8">
    <Panel className="overflow-hidden p-0">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="p-6">
          <p className="site-brand-kicker text-xs font-semibold uppercase tracking-[0.18em]">
            Campaign theo mùa
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight md:text-4xl">
            {campaign.title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
            {campaign.summary}
          </p>
        </div>
        <div className="relative min-h-72 bg-muted">
          <Media
            fill
            imgClassName="object-cover"
            pictureClassName="absolute inset-0"
            resource={campaign.heroMedia || null}
          />
        </div>
      </div>
    </Panel>
    <Panel>
      <SectionHeading
        eyebrow="Đợt nổi bật"
        title="Các đợt nổi bật trong campaign"
        description="Campaign dùng chung dữ liệu tour và departure để giữ một nguồn thật cho giá, route và lịch khởi hành."
      />
      <DepartureStrip departures={departures} locale={locale} />
    </Panel>
  </div>
)

export const TourSchedulePage = ({
  hotlines,
  locale,
  schedule,
  snapshot,
}: {
  hotlines?: HotlineItem[]
  locale: 'en' | 'vi'
  schedule?: SchedulePageViewModel | null
  snapshot?: WingsGoScheduleSnapshot | null
}) => {
  const isEn = locale === 'en'
  const resolvedHotlines =
    hotlines !== undefined ? hotlines : resolveSiteHotlines(undefined, 'wings-go')
  const zaloCTA = getSharedZaloCTA('wings-go', locale)
  const trustSignals = isEn
    ? [
        '📅 Itinerary and tour prices',
        '🌏 Tours and visa support',
        '🎧 Thoughtful support throughout',
      ]
    : ['📅 Lịch trình & giá tour', '🌏 Tour & Visa', '🎧 Hỗ trợ tận tâm']

  if (snapshot) {
    return (
      <div className="wingsgo-schedule container py-6 space-y-8">
        <WingsGoScheduleBrowser locale={locale} snapshot={snapshot} />

        {/* Khối Trước khi giữ chỗ (Assurance, D14) */}
        <WingsGoScheduleAssurance
          hotlines={resolvedHotlines}
          locale={locale}
          zaloCTA={zaloCTA}
        />
      </div>
    )
  }

  if (!schedule) {
    return null
  }

  const markets = [
    {
      key: 'korea',
      title: isEn ? '🔥 BEST-SELLING SOUTH KOREA TOURS' : '🔥 TOUR HÀN QUỐC BÁN CHẠY',
      slug: 'han-quoc',
    },
    {
      key: 'japan',
      title: isEn ? '🔥 BEST-SELLING JAPAN TOURS' : '🔥 TOUR NHẬT BẢN BÁN CHẠY',
      slug: 'nhat-ban',
    },
    {
      key: 'china',
      title: isEn ? '🔥 BEST-SELLING CHINA TOURS' : '🔥 TOUR TRUNG QUỐC BÁN CHẠY',
      slug: 'trung-quoc',
    },
  ]
  const marketHighlights = markets.map((market) => ({
    ...market,
    departure: getPriorityMarketDeparture(schedule.departures, market.key),
  }))

  return (
    <div className="container space-y-8">
      <Panel>
        <SectionHeading
          eyebrow={isEn ? 'WingsGo departure schedule' : 'Lịch khởi hành outbound'}
          level="h1"
          title={isEn ? '2026 departures & tour prices' : 'Lịch khởi hành & giá Tour 2026'}
          description={
            isEn
              ? 'Choose a destination, scan flight dates and clear tour prices, then explore the full itinerary.'
              : 'Chọn điểm đến yêu thích, xem nhanh lịch bay và mức giá siêu hấp dẫn → khám phá lịch trình chi tiết.'
          }
        />
        <div className="grid gap-4 lg:grid-cols-[1.2fr_repeat(3,minmax(0,1fr))]">
          <div className="rounded-[24px] border border-border/60 bg-background p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {isEn ? 'Currently listed' : 'Toàn cảnh mở bán'}
            </p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {isEn
                ? `${schedule.heroStats.openCount} departures`
                : `${schedule.heroStats.openCount} đợt`}{' '}
              • {isEn ? 'from' : 'giá từ'}{' '}
              {formatTourPrice(schedule.heroStats.lowestPrice) || (isEn ? 'Contact us' : 'Liên hệ')}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {isEn
                ? 'South Korea, Japan and China with dates, airline information and a clear next step.'
                : 'Hàn Quốc, Nhật Bản, Trung Quốc với lịch đi rõ và bước tư vấn nhanh.'}
            </p>
          </div>
          <div className="rounded-[24px] bg-muted/35 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {isEn ? 'Next departure' : 'Đợt gần nhất'}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {formatTourDate(schedule.heroStats.nextDeparture?.departureDate, locale) ||
                (isEn ? 'Updating' : 'Đang cập nhật')}
            </p>
          </div>
          <div className="rounded-[24px] bg-muted/35 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {isEn ? 'Lowest listed price' : 'Giá thấp nhất'}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {formatTourPrice(schedule.heroStats.lowestPrice) || (isEn ? 'Contact us' : 'Liên hệ')}
            </p>
          </div>
          <div className="rounded-[24px] bg-muted/35 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {isEn ? 'Quick advice' : 'Tư vấn nhanh'}
            </p>
            <SiteLink
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--site-brand)] px-4 text-center text-sm font-semibold text-white no-underline"
              href={getContactPath('wings-go')}
            >
              {isEn ? 'Get tour advice' : 'Nhận tư vấn chọn đợt đi'}
            </SiteLink>
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionHeading
          eyebrow={isEn ? 'Featured by destination' : 'Tour nổi bật theo thị trường'}
          title={isEn ? 'Browse tours by destination' : 'Chọn hành trình theo điểm đến'}
          description={
            isEn
              ? 'Compare the next listed route and its current departure price in each market.'
              : 'Xem nhanh tuyến, hãng bay và giá từ của đợt gần nhất theo từng thị trường.'
          }
        />
        <div className="grid gap-4 md:grid-cols-3">
          {marketHighlights.map(({ departure, key, slug, title }) => {
            const product = departure
              ? asDoc<Record<string, any>>(departure.tourProduct)
              : null
            const href = product?.slug ? getTourPath(product.slug) : `/thi-truong/${slug}`

            return (
              <article className="flex h-full flex-col rounded-[24px] border border-border/70 bg-card p-5" key={key}>
                <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--site-brand)]">{title}</h2>
                {departure ? (
                  <dl className="mt-4 grid flex-1 gap-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">{isEn ? 'Route' : 'Tuyến'}</dt>
                      <dd className="font-semibold">{product?.title || (isEn ? 'Tour details' : 'Chi tiết tour')}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{isEn ? 'Airline' : 'Hãng bay'}</dt>
                      <dd className="font-semibold">{departure.airline || (isEn ? 'Updating' : 'Đang cập nhật')}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{isEn ? 'From' : 'Giá từ'}</dt>
                      <dd className="text-lg font-bold text-foreground">
                        {formatTourPrice(departure.priceFrom, departure.currency) || (isEn ? 'Contact us' : 'Liên hệ')}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-4 flex-1 text-sm text-muted-foreground">
                    {isEn ? 'No upcoming departure is listed yet.' : 'Chưa có lịch khởi hành sắp tới.'}
                  </p>
                )}
                <SiteLink
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-border px-4 text-sm font-semibold no-underline"
                  href={href}
                >
                  {isEn ? 'View itinerary ➔' : 'Xem hành trình ➔'}
                </SiteLink>
              </article>
            )
          })}
        </div>
      </Panel>

      <Panel>
        <SectionHeading
          eyebrow={isEn ? 'Upcoming departures' : 'Đợt đi gần'}
          title={isEn ? 'Open tours and departures' : 'Một số đợt khởi hành đang mở bán'}
          description={
            isEn
              ? 'Compare upcoming dates by destination, airline and confirmed availability.'
              : 'Xem các đợt gần nhất theo thị trường, hãng bay và tình trạng chỗ đã xác minh.'
          }
        />
        <DepartureStrip departures={schedule.featuredDepartures} locale={locale} />
      </Panel>

      <Panel>
        <SectionHeading
          eyebrow={isEn ? 'Filter and compare' : 'Lọc và so sánh'}
          title={isEn ? 'All upcoming departures' : 'Tất cả đợt khởi hành đang mở bán'}
          description={
            isEn
              ? 'Filter by destination, month, airline or availability, then compare each departure.'
              : 'Lọc theo thị trường, tháng, hãng bay và tình trạng chỗ rồi so sánh từng đợt.'
          }
        />
        <ScheduleInteractiveDepartures departures={schedule.departures} locale={locale} />
      </Panel>

      <Panel>
        <div className="rounded-[24px] border border-border/60 bg-muted/20 p-5 md:p-8">
          <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
            {isEn ? 'Ready for a memorable journey?' : 'Sẵn sàng cho hành trình đáng nhớ?'}
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {trustSignals.map((item) => (
              <li className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold" key={item}>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
            {isEn
              ? 'Do not miss a departure that fits. Send a request and the WingsGo team will recommend a program, check availability and provide a quote.'
              : 'Đừng bỏ lỡ lịch khởi hành phù hợp. Gửi yêu cầu để đội ngũ WingsGo tư vấn chương trình, kiểm tra chỗ và báo giá.'}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <SiteLink
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--site-brand)] px-5 text-sm font-semibold text-white no-underline"
              href={getContactPath('wings-go')}
            >
              {isEn ? 'GET ADVICE & A QUOTE' : 'NHẬN TƯ VẤN & BÁO GIÁ'}
            </SiteLink>
            {resolvedHotlines.map((item, idx) => (
              <a
                key={item.normalized}
                className="inline-flex min-h-11 items-center font-semibold text-foreground no-underline"
                href={item.href}
              >
                {item.label
                  ? `${item.label}: ${formatHotlineDisplay(item.normalized)}`
                  : `${idx === 0 ? (isEn ? 'Call' : 'Hotline') : (isEn ? 'Alt' : 'Hotline 2')}: ${formatHotlineDisplay(item.normalized)}`}
              </a>
            ))}
            {zaloCTA ? (
              <a
                className="inline-flex min-h-11 items-center font-semibold text-foreground underline"
                href={zaloCTA.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                Zalo
              </a>
            ) : null}
          </div>
        </div>
      </Panel>
    </div>
  )
}