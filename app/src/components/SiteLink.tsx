'use client'

import Link from 'next/link'
import React from 'react'

import { useSitePath } from '@/utilities/useSitePath'

type Props = React.ComponentProps<typeof Link>

export const SiteLink: React.FC<Props> = ({ href, ...props }) => {
  const toSitePath = useSitePath()
  const resolvedHref = typeof href === 'string' ? toSitePath(href) : href

  return <Link href={resolvedHref} {...props} />
}
