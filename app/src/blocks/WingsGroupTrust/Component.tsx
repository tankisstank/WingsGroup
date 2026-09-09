import type { InfoStripBlock, SiteSetting } from '@/payload-types'
import React from 'react'

import { SiteLink } from '@/components/SiteLink'
import { BadgeCheckIcon, FileCheckIcon, PlaneIcon, ShieldCheckIcon } from 'lucide-react'
import { WINGSGROUP_LEGAL_IDENTITY } from '@/wingsgroup/corporateRoutes'
import styles from '@/components/WingsGroupV3/WingsGroupV3.module.css'

type LegalIdentity = NonNullable<SiteSetting['wingsGroupV3']>['legalIdentity']

type Props = {
  description?: string
  eyebrow?: string
  items?: InfoStripBlock['items']
  legalIdentity?: LegalIdentity | null
  locale?: null | string
  showDeepDiveLink?: boolean
  title?: string
}

const copyByLocale = {
  en: {
    eyebrow: 'Corporate Trust & Standards',
    identity: 'Confirmed legal identity',
    heading: 'Clarity helps you choose with confidence.',
    pending: 'Being updated',
    description:
      'WingsGroup is a travel services ecosystem operated by Vietwings Tourism JSC, connecting specialized teams for every journey requirement.',
    rows: [
      [
        '01 - Direct Authentic Service',
        'Direct connection with airlines, premium hotels and vetted local operators to minimize intermediary risks.',
      ],
      [
        '02 - Clear Contracts & Transparent Pricing',
        'Every service is confirmed prior to departure with transparent rates and no hidden charges.',
      ],
      [
        '03 - Dedicated 24/7 Specialist Support',
        'Continuous accompaniment from initial inquiry, throughout the journey, until your safe return.',
      ],
    ],
  },
  vi: {
    eyebrow: 'Thông tin rõ ràng & Pháp nhân minh bạch',
    identity: 'Pháp nhân đã được xác nhận',
    heading: 'Minh bạch để bạn an tâm lựa chọn.',
    pending: 'Đang cập nhật',
    description:
      'WingsGroup là hệ sinh thái dịch vụ du lịch được vận hành bởi Công ty Cổ phần Du lịch Đôi Cánh Việt, kết nối nhiều đội ngũ chuyên biệt cho từng nhu cầu hành trình.',
    rows: [
      [
        '01 - Dịch vụ chính hãng, kết nối trực tiếp',
        'Làm việc với hệ thống đối tác hàng không, khách sạn và dịch vụ du lịch uy tín giúp hành trình được xây dựng đúng nhu cầu, đúng tiêu chuẩn và hạn chế tối đa rủi ro trung gian.',
      ],
      [
        '02 - Hợp đồng rõ ràng, chi phí minh bạch',
        'Mọi dịch vụ được tư vấn và xác nhận rõ ràng trước khi khởi hành. Thông tin dịch vụ, điều kiện và chi phí được thống nhất minh bạch, giúp khách hàng chủ động ngân sách.',
      ],
      [
        '03 - Có chuyên viên đồng hành 24/7',
        'Không chỉ bán một hành trình rồi kết thúc. Chuyên viên WingsGroup luôn sẵn sàng hỗ trợ khi bạn cần - từ trước chuyến đi, trong hành trình đến khi trở về.',
      ],
    ],
  },
} as const

