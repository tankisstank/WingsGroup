import React from 'react'

import { FormBlock } from '@/blocks/Form/Component'
import { Media } from '@/components/Media'
import { SiteLink } from '@/components/SiteLink'
import type { Media as MediaType } from '@/payload-types'
import type { Form as FormType } from '@payloadcms/plugin-form-builder/types'

import { defaultTourSectionOrder, defaultTourSectionVisibility } from './sectionRegistry'
import { ScheduleInteractiveDepartures } from './ScheduleInteractiveDepartures'
import { TourItineraryDayDetails } from './TourItineraryDayDetails'
import { normalizeGovernedTourPrice } from './currency'
import type {
  DepartureCardViewModel,
  SchedulePageViewModel,
  TourCardViewModel,
  TourResolvedData,
  TourSectionID,
} from './types'
import {
  formatTourDate,
  formatTourPrice,
  getAvailabilityLabel,
  getContactPath,
  getDurationLabel,
  getMarketConfig,
  getMealChipFlags,
  getSchedulePath,
  getTourInquiryPath,
  getTourPath,
  getTourPricePosture,
  getTourRouteChips,
  resolveConsultativeCtaHref,
  type TourInquiryIntent,
} from './utils'
import { isConsultativeTourSiteCode } from '@/utilities/siteCapabilities'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import { TourEnquiryContextBridge } from './TourEnquiryContextBridge'
import type { TourEnquiryContext } from './enquiryContext'
import { getWingSideTourCopy, normalizeWingSideConsultativeTour } from './wingsSideTourViewModel'

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
  nextDeparture?: null | { currency?: unknown; priceFrom?: unknown }
  tour: { currency?: unknown; priceFrom?: unknown }
}) => {
  const departurePrice = normalizeGovernedTourPrice({
    currency: nextDeparture?.currency,
    value: nextDeparture?.priceFrom,
  })

  if (departurePrice) {
    return { currency: departurePrice.currency, priceFrom: departurePrice.value }
  }

  const tourPrice = normalizeGovernedTourPrice({
    currency: tour.currency,
    value: tour.priceFrom,
  })

  return tourPrice ? { currency: tourPrice.currency, priceFrom: tourPrice.value } : {}
}

const splitSummaryParagraphs = (summary?: null | string) =>
  String(summary || '')
    .split(/(?<=\.)\s+/)
    .filter(Boolean)

const unusableContentPatterns = [
  /^dang cap nhat$/iu,
  /^theo line ban$/iu,
  /^route fallback$/iu,
  /^khach retail can route ro$/iu,
  /^can bang tham quan, nghi va thoi gian tu do$/iu,
]

const normalizeComparableText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim()

