'use client'

import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import type { Page } from '@/payload-types'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import { resolveHeroPresentationConfig } from '@/heros/presentations/resolver'
import type { SiteHeroDefaultsLike } from '@/heros/presentations/types'
import type { SupportedLocaleCode } from '@/utilities/locales'

import {
  areAllHeroMediaRenderable,
  areAllHeroMediaGoverned,
  isWingsGroupPublishedMedia,
  isWingsGroupRenderableMedia,
  resolveSafeHeroLinks,
} from './model'
import styles from './WingsGroupV3.module.css'
import { useReducedMotion } from './useReducedMotion'

type Props = Page['hero'] & {
  allowWingsGroupDevelopmentMedia?: boolean
  resolvedLocale?: SupportedLocaleCode
  siteHeroDefaults?: SiteHeroDefaultsLike | null
}

const copyByLocale = {
  en: {
    mediaFallback: 'WingsGroup image pending governed publication.',
    next: 'Next hero story',
    pause: 'Pause hero carousel',
    play: 'Play hero carousel',
    previous: 'Previous hero story',
    slide: (index: number, total: number) => `Hero story ${index} of ${total}`,
    title: 'Travel services, connected with care',
  },
  vi: {
    mediaFallback: 'Hình ảnh WingsGroup đang chờ trạng thái xuất bản được kiểm soát.',
    next: 'Nội dung hero tiếp theo',
    pause: 'Dừng carousel hero',
    play: 'Tiếp tục carousel hero',
    previous: 'Nội dung hero trước',
    slide: (index: number, total: number) => `Nội dung hero ${index} trên ${total}`,
    title: 'Dịch vụ hành trình, kết nối bằng sự tận tâm',
  },
} as const