export const WingsGroupTrustSection = ({
  description,
  eyebrow,
  items,
  legalIdentity,
  locale,
  showDeepDiveLink = false,
  title,
}: Props) => {
  const copy = locale === 'en' ? copyByLocale.en : copyByLocale.vi
  const isEnglish = locale === 'en'
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
            <p className={styles.eyebrow}>{eyebrow || copy.eyebrow}</p>
            <h2 className={styles.sectionTitle} id="wingsgroup-trust-title">
              {title || copy.heading}
            </h2>
            <p className={styles.sectionDescription}>{description || copy.description}</p>
            <div className={styles.legalIdentity}>
              <p className={styles.legalIdentityLabel}>{copy.identity}</p>
              <strong>{identity.legalEntityName}</strong>
              <span>Tên viết tắt: {identity.internationalName}</span>
              <span>Đại diện: {identity.legalRepresentative}</span>
              <span>MST: {identity.registrationNumber}</span>
              <span>GP Lữ hành QT: {identity.licenceNumber}</span>
              <span>Trụ sở: {identity.registeredOffice}</span>
              <span>VP Du lịch: {identity.travelOffice}</span>
            </div>
            {showDeepDiveLink ? (
              <SiteLink className={styles.routeCta} href="/ve-wingsgroup">
                {isEnglish
                  ? 'View corporate profile and brand story'
                  : 'Xem hồ sơ pháp lý và câu chuyện doanh nghiệp'}{' '}
                <span aria-hidden="true">↗</span>
              </SiteLink>
            ) : null}
            {items?.some((item) => item.value) ? (
              <div
                aria-label={isEnglish ? 'WingsGroup figures' : 'Số liệu WingsGroup'}
                className={styles.trustMetrics}
              >
                {items
                  .filter((item) => item.value)
                  .map((item) => (
                    <article className={styles.trustMetric} key={`${item.label}-${item.value}`}>
                      <strong>{item.value}</strong>
                      <b>{item.label}</b>
                      {item.description ? <p>{item.description}</p> : null}
                    </article>
                  ))}
              </div>
            ) : null}
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

        {!showDeepDiveLink ? (
          <div className={styles.trustCredentialsVisualGrid}>
            <div className={styles.trustCredentialCard}>
              <div className={styles.trustCredentialHeader}>
                <FileCheckIcon aria-hidden="true" className="h-6 w-6 text-[var(--site-brand,#005090)]" />
                <span>{isEnglish ? 'International Travel License' : 'Giấy phép Lữ hành Quốc tế'}</span>
              </div>
              <h4>01-2336/2023/TCDL-GP LHQT</h4>
              <p>
                {isEnglish
                  ? 'Issued by Vietnam National Administration of Tourism, legally certified.'
                  : 'Cấp bởi Cục Du lịch Quốc gia Việt Nam, bảo chứng pháp lý vững chắc cho mọi hành trình.'}
              </p>
            </div>
            <div className={styles.trustCredentialCard}>
              <div className={styles.trustCredentialHeader}>
                <PlaneIcon aria-hidden="true" className="h-6 w-6 text-[var(--site-brand,#005090)]" />
                <span>{isEnglish ? 'Aviation & Service Partners' : 'Đối tác Hàng không & Dịch vụ'}</span>
              </div>
              <h4>{isEnglish ? 'Official Partnerships' : 'Hợp tác chính thức'}</h4>
              <p>
                {isEnglish
                  ? 'Direct connectivity with Vietnam Airlines, Vietjet, Bamboo Airways and major international airlines.'
                  : 'Kết nối trực tiếp với Vietnam Airlines, Vietjet, Bamboo Airways và các hãng hàng không quốc tế.'}
              </p>
            </div>
            <div className={styles.trustCredentialCard}>
              <div className={styles.trustCredentialHeader}>
                <ShieldCheckIcon aria-hidden="true" className="h-6 w-6 text-[var(--site-brand,#005090)]" />
                <span>{isEnglish ? '24/7 Accompaniment & Care' : 'Cam kết Đồng hành 24/7'}</span>
              </div>
              <h4>{isEnglish ? 'Clear Contracts & Transparency' : 'Hợp đồng & Bảo hiểm rõ ràng'}</h4>
              <p>
                {isEnglish
                  ? 'Transparent terms, full insurance, and proactive assistance throughout the voyage.'
                  : 'Mọi điều khoản minh bạch, bảo hiểm đầy đủ, hỗ trợ xử lý linh hoạt mọi phát sinh trong suốt hành trình.'}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
