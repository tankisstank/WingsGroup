import type { CallToActionBlock as CTABlockProps } from '@/payload-types'

import { getRuntimeLocaleCopy, publicChromeCopy } from '@/i18n/publicCopy'
import { getCurrentLocale } from '@/utilities/siteContext'

import { CallToActionBlock } from './Component'

export const LocalizedCallToActionBlock = async (props: CTABlockProps) => {
  const locale = await getCurrentLocale()
  const chromeCopy = getRuntimeLocaleCopy(publicChromeCopy, locale)

  return <CallToActionBlock {...props} ariaLabel={chromeCopy.callToActionRegion} />
}
