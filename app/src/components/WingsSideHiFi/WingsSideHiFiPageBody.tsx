import React from 'react'

import type { WingsSideHiFiPageModel } from '@/utilities/wingsSideHiFiPageModel'
import { getPublicRoutePathname } from '@/utilities/sitePaths'

import { HomeHiFiPage } from './HomeHiFiPage'
import { PlanHiFiPage } from './PlanHiFiPage'
import { SecondaryHiFiPage } from './SecondaryHiFiPage'

export const WingsSideHiFiPageBody = ({
  locale,
  model,
  publicPathname,
  searchParams,
}: {
  locale?: null | string
  model: WingsSideHiFiPageModel
  publicPathname: string
  searchParams?: Record<string, string | string[] | undefined>
}) => {
  const route = getPublicRoutePathname(publicPathname)

  if (route === '/plan-your-trip') {
    return <PlanHiFiPage locale={locale} model={model} searchParams={searchParams} />
  }

  if (route === '/') return <HomeHiFiPage locale={locale} model={model} />

  return (
    <SecondaryHiFiPage
      locale={locale}
      model={model}
      publicPathname={publicPathname}
    />
  )
}
