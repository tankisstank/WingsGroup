import type { ContentBlock as ContentBlockType } from '@/payload-types'
import React from 'react'

import RichText from '@/components/RichText'

import styles from './WingsGroupV3.module.css'

type Props = Pick<ContentBlockType, 'columns'> & {
  locale?: null | string
}

export const WingsGroupContactIntro = ({ columns, locale }: Props) => (
  <section
    aria-label={locale === 'en' ? 'Contact introduction' : 'Giới thiệu liên hệ'}
    className={`${styles.section} ${styles.contactIntro}`}
    data-archetype="contact"
    data-testid="wingsgroup-contact-intro"
  >
    <div className="container">
      <p className={styles.eyebrow}>{locale === 'en' ? 'Contact' : 'Liên hệ'}</p>
      <div className={styles.contactIntroCopy}>
        {columns?.[0]?.richText ? (
          <RichText data={columns[0].richText} enableGutter={false} enableProse={false} />
        ) : null}
      </div>
    </div>
  </section>
)
