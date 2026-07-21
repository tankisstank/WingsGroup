import type { Media as MediaDocument, Page } from '@/payload-types'
import type React from 'react'

export type HeroPresentationKey =
  | 'centered-visual'
  | 'split-visual'
  | 'layered-visuals'
  | 'gradient-mesh'
  | 'planner-split'
  | 'cinematic-carousel'
  | 'video-background'

export type HeroContentMode = 'single' | 'slides' | 'video'
export type HeroTransition = 'crossfade' | 'slide' | 'zoom'

export type HeroPresentationCapabilities = {
  businessPanel: boolean
  multipleMedia: boolean
  perSlideContent: boolean
  singleMedia: boolean
  video: boolean
}

export type HeroBehavior = {
  autoplay: boolean
  intervalMs: number
  loop: boolean
  pauseOnHover: boolean
  showArrows: boolean
  showDots: boolean
  transition: HeroTransition
  transitionMs: number
}

export type HeroBehaviorInput = {
  [Key in keyof HeroBehavior]?: HeroBehavior[Key] | null
}

export type HeroPresetLike = {
  baseTemplate?: HeroPresentationKey | null
  behavior?: HeroBehaviorInput | null
  isActive?: boolean | null
  key?: string | null
  name?: string | null
  slots?: {
    showBadge?: boolean | null
    showBusinessPanel?: boolean | null
    showPostcards?: boolean | null
  } | null
  visual?: {
    contentAlign?: 'left' | 'center' | 'right' | null
    contentPosition?: 'left' | 'center' | 'right' | null
    mediaFit?: 'cover' | 'contain' | null
    overlayStrength?: 'none' | 'soft' | 'strong' | null
  } | null
}

export type HeroSlide = {
  description?: string | null
  eyebrow?: string | null
  id?: string | null
  links?: NonNullable<Page['hero']['links']> | null
  media?: MediaDocument | number | null
  mobileMedia?: MediaDocument | number | null
  title?: string | null
}

export type HeroVideoConfig = {
  desktopVideo?: MediaDocument | number | null
  mobileVideo?: MediaDocument | number | null
  poster?: MediaDocument | number | null
}

export type HeroPresentationProps = {
  badge: string
  behavior: HeroBehavior
  businessPanel?: React.ReactNode
  links?: NonNullable<Page['hero']['links']> | null
  media?: MediaDocument | number | null
  postcards: readonly string[]
  preset?: HeroPresetLike | null
  /** Locale for hi-fi dual-CTA fallback labels (Explore destinations). */
  resolvedLocale?: string | null
  richText?: Page['hero']['richText']
  slides?: HeroSlide[] | null
  supportingMedia?: (MediaDocument | number)[] | null
  video?: HeroVideoConfig | null
}

export type ResolvedHeroPresentation = {
  behavior: HeroBehavior
  key: HeroPresentationKey
  preset: HeroPresetLike | null
  presetKey: string
  source: 'legacy' | 'page' | 'site' | 'fallback'
}

export type SiteHeroDefaultsLike = {
  presentationPreset?: HeroPresetLike | number | string | null
  variant?: string | null
}
