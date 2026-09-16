import type { FeatureGridBlock as FeatureGridBlockProps } from '@/payload-types'
import React from 'react'
import { HeartHandshake, ShieldCheck, UserRoundCheck } from 'lucide-react'

import { SiteLink } from '@/components/SiteLink'
import { WINGSGROUP_CAPABILITY_ROWS } from '@/components/WingsGroupV3/model'
import styles from '@/components/WingsGroupV3/WingsGroupV3.module.css'

type Props = Partial<Pick<FeatureGridBlockProps, 'description' | 'eyebrow' | 'items' | 'title'>> & {
  anchorId?: string
  locale?: null | string
}

const stepsData = {
  vi: [
    {
      step: '01',
      title: 'Tiếp nhận nhu cầu & tư vấn 24/7',
      desc: 'Tiếp nhận nhanh thông tin về số lượng khách, thời gian, điểm đến và ngân sách. Đội ngũ tư vấn chủ động đề xuất phương án phù hợp thay vì áp một lịch trình có sẵn.',
    },
    {
      step: '02',
      title: 'Lên chương trình & báo giá rõ ràng',
      desc: 'Từng hạng mục được tư vấn cụ thể: vé máy bay, khách sạn, xe đưa đón, ăn uống, điểm tham quan và dịch vụ đi kèm. Báo giá minh bạch, thống nhất trước khi xác nhận.',
    },
    {
      step: '03',
      title: 'Chốt dịch vụ & chuẩn bị trước chuyến đi',
      desc: 'Sau khi thống nhất chương trình, WingsGroup tiến hành đặt dịch vụ và hoàn thiện hồ sơ đoàn. Khách được cập nhật đầy đủ thông tin cần thiết trước ngày khởi hành.',
    },
    {
      step: '04',
      title: 'Theo sát đoàn trong suốt hành trình',
      desc: 'Đội ngũ điều hành phối hợp cùng hướng dẫn viên và các nhà cung cấp dịch vụ để xử lý nhanh các tình huống phát sinh, đảm bảo hành trình diễn ra đúng kế hoạch.',
    },
  ],
  en: [
    {
      step: '01',
      title: 'Consultation & Inquiry Intake 24/7',
      desc: 'Prompt intake of guest headcount, dates, destinations and budget. Advisors proactively suggest tailored options rather than imposing a preset itinerary.',
    },
    {
      step: '02',
      title: 'Transparent Itinerary & Quotation',
      desc: 'Clear breakdown of each item: flights, hotels, transfers, dining, attractions and add-ons. Fully transparent and agreed before confirmation.',
    },
    {
      step: '03',
      title: 'Service Confirmation & Pre-trip Briefing',
      desc: 'Upon confirmation, WingsGroup books services and completes guest dossiers. Travellers receive full briefings and documents well before departure.',
    },
    {
      step: '04',
      title: 'Dedicated On-trip Support',
      desc: 'Operations team coordinates closely with tour guides and suppliers to promptly resolve any emerging situation and keep the schedule seamless.',
    },
  ],
}

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
}

export const WingsGroupCapabilitySection = ({
  anchorId = 'services',
  description,
  eyebrow,
  locale,
  title,
}: Props) => {
  const isEnglish = locale === 'en'
  const fallbackRows = WINGSGROUP_CAPABILITY_ROWS[isEnglish ? 'en' : 'vi']
  const rows = fallbackRows
  const steps = isEnglish ? stepsData.en : stepsData.vi
  const standards = isEnglish ? standardsData.en : standardsData.vi

  const isLegacyTitle =
    !title ||
    title.includes('6 Giải pháp') ||
    title.includes('6 Specialized') ||
    title.includes('Năng lực dịch vụ')
  const resolvedEyebrow =
    !eyebrow ||
    eyebrow.toLowerCase().includes('cốt lõi') ||
    eyebrow.toLowerCase().includes('core capabilities')
      ? isEnglish
        ? 'SPECIALIZED CAPABILITIES'
        : 'NĂNG LỰC PHỤC VỤ CHUYÊN SÂU'
      : eyebrow
  const resolvedTitle = isLegacyTitle
    ? isEnglish
      ? 'Clear Service Process - Complete Accompaniment'
      : 'Quy trình phục vụ rõ ràng - Đồng hành trọn hành trình'
    : title
  const resolvedDescription = isLegacyTitle
    ? isEnglish
      ? 'From inquiry intake to the end of the tour, WingsGroup always has dedicated coordinators following every step closely.'
      : 'Từ lúc tiếp nhận nhu cầu đến khi đoàn kết thúc chuyến đi, WingsGroup luôn có người phụ trách theo sát từng bước.'
    : description ||
      (isEnglish
        ? 'Not all journeys are the same. WingsGroup connects travel, airport services, private itineraries and MICE so every need is properly advised.'
        : 'Không phải mọi chuyến đi đều giống nhau. WingsGroup kết nối hệ sinh thái dịch vụ từ du lịch, sân bay, hành trình riêng đến MICE, để mỗi nhu cầu được tư vấn đúng và triển khai trọn vẹn.')
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
              {resolvedTitle}
            </h2>
          </div>
          <p className={styles.sectionDescription}>{resolvedDescription}</p>
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

        {/* 2-Column Process & Standards Layout (Slide 05) */}
        <div className={styles.capabilityColumns}>
          <div className={styles.capabilityCol}>
            <div className={styles.capabilityColHeader}>
              <p className={styles.capabilityColKicker}>
                {isEnglish ? 'SERVICE PROCESS' : 'QUY TRÌNH PHỤC VỤ'}
              </p>
              <h3 className={styles.capabilityColTitle}>
                {isEnglish ? 'Clear Process - Complete Accompaniment' : 'Quy trình phục vụ rõ ràng / Đồng hành trọn hành trình'}
              </h3>
            </div>
            <div className={styles.capabilityItemList}>
              {steps.map((item) => (
                <div className={styles.capabilityItem} key={item.step}>
                  <span className={styles.capabilityItemIndex}>{item.step}</span>
                  <div className={styles.capabilityItemContent}>
                    <h4>{item.title}</h4>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.capabilityCol}>
            <div className={styles.capabilityColHeader}>
              <p className={styles.capabilityColKicker}>
                {isEnglish ? 'QUALITY STANDARDS' : 'TIÊU CHUẨN CHẤT LƯỢNG'}
              </p>
              <h3 className={styles.capabilityColTitle}>
                {isEnglish ? 'Standards WingsGroup Always Prioritises' : 'Những tiêu chuẩn WingsGroup luôn ưu tiên'}
              </h3>
            </div>
            <div className={styles.capabilityItemList}>
              {standards.map((item, idx) => (
                <div className={styles.capabilityItem} key={idx}>
                  <span className={styles.capabilityItemIndex}>0{idx + 1}</span>
                  <div className={styles.capabilityItemContent}>
                    <h4>{item.title}</h4>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5 Brand Service Rows */}
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
