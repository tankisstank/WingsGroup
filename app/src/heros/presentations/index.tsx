import type { Media as MediaDocument } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import React, { useEffect, useRef, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon, SparklesIcon } from 'lucide-react'

import type { HeroPresentationKey, HeroPresentationProps, HeroSlide } from './types'
import { getMediaUrl } from '@/utilities/getMediaUrl'

export type { HeroPresentationProps } from './types'

const HeroCopy: React.FC<
  Pick<HeroPresentationProps, 'badge' | 'links' | 'richText'> & {
    centered?: boolean
  }
> = ({ badge, centered = false, links, richText }) => (
  <div className={`hero-presentation__copy${centered ? ' hero-presentation__copy--centered' : ''}`}>
    {badge ? (
      <div className="site-hero__badge">
        <SparklesIcon aria-hidden="true" className="h-4 w-4" />
        <span>{badge}</span>
      </div>
    ) : null}
    {richText && <RichText className="site-hero__richtext" data={richText} enableGutter={false} />}
    {Array.isArray(links) && links.length > 0 ? (
      <ul className="site-hero__actions">
        {links.map(({ link }, index) => (
          <li key={index}>
            <CMSLink {...link} />
          </li>
        ))}
      </ul>
    ) : null}
  </div>
)

const HeroVisual: React.FC<{
  className?: string
  media?: HeroPresentationProps['media']
  priority?: boolean
}> = ({ className = '', media, priority = false }) => (
  <div className={`hero-presentation__visual ${className}`}>
    {media && typeof media === 'object' ? (
      <Media fill imgClassName="object-cover" priority={priority} resource={media} />
    ) : null}
  </div>
)

