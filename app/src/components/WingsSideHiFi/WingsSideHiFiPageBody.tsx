import React from 'react'

import type { Page } from '@/payload-types'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import type { WingsSideHiFiPageModel } from '@/utilities/wingsSideHiFiPageModel'
import { getPublicRoutePathname } from '@/utilities/sitePaths'

import { HomeHiFiPage } from './HomeHiFiPage'
import { PlanHiFiPage } from './PlanHiFiPage'
import { SecondaryHiFiPage } from './SecondaryHiFiPage'

export const WingsSideHiFiPageBody = ({
  locale,
  reusableBlocks,
  model,
  publicPathname,
  searchParams,
}: {
  locale?: null | string
  reusableBlocks?: Page['layout']
  model: WingsSideHiFiPageModel
  publicPathname: string
  searchParams?: Record<string, string | string[] | undefined>
}) => {
  const route = getPublicRoutePathname(publicPathname)

  if (route === '/plan-your-trip') {
    return (
      <>
        <PlanHiFiPage locale={locale} model={model} searchParams={searchParams} />
        <RenderBlocks blocks={reusableBlocks || []} />
      </>
    )
  }

  if (route === '/')
    return <HomeHiFiPage locale={locale} model={model} reusableBlocks={reusableBlocks} />

  return (
    <>
      <SecondaryHiFiPage
        locale={locale}
        model={model}
        publicPathname={publicPathname}
        searchParams={searchParams}
      />
      <RenderBlocks blocks={reusableBlocks || []} />
    </>
  )
}
