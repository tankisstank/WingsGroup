/* eslint-disable @next/next/no-img-element */
import React from 'react'
import { PlaneIcon } from 'lucide-react'

import { SiteLink } from '@/components/SiteLink'
import { formatTourDate, getDurationLabel } from '@/tours/utils'
import {
  isDisplayablePromoLabel,
  PromotionBadge,
  PromotionPrice,
} from '@/tours/PromotionPrice'
import { toBusinessCalendarDay } from '@/tours/businessCalendar'
import type {
  WingsGoCatalogCard,
  WingsGoCatalogFilters,
} from '@/tours/wingsGoCatalog'
import {
  getWingsGoCatalogCopy,
  resolveWingsGoCopyLocale,
  WINGSGO_MARKET_LABELS,
} from '@/tours/wingsGoCatalogCopy'
import { cn } from '@/utilities/ui'
import { WingsGoQuickSearchForm } from './WingsGoQuickSearchForm'

export type WingsGoHeroTourRowProps = {
  locale?: string | null
  tour: WingsGoCatalogCard
}

export const WingsGoHeroTourRow: React.FC<WingsGoHeroTourRowProps> = ({
  locale = 'vi',
  tour,
}) => {
  const isEn = locale === 'en'
  const departureDate = formatTourDate(tour.nextDeparture?.date, (locale || 'vi') as never)
  const airline = tour.nextDeparture?.airline
  const dateMeta = departureDate
    ? `${departureDate}${airline ? ` · ${airline}` : ''}`
    : airline || (isEn ? 'Latest departure' : 'Lịch mở bán mới nhất')
  const priceText =
    tour.price?.kind === 'verified' ? (
      <PromotionPrice
        currency={tour.price.currency}
        originalPrice={tour.price.originalPrice}
        price={tour.price.value}
      />
    ) : isEn ? (
      'Contact us'
    ) : (
      'Liên hệ'
    )
  const promoBadge = tour.nextDeparture?.promoLabel?.trim() || ''
  const href = tour.href || `/tour/${tour.slug}`

  return (
    <SiteLink
      className="site-departure-row group flex items-center gap-4 py-4 transition-colors hover:bg-muted/40 no-underline rounded-2xl px-3 -mx-3"
      href={href}
      key={tour.id}
    >
      <div className="relative h-16 w-16 md:h-18 md:w-18 shrink-0 overflow-hidden rounded-2xl border border-border/70 bg-muted shadow-xs">
        {tour.image ? (
          <img
            alt={tour.image.alt || tour.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            src={tour.image.url}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted/60 text-muted-foreground">
            <PlaneIcon className="h-6 w-6 opacity-40" />
          </div>
        )}
        <div className="absolute inset-x-1 top-1 flex justify-start">
          <PromotionBadge label={promoBadge} />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="line-clamp-1 text-base md:text-lg font-bold text-foreground group-hover:text-[var(--site-brand)] transition-colors">
            {tour.title}
          </h3>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground line-clamp-1">{dateMeta}</p>
          <strong className="max-w-full text-base md:text-lg font-bold text-[var(--site-accent)]">
            {priceText}
          </strong>
        </div>
      </div>
    </SiteLink>
  )
}

export const WingsGoHeroLargeCard: React.FC<{
  card: WingsGoCatalogCard
  locale?: string | null
}> = ({ card, locale = 'vi' }) => {
  const isEn = locale === 'en'
  const copy = getWingsGoCatalogCopy(locale)
  const displayBadge = isDisplayablePromoLabel(card.nextDeparture?.promoLabel)
    ? card.nextDeparture?.promoLabel
    : undefined

  const editorialBadges = card.editorialBadges || []
  const hasHot = Boolean(card.hasHotEditorialBadge)
  const hotBadge = editorialBadges.find((b) => b.kind === 'hot')
  const cornerStickers = editorialBadges.filter(
    (b) => b.kind === 'specialized' || b.kind === 'vip',
  )
  const departureDate = formatTourDate(card.nextDeparture?.date, (locale || 'vi') as never)
  const airline = card.nextDeparture?.airline
  const daysUntil = card.nextDeparture?.daysUntilDeparture

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-sm transition-[transform,box-shadow,border-color] duration-200 motion-reduce:transition-none hover:-translate-y-1 motion-reduce:hover:transform-none hover:border-[var(--site-brand)]/35 hover:shadow-[0_18px_48px_color-mix(in_oklch,var(--site-brand)_14%,transparent)]',
        hasHot ? 'hot-rainbow-card border-transparent' : '',
      )}
      data-has-hot={hasHot ? 'true' : undefined}
    >
      <SiteLink className="block no-underline" href={card.href}>
        {hasHot && hotBadge?.label ? (
          <span className="sr-only">{hotBadge.label}</span>
        ) : null}
        <div className="relative aspect-[16/10] overflow-hidden rounded-t-[23px] bg-muted">
          {cornerStickers.length > 0 || displayBadge ? (
            <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2 pointer-events-none">
              {cornerStickers.length > 0 ? (
                <div
                  className={cn(
                    'flex flex-col items-start gap-1.5 min-w-0',
                    displayBadge ? 'max-w-[calc(100%-110px)]' : 'max-w-full',
                  )}
                  data-editorial-stickers="true"
                >
                  {cornerStickers.map((sticker, idx) => (
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
              ) : (
                <div />
              )}
              {displayBadge ? (
                <span className="flex justify-end shrink-0 max-w-[50%]">
                  <PromotionBadge label={displayBadge} />
                </span>
              ) : null}
            </div>
          ) : null}
          {card.image ? (
            <img
              alt={card.image.alt || card.title}
              className="h-full w-full object-cover transition-transform duration-300 motion-reduce:transition-none group-hover:scale-[1.03] motion-reduce:group-hover:transform-none"
              loading="lazy"
              src={card.image.url}
            />
          ) : (
            <div
              aria-label={`${isEn ? 'Image coming soon for' : 'Ảnh đang cập nhật cho'} ${card.title}`}
              className="flex h-full items-center justify-center bg-[linear-gradient(135deg,color-mix(in_oklch,var(--site-brand)_18%,transparent),color-mix(in_oklch,var(--site-accent)_16%,transparent))] px-6 text-center text-sm font-semibold text-foreground/70"
              role="img"
            >
              {isEn ? 'Tour image coming soon' : 'Ảnh tour đang cập nhật'}
            </div>
          )}
        </div>
        <div className="space-y-4 p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span>
              {WINGSGO_MARKET_LABELS[card.market]?.[isEn ? 'en' : 'vi'] || card.market}
            </span>
            <span aria-hidden="true">•</span>
            <span>{getDurationLabel(card.duration.days, card.duration.nights, locale as never)}</span>
          </div>

          <h2 className="text-xl font-bold leading-tight text-foreground transition-colors group-hover:text-[var(--site-brand)] md:text-2xl">
            {card.title}
          </h2>

          {card.summary ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {card.summary}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-border/60 bg-muted/25 px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {copy.heroNextDeparture}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {departureDate}
                {card.nextDeparture?.departureCity ? ` • ${card.nextDeparture.departureCity}` : ''}
                {airline ? ` • ${airline}` : ''}
              </p>
            </div>
            {typeof daysUntil === 'number' ? (
              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {copy.daysUntilDepartureBadge(daysUntil)}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4 pt-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {copy.heroPriceFrom}
              </p>
              <div className="mt-1 text-xl font-bold text-[var(--site-accent)]">
                {card.price?.kind === 'verified' ? (
                  <PromotionPrice
                    contactLabel={copy.contactPriceLabel}
                    currency={card.price.currency}
                    originalPrice={card.price.originalPrice}
                    price={card.price.value}
                  />
                ) : (
                  copy.contactPriceLabel
                )}
              </div>
            </div>
            <span className="text-sm font-semibold text-[var(--site-brand)] group-hover:underline">
              {copy.heroViewTour} →
            </span>
          </div>
        </div>
      </SiteLink>
    </article>
  )
}

export const getNextBusinessMonths = (
  count = 12,
  now = new Date(),
  locale = 'vi',
): Array<{ label: string; value: string }> => {
  const currentDayStr = toBusinessCalendarDay(now) || '2026-10-01'
  const [yearStr, monthStr] = currentDayStr.split('-')
  let currentYear = Number(yearStr)
  let currentMonth = Number(monthStr)

  const options: Array<{ label: string; value: string }> = []
  for (let i = 0; i < count; i++) {
    const y = currentYear
    const m = currentMonth
    const value = `${y}-${String(m).padStart(2, '0')}`
    const label =
      locale === 'en'
        ? new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(
            new Date(Date.UTC(y, m - 1, 1)),
          )
        : `Tháng ${m}/${y}`
    options.push({ label, value })

    currentMonth++
    if (currentMonth > 12) {
      currentMonth = 1
      currentYear++
    }
  }
  return options
}

export type WingsGoCommerceHeroProps = {
  cards?: WingsGoCatalogCard[]
  filtersActive?: boolean
  initialFilters?: WingsGoCatalogFilters
  locale?: string | null
}

export const WingsGoCommerceHero: React.FC<WingsGoCommerceHeroProps> = ({
  cards = [],
  filtersActive = false,
  initialFilters,
  locale = 'vi',
}) => {
  const copyLocale = resolveWingsGoCopyLocale(locale)
  const copy = getWingsGoCatalogCopy(copyLocale)
  const monthOptions = getNextBusinessMonths(12, new Date(), copyLocale)

  return (
    <section
      aria-labelledby="wingsgo-commerce-hero-title"
      className="site-hero site-hero--commerce relative border-b border-border/40 bg-gradient-to-b from-muted/30 via-background to-background py-10 md:py-16"
    >
      <div className="container space-y-8">
        <div className="max-w-3xl space-y-3">
          <p className="site-brand-kicker text-xs font-semibold uppercase tracking-[0.18em]">
            {copy.heroKicker}
          </p>
          <h1
            className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl"
            id="wingsgo-commerce-hero-title"
          >
            {copy.heroTitle}
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
            {copy.heroSubtitle}
          </p>
        </div>

        <WingsGoQuickSearchForm
          initialFilters={initialFilters}
          locale={copyLocale}
          monthOptions={monthOptions}
        />

        {!filtersActive && cards.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-12 lg:items-start pt-2">
            <div className="lg:col-span-7 xl:col-span-7">
              <WingsGoHeroLargeCard card={cards[0]} locale={copyLocale} />
            </div>

            {cards.length > 1 ? (
              <div className="flex flex-col gap-3 lg:col-span-5 xl:col-span-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  {copy.heroTrendingTitle}
                </h2>
                <div className="site-departure-stack rounded-2xl border border-border/60 bg-card p-3 shadow-xs">
                  {cards.slice(1, 3).map((tour) => (
                    <WingsGoHeroTourRow
                      key={tour.id}
                      locale={copyLocale}
                      tour={tour}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
