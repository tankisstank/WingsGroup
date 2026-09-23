'use client'

import React from 'react'
import {
  Headphones,
  HeartHandshake,
  MapPinned,
  PlaneTakeoff,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

import { useSitePublicLocale } from '@/providers/SitePath'
import {
  setWingsGroupInquiryContext,
  type WingsGroupInquiryKey,
} from '@/utilities/wingsGroupConsultation'

import styles from './WingsGroupV3.module.css'

type JourneyInquiryGridProps = {
  locale?: null | string
}

type InquiryDefinition = {
  Icon: LucideIcon
  en: string
  key: WingsGroupInquiryKey
  vi: string
}

const inquiryDefinitions: readonly InquiryDefinition[] = [
  {
    Icon: PlaneTakeoff,
    en: 'I want to travel abroad',
    key: 'outbound',
    vi: 'Tôi muốn đi nước ngoài',
  },
  {
    Icon: MapPinned,
    en: 'I want to explore Vietnam',
    key: 'vietnam',
    vi: 'Tôi muốn khám phá Việt Nam',
  },
  {
    Icon: Headphones,
    en: 'I need airport services',
    key: 'airport',
    vi: 'Tôi cần dịch vụ sân bay',
  },
  {
    Icon: UsersRound,
    en: 'I need a private journey / MICE',
    key: 'mice',
    vi: 'Tôi cần hành trình riêng / MICE',
  },
  {
    Icon: HeartHandshake,
    en: 'I need travel support',
    key: 'support',
    vi: 'Tôi cần được hỗ trợ',
  },
]

export const JourneyInquiryGrid = ({ locale }: JourneyInquiryGridProps) => {
  const siteLocale = useSitePublicLocale()
  const isEnglish = (locale || siteLocale) === 'en'

  return (
    <section
      aria-labelledby="wingsgroup-journey-inquiry-title"
      className={`${styles.section} ${styles.journeyInquirySection}`}
      data-archetype="journey-inquiry"
      data-testid="wingsgroup-journey-inquiry"
      id="journey-inquiry"
    >
      <div className="container">
        <header className={styles.journeyInquiryHeader}>
          <div>
            <p className={styles.eyebrow}>
              {isEnglish ? 'Start with what you need' : 'Bắt đầu từ điều bạn cần'}
            </p>
            <h2 className={styles.sectionTitle} id="wingsgroup-journey-inquiry-title">
              {isEnglish
                ? 'What are you looking for in your next journey?'
                : 'Bạn đang tìm điều gì cho hành trình tiếp theo?'}
            </h2>
          </div>
          <p className={styles.sectionDescription}>
            {isEnglish
              ? 'Choose a starting point and a specialist will help shape the right next step.'
              : 'Chọn một nhu cầu gần nhất để chuyên viên bắt đầu đồng hành cùng bạn.'}
          </p>
        </header>

        <div className={styles.journeyInquiryGrid}>
          {inquiryDefinitions.map(({ Icon, en, key, vi }, index) => {
            const label = isEnglish ? en : vi

            return (
              <button
                aria-haspopup="dialog"
                className={styles.journeyInquiryButton}
                data-wingsgroup-consultation-trigger="true"
                data-wingsgroup-inquiry-key={key}
                key={key}
                onClick={() => setWingsGroupInquiryContext(key)}
                type="button"
              >
                <span className={styles.journeyInquiryNumber} aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Icon aria-hidden="true" className={styles.journeyInquiryIcon} />
                <span className={styles.journeyInquiryLabel}>{label}</span>
                <span className={styles.journeyInquiryArrow} aria-hidden="true">
                  ↗
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
