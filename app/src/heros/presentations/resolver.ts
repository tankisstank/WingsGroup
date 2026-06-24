import {
  isHeroPresentationKey,
  normalizeHeroBehavior,
  resolveHeroPresentation,
} from './registry'
import type {
  HeroBehaviorInput,
  HeroPresetLike,
  ResolvedHeroPresentation,
  SiteHeroDefaultsLike,
} from './types'

type PageHeroLike = {
  behaviorMode?: 'inherit' | 'override' | null
  behaviorOverrides?: HeroBehaviorInput | null
  presentation?: string | null
  presentationMode?: 'inherit' | 'override' | null
  presentationPreset?: HeroPresetLike | number | string | null
  variant?: string | null
}

const asPreset = (value: unknown): HeroPresetLike | null =>
  value && typeof value === 'object' ? (value as HeroPresetLike) : null

export const resolveHeroPresentationConfig = ({
  hero,
  siteDefaults,
}: {
  hero?: PageHeroLike | null
  siteDefaults?: SiteHeroDefaultsLike | null
}): ResolvedHeroPresentation => {
  const pagePreset = asPreset(hero?.presentationPreset)
  const sitePreset = asPreset(siteDefaults?.presentationPreset)
  const explicitPageOverride = hero?.presentationMode === 'override' && pagePreset
  const explicitSiteInheritance = hero?.presentationMode === 'inherit' && sitePreset
  const legacyKey = isHeroPresentationKey(hero?.presentation) ? hero.presentation : null

  const preset = explicitPageOverride || explicitSiteInheritance || null
  const source = explicitPageOverride
    ? 'page'
    : explicitSiteInheritance
      ? 'site'
      : legacyKey
        ? 'legacy'
        : sitePreset
          ? 'site'
          : 'fallback'
  const effectivePreset = preset || (source === 'site' ? sitePreset : null)
  const key = effectivePreset?.baseTemplate && isHeroPresentationKey(effectivePreset.baseTemplate)
    ? effectivePreset.baseTemplate
    : legacyKey || resolveHeroPresentation(undefined, hero?.variant || siteDefaults?.variant)
  const behavior = normalizeHeroBehavior({
    ...effectivePreset?.behavior,
    ...(hero?.behaviorMode === 'override' ? hero.behaviorOverrides : null),
  })

  return {
    behavior,
    key,
    preset: effectivePreset,
    presetKey: effectivePreset?.key || key,
    source,
  }
}
