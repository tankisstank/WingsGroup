'use client'

import React, { useEffect, useState } from 'react'

export type HomeHeroSlide = {
  alt: string
  caption?: string
  src: string
}

export const HomeHeroCarousel = ({
  ariaLabel,
  slides,
}: {
  ariaLabel: string
  slides: HomeHeroSlide[]
}) => {
  const safe = slides.length > 0 ? slides : []
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) setPaused(true)
    const onChange = () => setPaused(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  useEffect(() => {
    if (paused || safe.length < 2) return
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % safe.length)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [paused, safe.length])

  if (!safe.length) {
    return (
      <div className="ws-hifi-home-hero__media ws-hifi-home-hero__media--empty" aria-hidden="true" />
    )
  }

  return (
    <div
      aria-label={ariaLabel}
      aria-roledescription="carousel"
      className="ws-hifi-home-hero__media home-hero-media"
      data-od-id="home-hero-media"
      data-testid="wingsside-hifi-home-hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="home-hero-viewport">
        <div className="home-hero-track">
          {safe.map((slide, index) => {
            const isActive = index === active
            return (
              <figure
                aria-hidden={!isActive}
                className="home-hero-slide"
                data-active={isActive ? 'true' : 'false'}
                key={`${slide.src}-${index}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={slide.alt} decoding="async" src={slide.src} />
                {slide.caption ? <figcaption className="media-cap">{slide.caption}</figcaption> : null}
              </figure>
            )
          })}
        </div>
        {!paused ? (
          <div aria-hidden="true" className="home-hero-progress">
            <i className="is-run" key={active} />
          </div>
        ) : null}
      </div>
      {safe.length > 1 ? (
        <div className="home-hero-controls">
          <button
            aria-label="Previous highlight"
            className="home-hero-nav"
            onClick={() => setActive((current) => (current - 1 + safe.length) % safe.length)}
            type="button"
          >
            ‹
          </button>
          <div aria-label="Hero slides" className="home-hero-dots" role="tablist">
            {safe.map((slide, index) => (
              <button
                aria-label={`Show slide ${index + 1}`}
                aria-selected={index === active}
                className={index === active ? 'home-hero-dot is-on' : 'home-hero-dot'}
                key={`${slide.src}-dot-${index}`}
                onClick={() => setActive(index)}
                role="tab"
                type="button"
              />
            ))}
          </div>
          <button
            aria-label="Next highlight"
            className="home-hero-nav"
            onClick={() => setActive((current) => (current + 1) % safe.length)}
            type="button"
          >
            ›
          </button>
        </div>
      ) : null}
    </div>
  )
}
