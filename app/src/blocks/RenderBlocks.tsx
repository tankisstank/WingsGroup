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
import { CredentialsCarouselBlock } from '@/blocks/CredentialsCarousel/Component'
import { StatsBlock } from '@/blocks/Stats/Component'
import { TestimonialBlock } from '@/blocks/Testimonial/Component'
import { WingsGroupEcosystemComponent } from '@/blocks/WingsGroupEcosystem/Component'
import { WingsGroupProofArchiveComponent } from '@/blocks/WingsGroupProofArchive/Component'
import {
  composeWingsGroupHomeBlocks,
  getApprovedProofRecords,
  getWingsGroupHomeSection,
} from '@/components/WingsGroupV3/model'
import { WingsGroupEditorialRail } from '@/components/WingsGroupV3/EditorialRail'

const blockComponents = {
  archive: ArchiveBlock,
  content: ContentBlock,
  comparison: ComparisonBlock,
  credentialsCarousel: CredentialsCarouselBlock,
  cta: LocalizedCallToActionBlock,
  faq: FAQBlock,
  featureGrid: FeatureGridBlock,
  formBlock: FormBlock,
  infoStrip: InfoStripBlock,
  mediaBlock: MediaBlock,
  pricingTable: PricingTableBlock,
  stats: StatsBlock,
  testimonial: TestimonialBlock,
  wingsGroupEcosystem: WingsGroupEcosystemComponent,
  wingsGroupProofArchive: WingsGroupProofArchiveComponent,
}

export const RenderBlocks: React.FC<{
  blocks: Page['layout'][0][]
  locale?: null | string
  siteCode?: null | string
  wingsGroupV3Home?: boolean
}> = (props) => {
  const { blocks, locale, siteCode, wingsGroupV3Home = false } = props

  const hasBlocks = blocks && Array.isArray(blocks) && blocks.length > 0

  if (hasBlocks) {
    const renderedBlocks = wingsGroupV3Home ? composeWingsGroupHomeBlocks(blocks) : blocks
    const proofBlock = renderedBlocks.find((block) => block.blockType === 'wingsGroupProofArchive')
    const approvedProofKeys =
      wingsGroupV3Home && proofBlock?.blockType === 'wingsGroupProofArchive'
        ? getApprovedProofRecords(proofBlock.records).map((record) => record.key)
        : []

    return (
      <Fragment>
        {renderedBlocks.map((block, index) => {
          const { blockType } = block

          if (blockType && blockType in blockComponents) {
            const Block =
              wingsGroupV3Home && blockType === 'archive'
                ? WingsGroupEditorialRail
                : blockComponents[blockType]

            if (Block) {
              const blockProps =
                block.blockType === 'formBlock'
                  ? { ...block, siteCode }
                  : block.blockType === 'wingsGroupEcosystem'
                  ? { ...block, approvedProofKeys, locale }
                  : block.blockType === 'credentialsCarousel' ||
                      block.blockType === 'wingsGroupProofArchive' ||
                      (wingsGroupV3Home && block.blockType === 'archive')
                    ? { ...block, locale }
                    : block
              const section = wingsGroupV3Home ? getWingsGroupHomeSection(block) : null

              const renderedBlock = (
                <Fragment>
                  {/* @ts-expect-error there may be some mismatch between the expected types here */}
                  <Block {...blockProps} disableInnerContainer />
                </Fragment>
              )

              return section ? (
                <div data-wingsgroup-home-section={section} key={`${section}-${index}`}>
                  {renderedBlock}
                </div>
              ) : (
                <Fragment key={index}>{renderedBlock}</Fragment>
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
