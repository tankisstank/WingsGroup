import type { Media as MediaDocument } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import React, { useEffect, useRef, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon, SparklesIcon } from 'lucide-react'

import type { HeroPresentationKey, HeroPresentationProps, HeroSlide } from './types'
import { getWingsSideHiFiCopy } from '@/components/WingsSideHiFi/copy'
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

const HeroPostcards: React.FC<Pick<HeroPresentationProps, 'postcards'>> = ({ postcards }) =>
  postcards.length > 0 ? (
    <div className="hero-presentation__postcards">
      {postcards.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  ) : null

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
    {businessPanel ? (
      <div className="hero-presentation__business-panel">{businessPanel}</div>
    ) : null}
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
      {businessPanel ? (
        <div className="hero-presentation__business-panel">{businessPanel}</div>
      ) : null}
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
    <div
      className="hero-presentation__mesh-orb hero-presentation__mesh-orb--one"
      aria-hidden="true"
    />
    <div
      className="hero-presentation__mesh-orb hero-presentation__mesh-orb--two"
      aria-hidden="true"
    />
    <div
      className="hero-presentation__mesh-orb hero-presentation__mesh-orb--three"
      aria-hidden="true"
    />
    <div className="container hero-presentation__mesh-content">
      <HeroCopy badge={badge} centered links={links} richText={richText} />
      <HeroPostcards postcards={postcards} />
      {businessPanel ? (
        <div className="hero-presentation__business-panel">{businessPanel}</div>
      ) : null}
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
    <div className="hero-presentation__planner-stage">
      <div className="hero-presentation__planner-visual">
        <HeroVisual media={media} priority />
        <HeroPostcards postcards={postcards} />
      </div>
      {businessPanel ? (
        <div className="hero-presentation__business-panel">{businessPanel}</div>
      ) : null}
    </div>
  </div>
)

const getSlideMedia = (slide: HeroSlide, mobile = false) => {
  const resource = mobile ? slide.mobileMedia || slide.media : slide.media

  return resource && typeof resource === 'object' ? resource : null
}

