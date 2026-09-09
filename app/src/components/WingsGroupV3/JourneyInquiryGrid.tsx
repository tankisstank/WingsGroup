'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useSitePublicLocale } from '@/providers/SitePath'
import { useSitePath } from '@/utilities/useSitePath'
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  CompassIcon,
  PlaneIcon,
  PlaneTakeoffIcon,
  SparklesIcon,
} from 'lucide-react'
import {
  WINGSGROUP_CONTACT_FORM_ANCHOR,
  WINGSGROUP_CONTACT_FOCUS_SESSION_KEY,
} from '@/utilities/wingsGroupConsultation'
import styles from './WingsGroupV3.module.css'

interface InquiryCard {
  brand: string
  category: string
  description: string
  buttonLabel: string
  inquiryKey: string
}

const INQUIRY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  wingsgo: PlaneIcon,
  wingside: CompassIcon,
  wingspass: PlaneTakeoffIcon,
  wingsplus: SparklesIcon,
  wingscare: BadgeCheckIcon,
}

const inquiryData: Record<'en' | 'vi', { title: string; subtitle: string; cards: InquiryCard[] }> = {
  vi: {
    title: 'Bạn đang chuẩn bị cho hành trình nào?',
    subtitle:
      'Chia sẻ nhu cầu của bạn. Đội ngũ WingsGroup sẽ cùng bạn xác định giải pháp phù hợp và những dịch vụ cần thiết cho hành trình.',
    cards: [
      {
        brand: 'WingsGo',
        category: 'DU LỊCH NƯỚC NGOÀI',
        description: 'Đi xa, mọi thứ đã có WingsGo lo.',
        buttonLabel: 'Tôi muốn đi nước ngoài',
        inquiryKey: 'wingsgo',
      },
      {
        brand: 'WingSide',
        category: 'DU LỊCH VIỆT NAM',
        description: 'Đi gần, trải nghiệm đáng nhớ hơn.',
        buttonLabel: 'Tôi muốn khám phá Việt Nam',
        inquiryKey: 'wingside',
      },
      {
        brand: 'WingsPass',
        category: 'DỊCH VỤ SÂN BAY',
        description: 'Đến sân bay, có người đồng hành.',
        buttonLabel: 'Tôi cần dịch vụ sân bay',
        inquiryKey: 'wingspass',
      },
      {
        brand: 'WingsPlus',
        category: 'HÀNH TRÌNH RIÊNG & MICE',
        description: 'Bạn có mục tiêu. Chúng tôi tạo hành trình.',
        buttonLabel: 'Tôi cần hành trình riêng / MICE',
        inquiryKey: 'wingsplus',
      },
      {
        brand: 'WingsCare',
        category: 'HỖ TRỢ & CHĂM SÓC',
        description: 'Cần hỗ trợ? WingsCare luôn ở đó.',
        buttonLabel: 'Tôi cần được hỗ trợ',
        inquiryKey: 'wingscare',
      },
    ],
  },
  en: {
    title: 'Which journey are you planning for?',
    subtitle:
      'Tell us your requirements. The WingsGroup team will identify the right solutions and dedicated support for your journey.',
    cards: [
      {
        brand: 'WingsGo',
        category: 'OUTBOUND TRAVEL',
        description: 'Going abroad, fully prepared with WingsGo.',
        buttonLabel: 'I want to travel abroad',
        inquiryKey: 'wingsgo',
      },
      {
        brand: 'WingSide',
        category: 'VIETNAM DISCOVERY',
        description: 'Explore Vietnam with authentic local depth.',
        buttonLabel: 'I want to explore Vietnam',
        inquiryKey: 'wingside',
      },
      {
        brand: 'WingsPass',
        category: 'AIRPORT SERVICES',
        description: 'Dedicated support across airport touchpoints.',
        buttonLabel: 'I need airport services',
        inquiryKey: 'wingspass',
      },
      {
        brand: 'WingsPlus',
        category: 'PRIVATE JOURNEYS & MICE',
        description: 'You have goals. We craft tailor-made itineraries.',
        buttonLabel: 'I need custom travel / MICE',
        inquiryKey: 'wingsplus',
      },
      {
        brand: 'WingsCare',
        category: 'TRAVEL CARE & SUPPORT',
        description: 'Need assistance? WingsCare is always with you.',
        buttonLabel: 'I need travel support',
        inquiryKey: 'wingscare',
      },
    ],
  },
}

export const JourneyInquiryGrid: React.FC = () => {
  const router = useRouter()
  const locale = useSitePublicLocale()
  const toSitePath = useSitePath()
  const isEnglish = locale === 'en'
  const data = isEnglish ? inquiryData.en : inquiryData.vi

  const handleSelectInquiry = (card: InquiryCard) => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        WINGSGROUP_CONTACT_FOCUS_SESSION_KEY,
        WINGSGROUP_CONTACT_FORM_ANCHOR,
      )
      window.sessionStorage.setItem('wingsgroup_selected_inquiry', card.brand)
    }
    router.push(toSitePath(`/lien-he#contact-form?brand=${card.inquiryKey}`))
  }

  return (
    <section
      aria-labelledby="journey-inquiry-title"
      className={`${styles.section} ${styles.journeyInquirySection}`}
      id="journey-inquiry"
    >
      <div className="container">
        <header className={styles.sectionHeader}>
          <p className={styles.eyebrow}>
            {isEnglish ? 'Personalized Consultation' : 'Tư vấn theo nhu cầu'}
          </p>
          <h2 className={styles.sectionTitle} id="journey-inquiry-title">
            {data.title}
          </h2>
          <p className={styles.sectionDescription}>{data.subtitle}</p>
        </header>

        <div className={styles.journeyInquiryGrid}>
          {data.cards.map((card) => {
            const IconComponent = INQUIRY_ICONS[card.inquiryKey] || SparklesIcon
            return (
              <article className={styles.journeyInquiryCard} key={card.inquiryKey}>
                <div className={styles.journeyInquiryIcon}>
                  <IconComponent aria-hidden="true" className="h-5 w-5" />
                </div>
                <span className={styles.journeyInquiryCategory}>{card.category}</span>
                <h3 className={styles.journeyInquiryBrand}>{card.brand}</h3>
                <p className={styles.journeyInquiryDesc}>{card.description}</p>
                <button
                  className={styles.journeyInquiryButton}
                  data-od-id={`journey-inquiry-${card.inquiryKey}`}
                  data-wingsgroup-consultation-trigger="true"
                  onClick={() => handleSelectInquiry(card)}
                  type="button"
                >
                  {card.buttonLabel}
                  <ArrowRightIcon aria-hidden="true" className="ml-1.5 inline-block h-3.5 w-3.5" />
                </button>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
