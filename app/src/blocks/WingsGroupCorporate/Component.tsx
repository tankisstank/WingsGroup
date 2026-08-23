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
          </dl>
        </div>
      </div>
    </section>
  )
}
