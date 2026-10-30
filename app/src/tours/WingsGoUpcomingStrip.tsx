import React from 'react'
import { PlaneIcon } from 'lucide-react'

import { SiteLink } from '@/components/SiteLink'
import { WingsGoUpcomingBoard } from './WingsGoUpcomingBoard'
import type { WingsGoCatalogCard } from './wingsGoCatalog'
import {
  getWingsGoCatalogCopy,
  resolveWingsGoCopyLocale,
  WINGSGO_MARKET_LABELS,
} from './wingsGoCatalogCopy'
import {
  formatShortTourPrice,
  getCompactDurationLabel,
  getDepartureCityCode,
  getDepartureStub,
  getTourRouteTitle,
} from './wingsGoDisplay'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'

export type WingsGoUpcomingStripProps = {
  cards?: WingsGoCatalogCard[]
  locale?: SupportedLocaleCode | string | null
}

export const WingsGoUpcomingStrip: React.FC<WingsGoUpcomingStripProps> = ({
  cards = [],
  locale = 'vi',
}) => {
  if (!cards || cards.length === 0) {
    return null
  }

  const copyLocale = resolveWingsGoCopyLocale(locale)
  const copy = getWingsGoCatalogCopy(copyLocale)
  const [titleLead, titleEmphasis, titleTail] = copy.upcomingTitleParts

  return (
    <section
      aria-labelledby="wingsgo-upcoming-strip-heading"
      className="bg-background py-12 md:py-16"
      id="departures"
    >
      <div className="container">
        <WingsGoUpcomingBoard
          boardLabel={copy.upcomingBoardLabel}
          heading={
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {copy.upcomingKicker}
              </p>
              <h2
                aria-label={copy.upcomingTitle}
                className="wingsgo-display text-[clamp(2.125rem,3.6vw,3.25rem)] leading-[1.06] text-foreground"
                id="wingsgo-upcoming-strip-heading"
              >
                {titleLead}
                <em>{titleEmphasis}</em>
                {titleTail}
              </h2>
            </div>
          }
          nextLabel={copy.upcomingNext}
          prevLabel={copy.upcomingPrev}
        >
          {cards.map((card) => {
            const stub = getDepartureStub(card.nextDeparture.date, copyLocale)
            const cityCode = getDepartureCityCode(card.nextDeparture.departureCity)
            const marketLabel =
              WINGSGO_MARKET_LABELS[card.market]?.[copyLocale] || card.market
            const duration = getCompactDurationLabel(
              card.duration.days,
              card.duration.nights,
              copyLocale,
            )
            const daysUntil = card.nextDeparture.daysUntilDeparture
            const routeTitle =
              copyLocale === 'vi'
                ? getTourRouteTitle(card.title, card.nextDeparture.departureCity)
                : card.title

            return (
              <SiteLink
                className="wingsgo-ticket"
                href={card.href}
                key={String(card.id)}
              >
                <span className="wingsgo-ticket__stub">
                  {stub ? (
                    <>
                      <span className="wingsgo-ticket__day">{stub.day}</span>
                      <span className="text-xs font-semibold uppercase tracking-[0.08em]">
                        {stub.month}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{stub.weekday}</span>
                    </>
                  ) : (
                    <PlaneIcon className="h-6 w-6 text-[var(--site-brand)]" />
                  )}
                </span>
                <span className="flex min-w-0 flex-col gap-2 px-[18px] py-4">
                  <span className="flex min-w-0 items-center gap-2 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    {cityCode ? <span className="shrink-0">{cityCode}</span> : null}
                    <PlaneIcon
                      aria-hidden="true"
                      className="h-3.5 w-3.5 shrink-0 rotate-45 text-[var(--site-brand)]"
                    />
                    <span className="truncate">
                      {marketLabel}
                      {duration ? ` · ${duration}` : ''}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-[15.5px] font-semibold leading-[1.35]">
                    {routeTitle}
                  </span>
                  {typeof daysUntil === 'number' ? (
                    <span className="text-xs font-semibold text-[var(--site-accent)]">
                      {copy.daysUntilDepartureBadge(daysUntil)}
                    </span>
                  ) : null}
                  <span className="mt-auto flex items-end justify-between gap-2.5 text-[12.5px] text-muted-foreground">
                    <span className="min-w-0">{card.nextDeparture.airline || ''}</span>
                    {card.price.kind === 'verified' ? (
                      <strong className="whitespace-nowrap text-base font-bold text-foreground">
                        <span className="sr-only">{copy.heroPriceFrom} </span>
                        {formatShortTourPrice(card.price.value, copyLocale)}
                      </strong>
                    ) : (
                      <strong className="whitespace-nowrap text-sm font-semibold text-foreground">
                        {copy.contactPriceShortLabel}
                      </strong>
                    )}
                  </span>
                </span>
              </SiteLink>
            )
          })}
        </WingsGoUpcomingBoard>
      </div>
    </section>
  )
}
