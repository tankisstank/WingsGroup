'use client'

import React, { useEffect, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { getWingsSideHiFiCopy } from './copy'

export const WingsSideCredentialsCarousel = ({ locale }: { locale?: null | string }) => {
  const copy = getWingsSideHiFiCopy(locale)
  const slides = copy.creds.slides
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) setPaused(true)
  }, [])

  useEffect(() => {
    if (paused || slides.length < 2) return
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length)
    }, 5500)
    return () => window.clearInterval(timer)
  }, [paused, slides.length])

  // Unverified credential slots are omitted from public copy — hide section entirely.
  if (!slides.length) return null

  return (
    <section
      aria-label={copy.creds.ariaLabel}
      aria-roledescription="carousel"
      className="ws-hifi-creds ws-hifi-creds--full-bleed"
      data-od-id="home-creds"
      data-testid="wingsside-hifi-creds"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="ws-hifi-creds__inner">
        <p className="ws-hifi-creds__kicker">{copy.creds.kicker}</p>
        <h2 className="ws-hifi-creds__title">{copy.creds.title}</h2>
        <p className="ws-hifi-creds__lede">{copy.creds.lede}</p>

        <div className="ws-hifi-creds__viewport">
          {slides.map((slide, index) => {
            const isActive = index === active
            return (
              <article
                aria-hidden={!isActive}
                aria-label={`${index + 1} of ${slides.length}`}
                className="ws-hifi-creds__slide"
                data-active={isActive ? 'true' : 'false'}
                data-kind={slide.kind}
                key={`creds-slide-${index}-${slide.kind}-${slide.mark}`}
              >
                <div aria-hidden="true" className="ws-hifi-creds__mark" data-kind={slide.kind}>
                  {slide.mark}
                </div>
                <div>
                  <div className="ws-hifi-creds__micro">{slide.micro}</div>
                  <h3>{slide.title}</h3>
                  <p>{slide.body}</p>
                </div>
              </article>
            )
          })}
        </div>

        <div
          aria-hidden="true"
          className="ws-hifi-creds__progress"
          style={{ ['--ws-creds-progress' as string]: `${((active + 1) / slides.length) * 100}%` }}
        />

        <div className="ws-hifi-creds__controls">
          <button
            aria-label={copy.creds.prev}
            className="ws-hifi-creds__nav"
            onClick={() => setActive((current) => (current - 1 + slides.length) % slides.length)}
            type="button"
          >
            <ChevronLeftIcon aria-hidden="true" className="h-4 w-4" />
          </button>
          <div aria-label={copy.creds.ariaLabel} className="ws-hifi-creds__dots" role="tablist">
            {slides.map((slide, index) => (
              <button
                aria-label={`${index + 1} of ${slides.length}`}
                aria-selected={index === active}
                className="ws-hifi-creds__dot"
                data-active={index === active ? 'true' : 'false'}
                key={`creds-dot-${index}-${slide.kind}`}
                onClick={() => setActive(index)}
                role="tab"
                type="button"
              />
            ))}
          </div>
          <button
            aria-label={copy.creds.next}
            className="ws-hifi-creds__nav"
            onClick={() => setActive((current) => (current + 1) % slides.length)}
            type="button"
          >
            <ChevronRightIcon aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  )
}
