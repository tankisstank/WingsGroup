import React from 'react'

import { FormBlock } from '@/blocks/Form/Component'
import { SiteLink } from '@/components/SiteLink'
import { getWingsSideHiFiCopy } from '@/components/WingsSideHiFi/copy'
import { getWingsSideHiFiPublicUrl } from '@/utilities/wingsSideHiFiMedia'
import type { WingsSideHiFiPageModel } from '@/utilities/wingsSideHiFiPageModel'
import type { Form as FormType } from '@payloadcms/plugin-form-builder/types'

import { PlanPrefillBridge } from './PlanPrefillBridge'
import './hifi-pages.css'
import './hifi-sections.css'

const asText = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

const resolveForm = (value: unknown): FormType | null => {
  if (!value || typeof value !== 'object') return null
  if ('id' in value && 'fields' in value) return value as FormType
  return null
}

const monthOptionsForLocale = (locale?: null | string) => {
  const key = (locale || 'en').toLowerCase()
  if (key === 'vi') {
    return [
      { label: 'Tháng 3', value: '3' },
      { label: 'Tháng 4', value: '4' },
      { label: 'Tháng 5', value: '5' },
      { label: 'Tháng 9', value: '9' },
      { label: 'Tháng 10', value: '10' },
      { label: 'Tháng 11', value: '11' },
    ]
  }
  return [
    { label: 'March', value: '3' },
    { label: 'April', value: '4' },
    { label: 'May', value: '5' },
    { label: 'September', value: '9' },
    { label: 'October', value: '10' },
    { label: 'November', value: '11' },
  ]
}

const groupOptionsForLocale = (locale?: null | string) => {
  const key = (locale || 'en').toLowerCase()
  if (key === 'vi') {
    return [
      { label: '2 khách', value: '2' },
      { label: '3–4', value: '3' },
      { label: '5–8', value: '5' },
      { label: '9+', value: '9' },
    ]
  }
  return [
    { label: '2 travelers', value: '2' },
    { label: '3–4', value: '3' },
    { label: '5–8', value: '5' },
    { label: '9+', value: '9' },
  ]
}

