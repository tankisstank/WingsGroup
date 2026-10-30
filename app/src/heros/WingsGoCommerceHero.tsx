/* eslint-disable @next/next/no-img-element */
import React from 'react'
import { PlaneIcon } from 'lucide-react'

import { SiteLink } from '@/components/SiteLink'
import { formatTourDate } from '@/tours/utils'
import {
  isDisplayablePromoLabel,
  PromotionBadge,
  PromotionPrice,
} from '@/tours/PromotionPrice'
import { getNextBusinessMonths } from '@/tours/businessCalendar'
import type {
  WingsGoCatalogCard,
  WingsGoCatalogFilters,
  WingsGoCatalogMarketSummary,
} from '@/tours/wingsGoCatalog'
import {
  getWingsGoCatalogCopy,
  resolveWingsGoCopyLocale,
  WINGSGO_MARKET_LABELS,
} from '@/tours/wingsGoCatalogCopy'
import {
  getCompactDurationLabel,
  getShortDepartureDate,
  getTourRouteTitle,
} from '@/tours/wingsGoDisplay'
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

const MosaicBadges: React.FC<{ card: WingsGoCatalogCard; withStickers?: boolean }> = ({
  card,
  withStickers = false,
}) => {
  const displayBadge = isDisplayablePromoLabel(card.nextDeparture?.promoLabel)
    ? card.nextDeparture?.promoLabel
    : undefined
  const cornerStickers = withStickers
    ? (card.editorialBadges || []).filter(
        (badge) => badge.kind === 'specialized' || badge.kind === 'vip',
      )
    : []

  if (cornerStickers.length === 0 && !displayBadge) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
      {cornerStickers.length > 0 ? (
        <div
          className={cn(
            'flex min-w-0 flex-col items-start gap-1.5',
            displayBadge ? 'max-w-[calc(100%-110px)]' : 'max-w-full',
          )}
          data-editorial-stickers="true"
        >
          {cornerStickers.map((sticker, idx) => (
            <span
              className={cn(
                'inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide shadow-sm backdrop-blur-[2px]',
                sticker.kind === 'vip'
                  ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 font-extrabold uppercase tracking-wider text-slate-950 shadow-amber-500/20'
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
        <span className="flex max-w-[50%] shrink-0 justify-end">
          <PromotionBadge label={displayBadge} />
        </span>
      ) : null}
    </div>
  )
}

const MosaicImage: React.FC<{
  card: WingsGoCatalogCard
  locale: 'en' | 'vi'
  priority?: boolean
}> = ({ card, locale, priority = false }) =>
  card.image ? (
    <img
      alt={card.image.alt || card.title}
      fetchPriority={priority ? 'high' : undefined}
      loading={priority ? 'eager' : 'lazy'}
      src={card.image.url}
    />
  ) : (
    <div
      aria-label={`${locale === 'en' ? 'Image coming soon for' : 'Ảnh đang cập nhật cho'} ${card.title}`}
      className="flex h-full items-center justify-center bg-[linear-gradient(135deg,color-mix(in_oklch,var(--site-brand)_22%,transparent),color-mix(in_oklch,var(--site-accent)_18%,transparent))]"
      role="img"
    >
      <PlaneIcon aria-hidden="true" className="h-10 w-10 text-[var(--site-brand)] opacity-50" />
    </div>
  )

const getDisplayTitle = (card: WingsGoCatalogCard, locale: 'en' | 'vi') =>
  locale === 'vi' ? getTourRouteTitle(card.title, card.nextDeparture?.departureCity) : card.title

/** Slot #1: full-height photo with the tour card floating over it. */
export const WingsGoHeroFeatureTile: React.FC<{
  card: WingsGoCatalogCard
  className?: string
  locale?: string | null
}> = ({ card, className, locale = 'vi' }) => {
  const copyLocale = resolveWingsGoCopyLocale(locale)
  const copy = getWingsGoCatalogCopy(copyLocale)
  const hasHot = Boolean(card.hasHotEditorialBadge)
  const hotBadge = (card.editorialBadges || []).find((badge) => badge.kind === 'hot')
  const departureDate = formatTourDate(card.nextDeparture?.date, copyLocale)
  const duration = getCompactDurationLabel(card.duration.days, card.duration.nights, copyLocale)
  const airline = card.nextDeparture?.airline
  const daysUntil = card.nextDeparture?.daysUntilDeparture
  const meta = [duration, departureDate ? `${copy.heroDeparturePrefix} ${departureDate}` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <article
      className={cn(
        'wingsgo-hero-mosaic__tile wingsgo-hero-mosaic__tile--main group',
        hasHot ? 'hot-rainbow-card' : '',
        className,
      )}
      data-has-hot={hasHot ? 'true' : undefined}
    >
      <SiteLink
        className="block h-full rounded-[24px] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-brand)] focus-visible:ring-offset-2"
        href={card.href}
      >
        {hasHot && hotBadge?.label ? <span className="sr-only">{hotBadge.label}</span> : null}
        <div className="wingsgo-hero-mosaic__media">
          <MosaicImage card={card} locale={copyLocale} priority />
        </div>
        <MosaicBadges card={card} withStickers />
        <div className="absolute inset-x-3 bottom-3 z-10 grid gap-2.5 rounded-[20px] bg-card p-4 text-left text-foreground shadow-[0_24px_60px_color-mix(in_oklch,var(--site-brand)_16%,transparent)] transition-colors group-hover:bg-muted sm:inset-x-auto sm:bottom-[18px] sm:left-[18px] sm:max-w-[min(62%,340px)] sm:p-[18px]">
          {airline ? (
            <span className="inline-flex w-fit items-center rounded-full bg-[var(--site-brand)] px-2.5 py-1 text-[11.5px] font-semibold text-white">
              {airline}
            </span>
          ) : null}
          <span>
            <span className="line-clamp-2 block text-[17px] font-semibold leading-[1.3]">
              {getDisplayTitle(card, copyLocale)}
            </span>
            {meta ? (
              <span className="mt-1 block text-[12.5px] text-muted-foreground">{meta}</span>
            ) : null}
          </span>
          {typeof daysUntil === 'number' ? (
            <span className="text-xs font-semibold text-[var(--site-accent)]">
              {copy.daysUntilDepartureBadge(daysUntil)}
            </span>
          ) : null}
          <span className="text-xl font-bold text-foreground">
            {card.price?.kind === 'verified' ? (
              <PromotionPrice
                contactLabel={copy.contactPriceLabel}
                currency={card.price.currency}
                originalPrice={card.price.originalPrice}
                price={card.price.value}
              />
            ) : (
              <span className="text-sm font-semibold">{copy.contactPriceLabel}</span>
            )}
          </span>
        </div>
      </SiteLink>
    </article>
  )
}

/** Slots #2-#3: photo tiles with a short route label and departure date. */
export const WingsGoHeroSideTile: React.FC<{
  card: WingsGoCatalogCard
  locale?: string | null
  tall?: boolean
}> = ({ card, locale = 'vi', tall = false }) => {
  const copyLocale = resolveWingsGoCopyLocale(locale)
  const copy = getWingsGoCatalogCopy(copyLocale)
  const hasHot = Boolean(card.hasHotEditorialBadge)
  const hotBadge = (card.editorialBadges || []).find((badge) => badge.kind === 'hot')
  const shortDate = getShortDepartureDate(card.nextDeparture?.date)

  return (
    <article
      className={cn('wingsgo-hero-mosaic__tile group', hasHot ? 'hot-rainbow-card' : '')}
      data-has-hot={hasHot ? 'true' : undefined}
      style={tall ? { gridRow: 'span 2' } : undefined}
    >
      <SiteLink
        className="block h-full rounded-[24px] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-brand)] focus-visible:ring-offset-2"
        href={card.href}
      >
        {hasHot && hotBadge?.label ? <span className="sr-only">{hotBadge.label}</span> : null}
        <div className="wingsgo-hero-mosaic__media">
          <MosaicImage card={card} locale={copyLocale} />
        </div>
        <MosaicBadges card={card} />
        <span className="absolute bottom-2.5 left-2.5 z-10 w-fit max-w-[calc(100%-20px)] rounded-xl bg-card/90 px-3 py-2 text-xs font-semibold text-foreground shadow-sm backdrop-blur-md sm:bottom-3.5 sm:left-3.5 sm:max-w-[calc(100%-28px)]">
          <span className="line-clamp-1 block sm:line-clamp-2">
            {getDisplayTitle(card, copyLocale)}
          </span>
          {shortDate ? (
            <small className="block text-[11px] font-medium text-muted-foreground">
              {copy.heroDeparturePrefix} {shortDate}
            </small>
          ) : null}
        </span>
      </SiteLink>
    </article>
  )
}

export { getNextBusinessMonths } from '@/tours/businessCalendar'

export type WingsGoCommerceHeroProps = {
  cards?: WingsGoCatalogCard[]
  filtersActive?: boolean
  initialFilters?: WingsGoCatalogFilters
  locale?: string | null
  markets?: WingsGoCatalogMarketSummary[]
}

export const WingsGoCommerceHero: React.FC<WingsGoCommerceHeroProps> = ({
  cards = [],
  filtersActive = false,
  initialFilters,
  locale = 'vi',
  markets = [],
}) => {
  const copyLocale = resolveWingsGoCopyLocale(locale)
  const copy = getWingsGoCatalogCopy(copyLocale)
  const monthOptions = getNextBusinessMonths(12, new Date(), copyLocale)
  const heroCards = filtersActive ? [] : cards.slice(0, 3)
  const [titleLead, titleEmphasis, titleTail] = copy.heroTitleParts
  const openMarkets = markets.filter((market) => market.count > 0)
  const openTourCount = openMarkets.reduce((total, market) => total + market.count, 0)

  return (
    <section
      aria-labelledby="wingsgo-commerce-hero-title"
      className="site-hero site-hero--commerce relative pb-12 pt-4 md:pb-16 md:pt-7"
    >
      <div
        className={cn(
          'container grid items-center gap-9 lg:gap-14',
          heroCards.length > 0 ? 'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]' : '',
        )}
      >
        <div className={heroCards.length > 0 ? 'min-w-0' : 'min-w-0 max-w-3xl'}>
          <p className="wingsgo-eyebrow mb-5">{copy.heroKicker}</p>
          <h1
            aria-label={copy.heroTitle}
            className="wingsgo-display text-[clamp(2.375rem,5.2vw,4.75rem)] leading-[1.02] text-foreground"
            id="wingsgo-commerce-hero-title"
          >
            {titleLead}
            <em>{titleEmphasis}</em>
            {titleTail}
          </h1>
          <p className="mb-6 mt-4 max-w-[470px] text-base text-muted-foreground md:mb-8 md:mt-5 md:text-[17px]">
            {copy.heroSubtitle}
          </p>

          <WingsGoQuickSearchForm
            initialFilters={initialFilters}
            locale={copyLocale}
            monthOptions={monthOptions}
          />

          {openMarkets.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-x-7 gap-y-3 text-[13px] text-muted-foreground">
              <span>
                <b className="block text-[15px] font-semibold text-foreground">
                  {copy.heroProofMarkets(openMarkets.length)}
                </b>
                {openMarkets
                  .map(
                    (market) =>
                      WINGSGO_MARKET_LABELS[market.market]?.[copyLocale] || market.market,
                  )
                  .join(' · ')}
              </span>
              <span>
                <b className="block text-[15px] font-semibold text-foreground">
                  {copy.heroProofTours(openTourCount)}
                </b>
                {copy.heroProofToursNote}
              </span>
            </div>
          ) : null}
        </div>

        {heroCards.length > 0 ? (
          <div className="wingsgo-hero-mosaic min-w-0" data-wingsgo-hero-mosaic="true">
            <WingsGoHeroFeatureTile
              card={heroCards[0]}
              className={heroCards.length === 1 ? 'wingsgo-hero-mosaic__tile--single' : undefined}
              locale={copyLocale}
            />
            {heroCards.slice(1).map((card) => (
              <WingsGoHeroSideTile
                card={card}
                key={String(card.id)}
                locale={copyLocale}
                tall={heroCards.length === 2}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
