import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import React from 'react'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { generateMeta } from '@/utilities/generateMeta'
import {
  appendSiteWhere,
  getCurrentLocale,
  getCurrentSite,
  getCurrentSitePrefix,
} from '@/utilities/siteContext'
import { JsonLd } from '@/components/JsonLd'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { RelatedPages } from '@/components/RelatedPages'
import { buildBreadcrumbListJSONLD, buildWebPageJSONLD } from '@/utilities/structuredData'
import { buildPageBreadcrumbItems, type BreadcrumbPage } from '@/utilities/breadcrumbs'
import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import { getPageCanonicalPath } from '@/utilities/siteURLs'
import { getCopyLocale } from '@/utilities/locales'
import { isSupportedLocale, type SupportedLocaleCode } from '@/utilities/sitePaths'
import { getCanonicalSiteOrigin } from '@/utilities/siteSEO'
import {
  isRetailTourEnabledSiteCode,
  isStructuredTourDetailEnabledSiteCode,
} from '@/utilities/siteCapabilities'
import {
  getResolvedScheduleData,
  getResolvedTourDetailBySlug,
  getTourCampaignBySlug,
  getToursByMarketRoute,
} from '@/tours/queries'
import {
  TourCampaignPage,
  TourDetailPage,
  TourMarketPage,
  TourSchedulePage,
} from '@/tours/StructuredPages'
import { hasMatchingWingSideTourWrapper } from '@/tours/wingsSideTourViewModel'
import { WingsSideHiFiPageBody } from '@/components/WingsSideHiFi/WingsSideHiFiPageBody'
import {
  resolveWingsSideHiFiPageBodyModel,
  shouldRenderWingsSideHiFiPageBody,
} from '@/utilities/wingsSideHiFiDispatch'
import type { WingsSideHiFiPageSource } from '@/utilities/wingsSideHiFiPageModel'
import { filterCmsLayoutBlocksForHiFiComposer } from '@/utilities/wingsSideHiFiComposer'

