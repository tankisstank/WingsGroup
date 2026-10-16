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
import { WingsGroupContactIntro } from '@/components/WingsGroupV3/ContactIntro'
import { JourneyInquiryGrid } from '@/components/WingsGroupV3/JourneyInquiryGrid'
import { WingsGroupTestimonialsSection } from '@/components/WingsGroupV3/TestimonialsSection'
import { WingsGroupGallerySection } from '@/blocks/WingsGroupGallery/Component'

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
  wingsGroupGallery: WingsGroupGallerySection,
  wingsGroupProofArchive: WingsGroupProofArchiveComponent,
}

export const RenderBlocks: React.FC<{
  blocks: Page['layout'][0][]
  locale?: null | string
  publicPathname?: null | string
  registeredOfficeAddress?: null | string
  travelOfficeAddress?: null | string
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
    publicPathname,
    registeredOfficeAddress,
    siteCode,
    travelOfficeAddress,
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

          if (
            blockType === 'wingsGroupGallery' &&
            !(wingsGroupV3 && wingsGroupV3Route === 'corporate' && siteCode === 'wings-group')
          ) {
            return null
          }

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
                        : wingsGroupV3 && wingsGroupV3Route === 'contact' && blockType === 'content'
                          ? WingsGroupContactIntro
                          : wingsGroupV3 &&
                              wingsGroupV3Route === 'contact' &&
                              blockType === 'formBlock'
                            ? WingsGroupContactSection
                            : wingsGroupV3 &&
                                wingsGroupV3Route === 'editorial' &&
                                blockType === 'archive'
                              ? WingsGroupEditorialArchive
                              : wingsGroupV3 &&
                                  wingsGroupV3Route === 'trust' &&
                                  blockType === 'content'
                                ? WingsGroupTrustSection
                                : blockComponents[blockType]

            if (Block) {
              const blockProps =
                block.blockType === 'wingsGroupGallery'
                  ? { ...block, locale }
                  : block.blockType === 'formBlock'
                  ? {
                      ...block,
                      allowWingsGroupDevelopmentMedia,
                      locale,
                      publicPathname,
                      registeredOfficeAddress,
                      siteCode,
                      travelOfficeAddress,
                      wingsGroupV3,
                    }
                  : block.blockType === 'wingsGroupEcosystem'
                    ? {
                        ...block,
                        allowWingsGroupDevelopmentMedia,
                        approvedProofKeys,
                        locale,
                        showDeepDiveLinks: wingsGroupV3Route === 'home',
                      }
                    : wingsGroupV3 &&
                        (wingsGroupV3Route === 'corporate' || wingsGroupV3Route === 'trust') &&
                        block.blockType === 'content'
                      ? { ...block, legalIdentity: wingsGroupLegalIdentity, locale }
                      : wingsGroupV3 && wingsGroupV3Route === 'contact' && blockType === 'content'
                        ? { ...block, locale }
                        : wingsGroupV3 && wingsGroupV3Route === 'home' && blockType === 'infoStrip'
                          ? {
                              ...block,
                              legalIdentity: wingsGroupLegalIdentity,
                              locale,
                              showDeepDiveLink: true,
                            }
                        : wingsGroupV3Home &&
                            (block.blockType === 'infoStrip' || block.blockType === 'stats')
                          ? {
                              ...block,
                              legalIdentity: wingsGroupLegalIdentity,
                              locale,
                              showDeepDiveLink: true,
                            }
                          : block.blockType === 'credentialsCarousel' ||
                              block.blockType === 'wingsGroupProofArchive' ||
                              ((wingsGroupV3 || wingsGroupV3Home) && block.blockType === 'archive')
                            ? { ...block, allowWingsGroupDevelopmentMedia, locale }
                            : wingsGroupV3 &&
                                wingsGroupV3Route === 'capability' &&
                                block.blockType === 'featureGrid'
                              ? { ...block, locale }
                              : block
              const section = wingsGroupV3Home ? getWingsGroupHomeSection(block) : null

              const renderedBlock = (
                <Fragment>
                  {/* @ts-expect-error there may be some mismatch between the expected types here */}
                  <Block {...blockProps} disableInnerContainer />
                </Fragment>
              )

              const homeAddons =
                wingsGroupV3Home && (!wingsGroupV3Route || wingsGroupV3Route === 'home') ? (
                  blockType === 'wingsGroupEcosystem' ? (
                    <>
                      <div data-wingsgroup-home-addon="capability">
                        <WingsGroupCapabilitySection anchorId="capability" locale={locale} />
                      </div>
                      <JourneyInquiryGrid locale={locale} />
                    </>
                  ) : blockType === 'infoStrip' || blockType === 'stats' ? (
                    <WingsGroupTestimonialsSection locale={locale} />
                  ) : null
                ) : null

              return section ? (
                <Fragment key={`${section}-${index}`}>
                  <div data-wingsgroup-home-section={section}>{renderedBlock}</div>
                  {homeAddons}
                </Fragment>
              ) : (
                <Fragment key={index}>
                  {renderedBlock}
                  {homeAddons}
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
