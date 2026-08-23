import type { FeatureGridBlock as FeatureGridBlockProps } from '@/payload-types'
import React from 'react'

import { SiteLink } from '@/components/SiteLink'
import { WINGSGROUP_CAPABILITY_ROWS } from '@/components/WingsGroupV3/model'
import styles from '@/components/WingsGroupV3/WingsGroupV3.module.css'

type Props = Pick<FeatureGridBlockProps, 'description' | 'eyebrow' | 'items' | 'title'> & {
  locale?: null | string
}

export const WingsGroupCapabilitySection = ({ description, eyebrow, locale, title }: Props) => {
  const fallbackRows = WINGSGROUP_CAPABILITY_ROWS[locale === 'en' ? 'en' : 'vi']
  // This route is a governed projection, not a generic feature-card renderer.
  // Keep the public service rows branded and stable even if CMS input changes.
  const rows = fallbackRows

  return (
    <section
      aria-labelledby="wingsgroup-capability-title"
      className={`${styles.section} ${styles.capabilitySection}`}
      data-archetype="capability"
      data-testid="wingsgroup-capability"
      id="services"
    >
      <div className="container">
        <header className={styles.routeHeader}>
          <div>
            {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
            <h2 className={styles.sectionTitle} id="wingsgroup-capability-title">
              {title ||
                (locale === 'en'
                  ? 'Services shaped around each request'
                  : 'Mỗi hành trình, một đội ngũ phù hợp.')}
            </h2>
          </div>
          {description ? <p className={styles.sectionDescription}>{description}</p> : null}
        </header>

        <div className={styles.capabilityRows}>
          {rows.map((row, index) => (
            <article className={styles.capabilityRow} data-service-row={index + 1} key={row.title}>
              <span className={styles.routeNumber}>{String(index + 1).padStart(2, '0')}</span>
              <h3>{row.title}</h3>
              <p>{row.description}</p>
              <SiteLink
                className={styles.routeCta}
                data-cta-state="contact-fallback"
                href="/lien-he#contact-form"
              >
                {locale === 'en' ? 'Request a consultation' : 'Trao đổi nhu cầu'}
                <span aria-hidden="true">↗</span>
              </SiteLink>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
