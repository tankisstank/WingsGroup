import React, { Fragment } from 'react'

import type { Page } from '@/payload-types'

import { ArchiveBlock } from '@/blocks/ArchiveBlock/Component'
import { LocalizedCallToActionBlock } from '@/blocks/CallToAction/Component.server'
import { ContentBlock } from '@/blocks/Content/Component'
import { FAQBlock } from '@/blocks/FAQ/Component'
import { FeatureGridBlock } from '@/blocks/FeatureGrid/Component'
import { FormBlock } from '@/blocks/Form/Component'
import { InfoStripBlock } from '@/blocks/InfoStrip/Component'
import { MediaBlock } from '@/blocks/MediaBlock/Component'
import { PricingTableBlock } from '@/blocks/PricingTable/Component'
import { ComparisonBlock } from '@/blocks/Comparison/Component'
import { StatsBlock } from '@/blocks/Stats/Component'
import { TestimonialBlock } from '@/blocks/Testimonial/Component'

const blockComponents = {
  archive: ArchiveBlock,
  content: ContentBlock,
  comparison: ComparisonBlock,
  cta: LocalizedCallToActionBlock,
  faq: FAQBlock,
  featureGrid: FeatureGridBlock,
  formBlock: FormBlock,
  infoStrip: InfoStripBlock,
  mediaBlock: MediaBlock,
  pricingTable: PricingTableBlock,
  stats: StatsBlock,
  testimonial: TestimonialBlock,
}

export const RenderBlocks: React.FC<{
  blocks: Page['layout'][0][]
}> = (props) => {
  const { blocks } = props

  const hasBlocks = blocks && Array.isArray(blocks) && blocks.length > 0

  if (hasBlocks) {
    return (
      <Fragment>
        {blocks.map((block, index) => {
          const { blockType } = block

          if (blockType && blockType in blockComponents) {
            const Block = blockComponents[blockType]

            if (Block) {
              return (
                <Fragment key={index}>
                  {/* @ts-expect-error there may be some mismatch between the expected types here */}
                  <Block {...block} disableInnerContainer />
                </Fragment>
              )
            }
          }
          return null
        })}
      </Fragment>
    )
  }

  return null
}
