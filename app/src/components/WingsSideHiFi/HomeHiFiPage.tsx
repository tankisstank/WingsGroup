import React from 'react'

import type { Page } from '@/payload-types'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import type { ResolvedHeroPresentation } from '@/heros/presentations/types'
import { SiteLink } from '@/components/SiteLink'
import {
  getWingsSideHiFiAlt,
  getWingsSideHiFiPublicUrl,
  WINGSSIDE_HIFI_HOME_JOURNEY_COUNT,
  wingsSideHiFiCardBindings,
} from '@/utilities/wingsSideHiFiMedia'
import type { WingsSideHiFiPageModel } from '@/utilities/wingsSideHiFiPageModel'
import type { WingsSideHomeTourCard } from '@/tours/homeCuration'
import { getWingsSideHiFiCopy } from '@/components/WingsSideHiFi/copy'

import { WingsSideCredentialsCarousel } from './CredentialsCarousel'
import { HomeHeroCarousel } from './HomeHeroCarousel'
import { HomePlanner } from './HomePlanner'
import { HomeProcessSteps } from './HomeProcessSteps'
import './hifi-pages.css'
import './hifi-sections.css'

const asText = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

const WHY_CARD_ASSETS = ['family', 'culture', 'luxury'] as const
const HOME_HERO_SLIDES = [
  { asset: 'heroHalong', caption: 'Ha Long Bay · golden hour' },
  { asset: 'hanoi', caption: 'Hanoi · Old Quarter' },
  { asset: 'hoian', caption: 'Hoi An · lantern streets' },
  { asset: 'sapa', caption: 'Sapa · highland terraces' },
  { asset: 'mekong', caption: 'Mekong Delta · river life' },
] as const
const HOME_SAMPLE_OD_IDS = ['sample-highlights', 'sample-north', 'sample-central'] as const

const formatTourPrice = (card: WingsSideHomeTourCard, locale?: null | string): string => {
  if (card.price.kind === 'on-request') return card.price.label

  try {
    return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
      currency: card.price.currency,
      style: 'currency',
    }).format(card.price.value)
  } catch {
    return `${card.price.currency} ${card.price.value}`
  }
}

const CurationEmptyState = ({ surface }: { surface: 'destinations' | 'journeys' | 'styles' }) => (
  <p className="ws-hifi-curation-empty" data-testid={`home-${surface}-curation-empty`}>
    Curated journeys are not currently available.
  </p>
)

