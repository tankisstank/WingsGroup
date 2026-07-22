'use client'

import React, { useEffect, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import type { CredentialsCarouselBlock, Media as MediaDocument } from '@/payload-types'
import { Media } from '@/components/Media'

import { getWingsSideHiFiCopy } from './copy'

type CredentialSlide = {
  body: string
  image?: MediaDocument | null
  kind: 'award' | 'cert' | 'iso' | 'member'
  mark: string
  micro: string
  title: string
}

export const WingsSideCredentialsCarousel = ({
  content,
  locale,
}: {
  content?: CredentialsCarouselBlock | null
  locale?: null | string
}) => {
  const copy = getWingsSideHiFiCopy(locale)
  const slides: CredentialSlide[] = content?.items?.length
    ? content.items.map((item) => ({
        body: item.description,
        image: typeof item.image === 'object' ? item.image : null,
        kind: item.kind,
        mark: item.mark,
        micro: item.label,
        title: item.title,
      }))
    : copy.creds.slides
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const autoplay = content?.autoplay !== false
  const intervalMs = Math.min(15000, Math.max(3000, content?.intervalMs || 5500))
  const ariaLabel = content?.ariaLabel || content?.title || copy.creds.ariaLabel

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) setPaused(true)
  }, [])

  useEffect(() => {
    if (!autoplay || paused || slides.length < 2) return
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length)
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [autoplay, intervalMs, paused, slides.length])

  useEffect(() => {
    if (active >= slides.length) setActive(0)
  }, [active, slides.length])

  // Unverified credential slots are omitted from public copy — hide section entirely.
  if (!slides.length) return null

  return (
    <section
      aria-label={ariaLabel}
      aria-roledescription="carousel"
      className={`ws-hifi-creds${content?.fullBleed === false ? '' : ' ws-hifi-creds--full-bleed'}`}
      data-od-id="home-creds"
      data-testid="wingsside-hifi-creds"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="ws-hifi-creds__inner">
        <p className="ws-hifi-creds__kicker">{content?.eyebrow || copy.creds.kicker}</p>
        <h2 className="ws-hifi-creds__title">{content?.title || copy.creds.title}</h2>
        {content?.description || copy.creds.lede ? (
          <p className="ws-hifi-creds__lede">{content?.description || copy.creds.lede}</p>
        ) : null}

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
                {slide.image ? (
                  <Media
                    className="ws-hifi-creds__mark ws-hifi-creds__mark--media"
                    imgClassName="ws-hifi-creds__mark-image"
                    resource={slide.image}
                  />
                ) : (
                  <div aria-hidden="true" className="ws-hifi-creds__mark" data-kind={slide.kind}>
                    {slide.mark}
                  </div>
                )}
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
          <div aria-label={ariaLabel} className="ws-hifi-creds__dots" role="tablist">
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
