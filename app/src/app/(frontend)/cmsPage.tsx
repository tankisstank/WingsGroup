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
import PageClient from './[...slug]/page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { RelatedPages } from '@/components/RelatedPages'
import { buildBreadcrumbListJSONLD, buildWebPageJSONLD } from '@/utilities/structuredData'
import { buildPageBreadcrumbItems, type BreadcrumbPage } from '@/utilities/breadcrumbs'
import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import { getPageCanonicalPath } from '@/utilities/siteURLs'
import { getCopyLocale } from '@/utilities/locales'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import { getCanonicalSiteOrigin } from '@/utilities/siteSEO'
import { queryPublishedPageLocalesByExactPath } from '@/utilities/pageLocaleInventory'
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
import { readSafeTourEnquiryContext } from '@/tours/enquiryContext'
import { buildStructuredTourBreadcrumbItems } from '@/tours/structuredTourBreadcrumbs'
import {
  hasMatchingWingSideTourWrapper,
  sanitizeWingSidePublicText,
} from '@/tours/wingsSideTourViewModel'
import { WingsSideHiFiPageBody } from '@/components/WingsSideHiFi/WingsSideHiFiPageBody'
import {
  resolveWingsSideHiFiPageBodyModel,
  shouldRenderWingsSideHiFiPageBody,
} from '@/utilities/wingsSideHiFiDispatch'
import type { WingsSideHiFiPageSource } from '@/utilities/wingsSideHiFiPageModel'
import { filterCmsLayoutBlocksForHiFiComposer } from '@/utilities/wingsSideHiFiComposer'
import { isWingsGroupV3HomeLayout } from '@/components/WingsGroupV3/model'
import { hydrateWingsSideHomeCuration, projectWingsSideHomeCuration } from '@/tours/homeCuration'
import type { Form as FormType } from '@payloadcms/plugin-form-builder/types'
import type { Form as PayloadForm } from '@/payload-types'

type CmsPathArgs = {
  requestedPath: string
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export async function renderCmsPageByPath({
  requestedPath,
  searchParams: searchParamsPromise,
}: CmsPathArgs) {
  const { isEnabled: draft } = await draftMode()
  const searchParams = searchParamsPromise ? await searchParamsPromise : {}
  const locale = await getCurrentLocale()
  const sitePrefix = await getCurrentSitePrefix()
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
    searchParams,
    wrapperPageID: page.id,
  })

  // Structured tour detail: tighter vertical rhythm under fixed header.
  const isStructuredTour = Boolean(structuredPage)
  const renderedBreadcrumbItems =
    isStructuredTour
      ? buildStructuredTourBreadcrumbItems({
          baseItems: breadcrumbItems,
          canonicalPath,
          locale,
          pageTitle: page.title,
          searchParams,
          siteCode: site.code,
        })
      : breadcrumbItems

  // Tranche B1: dedicated hi-fi Home/Plan body replaces legacy hero/blocks/related.
  let hiFiModel = resolveWingsSideHiFiPageBodyModel({
    locale,
    page: page as WingsSideHiFiPageSource,
    publicPathname: requestedPath,
  })

  if (hiFiModel && ['home', 'destinations', 'styles'].includes(hiFiModel.routeVariant)) {
    const payload = await getPayload({ config: configPromise })
    let homeSource = hiFiModel.routeVariant === 'home' ? hiFiModel.routeContent : undefined
    if (!homeSource) {
      const siteID = typeof page.site === 'object' && page.site ? page.site.id : page.site
      const homePages = await payload.find({
        collection: 'pages',
        depth: 3,
        fallbackLocale: false,
        limit: 2,
        locale,
        overrideAccess: true,
        pagination: false,
        where: {
          and: [
            { site: { equals: siteID } },
            { 'wingsSideHiFi.enabled': { equals: true } },
            { 'wingsSideHiFi.routeVariant': { equals: 'home' } },
          ],
        },
      })
      homeSource =
        homePages.docs.length === 1
          ? ((homePages.docs[0].wingsSideHiFi as { home?: Record<string, unknown> } | undefined)
              ?.home ?? undefined)
          : undefined
    }
    const hydratedHome = await hydrateWingsSideHomeCuration({
      home: homeSource,
      locale,
      pageSite: page.site,
      payload,
    })
    hiFiModel = {
      ...hiFiModel,
      homeCuration: projectWingsSideHomeCuration({
        home: hydratedHome,
        locale,
        pageSite: page.site,
      }),
    }
  }

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
  const useWingsGroupV3Home =
    site.code === 'wings-group' &&
    requestedPath === '/' &&
    settings?.wingsGroupV3?.enabled === true &&
    isWingsGroupV3HomeLayout(page.layout)

  return (
    <article
      className={
        useHiFiBody ? 'pb-16 md:pb-20' : isStructuredTour ? 'pb-16 md:pb-20' : 'pt-16 pb-24'
      }
      data-hifi-body={useHiFiBody ? 'true' : 'false'}
      data-wingsgroup-v3-home={useWingsGroupV3Home ? 'true' : 'false'}
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
            renderedBreadcrumbItems.map((item) => ({ name: item.label, path: item.path })),
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
              ? 'wingsside-tour-breadcrumb container pb-3 pt-4 md:pt-5'
              : undefined
          }
          items={renderedBreadcrumbItems}
          linkClassName={
            isStructuredTour ? 'wingsside-tour-breadcrumb__link' : undefined
          }
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
            wingsGroupV3Enabled={useWingsGroupV3Home}
          />
          <RenderBlocks
            blocks={page.layout}
            locale={locale}
            wingsGroupV3Home={useWingsGroupV3Home}
          />
          <RelatedPages locale={locale} pages={relatedPages} />
        </>
      )}
    </article>
  )
}