export const HomeHiFiPage = ({
  heroPresentation,
  locale,
  model,
  reusableBlocks,
}: {
  locale?: null | string
  model: WingsSideHiFiPageModel
  reusableBlocks?: Page['layout']
  heroPresentation?: ResolvedHeroPresentation | null
}) => {
  const copy = getWingsSideHiFiCopy(locale)
  const home = (model.routeContent || {}) as Record<string, unknown>
  const hero = model.hero
  const title = hero.title || copy.heroTitle
  const lede = hero.lede || copy.heroLede || ''
  const primaryLabel = hero.primaryCta?.label || copy.home.planTripCta
  const secondaryLabel = hero.secondaryCta?.label || copy.home.exploreDestinations

  const slides = HOME_HERO_SLIDES.map((slide) => ({
    alt: getWingsSideHiFiAlt(slide.asset),
    caption: slide.caption,
    src: getWingsSideHiFiPublicUrl(slide.asset),
  }))

  const pillars = asArray<{ label?: string; title?: string; body?: string }>(home.pillars)
  const whyCards = asArray<{ title?: string; body?: string; cta?: string; href?: string }>(
    home.whyCards,
  )
  const notes = asArray<{ title?: string; body?: string }>(home.notes)
  const related = asArray<{ title?: string; body?: string; href?: string }>(home.related)
  const trust = asArray<{ kind?: string; title?: string; body?: string }>(home.trust)
  const trustItems = trust.length ? trust : copy.home.trust
  const credentialsBlocks = reusableBlocks?.filter(
    (block) => block.blockType === 'credentialsCarousel',
  )
  const otherReusableBlocks = reusableBlocks?.filter(
    (block) => block.blockType !== 'credentialsCarousel',
  )

  const journeySource = copy.packages.cards.slice(0, WINGSSIDE_HIFI_HOME_JOURNEY_COUNT)
  const journeyBindings = wingsSideHiFiCardBindings.packages.slice(
    0,
    WINGSSIDE_HIFI_HOME_JOURNEY_COUNT,
  )
  const homeCurationState = model.homeCuration?.state || 'invalid'
  const hasReadyCuration = homeCurationState === 'ready'
  const hasInvalidCuration = homeCurationState !== 'ready'

  const plannerByLocale: Record<
    string,
    {
      destinationOptions: Array<{ label: string; value: string }>
      durationLabel: string
      durationOptions: Array<{ label: string; value: string }>
      formTitle: string
      fullBriefPrefix: string
      kicker: string
      monthLabel: string
      monthOptions: Array<{ label: string; value: string }>
      promises: string[]
      styleLabel: string
      title: string
    }
  > = {
    en: {
      destinationOptions: [
        { label: 'Ha Noi and Ha Long', value: 'ha-noi-ha-long' },
        { label: 'Hue and Hoi An', value: 'hue-hoi-an' },
        { label: 'Mekong Delta', value: 'mekong-delta' },
        { label: 'Multi-region Vietnam', value: 'multi-region' },
      ],
      durationLabel: 'Duration',
      durationOptions: [
        { label: '5-7 days', value: '5-7-days' },
        { label: '8-10 days', value: '8-10-days' },
        { label: '11-14 days', value: '11-14-days' },
        { label: '15+ days', value: '15-plus-days' },
      ],
      formTitle: 'Start here',
      fullBriefPrefix: 'Or open the full brief on',
      kicker: 'Quick path · Home',
      monthLabel: 'Travel month',
      monthOptions: [
        { label: 'Mar', value: '3' },
        { label: 'Apr', value: '4' },
        { label: 'May', value: '5' },
        { label: 'Sep', value: '9' },
        { label: 'Oct', value: '10' },
        { label: 'Nov', value: '11' },
      ],
      promises: [
        'Typical reply: 1 business day (GMT+7)',
        'Destination + duration + style → first direction',
        'Need more fields? Open the full planning brief',
      ],
      styleLabel: 'Travel style',
      title: 'Plan a private Vietnam journey',
    },
    vi: {
      destinationOptions: [
        { label: 'Hà Nội và Hạ Long', value: 'ha-noi-ha-long' },
        { label: 'Huế và Hội An', value: 'hue-hoi-an' },
        { label: 'Đồng bằng sông Cửu Long', value: 'mekong-delta' },
        { label: 'Nhiều vùng Việt Nam', value: 'multi-region' },
      ],
      durationLabel: 'Thời lượng',
      durationOptions: [
        { label: '5-7 ngày', value: '5-7-days' },
        { label: '8-10 ngày', value: '8-10-days' },
        { label: '11-14 ngày', value: '11-14-days' },
        { label: '15+ ngày', value: '15-plus-days' },
      ],
      formTitle: 'Bắt đầu tại đây',
      fullBriefPrefix: 'Hoặc mở brief đầy đủ tại',
      kicker: 'Lối tắt · Trang chủ',
      monthLabel: 'Tháng đi',
      monthOptions: [
        { label: 'Th3', value: '3' },
        { label: 'Th4', value: '4' },
        { label: 'Th5', value: '5' },
        { label: 'Th9', value: '9' },
        { label: 'Th10', value: '10' },
        { label: 'Th11', value: '11' },
      ],
      promises: [
        'Phản hồi thường: 1 ngày làm việc (GMT+7)',
        'Điểm đến + thời lượng + phong cách → hướng đi đầu',
        'Cần thêm trường? Mở brief lập kế hoạch đầy đủ',
      ],
      styleLabel: 'Phong cách',
      title: 'Lên kế hoạch hành trình riêng tại Việt Nam',
    },
  }
  const localeKey = (locale || 'en').toLowerCase()
  const plannerLocale = plannerByLocale[localeKey] || plannerByLocale.en

  const plannerCopy = {
    chips: copy.styles.styles.map((item) => item.title),
    destinationLabel: copy.home.destKicker,
    destinationOptions: plannerLocale.destinationOptions,
    durationLabel: plannerLocale.durationLabel,
    durationOptions: plannerLocale.durationOptions,
    formTitle: plannerLocale.formTitle,
    fullBriefLabel: copy.home.planTripCta,
    fullBriefPrefix: plannerLocale.fullBriefPrefix,
    kicker: plannerLocale.kicker,
    monthLabel: plannerLocale.monthLabel,
    monthOptions: plannerLocale.monthOptions,
    promises: plannerLocale.promises,
    styleLabel: plannerLocale.styleLabel,
    submitLabel: `${copy.home.planTripCta} →`,
    title: plannerLocale.title,
  }

  const whyRows = (whyCards.length ? whyCards : copy.home.whyCards).slice(0, 3)
  const whyTravel = model.homeCuration?.whyTravel
  const hasReadyWhyTravel = whyTravel?.state === 'ready'
  const whyTravelCards = hasReadyWhyTravel ? whyTravel.cards : []
  const featuredWhyTravel = whyTravelCards[0]
  const shouldRenderWhyTravel = whyTravel?.state !== 'invalid'

  return (
    <div className="ws-hifi-page ws-hifi-page--home" data-testid="wingsside-hifi-home">
      <div className="ws-hifi-shell">
        <section
          aria-label="Vietnam journey highlights"
          className="ws-hifi-home-hero hero"
          data-hero-presentation={heroPresentation?.key}
          data-hero-preset={heroPresentation?.presetKey}
          data-hero-source={heroPresentation?.source}
          data-hero-template={heroPresentation?.key}
          data-od-id="home-hero"
          data-testid="wingsside-hifi-home-hero"
        >
          <div className="ws-hifi-home-hero__copy">
            <p className="eyebrow">Private · Family · Romance · Vietnam</p>
            <h1 className="h1" data-od-id="home-h1">
              {title}
            </h1>
            {lede ? (
              <p
                className="lede"
                dangerouslySetInnerHTML={{ __html: lede.replace(/\n/g, '<br />') }}
              />
            ) : null}
            <div className="cta-row">
              <a className="btn btn-primary" data-od-id="home-cta-plan" href="#home-planner">
                {primaryLabel}
              </a>
              <SiteLink
                className="btn btn-ghost"
                data-od-id="home-cta-dest"
                href={hero.secondaryCta?.href || '/destinations'}
              >
                {secondaryLabel}
              </SiteLink>
            </div>
          </div>
          <HomeHeroCarousel ariaLabel="Vietnam journey highlights" slides={slides} />
        </section>

        <HomePlanner copy={plannerCopy} />

        <HomeProcessSteps
          ctaLabel={copy.home.planTripCta}
          kicker={asText(home.pillarsKicker, copy.home.pillarsKicker)}
          lede={asText(home.pillarsLede, copy.home.pillarsLede)}
          steps={
            pillars.length
              ? pillars.map((step) => ({
                  body: asText(step.body),
                  label: asText(step.label),
                  title: asText(step.title),
                }))
              : copy.plan.steps
          }
          title={asText(home.pillarsTitle, copy.home.pillarsTitle)}
        />

        {shouldRenderWhyTravel ? <section
          className="ws-hifi-section section"
          data-od-id="home-why"
          style={{ paddingTop: 0 }}
        >
          <p className="kicker">{asText(home.whyKicker, copy.home.whyKicker)}</p>
          <h2 className="h2">{asText(home.whyTitle, copy.home.whyTitle)}</h2>
          <div className="ws-hifi-why">
            <article className="ws-hifi-why__featured" data-od-id="why-featured">
              <span className="ws-hifi-why__media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={featuredWhyTravel?.hero.alt || getWingsSideHiFiAlt('sapa')}
                  className="ws-hifi-why__img"
                  decoding="async"
                  height={480}
                  loading="lazy"
                  src={featuredWhyTravel?.hero.url || getWingsSideHiFiPublicUrl('sapa')}
                  width={640}
                />
              </span>
              <div className="ws-hifi-why__featured-copy">
                <p className="micro">
                  {featuredWhyTravel?.badge || asText(home.whyFeaturedBadge, copy.home.whyFeatured.badge)}
                </p>
                <h3>{featuredWhyTravel?.title || asText(home.whyFeaturedTitle, copy.home.whyFeatured.title)}</h3>
                <p>{featuredWhyTravel?.body || asText(home.whyFeaturedBody, copy.home.whyFeatured.body)}</p>
                <SiteLink
                  className="ws-hifi-card__action"
                  href={featuredWhyTravel?.href || asText(home.whyFeaturedHref, copy.home.whyFeatured.href)}
                >
                  {featuredWhyTravel?.ctaLabel || asText(home.whyFeaturedCta, copy.home.whyFeatured.cta)}
                </SiteLink>
              </div>
            </article>
            <div className="ws-hifi-why__grid">
              {(hasReadyWhyTravel ? whyTravelCards.slice(1) : whyRows).map((card, index) => {
                const asset = WHY_CARD_ASSETS[index] || 'planner'
                const tourCard = hasReadyWhyTravel ? whyTravelCards[index + 1] : undefined
                const editorialCard = whyRows[index]
                return (
                  <SiteLink
                    className="ws-hifi-card ws-hifi-card--media"
                    data-od-id={
                      index === 0 ? 'why-flexible' : index === 1 ? 'why-style' : 'why-care'
                    }
                    href={tourCard?.href || asText(card.href, '/')}
                    key={`why-card-${index}-${card.title}`}
                  >
                    <span className="ws-hifi-card__media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={tourCard?.hero.alt || getWingsSideHiFiAlt(asset)}
                        className="ws-hifi-card__img"
                        decoding="async"
                        height={220}
                        loading="lazy"
                        src={tourCard?.hero.url || getWingsSideHiFiPublicUrl(asset)}
                        width={320}
                      />
                    </span>
                    <span className="ws-hifi-card__body">
                      <span className="ws-hifi-card__region">
                        {String(index + 2).padStart(2, '0')}
                      </span>
                      <strong>{tourCard?.title || asText(card.title)}</strong>
                      <span>{tourCard?.body || asText(editorialCard?.body || card.body)}</span>
                      <span className="ws-hifi-card__action">
                        {tourCard?.ctaLabel ||
                          asText(
                            editorialCard?.cta || (card as { cta?: string }).cta,
                            copy.home.destExplore,
                          )}
                      </span>
                    </span>
                  </SiteLink>
                )
              })}
            </div>
          </div>

          <div className="ws-hifi-trust" data-od-id="home-sla" data-testid="wingsside-hifi-trust">
            {trustItems.map((item) => (
              <article
                className="ws-hifi-trust__item"
                data-kind={item.kind}
                key={`trust-${item.kind}-${item.title}`}
              >
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
                  <strong>{asText(item.title)}</strong>
                  {item.kind === 'sla' ? (
                    <>
                      <p className="ws-hifi-trust__big">
                        {localeKey === 'vi' ? '1 ngày' : '1 day'}
                      </p>
                      <p className="ws-hifi-trust__meta">{asText(item.body)}</p>
                    </>
                  ) : item.kind === 'planner' ? (
                    <>
                      <p>{copy.home.plannerNamePlaceholder}</p>
                      <p className="ws-hifi-trust__meta">{asText(item.body)}</p>
                    </>
                  ) : (
                    <p>{asText(item.body)}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section> : null}

        <section
          className="ws-hifi-section section"
          data-od-id="home-dest"
          style={{ paddingTop: 0 }}
        >
          <p className="kicker">{asText(home.destKicker, copy.home.destKicker)}</p>
          <h2 className="h2">{asText(home.destTitle, copy.home.destTitle)}</h2>
          <p className="lede">{asText(home.destLede, copy.home.destLede)}</p>
          <div className="ws-hifi-grid" data-testid="home-dest-grid">
            {hasInvalidCuration ? <CurationEmptyState surface="destinations" /> : null}
            {hasReadyCuration
              ? model.homeCuration!.destinationTours.map((card) => (
                  <SiteLink
                    className="ws-hifi-card ws-hifi-card--media"
                    data-od-id={`dest-${card.key}`}
                    href={`/journeys?destination=${encodeURIComponent(card.key)}`}
                    key={`destination-${card.key}-${card.id}`}
                  >
                    <span className="ws-hifi-card__media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={card.hero.alt}
                        className="ws-hifi-card__img"
                        decoding="async"
                        height={220}
                        loading="lazy"
                        src={card.hero.url}
                        width={320}
                      />
                    </span>
                    <span className="ws-hifi-card__body">
                      <strong>{card.title}</strong>
                      <span>{card.summary}</span>
                      <span className="ws-hifi-card__action">{copy.home.destExplore}</span>
                    </span>
                  </SiteLink>
                ))
              : !hasInvalidCuration
                ? wingsSideHiFiCardBindings.destinations.map((card) => (
                    <SiteLink
                      className="ws-hifi-card ws-hifi-card--media"
                      data-od-id={`dest-${card.asset}`}
                      href={card.href}
                      key={`dest-${card.asset}-${card.href}`}
                    >
                      <span className="ws-hifi-card__media">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={getWingsSideHiFiAlt(card.asset)}
                          className="ws-hifi-card__img"
                          decoding="async"
                          height={220}
                          loading="lazy"
                          src={getWingsSideHiFiPublicUrl(card.asset)}
                          width={320}
                        />
                      </span>
                      <span className="ws-hifi-card__body">
                        <strong>{card.title}</strong>
                        <span>{card.body}</span>
                        <span className="ws-hifi-card__action">{copy.home.destExplore}</span>
                      </span>
                    </SiteLink>
                  ))
                : null}
          </div>
        </section>

        <section
          className="ws-hifi-section section"
          data-od-id="home-styles"
          style={{ paddingTop: 0 }}
        >
          <p className="kicker">{asText(home.stylesKicker, copy.home.stylesKicker)}</p>
          <h2 className="h2">{asText(home.stylesTitle, copy.home.stylesTitle)}</h2>
          <div className="ws-hifi-grid" data-testid="home-styles-grid">
            {hasInvalidCuration ? <CurationEmptyState surface="styles" /> : null}
            {hasReadyCuration
              ? model.homeCuration!.styleTours.map((card, index) => (
                  <SiteLink
                    className="ws-hifi-card ws-hifi-card--media"
                    href={`/journeys?style=${encodeURIComponent(card.key)}`}
                    key={`style-${card.key}-${card.id}`}
                  >
                    <span className="ws-hifi-card__media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={card.hero.alt}
                        className="ws-hifi-card__img"
                        decoding="async"
                        height={220}
                        loading="lazy"
                        src={card.hero.url}
                        width={320}
                      />
                    </span>
                    <span className="ws-hifi-card__body">
                      <span className="ws-hifi-card__region">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <strong>{card.title}</strong>
                      <span>{card.summary}</span>
                      <span className="ws-hifi-card__action">{copy.home.stylesMatch}</span>
                    </span>
                  </SiteLink>
                ))
              : !hasInvalidCuration
                ? wingsSideHiFiCardBindings.styles.map((card, index) => (
                    <SiteLink
                      className="ws-hifi-card ws-hifi-card--media"
                      href={card.href}
                      key={`style-${card.asset}-${index}`}
                    >
                      <span className="ws-hifi-card__media">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={getWingsSideHiFiAlt(card.asset)}
                          className="ws-hifi-card__img"
                          decoding="async"
                          height={220}
                          loading="lazy"
                          src={getWingsSideHiFiPublicUrl(card.asset)}
                          width={320}
                        />
                      </span>
                      <span className="ws-hifi-card__body">
                        <span className="ws-hifi-card__region">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <strong>{card.title}</strong>
                        <span className="ws-hifi-card__action">{copy.home.stylesMatch}</span>
                      </span>
                    </SiteLink>
                  ))
                : null}
          </div>

          <div className="ws-hifi-sample-journeys" data-od-id="home-sample-journeys">
            <p className="kicker">{asText(home.journeysKicker, copy.home.journeysKicker)}</p>
            <h2 className="h2">{asText(home.journeysTitle, copy.home.journeysTitle)}</h2>
            <p className="lede">{asText(home.journeysLede, copy.home.journeysLede)}</p>
            <div className="ws-hifi-journey-grid">
              {hasInvalidCuration ? <CurationEmptyState surface="journeys" /> : null}
              {hasReadyCuration
                ? model.homeCuration!.featuredJourneys.map((card, index) => (
                    <SiteLink
                      className="ws-hifi-journey"
                      data-od-id={HOME_SAMPLE_OD_IDS[index]}
                      href={card.href}
                      key={`journey-${card.id}`}
                    >
                      <span className="ws-hifi-card__media">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={card.hero.alt}
                          className="ws-hifi-card__img"
                          decoding="async"
                          height={220}
                          loading="lazy"
                          src={card.hero.url}
                          width={320}
                        />
                      </span>
                      <span className="ws-hifi-journey__body">
                        <span className="ws-hifi-journey__micro">
                          {card.duration.days} days
                          {card.duration.nights == null ? '' : ` · ${card.duration.nights} nights`}
                        </span>
                        <strong>{card.title}</strong>
                        <span className="ws-hifi-journey__copy">{card.summary}</span>
                        <span className="ws-hifi-journey__price">
                          <span className="ws-hifi-journey__price-from">
                            {formatTourPrice(card, locale)}
                          </span>
                        </span>
                      </span>
                    </SiteLink>
                  ))
                : !hasInvalidCuration
                  ? journeySource.map((card, index) => {
                      const binding = journeyBindings[index]
                      const asset = binding?.asset || 'heroHalong'
                      return (
                        <SiteLink
                          className="ws-hifi-journey"
                          data-od-id={HOME_SAMPLE_OD_IDS[index]}
                          href={card.href}
                          key={`journey-${card.href}-${index}-${asset}`}
                        >
                          <span className="ws-hifi-card__media">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              alt={getWingsSideHiFiAlt(asset)}
                              className="ws-hifi-card__img"
                              decoding="async"
                              height={220}
                              loading="lazy"
                              src={getWingsSideHiFiPublicUrl(asset)}
                              width={320}
                            />
                          </span>
                          <span className="ws-hifi-journey__body">
                            <span className="ws-hifi-journey__top">
                              {card.badge ? (
                                <span className="ws-hifi-card__badge">{card.badge}</span>
                              ) : null}
                              <span className="ws-hifi-journey__micro">{card.micro}</span>
                            </span>
                            <strong>{card.title}</strong>
                            <span className="ws-hifi-journey__copy">{card.body}</span>
                            <span className="ws-hifi-journey__price">
                              <span className="ws-hifi-journey__price-from">{card.priceFrom}</span>
                              <span className="ws-hifi-journey__price-unit">{card.priceUnit}</span>
                            </span>
                            <span className="ws-hifi-journey__note">{card.note}</span>
                          </span>
                        </SiteLink>
                      )
                    })
                  : null}
            </div>
          </div>
        </section>

        <section
          className="ws-hifi-section section"
          data-od-id="home-close"
          style={{ paddingTop: 0 }}
        >
          <p className="kicker">{asText(home.notesKicker, copy.home.notesKicker)}</p>
          <h2 className="h2">{asText(home.notesTitle, copy.home.notesTitle)}</h2>
          <div className="ws-hifi-notes">
            {(notes.length ? notes : copy.home.notes).map((note, index) => (
              <article className="ws-hifi-notes__card" key={`note-${index}-${note.title}`}>
                <div className="micro">{String(index + 1).padStart(2, '0')} · Note</div>
                <strong>{asText(note.title)}</strong>
                <p>{asText(note.body)}</p>
              </article>
            ))}
          </div>

          <div className="ws-hifi-cta-band" data-od-id="home-cta-band">
            <div>
              <h3>{asText(home.closeTitle, copy.home.closeTitle)}</h3>
              <p>{asText(home.closeLede, copy.home.closeLede)}</p>
            </div>
            <div className="cta-row" style={{ margin: 0 }}>
              <a className="btn btn-primary" href="#home-planner">
                {asText(home.closeCta, copy.home.closeCta)}
              </a>
              <SiteLink className="btn btn-ghost" href="/contact-us">
                {asText(home.closeCtaSecondary, copy.home.closeCtaSecondary)}
              </SiteLink>
            </div>
          </div>

          {credentialsBlocks?.length ? (
            <RenderBlocks blocks={credentialsBlocks} locale={locale} />
          ) : (
            <WingsSideCredentialsCarousel locale={locale} />
          )}
          <RenderBlocks blocks={otherReusableBlocks || []} locale={locale} />

          <p className="kicker" style={{ marginTop: '2.25rem' }}>
            {copy.home.continueKicker}
          </p>
          <div className="ws-hifi-grid" data-od-id="home-related">
            {(related.length ? related : copy.home.related).map((item, index) => (
              <SiteLink
                className="ws-hifi-card"
                href={asText(item.href, '/')}
                key={`related-${index}-${item.href}`}
              >
                <strong>{asText(item.title)}</strong>
                <span>{asText(item.body)}</span>
              </SiteLink>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