export const WingsGroupEditorialHero = (props: Props) => {
  const {
    allowWingsGroupDevelopmentMedia = false,
    links,
    media,
    resolvedLocale,
    richText,
    siteHeroDefaults,
    slides,
  } = props
  const copy = resolvedLocale === 'en' ? copyByLocale.en : copyByLocale.vi
  const resolved = resolveHeroPresentationConfig({ hero: props, siteDefaults: siteHeroDefaults })
  const reducedMotion = useReducedMotion()
  const { setHeaderTheme } = useHeaderTheme()
  const [activeIndex, setActiveIndex] = useState(0)
  const [interactionPaused, setInteractionPaused] = useState(false)
  const [manualPaused, setManualPaused] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  const safeLinks = resolveSafeHeroLinks(links, resolvedLocale)
  const allHeroMediaRenderable = allowWingsGroupDevelopmentMedia
    ? areAllHeroMediaRenderable(props)
    : areAllHeroMediaGoverned(props)
  const isRenderableMedia = allowWingsGroupDevelopmentMedia
    ? isWingsGroupRenderableMedia
    : isWingsGroupPublishedMedia

  const pauseForInteraction = () => {
    setInteractionPaused(true)
    setManualPaused(true)
  }

  const heroStories = useMemo(() => {
    if (slides?.length) {
      return slides.map((slide, index) => ({
        description: slide.description,
        eyebrow: slide.eyebrow,
        id: slide.id || `slide-${index}`,
        media: allHeroMediaRenderable && isRenderableMedia(slide.media) ? slide.media : null,
        title: slide.title,
      }))
    }

    return [
      {
        description: null,
        eyebrow: null,
        id: 'primary',
        media: allHeroMediaRenderable && isRenderableMedia(media) ? media : null,
        title: null,
      },
    ]
  }, [allHeroMediaRenderable, isRenderableMedia, media, slides])

  const activeStory = heroStories[activeIndex] || heroStories[0]
  const autoplay =
    resolved.behavior.autoplay &&
    !reducedMotion &&
    !manualPaused &&
    !interactionPaused &&
    pageVisible &&
    heroStories.length > 1

  useEffect(() => {
    setHeaderTheme('light')
  }, [setHeaderTheme])

  useEffect(() => {
    const syncVisibility = () => setPageVisible(document.visibilityState === 'visible')
    syncVisibility()
    document.addEventListener('visibilitychange', syncVisibility)
    return () => document.removeEventListener('visibilitychange', syncVisibility)
  }, [])

  useEffect(() => {
    if (!autoplay) return

    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        const next = current + 1
        if (next < heroStories.length) return next
        return resolved.behavior.loop ? 0 : current
      })
    }, resolved.behavior.intervalMs)

    return () => window.clearInterval(timer)
  }, [autoplay, heroStories.length, resolved.behavior.intervalMs, resolved.behavior.loop])

  const selectStory = (nextIndex: number) => {
    setActiveIndex(nextIndex)
    setManualPaused(true)
  }

  const previous = () => selectStory((activeIndex - 1 + heroStories.length) % heroStories.length)
  const next = () => selectStory((activeIndex + 1) % heroStories.length)

  return (
    <section
      aria-label={resolvedLocale === 'en' ? 'WingsGroup introduction' : 'Giới thiệu WingsGroup'}
      className={styles.hero}
      data-hero-source={resolved.source}
      data-od-id="hero"
      data-testid="wingsgroup-editorial-hero"
      data-wingsgroup-v3-hero="true"
      id="home"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setInteractionPaused(false)
      }}
      onFocus={pauseForInteraction}
      onMouseEnter={() => {
        if (resolved.behavior.pauseOnHover) pauseForInteraction()
      }}
      onMouseLeave={() => setInteractionPaused(false)}
    >
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          {activeStory?.eyebrow ? <p className={styles.eyebrow}>{activeStory.eyebrow}</p> : null}
          {richText ? (
            <RichText data={richText} enableGutter={false} enableProse={false} />
          ) : (
            <h1 className={styles.heroFallbackTitle}>{activeStory?.title || copy.title}</h1>
          )}
          <div className={styles.heroActions}>
            <CMSLink {...safeLinks[0]} appearance="inline" className={styles.primaryAction} />
            <a
              className={styles.secondaryAction}
              data-od-id="hero-consultation-trigger"
              data-wingsgroup-consultation-trigger="true"
              href={safeLinks[1].url || '/lien-he#contact-form'}
            >
              {resolvedLocale === 'en' ? 'Request a consultation' : safeLinks[1].label || 'Nhận tư vấn 🎧'}
            </a>
          </div>
        </div>

        <figure
          aria-label={
            resolvedLocale === 'en'
              ? 'WingsGroup service stories'
              : 'Các hình ảnh về dịch vụ WingsGroup'
          }
          className={styles.heroStage}
          data-od-id="hero-carousel"
        >
          {activeStory?.media ? (
            <Media
              className={styles.heroMedia}
              fill
              imgClassName={styles.heroMedia}
              loading="eager"
              priority
              resource={activeStory.media}
              size="(max-width: 850px) 100vw, 55vw"
            />
          ) : (
            <div className={styles.mediaPending} data-media-state="safe-fallback">
              <strong>{copy.mediaFallback}</strong>
            </div>
          )}

          {activeStory?.title || activeStory?.description ? (
            <div aria-live="polite" className={styles.heroCaption}>
              {richText && activeStory.title ? <strong>{activeStory.title}</strong> : null}
              {activeStory.description ? <span>{activeStory.description}</span> : null}
            </div>
          ) : null}

          {heroStories.length > 1 ? (
            <div className={styles.heroControls}>
              {resolved.behavior.showArrows ? (
                <button
                  aria-label={copy.previous}
                  className={styles.heroControl}
                  onClick={previous}
                  type="button"
                >
                  <ChevronLeftIcon aria-hidden="true" size={19} />
                </button>
              ) : null}

              {resolved.behavior.showDots ? (
                <div className={styles.heroDots}>
                  {heroStories.map((story, index) => (
                    <button
                      aria-label={copy.slide(index + 1, heroStories.length)}
                      className={styles.heroDot}
                      data-active={activeIndex === index ? 'true' : 'false'}
                      key={story.id}
                      onClick={() => selectStory(index)}
                      type="button"
                    />
                  ))}
                </div>
              ) : null}

              {resolved.behavior.autoplay && !reducedMotion ? (
                <button
                  aria-label={manualPaused ? copy.play : copy.pause}
                  className={styles.heroControl}
                  onClick={() => setManualPaused((value) => !value)}
                  type="button"
                >
                  {manualPaused ? (
                    <PlayIcon aria-hidden="true" size={17} />
                  ) : (
                    <PauseIcon aria-hidden="true" size={17} />
                  )}
                </button>
              ) : null}

              {resolved.behavior.showArrows ? (
                <button
                  aria-label={copy.next}
                  className={styles.heroControl}
                  onClick={next}
                  type="button"
                >
                  <ChevronRightIcon aria-hidden="true" size={19} />
                </button>
              ) : null}
            </div>
          ) : null}
        </figure>
      </div>
    </section>
  )
}