const HeroPostcards: React.FC<Pick<HeroPresentationProps, 'postcards'>> = ({ postcards }) => (
  postcards.length > 0 ? (
    <div className="hero-presentation__postcards">
      {postcards.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  ) : null
)

const CenteredVisualHero: React.FC<HeroPresentationProps> = ({
  badge,
  businessPanel,
  links,
  media,
  postcards,
  richText,
}) => (
  <div className="container hero-presentation hero-presentation--centered">
    <HeroCopy badge={badge} centered links={links} richText={richText} />
    <div className="hero-presentation__frame">
      <HeroVisual media={media} priority />
      <HeroPostcards postcards={postcards} />
    </div>
    {businessPanel}
  </div>
)

const SplitVisualHero: React.FC<HeroPresentationProps> = ({
  badge,
  businessPanel,
  links,
  media,
  postcards,
  richText,
}) => (
  <div className="container hero-presentation hero-presentation--split">
    <HeroCopy badge={badge} links={links} richText={richText} />
    <div className="hero-presentation__frame hero-presentation__frame--split">
      <HeroVisual media={media} priority />
      <HeroPostcards postcards={postcards} />
    </div>
    {businessPanel ? <div className="hero-presentation__business-panel">{businessPanel}</div> : null}
  </div>
)

const LayeredVisualsHero: React.FC<HeroPresentationProps> = ({
  badge,
  businessPanel,
  links,
  media,
  postcards,
  richText,
  supportingMedia,
}) => {
  const visuals = [media, ...(supportingMedia || [])].filter(
    (item): item is MediaDocument => typeof item === 'object' && item !== null,
  )
  const fallbackVisuals = visuals.length > 0 ? visuals : []
  const layeredVisuals =
    fallbackVisuals.length >= 3
      ? fallbackVisuals.slice(0, 3)
      : [...fallbackVisuals, ...fallbackVisuals, ...fallbackVisuals].slice(0, 3)

  return (
    <div className="container hero-presentation hero-presentation--layered">
      <div className="hero-presentation__layered-stage" aria-hidden="true">
        {layeredVisuals.map((visual, index) => (
          <HeroVisual
            className={`hero-presentation__layer hero-presentation__layer--${index + 1}`}
            key={`${visual.id}-${index}`}
            media={visual}
            priority={index === 0}
          />
        ))}
      </div>
      <HeroCopy badge={badge} centered links={links} richText={richText} />
      <HeroPostcards postcards={postcards} />
      {businessPanel ? <div className="hero-presentation__business-panel">{businessPanel}</div> : null}
    </div>
  )
}

const GradientMeshHero: React.FC<HeroPresentationProps> = ({
  badge,
  businessPanel,
  links,
  postcards,
  richText,
}) => (
  <div className="hero-presentation hero-presentation--mesh">
    <div className="hero-presentation__mesh-orb hero-presentation__mesh-orb--one" aria-hidden="true" />
    <div className="hero-presentation__mesh-orb hero-presentation__mesh-orb--two" aria-hidden="true" />
    <div className="hero-presentation__mesh-orb hero-presentation__mesh-orb--three" aria-hidden="true" />
    <div className="container hero-presentation__mesh-content">
      <HeroCopy badge={badge} centered links={links} richText={richText} />
      <HeroPostcards postcards={postcards} />
      {businessPanel ? <div className="hero-presentation__business-panel">{businessPanel}</div> : null}
    </div>
  </div>
)

export const PlannerSplitHero: React.FC<HeroPresentationProps> = ({
  badge,
  behavior: _behavior,
  businessPanel,
  links,
  media,
  postcards,
  preset,
  richText,
}) => (
  <div
    className="container hero-presentation hero-presentation--planner-split"
    data-content-align={preset?.visual?.contentAlign || 'left'}
    data-media-fit={preset?.visual?.mediaFit || 'cover'}
  >
    <HeroCopy badge={badge} links={links} richText={richText} />
    <div className="hero-presentation__planner-visual">
      <HeroVisual media={media} priority />
      <HeroPostcards postcards={postcards} />
    </div>
    {businessPanel ? <div className="hero-presentation__business-panel">{businessPanel}</div> : null}
  </div>
)

const getSlideMedia = (slide: HeroSlide, mobile = false) => {
  const resource = mobile ? slide.mobileMedia || slide.media : slide.media

  return resource && typeof resource === 'object' ? resource : null
}

export const CinematicCarouselHero: React.FC<HeroPresentationProps> = ({
  badge,
  behavior,
  links,
  preset,
  richText,
  slides,
}) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [documentVisible, setDocumentVisible] = useState(true)
  const rootRef = useRef<HTMLDivElement>(null)
  const safeSlides = (slides || []).filter((slide) => getSlideMedia(slide))
  const canAutoplay =
    behavior.autoplay && !paused && isVisible && documentVisible && safeSlides.length > 1

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches) setPaused(true)

    const onMotionChange = (event: MediaQueryListEvent) => {
      if (event.matches) setPaused(true)
    }
    mediaQuery.addEventListener?.('change', onMotionChange)
    return () => mediaQuery.removeEventListener?.('change', onMotionChange)
  }, [])

  useEffect(() => {
    const onVisibilityChange = () => setDocumentVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  useEffect(() => {
    if (!rootRef.current || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      threshold: 0.2,
    })
    observer.observe(rootRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!canAutoplay) return
    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        if (!behavior.loop && current >= safeSlides.length - 1) return current
        return (current + 1) % safeSlides.length
      })
    }, behavior.intervalMs)

    return () => window.clearInterval(timer)
  }, [behavior.intervalMs, behavior.loop, canAutoplay, safeSlides.length])

  const goTo = (index: number) => {
    if (safeSlides.length === 0) return
    setActiveIndex((index + safeSlides.length) % safeSlides.length)
  }

  if (safeSlides.length === 0) {
    return (
      <div className="container hero-presentation hero-presentation--carousel hero-presentation--empty">
        <HeroCopy badge={badge} links={links} richText={richText} />
      </div>
    )
  }

  return (
    <div
      aria-roledescription="carousel"
      className="hero-presentation hero-presentation--carousel"
      data-transition={behavior.transition}
      onMouseEnter={() => behavior.pauseOnHover && setPaused(true)}
      onMouseLeave={() => behavior.pauseOnHover && setPaused(false)}
      ref={rootRef}
      role="region"
      style={{ '--hero-transition-ms': `${behavior.transitionMs}ms` } as React.CSSProperties}
    >
      <div className="hero-presentation__carousel-stage">
        {safeSlides.map((slide, index) => {
          const desktopMedia = getSlideMedia(slide)
          const mobileMedia = getSlideMedia(slide, true)
          const isActive = index === activeIndex

          return (
            <article
              aria-hidden={!isActive}
              aria-label={`Slide ${index + 1} of ${safeSlides.length}`}
              className="hero-presentation__slide"
              data-active={isActive}
              key={slide.id || `${slide.title}-${index}`}
            >
              <div className="hero-presentation__slide-media hero-presentation__slide-media--desktop">
                {desktopMedia ? (
                  <Media
                    fill
                    imgClassName="object-cover"
                    priority={index === 0}
                    resource={desktopMedia}
                  />
                ) : null}
              </div>
              <div className="hero-presentation__slide-media hero-presentation__slide-media--mobile">
                {mobileMedia ? (
                  <Media
                    fill
                    imgClassName="object-cover"
                    priority={index === 0}
                    resource={mobileMedia}
                  />
                ) : null}
              </div>
              <div
                className="hero-presentation__carousel-overlay"
                data-strength={preset?.visual?.overlayStrength || 'soft'}
              />
              <div className="container hero-presentation__slide-content">
                {slide.eyebrow ? <p className="site-mini-label">{slide.eyebrow}</p> : null}
                {slide.title ? <h2>{slide.title}</h2> : null}
                {slide.description ? <p>{slide.description}</p> : null}
                {slide.links?.[0]?.link ? <CMSLink {...slide.links[0].link} /> : null}
                {!slide.title && index === 0 ? (
                  <HeroCopy badge={badge} links={links} richText={richText} />
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
      <div className="container hero-presentation__carousel-controls">
        {behavior.showArrows ? (
          <div>
            <button aria-label="Previous slide" onClick={() => goTo(activeIndex - 1)} type="button">
              <ChevronLeftIcon aria-hidden="true" />
            </button>
            <button aria-label="Next slide" onClick={() => goTo(activeIndex + 1)} type="button">
              <ChevronRightIcon aria-hidden="true" />
            </button>
          </div>
        ) : null}
        {behavior.showDots ? (
          <div aria-label="Choose slide" className="hero-presentation__carousel-dots" role="group">
            {safeSlides.map((slide, index) => (
              <button
                aria-label={`Go to slide ${index + 1}`}
                aria-pressed={index === activeIndex}
                key={slide.id || index}
                onClick={() => goTo(index)}
                type="button"
              />
            ))}
          </div>
        ) : null}
        {behavior.autoplay ? (
          <button
            aria-label={paused ? 'Play carousel' : 'Pause carousel'}
            onClick={() => setPaused((current) => !current)}
            type="button"
          >
            {paused ? <PlayIcon aria-hidden="true" /> : <PauseIcon aria-hidden="true" />}
          </button>
        ) : null}
      </div>
    </div>
  )
}

const asMedia = (value: HeroPresentationProps['media']) =>
  value && typeof value === 'object' ? value : null

export const VideoBackgroundHero: React.FC<HeroPresentationProps> = ({
  badge,
  behavior: _behavior,
  links,
  preset,
  richText,
  video,
}) => {
  const desktopVideo = asMedia(video?.desktopVideo)
  const mobileVideo = asMedia(video?.mobileVideo) || desktopVideo
  const poster = asMedia(video?.poster)
  const [failed, setFailed] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mediaQuery.matches)
    const onChange = (event: MediaQueryListEvent) => setReduceMotion(event.matches)
    mediaQuery.addEventListener?.('change', onChange)
    return () => mediaQuery.removeEventListener?.('change', onChange)
  }, [])

  const posterURL = poster?.url ? getMediaUrl(poster.url, poster.updatedAt) : undefined
  const desktopURL = desktopVideo?.url
    ? getMediaUrl(desktopVideo.url, desktopVideo.updatedAt)
    : undefined
  const mobileURL = mobileVideo?.url
    ? getMediaUrl(mobileVideo.url, mobileVideo.updatedAt)
    : desktopURL
  const showVideo = Boolean(desktopURL && !failed && !reduceMotion)

  return (
    <div className="hero-presentation hero-presentation--video">
      {poster ? (
        <div className="hero-presentation__video-poster">
          <Media fill imgClassName="object-cover" priority resource={poster} />
        </div>
      ) : null}
      {showVideo ? (
        <video
          aria-hidden="true"
          autoPlay
          className="hero-presentation__video-media hero-presentation__video-media--desktop"
          loop
          muted
          onError={() => setFailed(true)}
          playsInline
          poster={posterURL}
        >
          <source src={desktopURL} type={desktopVideo?.mimeType || undefined} />
        </video>
      ) : null}
      {showVideo ? (
        <video
          aria-hidden="true"
          autoPlay
          className="hero-presentation__video-media hero-presentation__video-media--mobile"
          loop
          muted
          onError={() => setFailed(true)}
          playsInline
          poster={posterURL}
        >
          <source src={mobileURL} type={mobileVideo?.mimeType || undefined} />
        </video>
      ) : null}
      <div
        className="hero-presentation__carousel-overlay"
        data-strength={preset?.visual?.overlayStrength || 'strong'}
      />
      <div className="container hero-presentation__video-content">
        <HeroCopy badge={badge} links={links} richText={richText} />
      </div>
    </div>
  )
}

export const heroPresentationComponents: Record<
  HeroPresentationKey,
  React.FC<HeroPresentationProps>
> = {
  'centered-visual': CenteredVisualHero,
  'cinematic-carousel': CinematicCarouselHero,
  'gradient-mesh': GradientMeshHero,
  'layered-visuals': LayeredVisualsHero,
  'planner-split': PlannerSplitHero,
  'split-visual': SplitVisualHero,
  'video-background': VideoBackgroundHero,
}
