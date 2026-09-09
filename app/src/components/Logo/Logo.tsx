'use client'

import clsx from 'clsx'
import NextImage from 'next/image'
import React from 'react'

import type { Media } from '@/payload-types'

import { useHeaderTheme } from '@/providers/HeaderTheme'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { WINGSGROUP_BRAND, isWingsGroupBrandSite } from '@/wingsgroup/brand'
import {
  getSiteBrandAssetURL,
  getSiteLogoAltText,
  getSiteOwnedMedia,
} from '@/utilities/siteBranding'

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
  variant?: 'auto' | 'primary' | 'reverse'
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
    variant = 'auto',
  } = props

  const { headerTheme } = useHeaderTheme()
  const resolvedVariant =
    variant === 'auto' ? (headerTheme === 'dark' ? 'reverse' : 'primary') : variant
  const loading = loadingFromProps || 'lazy'
  const priority = priorityFromProps || 'low'
  const selectedLogoImage = resolvedVariant === 'reverse' ? logoReverseImage : logoImage
  const ownedLogoImage = getSiteOwnedMedia(selectedLogoImage, siteID)
  const logoImageUrl = ownedLogoImage?.url
    ? getMediaUrl(ownedLogoImage.url, ownedLogoImage.updatedAt)
    : ''
  const staticLogoURL =
    getSiteBrandAssetURL(siteCode, resolvedVariant === 'reverse' ? 'logoReverse' : 'logoPrimary') ||
    (isWingsGroupBrandSite(siteCode) && resolvedVariant === 'primary'
      ? WINGSGROUP_BRAND.assets.logoPrimary
      : '')
  const label = getSiteLogoAltText(siteCode) || logoText || ownedLogoImage?.alt || 'Site logo'
  const isPriorityImage = priority === 'high'
  const preferStaticBrandAsset = siteCode === 'wings-go' || siteCode === 'wing-side'
  const resolvedLogoImage =
    !preferStaticBrandAsset && logoImageUrl && ownedLogoImage ? ownedLogoImage : null
  const resolvedStaticLogoURL = staticLogoURL || (!resolvedLogoImage ? logoImageUrl : null)

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
        data-logo-variant={resolvedVariant}
        data-site-code={siteCode || undefined}
      >
        <NextImage
          alt={label}
          className={clsx(
            'site-logo-image w-auto object-contain',
            isWingsGroupBrandSite(siteCode)
              ? 'h-12 md:h-14 lg:h-16 max-w-[210px]'
              : 'h-12 max-w-[160px]',
          )}
          height={resolvedLogoImage?.height || (isWingsGroupBrandSite(siteCode) ? 60 : 280)}
          loading={isPriorityImage ? undefined : loading}
          priority={isPriorityImage}
          src={resolvedLogoImage ? logoImageUrl : resolvedStaticLogoURL!}
          unoptimized
          width={resolvedLogoImage?.width || (isWingsGroupBrandSite(siteCode) ? 180 : 448)}
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
