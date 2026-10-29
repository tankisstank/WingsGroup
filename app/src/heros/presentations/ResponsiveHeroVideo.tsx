'use client'

import { Pause, Play } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

import { Media } from '@/components/Media'
import type { Media as MediaDocument } from '@/payload-types'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import type { HeroPresentationProps, HeroVideoConfig } from './types'

export const asMediaDocument = (value: unknown): MediaDocument | null =>
  value && typeof value === 'object' && ('url' in value || 'filename' in value || 'id' in value)
    ? (value as MediaDocument)
    : null

export const isVideoMedia = (media: MediaDocument | null): boolean => {
  if (!media) return false
  const mime = (typeof media.mimeType === 'string' ? media.mimeType : '').toLowerCase()
  const filename = (typeof media.filename === 'string' ? media.filename : '').toLowerCase()
  const url = (typeof media.url === 'string' ? media.url : '').toLowerCase()
  return (
    mime.includes('video') ||
    filename.endsWith('.mp4') ||
    filename.endsWith('.webm') ||
    url.endsWith('.mp4') ||
    url.endsWith('.webm')
  )
}

export interface ResponsiveHeroVideoProps {
  className?: string
  containerClassName?: string
  media?: HeroPresentationProps['media']
  objectFit?: 'cover' | 'contain'
  overlayNode?: React.ReactNode
  resolvedLocale?: string | null
  showControls?: boolean
  size?: string
  video?: HeroVideoConfig | null
  videoClassName?: string
}

