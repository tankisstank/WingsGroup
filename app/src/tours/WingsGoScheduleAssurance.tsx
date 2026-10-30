import React from 'react'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import type { HotlineItem } from '@/utilities/siteHotlines'
import { formatHotlineDisplay } from '@/utilities/siteHotlines'
import { getWingsGoScheduleCopy } from './wingsGoScheduleCopy'
import { SiteLink } from '@/components/SiteLink'
import { cn } from '@/utilities/ui'

export type WingsGoScheduleAssuranceProps = {
  locale?: SupportedLocaleCode
  hotlines?: HotlineItem[]
  zaloCTA?: { href: string; label: string } | null
  className?: string
}

export const WingsGoScheduleAssurance: React.FC<WingsGoScheduleAssuranceProps> = ({
  locale = 'vi',
  hotlines = [],
  zaloCTA,
  className,
}) => {
  const isEn = locale === 'en'
  const copy = getWingsGoScheduleCopy(locale)
  const contactHref = '/lien-he'

  const steps = [
    {
      num: '01',
      title: copy.assuranceStep1Title,
      desc: copy.assuranceStep1Desc,
    },
    {
      num: '02',
      title: copy.assuranceStep2Title,
      desc: copy.assuranceStep2Desc,
    },
    {
      num: '03',
      title: copy.assuranceStep3Title,
      desc: copy.assuranceStep3Desc,
    },
  ]

  return (
    <section
      aria-labelledby="assurance-heading"
      className={cn(
        'wingsgo-schedule-assurance rounded-[24px] border border-border/70 bg-card p-6 sm:p-8 md:p-10 shadow-sm transition-colors',
        className,
      )}
      data-od-id="schedule-assurance"
      id="assurance"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Kicker, Heading, Lead, Actions */}
        <div className="lg:col-span-6 space-y-4">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[var(--site-brand)]">
            {copy.assuranceKicker}
          </p>
          <h2
            className="text-2xl sm:text-3xl font-bold text-foreground leading-snug tracking-tight m-0"
            id="assurance-heading"
          >
            {isEn ? (
              <>
                Schedules to choose. <em>Seats</em> confirmed by real experts.
              </>
            ) : (
              <>
                Lịch để chọn. <em>Chỗ</em> do người thật xác nhận.
              </>
            )}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl">
            {copy.assuranceLead}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <SiteLink
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--site-brand)] px-6 text-sm font-semibold text-white no-underline hover:opacity-95 transition-opacity shadow-sm cursor-pointer"
              data-od-id="assurance-contact-cta"
              href={contactHref}
            >
              {copy.assuranceContactCTA}
            </SiteLink>

            {hotlines && hotlines.length > 0 ? (
              <a
                className="inline-flex min-h-[44px] items-center text-sm font-semibold text-foreground hover:text-[var(--site-brand)] no-underline transition-colors px-2"
                href={hotlines[0].href}
              >
                {copy.assuranceCallLabel(formatHotlineDisplay(hotlines[0].normalized))}
              </a>
            ) : null}

            {zaloCTA ? (
              <a
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground hover:border-[var(--site-brand)] hover:text-[var(--site-brand)] no-underline transition-colors"
                href={zaloCTA.href}
                rel="noreferrer"
                target="_blank"
              >
                💬 {zaloCTA.label}
              </a>
            ) : null}
          </div>
        </div>

        {/* Right Column: 3 Numbered Steps */}
        <div className="lg:col-span-6">
          <ol className="space-y-4 sm:space-y-5 m-0 p-0 list-none">
            {steps.map((step) => (
              <li
                className="flex items-start gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50"
                key={step.num}
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--site-brand)]/10 text-[var(--site-brand)] font-bold text-xs sm:text-sm shrink-0 mt-0.5">
                  {step.num}
                </span>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug m-0">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed m-0">
                    {step.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
