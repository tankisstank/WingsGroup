import React from 'react'

import type { Page } from '@/payload-types'

import { HighImpactHero } from '@/heros/HighImpact'
import { LowImpactHero } from '@/heros/LowImpact'
import { MediumImpactHero } from '@/heros/MediumImpact'
import type { SiteHeroDefaultsLike } from '@/heros/presentations/types'
import type { SupportedLocaleCode } from '@/utilities/locales'
import { WingsGroupEditorialHero } from '@/components/WingsGroupV3/EditorialHero'

const heroes = {
  highImpact: HighImpactHero,
  lowImpact: LowImpactHero,
  mediumImpact: MediumImpactHero,
}

export const RenderHero: React.FC<
  Page['hero'] & {
    resolvedLocale?: SupportedLocaleCode
    siteHeroDefaults?: SiteHeroDefaultsLike | null
    wingsGroupV3Enabled?: boolean
    allowWingsGroupDevelopmentMedia?: boolean
  }
> = (props) => {
  const { type, wingsGroupV3Enabled } = props || {}

  if (!type || type === 'none') return null

  if (wingsGroupV3Enabled && type === 'highImpact') {
    return <WingsGroupEditorialHero {...props} />
  }

  const HeroToRender = heroes[type]

  if (!HeroToRender) return null

  return <HeroToRender {...props} />
}
