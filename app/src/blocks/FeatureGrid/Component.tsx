import type { FeatureGridBlock as FeatureGridBlockProps } from '@/payload-types'

import React from 'react'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import { cn } from '@/utilities/ui'
import { BadgeCheckIcon, CalendarDaysIcon, CompassIcon, MapPinnedIcon } from 'lucide-react'

const gridColumns = {
  '2': 'lg:grid-cols-2',
  '3': 'lg:grid-cols-3',
  '4': 'lg:grid-cols-4',
} as const

const featureIcons = [CompassIcon, CalendarDaysIcon, MapPinnedIcon, BadgeCheckIcon] as const

export const FeatureGridBlock: React.FC<FeatureGridBlockProps> = ({
  columns = '3',
  description,
  eyebrow,
  items,
  presentation = 'icon-grid',
  title,
  variant = 'default',
}) => {
  const cardClassName =
    variant === 'highlight'
      ? 'theme-card border p-6'
      : variant === 'minimal'
        ? 'theme-card--quiet border p-6'
        : 'rounded-[var(--site-radius)] border bg-background/70 p-6'

  return (
    <section
      className={`container theme-section layout-block layout-block--features layout-block--${presentation}`}
      data-block-presentation={presentation}
    >
      <div className="mb-8 max-w-3xl">
        {eyebrow ? (
          <p className="site-brand-kicker mb-3 text-xs font-semibold uppercase tracking-[0.24em]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{title}</h2>
        {description ? <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p> : null}
      </div>

      <div
        className={cn(
          'layout-features grid gap-5 md:grid-cols-2',
          presentation === 'icon-grid' && gridColumns[columns || '3'],
        )}
      >
        {items?.map((item, index) => {
          const Icon = featureIcons[index % featureIcons.length]
          const image = 'image' in item ? item.image : undefined

          return (
            <article className={cn(cardClassName, 'group site-feature-card overflow-hidden')} key={`${item.title}-${index}`}>
              {image && typeof image !== 'string' && typeof image !== 'number' ? (
                <div className="-mx-6 -mt-6 mb-6 overflow-hidden border-b border-[color:var(--site-border)]">
                  <Media
                    imgClassName="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    resource={image}
                    size="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              ) : null}
              <div className="site-feature-card__icon">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </div>
              {item.eyebrow ? (
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--site-brand)]">
                  {item.eyebrow}
                </p>
              ) : null}
              <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
              {item.meta ? <p className="mt-2 text-sm font-medium text-[color:var(--site-accent)]">{item.meta}</p> : null}
              {item.description ? <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p> : null}
              {presentation === 'accordion' || presentation === 'tabs' ? (
                <details className="layout-feature__details">
                  <summary>Xem chi tiết</summary>
                  <p>{item.description || 'Bổ sung nội dung chi tiết cho mục này.'}</p>
                </details>
              ) : null}
              {item.enableLink && item.link?.label ? (
                <div className="mt-5">
                  <CMSLink
                    appearance="outline"
                    {...item.link}
                    className="rounded-full border-[color:var(--site-border)] px-4 py-2 text-sm"
                  />
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
