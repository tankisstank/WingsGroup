import type { StatsBlock as StatsBlockProps } from '@/payload-types'

import { Media } from '@/components/Media'
import React from 'react'

export const StatsBlock: React.FC<StatsBlockProps> = ({
  description,
  eyebrow,
  items,
  presentation = 'inline-bar',
  title,
}) => (
  <section
    className={`container theme-section layout-block layout-block--stats layout-block--${presentation}`}
    data-block-presentation={presentation}
  >
    {(eyebrow || title || description) && (
      <header className="layout-block__header">
        {eyebrow ? <p className="site-brand-kicker">{eyebrow}</p> : null}
        {title ? <h2>{title}</h2> : null}
        {description ? <p>{description}</p> : null}
      </header>
    )}
    <div className="layout-stats">
      {items?.map((item, index) => (
        <article className="layout-stat" key={`${item.label}-${index}`}>
          {item.logo && typeof item.logo === 'object' ? (
            <Media imgClassName="layout-stat__logo" resource={item.logo} />
          ) : null}
          <strong>{item.value}</strong>
          <h3>{item.label}</h3>
          {item.description ? <p>{item.description}</p> : null}
          {presentation === 'progress' ? (
            <div
              aria-label={`${item.label}: ${item.progress || 0}%`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={item.progress || 0}
              className="layout-stat__progress"
              role="progressbar"
            >
              <span style={{ width: `${item.progress || 0}%` }} />
            </div>
          ) : null}
        </article>
      ))}
    </div>
  </section>
)

