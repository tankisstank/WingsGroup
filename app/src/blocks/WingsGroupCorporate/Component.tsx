import type { SiteSetting } from '@/payload-types'
import React from 'react'

import {
  WINGSGROUP_LEGAL_IDENTITY,
  WINGSGROUP_RELATIONSHIP_STATEMENT_EN,
} from '@/wingsgroup/corporateRoutes'
import styles from '@/components/WingsGroupV3/WingsGroupV3.module.css'

type Props = {
  legalIdentity?: NonNullable<SiteSetting['wingsGroupV3']>['legalIdentity'] | null
  locale?: null | string
}

export const WingsGroupCorporateSection = ({ legalIdentity, locale }: Props) => {
  const identity = { ...WINGSGROUP_LEGAL_IDENTITY, ...(legalIdentity || {}) }
  const isEnglish = locale === 'en'

  const brandBranches = isEnglish
    ? [
        { name: 'WingsGo', role: 'Outbound Travel' },
        { name: 'WingSide', role: 'Vietnam Discovery' },
        { name: 'WingsPass', role: 'Airport Services' },
        { name: 'WingsPlus', role: 'Custom Travel / MICE' },
        { name: 'WingsCare', role: 'Travel Care & Support' },
      ]
    : [
        { name: 'WingsGo', role: 'Du lịch nước ngoài' },
        { name: 'WingSide', role: 'Du lịch Việt Nam' },
        { name: 'WingsPass', role: 'Dịch vụ sân bay' },
        { name: 'WingsPlus', role: 'Hành trình riêng / MICE' },
        { name: 'WingsCare', role: 'Chăm sóc hành trình' },
      ]

  return (
    <section
      aria-labelledby="wingsgroup-corporate-title"
      className={`${styles.section} ${styles.corporateSection}`}
      data-archetype="corporate"
      data-relationship-statement="governed"
      data-testid="wingsgroup-corporate"
    >
      <div className="container">
        <div className={styles.corporateGrid}>
          <div>
            <p className={styles.eyebrow}>
              {isEnglish ? 'Brand relationship' : 'Mối quan hệ thương hiệu'}
            </p>
            <h2 className={styles.sectionTitle} id="wingsgroup-corporate-title">
              WingsGroup
            </h2>
            <p className={styles.corporateStatement}>
              {isEnglish ? WINGSGROUP_RELATIONSHIP_STATEMENT_EN : identity.relationshipStatement}
            </p>
          </div>
          <dl className={styles.corporateIdentity}>
            <div>
              <dt>{isEnglish ? 'Legal entity' : 'Pháp nhân'}</dt>
              <dd>{identity.legalEntityName}</dd>
            </div>
            <div>
              <dt>{isEnglish ? 'International name' : 'Tên quốc tế và viết tắt'}</dt>
              <dd>{identity.internationalName}</dd>
            </div>
            <div>
              <dt>{isEnglish ? 'Representative' : 'Người đại diện'}</dt>
              <dd>{identity.legalRepresentative}</dd>
            </div>
            <div>
              <dt>{isEnglish ? 'Registered office' : 'Trụ sở đăng ký'}</dt>
              <dd>{identity.registeredOffice}</dd>
            </div>
            <div>
              <dt>{isEnglish ? 'Travel office' : 'Văn phòng du lịch'}</dt>
              <dd>{identity.travelOffice}</dd>
            </div>
          </dl>

          <div className={styles.brandRelationshipGrid}>
            {brandBranches.map((item) => (
              <div className={styles.brandRelationshipCard} key={item.name}>
                <b>{item.name}</b>
                <span>{item.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
