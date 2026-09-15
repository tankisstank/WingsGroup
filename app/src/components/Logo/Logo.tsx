'use client'

import clsx from 'clsx'
import NextImage from 'next/image'
import React from 'react'

import type { Media } from '@/payload-types'

import { useHeaderTheme } from '@/providers/HeaderTheme'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { WINGSGROUP_BRAND, isWingsGroupBrandSite } from '@/wingsgroup/brand'
import {
  getSiteBrandAssetMetadata,
  getSiteBrandAssetURL,
  getSiteLogoAltText,
  getSiteOwnedMedia,
  normalizeChildSiteBrandCode,
} from '@/utilities/siteBranding'

export type LogoSurface = 'compact-header' | 'footer' | 'header' | 'social'

interface Props {
  accentColor?: null | string
  brandColor?: null | string
  className?: string
  loading?: 'lazy' | 'eager'
  logoImage?: Media | null
  logoReverseImage?: Media | null
  logoText?: null | string
  priority?: 'auto' | 'high' | 'low'
  siteID?: null | number | string
  siteCode?: null | string
  surface?: LogoSurface
  variant?: 'auto' | 'mark' | 'primary' | 'reverse'
}

export const Logo = (props: Props) => {
  const {
    accentColor,
    brandColor,
    loading: loadingFromProps,
    priority: priorityFromProps,
    className,
    logoImage,
    logoReverseImage,
    logoText,
    siteID,
    siteCode,
    surface = 'header',
    variant = 'auto',
  } = props

  const { headerTheme } = useHeaderTheme()
  const resolvedVariant =
    variant === 'auto'
      ? surface === 'compact-header'
        ? 'mark'
        : headerTheme === 'dark'
          ? 'reverse'
          : 'primary'
      : variant
  const loading = loadingFromProps || 'lazy'
  const priority = priorityFromProps || 'low'
  const selectedLogoImage = resolvedVariant === 'reverse' ? logoReverseImage : logoImage
  const ownedLogoImage = getSiteOwnedMedia(selectedLogoImage, siteID)
  const logoImageUrl = ownedLogoImage?.url
    ? getMediaUrl(ownedLogoImage.url, ownedLogoImage.updatedAt)
    : ''
  const staticAssetKey =
    resolvedVariant === 'reverse'
      ? 'logoReverse'
      : resolvedVariant === 'mark'
        ? 'mark'
        : 'logoPrimary'
  const staticLogoURL =
    getSiteBrandAssetURL(siteCode, staticAssetKey) ||
    (isWingsGroupBrandSite(siteCode) ? WINGSGROUP_BRAND.assets[staticAssetKey] : '')
  const staticLogoMetadata = isWingsGroupBrandSite(siteCode)
    ? {
        dimensions: WINGSGROUP_BRAND.assetContract.dimensions[staticAssetKey],
        sha256: WINGSGROUP_BRAND.assetIntegrity[staticAssetKey],
      }
    : getSiteBrandAssetMetadata(siteCode, staticAssetKey)
  const label = getSiteLogoAltText(siteCode) || logoText || ownedLogoImage?.alt || 'Site logo'
  const isPriorityImage = priority === 'high'
  const preferStaticBrandAsset = normalizeChildSiteBrandCode(siteCode) !== null
  const resolvedLogoImage =
    resolvedVariant !== 'mark' && !preferStaticBrandAsset && logoImageUrl && ownedLogoImage
      ? ownedLogoImage
      : null
  const resolvedStaticLogoURL = staticLogoURL || (!resolvedLogoImage ? logoImageUrl : null)
  const [staticWidth, staticHeight] = staticLogoMetadata?.dimensions || []
  const imageWidth =
    resolvedLogoImage?.width || staticWidth || (isWingsGroupBrandSite(siteCode) ? 373 : 448)
  const imageHeight =
    resolvedLogoImage?.height || staticHeight || (isWingsGroupBrandSite(siteCode) ? 280 : 280)
  const logoSizeClass =
    resolvedVariant === 'mark'
      ? 'site-logo-image--mark h-10 w-10 md:h-11 md:w-11'
      : isWingsGroupBrandSite(siteCode)
        ? 'site-logo-image--wingsgroup h-16 max-w-[110px] md:h-[68px] md:max-w-[120px]'
        : surface === 'footer'
          ? 'site-logo-image--child h-12 max-w-[96px]'
          : 'site-logo-image--child h-14 max-w-[110px]'

  if (resolvedLogoImage || resolvedStaticLogoURL) {
    return (
      <span
        aria-label={label}
        className={clsx('inline-flex items-center', className)}
        data-fetch-priority={priority}
        data-loading={loading}
        data-logo-source={
          resolvedLogoImage
            ? 'cms'
            : isWingsGroupBrandSite(siteCode)
              ? 'wingsgroup-brand-kit'
              : 'brand-manifest'
        }
        data-logo-surface={surface}
        data-logo-variant={resolvedVariant}
        data-site-code={siteCode || undefined}
      >
        <NextImage
          alt={label}
          className={clsx('site-logo-image w-auto object-contain', logoSizeClass)}
          height={imageHeight}
          loading={isPriorityImage ? undefined : loading}
          priority={isPriorityImage}
          src={resolvedLogoImage ? logoImageUrl : resolvedStaticLogoURL!}
          unoptimized
          width={imageWidth}
        />
      </span>
    )
  }

  return (
    <span
      aria-label={label}
      className={clsx('inline-flex items-center gap-3', className)}
      data-fetch-priority={priority}
      data-loading={loading}
      data-logo-surface={surface}
      data-logo-variant={resolvedVariant}
      data-site-code={siteCode || undefined}
    >
      <span
        aria-hidden="true"
        className="site-logo-mark flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold shadow-sm"
        style={
          {
            '--site-accent': accentColor || undefined,
            '--site-brand': brandColor || undefined,
          } as React.CSSProperties
        }
      >
        {(logoText || 'WT')
          .split(/\s+/)
          .filter(Boolean)
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()}
      </span>
      <span className="flex flex-col leading-none">
        <span
          className="site-logo-text text-base font-semibold tracking-tight"
          style={{ '--site-brand': brandColor || undefined } as React.CSSProperties}
        >
          {logoText || 'WingsGroup'}
        </span>
      </span>
    </span>
  )
}