type Args = {
  params: Promise<{
    slug?: string[]
  }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function Page({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = [] } = await paramsPromise
  const searchParams = searchParamsPromise ? await searchParamsPromise : {}
  const locale = await getCurrentLocale()
  const sitePrefix = await getCurrentSitePrefix()
  const decodedSegments = slug.map((segment) => decodeURIComponent(segment))
  const contentSegments = isSupportedLocale(decodedSegments[0])
    ? decodedSegments.slice(1)
    : decodedSegments
  const requestedPath = contentSegments.length > 0 ? `/${contentSegments.join('/')}` : '/'
  const url = `${sitePrefix}${requestedPath === '/' ? '' : requestedPath}`.replace(/\/+/g, '/')
  const page = await queryPageByPath({
    locale,
    requestedPath,
  })

  if (!page) {
    return <PayloadRedirects url={url} />
  }

  const settings = await getCurrentSiteSettings()
  const site = await getCurrentSite()
  const canonicalOrigin = getCanonicalSiteOrigin({ settings, site })
  const canonicalPath = getPageCanonicalPath(page, locale)
  const breadcrumbItems = buildPageBreadcrumbItems({
    locale,
    page: page as BreadcrumbPage,
    settings,
  })
  const relatedPages = (page as { relatedPages?: Parameters<typeof RelatedPages>[0]['pages'] })
    .relatedPages
  const structuredPage = await resolveStructuredTourPage({
    locale,
    requestedPath,
    wrapperPageID: page.id,
  })

  // Structured tour detail: tighter vertical rhythm under fixed header.
  const isStructuredTour = Boolean(structuredPage)

  // Tranche B1: dedicated hi-fi Home/Plan body replaces legacy hero/blocks/related.
  let hiFiModel = resolveWingsSideHiFiPageBodyModel({
    locale,
    page: page as WingsSideHiFiPageSource,
    publicPathname: requestedPath,
  })

  // Populate conversion form relationship when only an id is stored.
  const hiFiFormVariant =
    hiFiModel?.routeVariant === 'plan' || hiFiModel?.routeVariant === 'contact'
      ? hiFiModel.routeVariant
      : null
  if (
    hiFiModel &&
    hiFiFormVariant &&
    hiFiModel.routeContent &&
    typeof (hiFiModel.routeContent as { form?: unknown }).form !== 'object'
  ) {
    const formRef = (
      page as {
        wingsSideHiFi?: {
          contact?: { form?: number | string | null }
          plan?: { form?: number | string | null }
        }
      }
    ).wingsSideHiFi?.[hiFiFormVariant]?.form
    if (formRef != null) {
      try {
        const payload = await getPayload({ config: configPromise })
        const formDoc = await payload.findByID({
          collection: 'forms',
          depth: 2,
          id: formRef,
          overrideAccess: draft,
        })
        hiFiModel = {
          ...hiFiModel,
          routeContent: {
            ...(hiFiModel.routeContent || {}),
            form: formDoc,
          },
        }
      } catch {
        // Leave unpopulated; the conversion page shows a linked-form warning.
      }
    }
  }

  // Also accept an existing layout formBlock when the hi-fi relationship is empty.
  if (hiFiModel && hiFiFormVariant && hiFiModel.routeContent) {
    const content = hiFiModel.routeContent as { form?: unknown }
    if (!content.form && Array.isArray(page.layout)) {
      const formBlock = page.layout.find((block) => {
        if (!block || typeof block !== 'object' || !('blockType' in block) || !('form' in block)) {
          return false
        }
        const blockType = String((block as { blockType?: unknown }).blockType || '')
        return (
          (blockType === 'formBlock' || blockType === 'form') &&
          (block as { form?: unknown }).form &&
          typeof (block as { form?: unknown }).form === 'object'
        )
      }) as { form?: unknown } | undefined
      if (formBlock?.form) {
        hiFiModel = {
          ...hiFiModel,
          routeContent: { ...content, form: formBlock.form },
        }
      }
    }
  }

  const useHiFiBody = shouldRenderWingsSideHiFiPageBody({
    model: hiFiModel,
    publicPathname: requestedPath,
    siteCode: site.code,
  })
  const consumedHiFiForm =
    hiFiFormVariant && hiFiModel?.routeContent
      ? (hiFiModel.routeContent as { form?: unknown }).form
      : null
  const hiFiReusableBlocks = filterCmsLayoutBlocksForHiFiComposer(page.layout, consumedHiFiForm)

  return (
    <article
      className={
        useHiFiBody ? 'pb-16 md:pb-20' : isStructuredTour ? 'pt-16 pb-16 md:pb-20' : 'pt-16 pb-24'
      }
      data-hifi-body={useHiFiBody ? 'true' : 'false'}
    >
      <JsonLd
        data={[
          buildWebPageJSONLD({
            canonicalOrigin,
            description: page.meta?.description,
            path: canonicalPath,
            settings,
            title: page.meta?.title || page.title,
          }),
          buildBreadcrumbListJSONLD(
            breadcrumbItems.map((item) => ({ name: item.label, path: item.path })),
            settings,
            { canonicalOrigin },
          ),
        ]}
      />
      <PageClient />
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      {!useHiFiBody ? (
        <Breadcrumbs
          className={
            isStructuredTour
              ? 'container pb-2 pt-3 text-sm text-muted-foreground md:pt-4'
              : undefined
          }
          items={breadcrumbItems}
        />
      ) : null}

      {structuredPage ? (
        <>
          {structuredPage}
          <RelatedPages locale={locale} pages={relatedPages} />
        </>
      ) : useHiFiBody && hiFiModel ? (
        <WingsSideHiFiPageBody
          locale={locale}
          model={hiFiModel}
          publicPathname={requestedPath}
          reusableBlocks={hiFiReusableBlocks}
          searchParams={searchParams}
        />
      ) : (
        <>
          <RenderHero
            {...page.hero}
            resolvedLocale={locale}
            siteHeroDefaults={settings?.heroDefaults}
          />
          <RenderBlocks blocks={page.layout} />
          <RelatedPages locale={locale} pages={relatedPages} />
        </>
      )}
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = [] } = await paramsPromise
  const locale = await getCurrentLocale()
  const decodedSegments = slug.map((segment) => decodeURIComponent(segment))
  const contentSegments = isSupportedLocale(decodedSegments[0])
    ? decodedSegments.slice(1)
    : decodedSegments
  const requestedPath = contentSegments.length > 0 ? `/${contentSegments.join('/')}` : '/'
  const page = await queryPageByPath({
    locale,
    requestedPath,
  })

  return generateMeta({
    doc: page,
    locale,
    path: requestedPath,
  })
}

const queryPageByPath = async ({
  locale,
  requestedPath,
}: {
  locale?: SupportedLocaleCode
  requestedPath: string
}) => {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config: configPromise })
  const segments = requestedPath.split('/').filter(Boolean)
  const candidateSlug = segments[segments.length - 1] || 'home'
  const site = await getCurrentSite()
  const candidateSlugs = [candidateSlug, `${site.code}-${candidateSlug}`]
  const where = await appendSiteWhere({
    or: [
      {
        pathname: {
          equals: requestedPath,
        },
      },
      {
        slug: {
          in: candidateSlugs,
        },
      },
    ],
  })

  const findPage = async (
    requestedLocale?: SupportedLocaleCode,
    options?: { strictLocale?: boolean },
  ) => {
    const result = await payload.find({
      collection: 'pages',
      draft,
      fallbackLocale: options?.strictLocale === false ? undefined : false,
      locale: requestedLocale,
      depth: 3,
      limit: 1,
      pagination: false,
      overrideAccess: draft,
      where,
    })

    return result.docs?.[0] || null
  }

  const hasRenderableLocalizedContent = (page: Awaited<ReturnType<typeof findPage>>) => {
    const placeholderTitles = new Set(['page', 'pagina', 'página', 'trang'])

    if (!page) {
      return false
    }

    if (Array.isArray(page.layout) && page.layout.length > 0) {
      return true
    }

    if (page.hero?.richText) {
      return true
    }

    return (
      typeof page.title === 'string' &&
      page.title.trim().length > 0 &&
      !placeholderTitles.has(page.title.trim().toLowerCase())
    )
  }

  const localizedPage = await findPage(locale, { strictLocale: true })

  if (hasRenderableLocalizedContent(localizedPage)) {
    return localizedPage
  }

  const fallbackLocale =
    site.defaultLocale && isSupportedLocale(site.defaultLocale) ? site.defaultLocale : null

  if (!fallbackLocale || fallbackLocale === locale) {
    return localizedPage
  }

  const fallbackPage = await findPage(fallbackLocale, { strictLocale: false })

  return hasRenderableLocalizedContent(fallbackPage) ? fallbackPage : localizedPage
}

