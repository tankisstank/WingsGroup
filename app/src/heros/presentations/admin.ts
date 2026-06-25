import type { HeroPresentationKey, HeroPresetLike } from './types'

import { getHeroPresentationDefinition } from './registry'

export type HeroRequirementGroup = 'behavior' | 'media' | 'slides' | 'supportingMedia' | 'video'
export type HeroRequirementStatus =
  | 'missing'
  | 'not-needed'
  | 'ready'
  | 'recommended-missing'
  | 'recommended-ready'

export type HeroRequirement = {
  description: string
  group: HeroRequirementGroup
  key: string
  label: string
  status: HeroRequirementStatus
}

export type HeroPresentationAdminMeta = {
  businessFit: string[]
  description: string
  key: HeroPresentationKey
  label: string
  requirementSummary: string[]
  visualLabel: string
}

type HeroRequirementInput = {
  key?: HeroPresentationKey | null
  slides?: Array<{ media?: unknown | null }> | null
  supportingMedia?: unknown[] | null
  variant?: string | null
  video?: {
    desktopVideo?: unknown | null
    mobileVideo?: unknown | null
    poster?: unknown | null
  } | null
  visualMedia?: unknown | null
}

const hasValue = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.length > 0
  }

  return value !== null && value !== undefined && value !== ''
}

const countSlidesWithMedia = (slides?: Array<{ media?: unknown | null }> | null) =>
  (slides || []).filter((slide) => hasValue(slide?.media)).length

const buildRequirement = (
  key: string,
  group: HeroRequirementGroup,
  label: string,
  description: string,
  status: HeroRequirementStatus,
): HeroRequirement => ({
  description,
  group,
  key,
  label,
  status,
})

export const getHeroPresentationAdminMeta = (
  value: unknown,
): HeroPresentationAdminMeta | null => {
  const definition = getHeroPresentationDefinition(value)

  if (!definition) {
    return null
  }

  const metaByKey: Record<HeroPresentationKey, Omit<HeroPresentationAdminMeta, 'description' | 'key' | 'label'>> = {
    'centered-visual': {
      businessFit: ['standard', 'utility'],
      requirementSummary: ['1 ảnh hero chính', 'không cần slides', 'không cần video'],
      visualLabel: 'Headline trên, visual lớn bên dưới',
    },
    'cinematic-carousel': {
      businessFit: ['standard', 'retail-departures'],
      requirementSummary: ['tối thiểu 2 slides có ảnh', 'nội dung theo slide', 'không dùng ảnh chính đơn'],
      visualLabel: 'Carousel nhiều slide với overlay nội dung',
    },
    'gradient-mesh': {
      businessFit: ['standard', 'utility'],
      requirementSummary: ['không yêu cầu media', 'dùng headline/CTA là chính'],
      visualLabel: 'Gradient mesh, không phụ thuộc ảnh',
    },
    'layered-visuals': {
      businessFit: ['standard', 'retail-departures'],
      requirementSummary: ['1 ảnh hero chính', 'nên có 1-3 visual bổ sung'],
      visualLabel: 'Ảnh chính cộng visual phụ xếp lớp',
    },
    'planner-split': {
      businessFit: ['planner'],
      requirementSummary: ['1 ảnh hero chính', 'nên dùng variant planner'],
      visualLabel: 'Copy trái, planner panel và visual lớn',
    },
    'split-visual': {
      businessFit: ['standard', 'retail-departures', 'utility'],
      requirementSummary: ['1 ảnh hero chính', 'không cần slides', 'không cần video'],
      visualLabel: 'Copy một bên, visual một bên',
    },
    'video-background': {
      businessFit: ['standard', 'retail-departures'],
      requirementSummary: ['poster bắt buộc', 'desktop video khuyến nghị', 'mobile video tùy chọn'],
      visualLabel: 'Poster và video nền toàn khung',
    },
  }

  return {
    ...metaByKey[definition.value],
    description: definition.description,
    key: definition.value,
    label: definition.label,
  }
}

