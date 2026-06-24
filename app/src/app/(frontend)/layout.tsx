import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import { Inter, Nunito_Sans, Playfair_Display, Rubik } from 'next/font/google'
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
import { getCurrentLocale } from '@/utilities/siteContext'
import { getSiteThemeTokens } from '@/utilities/siteTheme'
import { buildOrganizationJSONLD, buildWebSiteJSONLD } from '@/utilities/structuredData'
import {
  getAbsoluteMediaURL,
  getCanonicalURL,
  normalizeCanonicalDomain,
} from '@/utilities/siteURLs'
import { getMediaUrl } from '@/utilities/getMediaUrl'

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
  variable: '--font-wingsgo-heading',
})

const wingsGoBody = Nunito_Sans({
  display: 'swap',
  subsets: ['latin', 'latin-ext'],
  variable: '--font-wingsgo-body',
})

const wingsSideHeading = Playfair_Display({
  display: 'swap',
  subsets: ['latin', 'latin-ext'],
  variable: '--font-wingsside-heading',
})

const wingsSideBody = Inter({
  display: 'swap',
  subsets: ['latin', 'latin-ext'],
  variable: '--font-wingsside-body',
})

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()
  const settings = await getCurrentSiteSettings()
  const locale = await getCurrentLocale()
  const siteTheme = getSiteThemeTokens(settings)
  const faviconURL = getSiteFaviconURL(settings)

  return (
    <html
      className={cn(
        GeistSans.variable,
        GeistMono.variable,
        wingsGoHeading.variable,
        wingsGoBody.variable,
        wingsSideHeading.variable,
        wingsSideBody.variable,
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
        data-site-layout={siteTheme.layoutStyle}
        data-site-preset={siteTheme.themePreset}
        data-site-theme={siteTheme.themeKey}
        data-site-button-style={siteTheme.buttonStyle}
        style={siteTheme.style}
      >
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
  const defaultTitle = settings?.seo?.defaultTitle || settings?.siteName || 'WingsGroup'
  const titleSuffix = settings?.seo?.titleSuffix
  const title = [defaultTitle, titleSuffix].filter(Boolean).join(' | ')
  const description = settings?.seo?.defaultDescription || settings?.tagline || defaultTitle
  const canonicalURL = getCanonicalURL({ settings })
  const image = getAbsoluteMediaURL({
    media: settings?.seo?.defaultImage,
    settings,
  })

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
      creator: '@wingsgroup',
      title,
      description,
      images: [image],
    },
  }
}
