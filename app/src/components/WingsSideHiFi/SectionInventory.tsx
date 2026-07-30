import React from 'react'

import { SiteLink } from '@/components/SiteLink'
import {
  getWingsSideHiFiAlt,
  getWingsSideHiFiPublicUrl,
  wingsSideHiFiCardBindings,
  type WingsSideHiFiAssetKey,
} from '@/utilities/wingsSideHiFiMedia'
import { getPublicRoutePathname, type SupportedLocaleCode } from '@/utilities/sitePaths'
import type { WingsSideHiFiPageModel } from '@/utilities/wingsSideHiFiPageModel'
import type { WingsSideHomeKeyedTourCard } from '@/tours/homeCuration'

import { WingsSideCredentialsCarousel } from './CredentialsCarousel'
import { getWingsSideHiFiCopy } from './copy'
import { GuideFilterGrid } from './GuideFilterGrid'
import './hifi-sections.css'

type CardItem = {
  action?: string
  asset?: WingsSideHiFiAssetKey
  badge?: string
  body: string
  href: string
  indexLabel?: string
  odId?: string
  region?: string
  title: string
}

type JourneyItem = {
  asset: WingsSideHiFiAssetKey
  badge: string
  body: string
  href: string
  micro: string
  note: string
  priceFrom: string
  priceUnit: string
  title: string
}