export const ResponsiveHeroVideo: React.FC<ResponsiveHeroVideoProps> = ({
  className = '',
  containerClassName = '',
  media,
  objectFit = 'cover',
  overlayNode,
  resolvedLocale,
  showControls = true,
  size,
  video,
  videoClassName = '',
}) => {
  const desktopDoc = asMediaDocument(video?.desktopVideo)
  const mobileDoc = asMediaDocument(video?.mobileVideo)
  const fallbackMediaDoc = asMediaDocument(media)

  // Legacy fallback: if video fields are empty, check media prop
  const resolvedDesktop = desktopDoc || (isVideoMedia(fallbackMediaDoc) ? fallbackMediaDoc : null)
  const resolvedMobile = mobileDoc || resolvedDesktop

  // Poster resolution: video.poster preferred; if missing and media is image, fallback to media
  const posterDoc =
    asMediaDocument(video?.poster) ||
    (!isVideoMedia(fallbackMediaDoc) ? fallbackMediaDoc : null)

  const posterKey = posterDoc
    ? `${posterDoc.id ?? ''}:${posterDoc.url ?? posterDoc.filename ?? ''}:${posterDoc.updatedAt ?? ''}`
    : null

  const [isPolicySettled, setIsPolicySettled] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [saveData, setSaveData] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const [isIntersecting, setIsIntersecting] = useState(false)
  const [settledPosterKey, setSettledPosterKey] = useState<string | null>(posterKey === null ? '__no_poster__' : null)
  const [failedPosterKey, setFailedPosterKey] = useState<string | null>(null)

  // Derived poster error: true only if current posterKey explicitly matches the failed key
  const hasPosterError = Boolean(posterKey && failedPosterKey === posterKey)

  // Derived readiness: only true if there is no poster, OR the settled key matches the current posterKey
  const isPosterReady = posterKey === null || settledPosterKey === posterKey

  const [hasFatalError, setHasFatalError] = useState(false)
  const [hasRenderableFrame, setHasRenderableFrame] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isUserPaused, setIsUserPaused] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const playControllerRef = useRef({ generation: 0, isMounted: true })
  const isUserPausedRef = useRef(false)

  // Top-level unmount cleanup: invalidate any pending manual or autoplay play promises
  useEffect(() => {
    const controller = playControllerRef.current
    controller.isMounted = true
    return () => {
      controller.isMounted = false
      controller.generation++
    }
  }, [])

  // 1. Client policy & viewport inspection (never runs on SSR)
  useEffect(() => {
    if (typeof window === 'undefined') return

    let currentReduceMotion = false
    let currentIsMobile = false
    let currentSaveData = false

    let motionQuery: MediaQueryList | undefined
    let onMotionChange: ((e: MediaQueryListEvent) => void) | undefined
    let mobileQuery: MediaQueryList | undefined
    let onMobileChange: ((e: MediaQueryListEvent) => void) | undefined

    if (typeof window.matchMedia === 'function') {
      motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      currentReduceMotion = motionQuery.matches
      onMotionChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches)
      motionQuery.addEventListener?.('change', onMotionChange)

      mobileQuery = window.matchMedia('(max-width: 768px)')
      currentIsMobile = mobileQuery.matches
      onMobileChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
      mobileQuery.addEventListener?.('change', onMobileChange)
    }

    let conn:
      | {
          saveData?: boolean
          addEventListener?: (type: string, fn: () => void) => void
          removeEventListener?: (type: string, fn: () => void) => void
        }
      | undefined
    let onConnectionChange: (() => void) | undefined

    if ('connection' in navigator) {
      conn = (navigator as unknown as { connection?: typeof conn }).connection
      if (conn) {
        currentSaveData = Boolean(conn.saveData)
        if (conn.addEventListener) {
          onConnectionChange = () => setSaveData(Boolean(conn?.saveData))
          conn.addEventListener('change', onConnectionChange)
        }
      }
    }

    setReduceMotion(currentReduceMotion)
    setIsMobile(currentIsMobile)
    setSaveData(currentSaveData)
    setIsPolicySettled(true)

    return () => {
      if (motionQuery && onMotionChange) {
        motionQuery.removeEventListener?.('change', onMotionChange)
      }
      if (mobileQuery && onMobileChange) {
        mobileQuery.removeEventListener?.('change', onMobileChange)
      }
      if (conn && onConnectionChange && conn.removeEventListener) {
        conn.removeEventListener('change', onConnectionChange)
      }
    }
  }, [])

  // 2. Viewport visibility intersection observer
  useEffect(() => {
    if (typeof window === 'undefined') return
    const el = containerRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsIntersecting(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        const inView = Boolean(entry.isIntersecting)
        setIsIntersecting(inView)

        if (inView) {
          const videoEl = videoRef.current
          if (videoEl && !isUserPausedRef.current) {
            const generation = ++playControllerRef.current.generation
            const playPromise = videoEl.play()
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  if (playControllerRef.current.generation === generation && playControllerRef.current.isMounted) {
                    setIsPlaying(true)
                  }
                })
                .catch(() => {
                  if (playControllerRef.current.generation === generation && playControllerRef.current.isMounted) {
                    setIsPlaying(false)
                  }
                })
            } else {
              setIsPlaying(true)
            }
          }
        } else {
          // Offscreen: invalidate any pending play promises, pause playback, preserve user pause preference
          playControllerRef.current.generation++
          const videoEl = videoRef.current
          if (videoEl) {
            videoEl.pause()
            setIsPlaying(false)
          }
        }
      },
      { rootMargin: '200px 0px' },
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
    }
  }, [])

  // 3. Poster readiness & error listener (verifies poster image decoded/loaded before video source attachment)
  useEffect(() => {
    if (!posterKey) {
      setSettledPosterKey('__no_poster__')
      return
    }

    const currentKey = posterKey
    const img = containerRef.current?.querySelector('img')
    if (img) {
      if (img.complete) {
        if (img.naturalWidth === 0 && img.src) {
          setFailedPosterKey(currentKey)
          setSettledPosterKey(currentKey)
        } else {
          setSettledPosterKey(currentKey)
        }
      } else {
        const handleLoad = () => {
          setSettledPosterKey(currentKey)
        }
        const handleError = () => {
          setFailedPosterKey(currentKey)
          setSettledPosterKey(currentKey)
        }
        img.addEventListener('load', handleLoad, { once: true })
        img.addEventListener('error', handleError, { once: true })
        return () => {
          img.removeEventListener('load', handleLoad)
          img.removeEventListener('error', handleError)
        }
      }
    }
  }, [posterKey])

  // Choose exactly ONE active source per viewport to prevent double-fetching desktop + mobile
  const activeDoc = isMobile ? (resolvedMobile || resolvedDesktop) : (resolvedDesktop || resolvedMobile)
  const activeUrl = activeDoc
    ? getMediaUrl(activeDoc.url || `/media/${activeDoc.filename}`, `${activeDoc.updatedAt || 'legacy'}-ac6-video-v1`)
    : null
  const activeMime =
    activeDoc?.mimeType ||
    (activeDoc?.filename?.endsWith('.webm') ? 'video/webm' : 'video/mp4')

  // Reset errors, frame state, and play generation when active source URL changes
  useEffect(() => {
    playControllerRef.current.generation++
    setHasFatalError(false)
    setHasRenderableFrame(false)
  }, [activeUrl])

  // Attach video source ONLY after:
  // - Client policy settled (not on SSR, motion check completed, SaveData check completed)
  // - Hero element is currently intersecting viewport (never attach or buffer offscreen)
  // - Poster is decoded/ready (no empty box, no premature stream)
  // - Motion is allowed & SaveData is false & no fatal playback error
  const shouldAttachSource = Boolean(
    isPolicySettled &&
    isIntersecting &&
    isPosterReady &&
    activeUrl &&
    !reduceMotion &&
    !saveData &&
    !hasFatalError,
  )

  // Autoplay handler with promise rejection guard & race-condition cancellation
  useEffect(() => {
    let isCancelled = false
    const controller = playControllerRef.current
    const generation = ++controller.generation
    if (!shouldAttachSource || !activeUrl) return

    // If user explicitly paused, preserve user pause preference across source/viewport swaps
    if (isUserPausedRef.current) {
      setIsPlaying(false)
      return
    }

    const videoEl = videoRef.current
    if (videoEl) {
      const playPromise = videoEl.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (!isCancelled && controller.generation === generation && controller.isMounted) {
              setIsPlaying(true)
            }
          })
          .catch(() => {
            // Autoplay rejection (e.g. low-power mode): video is paused, poster remains visible!
            if (!isCancelled && controller.generation === generation && controller.isMounted) {
              setIsPlaying(false)
            }
          })
      } else {
        if (!isCancelled && controller.generation === generation && controller.isMounted) {
          setIsPlaying(true)
        }
      }
    }

    return () => {
      isCancelled = true
      controller.generation++
      if (videoEl && !videoEl.paused) {
        videoEl.pause()
      }
    }
  }, [shouldAttachSource, activeUrl])

  const togglePlayback = () => {
    const videoEl = videoRef.current

    if (isPlaying) {
      isUserPausedRef.current = true
      setIsUserPaused(true)
      if (videoEl) {
        videoEl.pause()
      }
      setIsPlaying(false)
    } else {
      isUserPausedRef.current = false
      setIsUserPaused(false)
      if (videoEl) {
        const generation = ++playControllerRef.current.generation
        const playPromise = videoEl.play()
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              if (playControllerRef.current.generation === generation && playControllerRef.current.isMounted) {
                setIsPlaying(true)
              }
            })
            .catch(() => {
              if (playControllerRef.current.generation === generation && playControllerRef.current.isMounted) {
                setIsPlaying(false)
              }
            })
        } else {
          setIsPlaying(true)
        }
      } else {
        setIsPlaying(true)
      }
    }
  }

  const fitClass = objectFit === 'contain' ? 'object-contain' : 'object-cover'
  const isEn = resolvedLocale === 'en'
  const pauseLabel = isEn ? 'Pause hero video' : 'Tạm dừng video hero'
  const playLabel = isEn ? 'Play hero video' : 'Phát video hero'

  // The poster remains visible until a video frame can render (loadeddata/playing) and is actively playing
  const isPosterCovered = Boolean(hasRenderableFrame && isPlaying && !hasFatalError)

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${containerClassName} ${className}`.trim()}
      data-hero-video-state={shouldAttachSource ? (isPlaying ? 'playing' : 'paused') : 'poster-only'}
      ref={containerRef}
    >
      {/* 1. Responsive poster layer: visible until video frame renders & is actively playing */}
      {posterDoc && !hasPosterError ? (
        <div
          aria-hidden={isPosterCovered}
          className={`absolute inset-0 z-0 transition-opacity duration-500 ${
            isPosterCovered ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <Media
            fill
            imgClassName={fitClass}
            onError={() => {
              if (posterKey) {
                setFailedPosterKey(posterKey)
                setSettledPosterKey(posterKey)
              }
            }}
            onLoad={() => {
              if (posterKey) {
                setSettledPosterKey(posterKey)
              }
            }}
            pictureClassName="absolute inset-0"
            priority
            resource={posterDoc}
            size={size}
          />
        </div>
      ) : null}

      {/* Branded placeholder gradient when poster is missing or errored and video is not actively covering */}
      {(!posterDoc || hasPosterError) && !isPosterCovered ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-gradient-to-br from-[var(--site-brand,#0284c7)]/20 via-slate-900 to-black"
          data-hero-placeholder="branded-gradient"
        />
      ) : null}

      {/* 2. Responsive single-source video layer:
          - Gated by client policy, viewport visibility, and poster readiness (no SSR video/source tag emission)
          - Omit redundant native poster attribute to eliminate duplicate 1.87MB original fetch
          - Keyed by activeUrl to guarantee fresh lifecycle on source change
          - autoPlay omitted if user explicitly paused
      */}
      {shouldAttachSource ? (
        <video
          aria-hidden="true"
          autoPlay={!isUserPaused}
          className={`relative z-10 h-full w-full ${fitClass} ${videoClassName}`}
          key={activeUrl}
          loop
          muted
          onError={() => {
            setHasFatalError(true)
            setHasRenderableFrame(false)
          }}
          onLoadedData={() => setHasRenderableFrame(true)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onPlaying={() => setHasRenderableFrame(true)}
          playsInline
          ref={videoRef}
        >
          <source
            onError={() => {
              setHasFatalError(true)
              setHasRenderableFrame(false)
            }}
            src={activeUrl!}
            type={activeMime}
          />
        </video>
      ) : null}

      {/* Optional overlay (e.g. gradient or tint) */}
      {overlayNode}

      {/* 3. Accessible Pause / Play Toggle (outside aria-hidden) */}
      {shouldAttachSource && showControls ? (
        <button
          aria-label={isPlaying ? pauseLabel : playLabel}
          className="pointer-events-auto absolute bottom-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/60 text-white shadow-md backdrop-blur-md transition-colors hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          onClick={togglePlayback}
          type="button"
        >
          {isPlaying ? <Pause aria-hidden="true" size={16} /> : <Play aria-hidden="true" size={16} />}
          <span className="sr-only">{isPlaying ? pauseLabel : playLabel}</span>
        </button>
      ) : null}
    </div>
  )
}
