import type { FormBlock as FormBlockType } from '@/payload-types'
import React from 'react'

import { FormBlock } from '@/blocks/Form/Component'
import styles from '@/components/WingsGroupV3/WingsGroupV3.module.css'
import type { HotlineItem } from '@/utilities/siteHotlines'
import { formatHotlineDisplay } from '@/utilities/siteHotlines'

type Props = FormBlockType & {
  hotlines?: HotlineItem[]
  locale?: null | string
  siteCode?: null | string
  wingsGroupV3?: boolean
}

export const WingsGroupContactSection = ({
  blockType: _blockType,
  hotlines,
  id: _id,
  locale,
  siteCode,
  wingsGroupV3,
  ...formBlock
}: Props) => {
  const primaryHotline =
    hotlines === undefined
      ? { href: 'tel:0948786775', normalized: '0948786775' }
      : hotlines[0]

  return (
    <section
      aria-labelledby="wingsgroup-contact-title"
      className={`${styles.section} ${styles.contactSection}`}
      data-od-id="contact"
      id="contact"
    >
      <div className="container">
        <header className={styles.contactHeader}>
          <p className={styles.eyebrow}>{locale === 'en' ? 'Contact' : 'Liên hệ'}</p>
          <h2 className={styles.sectionTitle} id="wingsgroup-contact-title">
            {locale === 'en' ? 'Start with what you need.' : 'Hãy bắt đầu từ điều bạn đang cần.'}
          </h2>
          <p className={styles.sectionDescription}>
            {locale === 'en'
              ? 'Leave a short brief and the right WingsGroup team will follow up.'
              : 'Để lại một vài thông tin ngắn, đội ngũ phù hợp của WingsGroup sẽ chủ động kết nối.'}
          </p>
        </header>
        {wingsGroupV3 && primaryHotline ? (
          <div className={styles.contactDirect} data-testid="wingsgroup-direct-contacts">
            <span>
              {locale === 'en' ? 'Prefer a direct conversation?' : 'Bạn muốn trao đổi trực tiếp?'}
            </span>
            <a href={primaryHotline.href}>
              {locale === 'en' ? 'Call now' : 'Gọi ngay'}: {formatHotlineDisplay(primaryHotline.normalized)}
            </a>
          </div>
        ) : null}
        <FormBlock
          {...(formBlock as unknown as Parameters<typeof FormBlock>[0])}
          anchorId="contact-form"
          formOdId="contact-intake"
          siteCode={siteCode}
          submitOdId="contact-submit"
          wingsGroupV3={wingsGroupV3}
        />
      </div>
    </section>
  )
}
