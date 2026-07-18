'use client'

import type { TestimonialBlock as TestimonialBlockProps } from '@/payload-types'

import { Media } from '@/components/Media'
import { PauseIcon, PlayIcon } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

const formatNoteDate = (value?: null | string) => {
  if (!value) return null

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(date)
}

export const TestimonialBlock: React.FC<TestimonialBlockProps> = ({
  description,
  eyebrow,
  items,
  presentation = 'quote-grid',
  title,
}) => {
  const isCarousel = presentation === 'carousel'
  const itemCount = items?.length || 0
  const shouldAutoplay = isCarousel && itemCount > 3
  const [isPaused, setIsPaused] = useState(false)
  const [isInteracting, setIsInteracting] = useState(false)
  const activeIndexRef = useRef(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!shouldAutoplay || isPaused || isInteracting) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reducedMotion.matches) return

    const timer = window.setInterval(() => {
      const carousel = carouselRef.current
      const cards = carousel?.querySelectorAll<HTMLElement>('.layout-testimonial')

      if (!carousel || !cards?.length || typeof carousel.scrollTo !== 'function') return

      activeIndexRef.current = (activeIndexRef.current + 1) % cards.length
      carousel.scrollTo({
        behavior: 'smooth',
        left: cards[activeIndexRef.current]?.offsetLeft || 0,
      })
    }, 3000)

    return () => window.clearInterval(timer)
  }, [isInteracting, isPaused, shouldAutoplay])

  return (
    <section
      className={`container theme-section layout-block layout-block--testimonials layout-block--${presentation}`}
      data-block-presentation={presentation}
    >
      <header className="layout-block__header">
        {eyebrow ? <p className="site-brand-kicker">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      <div
        aria-label={isCarousel ? title : undefined}
        aria-live="off"
        aria-roledescription={isCarousel ? 'carousel' : undefined}
        className="layout-testimonials"
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setIsInteracting(false)
        }}
        onFocusCapture={() => setIsInteracting(true)}
        onMouseEnter={() => setIsInteracting(true)}
        onMouseLeave={() => setIsInteracting(false)}
        ref={carouselRef}
        role={isCarousel ? 'region' : undefined}
      >
        {items?.map((item, index) => {
          const noteDate = formatNoteDate(item.noteDate)

          return (
            <figure
              aria-label={isCarousel ? `${index + 1} of ${itemCount}` : undefined}
              className="layout-testimonial theme-card--quiet"
              key={`${item.name}-${index}`}
              role={isCarousel ? 'group' : undefined}
            >
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
                  {item.country || noteDate ? (
                    <small className="layout-testimonial__meta">
                      {item.country ? <span>{item.country}</span> : null}
                      {item.country && noteDate ? <span aria-hidden="true"> · </span> : null}
                      {noteDate ? (
                        <time dateTime={item.noteDate || undefined}>{noteDate}</time>
                      ) : null}
                    </small>
                  ) : null}
                </span>
                {item.rating ? (
                  <span
                    aria-label={`${item.rating} trên 5 sao`}
                    className="layout-testimonial__rating"
                  >
                    {'★'.repeat(item.rating)}
                  </span>
                ) : null}
              </figcaption>
            </figure>
          )
        })}
      </div>
      {shouldAutoplay ? (
        <button
          aria-label={isPaused ? 'Play traveler notes carousel' : 'Pause traveler notes carousel'}
          className="layout-testimonials__autoplay-toggle"
          onClick={() => setIsPaused((value) => !value)}
          type="button"
        >
          {isPaused ? <PlayIcon aria-hidden="true" /> : <PauseIcon aria-hidden="true" />}
        </button>
      ) : null}
    </section>
  )
}
