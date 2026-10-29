import React from 'react'

import { SiteLink } from '@/components/SiteLink'
import { PromotionPrice } from './PromotionPrice'
import { formatTourDate } from './utils'
import type { WingsGoCatalogCard } from './wingsGoCatalog'
import {
  getWingsGoCatalogCopy,
  resolveWingsGoCopyLocale,
} from './wingsGoCatalogCopy'
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

  return (
    <section
      aria-labelledby="wingsgo-upcoming-strip-heading"
      className="border-b border-border/40 bg-muted/10 py-8 md:py-10"
    >
      <div className="container space-y-5">
        <div className="flex flex-col gap-1">
          <p className="site-brand-kicker text-xs font-semibold uppercase tracking-[0.18em]">
            {copy.upcomingKicker}
          </p>
          <h2
            className="text-2xl font-bold tracking-tight text-foreground md:text-3xl"
            id="wingsgo-upcoming-strip-heading"
          >
            {copy.upcomingTitle}
          </h2>
          <p className="text-sm text-muted-foreground">
            {copy.upcomingDescription}
          </p>
        </div>

        <div
          aria-label={copy.upcomingTitle}
          className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-none md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 md:overflow-visible md:pb-0"
          role="region"
        >
          {cards.map((card) => {
            const daysUntilText =
              typeof card.nextDeparture?.daysUntilDeparture === 'number'
                ? copy.daysUntilDepartureBadge(card.nextDeparture.daysUntilDeparture)
                : null

            return (
              <article
                className="group relative flex w-[280px] shrink-0 snap-start flex-col justify-between rounded-[20px] border border-border/70 bg-card p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--site-brand)]/40 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:w-auto"
                key={String(card.id)}
              >
                <SiteLink
                  className="flex h-full flex-col justify-between gap-3 rounded-[16px] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-brand)]"
                  href={card.href}
                >
                  <div className="space-y-2">
                    {daysUntilText ? (
                      <span className="inline-flex w-fit items-center rounded-full bg-[var(--site-brand)]/10 px-2.5 py-0.5 text-[11px] font-bold text-[var(--site-brand)]">
                        {daysUntilText}
                      </span>
                    ) : null}
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-[var(--site-brand)]">
                      {card.title}
                    </h3>
                  </div>

                  <div className="space-y-2 border-t border-border/40 pt-2 text-xs">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {formatTourDate(card.nextDeparture.date, copyLocale)}
                      </span>
                      {card.nextDeparture.departureCity ? ` • ${card.nextDeparture.departureCity}` : ''}
                      {card.nextDeparture.airline ? ` • ${card.nextDeparture.airline}` : ''}
                    </p>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {copy.heroPriceFrom}
                      </span>
                      <span className="font-semibold text-foreground">
                        {card.price.kind === 'verified' ? (
                          <PromotionPrice
                            contactLabel={copy.contactPriceLabel}
                            currency={card.price.currency}
                            originalPrice={card.price.originalPrice}
                            price={card.price.value}
                          />
                        ) : (
                          card.price.label
                        )}
                      </span>
                    </div>
                  </div>
                </SiteLink>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
