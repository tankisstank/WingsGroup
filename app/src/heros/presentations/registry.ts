import type {
  HeroBehavior,
  HeroBehaviorInput,
  HeroPresentationCapabilities,
  HeroPresentationKey,
  HeroPresetLike,
} from './types'

type HeroPresentationDefinition = {
  capabilities: HeroPresentationCapabilities
  description: string
  label: string
  value: HeroPresentationKey
}

const singleMediaCapabilities: HeroPresentationCapabilities = {
  businessPanel: true,
  multipleMedia: false,
  perSlideContent: false,
  singleMedia: true,
  video: false,
}

export const heroPresentationDefinitions: readonly HeroPresentationDefinition[] = [
  {
    capabilities: singleMediaCapabilities,
    description: 'Nội dung căn giữa phía trên, visual lớn nằm ngay bên dưới.',
    label: 'Style 1 - Centered visual',
    value: 'centered-visual',
  },
  {
    capabilities: singleMediaCapabilities,
    description: 'Nội dung và CTA ở một bên, visual hoặc product mockup ở bên còn lại.',
    label: 'Style 2 - Split visual',
    value: 'split-visual',
  },
  {
    capabilities: {
      ...singleMediaCapabilities,
      multipleMedia: true,
    },
    description: 'Nội dung ở trung tâm, nhiều visual card được xếp lớp và nghiêng xung quanh.',
    label: 'Style 3 - Layered visuals',
    value: 'layered-visuals',
  },
  {
    capabilities: {
      ...singleMediaCapabilities,
      singleMedia: false,
    },
    description: 'Nội dung căn giữa trên nền gradient mesh có chuyển động nhẹ.',
    label: 'Style 4 - Animated gradient mesh',
    value: 'gradient-mesh',
  },
  {
    capabilities: singleMediaCapabilities,
    description: 'Copy và lựa chọn hành trình bên trái, visual lớn và panel tư vấn bên phải.',
    label: 'Planner split',
    value: 'planner-split',
  },
  {
    capabilities: {
      businessPanel: false,
      multipleMedia: true,
      perSlideContent: true,
      singleMedia: false,
      video: false,
    },
    description: 'Carousel nhiều ảnh với nội dung theo slide, autoplay và điều khiển truy cập được.',
    label: 'Cinematic carousel',
    value: 'cinematic-carousel',
  },
  {
    capabilities: {
      businessPanel: false,
      multipleMedia: false,
      perSlideContent: false,
      singleMedia: false,
      video: true,
    },
    description: 'Video nền có poster, source mobile và fallback khi không thể phát.',
    label: 'Video background',
    value: 'video-background',
  },
] as const

export const defaultHeroPresentation: HeroPresentationKey = 'centered-visual'

const heroPresentationKeys = new Set<string>(
  heroPresentationDefinitions.map((definition) => definition.value),
)

export const isHeroPresentationKey = (value: unknown): value is HeroPresentationKey =>
  typeof value === 'string' && heroPresentationKeys.has(value)

export const defaultHeroBehavior: HeroBehavior = {
  autoplay: true,
  intervalMs: 6000,
  loop: true,
  pauseOnHover: true,
  showArrows: true,
  showDots: true,
  transition: 'crossfade',
  transitionMs: 700,
}

const clamp = (value: unknown, fallback: number, min: number, max: number) => {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
}

export const normalizeHeroBehavior = (
  behavior?: HeroBehaviorInput | null,
): HeroBehavior => ({
  autoplay: behavior?.autoplay ?? defaultHeroBehavior.autoplay,
  intervalMs: clamp(behavior?.intervalMs, defaultHeroBehavior.intervalMs, 3000, 15000),
  loop: behavior?.loop ?? defaultHeroBehavior.loop,
  pauseOnHover: behavior?.pauseOnHover ?? defaultHeroBehavior.pauseOnHover,
  showArrows: behavior?.showArrows ?? defaultHeroBehavior.showArrows,
  showDots: behavior?.showDots ?? defaultHeroBehavior.showDots,
  transition:
    behavior?.transition && ['crossfade', 'slide', 'zoom'].includes(behavior.transition)
      ? behavior.transition
      : defaultHeroBehavior.transition,
  transitionMs: clamp(
    behavior?.transitionMs,
    defaultHeroBehavior.transitionMs,
    200,
    2000,
  ),
})

export const getHeroPresentationDefinition = (value: unknown) =>
  heroPresentationDefinitions.find((definition) => definition.value === value)

export const validateHeroPreset = (preset: HeroPresetLike): string | true => {
  if (!isHeroPresentationKey(preset.baseTemplate)) {
    return 'Chọn một base template đã được đăng ký trong hệ thống.'
  }

  normalizeHeroBehavior(preset.behavior)
  return true
}

export const resolveHeroPresentation = (
  presentation: unknown,
  variant?: string | null,
): HeroPresentationKey => {
  if (isHeroPresentationKey(presentation)) {
    return presentation
  }

  return variant === 'standard' || !variant ? defaultHeroPresentation : 'split-visual'
}

export const heroPresentationOptions = heroPresentationDefinitions.map(({ label, value }) => ({
  label,
  value,
}))

export type { HeroPresentationKey } from './types'
