'use client'

import type { StaticImageData } from 'next/image'

import { cn } from '@/utilities/ui'
import NextImage from 'next/image'
import React from 'react'

import type { Props as MediaProps } from '../types'

import { cssVariables } from '@/cssVariables'
import { isWingsGroupPublishedMedia } from '@/components/WingsGroupV3/model'
import { getMediaUrl } from '@/utilities/getMediaUrl'

const { breakpoints } = cssVariables

// A base64 encoded image to use as a placeholder while the image is loading
const placeholderBlur =
  'data:image/png;base64,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'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isPublicMediaRoute = (value: string): boolean => {
  if (value.startsWith('/media/')) return true

  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    return (
      (host === 'wingsgroup.vn' ||
        host === 'www.wingsgroup.vn' ||
        host === 'wingsgo.vn' ||
        host === 'www.wingsgo.vn' ||
        host === 'wingsside.vn' ||
        host === 'www.wingsside.vn' ||
        host === 'localhost' ||
        host === '127.0.0.1') &&
      url.pathname.startsWith('/media/')
    )
  } catch {
    return false
  }
}

interface DerivativeEntry {
  format: 'avif' | 'webp'
  url: string
  width: number
}

const getGeneratedDerivativeEntries = (resource: unknown): DerivativeEntry[] => {
  const record = isRecord(resource) ? resource : {}

  return Object.entries(isRecord(record.sizes) ? record.sizes : {}).flatMap(([name, value]) => {
    const match = /^wingsgroup-v3-(640|960|1440)-(avif|webp)$/u.exec(name)
    if (!match || !isRecord(value)) return []

    const filename = typeof value.filename === 'string' && value.filename.trim() ? value.filename.trim() : ''
    const url =
      typeof value.url === 'string' && value.url.trim()
        ? value.url.trim()
        : filename
          ? `/api/media/file/${filename}`
          : ''
    if (!url) return []

    // AC6 WP1: Use verified metadata width; drop missing/invalid width, never advertise 1440w purely from size name
    const rawWidth = value.width
    const width =
      typeof rawWidth === 'number' && Number.isFinite(rawWidth) && rawWidth > 0
        ? Math.round(rawWidth)
        : null
    if (!width) return []

    return [{ format: match[2] as 'avif' | 'webp', url, width }]
  })
}

export const ImageMedia: React.FC<MediaProps> = (props) => {
  const {
    alt: altFromProps,
    fill,
    pictureClassName,
    imgClassName,
    priority,
    resource,
    size: sizeFromProps,
    src: srcFromProps,
    loading: loadingFromProps,
    onLoad,
    onError,
  } = props

  let width: number | undefined
  let height: number | undefined
  const resourceAlt =
    resource && typeof resource === 'object'
      ? resource.alt ||
        resource.filename
          ?.replace(/\.[^.]+$/, '')
          .replace(/[-_]+/g, ' ')
          .trim()
      : undefined
  const alt = altFromProps ?? resourceAlt
  let src: StaticImageData | string = srcFromProps || ''

  if (!src && resource && typeof resource === 'object') {
    const { height: fullHeight, url, width: fullWidth } = resource

    width = fullWidth!
    height = fullHeight!

    const cacheTag = resource.updatedAt

    src = getMediaUrl(url, cacheTag)
  }

  const useDirectMediaRoute = typeof src === 'string' && isPublicMediaRoute(src)
  const isGoverned =
    Boolean(resource &&
    typeof resource === 'object' &&
    resource.governance?.managedBy === 'wingsgroup-v3')

  const useAuthenticatedPreviewImage =
    isGoverned &&
    resource &&
    typeof resource === 'object' &&
    resource.governance?.publicationState !== 'published'

  // Governance gate:
  // For WingsGroup governed media: only published media may emit responsive derivatives (pending stays protected).
  // For tenant media (e.g. WingsGo / WingsSide without Group governance): public-on-upload allows using derivatives.
  const canUseResponsiveDerivatives = Boolean(
    resource &&
      typeof resource === 'object' &&
      (!isGoverned || isWingsGroupPublishedMedia(resource)),
  )

  const responsiveSources =
    canUseResponsiveDerivatives && resource && typeof resource === 'object'
      ? (['avif', 'webp'] as const).map((format) => {
          const generatedEntries = getGeneratedDerivativeEntries(resource)
          const fallbackGovernanceEntries: DerivativeEntry[] = (
            isWingsGroupPublishedMedia(resource) ? resource.governance?.responsiveDerivatives || [] : []
          )
            .filter(
              (entry) =>
                (entry.format === 'avif' || entry.format === 'webp') &&
                Boolean(entry.url) &&
                typeof entry.width === 'number' &&
                entry.width > 0,
            )
            .map((entry) => ({
              format: entry.format as 'avif' | 'webp',
              url: entry.url,
              width: entry.width,
            }))

          const rawEntries = generatedEntries.length > 0 ? generatedEntries : fallbackGovernanceEntries
          const sortedEntries = rawEntries
            .filter((entry) => entry.format === format && Boolean(entry.url) && entry.width > 0)
            .sort((left, right) => left.width - right.width)

          // Deduplicate widths per format (never emit duplicate width candidates)
          const uniqueByWidth: DerivativeEntry[] = []
          const seenWidths = new Set<number>()
          for (const entry of sortedEntries) {
            if (!seenWidths.has(entry.width)) {
              seenWidths.add(entry.width)
              uniqueByWidth.push(entry)
            }
          }

          return {
            format,
            srcSet: uniqueByWidth
              .map((entry) => `${getMediaUrl(entry.url, resource.updatedAt)} ${entry.width}w`)
              .join(', '),
          }
        })
      : []

  const hasResponsiveSources = responsiveSources.some(({ srcSet }) => Boolean(srcSet))

  // When responsive picture sources exist, do NOT let NextImage priority inject a preload
  // tag for the fallback original JPEG/PNG (prevents double fetch).
  // Hero still receives eager loading & high fetch priority.
  const nextImagePriority = hasResponsiveSources ? false : Boolean(priority)
  const loading = priority ? 'eager' : loadingFromProps || 'lazy'
  const fetchPriority = priority ? 'high' : undefined

  // NOTE: this is used by the browser to determine which image to download at different screen sizes
  const sizes =
    sizeFromProps ||
    `(max-width: ${breakpoints.md}px) 100vw, (max-width: ${breakpoints.xl}px) 50vw, 33vw`

  return (
    <picture className={cn(fill && 'relative block', pictureClassName)}>
      {responsiveSources
        .filter(({ srcSet }) => Boolean(srcSet))
        .map(({ format, srcSet }) => (
          <source key={format} sizes={sizes} srcSet={srcSet} type={`image/${format}`} />
        ))}
      <NextImage
        alt={alt || ''}
        className={cn(imgClassName)}
        fill={fill}
        fetchPriority={fetchPriority}
        height={!fill ? height : undefined}
        placeholder="blur"
        blurDataURL={placeholderBlur}
        priority={nextImagePriority ? true : undefined}
        quality={80}
        unoptimized={Boolean(useAuthenticatedPreviewImage || useDirectMediaRoute)}
        loading={loading}
        onLoad={onLoad}
        onError={onError}
        sizes={sizes}
        src={src}
        width={!fill ? width : undefined}
      />
    </picture>
  )
}
