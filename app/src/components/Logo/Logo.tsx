import clsx from 'clsx'
import NextImage from 'next/image'
import React from 'react'

import type { Media } from '@/payload-types'

import { getMediaUrl } from '@/utilities/getMediaUrl'

interface Props {
  accentColor?: null | string
  brandColor?: null | string
  className?: string
  loading?: 'lazy' | 'eager'
  logoImage?: Media | null
  logoText?: null | string
  priority?: 'auto' | 'high' | 'low'
}

export const Logo = (props: Props) => {
  const {
    accentColor,
    brandColor,
    loading: loadingFromProps,
    priority: priorityFromProps,
    className,
    logoImage,
    logoText,
  } = props

  const loading = loadingFromProps || 'lazy'
  const priority = priorityFromProps || 'low'
  const logoImageUrl = logoImage?.url ? getMediaUrl(logoImage.url, logoImage.updatedAt) : ''
  const label = logoText || logoImage?.alt || 'Site logo'
  const isPriorityImage = priority === 'high'
  const resolvedLogoImage = logoImageUrl && logoImage ? logoImage : null

  if (resolvedLogoImage) {
    return (
      <span
        aria-label={label}
        className={clsx('inline-flex items-center', className)}
        data-fetch-priority={priority}
        data-loading={loading}
      >
        <NextImage
          alt=""
          aria-hidden="true"
          className="site-logo-image h-12 w-auto max-w-[160px] object-contain"
          height={resolvedLogoImage.height || 96}
          loading={isPriorityImage ? undefined : loading}
          priority={isPriorityImage}
          src={logoImageUrl}
          unoptimized
          width={resolvedLogoImage.width || 320}
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
    >
      <span
        aria-hidden="true"
        className="site-logo-mark flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold shadow-sm"
        style={{
          '--site-accent': accentColor || undefined,
          '--site-brand': brandColor || undefined,
        } as React.CSSProperties}
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
