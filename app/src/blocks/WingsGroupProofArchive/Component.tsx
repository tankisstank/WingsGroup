import type { WingsGroupProofArchiveBlock } from '@/payload-types'
import { Media } from '@/components/Media'
import {
  getApprovedProofRecords,
  isWingsGroupRenderableMedia,
  isWingsGroupPublishedMedia,
} from '@/components/WingsGroupV3/model'
import styles from '@/components/WingsGroupV3/WingsGroupV3.module.css'

const copyByLocale = {
  en: {
    pendingDescription:
      'Documents appear here only after their source, context, publication permission and media provenance have been verified.',
    pendingTitle: 'Being updated',
    source: 'Source',
  },
  vi: {
    pendingDescription:
      'Hồ sơ chỉ xuất hiện sau khi nguồn, ngữ cảnh, quyền công bố và provenance của media đã được xác minh.',
    pendingTitle: 'Đang cập nhật',
    source: 'Nguồn',
  },
} as const

export const WingsGroupProofArchiveComponent = ({
  allowWingsGroupDevelopmentMedia = false,
  description,
  eyebrow,
  locale,
  records,
  title,
}: WingsGroupProofArchiveBlock & {
  allowWingsGroupDevelopmentMedia?: boolean
  locale?: null | string
}) => {
  const approvedRecords = getApprovedProofRecords(records)
  const copy = locale === 'en' ? copyByLocale.en : copyByLocale.vi
  const introRecord = records?.find((record) => record.key === 'proof-archive-intro')
  const introMediaPredicate = allowWingsGroupDevelopmentMedia
    ? isWingsGroupRenderableMedia
    : isWingsGroupPublishedMedia
  const introMedia =
    introRecord && typeof introRecord.media === 'object' && introMediaPredicate(introRecord.media)
      ? introRecord.media
      : null

  return (
    <section
      aria-labelledby="wingsgroup-proof-archive-title"
      className={styles.section}
      data-od-id="proof-archive"
      data-testid="wingsgroup-proof-archive"
      id="proof"
    >
      <div className="container">
        <header className={styles.sectionHeader}>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h2 className={styles.sectionTitle} id="wingsgroup-proof-archive-title">
            {title}
          </h2>
          {description ? <p className={styles.sectionDescription}>{description}</p> : null}
        </header>

        {approvedRecords.length > 0 ? (
          <div className={styles.proofGrid}>
            {approvedRecords.map((record) => (
              <article className={styles.proofCard} key={record.key}>
                <Media
                  className={styles.proofMedia}
                  imgClassName={styles.proofMedia}
                  resource={typeof record.media === 'object' ? record.media : null}
                  size="(max-width: 850px) 100vw, 33vw"
                />
                <div className={styles.proofCopy}>
                  <h3>{record.title}</h3>
                  {record.summary ? <p>{record.summary}</p> : null}
                  <div className={styles.proofMeta}>
                    <span>
                      {copy.source}: {record.sourceIssuer}
                    </span>
                    {record.evidenceDate ? (
                      <time dateTime={record.evidenceDate}>
                        {new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        }).format(new Date(record.evidenceDate))}
                      </time>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.proofLayout} role="status">
            <aside className={styles.proofIntro}>
              <p className={styles.eyebrow}>
                {locale === 'en' ? 'Archive index' : 'Dấu mốc nổi bật'}
              </p>
              {introMedia ? (
                <Media
                  className={styles.proofIntroMedia}
                  imgClassName={styles.proofIntroMedia}
                  resource={introMedia}
                  size="(max-width: 850px) 100vw, 33vw"
                />
              ) : null}
              <p className={styles.proofIntroNote}>
                {locale === 'en'
                  ? 'The archive will open one verified record at a time.'
                  : 'Hồ sơ sẽ được mở theo từng dấu mốc đã xác minh.'}
              </p>
            </aside>
            <div className={styles.proofPending}>
              <strong>{copy.pendingTitle}</strong>
              <p>{copy.pendingDescription}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