export const getHeroPresetMeta = (
  preset?: HeroPresetLike | null,
): HeroPresentationAdminMeta | null =>
  getHeroPresentationAdminMeta(preset?.baseTemplate)

export const evaluateHeroPresentationRequirements = ({
  key,
  slides,
  supportingMedia,
  variant,
  video,
  visualMedia,
}: HeroRequirementInput): HeroRequirement[] => {
  if (!key) {
    return []
  }

  if (key === 'gradient-mesh') {
    return [
      buildRequirement(
        'no-media',
        'media',
        'Không cần media',
        'Template này dùng nền mesh và CTA, không cần ảnh hoặc video để preview đúng.',
        'ready',
      ),
    ]
  }

  if (key === 'cinematic-carousel') {
    const populatedSlides = countSlidesWithMedia(slides)

    return [
      buildRequirement(
        'slides',
        'slides',
        'Slides có ảnh',
        'Cần tối thiểu 2 slide có ảnh để carousel hoạt động đúng.',
        populatedSlides >= 2 ? 'ready' : 'missing',
      ),
      buildRequirement(
        'hero-image-secondary',
        'media',
        'Ảnh hero chính',
        'Template này không dùng ảnh hero chính riêng. Ảnh nên đặt trong từng slide.',
        'not-needed',
      ),
      buildRequirement(
        'video-secondary',
        'video',
        'Video hero',
        'Template này không dùng video nền.',
        'not-needed',
      ),
    ]
  }

  if (key === 'video-background') {
    return [
      buildRequirement(
        'video-poster',
        'video',
        'Poster video',
        'Poster là fallback bắt buộc cho reduced-motion và lỗi phát video.',
        hasValue(video?.poster) ? 'ready' : 'missing',
      ),
      buildRequirement(
        'video-desktop',
        'video',
        'Video desktop',
        'Desktop video được khuyến nghị để preview đúng background video.',
        hasValue(video?.desktopVideo) ? 'recommended-ready' : 'recommended-missing',
      ),
      buildRequirement(
        'video-mobile',
        'video',
        'Video mobile',
        'Mobile video là tùy chọn nếu cần source tối ưu riêng.',
        hasValue(video?.mobileVideo) ? 'recommended-ready' : 'not-needed',
      ),
      buildRequirement(
        'hero-image-secondary',
        'media',
        'Ảnh hero chính',
        'Template này không dùng trường ảnh hero chính.',
        'not-needed',
      ),
    ]
  }

  const requirements: HeroRequirement[] = [
    buildRequirement(
      'hero-image',
      'media',
      'Ảnh hero chính',
      'Ảnh hero chính là input bắt buộc cho preset đang chọn.',
      hasValue(visualMedia) ? 'ready' : 'missing',
    ),
    buildRequirement(
      'slides-secondary',
      'slides',
      'Slides',
      'Preset này không phụ thuộc slides. Có thể bỏ qua nếu page không phải carousel.',
      'not-needed',
    ),
    buildRequirement(
      'video-secondary',
      'video',
      'Video hero',
      'Preset này không phụ thuộc video nền.',
      'not-needed',
    ),
  ]

  if (key === 'layered-visuals') {
    requirements.push(
      buildRequirement(
        'supporting-media',
        'supportingMedia',
        'Visual bổ sung',
        'Layered visuals nên có thêm 1-3 visual phụ để preview đúng bố cục.',
        Array.isArray(supportingMedia) && supportingMedia.length > 0
          ? 'recommended-ready'
          : 'recommended-missing',
      ),
    )
  }

  if (key === 'planner-split') {
    requirements.push(
      buildRequirement(
        'planner-behavior',
        'behavior',
        'Business behavior',
        'Planner split nên đi cùng variant planner để panel nghiệp vụ đúng ngữ cảnh.',
        variant === 'planner' ? 'recommended-ready' : 'recommended-missing',
      ),
    )
  }

  return requirements
}

export const getHeroRequirementTone = (status: HeroRequirementStatus) => {
  if (status === 'missing') return 'critical'
  if (status === 'recommended-missing') return 'warning'
  if (status === 'ready' || status === 'recommended-ready') return 'ready'

  return 'muted'
}
