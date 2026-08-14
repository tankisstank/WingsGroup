import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import { SiteLink } from '@/components/SiteLink'
import type { ArchiveBlock, Post } from '@/payload-types'
import { appendSiteWhere } from '@/utilities/siteContext'
import type { SupportedLocaleCode } from '@/utilities/locales'

import { resolveGovernedEditorialSelection } from './model'
import styles from './WingsGroupV3.module.css'

const getCandidates = async (block: ArchiveBlock, locale?: null | string): Promise<unknown[]> => {
  const selectedIDs =
    block.populateBy === 'selection'
      ? (block.selectedDocs || []).map((entry) =>
          typeof entry.value === 'object' ? entry.value.id : entry.value,
        )
      : []
  if (block.populateBy === 'selection' && selectedIDs.length !== 3) return []
  if (block.populateBy !== 'selection' && block.limit !== 3) return []

  const categoryIDs = (block.categories || []).map((category) =>
    typeof category === 'object' ? category.id : category,
  )
  const where = await appendSiteWhere({
    and: [
      { _status: { equals: 'published' } },
      ...(selectedIDs.length > 0 ? [{ id: { in: selectedIDs } }] : []),
      ...(categoryIDs.length > 0 ? [{ categories: { in: categoryIDs } }] : []),
    ],
  })
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'posts',
    depth: 3,
    fallbackLocale: false,
    limit: 3,
    locale: locale as SupportedLocaleCode | undefined,
    overrideAccess: true,
    pagination: false,
    sort: '-publishedAt',
    where,
  })

  if (selectedIDs.length === 0) return result.docs
  const byID = new Map(result.docs.map((post) => [String(post.id), post]))
  return selectedIDs.map((id) => byID.get(String(id))).filter(Boolean)
}

export const WingsGroupEditorialRail = async (props: ArchiveBlock & { locale?: null | string }) => {
  const { introContent, locale } = props
  const candidates = await getCandidates(props, locale)
  const posts = resolveGovernedEditorialSelection(props, candidates)
  const copy =
    locale === 'en'
      ? {
          by: 'By',
          pending: 'Editorial stories are being prepared for publication.',
          read: 'Read story',
        }
      : {
          by: 'Tác giả',
          pending: 'Các câu chuyện biên tập đang được chuẩn bị để công bố.',
          read: 'Đọc bài viết',
        }

  return (
    <section className={styles.section} data-testid="wingsgroup-editorial-rail" id="editorial">
      <div className="container">
        {introContent ? (
          <RichText className={styles.editorialIntro} data={introContent} enableGutter={false} />
        ) : null}

        {posts.length === 3 ? (
          <div className={styles.editorialGrid}>
            {posts.map((post) => {
              const media = (post.meta?.image || post.heroImage) as Post['heroImage']
              const author = post.populatedAuthors?.find((item) => item.name)?.name
              const category = post.categories?.find(
                (item) => typeof item === 'object' && item.title,
              )

              return (
                <article className={styles.editorialCard} key={post.id}>
                  <Media
                    className={styles.editorialMedia}
                    fill
                    imgClassName={styles.editorialMedia}
                    resource={typeof media === 'object' ? media : null}
                    size="(max-width: 850px) 100vw, 33vw"
                  />
                  <div className={styles.editorialCopy}>
                    <div className={styles.editorialMeta}>
                      {typeof category === 'object' ? <span>{category.title}</span> : null}
                      <time dateTime={post.publishedAt || undefined}>
                        {new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        }).format(new Date(post.publishedAt!))}
                      </time>
                    </div>
                    <h3>{post.title}</h3>
                    <p className={styles.editorialAuthor}>
                      {copy.by}: {author}
                    </p>
                    <SiteLink href={`/posts/${post.slug}`}>{copy.read}</SiteLink>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className={styles.proofPending} role="status">
            <p>{copy.pending}</p>
          </div>
        )}
      </div>
    </section>
  )
}
