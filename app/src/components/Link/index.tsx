'use client'

import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/utilities/ui'
import Link from 'next/link'
import React from 'react'

import type { Page, Post } from '@/payload-types'
import { getPageCanonicalPath } from '@/utilities/siteURLs'
import { useSitePath } from '@/utilities/useSitePath'

type CMSLinkType = {
  ariaLabel?: string
  appearance?: 'inline' | ButtonProps['variant']
  children?: React.ReactNode
  className?: string
  label?: string | null
  newTab?: boolean | null
  onClick?: React.MouseEventHandler<HTMLAnchorElement>
  reference?: {
    relationTo: 'pages' | 'posts'
    value: Page | Post | string | number
  } | null
  size?: ButtonProps['size'] | null
  type?: 'custom' | 'reference' | null
  url?: string | null
}

export const CMSLink: React.FC<CMSLinkType> = (props) => {
  const toSitePath = useSitePath()
  const {
    ariaLabel,
    type,
    appearance = 'inline',
    children,
    className,
    label,
    newTab,
    onClick,
    reference,
    size: sizeFromProps,
    url,
  } = props

  const href =
    type === 'reference' && typeof reference?.value === 'object'
      ? reference?.relationTo === 'pages'
        ? getPageCanonicalPath(reference.value as Page)
        : reference.value.slug
          ? `/${reference?.relationTo}/${reference.value.slug}`
          : null
      : url

  if (!href) return null

  const siteAwareHref = toSitePath(href)

  const size = appearance === 'link' ? 'clear' : sizeFromProps
  const newTabProps = newTab ? { rel: 'noopener noreferrer', target: '_blank' } : {}

  /* Ensure we don't break any styles set by richText */
  if (appearance === 'inline') {
    return (
      <Link
        aria-label={ariaLabel}
        className={cn(className)}
        href={siteAwareHref}
        onClick={onClick}
        {...newTabProps}
      >
        {label && label}
        {children && children}
      </Link>
    )
  }

  return (
    <Button asChild className={className} size={size} variant={appearance}>
      <Link
        aria-label={ariaLabel}
        className={cn(className)}
        href={siteAwareHref}
        onClick={onClick}
        {...newTabProps}
      >
        {label && label}
        {children && children}
      </Link>
    </Button>
  )
}
