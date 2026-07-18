import React from 'react'

import type { CallToActionBlock as CTABlockProps } from '@/payload-types'

import RichText from '@/components/RichText'
import { CMSLink } from '@/components/Link'

type CallToActionBlockProps = CTABlockProps & {
  ariaLabel?: string
}

export const CallToActionBlock = ({
  ariaLabel = 'Call to action',
  eyebrow,
  links,
  presentation = 'card',
  richText,
  supportingQuote,
}: CallToActionBlockProps) => {
  return (
    <section
      className={`container theme-section--compact layout-block layout-block--cta layout-block--${presentation}`}
      aria-label={ariaLabel}
      data-block-presentation={presentation}
    >
      <div className="layout-cta theme-card border p-6 lg:p-8 flex flex-col gap-8 md:flex-row md:justify-between md:items-center">
        <div className="max-w-[48rem] flex items-center">
          <div>
            {eyebrow ? <p className="site-brand-kicker mb-3">{eyebrow}</p> : null}
            {richText && <RichText className="mb-0" data={richText} enableGutter={false} />}
            {supportingQuote ? (
              <blockquote className="layout-cta__quote">&ldquo;{supportingQuote}&rdquo;</blockquote>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-8">
          {(links || []).map(({ link }, i) => {
            return <CMSLink key={i} size="lg" {...link} />
          })}
        </div>
      </div>
    </section>
  )
}