export const CinematicCarouselHero: React.FC<HeroPresentationProps> = ({
  badge,
  behavior,
  businessPanel,
  links,
  preset,
  resolvedLocale,
  richText,
  slides,
}) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const [clientReady, setClientReady] = useState(false)
  const [paused, setPaused] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [documentVisible, setDocumentVisible] = useState(true)
  const rootRef = useRef<HTMLDivElement>(null)
  const safeSlides = (slides || []).filter((slide) => getSlideMedia(slide))
  const canAutoplay =
    behavior.autoplay && !paused && isVisible && documentVisible && safeSlides.length > 1
  const semanticHeading = safeSlides[0]?.title || null
  // Restrict to explicit WingSide inbound cinematic preset only (no cross-site overlay trigger).
  const isHiFiEditorialSplit =
    preset?.key === 'wingsside-inbound-cinematic-search' ||
    Boolean(preset?.key?.includes('wingsside') && preset?.key?.includes('cinematic'))

  useEffect(() => setClientReady(true), [])

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
    setPaused(true)
    setActiveIndex((index + safeSlides.length) % safeSlides.length)
  }

  if (safeSlides.length === 0) {
    return (
      <div className="container hero-presentation hero-presentation--carousel hero-presentation--empty">
        <HeroCopy badge={badge} links={links} richText={richText} />
      </div>
    )
  }

  const activeSlide = safeSlides[activeIndex]
  const carouselControls = (
    <div
      className={
        isHiFiEditorialSplit
          ? 'hero-presentation__carousel-controls hero-presentation__carousel-controls--hifi'
          : 'container hero-presentation__carousel-controls'
      }
    >
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
  )

  return (
    <div
      aria-roledescription="carousel"
      className={
        isHiFiEditorialSplit
          ? 'container hero-presentation hero-presentation--carousel hero-presentation--carousel-hifi-split'
          : 'hero-presentation hero-presentation--carousel'
      }
      data-business-panel={businessPanel ? 'true' : 'false'}
      data-active-index={activeIndex}
      data-client-ready={clientReady ? 'true' : 'false'}
      data-hifi-split={isHiFiEditorialSplit ? 'true' : 'false'}
      data-transition={behavior.transition}
      onMouseEnter={() => behavior.pauseOnHover && setPaused(true)}
      onMouseLeave={() => behavior.pauseOnHover && setPaused(false)}
      ref={rootRef}
      role="region"
      style={
        {
          '--hero-ken-burns-ms': `${behavior.intervalMs}ms`,
          '--hero-transition-ms': `${behavior.transitionMs}ms`,
        } as React.CSSProperties
      }
    >
      {/* Non-hifi keeps a screen-reader-only h1; hi-fi split uses the visible title as the real h1. */}
      {!isHiFiEditorialSplit && semanticHeading ? (
        <h1 className="sr-only">{semanticHeading}</h1>
      ) : null}

      {isHiFiEditorialSplit ? (
        <div className="hero-presentation__hifi-copy">
          {activeSlide?.eyebrow ? <p className="site-mini-label">{activeSlide.eyebrow}</p> : null}
          {activeSlide?.title ? (
            <h1 className="hero-presentation__hifi-title">{activeSlide.title}</h1>
          ) : semanticHeading ? (
            <h1 className="sr-only">{semanticHeading}</h1>
          ) : null}
          {activeSlide?.description ? (
            <p className="hero-presentation__hifi-lede">{activeSlide.description}</p>
          ) : null}
          {(() => {
            const homeCopy = getWingsSideHiFiCopy(resolvedLocale).home
            const slideLinks = Array.isArray(activeSlide?.links) ? activeSlide.links : []
            const heroLinks = Array.isArray(links) ? links : []
            const combined =
              slideLinks.length > 0 ? slideLinks : heroLinks.length > 0 ? heroLinks : []
            const exploreLabel = homeCopy.exploreDestinations
            const planLabel = homeCopy.planTripCta
            // Hi-fi dual CTA: primary scrolls to denser planner; secondary explores destinations.
            const dual = [
              {
                link: {
                  appearance: 'default' as const,
                  label:
                    (combined[0]?.link && 'label' in combined[0].link && combined[0].link.label) ||
                    planLabel,
                  type: 'custom' as const,
                  url: '#home-planner',
                },
              },
              {
                link: {
                  appearance: 'outline' as const,
                  label:
                    (combined[1]?.link && 'label' in combined[1].link && combined[1].link.label) ||
                    exploreLabel,
                  type: 'custom' as const,
                  url: '/destinations',
                },
              },
            ]
            return (
              <ul className="site-hero__actions">
                {dual.map(({ link }, index) => (
                  <li key={index}>
                    <CMSLink {...link} />
                  </li>
                ))}
              </ul>
            )
          })()}
          {!activeSlide?.title &&
          !(Array.isArray(activeSlide?.links) && activeSlide.links.length) &&
          !(Array.isArray(links) && links.length) ? (
            <HeroCopy badge={badge} links={links} richText={richText} />
          ) : null}
        </div>
      ) : null}

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
              <div
                className="hero-presentation__slide-media hero-presentation__slide-media--desktop"
                data-ken-burns={isActive && !paused ? 'active' : 'idle'}
              >
                {desktopMedia ? (
                  <Media
                    fill
                    imgClassName="object-cover"
                    priority={index === 0}
                    resource={desktopMedia}
                  />
                ) : null}
              </div>
              <div
                className="hero-presentation__slide-media hero-presentation__slide-media--mobile"
                data-ken-burns={isActive && !paused ? 'active' : 'idle'}
              >
                {mobileMedia ? (
                  <Media
                    fill
                    imgClassName="object-cover"
                    priority={index === 0}
                    resource={mobileMedia}
                  />
                ) : null}
              </div>
              {!isHiFiEditorialSplit ? (
                <>
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
                </>
              ) : slide.title ? (
                <div className="hero-presentation__media-cap" aria-hidden={!isActive}>
                  <span>{slide.title}</span>
                </div>
              ) : null}
            </article>
          )
        })}
        {isHiFiEditorialSplit ? carouselControls : null}
      </div>

      {businessPanel ? (
        <div
          className={
            isHiFiEditorialSplit
              ? 'hero-presentation__carousel-business-panel hero-presentation__carousel-business-panel--hifi'
              : 'container hero-presentation__carousel-business-panel'
          }
        >
          {businessPanel}
        </div>
      ) : null}

      {!isHiFiEditorialSplit ? carouselControls : null}
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

