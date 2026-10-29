import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AmbientVideoSplitHero,
  DeviceMockupSplitHero,
  VerticalVideoSplitHero,
  VideoBackgroundHero,
} from '@/heros/presentations'
import { defaultHeroBehavior } from '@/heros/presentations/registry'
import { ResponsiveHeroVideo } from '@/heros/presentations/ResponsiveHeroVideo'

class ControlledIntersectionObserver {
  static instances: ControlledIntersectionObserver[] = []
  callback: IntersectionObserverCallback
  target?: Element

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    ControlledIntersectionObserver.instances.push(this)
  }

  observe(target: Element) {
    this.target = target
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }

  trigger(isIntersecting: boolean) {
    if (this.target) {
      this.callback(
        [{ isIntersecting, target: this.target } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      )
    }
  }

  disconnect() {}
  unobserve() {}
  takeRecords() {
    return []
  }
}

vi.mock('@/components/Media', () => ({
  Media: ({
    onError,
    onLoad,
    resource,
    size,
  }: {
    onError?: () => void
    onLoad?: () => void
    resource?: { alt?: string; filename?: string; url?: string }
    size?: string
  }) => {
    React.useEffect(() => {
      if (resource?.filename?.includes('delayed')) {
        return
      }
      if (resource?.filename?.includes('404') || resource?.filename?.includes('broken')) {
        onError?.()
      } else {
        onLoad?.()
      }
    }, [onError, onLoad, resource])
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={resource?.alt || 'hero visual'}
        data-size={size}
        onError={onError}
        onLoad={onLoad}
        src={resource?.url || '/media/test.jpg'}
      />
    )
  },
}))

vi.mock('@/components/RichText', () => ({
  default: () => <h1>Hero heading</h1>,
}))

vi.mock('@/components/Link', () => ({
  CMSLink: ({ label, url }: { label?: string; url?: string }) => <a href={url}>{label}</a>,
}))

const mockMedia = (id: number, alt: string, filename?: string) =>
  ({
    alt,
    id,
    filename: filename || `${id}.jpg`,
    updatedAt: '2026-10-24T00:00:00.000Z',
    url: `/media/${filename || `${id}.jpg`}`,
  }) as never

