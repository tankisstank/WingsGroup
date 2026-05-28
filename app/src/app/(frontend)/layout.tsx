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
import { draftMode } from 'next/headers'

import './globals.css'
import { getServerSideURL } from '@/utilities/getURL'
import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import { getCurrentLocale } from '@/utilities/siteContext'
import { getSiteThemeTokens } from '@/utilities/siteTheme'
import { buildOrganizationJSONLD, buildWebSiteJSONLD } from '@/utilities/structuredData'
import { getCanonicalURL, normalizeCanonicalDomain } from '@/utilities/siteURLs'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()
  const settings = await getCurrentSiteSettings()
  const locale = await getCurrentLocale()
  const siteTheme = getSiteThemeTokens(settings)

  return (
    <html className={cn(GeistSans.variable, GeistMono.variable)} lang={locale} suppressHydrationWarning>
      <head>
        <InitTheme />
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
        <meta content={siteTheme.brandColor} name="theme-color" />
      </head>
      <body data-site-theme={siteTheme.themeName} style={siteTheme.style}>
        <JsonLd data={[buildOrganizationJSONLD(settings), buildWebSiteJSONLD(settings)]} />
        <Providers>
          <AdminBar
            adminBarProps={{
              preview: isEnabled,
            }}
          />

          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCurrentSiteSettings()
  const defaultTitle = settings?.seo?.defaultTitle || settings?.siteName || 'WingsTravel'
  const titleSuffix = settings?.seo?.titleSuffix
  const title = [defaultTitle, titleSuffix].filter(Boolean).join(' | ')
  const description = settings?.seo?.defaultDescription || settings?.tagline || defaultTitle
  const canonicalURL = getCanonicalURL({ settings })
  const image =
    settings?.seo?.defaultImage &&
    typeof settings.seo.defaultImage === 'object' &&
    'url' in settings.seo.defaultImage &&
    settings.seo.defaultImage.url
      ? `${getServerSideURL()}${settings.seo.defaultImage.sizes?.og?.url || settings.seo.defaultImage.url}`
      : `${getServerSideURL()}/website-template-OG.webp`

  return {
    description,
    metadataBase: new URL(normalizeCanonicalDomain(settings?.seo?.canonicalDomain)),
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
      creator: '@wingstravel',
      title,
      description,
      images: [image],
    },
  }
}
