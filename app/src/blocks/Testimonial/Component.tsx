import type { TestimonialBlock as TestimonialBlockProps } from '@/payload-types'

import { Media } from '@/components/Media'
import React from 'react'

export const TestimonialBlock: React.FC<TestimonialBlockProps> = ({
  description,
  eyebrow,
  items,
  presentation = 'quote-grid',
  title,
}) => (
  <section
    className={`container theme-section layout-block layout-block--testimonials layout-block--${presentation}`}
    data-block-presentation={presentation}
  >
    <header className="layout-block__header">
      {eyebrow ? <p className="site-brand-kicker">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </header>
    <div className="layout-testimonials">
      {items?.map((item, index) => (
        <figure className="layout-testimonial theme-card--quiet" key={`${item.name}-${index}`}>
          {item.logo && typeof item.logo === 'object' ? (
            <Media imgClassName="layout-testimonial__logo" resource={item.logo} />
          ) : null}
          <blockquote>&ldquo;{item.quote}&rdquo;</blockquote>
          {item.videoURL && presentation === 'video' ? (
            <a href={item.videoURL} rel="noreferrer" target="_blank">
              Xem câu chuyện video
            </a>
          ) : null}
          <figcaption>
            {item.avatar && typeof item.avatar === 'object' ? (
              <Media imgClassName="layout-testimonial__avatar" resource={item.avatar} />
            ) : null}
            <span>
              <strong>{item.name}</strong>
              {item.role ? <small>{item.role}</small> : null}
            </span>
            <span aria-label={`${item.rating || 5} trên 5 sao`} className="layout-testimonial__rating">
              {'★'.repeat(item.rating || 5)}
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  </section>
)

