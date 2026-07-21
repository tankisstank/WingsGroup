import React from 'react'

import { Media } from '@/components/Media'
import { SiteLink } from '@/components/SiteLink'

import { defaultTourSectionOrder, defaultTourSectionVisibility } from './sectionRegistry'
import { ScheduleInteractiveDepartures } from './ScheduleInteractiveDepartures'
import { TourItineraryDayDetails } from './TourItineraryDayDetails'
import type {
  DepartureCardViewModel,
  MarketPageViewModel,
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
  getLowestPrice,
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

/** Retail = WingsGo dense conversion. Consultative = Wingside private inbound. */
export type TourDetailPresentation = 'consultative' | 'retail'

const resolveTourSiteCode = (siteCode?: null | string, presentation?: TourDetailPresentation) => {
  if (siteCode) {
    return siteCode
  }

  // Fallback when caller omits siteCode — only used for consultative inquiry paths.
  return presentation === 'consultative' ? 'wings-side' : undefined
}

const asArray = <T,>(value?: T[] | null) => (Array.isArray(value) ? value : [])

const asDoc = <T extends object>(value: T | number | string | null | undefined): T | null =>
  value && typeof value === 'object' ? value : null

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
  locale: 'en' | 'vi'
  override?: null | string
}) => {
  const fallback =
    compact
      ? locale === 'en'
        ? 'Consult'
        : 'Tư vấn'
      : locale === 'en'
        ? 'Request consultation'
        : 'Yêu cầu tư vấn'

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
  locale: 'en' | 'vi'
  nextDeparture: Record<string, any> | null
  presentation?: TourDetailPresentation
  siteCode?: null | string
  tour: Record<string, any>
  variants: Array<Record<string, any>>
}) => {
  const isConsultative = presentation === 'consultative'
  const reviewSnapshot = tour.reviewSnapshot || null
  const summaryParagraphs = splitSummaryParagraphs(tour.summary)
  const badgeGroups = getBadgeGroups(asArray<Record<string, any>>(tour.badges))
  const durationLabel = getDurationLabel(tour.durationDays, tour.durationNights, locale)
  const cta = tour.primaryCTA || {}
  const siteCode = resolveTourSiteCode(siteCodeProp, presentation)
  const retailCtaIntent: TourInquiryIntent = cta.mode || tour.bcfg?.ctaStyle || 'hold-seat'
  const consultativeCtaIntent = getConsultativePrimaryIntent(cta.mode || tour.bcfg?.ctaStyle)
  const routeChips = getTourRouteChips(tour)
  const pricePosture = getTourPricePosture({
    currency: nextDeparture?.currency || tour.currency,
    locale,
    priceFrom:
      typeof nextDeparture?.priceFrom === 'number'
        ? nextDeparture.priceFrom
        : typeof tour.priceFrom === 'number'
          ? tour.priceFrom
          : null,
  })
  const consultPrimaryFallback = getTourInquiryPath({
    intent: consultativeCtaIntent,
    siteCode,
    source: 'tour-detail-hero',
    tourId: tour.id,
    tourSlug: tour.slug,
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
  })
  const consultPrimaryLabel = getConsultativePrimaryLabel({
    ctaLabel: cta.label,
    locale,
    override: nextDeparture?.ctaLabelOverride,
  })
  const consultSecondaryLabel = locale === 'en' ? 'Contact us' : 'Liên hệ'

  if (isConsultative) {
    // Single split surface (image | body) — no dual-panel gap on wide screens.
    return (
      <div
        className="overflow-hidden rounded-[28px] border border-border/70 bg-card/95 shadow-sm lg:grid lg:grid-cols-2 lg:items-stretch"
        data-tour-presentation="consultative"
      >
        <div className="relative aspect-[16/10] min-h-[16rem] bg-muted sm:min-h-[18rem] lg:aspect-auto lg:min-h-[26rem]">
          <Media
            fill
            imgClassName="object-cover"
            pictureClassName="absolute inset-0"
            priority
            resource={tour.heroMedia || asArray(tour.gallery)[0] || null}
          />
        </div>
        <div className="flex flex-col justify-center gap-4 p-5 sm:p-6 md:p-7 lg:p-8">
          <p className="site-brand-kicker text-xs font-semibold uppercase tracking-[0.18em]">
            {locale === 'en' ? 'Private journey' : 'Hành trình riêng'}
          </p>
          <h1 className="text-3xl font-semibold leading-tight md:text-[2.15rem] md:leading-[1.15]">
            {tour.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {durationLabel ? (
              <span className="rounded-full border border-border/70 bg-muted/30 px-3 py-1 font-medium text-foreground">
                {durationLabel}
              </span>
            ) : null}
            {isUsableText(tour.destinationLabel) ? (
              <span className="rounded-full border border-border/70 bg-muted/30 px-3 py-1 font-medium text-foreground">
                {tour.destinationLabel}
              </span>
            ) : isUsableText(tour.market) ? (
              <span className="rounded-full border border-border/70 bg-muted/30 px-3 py-1 font-medium capitalize text-foreground">
                {tour.market}
              </span>
            ) : null}
          </div>
          {summaryParagraphs[0] ? (
            <p className="text-sm leading-7 text-muted-foreground md:text-base">
              {summaryParagraphs[0]}
            </p>
          ) : null}
          {routeChips.length > 0 ? (
            <div
              className="flex flex-wrap gap-2"
              aria-label={locale === 'en' ? 'Route' : 'Lộ trình'}
            >
              {routeChips.map((chip) => (
                <span
                  className="rounded-full border border-[color:var(--site-brand)]/20 bg-[color:var(--site-brand)]/8 px-3 py-1.5 text-xs font-semibold text-[var(--site-brand)]"
                  key={chip}
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
          <div className="rounded-[20px] border border-border/60 bg-muted/25 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {pricePosture.label}
            </p>
            <p className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
              {pricePosture.value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{pricePosture.honesty}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <SiteLink
              className={`${TourPrimaryCtaClass} tour-cta-primary--pulse`}
              href={consultPrimaryHref}
            >
              {consultPrimaryLabel}
            </SiteLink>
            <SiteLink className={TourGhostCtaClass} href={consultSecondaryHref}>
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
  locale?: 'en' | 'vi'
  presentation?: TourDetailPresentation
  tour: Record<string, any>
}) => {
  const isConsultative = presentation === 'consultative'
  const durationLabel = getDurationLabel(tour.durationDays, tour.durationNights, locale)
  const labels =
    isConsultative && locale === 'en'
      ? {
          description:
            'Duration, route rhythm, lodging and group style — what guests need before a private consult.',
          duration: 'Duration',
          eyebrow: 'Decision facts',
          group: 'Group style',
          hotel: 'Lodging',
          meals: 'Meals',
          operator: 'Operations',
          route: 'Route',
          title: 'What you need to know first',
        }
      : {
          description:
            'Khối này gom các tín hiệu khách thường cần để chốt nhanh: route, thời lượng, nhịp ăn ở, quy mô đoàn và cách giữ chỗ.',
          duration: 'Thời lượng',
          eyebrow: 'Thông tin quyết định',
          group: 'Đoàn khách',
          hotel: 'Khách sạn',
          meals: 'Bữa ăn',
          operator: 'Điều hành',
          route: 'Route',
          title: 'Thông tin tour cần thấy ngay',
        }

  return (
    <Panel id="facts">
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
        ].map(([label, value]) =>
          isUsableText(value) ? (
            <div className="rounded-[24px] border border-border/60 bg-muted/35 p-5" key={label}>
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
  locale?: 'en' | 'vi'
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
  locale?: 'en' | 'vi'
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

const TourRouteVisualSection = ({ tour }: { tour: Record<string, any> }) => {
  const routeStops = asArray<Record<string, any>>(tour.routeViz?.stops)
  const travelLegs = asArray<Record<string, any>>(tour.routeViz?.travelLegs)
  const mapImage = tour.routeViz?.mapImage
  const summaryParagraphs = splitSummaryParagraphs(tour.summary)

  return (
    <Panel id="route">
      <SectionHeading
        eyebrow="Hành trình trực quan"
        title="Nhịp hành trình và route thực tế"
        description={isUsableText(tour.routeViz?.routeCaption) ? tour.routeViz.routeCaption : null}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-border/60 bg-muted/20 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Tóm tắt route
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
                        Bước {String(index + 1).padStart(2, '0')}
                      </p>
                      <p className="mt-2 text-base font-semibold text-foreground">{stop.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {stop.type || 'Điểm trong chương trình'}
                      </p>
                    </div>
                  ))}
              </div>
            ) : null}
            {travelLegs.length > 0 ? (
              <div className="rounded-[24px] border border-border/60 bg-background p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Chặng di chuyển
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
                        {leg.mode || 'Theo tuyến'}
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
                Các điểm chính
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
  locale?: 'en' | 'vi'
  presentation?: TourDetailPresentation
  tour: Record<string, any>
}) => {
  const isConsultative = presentation === 'consultative'
  const itineraryDays = asArray<Record<string, any>>(tour.itineraryDays)
  const groupedThemeCount = new Set(itineraryDays.map((day) => day.route).filter(Boolean)).size
  const isEn = locale === 'en'
  const heading =
    isConsultative && isEn
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
      <Panel className="scroll-mt-28 md:scroll-mt-24" id="itinerary">
        <SectionHeading eyebrow={heading.eyebrow} title={heading.title} description={null} />
        <div className="tour-itinerary-accordion space-y-2 sm:space-y-3">
          {itineraryDays.map((day, index) => {
            const gallery = asArray(day.gallery)
            const dayId = `itinerary-day-${day.dayNumber || index + 1}`
            const panelId = `${dayId}-panel`
            const infoItems = compactInfoItems([
              [isEn ? 'Meals' : 'Bữa ăn', day.meals],
              [isEn ? 'Transport' : 'Di chuyển', day.transport],
              [isEn ? 'Stay' : 'Lưu trú', day.accommodation],
              [isEn ? 'Sleep standard' : 'Tiêu chuẩn nghỉ', day.sleepingStandard],
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
                  id={dayId}
                >
                  <div className="shrink-0 rounded-[16px] bg-muted/50 px-3 py-2 text-center sm:rounded-[20px] sm:px-4 sm:py-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Day
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
                        <p className="mt-3 text-sm leading-7 text-muted-foreground">{day.summary}</p>
                      ) : null}
                      {day.dayHighlight ? (
                        <div className="mt-4 rounded-[20px] border border-border/60 bg-background p-4">
                          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                            {isEn ? 'Highlight' : 'Điểm nhấn'}
                          </p>
                          <p className="mt-2 text-sm leading-7 text-foreground">{day.dayHighlight}</p>
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
  locale?: 'en' | 'vi'
  presentation?: TourDetailPresentation
  tour: Record<string, any>
}) => {
  const isConsultative = presentation === 'consultative'
  const isEn = locale === 'en'
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
      <Panel id="services">
        <SectionHeading
          eyebrow={isEn ? 'Included & excluded' : 'Dịch vụ'}
          title={isEn ? 'What is included — and what is not' : 'Giá đã gồm gì và chi phí tự túc'}
          description={null}
        />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-[24px] border border-border/60 bg-muted/20 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--site-brand)]">
              {isEn ? 'Included' : 'Đã gồm'}
            </p>
            <ul className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
              {includes.length > 0 ? (
                includes.map((item, index) => (
                  <li key={`${item.label}-${index}`}>{item.label}</li>
                ))
              ) : (
                <li>{isEn ? 'Confirmed on consultation.' : 'Xác nhận khi tư vấn.'}</li>
              )}
            </ul>
          </div>
          <div className="rounded-[24px] border border-border/60 bg-muted/20 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {isEn ? 'Not included' : 'Chưa gồm'}
            </p>
            <ul className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
              {excludes.length > 0 ? (
                excludes.map((item, index) => (
                  <li key={`${item.label}-${index}`}>{item.label}</li>
                ))
              ) : (
                <li>{isEn ? 'Confirmed on consultation.' : 'Xác nhận khi tư vấn.'}</li>
              )}
            </ul>
          </div>
        </div>
        {isUsableText(peakNote) ? (
          <div className="mt-5 rounded-[22px] border border-border/60 bg-background p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {isEn ? 'Peak / surcharge note' : 'Lưu ý mùa cao điểm'}
            </p>
            <p className="mt-2 text-sm leading-7 text-foreground">{peakNote}</p>
          </div>
        ) : null}
        {(servicesSummary.hotelSummary ||
          tour.factSummary?.hotelSummary ||
          servicesSummary.transportSummary ||
          servicesSummary.mealsSummary) && (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {servicesSummary.hotelSummary || tour.factSummary?.hotelSummary ? (
              <div className="rounded-[22px] border border-border/60 bg-background p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {isEn ? 'Lodging' : 'Lưu trú'}
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {servicesSummary.hotelSummary || tour.factSummary?.hotelSummary}
                </p>
              </div>
            ) : null}
            {servicesSummary.transportSummary || servicesSummary.mealsSummary ? (
              <div className="rounded-[22px] border border-border/60 bg-background p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {isEn ? 'Transport & meals' : 'Di chuyển & ăn uống'}
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
  locale: 'en' | 'vi'
  nextDeparture: Record<string, any> | null
  tour: Record<string, any>
}) => {
  const isEn = locale === 'en'
  const pricePosture = getTourPricePosture({
    currency: nextDeparture?.currency || tour.currency,
    locale,
    priceFrom:
      typeof nextDeparture?.priceFrom === 'number'
        ? nextDeparture.priceFrom
        : typeof tour.priceFrom === 'number'
          ? tour.priceFrom
          : null,
  })
  const seasonNotes = [
    tour.factSummary?.seasonNote,
    tour.servicesSummary?.seasonNote,
    tour.bcfg?.seasonNote,
  ].filter((value) => isUsableText(value)) as string[]

  return (
    <Panel id="departures">
      <SectionHeading
        eyebrow={isEn ? 'Dates & price' : 'Thời điểm & giá'}
        title={isEn ? 'Private pricing posture' : 'Cách định giá private'}
        description={
          isEn
            ? 'No public seat inventory. Final price is confirmed with sales for your travel window.'
            : 'Không hiển thị inventory ghế công khai. Giá chốt với sales theo khung thời gian của bạn.'
        }
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
            {isEn ? 'How booking works' : 'Cách chốt tour'}
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
            <li>
              {isEn
                ? 'Share dates, party size, and pace preference.'
                : 'Chia sẻ ngày đi, số khách và nhịp mong muốn.'}
            </li>
            <li>
              {isEn
                ? 'We reply within 24 hours with a tailored outline.'
                : 'Phản hồi trong 24 giờ với đề xuất riêng.'}
            </li>
            <li>
              {isEn
                ? 'Sales confirms price before any hold or deposit.'
                : 'Sales xác nhận giá trước khi giữ chỗ hoặc đặt cọc.'}
            </li>
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
  locale: 'en' | 'vi'
  nextDeparture: Record<string, any> | null
  siteCode?: null | string
  tour: Record<string, any>
}) => {
  const isEn = locale === 'en'
  const cta = tour.primaryCTA || {}
  const intent = getConsultativePrimaryIntent(cta.mode || tour.bcfg?.ctaStyle)
  const siteCode = resolveTourSiteCode(siteCodeProp, 'consultative')
  const pricePosture = getTourPricePosture({
    currency: nextDeparture?.currency || tour.currency,
    locale,
    priceFrom:
      typeof nextDeparture?.priceFrom === 'number'
        ? nextDeparture.priceFrom
        : typeof tour.priceFrom === 'number'
          ? tour.priceFrom
          : null,
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
  })
  const primaryHref = resolveConsultativeCtaHref({
    cmsHref: cta.href,
    fallbackPath: primaryFallback,
  })

  return (
    <aside className="tour-decision-rail hidden lg:block" aria-label={isEn ? 'Plan this journey' : 'Lên kế hoạch'}>
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
            })}
          >
            {isEn ? 'Contact us' : 'Liên hệ'}
          </SiteLink>
        </div>
        <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
          <li>{isEn ? 'Private / tailor-made pacing' : 'Nhịp private / tailor-made'}</li>
          <li>{isEn ? 'Reply within 24 hours' : 'Phản hồi trong 24 giờ'}</li>
          <li>{isEn ? 'No public seat scarcity claims' : 'Không scarcity ghế công khai'}</li>
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
  locale: 'en' | 'vi'
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
  locale: 'en' | 'vi'
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
  locale?: 'en' | 'vi'
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
          isEn ? 'Questions guests usually ask before booking' : 'Câu hỏi khách thường hỏi trước khi chốt'
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
  locale?: 'en' | 'vi'
  presentation?: TourDetailPresentation
  tour: Record<string, any>
}) => {
  const relatedTours = asArray<Record<string, any>>(tour.relatedTours).filter(
    (item) => typeof item === 'object',
  )
  const isEn = presentation === 'consultative' && locale === 'en'

  if (relatedTours.length === 0) {
    return null
  }

  return (
    <Panel id="related">
      <SectionHeading
        eyebrow={isEn ? 'Related journeys' : 'Tour liên quan'}
        title={isEn ? 'Other itineraries near this need' : 'Các line gần với nhu cầu này'}
        description={
          isEn
            ? 'Nearby private journeys to compare pace, style, and destinations.'
            : 'Gợi ý thêm các chương trình gần thị trường hoặc ngân sách để khách dễ so sánh.'
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {relatedTours.map((item) => (
          <div className="rounded-[24px] border border-border/60 bg-background p-5" key={item.id}>
            <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.summary}</p>
            {item.slug ? (
              <SiteLink
                className="mt-4 inline-flex text-sm font-semibold no-underline"
                href={getTourPath(item.slug)}
              >
                {isEn ? 'View journey' : 'Xem tour'}
              </SiteLink>
            ) : null}
          </div>
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
  locale?: 'en' | 'vi'
  nextDeparture: Record<string, any> | null
  presentation?: TourDetailPresentation
  siteCode?: null | string
  tour: Record<string, any>
}) => {
  const isConsultative = presentation === 'consultative'
  const isEn = locale === 'en'
  const siteCode = isConsultative ? resolveTourSiteCode(siteCodeProp, presentation) : undefined
  const pricePosture = getTourPricePosture({
    currency: nextDeparture?.currency || tour.currency,
    locale,
    priceFrom:
      typeof nextDeparture?.priceFrom === 'number'
        ? nextDeparture.priceFrom
        : typeof tour.priceFrom === 'number'
          ? tour.priceFrom
          : null,
  })

  if (isConsultative) {
    return (
      <div className="sticky bottom-2 z-20 max-w-full pb-[env(safe-area-inset-bottom)] md:bottom-4">
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
                intent: getConsultativePrimaryIntent(
                  tour.primaryCTA?.mode || tour.bcfg?.ctaStyle,
                ),
                siteCode,
                source: 'tour-detail-sticky',
                tourId: tour.id,
                tourSlug: tour.slug,
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
  locale,
  presentation = 'retail',
  siteCode: siteCodeProp,
}: {
  data: TourResolvedData
  locale: 'en' | 'vi'
  presentation?: TourDetailPresentation
  siteCode?: null | string
}) => {
  const tour = data.tour
  const isConsultative =
    presentation === 'consultative' || isConsultativeTourSiteCode(siteCodeProp)
  const resolvedPresentation: TourDetailPresentation = isConsultative ? 'consultative' : 'retail'
  const siteCode = resolveTourSiteCode(siteCodeProp, resolvedPresentation)
  const isEn = locale === 'en'
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
    route: <TourRouteVisualSection tour={tour} />,
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
  const navLabels: Record<string, { long: string; short: string }> = isConsultative && isEn
    ? {
        departures: { long: 'Dates & price', short: 'Dates' },
        facts: { long: 'Facts', short: 'Facts' },
        faq: { long: 'FAQ', short: 'FAQ' },
        itinerary: { long: 'Itinerary', short: 'Days' },
        related: { long: 'Related', short: 'Related' },
        reviews: { long: 'Reviews', short: 'Reviews' },
        route: { long: 'Overview', short: 'Route' },
        services: { long: 'Included', short: 'Include' },
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
          ? 'container tour-detail--consultative space-y-5 pb-20 md:space-y-6 lg:pb-8'
          : 'container space-y-8'
      }
      data-tour-presentation={resolvedPresentation}
    >
      {sections.hero}

      <div className="sticky top-0 z-10 rounded-[20px] border border-border/70 bg-background/95 p-1.5 shadow-sm backdrop-blur sm:rounded-[28px] sm:p-3">
        <nav
          aria-label={isEn ? 'Tour sections' : 'Mục lục tour'}
          className="flex snap-x gap-1.5 overflow-x-auto whitespace-nowrap text-xs font-semibold [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-2 sm:text-sm lg:flex-wrap lg:items-center lg:gap-3 [&::-webkit-scrollbar]:hidden"
        >
          {navSections.map((section) => (
            <a
              className="flex min-h-11 shrink-0 snap-start items-center justify-center rounded-full px-3 py-1.5 text-center text-muted-foreground no-underline hover:bg-muted/35 hover:text-foreground sm:px-4 sm:py-2"
              href={`#${section}`}
              key={section}
            >
              <span className="sm:hidden">{navLabels[section]?.short || section}</span>
              <span className="hidden sm:inline">{navLabels[section]?.long || section}</span>
            </a>
          ))}
        </nav>
      </div>

      {isConsultative ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-8">
            {bodySections.map((section) => (
              <React.Fragment key={section}>{sections[section]}</React.Fragment>
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
  locale: 'en' | 'vi'
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
