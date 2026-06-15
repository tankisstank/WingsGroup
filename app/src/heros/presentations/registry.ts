export const heroPresentationDefinitions = [
  {
    description: 'Nội dung căn giữa phía trên, visual lớn nằm ngay bên dưới.',
    label: 'Style 1 - Centered visual',
    value: 'centered-visual',
  },
  {
    description: 'Nội dung và CTA ở một bên, visual hoặc product mockup ở bên còn lại.',
    label: 'Style 2 - Split visual',
    value: 'split-visual',
  },
  {
    description: 'Nội dung ở trung tâm, nhiều visual card được xếp lớp và nghiêng xung quanh.',
    label: 'Style 3 - Layered visuals',
    value: 'layered-visuals',
  },
  {
    description: 'Nội dung căn giữa trên nền gradient mesh có chuyển động nhẹ.',
    label: 'Style 4 - Animated gradient mesh',
    value: 'gradient-mesh',
  },
] as const

export type HeroPresentationKey = (typeof heroPresentationDefinitions)[number]['value']

export const defaultHeroPresentation: HeroPresentationKey = 'centered-visual'

const heroPresentationKeys = new Set<string>(
  heroPresentationDefinitions.map((definition) => definition.value),
)

export const isHeroPresentationKey = (value: unknown): value is HeroPresentationKey =>
  typeof value === 'string' && heroPresentationKeys.has(value)

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
