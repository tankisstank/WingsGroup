import type { Post, ArchiveBlock as ArchiveBlockProps } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import RichText from '@/components/RichText'

import { CollectionArchive } from '@/components/CollectionArchive'
import { appendSiteWhere, getCurrentSite } from '@/utilities/siteContext'
import { WINGSGROUP_EDITORIAL_ARCHIVE_PATH } from '@/utilities/wingsGroupEditorial'

export const ArchiveBlock: React.FC<
  ArchiveBlockProps & {
    id?: string
  }
> = async (props) => {
  const {
    id,
    categories,
    introContent,
    limit: limitFromProps,
    populateBy,
    presentation = 'card-grid',
    selectedDocs,
  } = props

  const limit = limitFromProps || 3
  const site = await getCurrentSite()
  const postPath = site.code === 'wings-group' ? WINGSGROUP_EDITORIAL_ARCHIVE_PATH : '/posts'

  let posts: Post[] = []

  if (populateBy === 'collection') {
    const payload = await getPayload({ config: configPromise })

    const flattenedCategories = categories?.map((category) => {
      if (typeof category === 'object') return category.id
      else return category
    })

    const where = await appendSiteWhere(
      flattenedCategories && flattenedCategories.length > 0
        ? {
            categories: {
              in: flattenedCategories,
            },
          }
        : undefined,
    )

    const fetchedPosts = await payload.find({
      collection: 'posts',
      depth: 1,
      limit,
      ...(where ? { where } : {}),
    })

    posts = fetchedPosts.docs
  } else {
    if (selectedDocs?.length) {
      const filteredSelectedPosts = selectedDocs.map((post) => {
        if (typeof post.value === 'object') return post.value
      }) as Post[]

      posts = filteredSelectedPosts
    }
  }

  return (
    <section
      className={`theme-section layout-block layout-block--archive layout-block--${presentation}`}
      data-block-presentation={presentation}
      id={`block-${id}`}
    >
      {introContent && (
        <div className="container mb-16">
          <RichText className="ms-0 max-w-[48rem]" data={introContent} enableGutter={false} />
        </div>
      )}
      <div className={`layout-archive layout-archive--${presentation}`}>
        <CollectionArchive postPath={postPath} posts={posts} />
      </div>
    </section>
  )
}