export const PlanHiFiPage = ({
  locale,
  model,
  searchParams,
}: {
  locale?: null | string
  model: WingsSideHiFiPageModel
  searchParams?: Record<string, string | string[] | undefined>
}) => {
  const copy = getWingsSideHiFiCopy(locale)
  const plan = (model.routeContent || {}) as Record<string, unknown>
  const hero = model.hero

  // Dedicated Plan hero: do not accept arbitrary model.hero.lede (legacy steps bleed).
  const title =
    hero.title && hero.title !== copy.plan.stepsTitle && hero.title !== copy.heroTitle
      ? hero.title
      : copy.plan.heroTitle
  const lede = asText(plan.heroLede, copy.plan.heroLede)
  // Never show Home "Plan trip" on Plan CTA.
  const primaryCta =
    hero.primaryCta?.label &&
    hero.primaryCta.label !== copy.home.planTripCta &&
    hero.primaryCta.label !== 'Plan trip' &&
    hero.primaryCta.label !== 'Lên kế hoạch'
      ? hero.primaryCta.label
      : copy.plan.primaryCtaLabel
  const secondaryCta = hero.secondaryCta?.label || copy.home.exploreDestinations

  const steps = asArray<{ label?: string; title?: string; body?: string }>(plan.steps)
  const explore = asArray<{ title?: string; body?: string; href?: string }>(plan.explore)
  const faq = asArray<{ question?: string; answer?: string; title?: string; body?: string }>(
    plan.faq,
  )
  const faqItems =
    faq.length > 0
      ? faq.map((item) => ({
          question: asText(item.question || item.title),
          answer: asText(item.answer || item.body),
        }))
      : copy.plan.faq

  const form = resolveForm(plan.form)
  const formId =
    typeof plan.form === 'number' || typeof plan.form === 'string' ? plan.form : form?.id

  const localeKey = (locale || 'en').toLowerCase()

  return (
    <div className="ws-hifi-page ws-hifi-page--plan" data-testid="wingsside-hifi-plan">
      <div className="ws-hifi-shell">
        <nav aria-label="Breadcrumb" className="ws-hifi-crumb">
          <b>Wingside</b>
          <span aria-hidden="true"> / </span>
          <span>{copy.plan.breadcrumbCurrent}</span>
        </nav>

        <section className="ws-hifi-home-hero hero" data-od-id="plan-hero">
          <div className="ws-hifi-home-hero__copy">
            <p className="eyebrow">{copy.plan.heroKicker}</p>
            <h1 className="h1">{title}</h1>
            {lede ? <p className="lede">{lede}</p> : null}
            <div className="cta-row">
              <a className="btn btn-primary" data-od-id="plan-cta-brief" href="#brief">
                {primaryCta}
              </a>
              <SiteLink className="btn btn-ghost" href={hero.secondaryCta?.href || '/destinations'}>
                {secondaryCta}
              </SiteLink>
            </div>
          </div>
          <div className="ws-hifi-home-hero__media hero-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={copy.plan.mediaCap}
              decoding="async"
              height={640}
              src={getWingsSideHiFiPublicUrl('halong')}
              width={800}
            />
            <div className="media-cap">{copy.plan.mediaCap}</div>
          </div>
        </section>

        <section className="ws-hifi-section section-sm" data-od-id="plan-steps">
          <p className="kicker">{asText(plan.stepsKicker, copy.plan.stepsKicker)}</p>
          <h2 className="h2">{asText(plan.stepsTitle, copy.plan.stepsTitle)}</h2>
          <p className="lede">{asText(plan.stepsLede, copy.plan.stepsLede)}</p>
          <div className="grid-4">
            {(steps.length ? steps : copy.plan.steps).map((step, index) => (
              <article
                className="card"
                data-od-id={`plan-step-${index + 1}`}
                key={`plan-step-${index}-${step.title}`}
              >
                <div className="num">{String(index + 1).padStart(2, '0')}</div>
                <div className="micro">{asText(step.label)}</div>
                <h3>{asText(step.title)}</h3>
                <p>{asText(step.body)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="ws-hifi-planner-section section" data-od-id="plan-brief" id="brief">
          <div className="planner">
            <div className="planner-copy">
              <p className="kicker">{copy.plan.briefKicker}</p>
              <h2 className="h2 planner-title">{copy.plan.briefTitle}</h2>
              <ul className="promise-list">
                {copy.plan.promises.map((item, index) => (
                  <li key={`promise-${index}`}>
                    <strong>{item}</strong>
                  </li>
                ))}
              </ul>
              <div className="ws-hifi-trust ws-hifi-trust--stack">
                <article className="ws-hifi-trust__item" data-kind="sla">
                  <div>
                    <strong>{copy.home.trust[0]?.title}</strong>
                    <p className="ws-hifi-trust__big">{localeKey === 'vi' ? '1 ngày' : '1 day'}</p>
                  </div>
                </article>
                <article className="ws-hifi-trust__item" data-kind="planner">
                  <span className="ws-hifi-trust__avatar" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt=""
                      decoding="async"
                      height={40}
                      loading="lazy"
                      src={getWingsSideHiFiPublicUrl('planner')}
                      width={40}
                    />
                  </span>
                  <div>
                    <strong>{copy.home.trust[2]?.title}</strong>
                    <p className="ws-hifi-trust__meta">{copy.home.plannerNamePlaceholder}</p>
                  </div>
                </article>
                <article className="ws-hifi-trust__item" data-kind="proof">
                  <div>
                    <strong>{localeKey === 'vi' ? 'Ghi chú khách' : 'Guest note'}</strong>
                    <p className="ws-hifi-trust__meta">{copy.plan.guestNote}</p>
                  </div>
                </article>
              </div>
            </div>
            <div className="planner-form ws-hifi-plan-form">
              <h3 className="form-title">{copy.plan.formTitle}</h3>
              {form ? (
                <>
                  {/* FormBlock first so chrome can portal into the real <form>. */}
                  <FormBlock
                    anchorId={null}
                    enableIntro={false}
                    form={form}
                    formOdId="plan-form"
                    presentation="minimal"
                    submitOdId="plan-submit"
                  />
                  <PlanPrefillBridge
                    budgetLabel={copy.plan.budgetChipsLabel}
                    budgetOptions={copy.plan.budgetChips}
                    consentLabel={copy.plan.consentLabel}
                    destLabel={copy.plan.destChipsLabel}
                    destOptions={copy.plan.destChips}
                    groupLabel={localeKey === 'vi' ? 'Quy mô đoàn' : 'Group size'}
                    groupOptions={groupOptionsForLocale(locale)}
                    monthLabel={localeKey === 'vi' ? 'Tháng đi' : 'Travel month'}
                    monthOptions={monthOptionsForLocale(locale)}
                    searchParams={searchParams}
                    styleLabel={copy.plan.styleChipsLabel}
                    styleOptions={copy.plan.styleChips}
                  />
                </>
              ) : formId != null ? (
                <p className="lede" data-testid="plan-form-unpopulated">
                  Form #{String(formId)} is linked but not populated for this locale.
                </p>
              ) : (
                <p className="lede" data-testid="plan-form-missing">
                  Plan form is not linked on this page yet.
                </p>
              )}
            </div>
          </div>
        </section>

        <section
          className="ws-hifi-section section"
          data-od-id="plan-faq"
          style={{ paddingTop: 0 }}
        >
          <p className="kicker">{copy.plan.faqKicker}</p>
          <h2 className="h2">{asText(plan.faqTitle, copy.plan.faqTitle)}</h2>
          <div className="ws-hifi-faq">
            {faqItems.map((item, index) => (
              <details className="ws-hifi-faq__item" key={`faq-${index}-${item.question}`}>
                <summary>{item.question}</summary>
                <div className="ws-hifi-faq__ans">{item.answer}</div>
              </details>
            ))}
          </div>
        </section>

        <section
          className="ws-hifi-section section"
          data-od-id="plan-explore"
          style={{ paddingTop: 0 }}
        >
          <p className="kicker">{copy.home.continueKicker}</p>
          <h2 className="h2">{asText(plan.exploreTitle, copy.plan.exploreTitle)}</h2>
          <div className="ws-hifi-grid">
            {(explore.length ? explore : copy.plan.explore).map((item, index) => (
              <SiteLink
                className="ws-hifi-card"
                data-od-id={`plan-explore-${index + 1}`}
                href={asText(item.href, '/')}
                key={`plan-explore-${index}-${item.href}`}
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