describe('Responsive Hero Video Presentations (AC6 WP1)', () => {
  let originalMatchMedia: typeof window.matchMedia
  let originalNavigatorConnection: unknown
  let originalIntersectionObserver: typeof window.IntersectionObserver

  beforeEach(() => {
    originalMatchMedia = window.matchMedia
    originalNavigatorConnection = (navigator as { connection?: unknown }).connection
    originalIntersectionObserver = window.IntersectionObserver
    ControlledIntersectionObserver.instances = []
    window.IntersectionObserver = ControlledIntersectionObserver as unknown as typeof IntersectionObserver
  })

  afterEach(() => {
    cleanup()
    window.matchMedia = originalMatchMedia
    window.IntersectionObserver = originalIntersectionObserver
    if (originalNavigatorConnection !== undefined) {
      Object.defineProperty(navigator, 'connection', {
        configurable: true,
        value: originalNavigatorConnection,
      })
    } else {
      delete (navigator as { connection?: unknown }).connection
    }
  })

  it('does not emit video or source in SSR HTML, rendering responsive poster only', () => {
    const html = renderToString(
      <ResponsiveHeroVideo
        video={{
          desktopVideo: {
            id: 101,
            filename: 'desktop.mp4',
            mimeType: 'video/mp4',
            url: '/media/desktop.mp4',
          } as never,
          poster: mockMedia(102, 'SSR Poster', 'poster.jpg'),
        }}
      />,
    )

    expect(html).toContain('data-hero-video-state="poster-only"')
    expect(html).not.toContain('<video')
    expect(html).not.toContain('<source')
    expect(html).toContain('alt="SSR Poster"')
  })

  it('renders DeviceMockupSplitHero reusing video fields with single active source', () => {
    render(
      <DeviceMockupSplitHero
        badge="WingsGo App"
        behavior={defaultHeroBehavior}
        postcards={['Verified', 'Instant']}
        video={{
          desktopVideo: {
            id: 101,
            filename: 'app-desktop.mp4',
            mimeType: 'video/mp4',
            updatedAt: '2026-10-24T00:00:00.000Z',
            url: '/media/app-desktop.mp4',
          } as never,
          mobileVideo: {
            id: 102,
            filename: 'app-mobile.mp4',
            mimeType: 'video/mp4',
            updatedAt: '2026-10-24T00:00:00.000Z',
            url: '/media/app-mobile.mp4',
          } as never,
          poster: mockMedia(103, 'Mockup Poster', 'app-poster.jpg'),
        }}
      />,
    )

    // Poster is present as baseline
    expect(screen.getByAltText('Mockup Poster')).toBeTruthy()

    // Exactly one active video element is rendered (no double fetch)
    const videos = document.querySelectorAll('video')
    expect(videos).toHaveLength(1)

    // Redundant native poster attribute is omitted to avoid duplicate 1.87MB download
    expect(videos[0]?.getAttribute('poster')).toBeNull()

    // Accessible pause/play button is rendered OUTSIDE aria-hidden
    const controlButton = screen.getByRole('button', { name: /tạm dừng video hero|phát video hero/i })
    expect(controlButton).toBeTruthy()
    expect(controlButton.closest('[aria-hidden="true"]')).toBeNull()
  })

  it('does not set redundant native poster attribute on video element, relying on responsive layer', () => {
    render(
      <ResponsiveHeroVideo
        video={{
          desktopVideo: {
            id: 101,
            filename: 'desktop.mp4',
            mimeType: 'video/mp4',
            url: '/media/desktop.mp4',
          } as never,
          poster: mockMedia(102, 'No Duplicate Poster', 'huge-poster.png'),
        }}
      />,
    )

    const video = document.querySelector('video')
    expect(video).toBeTruthy()
    expect(video?.getAttribute('poster')).toBeNull()
  })

  it('renders VerticalVideoSplitHero with legacy media fallback when video prop is empty', () => {
    render(
      <VerticalVideoSplitHero
        badge="Reels"
        behavior={defaultHeroBehavior}
        media={{
          id: 201,
          filename: 'vertical-reel.mp4',
          mimeType: 'video/mp4',
          updatedAt: '2026-10-24T00:00:00.000Z',
          url: '/media/vertical-reel.mp4',
        } as never}
        postcards={['Reels']}
      />,
    )

    const video = document.querySelector('video')
    expect(video).toBeTruthy()
    expect(video?.querySelector('source')?.getAttribute('src')).toContain('/media/vertical-reel.mp4')
  })

  it('renders AmbientVideoSplitHero with video prop and objectFit contain', () => {
    render(
      <AmbientVideoSplitHero
        badge="Atmosphere"
        behavior={defaultHeroBehavior}
        postcards={['Ambient']}
        video={{
          desktopVideo: {
            id: 301,
            filename: 'ambient.mp4',
            mimeType: 'video/mp4',
            updatedAt: '2026-10-24T00:00:00.000Z',
            url: '/media/ambient.mp4',
          } as never,
          poster: mockMedia(302, 'Ambient Poster', 'ambient.jpg'),
        }}
      />,
    )

    expect(screen.getByAltText('Ambient Poster')).toBeTruthy()
    const video = document.querySelector('video')
    expect(video).toBeTruthy()
    expect(video?.classList.contains('object-contain')).toBe(true)
  })

  it('suppresses video element and keeps poster visible when prefers-reduced-motion is active', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    render(
      <VideoBackgroundHero
        badge="Calm Hero"
        behavior={defaultHeroBehavior}
        postcards={[]}
        video={{
          desktopVideo: {
            id: 401,
            filename: 'video.mp4',
            mimeType: 'video/mp4',
            url: '/media/video.mp4',
          } as never,
          poster: mockMedia(402, 'Calm Poster', 'calm.jpg'),
        }}
      />,
    )

    expect(screen.getByAltText('Calm Poster')).toBeTruthy()
    expect(document.querySelector('video')).toBeNull()
    expect(screen.queryByRole('button', { name: /tạm dừng video hero/i })).toBeNull()
  })

  it('suppresses video element and retains poster when SaveData is enabled', () => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true },
    })

    render(
      <ResponsiveHeroVideo
        video={{
          desktopVideo: {
            id: 403,
            filename: 'heavy.mp4',
            mimeType: 'video/mp4',
            url: '/media/heavy.mp4',
          } as never,
          poster: mockMedia(404, 'Data Saver Poster', 'saver.jpg'),
        }}
      />,
    )

    expect(screen.getByAltText('Data Saver Poster')).toBeTruthy()
    expect(document.querySelector('video')).toBeNull()
    expect(screen.queryByRole('button', { name: /video hero/i })).toBeNull()
  })

  it('keeps poster visible when autoplay is rejected or video frame has not loaded', async () => {
    const originalPlay = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = vi.fn().mockRejectedValue(new Error('AutoplayBlocked'))

    try {
      render(
        <ResponsiveHeroVideo
          video={{
            desktopVideo: {
              id: 405,
              filename: 'clip.mp4',
              mimeType: 'video/mp4',
              url: '/media/clip.mp4',
            } as never,
            poster: mockMedia(406, 'Blocked Autoplay Poster', 'blocked.jpg'),
          }}
        />,
      )

      const posterImg = screen.getByAltText('Blocked Autoplay Poster')
      expect(posterImg).toBeTruthy()
      const posterWrapper = posterImg.closest('div[class*="transition-opacity"]')
      expect(posterWrapper?.classList.contains('opacity-100')).toBe(true)
      expect(posterWrapper?.classList.contains('opacity-0')).toBe(false)
    } finally {
      HTMLMediaElement.prototype.play = originalPlay
    }
  })

  it('hides poster when video frame renders and video is playing', async () => {
    const originalPlay = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)

    try {
      render(
        <ResponsiveHeroVideo
          video={{
            desktopVideo: {
              id: 407,
              filename: 'stream.mp4',
              mimeType: 'video/mp4',
              url: '/media/stream.mp4',
            } as never,
            poster: mockMedia(408, 'Stream Poster', 'stream.jpg'),
          }}
        />,
      )

      const video = document.querySelector('video')
      expect(video).toBeTruthy()

      // Trigger loadeddata
      act(() => {
        fireEvent.loadedData(video as HTMLVideoElement)
      })

      const posterImg = screen.getByAltText('Stream Poster')
      const posterWrapper = posterImg.closest('div[class*="transition-opacity"]')
      expect(posterWrapper?.classList.contains('opacity-0')).toBe(true)
    } finally {
      HTMLMediaElement.prototype.play = originalPlay
    }
  })

  it('supports resolvedLocale="en" providing English accessible button labels', () => {
    render(
      <ResponsiveHeroVideo
        resolvedLocale="en"
        video={{
          desktopVideo: {
            id: 409,
            filename: 'english.mp4',
            mimeType: 'video/mp4',
            url: '/media/english.mp4',
          } as never,
          poster: mockMedia(410, 'English Poster', 'en.jpg'),
        }}
      />,
    )

    const controlButton = screen.getByRole('button', { name: /pause hero video|play hero video/i })
    expect(controlButton).toBeTruthy()
  })

  it('propagates size="100vw" and resolvedLocale to poster and controls in VideoBackgroundHero caller', () => {
    render(
      <VideoBackgroundHero
        badge="Full Width"
        behavior={defaultHeroBehavior}
        postcards={[]}
        resolvedLocale="en"
        video={{
          desktopVideo: {
            id: 420,
            mimeType: 'video/mp4',
            url: '/media/bg.mp4',
          } as never,
          poster: mockMedia(421, 'Fullscreen Poster', 'poster.jpg'),
        }}
      />,
    )

    const posterImg = screen.getByAltText('Fullscreen Poster')
    expect(posterImg.getAttribute('data-size')).toBe('100vw')

    const controlButton = screen.getByRole('button', { name: /pause hero video|play hero video/i })
    expect(controlButton).toBeTruthy()
  })

  it('passes resolvedLocale="en" and size="(max-width: 768px) 100vw, 420px" through DeviceMockupSplitHero caller', () => {
    render(
      <DeviceMockupSplitHero
        badge="Mockup Hero"
        behavior={defaultHeroBehavior}
        postcards={[]}
        resolvedLocale="en"
        video={{
          desktopVideo: {
            id: 422,
            mimeType: 'video/mp4',
            url: '/media/mockup.mp4',
          } as never,
          poster: mockMedia(423, 'Mockup Poster', 'mockup.jpg'),
        }}
      />,
    )

    const controlButton = screen.getByRole('button', { name: /pause hero video|play hero video/i })
    expect(controlButton).toBeTruthy()

    const posterImg = screen.getByAltText('Mockup Poster')
    expect(posterImg.getAttribute('data-size')).toBe('(max-width: 768px) 100vw, 420px')
  })

  it('cleans up navigator.connection change listener on unmount', () => {
    const removeEventListenerSpy = vi.fn()
    const addEventListenerSpy = vi.fn()
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: {
        addEventListener: addEventListenerSpy,
        removeEventListener: removeEventListenerSpy,
        saveData: false,
      },
    })

    const { unmount } = render(
      <ResponsiveHeroVideo
        video={{
          desktopVideo: {
            id: 411,
            filename: 'cleanup.mp4',
            mimeType: 'video/mp4',
            url: '/media/cleanup.mp4',
          } as never,
        }}
      />,
    )

    expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function))
    unmount()
    expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('invalidates stale play promise on source change so stale promise cannot change state', async () => {
    let resolveFirstPlay: () => void = () => {}
    const firstPlayPromise = new Promise<void>((resolve) => {
      resolveFirstPlay = resolve
    })

    const playSpy = vi.spyOn(HTMLMediaElement.prototype, 'play')
    playSpy.mockReturnValueOnce(firstPlayPromise)

    const { rerender } = render(
      <ResponsiveHeroVideo
        video={{
          desktopVideo: {
            id: 412,
            filename: 'video1.mp4',
            mimeType: 'video/mp4',
            url: '/media/video1.mp4',
          } as never,
        }}
      />,
    )

    // Change source before firstPlayPromise resolves
    playSpy.mockResolvedValueOnce(undefined)
    rerender(
      <ResponsiveHeroVideo
        video={{
          desktopVideo: {
            id: 413,
            filename: 'video2.mp4',
            mimeType: 'video/mp4',
            url: '/media/video2.mp4',
          } as never,
        }}
      />,
    )

    // Resolve the first play promise now (stale generation)
    await act(async () => {
      resolveFirstPlay()
    })

    const video = document.querySelector('video')
    expect(video?.querySelector('source')?.getAttribute('src')).toContain('/media/video2.mp4')
  })

  it('maintains accessible controls and updates active source on viewport resize', () => {
    let resizeCallback: ((e: MediaQueryListEvent) => void) | undefined
    window.matchMedia = vi.fn().mockImplementation((query: string) => {
      if (query.includes('max-width: 768px')) {
        return {
          matches: false, // starts desktop
          media: query,
          onchange: null,
          addEventListener: (_event: string, cb: (e: MediaQueryListEvent) => void) => {
            resizeCallback = cb
          },
          removeEventListener: vi.fn(),
        }
      }
      return {
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }
    })

    render(
      <ResponsiveHeroVideo
        video={{
          desktopVideo: {
            id: 414,
            filename: 'desktop.mp4',
            mimeType: 'video/mp4',
            url: '/media/desktop.mp4',
          } as never,
          mobileVideo: {
            id: 415,
            filename: 'mobile.mp4',
            mimeType: 'video/mp4',
            url: '/media/mobile.mp4',
          } as never,
          poster: mockMedia(416, 'Resize Poster', 'poster.jpg'),
        }}
      />,
    )

    let video = document.querySelector('video')
    expect(video?.querySelector('source')?.getAttribute('src')).toContain('/media/desktop.mp4')
    expect(screen.getByRole('button', { name: /tạm dừng video hero|phát video hero/i })).toBeTruthy()

    // Simulate resize to mobile
    act(() => {
      resizeCallback?.({ matches: true } as MediaQueryListEvent)
    })

    video = document.querySelector('video')
    expect(video?.querySelector('source')?.getAttribute('src')).toContain('/media/mobile.mp4')
    expect(screen.getByRole('button', { name: /tạm dừng video hero|phát video hero/i })).toBeTruthy()
  })

  it('recovers cleanly by removing video element and displaying poster on video playback error', () => {
    render(
      <VideoBackgroundHero
        badge="Fault Tolerance"
        behavior={defaultHeroBehavior}
        postcards={[]}
        video={{
          desktopVideo: {
            id: 501,
            filename: 'broken.mp4',
            mimeType: 'video/mp4',
            url: '/media/broken.mp4',
          } as never,
          poster: mockMedia(502, 'Fallback Poster', 'fallback.jpg'),
        }}
      />,
    )

    expect(screen.getByAltText('Fallback Poster')).toBeTruthy()
    const video = document.querySelector('video')
    expect(video).toBeTruthy()

    // Trigger video playback error
    fireEvent.error(video as HTMLVideoElement)

    // Video removed from DOM, poster persists
    expect(document.querySelector('video')).toBeNull()
    expect(screen.getByAltText('Fallback Poster')).toBeTruthy()
  })

  it('handles broken or 404 poster by settling gate, hiding broken poster image, and rendering branded placeholder gradient', () => {
    render(
      <ResponsiveHeroVideo
        video={{
          desktopVideo: {
            id: 601,
            filename: 'broken.mp4',
            mimeType: 'video/mp4',
            url: '/media/broken.mp4',
          } as never,
          poster: mockMedia(602, 'Broken Poster', 'broken-404.jpg'),
        }}
      />,
    )

    // Poster image errored, so broken img element is removed from DOM to prevent broken frame
    expect(screen.queryByAltText('Broken Poster')).toBeNull()

    // Video was mounted because poster readiness settled
    const video = document.querySelector('video')
    expect(video).toBeTruthy()

    // When video also encounters playback error
    act(() => {
      fireEvent.error(video as HTMLVideoElement)
    })

    // Both video and poster errored: renders neutral branded gradient placeholder
    expect(document.querySelector('[data-hero-placeholder="branded-gradient"]')).toBeTruthy()
  })

  it('renders branded placeholder gradient and omits video when poster is missing under prefers-reduced-motion', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
    }))

    render(
      <ResponsiveHeroVideo
        video={{
          desktopVideo: {
            id: 701,
            filename: 'ambient.mp4',
            mimeType: 'video/mp4',
            url: '/media/ambient.mp4',
          } as never,
          poster: null,
        }}
      />,
    )

    // No video mounted under reduced motion
    expect(document.querySelector('video')).toBeNull()
    // Branded gradient placeholder rendered instead of empty black box
    expect(document.querySelector('[data-hero-placeholder="branded-gradient"]')).toBeTruthy()
  })

  it('renders branded placeholder gradient and omits video when poster is missing under Save-Data', () => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        saveData: true,
      },
    })

    render(
      <ResponsiveHeroVideo
        video={{
          desktopVideo: {
            id: 702,
            filename: 'ambient.mp4',
            mimeType: 'video/mp4',
            url: '/media/ambient.mp4',
          } as never,
          poster: null,
        }}
      />,
    )

    expect(document.querySelector('video')).toBeNull()
    expect(document.querySelector('[data-hero-placeholder="branded-gradient"]')).toBeTruthy()
  })

  it('persists explicit user pause across active source and viewport changes', () => {
    let mobileQueryCallback: ((e: MediaQueryListEvent) => void) | undefined
    window.matchMedia = vi.fn().mockImplementation((query: string) => {
      const isMobileQuery = query === '(max-width: 768px)'
      return {
        addEventListener: (_type: string, fn: (e: MediaQueryListEvent) => void) => {
          if (isMobileQuery) mobileQueryCallback = fn
        },
        dispatchEvent: vi.fn(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
      }
    })

    render(
      <ResponsiveHeroVideo
        video={{
          desktopVideo: {
            id: 801,
            filename: 'desktop.mp4',
            mimeType: 'video/mp4',
            url: '/media/desktop.mp4',
          } as never,
          mobileVideo: {
            id: 802,
            filename: 'mobile.mp4',
            mimeType: 'video/mp4',
            url: '/media/mobile.mp4',
          } as never,
          poster: mockMedia(803, 'Desktop Poster', 'desktop-poster.jpg'),
        }}
      />,
    )

    const toggleButton = screen.getByRole('button', { name: /tạm dừng video hero|pause hero video/i })
    expect(toggleButton).toBeTruthy()

    // User explicitly pauses the video
    act(() => {
      fireEvent.click(toggleButton)
    })

    // Button changes to Play
    expect(screen.getByRole('button', { name: /phát video hero|play hero video/i })).toBeTruthy()

    // Viewport resizes to mobile
    act(() => {
      mobileQueryCallback?.({ matches: true } as MediaQueryListEvent)
    })

    const newVideo = document.querySelector('video')
    expect(newVideo?.querySelector('source')?.getAttribute('src')).toContain('/media/mobile.mp4')
    // autoPlay must be false because user paused
    expect(newVideo?.autoplay).toBe(false)
    // Button still shows Play (pause preference is persisted!)
    expect(screen.getByRole('button', { name: /phát video hero|play hero video/i })).toBeTruthy()

    // User explicitly clicks Play
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /phát video hero|play hero video/i }))
    })

    // Button changes back to Pause
    expect(screen.getByRole('button', { name: /tạm dừng video hero|pause hero video/i })).toBeTruthy()
  })

  it('pauses video when scrolled offscreen and resumes when returning onscreen, preserving explicit user pause', () => {
    render(
      <ResponsiveHeroVideo
        video={{
          desktopVideo: {
            id: 901,
            filename: 'desktop.mp4',
            mimeType: 'video/mp4',
            url: '/media/desktop.mp4',
          } as never,
          poster: mockMedia(902, 'Scroll Poster', 'scroll.jpg'),
        }}
      />,
    )

    const observerInstance = ControlledIntersectionObserver.instances[0]
    expect(observerInstance).toBeTruthy()

    const video = document.querySelector('video') as HTMLVideoElement
    expect(video).toBeTruthy()

    // Scroll offscreen
    act(() => {
      observerInstance.trigger(false)
    })

    // Video paused while offscreen
    expect(video.paused).toBe(true)

    // Scroll back onscreen
    act(() => {
      observerInstance.trigger(true)
    })

    // Video resumed
    expect(screen.getByRole('button', { name: /tạm dừng video hero|pause hero video/i })).toBeTruthy()

    // If user explicitly paused
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /tạm dừng video hero|pause hero video/i }))
    })

    // Scroll offscreen and back onscreen
    act(() => {
      observerInstance.trigger(false)
    })
    act(() => {
      observerInstance.trigger(true)
    })

    // User pause preference remains respected: does NOT resume automatically
    expect(screen.getByRole('button', { name: /phát video hero|play hero video/i })).toBeTruthy()
  })

  it('does not attach source or autoplay offscreen when poster settles late or source changes offscreen', () => {
    let mobileQueryCallback: ((e: MediaQueryListEvent) => void) | undefined
    window.matchMedia = vi.fn().mockImplementation((query: string) => {
      const isMobileQuery = query === '(max-width: 768px)'
      return {
        addEventListener: (_type: string, fn: (e: MediaQueryListEvent) => void) => {
          if (isMobileQuery) mobileQueryCallback = fn
        },
        dispatchEvent: vi.fn(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
      }
    })

    render(
      <ResponsiveHeroVideo
        video={{
          desktopVideo: {
            id: 1001,
            filename: 'desktop.mp4',
            mimeType: 'video/mp4',
            url: '/media/desktop.mp4',
          } as never,
          mobileVideo: {
            id: 1002,
            filename: 'mobile.mp4',
            mimeType: 'video/mp4',
            url: '/media/mobile.mp4',
          } as never,
          poster: mockMedia(1003, 'Delayed Poster', 'delayed-poster.jpg'),
        }}
      />,
    )

    const observerInstance = ControlledIntersectionObserver.instances[0]
    expect(observerInstance).toBeTruthy()

    // 1. Initial state: onscreen, but delayed poster is not ready yet
    expect(document.querySelector('video')).toBeNull()

    // 2. User scrolls out of viewport while poster is still in-flight
    act(() => {
      observerInstance.trigger(false)
    })

    // 3. Poster now finishes loading (or encounters late 404) while offscreen
    const posterImg = screen.getByAltText('Delayed Poster')
    act(() => {
      fireEvent.load(posterImg)
    })

    // Assert: Video MUST NOT attach because element is currently offscreen!
    expect(document.querySelector('video')).toBeNull()

    // 4. Source changes while still offscreen (e.g. mobile viewport resize)
    act(() => {
      mobileQueryCallback?.({ matches: true } as MediaQueryListEvent)
    })

    // Assert: Video STILL must not attach or autoplay while offscreen!
    expect(document.querySelector('video')).toBeNull()

    // 5. User scrolls back into viewport
    act(() => {
      observerInstance.trigger(true)
    })

    // Assert: NOW the video attaches with the active source and plays!
    const video = document.querySelector('video')
    expect(video).toBeTruthy()
    expect(video?.querySelector('source')?.getAttribute('src')).toContain('/media/mobile.mp4')
  })

  it('recovers immediately when switching from errored poster A to valid poster B (Aerror -> Bload)', () => {
    const { rerender } = render(
      <ResponsiveHeroVideo
        video={{
          desktopVideo: {
            id: 1101,
            filename: 'desktop.mp4',
            mimeType: 'video/mp4',
            url: '/media/desktop.mp4',
          } as never,
          poster: mockMedia(1102, 'Broken Poster A', 'broken-a.jpg'),
        }}
      />,
    )

    // Poster A errored: broken image is hidden from DOM to prevent broken frame
    expect(screen.queryByAltText('Broken Poster A')).toBeNull()
    // Video is attached because poster A settled (even though it errored)
    expect(document.querySelector('video')).toBeTruthy()

    // Now prop updates to valid poster B
    rerender(
      <ResponsiveHeroVideo
        video={{
          desktopVideo: {
            id: 1101,
            filename: 'desktop.mp4',
            mimeType: 'video/mp4',
            url: '/media/desktop.mp4',
          } as never,
          poster: mockMedia(1103, 'Valid Poster B', 'valid-b.jpg'),
        }}
      />,
    )

    // With keyed error derivation (failedPosterKey), poster B is NOT poisoned by poster A's error
    // Media component for Poster B mounts immediately in DOM
    const posterBImg = screen.getByAltText('Valid Poster B')
    expect(posterBImg).toBeTruthy()

    // Video remains functional
    expect(document.querySelector('video')).toBeTruthy()
  })

  it('gates readiness when switching from settled poster A to new unsettled poster B (success -> newunsettled)', () => {
    const { rerender } = render(
      <ResponsiveHeroVideo
        video={{
          desktopVideo: {
            id: 1201,
            filename: 'desktop.mp4',
            mimeType: 'video/mp4',
            url: '/media/desktop.mp4',
          } as never,
          poster: mockMedia(1202, 'Settled Poster A', 'settled-a.jpg'),
        }}
      />,
    )

    // Poster A loaded: video attached
    expect(screen.getByAltText('Settled Poster A')).toBeTruthy()
    expect(document.querySelector('video')).toBeTruthy()

    // Rerender with delayed/unsettled poster B
    rerender(
      <ResponsiveHeroVideo
        video={{
          desktopVideo: {
            id: 1201,
            filename: 'desktop.mp4',
            mimeType: 'video/mp4',
            url: '/media/desktop.mp4',
          } as never,
          poster: mockMedia(1203, 'Unsettled Poster B', 'delayed-b.jpg'),
        }}
      />,
    )

    // During first render of B, settledPosterKey ('settled-a.jpg') !== posterKey ('delayed-b.jpg')
    // isPosterReady is false -> video must NOT attach or remain attached until B settles
    expect(document.querySelector('video')).toBeNull()
    const posterBImg = screen.getByAltText('Unsettled Poster B')
    expect(posterBImg).toBeTruthy()

    // Once Poster B finishes loading
    act(() => {
      fireEvent.load(posterBImg)
    })

    // Now isPosterReady becomes true -> video attaches
    expect(document.querySelector('video')).toBeTruthy()
  })

  it('separates old CDN keys and changes the source when a same-filename media revision changes', () => {
    const media = {
      id: 1301,
      filename: 'revision.mp4',
      mimeType: 'video/mp4',
      url: '/media/revision.mp4',
      updatedAt: '2026-10-25T01:00:00.000Z',
    }
    const { rerender } = render(<ResponsiveHeroVideo video={{ desktopVideo: media as never }} />)
    const first = document.querySelector('source')?.getAttribute('src')
    expect(first).toContain('ac6-video-v1')
    expect(first).not.toBe(`/media/revision.mp4?${encodeURIComponent(media.updatedAt)}`)
    rerender(<ResponsiveHeroVideo video={{ desktopVideo: { ...media, updatedAt: '2026-10-25T01:00:01.000Z' } as never }} />)
    const second = document.querySelector('source')?.getAttribute('src')
    expect(second).toContain('ac6-video-v1')
    expect(second).not.toBe(first)
  })
})