export const VerticalVideoSplitHero: React.FC<HeroPresentationProps> = ({
  badge,
  businessPanel,
  links,
  media,
  postcards,
  richText,
}) => {
  const mediaDoc = typeof media === 'object' && media !== null ? (media as MediaDocument) : null
  const isVideo = Boolean(
    mediaDoc?.mimeType?.includes('video') || mediaDoc?.filename?.endsWith('.mp4'),
  )
  const videoSrc = mediaDoc ? getMediaUrl(mediaDoc.url || `/media/${mediaDoc.filename}`) : null

  return (
    <div
      className="container hero-presentation hero-presentation--split"
      data-hero-option="vertical-video-split"
    >
      <HeroCopy badge={badge} links={links} richText={richText} />
      <div className="hero-presentation__frame flex flex-col items-center justify-center">
        <div className="relative mx-auto aspect-[4/5] w-full max-w-[380px] overflow-hidden rounded-[32px] border border-white/60 bg-slate-950 shadow-[0_24px_64px_rgba(0,0,0,0.18)] dark:border-white/10 md:max-w-[420px]">
          {isVideo && videoSrc ? (
            <video
              autoPlay
              className="h-full w-full object-cover"
              controls={false}
              loop
              muted
              playsInline
            >
              <source src={videoSrc} type="video/mp4" />
            </video>
          ) : (
            <Media fill imgClassName="object-cover" priority resource={media} />
          )}

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
          />

          {postcards.length > 0 ? (
            <div className="absolute inset-x-0 bottom-3.5 z-10 flex flex-wrap justify-center gap-1.5 px-3">
              {postcards.map((label) => (
                <span
                  className="inline-flex items-center rounded-full border border-white/25 bg-black/45 px-3 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-md"
                  key={label}
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {businessPanel ? (
        <div className="hero-presentation__business-panel">{businessPanel}</div>
      ) : null}
    </div>
  )
}

export const DeviceMockupSplitHero: React.FC<HeroPresentationProps> = ({
  badge,
  businessPanel,
  links,
  media,
  postcards,
  richText,
}) => {
  const mediaDoc = typeof media === 'object' && media !== null ? (media as MediaDocument) : null
  const isVideo = Boolean(
    mediaDoc?.mimeType?.includes('video') || mediaDoc?.filename?.endsWith('.mp4'),
  )
  const videoSrc = mediaDoc ? getMediaUrl(mediaDoc.url || `/media/${mediaDoc.filename}`) : null

  return (
    <div
      className="container hero-presentation hero-presentation--split"
      data-hero-option="device-mockup-split"
    >
      <HeroCopy badge={badge} links={links} richText={richText} />
      <div className="hero-presentation__frame flex flex-col items-center justify-center overflow-visible !border-0 !bg-transparent !p-0 !shadow-none">
        <div className="relative mx-auto aspect-[9/18.5] w-[290px] rounded-[52px] border-[6px] border-slate-700/80 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 p-2.5 shadow-[0_30px_70px_-10px_rgba(15,23,42,0.45),0_12px_28px_-6px_rgba(15,23,42,0.25)] sm:w-[320px] md:w-[340px]">
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-3.5 z-20 flex h-4 w-24 -translate-x-1/2 items-center justify-center rounded-full bg-black/95 shadow-inner"
          >
            <div className="ml-auto mr-3 h-2 w-2 rounded-full border border-slate-700/60 bg-slate-900" />
          </div>

          <div className="relative h-full w-full overflow-hidden rounded-[40px] bg-black">
            {isVideo && videoSrc ? (
              <video
                autoPlay
                className="h-full w-full object-cover"
                controls={false}
                loop
                muted
                playsInline
              >
                <source src={videoSrc} type="video/mp4" />
              </video>
            ) : (
              <Media fill imgClassName="object-cover" priority resource={media} />
            )}

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/25 to-transparent"
            />

            {postcards.length > 0 ? (
              <div className="absolute inset-x-0 bottom-3 z-10 flex flex-wrap justify-center gap-1 px-2">
                {postcards.map((label) => (
                  <span
                    className="inline-flex items-center rounded-full border border-white/20 bg-black/50 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md"
                    key={label}
                  >
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {businessPanel ? (
        <div className="hero-presentation__business-panel">{businessPanel}</div>
      ) : null}
    </div>
  )
}

export const AmbientVideoSplitHero: React.FC<HeroPresentationProps> = ({
  badge,
  businessPanel,
  links,
  media,
  postcards,
  richText,
}) => {
  const mediaDoc = typeof media === 'object' && media !== null ? (media as MediaDocument) : null
  const isVideo = Boolean(
    mediaDoc?.mimeType?.includes('video') || mediaDoc?.filename?.endsWith('.mp4'),
  )
  const videoSrc = mediaDoc ? getMediaUrl(mediaDoc.url || `/media/${mediaDoc.filename}`) : null

  return (
    <div
      className="container hero-presentation hero-presentation--split"
      data-hero-option="ambient-video-split"
    >
      <HeroCopy badge={badge} links={links} richText={richText} />
      <div className="hero-presentation__frame">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[28px] border border-border/70 bg-slate-950 shadow-xl">
          {isVideo && videoSrc ? (
            <video
              aria-hidden="true"
              autoPlay
              className="absolute inset-0 h-full w-full scale-125 object-cover opacity-50 blur-2xl filter"
              controls={false}
              loop
              muted
              playsInline
            >
              <source src={videoSrc} type="video/mp4" />
            </video>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--site-brand)]/20 via-slate-900 to-black" />
          )}

          <div className="relative z-10 flex h-full w-full items-center justify-center p-2">
            {isVideo && videoSrc ? (
              <video
                autoPlay
                className="h-full max-h-full rounded-[18px] object-contain shadow-2xl"
                controls={false}
                loop
                muted
                playsInline
              >
                <source src={videoSrc} type="video/mp4" />
              </video>
            ) : (
              <Media fill imgClassName="object-contain" priority resource={media} />
            )}
          </div>

          {postcards.length > 0 ? (
            <div className="absolute inset-x-0 bottom-2.5 z-20 flex flex-wrap justify-center gap-1.5 px-3">
              {postcards.map((label) => (
                <span
                  className="inline-flex items-center rounded-full border border-white/20 bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md"
                  key={label}
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {businessPanel ? (
        <div className="hero-presentation__business-panel">{businessPanel}</div>
      ) : null}
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
  'vertical-video-split': VerticalVideoSplitHero,
  'device-mockup-split': DeviceMockupSplitHero,
  'ambient-video-split': AmbientVideoSplitHero,
}
