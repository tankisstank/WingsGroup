import React from 'react'

import { FormBlock } from '@/blocks/Form/Component'
import { ProtectedEmailLink } from '@/components/ProtectedEmailLink'
import { SiteLink } from '@/components/SiteLink'
import type { WingsSideHiFiPageModel } from '@/utilities/wingsSideHiFiPageModel'
import { getWingsSideHiFiAlt, getWingsSideHiFiPublicUrl } from '@/utilities/wingsSideHiFiMedia'
import type { ResolvedHeroPresentation } from '@/heros/presentations/types'
import { getPublicRoutePathname, type SupportedLocaleCode } from '@/utilities/sitePaths'
import type { Form as FormType } from '@payloadcms/plugin-form-builder/types'
import { TourEnquiryContextBridge } from '@/tours/TourEnquiryContextBridge'
import { readSafeTourEnquiryContext } from '@/tours/enquiryContext'

import { getWingsSideHiFiCopy } from './copy'
import { WingsSideHiFiSectionInventory } from './SectionInventory'
import { getWingsSideSecondaryHeroCopy, type WingsSideSecondaryRoute } from './secondaryCopy'
import './hifi-pages.css'
import './hifi-sections.css'

const asText = (value: unknown, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

const resolveForm = (value: unknown): FormType | null =>
  value && typeof value === 'object' && 'id' in value && 'fields' in value
    ? (value as FormType)
    : null

const getChannelOdId = (href: string | undefined): string | undefined => {
  if (!href) return undefined
  if (href.startsWith('mailto:')) return 'channel-email'
  if (href.startsWith('tel:')) return 'channel-phone'
  if (href.includes('wa.me') || href.includes('whatsapp')) return 'channel-wa'
  return undefined
}

const routeAnchors: Record<WingsSideSecondaryRoute, string> = {
  '/about-us': '/plan-your-trip',
  '/contact-us': '#contact-form',
  '/destinations': '#dest-grid',
  '/packages': '#pkg-grid',
  '/styles': '#style-grid',
  '/travel-guide': '#guide-list',
}

const routeSecondary: Record<WingsSideSecondaryRoute, string> = {
  '/about-us': '/contact-us',
  '/contact-us': '/plan-your-trip',
  '/destinations': '/plan-your-trip',
  '/packages': '/plan-your-trip',
  '/styles': '/plan-your-trip',
  '/travel-guide': '/plan-your-trip',
}

const ContactBody = ({
  locale,
  model,
  searchParams,
}: {
  locale?: null | string
  model: WingsSideHiFiPageModel
  searchParams?: Record<string, string | string[] | undefined>
}) => {
  const copy = getWingsSideHiFiCopy(locale)
  const content = model.routeContent || {}
  const channels = asArray<{ label?: string; value?: string; href?: string }>(content.channels)
  const nextSteps = asArray<{ title?: string; body?: string } | string>(content.nextSteps)
  const form = resolveForm(content.form)
  const tourContext = readSafeTourEnquiryContext(searchParams)
  const contextLabel = [
    tourContext.tourTitle || tourContext.tourSlug,
    tourContext.discovery?.destination,
    tourContext.discovery?.style,
    tourContext.discovery?.duration,
  ]
    .filter(Boolean)
    .join(' · ')
  const hasTourContext = Boolean(
    contextLabel || tourContext.discovery?.q || tourContext.discovery?.type,
  )

  return (
    <>
      <section className="ws-secondary-contact" data-od-id="contact-split" id="contact-form">
        <div className="ws-secondary-contact__form">
          <p className="kicker">Light form - primary on this URL</p>
          <h2>{asText(content.formTitle, locale === 'vi' ? 'Gửi tin nhắn' : 'Send a message')}</h2>
          <p className="lede">
            {asText(
              content.formLede,
              locale === 'vi'
                ? 'Dành cho yêu cầu rõ ràng. Với brief đầy đủ, hãy mở trang Lên kế hoạch.'
                : 'Enough for high-intent visitors. For full qualification, open Plan your trip.',
            )}
          </p>
          {hasTourContext ? (
            <div className="ws-secondary-contact__tour-context" data-od-id="contact-tour-context">
              <span>{locale === 'vi' ? 'Tour đang quan tâm' : 'Journey in context'}</span>
              <strong>{contextLabel}</strong>
            </div>
          ) : null}
          {form ? (
            <>
              <FormBlock
                anchorId={null}
                enableIntro={false}
                form={form}
                formOdId="contact-form"
                presentation="minimal"
                submitOdId="contact-submit"
              />
              {hasTourContext ? (
                <TourEnquiryContextBridge
                  context={tourContext}
                  rootSelector=".ws-secondary-contact__form"
                />
              ) : null}
            </>
          ) : (
            <p className="lede" data-testid="contact-form-missing">
              {locale === 'vi'
                ? 'Form liên hệ chưa được liên kết trong Payload.'
                : 'Contact form is not linked in Payload yet.'}
            </p>
          )}
        </div>
        <div className="ws-secondary-contact__channels">
          <p className="kicker">
            {locale === 'vi' ? 'Hoặc liên hệ trực tiếp' : 'Or reach us directly'}
          </p>
          <h2>{asText(content.channelsTitle, copy.contact.channelsTitle)}</h2>
          <ul className="promise-list">
            <li>
              <strong>
                {locale === 'vi'
                  ? 'Phản hồi trong 1 ngày làm việc (GMT+7)'
                  : 'Reply SLA: within 1 business day (GMT+7)'}
              </strong>
            </li>
            <li>
              {locale === 'vi'
                ? 'Giờ làm việc: Thứ 2-Thứ 6, 09:00-18:00'
                : 'Hours: Mon-Fri 09:00-18:00 - Vietnam time'}
            </li>
          </ul>
          <div className="ws-secondary-channel-list">
            {(channels.length ? channels : copy.contact.channels).map((channel, index) => {
              const odId = getChannelOdId(channel.href)
              const content = (
                <>
                  <span className="micro">
                    {String(index + 1).padStart(2, '0')} - {asText(channel.label)}
                  </span>
                  <strong>{asText(channel.value)}</strong>
                </>
              )
              const email = channel.href?.match(/^mailto:(.+)$/iu)?.[1]
              return email ? (
                <article className="ws-secondary-channel" data-od-id={odId} key={`${channel.label}-${index}`}>
                  <span className="micro">
                    {String(index + 1).padStart(2, '0')} - {asText(channel.label)}
                  </span>
                  <ProtectedEmailLink email={email} label={asText(channel.value)} />
                </article>
              ) : channel.href ? (
                <a
                  className="ws-secondary-channel"
                  data-od-id={odId}
                  href={channel.href}
                  key={`${channel.label}-${index}`}
                >
                  {content}
                </a>
              ) : (
                <article data-od-id={odId} key={`${channel.label}-${index}`}>
                  {content}
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="ws-hifi-section section" data-od-id="contact-after">
        <p className="kicker">{locale === 'vi' ? 'Sau khi gửi' : 'After you send'}</p>
        <h2 className="h2">{asText(content.nextTitle, copy.contact.nextTitle)}</h2>
        <div className="grid-4">
          {(nextSteps.length ? nextSteps : copy.contact.nextSteps).map((step, index) => {
            const title = typeof step === 'string' ? step : asText(step.title)
            const body = typeof step === 'string' ? '' : asText(step.body)
            return (
              <article className="card" key={`${title}-${index}`}>
                <div className="num">{String(index + 1).padStart(2, '0')}</div>
                <h3>{title}</h3>
                {body ? <p>{body}</p> : null}
              </article>
            )
          })}
        </div>
      </section>
    </>
  )
}

export const SecondaryHiFiPage = ({
  heroPresentation,
  locale,
  model,
  publicPathname,
  searchParams,
}: {
  locale?: null | string
  model: WingsSideHiFiPageModel
  publicPathname: string
  searchParams?: Record<string, string | string[] | undefined>
  heroPresentation?: ResolvedHeroPresentation | null
}) => {
  const route = getPublicRoutePathname(publicPathname) as WingsSideSecondaryRoute
  const heroCopy = getWingsSideSecondaryHeroCopy(locale, route)
  const content = model.routeContent || {}
  const hero = model.hero
  const closingLinks = asArray<{ body?: string; href?: string; title?: string }>(
    content.closingLinks,
  )
  const closingTitle = asText(content.closingTitle)
  const closingLede = asText(content.closingNote || content.closingLede)

  return (
    <div className="ws-hifi-page ws-hifi-page--secondary" data-route={model.routeVariant}>
      <div className="ws-hifi-shell">
        <nav aria-label="Breadcrumb" className="ws-secondary-breadcrumb">
          <SiteLink href="/">WingSide</SiteLink>
          <span>/</span>
          <span>{heroCopy.breadcrumb}</span>
        </nav>

        <section
          className="ws-hifi-home-hero hero ws-secondary-hero"
          data-hero-presentation={heroPresentation?.key}
          data-hero-preset={heroPresentation?.presetKey}
          data-hero-source={heroPresentation?.source}
          data-hero-template={heroPresentation?.key}
          data-od-id={`${model.routeVariant}-hero`}
        >
          <div className="ws-hifi-home-hero__copy">
            <p className="eyebrow">{asText(hero.eyebrow, heroCopy.eyebrow)}</p>
            <h1 className="h1">{asText(hero.title, heroCopy.title)}</h1>
            <p className="lede">{asText(hero.lede, heroCopy.lede)}</p>
            <div className="cta-row">
              <SiteLink
                className="btn btn-primary"
                href={hero.primaryCta?.href || routeAnchors[route]}
              >
                {hero.primaryCta?.label || heroCopy.primary}
              </SiteLink>
              <SiteLink
                className="btn btn-ghost"
                href={hero.secondaryCta?.href || routeSecondary[route]}
              >
                {hero.secondaryCta?.label || heroCopy.secondary}
              </SiteLink>
            </div>
          </div>
          <div className="ws-hifi-home-hero__media hero-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={getWingsSideHiFiAlt(heroCopy.media)}
              decoding="async"
              src={getWingsSideHiFiPublicUrl(heroCopy.media)}
            />
            <div className="media-cap">{heroCopy.mediaCap}</div>
          </div>
        </section>

        {route === '/contact-us' ? (
          <ContactBody locale={locale} model={model} searchParams={searchParams} />
        ) : (
          <WingsSideHiFiSectionInventory
            locale={(locale || 'en') as SupportedLocaleCode}
            model={model}
            publicPathname={publicPathname}
            searchParams={searchParams}
          />
        )}

        {closingTitle || closingLinks.length ? (
          <section
            className="ws-hifi-section section-sm"
            data-od-id={`${model.routeVariant}-close`}
          >
            <div
              className="ws-hifi-cta-band"
              data-od-id={route === '/contact-us' ? 'contact-bridge' : undefined}
            >
              <div>
                <h2>{closingTitle}</h2>
                {closingLede ? <p>{closingLede}</p> : null}
              </div>
              <SiteLink
                className="site-header-cta"
                href={asText(content.closingHref, '/plan-your-trip')}
              >
                {asText(content.closingCta, heroCopy.secondary)}
              </SiteLink>
            </div>
            {closingLinks.length ? (
              <div className="ws-hifi-grid ws-secondary-related">
                {closingLinks.map((link, index) => (
                  <SiteLink
                    className="ws-hifi-card"
                    href={asText(link.href, '/')}
                    key={`${link.href}-${index}`}
                  >
                    <strong>{asText(link.title)}</strong>
                    <span>{asText(link.body)}</span>
                  </SiteLink>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  )
}
