import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { Media } from '@/components/Media'
import { SiteLink } from '@/components/SiteLink'
import type { ArchiveBlock, Media as MediaType, Post } from '@/payload-types'
import { appendSiteWhere } from '@/utilities/siteContext'
import type { SupportedLocaleCode } from '@/utilities/locales'

import {
  isWingsGroupDevelopmentMedia,
  isWingsGroupPublishedMedia,
  resolveGovernedEditorialSelection,
} from './model'
import { getWingsGroupEditorialPostPath } from '@/utilities/wingsGroupEditorial'
import styles from './WingsGroupV3.module.css'

const FALLBACK_EDITORIAL = {
  en: [
    {
      key: 'trust',
      sourceFilename: 'wingsgroup-journey-guide.png',
      tag: 'Trust and clarity',
      title: 'What to check before choosing a travel service',
      summary: 'Clear information gives every journey a more confident beginning.',
    },
    {
      key: 'selection',
      sourceFilename: 'wingsgroup-selection-guide.png',
      tag: 'A considered choice',
      title: 'How to find the right service for your journey',
      summary: 'Bring timing, budget and expectations to the same starting point.',
    },
    {
      key: 'trends',
      sourceFilename: 'wingsgroup-travel-trends.png',
      tag: 'Travel perspective',
      title: 'A more thoughtful approach to private travel',
      summary: 'A perspective to help you prepare for what comes next.',
    },
  ],
  vi: [
    {
      key: 'trust',
      sourceFilename: 'wingsgroup-journey-guide.png',
      tag: 'Pháp lý & niềm tin',
      title: 'Những điều cần kiểm tra trước khi chọn dịch vụ du lịch',
      summary: 'Thông tin rõ ràng giúp bạn bắt đầu hành trình với nhiều chủ động hơn.',
    },
    {
      key: 'selection',
      sourceFilename: 'wingsgroup-selection-guide.png',
      tag: 'Cẩm nang lựa chọn',
      title: 'Cách chọn đúng line outbound cho Hàn, Nhật, Trung',
      summary: 'Đặt thời gian, ngân sách và kỳ vọng vào cùng một điểm bắt đầu.',
    },
    {
      key: 'trends',
      sourceFilename: 'wingsgroup-travel-trends.png',
      tag: 'Xu hướng du lịch',
      title: 'Xu hướng du lịch cao cấp và private journey 2026',
      summary: 'Một góc nhìn để chuẩn bị kỹ hơn cho chuyến đi tiếp theo.',
    },
  ],
} as const

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

const getFallbackEditorialMedia = async (): Promise<Map<string, MediaType>> => {
  const payload = await getPayload({ config: configPromise })
  const where = await appendSiteWhere()
  const result = await payload.find({
    collection: 'media',
    depth: 1,
    limit: 20,
    overrideAccess: true,
    pagination: false,
    where,
  })
  return new Map(
    result.docs
      .filter((media) => isWingsGroupDevelopmentMedia(media))
      .map((media) => [String(media.governance?.sourceFilename || ''), media]),
  )
}

const renderPostCard = (post: Post, locale?: null | string) => {
  const media = (post.meta?.image || post.heroImage) as Post['heroImage']
  const author = post.populatedAuthors?.find((item) => item.name)?.name
  const category = post.categories?.find((item) => typeof item === 'object' && item.title)

  return (
    <article className={styles.editorialCard} key={post.id}>
      <Media
        className={styles.editorialMedia}
        fill
        imgClassName={styles.editorialMedia}
        resource={typeof media === 'object' && isWingsGroupPublishedMedia(media) ? media : null}
        size="(max-width: 850px) 100vw, 33vw"
      />
      <div className={styles.editorialCopy}>
        <div className={styles.editorialMeta}>
          {typeof category === 'object' ? <span>{category.title}</span> : null}
          {post.publishedAt ? (
            <time dateTime={post.publishedAt}>
              {new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }).format(new Date(post.publishedAt))}
            </time>
          ) : null}
        </div>
        <h3>{post.title}</h3>
        <p className={styles.editorialAuthor}>
          {author ? `${locale === 'en' ? 'By' : 'Tác giả'}: ${author}` : null}
        </p>
        <SiteLink href={getWingsGroupEditorialPostPath(post.slug)}>
          {locale === 'en' ? 'Read story' : 'Đọc bài viết'}
        </SiteLink>
      </div>
    </article>
  )
}

export const WingsGroupEditorialRail = async (
  props: ArchiveBlock & {
    allowWingsGroupDevelopmentMedia?: boolean
    locale?: null | string
  },
) => {
  const { allowWingsGroupDevelopmentMedia = false, locale, introContent } = props
  const candidates = await getCandidates(props, locale)
  const posts = resolveGovernedEditorialSelection(props, candidates)
  const copy =
    locale === 'en'
      ? {
          eyebrow: 'Updates',
          heading: 'Ideas to prepare your next journey.',
          intro: 'A small editorial shelf for clearer travel decisions.',
          read: 'Read story',
        }
      : {
          eyebrow: 'Cập nhật',
          heading: 'Góc nhìn để chuẩn bị kỹ hơn cho hành trình.',
          intro: 'Một góc nhỏ để bạn bắt đầu những quyết định du lịch rõ ràng hơn.',
          read: 'Đọc bài viết',
        }

  const fallbackMedia =
    posts.length === 3 || !allowWingsGroupDevelopmentMedia
      ? null
      : await getFallbackEditorialMedia()

  return (
    <section className={`${styles.section} ${styles.editorialSection}`} data-od-id="news" id="news">
      <div className="container">
        <header className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>{copy.eyebrow}</p>
            <h2 className={styles.sectionTitle}>{copy.heading}</h2>
          </div>
          {introContent ? (
            <p className={styles.sectionDescription}>{copy.intro}</p>
          ) : (
            <p className={styles.sectionDescription}>{copy.intro}</p>
          )}
        </header>
        <div className={styles.editorialGrid}>
          {posts.length === 3
            ? posts.map((post) => renderPostCard(post, locale))
            : FALLBACK_EDITORIAL[locale === 'en' ? 'en' : 'vi'].map((item) => {
                const media = fallbackMedia?.get(item.sourceFilename)
                return (
                  <article
                    className={styles.editorialCard}
                    data-editorial-key={item.key}
                    key={item.key}
                  >
                    <Media
                      className={styles.editorialMedia}
                      fill
                      imgClassName={styles.editorialMedia}
                      resource={media || null}
                      size="(max-width: 850px) 100vw, 33vw"
                    />
                    <div className={styles.editorialCopy}>
                      <div className={styles.editorialMeta}>
                        <span>{item.tag}</span>
                        <span>WingsGroup</span>
                      </div>
                      <h3>{item.title}</h3>
                      <p className={styles.editorialAuthor}>{item.summary}</p>
                      <SiteLink href="/tin-tuc">{copy.read}</SiteLink>
                    </div>
                  </article>
                )
              })}
        </div>
      </div>
    </section>
  )
}
