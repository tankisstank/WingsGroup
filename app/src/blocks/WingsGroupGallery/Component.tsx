import type { Media as MediaType, WingsGroupGalleryBlock } from '@/payload-types'

import { Media } from '@/components/Media'
import styles from '@/components/WingsGroupV3/WingsGroupV3.module.css'

type Props = WingsGroupGalleryBlock & { locale?: null | string }

const categoryLabel = (
  category: NonNullable<WingsGroupGalleryBlock['items']>[number]['category'],
  isEnglish: boolean,
) => {
  const labels = {
    achievement: ['Thành tựu', 'Achievements'],
    activity: ['Hoạt động đoàn', 'Group activities'],
    airline: ['Hãng bay', 'Airlines'],
    hotel: ['Khách sạn', 'Hotels'],
    partner: ['Đối tác', 'Partners'],
  } as const

  return labels[category || 'activity']?.[isEnglish ? 1 : 0]
}

export const WingsGroupGallerySection = ({
  description,
  eyebrow,
  id: blockID,
  items,
  locale,
  title,
}: Props) => {
  const isEnglish = locale === 'en'
  const sectionID = blockID ? `wingsgroup-gallery-${blockID}` : 'wingsgroup-gallery'
  const visibleItems = (items || []).filter(
    (item) =>
      item.visible !== false &&
      typeof item.media === 'object' &&
      item.media !== null &&
      Boolean(item.title),
  )

  if (!visibleItems.length) return null

  return (
    <section
      aria-labelledby={`${sectionID}-title`}
      className={`${styles.section} ${styles.gallerySection}`}
      data-testid="wingsgroup-gallery"
      id={sectionID}
    >
      <div className="container">
        <header className={styles.sectionHeader}>
          <div>
            {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
            <h2 className={styles.sectionTitle} id={`${sectionID}-title`}>
              {title}
            </h2>
          </div>
          {description ? <p className={styles.sectionDescription}>{description}</p> : null}
        </header>

        <ul className={styles.galleryGrid}>
          {visibleItems.map((item, index) => {
            const media = item.media as MediaType
            const isLogo = item.mediaType === 'logo'

            return (
              <li className={styles.galleryCell} key={item.id || `${item.title}-${index}`}>
                <article className={styles.galleryCard}>
                  <div
                    className={`${styles.galleryImageFrame} ${isLogo ? styles.galleryLogoFrame : ''}`}
                  >
                    <Media
                      alt={item.alt || item.title || ''}
                      fill
                      htmlElement={null}
                      imgClassName={isLogo ? styles.galleryLogo : styles.galleryPhoto}
                      loading="lazy"
                      pictureClassName={styles.galleryPicture}
                      resource={media}
                      size="(max-width: 520px) 100vw, (max-width: 900px) 50vw, 33vw"
                    />
                  </div>
                  <div className={styles.galleryBody}>
                    <div className={styles.galleryMeta}>
                      <span className={styles.galleryCategory}>
                        {categoryLabel(item.category, isEnglish)}
                      </span>
                      {item.illustrative ? (
                        <span className={styles.galleryIllustrative}>
                          {isEnglish ? 'Illustration' : 'Ảnh minh họa'}
                        </span>
                      ) : null}
                    </div>
                    <h3 className={styles.galleryItemTitle}>{item.title}</h3>
                    {item.caption ? <p className={styles.galleryCaption}>{item.caption}</p> : null}
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