const isUsableText = (value: unknown): value is string => {
  const text = String(value || '').trim()
  if (!text) return false

  const comparable = normalizeComparableText(text)
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
    const accommodation = String(day.accommodation || '').trim()

    if (!accommodation || seen.has(accommodation)) {
      continue
    }

    seen.add(accommodation)
    items.push({
      accommodation,
      dayNumber: day.dayNumber,
      notes: day.notes,
      route: day.route,
      sleepingStandard: day.sleepingStandard,
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

const TourDecisionHeader = ({
  locale,
  nextDeparture,
  presentation = 'retail',
  siteCode: siteCodeProp,
  tour,
  variants,
}: {
  locale: SupportedLocaleCode
  nextDeparture: Record<string, any> | null
  presentation?: TourDetailPresentation
  siteCode?: null | string
  tour: Record<string, any>
  variants: Array<Record<string, any>>
}) => {
  const isConsultative = presentation === 'consultative'
  const wingSideCopy = getWingSideTourCopy(locale)
  const reviewSnapshot = tour.reviewSnapshot || null
  const summaryParagraphs = splitSummaryParagraphs(tour.summary)
  const badgeGroups = getBadgeGroups(asArray<Record<string, any>>(tour.badges))
  const durationLabel = getDurationLabel(tour.durationDays, tour.durationNights, locale)
  const cta = tour.primaryCTA || {}
  const siteCode = resolveTourSiteCode(siteCodeProp, presentation)
  const retailCtaIntent: TourInquiryIntent = cta.mode || tour.bcfg?.ctaStyle || 'hold-seat'
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.95fr]" data-tour-presentation="retail">
      <Panel className="overflow-hidden p-0">
        <div className="relative aspect-[16/10] bg-muted">
          <Media
            fill
            imgClassName="object-cover"
            pictureClassName="absolute inset-0"
            priority
            resource={tour.heroMedia || asArray(tour.gallery)[0] || null}
          />
        </div>
      </Panel>
      <div className="space-y-4">
        <Panel>
          <p className="site-brand-kicker text-xs font-semibold uppercase tracking-[0.18em]">
            Tour outbound giá rõ
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight md:text-4xl">{tour.title}</h1>
          {tour.variantLabel ? (
            <p className="mt-2 text-sm font-medium text-[var(--site-brand)]">{tour.variantLabel}</p>
          ) : null}
          {summaryParagraphs[0] ? (
            <p className="mt-3 text-sm text-muted-foreground md:text-base">
              {summaryParagraphs[0]}
            </p>
          ) : null}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-muted/50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Giá từ</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">
                {formatTourPrice(nextDeparture?.priceFrom, nextDeparture?.currency) || 'Liên hệ'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {nextDeparture?.depositNote ||
                  tour.factSummary?.holdNote ||
                  'Sales xác nhận lại giá trước khi giữ chỗ.'}
              </p>
            </div>
            <div className="rounded-2xl bg-muted/50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Khởi hành gần nhất
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatTourDate(nextDeparture?.departureDate, locale) || 'Đang cập nhật'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {[nextDeparture?.airline, nextDeparture?.departureCity]
                  .filter(Boolean)
                  .join(' • ') || 'Đang cập nhật'}
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ReviewSnapshotCard reviewSnapshot={reviewSnapshot} />
            <div className="rounded-[24px] border border-border/60 bg-background p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Quyết định nhanh
              </p>
              <div className="mt-3 grid gap-2 text-sm text-foreground">
                <p>{durationLabel || 'Theo chương trình'}</p>
                <p>{tour.factSummary?.routeSummary || tour.title}</p>
                <p>
                  {tour.factSummary?.hotelSummary ||
                    tour.servicesSummary?.hotelSummary ||
                    'Khách sạn 3-4 sao theo line bán'}
                </p>
                <p>{getAvailabilityLabel(nextDeparture?.availabilityStatus, locale)}</p>
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {badgeGroups.trust.slice(0, 6).map((label, index) => (
              <span
                className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]"
                key={`${label}-${index}`}
              >
                {label}
              </span>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <SiteLink
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--site-brand)] px-5 text-sm font-semibold text-white no-underline"
              href={
                cta.href ||
                getTourInquiryPath({
                  departureId: nextDeparture?.id,
                  intent: retailCtaIntent,
                  source: 'tour-detail-hero',
                  tourId: tour.id,
                  tourSlug: tour.slug,
                  discoveryContext: tour.discoveryContext,
                })
              }
            >
              {nextDeparture?.ctaLabelOverride || cta.label || 'Giữ chỗ'}
            </SiteLink>
            <SiteLink
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold no-underline"
              href={getSchedulePath()}
            >
              Xem lịch khởi hành
            </SiteLink>
            <SiteLink
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold no-underline"
              href={getTourInquiryPath({
                departureId: nextDeparture?.id,
                intent: 'inquiry',
                source: 'tour-detail-hero',
                tourId: tour.id,
                tourSlug: tour.slug,
                discoveryContext: tour.discoveryContext,
              })}
            >
              Nhận tư vấn nhanh
            </SiteLink>
          </div>
          {variants.length > 0 ? (
            <div className="mt-6 rounded-[24px] border border-border/60 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Biến thể tour
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {variants.map((variant) => (
                  <span
                    className="rounded-full border border-border bg-background px-3 py-1 text-sm font-medium text-foreground"
                    key={variant.id}
                  >
                    {[variant.label, variant.airline || null, variant.departureCity || null]
                      .filter(Boolean)
                      .join(' • ')}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </Panel>
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
                    {teaser(day.summary) ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground group-open:hidden">
                        {teaser(day.summary)}
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
                      {isUsableText(day.summary) ? (
                        <p className="mt-3 text-sm leading-7 text-muted-foreground">
                          {day.summary}
                        </p>
                      ) : null}
                      {day.dayHighlight ? (
                        <div className="mt-4 rounded-[20px] border border-border/60 bg-background p-4">
                          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                            {isEn ? 'Highlight' : 'Điểm nhấn'}
                          </p>
                          <p className="mt-2 text-sm leading-7 text-foreground">
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
                      {day.equipmentNote || day.notes ? (
                        <p className="mt-4 text-sm leading-7 text-muted-foreground">
                          {[day.equipmentNote, day.notes].filter(Boolean).join(' ')}
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
    <Panel id="itinerary">
      <SectionHeading eyebrow={heading.eyebrow} title={heading.title} description={null} />
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
      <div className="space-y-5">
        {itineraryDays.map((day, index) => {
          const gallery = asArray(day.gallery)
          const infoItems = compactInfoItems([
            ['Bữa ăn', day.meals],
            ['Di chuyển', day.transport],
            ['Lưu trú', day.accommodation],
            ['Tiêu chuẩn nghỉ', day.sleepingStandard],
          ])

          return (
            <div
              className={`grid gap-5 rounded-[28px] border border-border/60 bg-muted/15 p-5 ${
                gallery.length > 0 ? 'lg:grid-cols-[96px_1fr_320px]' : 'lg:grid-cols-[96px_1fr]'
              }`}
              key={`${day.dayNumber}-${index}`}
            >
              <div className="rounded-[20px] bg-muted/45 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Day {day.dayNumber}
                </p>
                <p className="mt-2 text-3xl font-semibold">
                  {String(day.dayNumber).padStart(2, '0')}
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground">{day.title}</h3>
                {day.dayTheme ? (
                  <p className="mt-2 text-sm font-semibold text-[var(--site-brand)]">
                    {day.dayTheme}
                  </p>
                ) : null}
                <p className="mt-2 text-sm font-medium text-foreground">{day.route}</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{day.summary}</p>
                {day.dayHighlight ? (
                  <div className="mt-4 rounded-[20px] border border-border/60 bg-background p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Điểm nhấn bán hàng
                    </p>
                    <p className="mt-2 text-sm leading-7 text-foreground">{day.dayHighlight}</p>
                  </div>
                ) : null}
                {infoItems.length > 0 ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                {day.equipmentNote || day.notes ? (
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">
                    {[day.equipmentNote, day.notes].filter(Boolean).join(' ')}
                  </p>
                ) : null}
              </div>
              {gallery.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Hình ảnh trong ngày
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
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
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
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
      <Panel data-od-id="tour-services" id="services">
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
    <Panel id="services">
      <SectionHeading
        eyebrow="Dịch vụ & lưu trú"
        title="Giá đã gồm gì, ngủ ở đâu, lưu ý điều hành nào cần biết"
        description={null}
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-[24px] border border-border/60 bg-muted/20 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Giá đã gồm</p>
            <ul className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
              {includes.map((item, index) => (
                <li key={`${item.label}-${index}`}>{item.label}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[24px] border border-border/60 bg-muted/20 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Chi phí tự túc
            </p>
            <ul className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
              {excludes.map((item, index) => (
                <li key={`${item.label}-${index}`}>{item.label}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[24px] border border-border/60 bg-background p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Khách sạn / nghỉ đêm
            </p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {servicesSummary.hotelSummary ||
                tour.factSummary?.hotelSummary ||
                'Tiêu chuẩn lưu trú được xác nhận theo từng chương trình.'}
            </p>
          </div>
          <div className="rounded-[24px] border border-border/60 bg-background p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Di chuyển & ăn uống
            </p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {[servicesSummary.transportSummary, servicesSummary.mealsSummary]
                .filter(Boolean)
                .join(' ')}
            </p>
          </div>
        </div>
        <div className="space-y-5">
          <div className="rounded-[24px] border border-border/60 bg-background p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Điểm ngủ đêm trong tour
            </p>
            <div className="mt-4 grid gap-3">
              {accommodationStops.map((stop, index) => (
                <div
                  className="rounded-[20px] bg-muted/25 p-4"
                  key={`${stop.accommodation}-${index}`}
                >
                  <p className="text-sm font-semibold text-foreground">
                    Đêm {stop.dayNumber}: {stop.accommodation}
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
          {servicesSummary.operatorNotes ||
          asArray<Record<string, any>>(servicesSummary.notes).length > 0 ? (
            <div className="rounded-[24px] border border-border/60 bg-background p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Lưu ý điều hành
              </p>
              {servicesSummary.operatorNotes ? (
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {servicesSummary.operatorNotes}
                </p>
              ) : null}
              <ul className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
                {asArray<Record<string, any>>(servicesSummary.notes).map((item, index) => (
                  <li key={`${item.label}-${index}`}>{item.label}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
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
}: {
  departures: DepartureCardViewModel[]
  locale: SupportedLocaleCode
}) => {
  if (departures.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {departures.map((departure) => {
        const variant = asDoc<Record<string, any>>(departure.variantRef)
        const product = asDoc<Record<string, any>>(departure.tourProduct)

        return (
          <div
            className="grid gap-4 rounded-[28px] border border-border/70 bg-card/95 p-5 lg:grid-cols-[1.35fr_repeat(4,minmax(0,1fr))_220px]"
            key={departure.id}
          >
            <div>
              <p className="text-lg font-semibold text-foreground">
                {[formatTourDate(departure.departureDate, locale), variant?.label]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {[departure.departureCity, departure.airline].filter(Boolean).join(' • ')}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                  {departure.availabilityBadge ||
                    getAvailabilityLabel(departure.availabilityStatus, locale)}
                </span>
                {departure.urgencyLabel ? (
                  <span className="rounded-full border border-[var(--site-accent)]/40 bg-[var(--site-accent)]/10 px-3 py-1 text-xs font-semibold text-foreground">
                    {departure.urgencyLabel}
                  </span>
                ) : null}
                {departure.promoLabel ? (
                  <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground">
                    {departure.promoLabel}
                  </span>
                ) : null}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Khởi hành</p>
              <p className="mt-2 text-base font-semibold">
                {formatTourDate(departure.departureDate, locale)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Ngày về</p>
              <p className="mt-2 text-base font-semibold">
                {formatTourDate(departure.returnDate, locale) || 'Theo lịch bay'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Điểm đi</p>
              <p className="mt-2 text-base font-semibold">
                {departure.departureCity || 'Theo đợt bán'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Giá từ</p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {formatTourPrice(departure.priceFrom, departure.currency) || 'Liên hệ'}
              </p>
            </div>
            <div className="flex flex-col justify-between gap-3">
              <div className="space-y-2 text-sm text-muted-foreground">
                {departure.depositNote ? <p>{departure.depositNote}</p> : null}
                {departure.holdNote ? <p>{departure.holdNote}</p> : null}
                {departure.changePolicyNote ? <p>{departure.changePolicyNote}</p> : null}
                {!departure.depositNote && !departure.holdNote && departure.note ? (
                  <p>{departure.note}</p>
                ) : null}
              </div>
              <SiteLink
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--site-brand)] px-4 text-sm font-semibold text-white no-underline"
                href={getTourInquiryPath({
                  departureId: departure.id,
                  intent: 'hold-seat',
                  source: 'tour-detail-departures',
                  tourId: product?.id,
                  tourSlug: product?.slug,
                })}
              >
                {departure.ctaLabelOverride || 'Giữ chỗ'}
              </SiteLink>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const TourDepartureSection = ({
  departures,
  locale,
}: {
  departures: DepartureCardViewModel[]
  locale: SupportedLocaleCode
}) => (
  <Panel id="departures">
    <SectionHeading
      eyebrow="Khởi hành mở bán"
      title="Các đợt đang mở bán cho line tour này"
      description="Ngày khởi hành, hãng bay và giá từ được hiển thị theo từng đợt mở bán."
    />
    <DepartureMatrix departures={departures} locale={locale} />
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
  nextDeparture,
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

  return (
    <div className="sticky bottom-2 z-20 max-w-full md:bottom-4">
      <div className="overflow-hidden rounded-[22px] border border-border/70 bg-background/95 px-3 py-2 shadow-lg backdrop-blur sm:rounded-[28px] sm:px-5 sm:py-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-foreground sm:text-sm">
              {tour.title}
            </p>
            <p className="mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground sm:text-sm">
              {[
                formatTourPrice(nextDeparture?.priceFrom, nextDeparture?.currency),
                formatTourDate(nextDeparture?.departureDate),
                nextDeparture?.airline || null,
              ]
                .filter(Boolean)
                .join(' • ')}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-3">
            <SiteLink
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-[var(--site-brand)] px-3 text-sm font-semibold text-white no-underline sm:min-h-11 sm:px-4"
              href={getTourInquiryPath({
                departureId: nextDeparture?.id,
                intent: tour.bcfg?.ctaStyle || 'hold-seat',
                source: 'tour-detail-sticky',
                tourId: tour.id,
                tourSlug: tour.slug,
                discoveryContext: tour.discoveryContext,
              })}
            >
              <span className="sm:hidden">{nextDeparture?.ctaLabelOverride || 'Tư vấn'}</span>
              <span className="hidden sm:inline">
                {nextDeparture?.ctaLabelOverride || 'Giữ chỗ ngay'}
              </span>
            </SiteLink>
            <SiteLink
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-border px-3 text-sm font-semibold no-underline sm:min-h-11 sm:px-4"
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

export const TourDetailPage = ({
  data,
  discoveryContext,
  enquiryForm,
  locale,
  presentation = 'retail',
  siteCode: siteCodeProp,
}: {
  data: TourResolvedData
  discoveryContext?: Omit<TourEnquiryContext, 'source' | 'tourId' | 'tourSlug' | 'tourTitle'>
  enquiryForm?: FormType | null
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
      <TourDepartureSection departures={data.departures} locale={locale} />
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
    <div
      className={
        isConsultative
          ? 'container tour-detail--consultative max-w-[1120px] space-y-5 pb-28 md:space-y-6 lg:pb-8'
          : 'container space-y-8'
      }
      data-tour-presentation={resolvedPresentation}
      data-od-id={isConsultative ? 'tour-root' : undefined}
    >
      {sections.hero}

      <div
        className="sticky top-0 z-10 rounded-[20px] border border-border/70 bg-background/95 p-1.5 shadow-sm backdrop-blur sm:rounded-[28px] sm:p-3"
        data-od-id={isConsultative ? 'tour-jump-nav' : undefined}
      >
        <nav
          aria-label={
            isConsultative ? wingSideCopy.overview : isEn ? 'Tour sections' : 'Mục lục tour'
          }
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
              {isConsultative && section === 'facts' ? (
                <a
                  className="flex min-h-11 shrink-0 snap-start items-center justify-center rounded-full px-3 py-1.5 text-center text-muted-foreground no-underline hover:bg-muted/35 hover:text-foreground sm:px-4 sm:py-2"
                  href="#gallery"
                >
                  {wingSideCopy.gallery}
                </a>
              ) : null}
              {isConsultative && section === 'departures' ? (
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

      {isConsultative ? (
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
      ) : (
        bodySections.map((section) => (
          <React.Fragment key={section}>{sections[section]}</React.Fragment>
        ))
      )}

      {visibleSections.has('sticky-cta') ? (
        isConsultative ? (
          <div className="lg:hidden">{sections['sticky-cta']}</div>
        ) : (
          sections['sticky-cta']
        )
      ) : null}
    </div>
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
                {formatTourPrice(departure.priceFrom, departure.currency) || 'Liên hệ'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                  {departure.availabilityBadge ||
                    getAvailabilityLabel(departure.availabilityStatus, locale)}
                </span>
                {departure.promoLabel ? (
                  <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground">
                    {departure.promoLabel}
                  </span>
                ) : null}
              </div>
              <div className="mt-5 flex gap-3">
                <SiteLink
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--site-brand)] px-4 text-sm font-semibold text-white no-underline transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_color-mix(in_oklch,var(--site-brand)_18%,transparent)]"
                  href={getTourInquiryPath({
                    departureId: departure.id,
                    intent: 'hold-seat',
                    source: 'departure-strip',
                    tourId: product?.id,
                    tourSlug: product?.slug,
                  })}
                >
                  {departure.ctaLabelOverride || 'Giữ chỗ'}
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

            return (
              <article
                className="group relative rounded-[24px] border border-border/60 bg-background p-5 shadow-sm transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-1 hover:border-[color:var(--site-accent)]/40 hover:bg-card hover:shadow-[0_18px_46px_color-mix(in_oklch,var(--site-brand)_14%,transparent)]"
                key={tour.id}
              >
                <div className="relative z-10">
                  <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-[20px] bg-muted">
                    <Media
                      fill
                      imgClassName="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      pictureClassName="absolute inset-0"
                      resource={tour.heroMedia || asArray(tour.gallery)[0] || null}
                    />
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
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <p className="text-2xl font-semibold text-foreground transition-colors duration-200 group-hover:text-[var(--site-brand)]">
                      {formatTourPrice(tour.lowestPrice) || 'Liên hệ'}
                    </p>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors duration-200 group-hover:text-[var(--site-brand)]">
                      Giá tham khảo
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

export const TourSchedulePage = ({ schedule }: { schedule: SchedulePageViewModel }) => (
  <div className="container space-y-8">
    <Panel>
      <SectionHeading
        eyebrow="Lịch khởi hành outbound"
        level="h1"
        title="Lịch khởi hành WingsGo"
        description="So sánh nhanh các đợt đang mở bán theo thị trường, hãng bay và tình trạng chỗ. Giá, ngày đi và CTA đều hiển thị sớm để khách không phải đi vòng."
      />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_repeat(3,minmax(0,1fr))]">
        <div className="rounded-[24px] border border-border/60 bg-background p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Toàn cảnh mở bán
          </p>
          <p className="mt-2 text-3xl font-semibold text-foreground">
            {schedule.heroStats.openCount} đợt • giá từ{' '}
            {formatTourPrice(schedule.heroStats.lowestPrice) || 'Liên hệ'}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Hàn Quốc, Nhật Bản, Trung Quốc với lịch đi rõ và CTA giữ chỗ ngay.
          </p>
        </div>
        <div className="rounded-[24px] bg-muted/35 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Đợt gần nhất</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatTourDate(schedule.heroStats.nextDeparture?.departureDate) || 'Đang cập nhật'}
          </p>
        </div>
        <div className="rounded-[24px] bg-muted/35 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Giá thấp nhất</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatTourPrice(schedule.heroStats.lowestPrice) || 'Liên hệ'}
          </p>
        </div>
        <div className="rounded-[24px] bg-muted/35 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">CTA nhanh</p>
          <div className="mt-3 flex flex-col gap-3">
            <SiteLink
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--site-brand)] px-4 text-sm font-semibold text-white no-underline"
              href={getContactPath()}
            >
              Nhận tư vấn chọn đợt đi
            </SiteLink>
          </div>
        </div>
      </div>
    </Panel>

    <Panel>
      <SectionHeading
        eyebrow="Đợt nên xem trước"
        title="Đợt nổi bật nên xem trước"
        description="Các đợt gần, giá tốt hoặc đang được ưu tiên hiển thị được gom lên đầu để giảm cảm giác phải đọc cả bảng dài."
      />
      <DepartureStrip departures={schedule.featuredDepartures} locale="vi" />
    </Panel>

    <Panel>
      <SectionHeading
        eyebrow="Lọc và so sánh"
        title="Tất cả đợt khởi hành đang mở bán"
        description="Lọc nhanh theo thị trường, hãng bay và trạng thái rồi so sánh từng đợt trong cùng một màn hình."
      />
      <ScheduleInteractiveDepartures departures={schedule.departures} />
    </Panel>

    <Panel>
      <SectionHeading
        eyebrow="Hỗ trợ & cam kết"
        title="Những điều khách thường cần xác nhận trước khi giữ chỗ"
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {schedule.trustSignals.map((item) => (
          <div className="rounded-[24px] border border-border/60 bg-background p-5" key={item}>
            <p className="text-sm font-semibold leading-7 text-foreground">{item}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-[24px] border border-border/60 bg-muted/20 p-5">
        <p className="text-lg font-semibold text-foreground">Chưa chọn được đợt phù hợp?</p>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          Gửi nhu cầu ngày đi, số khách và thị trường quan tâm để đội sales gợi ý đúng line, đúng
          đợt và đúng nhịp ngân sách.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <SiteLink
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--site-brand)] px-5 text-sm font-semibold text-white no-underline"
            href={getContactPath()}
          >
            Nhận tư vấn nhanh
          </SiteLink>
          <SiteLink
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold no-underline"
            href="/thi-truong"
          >
            Xem theo thị trường
          </SiteLink>
        </div>
      </div>
    </Panel>
  </div>
)
