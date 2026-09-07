import type { ArchiveBlock } from '@/payload-types'
import React from 'react'

import { Media } from '@/components/Media'
import { SiteLink } from '@/components/SiteLink'
import {
  formatWingsGroupEditorialDate,
  getGovernedEditorialAuthorNames,
  getWingsGroupEditorialPostPath,
  queryWingsGroupEditorialFallbackMedia,
  queryWingsGroupEditorialPosts,
  resolveWingsGroupEditorialMedia,
} from '@/utilities/wingsGroupEditorial'
import styles from './WingsGroupV3.module.css'

export const WingsGroupEditorialArchive = async (
  props: ArchiveBlock & { locale?: null | string },
) => {
  const { introContent: _introContent, limit, locale } = props
  const resolvedLocale = locale === 'en' ? 'en' : 'vi'
  const [posts, fallbackMedia] = await Promise.all([
    queryWingsGroupEditorialPosts({ locale: resolvedLocale }),
    queryWingsGroupEditorialFallbackMedia({ locale: resolvedLocale }),
  ])
  const copy =
    locale === 'en'
      ? {
          deck: 'Practical perspectives for choosing, preparing and travelling with greater clarity.',
          empty: 'No published articles are available yet.',
          heading: 'News and insights',
          imageUnavailable: 'Editorial image awaiting publication',
          read: 'Read story',
        }
      : {
          deck: 'Góc nhìn thực tế để lựa chọn, chuẩn bị và bắt đầu hành trình rõ ràng hơn.',
          empty: 'Chưa có bài viết được công bố.',
          heading: 'Tin tức và góc nhìn',
          imageUnavailable: 'Ảnh biên tập đang chờ công bố',
          read: 'Đọc bài viết',
        }
  const visiblePosts = posts.slice(0, limit || 12)

  return (
    <section
      aria-labelledby="wingsgroup-editorial-archive-title"
      className={`${styles.section} ${styles.editorialArchive}`}
      data-governed-editorial="true"
      data-testid="wingsgroup-editorial-archive"
      id="news"
    >
      <div className="container">
        <header className={styles.editorialArchiveHeader}>
          <div>
            <p className={styles.eyebrow}>{locale === 'en' ? 'Editorial' : 'Biên tập'}</p>
            <h2 className={styles.sectionTitle} id="wingsgroup-editorial-archive-title">
              {copy.heading}
            </h2>
          </div>
          <p>{copy.deck}</p>
        </header>

        {visiblePosts.length > 0 ? (
          <ol className={styles.editorialArchiveList}>
            {visiblePosts.map((post, index) => {
              const authors = getGovernedEditorialAuthorNames(post)
              const media = resolveWingsGroupEditorialMedia(post, fallbackMedia)
              const isLead = index === 0

              return (
                <li
                  className={isLead ? styles.editorialArchiveLead : styles.editorialArchiveItem}
                  key={post.id}
                >
                  <div
                    className={styles.editorialArchiveMedia}
                    data-wingsgroup-editorial-media="true"
                  >
                    {media ? (
                      <Media
                        alt={media.alt || ''}
                        fill
                        htmlElement={null}
                        imgClassName={styles.editorialArchiveImage}
                        pictureClassName={styles.editorialArchivePicture}
                        priority={isLead}
                        resource={media}
                        size={isLead ? '(max-width: 850px) 100vw, 460px' : '180px'}
                      />
                    ) : (
                      <span>{copy.imageUnavailable}</span>
                    )}
                  </div>
                  <div className={styles.editorialArchiveCopy}>
                    <p className={styles.editorialArchiveIndex}>
                      {String(index + 1).padStart(2, '0')}
                    </p>
                    <h3>
                      <SiteLink href={getWingsGroupEditorialPostPath(post.slug)}>
                        {post.title}
                      </SiteLink>
                    </h3>
                    {post.meta?.description ? (
                      <p className={styles.editorialArchiveSummary}>{post.meta.description}</p>
                    ) : null}
                    <SiteLink
                      className={styles.editorialArchiveRead}
                      href={getWingsGroupEditorialPostPath(post.slug)}
                    >
                      {copy.read} <span aria-hidden="true">↗</span>
                    </SiteLink>
                  </div>
                  <div className={styles.editorialArchiveMeta}>
                    {post.publishedAt ? (
                      <time dateTime={post.publishedAt}>
                        {formatWingsGroupEditorialDate(post.publishedAt, locale)}
                      </time>
                    ) : null}
                    {authors.length > 0 ? (
                      <span>
                        {locale === 'en' ? 'By' : 'Tác giả'}: {authors.join(', ')}
                      </span>
                    ) : null}
                    <span>{locale === 'en' ? 'Source: WingsGroup' : 'Nguồn: WingsGroup'}</span>
                  </div>
                </li>
              )
            })}
          </ol>
        ) : (
          <p className={styles.editorialArchiveEmpty}>{copy.empty}</p>
        )}
      </div>
    </section>
  )
}
