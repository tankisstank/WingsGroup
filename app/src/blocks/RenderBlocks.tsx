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
import { WingsGroupContactSection } from '@/blocks/WingsGroupContact/Component'
import { WingsGroupTrustSection } from '@/blocks/WingsGroupTrust/Component'
import {
  composeWingsGroupHomeBlocks,
  getApprovedProofRecords,
  getWingsGroupHomeSection,
} from '@/components/WingsGroupV3/model'
import { WingsGroupEditorialRail } from '@/components/WingsGroupV3/EditorialRail'
import type { WingsGroupRouteArchetype } from '@/wingsgroup/corporateRoutes'
import { WingsGroupCapabilitySection } from '@/blocks/WingsGroupCapability/Component'
import { WingsGroupCorporateSection } from '@/blocks/WingsGroupCorporate/Component'
import { WingsGroupEditorialArchive } from '@/components/WingsGroupV3/EditorialArchive'

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
  allowWingsGroupDevelopmentMedia?: boolean
  siteCode?: null | string
  wingsGroupV3?: boolean
  wingsGroupLegalIdentity?: {
    legalEntityName?: null | string
    internationalName?: null | string
    registeredOffice?: null | string
    travelOffice?: null | string
    registrationNumber?: null | string
    licenceNumber?: null | string
    legalRepresentative?: null | string
    relationshipStatement?: null | string
  } | null
  wingsGroupV3Home?: boolean
  wingsGroupV3Route?: WingsGroupRouteArchetype
}> = (props) => {
  const {
    allowWingsGroupDevelopmentMedia = false,
    blocks,
    locale,
    siteCode,
    wingsGroupV3 = false,
    wingsGroupLegalIdentity,
    wingsGroupV3Home = false,
    wingsGroupV3Route,
  } = props

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
                : wingsGroupV3Home && blockType === 'formBlock'
                  ? WingsGroupContactSection
                  : wingsGroupV3Home && (blockType === 'infoStrip' || blockType === 'stats')
                    ? WingsGroupTrustSection
                    : wingsGroupV3 &&
                        wingsGroupV3Route === 'capability' &&
                        blockType === 'featureGrid'
                      ? WingsGroupCapabilitySection
                      : wingsGroupV3 && wingsGroupV3Route === 'corporate' && blockType === 'content'
                        ? WingsGroupCorporateSection
                        : wingsGroupV3 &&
                            wingsGroupV3Route === 'editorial' &&
                            blockType === 'archive'
                          ? WingsGroupEditorialArchive
                          : wingsGroupV3 && wingsGroupV3Route === 'trust' && blockType === 'content'
                            ? WingsGroupTrustSection
                            : blockComponents[blockType]

            if (Block) {
              const blockProps =
                block.blockType === 'formBlock'
                  ? {
                      ...block,
                      allowWingsGroupDevelopmentMedia,
                      locale,
                      siteCode,
                      wingsGroupV3,
                    }
                  : block.blockType === 'wingsGroupEcosystem'
                    ? { ...block, allowWingsGroupDevelopmentMedia, approvedProofKeys, locale }
                    : wingsGroupV3 &&
                        (wingsGroupV3Route === 'corporate' || wingsGroupV3Route === 'trust') &&
                        block.blockType === 'content'
                      ? { ...block, legalIdentity: wingsGroupLegalIdentity, locale }
                      : wingsGroupV3Home &&
                          (block.blockType === 'infoStrip' || block.blockType === 'stats')
                        ? { ...block, legalIdentity: wingsGroupLegalIdentity, locale }
                        : block.blockType === 'credentialsCarousel' ||
                            block.blockType === 'wingsGroupProofArchive' ||
                            (wingsGroupV3Home && block.blockType === 'archive')
                          ? { ...block, allowWingsGroupDevelopmentMedia, locale }
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