const resolveStructuredTourPage = async ({
  locale,
  requestedPath,
  wrapperPageID,
}: {
  locale: SupportedLocaleCode
  requestedPath: string
  wrapperPageID: number | string
}) => {
  const { isEnabled: draft } = await draftMode()
  const segments = requestedPath.split('/').filter(Boolean)
  const site = await getCurrentSite()

  if (segments.length === 2 && segments[0] === 'tour' && segments[1]) {
    if (!isStructuredTourDetailEnabledSiteCode(site.code)) return null

    const tourData = await getResolvedTourDetailBySlug({
      draft,
      fallbackLocale: site.code === 'wings-side' ? 'en' : undefined,
      locale,
      slug: segments[1],
    })

    if (!tourData) {
      return null
    }

    // Wingside: consultative hi-fi TourDetailPage (Open Design lock).
    // Keep wrapper-page gate so only linked TourProduct pages resolve.
    if (site.code === 'wings-side') {
      if (!hasMatchingWingSideTourWrapper(tourData.tour, wrapperPageID)) notFound()
      return (
        <TourDetailPage
          data={tourData}
          locale={getCopyLocale(locale)}
          presentation="consultative"
          siteCode={site.code}
        />
      )
    }

    return (
      <TourDetailPage
        data={tourData}
        locale={getCopyLocale(locale)}
        presentation="retail"
        siteCode={site?.code}
      />
    )
  }

  if (!isRetailTourEnabledSiteCode(site.code)) return null

  const copyLocale = getCopyLocale(locale)

  if (segments[0] === 'lich-khoi-hanh') {
    const schedule = await getResolvedScheduleData({
      draft,
      locale,
    })

    return <TourSchedulePage schedule={schedule} />
  }

  if (segments[0] === 'thi-truong' && segments[1]) {
    const marketData = await getToursByMarketRoute({
      draft,
      locale,
      marketRouteSlug: segments[1],
    })

    if (!marketData) {
      return null
    }

    return (
      <TourMarketPage
        departures={marketData.departures}
        locale={copyLocale}
        marketKey={marketData.marketKey}
        tours={marketData.tours}
      />
    )
  }

  if (segments[0] === 'campaign' && segments[1]) {
    const campaignData = await getTourCampaignBySlug({
      draft,
      locale,
      slug: segments[1],
    })

    if (!campaignData) {
      return null
    }

    return (
      <TourCampaignPage
        campaign={campaignData.campaign}
        departures={campaignData.departures}
        locale={copyLocale}
      />
    )
  }

  return null
}
