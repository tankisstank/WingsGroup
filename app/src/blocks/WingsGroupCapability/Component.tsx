import type { FeatureGridBlock as FeatureGridBlockProps } from '@/payload-types'
import Image from 'next/image'
import React from 'react'
import {
  BadgeCheckIcon,
  BedDoubleIcon,
  BusFrontIcon,
  ClipboardCheckIcon,
  HeadphonesIcon,
  HeartHandshake,
  MessageCircleIcon,
  PlaneIcon,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react'

import { SiteLink } from '@/components/SiteLink'
import { WINGSGROUP_CAPABILITY_ROWS } from '@/components/WingsGroupV3/model'
import styles from '@/components/WingsGroupV3/WingsGroupV3.module.css'

type Props = Partial<Pick<FeatureGridBlockProps, 'description' | 'eyebrow' | 'items' | 'title'>> & {
  anchorId?: string
  locale?: null | string
}

const processTitleByLocale = {
  vi: 'QUY TRÌNH PHỤC VỤ RÕ RÀNG - ĐỒNG HÀNH TRỌN HÀNH TRÌNH',
  en: 'CLEAR SERVICE PROCESS - COMPLETE JOURNEY SUPPORT',
} as const

const processDescriptionByLocale = {
  vi: 'Từ lúc tiếp nhận nhu cầu đến khi đoàn kết thúc chuyến đi, WingsGroup luôn có người phụ trách theo sát từng bước.',
  en: 'From inquiry intake to the end of the tour, WingsGroup always has dedicated coordinators following every step closely.',
} as const

const processSteps = {
  vi: [
    {
      Icon: MessageCircleIcon,
      description:
        'Tiếp nhận nhanh thông tin về số lượng khách, thời gian, điểm đến và ngân sách. Đội ngũ tư vấn chủ động đề xuất phương án phù hợp thay vì áp một lịch trình có sẵn.',
      step: '01',
      title: 'Tiếp nhận nhu cầu & tư vấn 24/7',
    },
    {
      Icon: ClipboardCheckIcon,
      description:
        'Từng hạng mục được tư vấn cụ thể: vé máy bay, khách sạn, xe đưa đón, ăn uống, điểm tham quan và dịch vụ đi kèm. Báo giá minh bạch, thống nhất trước khi xác nhận.',
      step: '02',
      title: 'Lên chương trình & báo giá rõ ràng',
    },
    {
      Icon: BadgeCheckIcon,
      description:
        'Sau khi thống nhất chương trình, WingsGroup tiến hành đặt dịch vụ và hoàn thiện hồ sơ đoàn. Khách được cập nhật đầy đủ thông tin cần thiết trước ngày khởi hành.',
      step: '03',
      title: 'Chốt dịch vụ & chuẩn bị trước chuyến đi',
    },
    {
      Icon: HeadphonesIcon,
      description:
        'Đội ngũ điều hành phối hợp cùng hướng dẫn viên và các nhà cung cấp dịch vụ để xử lý nhanh các tình huống phát sinh, đảm bảo hành trình diễn ra đúng kế hoạch.',
      step: '04',
      title: 'Theo sát đoàn trong suốt hành trình',
    },
  ],
  en: [
    {
      Icon: MessageCircleIcon,
      description:
        'Prompt intake of guest headcount, dates, destinations and budget. Advisors proactively suggest tailored options rather than imposing a preset itinerary.',
      step: '01',
      title: 'Consultation & Inquiry Intake 24/7',
    },
    {
      Icon: ClipboardCheckIcon,
      description:
        'Clear breakdown of each item: flights, hotels, transfers, dining, attractions and add-ons. Fully transparent and agreed before confirmation.',
      step: '02',
      title: 'Transparent Itinerary & Quotation',
    },
    {
      Icon: BadgeCheckIcon,
      description:
        'Upon confirmation, WingsGroup books services and completes guest dossiers. Travellers receive full briefings and documents well before departure.',
      step: '03',
      title: 'Service Confirmation & Pre-trip Briefing',
    },
    {
      Icon: HeadphonesIcon,
      description:
        'Operations team coordinates closely with tour guides and suppliers to promptly resolve any emerging situation and keep the schedule seamless.',
      step: '04',
      title: 'Dedicated On-trip Support',
    },
  ],
} as const

const standardsData = {
  vi: [
    {
      title: 'An toàn & tin cậy',
      desc: 'Ưu tiên các đối tác có thông tin rõ ràng, dịch vụ ổn định và phù hợp với từng chương trình. Mọi dịch vụ quan trọng đều được kiểm tra trước khi đưa vào lịch trình.',
    },
    {
      title: 'Đội ngũ chuyên nghiệp',
      desc: 'Tư vấn viên, điều hành và hướng dẫn viên phối hợp theo từng đoàn. Thông tin được bàn giao đầy đủ để hạn chế tối đa sai sót trong quá trình phục vụ.',
    },
    {
      title: 'Tận tâm với từng hành trình',
      desc: 'Mỗi đoàn có nhu cầu khác nhau. WingsGroup chú trọng lắng nghe từ những yêu cầu nhỏ nhất để điều chỉnh lịch trình, dịch vụ và cách phục vụ phù hợp.',
    },
    {
      title: 'Hãng bay & dịch vụ được lựa chọn kỹ',
      desc: 'Tùy từng hành trình, WingsGroup lựa chọn hãng hàng không và phương án bay phù hợp về giờ bay, hành lý, chi phí và sự thuận tiện cho đoàn.',
    },
    {
      title: 'Khách sạn phù hợp tiêu chuẩn',
      desc: 'Ưu tiên khách sạn có vị trí thuận tiện, chất lượng dịch vụ ổn định và phù hợp với tiêu chuẩn đã tư vấn trong chương trình.',
    },
    {
      title: 'Vận chuyển & điều hành đoàn',
      desc: 'Chủ động sắp xếp phương tiện theo quy mô đoàn, lịch trình và đặc thù từng điểm đến; đảm bảo việc di chuyển thuận tiện và hạn chế thời gian chờ.',
    },
  ],
  en: [
    {
      title: 'Safety & Trust',
      desc: 'Prioritising partners with clear credentials, proven reliability and strict suitability. Key services are verified before inclusion in itineraries.',
    },
    {
      title: 'Professional Team',
      desc: 'Advisors, operators and tour leaders coordinate for each group. Full handover of requirements ensures flawless execution on the ground.',
    },
    {
      title: 'Care for Every Journey',
      desc: 'Every group has unique needs. WingsGroup listens carefully to individual requests to tailor scheduling, amenities and support.',
    },
    {
      title: 'Carefully Selected Airlines & Partners',
      desc: 'Selected according to schedule convenience, baggage allowances, cost-efficiency and maximum comfort for each itinerary.',
    },
    {
      title: 'Standard-Compliant Accommodations',
      desc: 'Prioritising well-located hotels with dependable service levels and verified standards matching the agreed program.',
    },
    {
      title: 'Reliable Fleet & Tour Operations',
      desc: 'Fleet selected according to group size, route terrain and local logistics; minimising waiting time and ensuring smooth transfers.',
    },
  ],
} as const

const standardImages = [
  {
    src: '/brand/wingsgroup/standards/safety-and-trust.webp',
    alt: {
      vi: 'Chuyên viên WingsGroup và đối tác rà soát lịch trình trước chuyến đi.',
      en: 'A WingsGroup advisor and partner reviewing a trip itinerary.',
    },
  },
  {
    src: '/brand/wingsgroup/standards/professional-team.webp',
    alt: {
      vi: 'Đội ngũ điều hành cùng thống nhất kế hoạch phục vụ đoàn.',
      en: 'A tour operations team aligning on a group travel plan.',
    },
  },
  {
    src: '/brand/wingsgroup/standards/care-for-every-journey.webp',
    alt: {
      vi: 'Tư vấn viên lắng nghe gia đình để thiết kế hành trình phù hợp.',
      en: 'A travel advisor listening to a family plan a tailored journey.',
    },
  },
  {
    src: '/brand/wingsgroup/standards/airlines-and-partners.webp',
    alt: {
      vi: 'Nhân viên hãng bay hỗ trợ hành khách lên máy bay tại sân bay.',
      en: 'An airline crew member welcoming travelers aboard at the airport.',
    },
  },
  {
    src: '/brand/wingsgroup/standards/hotel-standard.webp',
    alt: {
      vi: 'Phòng nghỉ khách sạn được chuẩn bị gọn gàng, hướng ra vịnh.',
      en: 'A well-prepared hotel room with a bay view.',
    },
  },
  {
    src: '/brand/wingsgroup/standards/fleet-and-tour-operations.webp',
    alt: {
      vi: 'Xe du lịch đón đoàn tại điểm ngắm cảnh để bắt đầu hành trình.',
      en: 'A tour vehicle welcoming guests at a scenic destination.',
    },
  },
] as const

const standardIcons = [
  ShieldCheck,
  UserRoundCheck,
  HeartHandshake,
  PlaneIcon,
  BedDoubleIcon,
  BusFrontIcon,
]

export const WingsGroupCapabilitySection = ({
  anchorId = 'services',
  description,
  eyebrow,
  locale,
  title,
}: Props) => {
  const isEnglish = locale === 'en'
  const fallbackRows = WINGSGROUP_CAPABILITY_ROWS[isEnglish ? 'en' : 'vi']
  // This route is a governed projection, not a generic feature-card renderer.
  // Keep the public service rows branded and stable even if CMS input changes.
  const rows = fallbackRows
  const processStepsForLocale = processSteps[isEnglish ? 'en' : 'vi']
  const standards = standardsData[isEnglish ? 'en' : 'vi']
  const valueBadges = isEnglish
    ? [
        { Icon: ShieldCheck, label: 'Safety & Trust' },
        { Icon: UserRoundCheck, label: 'Professional Team' },
        { Icon: HeartHandshake, label: 'Dedicated to Every Journey' },
      ]
    : [
        { Icon: ShieldCheck, label: 'An toàn & Tin cậy' },
        { Icon: UserRoundCheck, label: 'Đội ngũ chuyên nghiệp' },
        { Icon: HeartHandshake, label: 'Tận tâm với từng hành trình' },
      ]

  return (
    <section
      aria-labelledby="wingsgroup-capability-title"
      className={`${styles.section} ${styles.capabilitySection}`}
      data-archetype="capability"
      data-testid="wingsgroup-capability"
      id={anchorId}
    >
      <div className="container">
        <header className={styles.routeHeader}>
          <div>
            <p className={styles.eyebrow}>{resolvedEyebrow}</p>
            <h2 className={styles.sectionTitle} id="wingsgroup-capability-title">
              {title || processTitleByLocale[isEnglish ? 'en' : 'vi']}
            </h2>
          </div>
          <p className={styles.sectionDescription}>
            {description || processDescriptionByLocale[isEnglish ? 'en' : 'vi']}
          </p>
        </header>

        <ul
          aria-label={isEnglish ? 'WingsGroup value badges' : 'Ba giá trị cốt lõi'}
          className={styles.valueBadges}
          data-testid="wingsgroup-value-badges"
        >
          {valueBadges.map(({ Icon, label }) => (
            <li className={styles.valueBadge} key={label}>
              <Icon aria-hidden="true" className={styles.valueBadgeIcon} />
              <span>{label}</span>
            </li>
          ))}
        </ul>

        <div className={styles.serviceProcess} data-testid="wingsgroup-service-process">
          <p className={styles.processKicker}>
            {isEnglish ? 'FOUR STEPS, ONE DEDICATED TEAM' : 'BỐN BƯỚC, MỘT ĐỘI NGŨ ĐỒNG HÀNH'}
          </p>
          <ol
            aria-label={isEnglish ? 'Four-step service process' : 'Quy trình phục vụ 4 bước'}
            className={styles.processTimeline}
          >
            {processStepsForLocale.map(
              ({ Icon, description: stepDescription, step, title: stepTitle }) => (
                <li className={styles.processStep} data-process-step={step} key={step}>
                  <div className={styles.processStepMarker}>
                    <span className={styles.processStepNumber}>{step}</span>
                    <Icon aria-hidden="true" className={styles.processStepIcon} />
                  </div>
                  <div className={styles.processStepContent}>
                    <h3>{stepTitle}</h3>
                    <p>{stepDescription}</p>
                  </div>
                </li>
              ),
            )}
          </ol>
        </div>

        <section
          aria-labelledby="wingsgroup-quality-standards-title"
          className={styles.qualityStandards}
          data-testid="wingsgroup-quality-standards"
        >
          <header className={styles.qualityStandardsHeader}>
            <p className={styles.processKicker}>
              {isEnglish ? 'QUALITY STANDARDS' : 'TIÊU CHUẨN CHẤT LƯỢNG'}
            </p>
            <h3 className={styles.qualityStandardsTitle} id="wingsgroup-quality-standards-title">
              {isEnglish
                ? 'Standards WingsGroup Always Prioritises'
                : 'Những tiêu chuẩn WingsGroup luôn ưu tiên'}
            </h3>
          </header>
          <div className={styles.qualityStandardsGrid}>
            {standards.map((standard, index) => {
              const Icon = standardIcons[index]

              return (
                <article
                  className={styles.qualityStandardCard}
                  data-standard-card={String(index + 1)}
                  key={standard.title}
                >
                  <div className={styles.qualityStandardImage}>
                    <Image
                      alt={standardImages[index].alt[isEnglish ? 'en' : 'vi']}
                      className={styles.qualityStandardPhoto}
                      fill
                      sizes="(max-width: 600px) 100vw, (max-width: 850px) 50vw, 33vw"
                      src={standardImages[index].src}
                    />
                  </div>
                  <div className={styles.qualityStandardBody}>
                    <div className={styles.qualityStandardMeta}>
                      <span className={styles.qualityStandardIndex}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <Icon aria-hidden="true" className={styles.qualityStandardIcon} />
                    </div>
                    <h4 className={styles.qualityStandardTitle}>{standard.title}</h4>
                    <p className={styles.qualityStandardDescription}>{standard.desc}</p>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

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
                {isEnglish ? 'Request a consultation' : 'Trao đổi nhu cầu'}
                <span aria-hidden="true">↗</span>
              </SiteLink>
            </article>
          ))}
        </div>

        {/* CTA Banner (Slide 05 / 06) */}
        <div className={styles.capabilityBannerCTA}>
          <div className={styles.capabilityBannerText}>
            <h3>{isEnglish ? 'Ready for your next journey?' : 'Bạn chọn điểm đến. WingsGroup lo phần còn lại!'}</h3>
            <p>
              {isEnglish
                ? 'Get in touch with our specialists for tailored itineraries and dedicated support.'
                : 'Đội ngũ chuyên viên WingsGroup sẵn sàng tư vấn giải pháp phù hợp nhất cho chuyến đi của bạn.'}
            </p>
          </div>
          <SiteLink
            className={styles.capabilityBannerButton}
            data-wingsgroup-consultation-trigger="true"
            href="/lien-he#contact-form"
          >
            {isEnglish ? 'Consult with us' : 'Gặp nhân viên tư vấn'}
          </SiteLink>
        </div>
      </div>
    </section>
  )
}
