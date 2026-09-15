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
import { WingsGoTourCatalogSection } from '@/tours/WingsGoTourCatalogSection'
import type { WingsGoCatalogPage } from '@/tours/wingsGoCatalog'
import { generateMeta } from '@/utilities/generateMeta'
import { getCurrentLocale, getCurrentSite, getCurrentSitePrefix } from '@/utilities/siteContext'
import { JsonLd } from '@/components/JsonLd'
import PageClient from './[...slug]/page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { RelatedPages } from '@/components/RelatedPages'
import {
  buildBreadcrumbListJSONLD,
  buildFAQPageJSONLD,
  buildWebPageJSONLD,
} from '@/utilities/structuredData'
import { buildPageBreadcrumbItems, type BreadcrumbPage } from '@/utilities/breadcrumbs'
import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import { getPageCanonicalPath } from '@/utilities/siteURLs'
import { getCopyLocale } from '@/utilities/locales'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import { getCanonicalSiteOrigin } from '@/utilities/siteSEO'
import { queryPublishedPageLocalesByExactPath } from '@/utilities/pageLocaleInventory'
import {
  getWingsGroupRouteDefinition,
  isWingsGroupPendingPolicyRouteRenderable,
} from '@/wingsgroup/corporateRoutes'
import { queryPageByPath } from '@/utilities/cmsPageQuery'
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
import { WingsGroupConsultationDialog } from '@/components/WingsGroupV3/ConsultationDialog'
import {
  getWingsGroupEditorialArchiveOpenGraphMedia,
  queryWingsGroupEditorialFallbackMedia,
  WINGSGROUP_EDITORIAL_ARCHIVE_PATH,
} from '@/utilities/wingsGroupEditorial'
import { hydrateWingsSideHomeCuration, projectWingsSideHomeCuration } from '@/tours/homeCuration'
import type { Form as FormType } from '@payloadcms/plugin-form-builder/types'
import type { Form as PayloadForm } from '@/payload-types'
import { hasAuthorizedPreviewHandoff, isAuthorizedDraftMode } from '@/utilities/previewHandoff'

