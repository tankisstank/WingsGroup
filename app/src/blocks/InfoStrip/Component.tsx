import type { InfoStripBlock as InfoStripBlockProps } from '@/payload-types'

import { BadgeCheckIcon, Globe2Icon, HeadphonesIcon, PlaneTakeoffIcon } from 'lucide-react'
import React from 'react'

const infoIcons = [PlaneTakeoffIcon, Globe2Icon, HeadphonesIcon, BadgeCheckIcon] as const

export const InfoStripBlock: React.FC<InfoStripBlockProps> = ({ description, eyebrow, items, title }) => {
  return (
    <section className="container theme-section--compact">
      <div className="theme-card site-info-strip rounded-[var(--site-radius)] border p-8">
        <div className="mb-8 max-w-3xl">
          {eyebrow ? <p className="site-brand-kicker mb-3 text-xs font-semibold uppercase tracking-[0.24em]">{eyebrow}</p> : null}
          {title ? <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{title}</h2> : null}
          {description ? <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">{description}</p> : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {items?.map((item, index) => {
            const Icon = infoIcons[index % infoIcons.length]

            return (
              <div className="site-info-stat" key={`${item.label}-${index}`}>
                <div className="site-info-stat__icon">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </div>
                {item.value ? <p className="text-2xl font-semibold text-foreground">{item.value}</p> : null}
                <p className="mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-[color:var(--site-brand)]">{item.label}</p>
                {item.description ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p> : null}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
