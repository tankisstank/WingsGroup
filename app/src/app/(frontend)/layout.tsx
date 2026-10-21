import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { JsonLd } from '@/components/JsonLd'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'

import './globals.css'
import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import { getCurrentLocale, getCurrentPublicPathname } from '@/utilities/siteContext'
import { getSiteThemeTokens } from '@/utilities/siteTheme'
import { shouldRenderWingsSideSpecials } from '@/utilities/wingsSideSpecials'
import { getRuntimeLocaleCopy, publicChromeCopy } from '@/i18n/publicCopy'
import { buildOrganizationJSONLD, buildWebSiteJSONLD } from '@/utilities/structuredData'
import { buildConfiguredAbsoluteMediaURL } from '@/utilities/siteURLs'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { getCurrentSite } from '@/utilities/siteContext'
import { isAuthorizedDraftMode } from '@/utilities/previewHandoff'
import { getCanonicalSiteOrigin, getSiteSitemapURL } from '@/utilities/siteSEO'
import { WingsSideSpecialsPromo } from '@/components/WingsSideSpecialsPromo'
import { getPublicRoutePathname } from '@/utilities/sitePaths'
import { getSiteBrandAssetURL, getSiteOwnedMedia } from '@/utilities/siteBranding'
import { SiteContactFab } from '@/components/SiteContactFab'
import { resolveSiteHotlines } from '@/utilities/siteHotlines'
import { isWingsGroupV3SurfacePath } from '@/wingsgroup/corporateRoutes'
import { WINGSGROUP_BRAND, isWingsGroupBrandSite } from '@/wingsgroup/brand'

const getSiteFaviconURL = (
  settings: Awaited<ReturnType<typeof getCurrentSiteSettings>>,
  siteID: number,
  siteCode: string,
) => {
  const favicon = settings?.branding?.faviconImage
  const ownedFavicon = getSiteOwnedMedia(favicon, siteID)
  const staticFavicon = isWingsGroupBrandSite(siteCode)
    ? WINGSGROUP_BRAND.assets.favicon
    : getSiteBrandAssetURL(siteCode, 'favicon')

  return (
    staticFavicon ||
    (ownedFavicon?.url ? getMediaUrl(ownedFavicon.url, ownedFavicon.updatedAt) : null)
  )
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const isEnabled = await isAuthorizedDraftMode()
  const site = await getCurrentSite()
  const settings = await getCurrentSiteSettings()
  const locale = await getCurrentLocale()
  const publicPathname = await getCurrentPublicPathname()
  const publicRoute = getPublicRoutePathname(publicPathname)
  const isWingsGroupV3Surface =
    site.code === 'wings-group' &&
    settings?.wingsGroupV3?.enabled === true &&
    isWingsGroupV3SurfacePath(publicRoute)
  const canonicalOrigin = getCanonicalSiteOrigin({ settings, site })
  const siteTheme = getSiteThemeTokens(settings, { siteCode: site.code })
  const faviconURL = getSiteFaviconURL(settings, site.id, site.code)
  const chromeCopy = getRuntimeLocaleCopy(publicChromeCopy, locale)
  const hotlines = resolveSiteHotlines(settings, site.code)

  return (
    <html
      className={cn(GeistSans.variable, GeistMono.variable)}
      data-theme={site.code === 'wings-group' ? 'light' : undefined}
      lang={locale}
      suppressHydrationWarning
    >
      <head>
        <InitTheme />
        {faviconURL ? (
          <>
            <link href={faviconURL} rel="icon" type="image/png" />
            <link href={faviconURL} rel="apple-touch-icon" />
          </>
        ) : null}
        <meta content={siteTheme.brandColor} name="theme-color" />
      </head>
      <body
        data-preview-mode={isEnabled ? 'true' : 'false'}
        data-site-layout={siteTheme.layoutStyle}
        data-site-preset={siteTheme.themePreset}
        data-site-theme={siteTheme.themeKey}
        data-theme-key={siteTheme.themeKey}
        data-site-code={site.code}
        data-wingsgroup-v3={settings?.wingsGroupV3?.enabled === true ? 'true' : 'false'}
        data-public-pathname={publicPathname}
        data-public-route={publicRoute}
        data-site-button-style={siteTheme.buttonStyle}
        style={siteTheme.style}
      >
        <JsonLd
          data={[
            buildOrganizationJSONLD(settings, { canonicalOrigin, siteCode: site.code }),
            buildWebSiteJSONLD(settings, { canonicalOrigin }),
          ]}
        />
        <Providers publicLocale={locale} publicPathname={publicPathname} siteCode={site.code}>
          <a
            className="sr-only fixed left-4 top-4 z-[1000] rounded-md bg-white px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg focus:not-sr-only"
            href="#main-content"
          >
            {chromeCopy.skipToMain}
          </a>
          {!isWingsGroupV3Surface ? <AdminBar adminBarProps={{ preview: isEnabled }} /> : null}

          <Header />
          <SiteContactFab hotlines={hotlines} locale={locale} siteCode={site.code} />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          {shouldRenderWingsSideSpecials(site.code, publicPathname) ? (
            <WingsSideSpecialsPromo href="/packages" locale={locale} />
          ) : null}
          <Footer />
        </Providers>
      </body>
    </html>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const site = await getCurrentSite()
  const settings = await getCurrentSiteSettings()
  const defaultTitle = settings?.seo?.defaultTitle || settings?.siteName || 'WingsGroup'
  const titleSuffix = settings?.seo?.titleSuffix
  const title = [defaultTitle, titleSuffix].filter(Boolean).join(' | ')
  const description = settings?.seo?.defaultDescription || settings?.tagline || defaultTitle
  const canonicalOrigin = getCanonicalSiteOrigin({ settings, site })
  const canonicalURL = getSiteSitemapURL({ origin: canonicalOrigin, path: '/' })
  const defaultImage = getSiteOwnedMedia(settings?.seo?.defaultImage, site.id)
  const fallbackOGImage = isWingsGroupBrandSite(site.code)
    ? WINGSGROUP_BRAND.assets.ogImage
    : getSiteBrandAssetURL(site.code, 'ogImage') || '/website-template-OG.webp'
  const image = buildConfiguredAbsoluteMediaURL({
    fallbackPath: fallbackOGImage,
    media: defaultImage,
    settings,
  })
  const faviconURL = getSiteFaviconURL(settings, site.id, site.code)
  const manifestURL = getSiteBrandAssetURL(site.code, 'manifest')

  return {
    description,
    metadataBase: new URL(canonicalOrigin),
    ...(faviconURL
      ? {
          icons: {
            apple: [{ url: faviconURL }],
            icon: [{ type: 'image/png', url: faviconURL }],
          },
        }
      : {}),
    ...(manifestURL ? { manifest: manifestURL } : {}),
    alternates: {
      canonical: canonicalURL,
    },
    openGraph: mergeOpenGraph({
      description,
      images: [
        {
          url: image,
        },
      ],
      siteName: settings?.siteName || defaultTitle,
      title,
      url: canonicalURL,
    }),
    title,
    twitter: {
      card: 'summary_large_image',
      creator: '@wingsgroup',
      title,
      description,
      images: [image],
    },
  }
}
