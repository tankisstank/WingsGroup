import React from 'react'

import type { CredentialsCarouselBlock as CredentialsCarouselBlockProps } from '@/payload-types'
import { WingsSideCredentialsCarousel } from '@/components/WingsSideHiFi/CredentialsCarousel'

import '@/components/WingsSideHiFi/hifi-pages.css'
import '@/components/WingsSideHiFi/hifi-sections.css'

export const CredentialsCarouselBlock: React.FC<
  CredentialsCarouselBlockProps & { locale?: null | string }
> = (props) => (
  <WingsSideCredentialsCarousel content={props} locale={props.locale} />
)
