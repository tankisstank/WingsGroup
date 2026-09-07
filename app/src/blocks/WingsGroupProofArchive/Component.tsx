import type { WingsGroupProofArchiveBlock } from '@/payload-types'
import { Media } from '@/components/Media'
import { getApprovedProofRecords } from '@/components/WingsGroupV3/model'
import styles from '@/components/WingsGroupV3/WingsGroupV3.module.css'

export const WINGSGROUP_PENDING_PROOF_KEYS = [
  'proof-archive-intro',
  'proof-certificates',
  'proof-partner-reviews',
  'proof-customer-reviews',
] as const

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
            <div className={styles.proofPendingGrid} data-testid="wingsgroup-proof-pending-records">
              {WINGSGROUP_PENDING_PROOF_KEYS.map((key, index) => (
                <article
                  className={styles.proofPending}
                  data-proof-record-key={key}
                  data-proof-record-status="pending"
                  data-testid="wingsgroup-proof-record"
                  key={key}
                >
                  <span className={styles.proofPendingIndex}>0{index + 1}</span>
                  <strong>
                    {locale === 'en' ? `Archive record ${index + 1}` : `Hồ sơ lưu trữ ${index + 1}`}
                  </strong>
                  <p>{copy.pendingDescription}</p>
                  <span>{copy.pendingTitle}</span>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
