import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import { Inter, Nunito_Sans, Playfair_Display, Plus_Jakarta_Sans, Rubik } from 'next/font/google'
import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { JsonLd } from '@/components/JsonLd'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { draftMode } from 'next/headers'

import './globals.css'
import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import { getCurrentLocale, getCurrentPublicPathname } from '@/utilities/siteContext'
import { getSiteThemeTokens } from '@/utilities/siteTheme'
import { shouldRenderWingsSideSpecials } from '@/utilities/wingsSideSpecials'
import { getRuntimeLocaleCopy, publicChromeCopy } from '@/i18n/publicCopy'
import { buildOrganizationJSONLD, buildWebSiteJSONLD } from '@/utilities/structuredData'
import {
  buildConfiguredAbsoluteMediaURL,
} from '@/utilities/siteURLs'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { getCurrentSite } from '@/utilities/siteContext'
import { getCanonicalSiteOrigin, getSiteSitemapURL } from '@/utilities/siteSEO'
import { WingsSideSpecialsPromo } from '@/components/WingsSideSpecialsPromo'

const getSiteFaviconURL = (settings: Awaited<ReturnType<typeof getCurrentSiteSettings>>) => {
  const favicon = settings?.branding?.faviconImage

  if (!favicon || typeof favicon !== 'object' || !favicon.url) {
    return null
  }

  return getMediaUrl(favicon.url, favicon.updatedAt)
}

const wingsGoHeading = Rubik({
  display: 'swap',
  subsets: ['latin', 'latin-ext'],
  variable: '--font-retail-heading',
})

const wingsGoBody = Nunito_Sans({
  display: 'swap',
  subsets: ['latin', 'latin-ext'],
  variable: '--font-retail-body',
})

const wingsSideHeading = Playfair_Display({
  display: 'swap',
  subsets: ['latin', 'latin-ext'],
  variable: '--font-editorial-heading',
})

const wingsSideBody = Inter({
  display: 'swap',
  subsets: ['latin', 'latin-ext'],
  variable: '--font-editorial-body',
})

const wingsSideHiFi = Plus_Jakarta_Sans({
  display: 'swap',
  subsets: ['latin', 'latin-ext'],
  variable: '--font-wingsside-hifi',
})

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()
  const site = await getCurrentSite()
  const settings = await getCurrentSiteSettings()
  const locale = await getCurrentLocale()
  const publicPathname = await getCurrentPublicPathname()
  const canonicalOrigin = getCanonicalSiteOrigin({ settings, site })
  const siteTheme = getSiteThemeTokens(settings)
  const faviconURL = getSiteFaviconURL(settings)
  const chromeCopy = getRuntimeLocaleCopy(publicChromeCopy, locale)

  return (
    <html
      className={cn(
        GeistSans.variable,
        GeistMono.variable,
        wingsGoHeading.variable,
        wingsGoBody.variable,
        wingsSideHeading.variable,
        wingsSideBody.variable,
        wingsSideHiFi.variable,
      )}
      lang={locale}
      suppressHydrationWarning
    >
      <head>
        <InitTheme />
        {faviconURL ? (
          <>
            <link href={faviconURL} rel="icon" />
            <link href={faviconURL} rel="apple-touch-icon" />
          </>
        ) : (
          <>
            <link href="/favicon.ico" rel="icon" sizes="32x32" />
            <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
          </>
        )}
        <meta content={siteTheme.brandColor} name="theme-color" />
      </head>
      <body
        data-preview-mode={isEnabled ? 'true' : 'false'}
        data-site-layout={siteTheme.layoutStyle}
        data-site-preset={siteTheme.themePreset}
        data-site-theme={siteTheme.themeKey}
        data-theme-key={siteTheme.themeKey}
        data-public-pathname={publicPathname}
        data-site-button-style={siteTheme.buttonStyle}
        style={siteTheme.style}
      >
        <JsonLd
          data={[
            buildOrganizationJSONLD(settings, { canonicalOrigin }),
            buildWebSiteJSONLD(settings, { canonicalOrigin }),
          ]}
        />
        <Providers publicLocale={locale} publicPathname={publicPathname}>
          <a
            className="sr-only fixed left-4 top-4 z-[1000] rounded-md bg-white px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg focus:not-sr-only"
            href="#main-content"
          >
            {chromeCopy.skipToMain}
          </a>
          <AdminBar
            adminBarProps={{
              preview: isEnabled,
            }}
          />

          <Header />
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
  const image = buildConfiguredAbsoluteMediaURL({
    media: settings?.seo?.defaultImage,
    settings,
  })

  return {
    description,
    metadataBase: new URL(canonicalOrigin),
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
