import React from 'react'

import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'

export type MediumImpactHeroProps = Page['hero'] & {
  showMediaCaption?: boolean
}

export const MediumImpactHero: React.FC<MediumImpactHeroProps> = ({
  links,
  media,
  richText,
  showMediaCaption = true,
}) => {
  return (
    <section className="site-detail-hero">
      <div className="container site-detail-hero__grid">
        <div className="site-detail-hero__intro">
          {richText && <RichText className="mb-6" data={richText} enableGutter={false} />}

          {Array.isArray(links) && links.length > 0 && (
            <ul className="site-detail-hero__actions">
              {links.map(({ link }, i) => {
                return (
                  <li key={i}>
                    <CMSLink {...link} />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        {media && typeof media === 'object' && (
          <div className="site-detail-hero__media">
            <Media
              className="site-detail-hero__picture"
              imgClassName="site-detail-hero__image"
              priority
              resource={media}
            />
            {showMediaCaption && media?.caption && (
              <div className="mt-3">
                <RichText data={media.caption} enableGutter={false} />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