const MediaThumb = ({ asset }: { asset: WingsSideHiFiAssetKey }) => (
  <span className="ws-hifi-card__media">
    {/* Public licensed assets under /wingsside-hifi; plain img avoids next/image localPatterns lock. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      alt={getWingsSideHiFiAlt(asset)}
      className="ws-hifi-card__img"
      decoding="async"
      loading="lazy"
      src={getWingsSideHiFiPublicUrl(asset)}
    />
  </span>
)

const packageOdIdByHref: Record<string, string> = {
  '/packages/vietnam-highlights': 'pkg-highlights',
  '/packages/northern-vietnam': 'pkg-north',
  '/packages/central-heritage': 'pkg-central',
  '/packages/vietnam-highlights#family': 'pkg-family',
  '/packages#south': 'pkg-south',
}

const CardGrid = ({ items, testId }: { items: readonly CardItem[]; testId: string }) => (
  <div className="ws-hifi-grid" data-testid={testId}>
    {items.map((item) => (
      <SiteLink
        className={item.asset ? 'ws-hifi-card ws-hifi-card--media' : 'ws-hifi-card'}
        data-od-id={item.odId}
        href={item.href}
        key={`${item.href}-${item.title}`}
      >
        {item.asset ? <MediaThumb asset={item.asset} /> : null}
        <span className="ws-hifi-card__body">
          {item.badge ? <span className="ws-hifi-card__badge">{item.badge}</span> : null}
          {item.region ? <span className="ws-hifi-card__region">{item.region}</span> : null}
          {item.indexLabel ? (
            <span className="ws-hifi-card__index" aria-hidden="true">
              {item.indexLabel}
            </span>
          ) : null}
          <strong>{item.title}</strong>
          <span>{item.body}</span>
          {item.action ? <span className="ws-hifi-card__action">{item.action}</span> : null}
        </span>
      </SiteLink>
    ))}
  </div>
)

const TourDiscoveryGrid = ({
  items,
  locale,
  testId,
}: {
  items: ReadonlyArray<WingsSideHomeKeyedTourCard>
  locale: SupportedLocaleCode
  testId: string
}) => (
  <div className="ws-hifi-grid" data-testid={testId}>
    {items.map((card) => (
      <SiteLink
        className="ws-hifi-card ws-hifi-card--media"
        href={card.href}
        key={`${card.key}-${card.id}`}
      >
        <span className="ws-hifi-card__media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={card.hero.alt}
            className="ws-hifi-card__img"
            decoding="async"
            loading="lazy"
            src={card.hero.url}
          />
        </span>
        <span className="ws-hifi-card__body">
          <span className="ws-hifi-card__region">{card.key}</span>
          <strong>{card.title}</strong>
          <span>{card.summary}</span>
          <span className="ws-hifi-card__action">
            {card.duration.days} {locale === 'vi' ? 'ngày' : 'days'} ·{' '}
            {card.price.kind === 'on-request'
              ? card.price.label
              : new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
                  currency: card.price.currency,
                  style: 'currency',
                }).format(card.price.value)}
          </span>
        </span>
      </SiteLink>
    ))}
  </div>
)

const JourneyCards = ({ items, testId }: { items: readonly JourneyItem[]; testId: string }) => (
  <div className="ws-hifi-journey-grid" data-testid={testId}>
    {items.map((item) => (
      <SiteLink className="ws-hifi-journey" href={item.href} key={`${item.href}-${item.title}`}>
        <MediaThumb asset={item.asset} />
        <span className="ws-hifi-journey__body">
          <span className="ws-hifi-journey__top">
            <span className="ws-hifi-card__badge">{item.badge}</span>
            <span className="ws-hifi-journey__micro">{item.micro}</span>
          </span>
          <strong>{item.title}</strong>
          <span className="ws-hifi-journey__copy">{item.body}</span>
          <span className="ws-hifi-journey__price">
            <span className="ws-hifi-journey__price-from">{item.priceFrom}</span>
            <span className="ws-hifi-journey__price-unit">{item.priceUnit}</span>
          </span>
          <span className="ws-hifi-journey__note">{item.note}</span>
        </span>
      </SiteLink>
    ))}
  </div>
)

const Steps = ({
  steps,
  title,
  kicker,
  lede,
  odId = 'plan-steps',
  variant = 'list',
}: {
  kicker?: string
  lede?: string
  odId?: string
  steps: Array<{ label?: string; title: string; body: string }>
  title: string
  variant?: 'list' | 'cards'
}) => (
  <section className="ws-hifi-section" data-od-id={odId}>
    {kicker ? <p className="ws-hifi-kicker">{kicker}</p> : null}
    <h2>{title}</h2>
    {lede ? <p className="ws-hifi-lede">{lede}</p> : null}
    {variant === 'cards' ? (
      <ol className="ws-hifi-step-cards">
        {steps.map((step, index) => (
          <li className="ws-hifi-step-card" key={step.title}>
            <span className="ws-hifi-step-card__num" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            {step.label ? <p className="ws-hifi-step-card__label">{step.label}</p> : null}
            <strong>{step.title}</strong>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
    ) : (
      <ol className="ws-hifi-steps">
        {steps.map((step, index) => (
          <li key={step.title}>
            <span className="ws-hifi-steps__num" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    )}
  </section>
)

/**
 * Bar B primary body composition for WingSide hub routes.
 * Media thumbs use licensed Open Design assets under /wingsside-hifi/*.
 */
export const WingsSideHiFiSectionInventory = ({
  locale,
  model,
  publicPathname,
  searchParams,
}: {
  locale: SupportedLocaleCode
  model?: WingsSideHiFiPageModel
  publicPathname: string
  searchParams?: Record<string, string | string[] | undefined>
}) => {
  const route = getPublicRoutePathname(publicPathname)
  const copy = getWingsSideHiFiCopy(locale)
  const content = model?.routeContent || {}
  const text = (key: string, fallback: string) =>
    typeof content[key] === 'string' && content[key].trim() ? content[key] : fallback
  const rows = <T,>(key: string, fallback: T[]): T[] =>
    Array.isArray(content[key]) && content[key].length ? (content[key] as T[]) : fallback
  const queryValue = (key: string) => {
    const value = searchParams?.[key]
    return typeof value === 'string' ? value.toLowerCase() : undefined
  }

  if (route === '/') {
    const whyAssets = ['sapa', 'family', 'culture', 'luxury'] as const
    const journeyAssets = ['heroHalong', 'sapa', 'hoian'] as const
    return (
      <div className="ws-hifi-inventory" data-route="home" data-testid="wingsside-hifi-inventory">
        <Steps
          kicker={copy.home.pillarsKicker}
          lede={copy.home.pillarsLede}
          odId="home-pillars"
          steps={copy.plan.steps}
          title={copy.home.pillarsTitle}
          variant="cards"
        />

        <section className="ws-hifi-section" data-od-id="home-why">
          <p className="ws-hifi-kicker">{copy.home.whyKicker}</p>
          <h2 className="ws-hifi-section__title--wide">{copy.home.whyTitle}</h2>
          <div className="ws-hifi-why">
            <article className="ws-hifi-why__featured">
              <span className="ws-hifi-why__media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={getWingsSideHiFiAlt(whyAssets[0])}
                  className="ws-hifi-why__img"
                  decoding="async"
                  loading="lazy"
                  src={getWingsSideHiFiPublicUrl(whyAssets[0])}
                />
              </span>
              <div className="ws-hifi-why__featured-copy">
                <p className="ws-hifi-kicker">{copy.home.whyFeatured.badge}</p>
                <h3>{copy.home.whyFeatured.title}</h3>
                <p>{copy.home.whyFeatured.body}</p>
                <SiteLink className="ws-hifi-why__cta" href={copy.home.whyFeatured.href}>
                  {copy.home.whyFeatured.cta}
                </SiteLink>
              </div>
            </article>
            <div className="ws-hifi-why__grid">
              {copy.home.whyCards.map((card, index) => {
                const asset = whyAssets[index + 1] || 'planner'
                return (
                  <article className="ws-hifi-why__card" key={card.title}>
                    <span className="ws-hifi-why__media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={getWingsSideHiFiAlt(asset)}
                        className="ws-hifi-why__img"
                        decoding="async"
                        loading="lazy"
                        src={getWingsSideHiFiPublicUrl(asset)}
                      />
                    </span>
                    <div className="ws-hifi-why__card-body">
                      <span className="ws-hifi-why__index" aria-hidden="true">
                        {String(index + 2).padStart(2, '0')}
                      </span>
                      <strong>{card.title}</strong>
                      <p>{card.body}</p>
                      <SiteLink className="ws-hifi-why__action" href={card.href}>
                        {card.cta}
                      </SiteLink>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>

          <div className="ws-hifi-trust" data-od-id="home-sla" data-testid="wingsside-hifi-trust">
            {copy.home.trust.map((item) => (
              <article className="ws-hifi-trust__item" data-kind={item.kind} key={item.title}>
                {item.kind === 'planner' ? (
                  <span className="ws-hifi-trust__avatar" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt=""
                      decoding="async"
                      height={52}
                      loading="lazy"
                      src={getWingsSideHiFiPublicUrl('planner')}
                      width={52}
                    />
                  </span>
                ) : null}
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.kind === 'planner' ? copy.home.plannerNamePlaceholder : item.body}</p>
                  {item.kind === 'planner' ? (
                    <p className="ws-hifi-trust__meta">{item.body}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="ws-hifi-section" data-od-id="home-dest">
          <p className="ws-hifi-kicker">{copy.home.destKicker}</p>
          <h2>{copy.home.destTitle}</h2>
          <p className="ws-hifi-lede">{copy.home.destLede}</p>
          <CardGrid
            items={wingsSideHiFiCardBindings.destinations.map((card, index) => ({
              ...card,
              action: copy.home.destExplore,
              body: copy.destinations.places[index]?.body || card.body,
              region: copy.destinations.places[index]?.region,
              title: copy.destinations.places[index]?.title || card.title,
            }))}
            testId="wingsside-hifi-home-dest"
          />
        </section>

        <section className="ws-hifi-section" data-od-id="home-styles">
          <p className="ws-hifi-kicker">{copy.home.stylesKicker}</p>
          <h2>{copy.home.stylesTitle}</h2>
          <CardGrid
            items={wingsSideHiFiCardBindings.styles.map((card, index) => ({
              ...card,
              action: copy.home.stylesMatch,
              body: copy.styles.styles[index]?.body || card.body,
              indexLabel: String(index + 1).padStart(2, '0'),
              title: copy.styles.styles[index]?.title || card.title,
            }))}
            testId="wingsside-hifi-home-styles"
          />
        </section>

        <section className="ws-hifi-section" data-od-id="home-sample-journeys">
          <p className="ws-hifi-kicker">{copy.home.journeysKicker}</p>
          <h2>{copy.home.journeysTitle}</h2>
          <p className="ws-hifi-lede">{copy.home.journeysLede}</p>
          <JourneyCards
            items={copy.packages.cards.map((card, index) => ({
              asset: journeyAssets[index] || 'heroHalong',
              badge: card.badge,
              body: card.body,
              href: card.href,
              micro: card.micro,
              note: card.note,
              priceFrom: card.priceFrom,
              priceUnit: card.priceUnit,
              title: card.title,
            }))}
            testId="wingsside-hifi-home-journeys"
          />
        </section>

        <section className="ws-hifi-section" data-od-id="home-notes">
          <p className="ws-hifi-kicker">{copy.home.notesKicker}</p>
          <h2>{copy.home.notesTitle}</h2>
          <div className="ws-hifi-notes" data-testid="wingsside-hifi-notes">
            {copy.home.notes.map((note) => (
              <article className="ws-hifi-notes__card" key={note.title}>
                <strong>{note.title}</strong>
                <p>{note.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="ws-hifi-cta-band" data-od-id="home-close">
          <div>
            <h2>{copy.home.closeTitle}</h2>
            <p>{copy.home.closeLede}</p>
          </div>
          <div className="ws-hifi-cta-band__actions">
            <SiteLink className="site-header-cta" href="#home-planner">
              {copy.home.closeCta}
            </SiteLink>
            <SiteLink className="ws-hifi-cta-band__secondary" href="/contact-us">
              {copy.home.closeCtaSecondary}
            </SiteLink>
          </div>
        </section>

        <WingsSideCredentialsCarousel locale={locale} />

        <section className="ws-hifi-section" data-od-id="home-related">
          <p className="ws-hifi-kicker">{copy.home.continueKicker}</p>
          <CardGrid
            items={copy.home.related.map((item) => ({ ...item }))}
            testId="wingsside-hifi-home-related"
          />
        </section>
      </div>
    )
  }

  if (route === '/plan-your-trip') {
    return (
      <div className="ws-hifi-inventory" data-route="plan" data-testid="wingsside-hifi-inventory">
        <Steps
          kicker={copy.plan.stepsKicker}
          lede={copy.plan.stepsLede}
          steps={copy.plan.steps}
          title={copy.plan.stepsTitle}
          variant="cards"
        />
        <section className="ws-hifi-section" data-od-id="plan-explore">
          <h2>{copy.plan.exploreTitle}</h2>
          <CardGrid
            items={copy.plan.explore.map((item, index) => ({
              asset: (['hanoi', 'culture', 'heroHalong'] as const)[index] || 'hanoi',
              body: item.body,
              href: item.href,
              title: item.title,
            }))}
            testId="wingsside-hifi-plan-explore"
          />
        </section>
      </div>
    )
  }

  if (route === '/destinations') {
    const routes = rows('routes', copy.destinations.routes)
    const places = rows('places', copy.destinations.places)
    const requestedDestination = queryValue('destination')
    const selectedDestination = wingsSideHiFiCardBindings.destinations.some(
      (card) => card.asset === requestedDestination,
    )
      ? requestedDestination
      : undefined
    const destinationItems = wingsSideHiFiCardBindings.destinations
      .map((card, index) => ({
        ...card,
        action: `View ${places[index]?.title || card.title} ->`,
        body: places[index]?.body || card.body,
        href: places[index]?.href || card.href,
        odId: `card-${card.asset}`,
        region: places[index]?.region,
        title: places[index]?.title || card.title,
      }))
      .filter((card) => !selectedDestination || card.asset === selectedDestination)
    const destinationTours =
      model?.homeCuration?.state === 'ready'
        ? model.homeCuration.destinationTours.filter(
            (tour) => !selectedDestination || tour.key === selectedDestination,
          )
        : []
    return (
      <div
        className="ws-hifi-inventory"
        data-route="destinations"
        data-testid="wingsside-hifi-inventory"
      >
        <section className="ws-hifi-section" data-od-id="dest-routes" id="dest-routes">
          <div className="ws-dest-route-split">
            <div aria-label="Vietnam north to south route map" className="ws-dest-map" role="img">
              <span className="ws-dest-map__label">Vietnam - north to south</span>
              {[18, 31, 47, 58, 72, 84].map((top, index) => (
                <i key={top} style={{ left: `${48 + (index % 2 ? 5 : -3)}%`, top: `${top}%` }} />
              ))}
            </div>
            <div className="ws-dest-routes">
              <p className="ws-hifi-kicker">How travelers combine regions</p>
              <h2>{text('routesTitle', copy.destinations.routesTitle)}</h2>
              <p className="ws-hifi-lede">
                Proven shapes with indicative pricing - swap destinations in your brief.
              </p>
              {routes.map((item, index) => (
                <article className="ws-dest-route" key={item.title}>
                  <span>{10 - index} days</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                  </div>
                </article>
              ))}
              <SiteLink className="btn btn-ghost" href="/packages">
                See packages shaped like these
              </SiteLink>
            </div>
          </div>
        </section>
        <section className="ws-hifi-section" data-od-id="dest-grid" id="dest-grid">
          <p className="ws-hifi-kicker">Key places</p>
          <h2>{text('deeperTitle', copy.destinations.deeperTitle)}</h2>
          {selectedDestination && destinationItems.length ? (
            <p aria-live="polite" className="ws-hifi-lede" data-testid="destination-filter-status">
              Showing the selected destination: {destinationItems[0]?.title}.
            </p>
          ) : null}
          {model?.homeCuration?.state === 'ready' ? (
            <TourDiscoveryGrid
              items={destinationTours}
              locale={locale}
              testId="wingsside-hifi-dest-grid"
            />
          ) : (
            <p className="ws-hifi-lede" data-testid="wingsside-hifi-destinations-empty">
              Curated destination tours are temporarily unavailable.
            </p>
          )}
          <div className="ws-hifi-cta-band ws-hifi-mid-cta" data-od-id="dest-mid-cta">
            <div>
              <h3>{text('closingTitle', 'Shortlist regions - then send one brief')}</h3>
              <p>A planner replies within 1 business day with route and pacing direction.</p>
            </div>
            <SiteLink className="btn btn-primary" href="/plan-your-trip">
              Plan your trip -&gt;
            </SiteLink>
          </div>
        </section>
      </div>
    )
  }

  if (route === '/styles') {
    const configuredStyles = rows('styles', copy.styles.styles)
    const styles = configuredStyles.map((style, index) =>
      index === wingsSideHiFiCardBindings.styles.length - 1
        ? copy.styles.styles[index] || style
        : style,
    )
    const requestedStyle = queryValue('style')
    const selectedStyle = wingsSideHiFiCardBindings.styles.some((card) =>
      card.href.endsWith(`style=${requestedStyle}`),
    )
      ? requestedStyle
      : undefined
    const styleItems = wingsSideHiFiCardBindings.styles
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => !selectedStyle || card.href.endsWith(`style=${selectedStyle}`))
    const styleTours =
      model?.homeCuration?.state === 'ready'
        ? model.homeCuration.styleTours.filter((tour) => !selectedStyle || tour.key === selectedStyle)
        : []
    return (
      <div className="ws-hifi-inventory" data-route="styles" data-testid="wingsside-hifi-inventory">
        <section className="ws-hifi-section ws-style-intro" data-od-id="styles-intro">
          <p className="ws-hifi-kicker">Before the map</p>
          <h2>{text('introTitle', copy.styles.introTitle)}</h2>
          <p className="ws-hifi-lede">
            Luxury, family, culture, adventure, wellness, or romance - each style changes hotels,
            day length, and how much free time you want.
          </p>
        </section>
        <section className="ws-hifi-section" data-od-id="style-grid" id="style-grid">
          {selectedStyle && styleItems.length ? (
            <p aria-live="polite" className="ws-hifi-lede" data-testid="style-filter-status">
              Showing the selected travel style: {styles[styleItems[0]!.index]?.title}.
            </p>
          ) : null}
          {model?.homeCuration?.state === 'ready' ? (
            <TourDiscoveryGrid
              items={styleTours}
              locale={locale}
              testId="wingsside-hifi-style-grid"
            />
          ) : (
            <p className="ws-hifi-lede" data-testid="wingsside-hifi-styles-empty">
              Curated travel-style tours are temporarily unavailable.
            </p>
          )}
        </section>
      </div>
    )
  }

  if (route === '/packages') {
    const cards = rows('cards', copy.packages.cards)
    return (
      <div
        className="ws-hifi-inventory"
        data-route="packages"
        data-testid="wingsside-hifi-inventory"
      >
        <section className="ws-hifi-section" data-od-id="pkg-grid" id="pkg-grid">
          <h2>{text('gridTitle', copy.packages.gridTitle)}</h2>
          <p className="ws-hifi-lede">{text('gridLede', copy.packages.gridLede)}</p>
          <div className="ws-package-grid" data-testid="wingsside-hifi-pkg-grid">
            {cards.map((card, index) => {
              const asset =
                (['heroHalong', 'sapa', 'hoian', 'family', 'mekong'] as WingsSideHiFiAssetKey[])[
                  index
                ] || 'heroHalong'
              const odId = packageOdIdByHref[card.href]
              return (
                <article className="ws-package-card" data-od-id={odId} key={card.href}>
                  <MediaThumb asset={asset} />
                  <div className="ws-package-card__body">
                    <div className="ws-hifi-journey__top">
                      <span className="ws-hifi-card__badge">{card.badge}</span>
                      <span className="ws-hifi-journey__micro">{card.micro}</span>
                    </div>
                    <h3>{card.title}</h3>
                    <p>{card.body}</p>
                    <strong className="ws-package-card__price">
                      {card.priceFrom} <small>{card.priceUnit}</small>
                    </strong>
                    <span className="ws-package-card__note">{card.note}</span>
                    <div className="ws-package-card__actions">
                      <SiteLink className="btn btn-ghost" href={card.href}>
                        View itinerary
                      </SiteLink>
                      <SiteLink className="btn btn-primary" href="/plan-your-trip">
                        Customize
                      </SiteLink>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
          <div className="ws-hifi-cta-band ws-hifi-mid-cta" data-od-id="pkg-mid-cta">
            <div>
              <h3>Have dates already?</h3>
              <p>Send month, group, and a sample you like - we will reshape it privately.</p>
            </div>
            <SiteLink className="btn btn-primary" href="/plan-your-trip">
              Plan your trip -&gt;
            </SiteLink>
          </div>
        </section>
      </div>
    )
  }

  if (route === '/travel-guide') {
    const notes = rows('notes', copy.guide.notes)
    return (
      <div className="ws-hifi-inventory" data-route="guide" data-testid="wingsside-hifi-inventory">
        <section className="ws-hifi-section" data-od-id="guide-list" id="guide-list">
          <h2>{text('listTitle', copy.guide.listTitle)}</h2>
          <p className="ws-hifi-lede">
            Practical notes from the planning desk - filter by the question you are solving.
          </p>
          <GuideFilterGrid notes={notes} />
          <div className="ws-guide-archive">
            <strong>Planning archive</strong>
            <span>
              New notes publish only when they add a useful decision, not to fill a content
              calendar.
            </span>
          </div>
          <p className="ws-hifi-inline-cta">
            <SiteLink className="site-header-cta" href="/plan-your-trip">
              {copy.guide.cta}
            </SiteLink>
          </p>
        </section>
      </div>
    )
  }

  if (route === '/about-us') {
    const promises = rows('promises', copy.about.promises)
    return (
      <div className="ws-hifi-inventory" data-route="about" data-testid="wingsside-hifi-inventory">
        <section className="ws-hifi-section" data-od-id="about-story">
          <h2>{text('storyTitle', copy.about.storyTitle)}</h2>
          <p className="ws-hifi-lede">
            WingSide starts with a conversation, then turns destination, pace, dates, and group
            needs into one private route. The planning desk stays accountable from first direction
            to handover.
          </p>
        </section>
        <Steps
          odId="about-steps"
          steps={copy.plan.steps}
          title={text('stepsTitle', copy.about.stepsTitle)}
          variant="cards"
        />
        <section className="ws-hifi-section" data-od-id="about-promises">
          <h2>{text('promisesTitle', copy.about.promisesTitle)}</h2>
          <div className="ws-hifi-grid ws-hifi-grid--4">
            {promises.map((item) => (
              <article className="ws-hifi-card ws-hifi-card--static" key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </article>
            ))}
          </div>
        </section>
        <section className="ws-hifi-section" data-od-id="about-team">
          <h2>{text('teamTitle', copy.about.teamTitle)}</h2>
          <p className="ws-hifi-lede">{text('teamLede', copy.about.teamLede)}</p>
          <div className="ws-about-team">
            {[
              ['Planning desk', 'Route design and guest fit'],
              ['Operations', 'Hotels, guides, and ground logistics'],
              ['On-trip support', 'Local coordination when plans move'],
            ].map(([title, body], index) => (
              <article key={title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    )
  }

  if (route === '/contact-us') {
    return (
      <div
        className="ws-hifi-inventory"
        data-route="contact"
        data-testid="wingsside-hifi-inventory"
      >
        <div className="ws-hifi-contact-split" data-od-id="contact-split">
          <section className="ws-hifi-section">
            <h2>{copy.contact.channelsTitle}</h2>
            <ul className="ws-hifi-channels">
              {copy.contact.channels.map((channel) => (
                <li key={channel.label}>
                  <span>{channel.label}</span>
                  {channel.href ? (
                    <a href={channel.href}>{channel.value}</a>
                  ) : (
                    <strong>{channel.value}</strong>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <section className="ws-hifi-section" data-od-id="contact-after">
            <h2>{copy.contact.nextTitle}</h2>
            <ol className="ws-hifi-steps">
              {copy.contact.nextSteps.map((step, index) => (
                <li key={step}>
                  <span className="ws-hifi-steps__num" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <strong>{step}</strong>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    )
  }

  return null
}
