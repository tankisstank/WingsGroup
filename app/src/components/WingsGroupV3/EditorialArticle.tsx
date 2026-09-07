import React from 'react'

import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import { SiteLink } from '@/components/SiteLink'
import type { Media as MediaType, Post } from '@/payload-types'
import {
  formatWingsGroupEditorialDate,
  getGovernedEditorialAuthorNames,
  getWingsGroupEditorialPostPath,
} from '@/utilities/wingsGroupEditorial'

import styles from './WingsGroupV3.module.css'

export type WingsGroupEditorialRelatedItem = {
  media: MediaType | null
  post: Post
}

export const WingsGroupEditorialArticle = ({
  heroMedia,
  locale,
  post,
  relatedItems,
}: {
  heroMedia: MediaType | null
  locale: 'en' | 'vi'
  post: Post
  relatedItems: WingsGroupEditorialRelatedItem[]
}) => {
  const authors = getGovernedEditorialAuthorNames(post)
  const categories = (post.categories || [])
    .filter((category) => typeof category === 'object' && Boolean(category.title))
    .map((category) => (typeof category === 'object' ? category.title : ''))
  const copy =
    locale === 'en'
      ? {
          editorial: 'Editorial',
          illustration: 'Editorial image for illustration; it is not documentary evidence.',
          imageUnavailable: 'Editorial image awaiting publication',
          related: 'Continue reading',
          source: 'Source: WingsGroup',
        }
      : {
          editorial: 'Biên tập',
          illustration: 'Hình ảnh biên tập mang tính minh họa, không phải tài liệu xác thực.',
          imageUnavailable: 'Ảnh biên tập đang chờ công bố',
          related: 'Đọc tiếp',
          source: 'Nguồn: WingsGroup',
        }

  return (
    <>
      <header className={`container ${styles.editorialArticleHeader}`}>
        <div className={styles.editorialArticleHeading}>
          <p className={styles.eyebrow}>{copy.editorial}</p>
          <h1>{post.title}</h1>
          {post.meta?.description ? <p>{post.meta.description}</p> : null}
        </div>
        <div className={styles.editorialArticleMeta}>
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
          <span>{copy.source}</span>
          {categories.length > 0 ? <span>{categories.join(' / ')}</span> : null}
        </div>
      </header>

      <div className={`container ${styles.editorialArticleHeroGrid}`}>
        <figure className={styles.editorialArticleHero}>
          <div className={styles.editorialArticleHeroMedia} data-wingsgroup-editorial-media="true">
            {heroMedia ? (
              <Media
                alt={heroMedia.alt || ''}
                fill
                htmlElement={null}
                imgClassName={styles.editorialArticleHeroImage}
                pictureClassName={styles.editorialArticleHeroPicture}
                priority
                resource={heroMedia}
                size="(max-width: 850px) 100vw, (max-width: 1280px) 70vw, 860px"
              />
            ) : (
              <span>{copy.imageUnavailable}</span>
            )}
          </div>
          <figcaption>{copy.illustration}</figcaption>
        </figure>
      </div>

      <div className={`container ${styles.editorialArticleLayout}`}>
        <div className={styles.editorialArticleBody}>
          <RichText data={post.content} enableGutter={false} />
        </div>
        {relatedItems.length > 0 ? (
          <aside
            aria-labelledby="wingsgroup-related-editorial"
            className={styles.editorialArticleRail}
          >
            <p className={styles.eyebrow} id="wingsgroup-related-editorial">
              {copy.related}
            </p>
            <ol>
              {relatedItems.map(({ media, post: relatedPost }, index) => (
                <li key={relatedPost.id}>
                  <div
                    className={styles.editorialRelatedMedia}
                    data-wingsgroup-editorial-media="true"
                  >
                    {media ? (
                      <Media
                        alt={media.alt || ''}
                        fill
                        htmlElement={null}
                        imgClassName={styles.editorialRelatedImage}
                        pictureClassName={styles.editorialRelatedPicture}
                        resource={media}
                        size="96px"
                      />
                    ) : null}
                  </div>
                  <div>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <h2>
                      <SiteLink href={getWingsGroupEditorialPostPath(relatedPost.slug)}>
                        {relatedPost.title}
                      </SiteLink>
                    </h2>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        ) : null}
      </div>
    </>
  )
}
