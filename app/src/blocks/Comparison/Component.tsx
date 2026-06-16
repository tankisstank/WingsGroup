import type { ComparisonBlock as ComparisonBlockProps } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import React from 'react'

export const ComparisonBlock: React.FC<ComparisonBlockProps> = ({
  description,
  eyebrow,
  options,
  presentation = 'matrix',
  title,
}) => (
  <section
    className={`container theme-section layout-block layout-block--comparison layout-block--${presentation}`}
    data-block-presentation={presentation}
  >
    <header className="layout-block__header">
      {eyebrow ? <p className="site-brand-kicker">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </header>
    <div className="layout-comparison" role={presentation === 'matrix' ? 'table' : undefined}>
      {options?.map((option, index) => (
        <article
          className={`layout-comparison__option theme-card${option.featured ? ' is-featured' : ''}`}
          key={`${option.title}-${index}`}
          role={presentation === 'matrix' ? 'row' : undefined}
        >
          {option.featured ? <span className="layout-comparison__badge">Đề xuất</span> : null}
          <h3>{option.title}</h3>
          {option.price ? <strong className="layout-comparison__price">{option.price}</strong> : null}
          {option.summary ? <p>{option.summary}</p> : null}
          <dl>
            {option.features?.map((feature, featureIndex) => (
              <div key={`${feature.label}-${featureIndex}`}>
                <dt>{feature.label}</dt>
                <dd>{feature.value}</dd>
              </div>
            ))}
          </dl>
          {option.link?.label ? <CMSLink appearance="default" {...option.link} /> : null}
        </article>
      ))}
    </div>
  </section>
)
