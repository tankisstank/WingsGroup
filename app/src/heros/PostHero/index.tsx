import { formatDateTime } from '@/utilities/formatDateTime'
import React from 'react'

import type { Post } from '@/payload-types'

import { Media } from '@/components/Media'
import { formatAuthors } from '@/utilities/formatAuthors'
import { getCopyLocale } from '@/utilities/locales'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'

export const PostHero: React.FC<{
  locale?: SupportedLocaleCode
  post: Post
}> = ({ locale = 'vi', post }) => {
  const { categories, heroImage, populatedAuthors, publishedAt, title } = post
  const copy = {
    en: {
      author: 'Author',
      publishedAt: 'Date Published',
      untitledCategory: 'Untitled category',
    },
    vi: {
      author: 'Tác giả',
      publishedAt: 'Ngày xuất bản',
      untitledCategory: 'Danh mục chưa đặt tên',
    },
  }[getCopyLocale(locale)]

  const hasAuthors =
    populatedAuthors && populatedAuthors.length > 0 && formatAuthors(populatedAuthors) !== ''

  return (
    <section className="relative overflow-hidden bg-neutral-950 text-white">
      <div className="absolute inset-0 z-0 select-none">
        {heroImage && typeof heroImage !== 'string' && (
          <Media fill priority imgClassName="object-cover opacity-75" resource={heroImage} />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/55 to-black/20" />
      </div>

      <div className="container relative z-10 grid min-h-[22rem] items-end py-12 md:min-h-[28rem] md:py-16 lg:grid-cols-[1fr_48rem_1fr]">
        <div className="col-start-1 col-span-1 md:col-start-2 md:col-span-2">
          <div className="uppercase text-sm mb-6">
            {categories?.map((category, index) => {
              if (typeof category === 'object' && category !== null) {
                const { title: categoryTitle } = category

                const titleToUse = categoryTitle || copy.untitledCategory

                const isLast = index === categories.length - 1

                return (
                  <React.Fragment key={index}>
                    {titleToUse}
                    {!isLast && <React.Fragment>, &nbsp;</React.Fragment>}
                  </React.Fragment>
                )
              }
              return null
            })}
          </div>

          <div className="">
            <h1 className="mb-6 text-3xl md:text-5xl lg:text-6xl">{title}</h1>
          </div>

          <div className="flex flex-col md:flex-row gap-4 md:gap-16">
            {hasAuthors && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-sm">{copy.author}</p>

                  <p>{formatAuthors(populatedAuthors)}</p>
                </div>
              </div>
            )}
            {publishedAt && (
              <div className="flex flex-col gap-1">
                <p className="text-sm">{copy.publishedAt}</p>

                <time dateTime={publishedAt}>{formatDateTime(publishedAt)}</time>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
