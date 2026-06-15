import type { Media as MediaDocument, Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import React from 'react'
import { SparklesIcon } from 'lucide-react'

import type { HeroPresentationKey } from './registry'

type HeroLink = NonNullable<Page['hero']['links']>[number]

export type HeroPresentationProps = {
  badge: string
  businessPanel?: React.ReactNode
  links?: HeroLink[] | null
  media?: MediaDocument | number | null
  postcards: readonly string[]
  richText?: Page['hero']['richText']
  supportingMedia?: (MediaDocument | number)[] | null
}

const HeroCopy: React.FC<
  Pick<HeroPresentationProps, 'badge' | 'links' | 'richText'> & {
    centered?: boolean
  }
> = ({ badge, centered = false, links, richText }) => (
  <div className={`hero-presentation__copy${centered ? ' hero-presentation__copy--centered' : ''}`}>
    <div className="site-hero__badge">
      <SparklesIcon aria-hidden="true" className="h-4 w-4" />
      <span>{badge}</span>
    </div>
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

const HeroPostcards: React.FC<Pick<HeroPresentationProps, 'postcards'>> = ({ postcards }) => (
  <div className="hero-presentation__postcards">
    {postcards.map((label) => (
      <span key={label}>{label}</span>
    ))}
  </div>
)

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
    {businessPanel ? <div className="hero-presentation__business-panel">{businessPanel}</div> : null}
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
      {businessPanel ? <div className="hero-presentation__business-panel">{businessPanel}</div> : null}
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
    <div className="hero-presentation__mesh-orb hero-presentation__mesh-orb--one" aria-hidden="true" />
    <div className="hero-presentation__mesh-orb hero-presentation__mesh-orb--two" aria-hidden="true" />
    <div className="hero-presentation__mesh-orb hero-presentation__mesh-orb--three" aria-hidden="true" />
    <div className="container hero-presentation__mesh-content">
      <HeroCopy badge={badge} centered links={links} richText={richText} />
      <HeroPostcards postcards={postcards} />
      {businessPanel ? <div className="hero-presentation__business-panel">{businessPanel}</div> : null}
    </div>
  </div>
)

export const heroPresentationComponents: Record<
  HeroPresentationKey,
  React.FC<HeroPresentationProps>
> = {
  'centered-visual': CenteredVisualHero,
  'gradient-mesh': GradientMeshHero,
  'layered-visuals': LayeredVisualsHero,
  'split-visual': SplitVisualHero,
}
