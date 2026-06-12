'use client'
import { cn } from '@/utilities/ui'
import useClickableCard from '@/utilities/useClickableCard'
import { useSitePath } from '@/utilities/useSitePath'
import { ArrowRightIcon, CameraIcon, MapPinnedIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

import type { Post } from '@/payload-types'

import { Media } from '@/components/Media'
import { getLocaleFromPathname } from '@/utilities/sitePaths'
export type CardPostData = Pick<Post, 'slug' | 'categories' | 'meta' | 'title'>

export const Card: React.FC<{
  alignItems?: 'center'
  className?: string
  doc?: CardPostData
  relationTo?: 'posts'
  showCategories?: boolean
  title?: string
}> = (props) => {
  const { card, link } = useClickableCard({})
  const toSitePath = useSitePath()
  const pathname = usePathname()
  const locale = getLocaleFromPathname(pathname) || 'vi'
  const { className, doc, relationTo, showCategories, title: titleFromProps } = props

  const { slug, categories, meta, title } = doc || {}
  const { description, image: metaImage } = meta || {}

  const hasCategories = categories && Array.isArray(categories) && categories.length > 0
  const titleToUse = titleFromProps || title
  const sanitizedDescription = description?.replace(/\s/g, ' ') // replace non-breaking space with white space
  const href = toSitePath(`/${relationTo}/${slug}`)

  return (
    <article
      className={cn(
        'site-travel-card border border-border rounded-lg overflow-hidden bg-card hover:cursor-pointer',
        className,
      )}
      ref={card.ref}
    >
      <div className="site-travel-card__media relative w-full">
        {!metaImage && (
          <div className="site-travel-card__fallback" aria-hidden="true">
            <CameraIcon className="h-8 w-8" />
          </div>
        )}
        {metaImage && typeof metaImage !== 'string' && <Media imgClassName="site-travel-card__image" resource={metaImage} size="33vw" />}
      </div>
      <div className="p-4">
        {showCategories && hasCategories && (
          <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--site-brand)]">
            {categories?.map((category, index) => {
              if (typeof category === 'object') {
                const { title: titleFromCategory } = category

                const categoryTitle =
                  titleFromCategory || (locale === 'en' ? 'Untitled category' : 'Danh mục chưa đặt tên')

                return (
                  <span className="site-travel-card__chip" key={index}>
                    <MapPinnedIcon aria-hidden="true" className="h-3.5 w-3.5" />
                    {categoryTitle}
                  </span>
                )
              }

              return null
            })}
          </div>
        )}
        {titleToUse && (
          <div className="prose">
            <h3>
              <Link className="not-prose" href={href} ref={link.ref}>
                {titleToUse}
              </Link>
            </h3>
          </div>
        )}
        {description && <div className="mt-2">{description && <p>{sanitizedDescription}</p>}</div>}
        <div className="site-travel-card__cta">
          <span>{locale === 'en' ? 'View details' : 'Xem chi tiết'}</span>
          <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
        </div>
      </div>
    </article>
  )
}
