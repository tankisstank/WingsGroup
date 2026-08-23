import type { ArchiveBlock } from '@/payload-types'
import React from 'react'

import { SiteLink } from '@/components/SiteLink'
import {
  getGovernedEditorialAuthorNames,
  getWingsGroupEditorialPostPath,
  queryWingsGroupEditorialPosts,
} from '@/utilities/wingsGroupEditorial'
import styles from './WingsGroupV3.module.css'

const formatDate = (value: string, locale?: null | string) =>
  new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))

export const WingsGroupEditorialArchive = async (
  props: ArchiveBlock & { locale?: null | string },
) => {
  const { introContent: _introContent, limit, locale } = props
  const posts = await queryWingsGroupEditorialPosts({
    locale: locale === 'en' ? 'en' : 'vi',
  })
  const copy =
    locale === 'en'
      ? { empty: 'No published articles are available yet.', heading: 'News and insights' }
      : { empty: 'Chưa có bài viết được công bố.', heading: 'Tin tức và góc nhìn' }

  return (
    <section
      aria-labelledby="wingsgroup-editorial-archive-title"
      className={`${styles.section} ${styles.editorialArchive}`}
      data-governed-editorial="true"
      data-testid="wingsgroup-editorial-archive"
      id="news"
    >
      <div className="container">
        <header className={styles.sectionHeader}>
          <p className={styles.eyebrow}>{locale === 'en' ? 'Editorial' : 'Biên tập'}</p>
          <h2 className={styles.sectionTitle} id="wingsgroup-editorial-archive-title">
            {copy.heading}
          </h2>
        </header>

        {posts.length > 0 ? (
          <ol className={styles.editorialArchiveList}>
            {posts.slice(0, limit || 12).map((post) => {
              const authors = getGovernedEditorialAuthorNames(post)

              return (
                <li className={styles.editorialArchiveItem} key={post.id}>
                  <div className={styles.editorialArchiveMeta}>
                    {post.publishedAt ? (
                      <time dateTime={post.publishedAt}>
                        {formatDate(post.publishedAt, locale)}
                      </time>
                    ) : null}
                    {authors.length > 0 ? (
                      <span>
                        {locale === 'en' ? 'By' : 'Tác giả'}: {authors.join(', ')}
                      </span>
                    ) : null}
                    <span>{locale === 'en' ? 'Source: WingsGroup' : 'Nguồn: WingsGroup'}</span>
                  </div>
                  <h3>
                    <SiteLink href={getWingsGroupEditorialPostPath(post.slug)}>
                      {post.title}
                    </SiteLink>
                  </h3>
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
