import type { SiteSetting } from '@/payload-types'
import React from 'react'

import { WINGSGROUP_LEGAL_IDENTITY } from '@/wingsgroup/corporateRoutes'
import styles from '@/components/WingsGroupV3/WingsGroupV3.module.css'

type LegalIdentity = NonNullable<SiteSetting['wingsGroupV3']>['legalIdentity']

type Props = {
  legalIdentity?: LegalIdentity | null
  locale?: null | string
}

const copyByLocale = {
  en: {
    eyebrow: 'Company information',
    identity: 'Approved legal identity',
    heading: 'Choose with more confidence.',
    pending: 'Being updated',
    description:
      'The public proof index will open only when the source, permission and publication status are complete.',
    rows: [
      ['Legal entity & licence', 'Legal identity and international travel licence are recorded.'],
      ['Capability & certification', 'Capability records and certificates are awaiting review.'],
      ['Official contact channels', 'Official channel endpoints remain pending update.'],
    ],
  },
  vi: {
    eyebrow: 'Thông tin doanh nghiệp',
    identity: 'Pháp nhân đã được xác nhận',
    heading: 'Minh bạch để bạn an tâm lựa chọn.',
    pending: 'Đang cập nhật',
    description:
      'Hồ sơ công khai chỉ được mở khi nguồn, quyền công bố và trạng thái xuất bản đã đầy đủ.',
    rows: [
      ['Pháp nhân & giấy phép', 'Thông tin pháp lý và giấy phép lữ hành quốc tế đã được ghi nhận.'],
      ['Hồ sơ năng lực & chứng nhận', 'Các hồ sơ năng lực và chứng nhận đang chờ kiểm tra.'],
      ['Kênh liên hệ chính thức', 'Các đầu mối chính thức vẫn đang chờ cập nhật.'],
    ],
  },
} as const

export const WingsGroupTrustSection = ({ legalIdentity, locale }: Props) => {
  const copy = locale === 'en' ? copyByLocale.en : copyByLocale.vi
  const identity = {
    ...WINGSGROUP_LEGAL_IDENTITY,
    ...(legalIdentity || {}),
  }

  return (
    <section
      aria-labelledby="wingsgroup-trust-title"
      className={`${styles.section} ${styles.trustSection}`}
      data-od-id="trust"
      id="trust"
    >
      <div className="container">
        <div className={styles.trustGrid}>
          <div className={styles.trustCopy} data-trust-identity="approved">
            <p className={styles.eyebrow}>{copy.eyebrow}</p>
            <h2 className={styles.sectionTitle} id="wingsgroup-trust-title">
              {copy.heading}
            </h2>
            <p className={styles.sectionDescription}>{copy.description}</p>
            <div className={styles.legalIdentity}>
              <p className={styles.legalIdentityLabel}>{copy.identity}</p>
              <strong>{identity.legalEntityName}</strong>
              <span>{identity.internationalName}</span>
              <span>{identity.registrationNumber}</span>
              <span>{identity.licenceNumber}</span>
            </div>
          </div>
          <div className={styles.trustDetails}>
            {copy.rows.map(([heading, description], index) => (
              <article
                className={styles.trustDetail}
                data-od-id={['proof-legal', 'proof-capability', 'proof-contact'][index]}
                key={heading}
              >
                <span className={styles.trustDetailNumber}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <b>{heading}</b>
                  <p>{description}</p>
                </div>
                <span className={styles.trustDetailStatus}>{copy.pending}</span>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