export async function generateCmsPageMetadataByPath({
  requestedPath,
}: {
  requestedPath: string
}): Promise<Metadata> {
  const locale = await getCurrentLocale()
  const page = await queryPageByPath({
    locale,
    requestedPath,
  })
  const alternateLocales = page
    ? await queryPublishedPageLocalesByExactPath({
        requestedPath,
      })
    : []

  const site = await getCurrentSite()
  if (page && site.code === 'wing-side' && requestedPath.startsWith('/tour/')) {
    const cleanTitle = sanitizeWingSidePublicText(String(page.title || '')).replace(
      /\s+\d+\s+days?$/i,
      '',
    )
    const cleanDescription = sanitizeWingSidePublicText(String(page.meta?.description || ''))
    const boundedDescription =
      cleanDescription.length > 160
        ? `${cleanDescription.slice(0, 157).replace(/\s+\S*$/, '')}...`
        : cleanDescription

    return generateMeta({
      alternateLocales,
      doc: {
        ...page,
        meta: { ...page.meta, description: boundedDescription },
        title: `${cleanTitle} | WingsSide`,
      },
      locale,
      path: requestedPath,
    })
  }

  return generateMeta({
    alternateLocales,
    doc: page,
    locale,
    path: requestedPath,
  })
}

const queryPageByPath = async ({
  depth = 3,
  locale,
  requestedPath,
}: {
  depth?: number
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

  const findPage = async (requestedLocale?: SupportedLocaleCode) => {
    const scopedWhere = draft
      ? where
      : {
          and: [
            where,
            {
              _status: {
                equals: 'published',
              },
            },
          ],
        }

    const result = await payload.find({
      collection: 'pages',
      draft,
      fallbackLocale: false,
      locale: requestedLocale,
      depth,
      limit: 1,
      pagination: false,
      overrideAccess: draft,
      where: scopedWhere,
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

  const localizedPage = await findPage(locale)

  return hasRenderableLocalizedContent(localizedPage) ? localizedPage : null
}

const resolveStructuredTourPage = async ({
  locale,
  requestedPath,
  searchParams,
  wrapperPageID,
}: {
  locale: SupportedLocaleCode
  requestedPath: string
  searchParams?: Record<string, string | string[] | undefined>
  wrapperPageID: number | string
}) => {
  const { isEnabled: draft } = await draftMode()
  const segments = requestedPath.split('/').filter(Boolean)
  const site = await getCurrentSite()

  if (segments.length === 2 && segments[0] === 'tour' && segments[1]) {
    if (!isStructuredTourDetailEnabledSiteCode(site.code)) return null

    const tourData = await getResolvedTourDetailBySlug({
      draft,
      fallbackLocale: site.code === 'wing-side' ? false : undefined,
      locale,
      slug: segments[1],
    })

    if (!tourData) {
      return null
    }

    // Wingside: consultative hi-fi TourDetailPage (Open Design lock).
    // Keep wrapper-page gate so only linked TourProduct pages resolve.
    if (site.code === 'wing-side') {
      if (!hasMatchingWingSideTourWrapper(tourData.tour, wrapperPageID)) notFound()
      const enquiryContext = readSafeTourEnquiryContext(searchParams)
      const contactPage = await queryPageByPath({
        depth: 0,
        locale,
        requestedPath: '/contact-us',
      })
      let enquiryForm = (
        contactPage as {
          wingsSideHiFi?: { contact?: { form?: PayloadForm | number | string | null } }
        } | null
      )?.wingsSideHiFi?.contact?.form
      if (enquiryForm != null && typeof enquiryForm !== 'object') {
        const payload = await getPayload({ config: configPromise })
        enquiryForm = await payload.findByID({
          collection: 'forms',
          depth: 2,
          id: enquiryForm,
          overrideAccess: draft,
        })
      }
      return (
        <TourDetailPage
          data={tourData}
          discoveryContext={
            enquiryContext.discovery ? { discovery: enquiryContext.discovery } : undefined
          }
          enquiryForm={
            enquiryForm && typeof enquiryForm === 'object'
              ? (enquiryForm as unknown as FormType)
              : null
          }
          locale={locale}
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