type CmsPathArgs = {
  requestedPath: string
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export async function renderCmsPageByPath({
  requestedPath,
  searchParams: searchParamsPromise,
}: CmsPathArgs) {
  const draft = await isAuthorizedDraftMode()
  const preview = draft || (await hasAuthorizedPreviewHandoff())
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
  const canonicalPath = getPageCanonicalPath(page, locale, site.defaultLocale)
  const breadcrumbItems = buildPageBreadcrumbItems({
    defaultLocale: site.defaultLocale,
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
  const pageWithWingsGoCatalog = page as typeof page & {
    wingsGoTourCatalog?: { enabled?: boolean | null } | null
  }
  const useWingsGoTourCatalog =
    !isStructuredTour &&
    site.code === 'wings-go' &&
    requestedPath === '/tour' &&
    pageWithWingsGoCatalog.wingsGoTourCatalog?.enabled === true
  const catalogLayout = useWingsGoTourCatalog
    ? page.layout.filter((block) => {
        const candidate = block as { blockType?: string; title?: string | null }
        return !(
          candidate.blockType === 'featureGrid' &&
          (candidate.title === 'Các chương trình outbound nổi bật' ||
            candidate.title === 'Current outbound highlights')
        )
      })
    : page.layout
  const renderedBreadcrumbItems = isStructuredTour
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
  const wingsGroupRoute =
    site.code === 'wings-group' && settings?.wingsGroupV3?.enabled === true
      ? getWingsGroupRouteDefinition(requestedPath)
      : null
  const useWingsGroupV3Surface = Boolean(wingsGroupRoute)
  const isWingsGroupV3LocalPreview = draft && useWingsGroupV3Surface
  const isWingsGroupPendingPolicy = Boolean(page && '__wingsGroupPendingPolicy' in page)

  return (
    <article
      className={[
        useWingsGroupV3Home ? 'wingsgroup-v3-home' : '',
        useWingsGroupV3Surface ? 'wingsgroup-v3-surface' : '',
        isWingsGroupPendingPolicy ? 'wingsgroup-v3-route-policy' : '',
        useHiFiBody ? 'pb-16 md:pb-20' : isStructuredTour ? 'pb-16 md:pb-20' : 'pt-16 pb-24',
      ]
        .filter(Boolean)
        .join(' ')}
      data-hifi-body={useHiFiBody || isWingsGroupV3LocalPreview ? 'true' : 'false'}
      data-wingsgroup-v3-home={useWingsGroupV3Home ? 'true' : 'false'}
      data-wingsgroup-v3-surface={useWingsGroupV3Surface ? 'true' : 'false'}
      data-wingsgroup-pending-policy={isWingsGroupPendingPolicy ? 'true' : 'false'}
      data-wingsgroup-v3-route={wingsGroupRoute?.archetype}
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
          // Only emit Q&A that this route renders through RenderBlocks. Hi-fi
          // and structured-tour pages have separate bodies and therefore do
          // not inherit FAQ markup from their unused CMS layout.
          !structuredPage && !useHiFiBody ? buildFAQPageJSONLD(catalogLayout) : null,
        ]}
      />
      <PageClient />
      <PayloadRedirects disableNotFound url={url} />

      {preview ? (
        <LivePreviewListener
          previewIdentity={{
            collection: 'pages',
            documentID: page.id,
            locale,
            mode: page._status === 'draft' ? 'draft' : 'published',
            path: getPageCanonicalPath(page),
            siteCode: site.code,
          }}
        />
      ) : null}

      {!useHiFiBody ? (
        <Breadcrumbs
          className={
            useWingsGroupV3Surface
              ? 'wingsgroup-v3-breadcrumb container'
              : isStructuredTour
                ? 'wingsside-tour-breadcrumb container pb-3 pt-4 md:pt-5'
                : undefined
          }
          items={renderedBreadcrumbItems}
          linkClassName={
            useWingsGroupV3Surface
              ? 'wingsgroup-v3-breadcrumb__link'
              : isStructuredTour
                ? 'wingsside-tour-breadcrumb__link'
                : undefined
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
            allowWingsGroupDevelopmentMedia={draft && useWingsGroupV3Surface}
            wingsGroupV3Enabled={useWingsGroupV3Surface}
          />
          {useWingsGoTourCatalog ? (
            <WingsGoTourCatalogSection
              page={page as unknown as WingsGoCatalogPage}
              searchParams={searchParams}
              site={site}
            />
          ) : null}
          <RenderBlocks
            blocks={catalogLayout}
            locale={locale}
            siteCode={site.code}
            wingsGroupV3={site.code === 'wings-group'}
            wingsGroupLegalIdentity={settings?.wingsGroupV3?.legalIdentity}
            allowWingsGroupDevelopmentMedia={draft && useWingsGroupV3Surface}
            wingsGroupV3Home={useWingsGroupV3Home}
            wingsGroupV3Route={wingsGroupRoute?.archetype}
          />
          {useWingsGroupV3Surface ? <WingsGroupConsultationDialog /> : null}
          {!useWingsGroupV3Home && !useWingsGroupV3Surface ? (
            <RelatedPages locale={locale} pages={relatedPages} />
          ) : null}
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
  const settings = await getCurrentSiteSettings()
  const editorialArchiveOpenGraphMedia =
    page &&
    site.code === 'wings-group' &&
    settings?.wingsGroupV3?.enabled === true &&
    requestedPath === WINGSGROUP_EDITORIAL_ARCHIVE_PATH
      ? getWingsGroupEditorialArchiveOpenGraphMedia(
          await queryWingsGroupEditorialFallbackMedia({ locale: locale === 'en' ? 'en' : 'vi' }),
        )
      : null
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
        title: `${cleanTitle} | WingSide`,
      },
      locale,
      path: requestedPath,
    })
  }

  const metadata = await generateMeta({
    alternateLocales,
    doc: editorialArchiveOpenGraphMedia
      ? {
          ...page,
          meta: { ...(page?.meta || {}), image: editorialArchiveOpenGraphMedia },
        }
      : page,
    locale,
    path: requestedPath,
  })

  if (
    page &&
    ('__wingsGroupPendingPolicy' in page ||
      isWingsGroupPendingPolicyRouteRenderable({
        locale,
        page,
        settings,
        siteCode: site.code,
      }))
  ) {
    return {
      ...metadata,
      robots: {
        follow: false,
        index: false,
      },
    }
  }

  return metadata
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
  const draft = await isAuthorizedDraftMode()
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
