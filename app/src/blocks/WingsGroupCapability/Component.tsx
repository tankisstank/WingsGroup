import type { FeatureGridBlock as FeatureGridBlockProps } from '@/payload-types'
import React from 'react'

import { SiteLink } from '@/components/SiteLink'
import { WINGSGROUP_CAPABILITY_ROWS } from '@/components/WingsGroupV3/model'
import styles from '@/components/WingsGroupV3/WingsGroupV3.module.css'

type Props = Pick<FeatureGridBlockProps, 'description' | 'eyebrow' | 'items' | 'title'> & {
  locale?: null | string
}

const stepsData = {
  vi: [
    {
      step: '01',
      title: 'Tiếp nhận nhu cầu & tư vấn 24/7 📞',
      desc: 'Lắng nghe mong muốn, gợi ý giải pháp phù hợp ngân sách và thời gian của từng khách hàng.',
    },
    {
      step: '02',
      title: 'Lên chương trình & báo giá rõ ràng 📋',
      desc: 'Chi tiết từng dịch vụ, minh bạch chi phí, không có phụ phí phát sinh ngoài thỏa thuận.',
    },
    {
      step: '03',
      title: 'Chốt dịch vụ & chuẩn bị trước chuyến đi ✈️',
      desc: 'Hướng dẫn đầy đủ thủ tục, giấy tờ, visa và những lưu ý cần thiết cho hành trình.',
    },
    {
      step: '04',
      title: 'Theo sát đoàn trong suốt hành trình 🤝',
      desc: 'Điều phối viên hỗ trợ xuyên suốt, xử lý kịp thời và chu đáo mọi tình huống phát sinh.',
    },
  ],
  en: [
    {
      step: '01',
      title: 'Consultation & Inquiry Intake 24/7 📞',
      desc: 'Listening to your requirements and tailoring options suited to budget and timeline.',
    },
    {
      step: '02',
      title: 'Transparent Itinerary & Quotation 📋',
      desc: 'Clear breakdown of each service with no hidden or unexpected costs.',
    },
    {
      step: '03',
      title: 'Service Confirmation & Pre-trip Briefing ✈️',
      desc: 'Complete guidance on documents, visas and essential pre-departure notes.',
    },
    {
      step: '04',
      title: 'Dedicated On-trip Support 🤝',
      desc: 'Continuous coordination and prompt resolution of any on-the-ground needs.',
    },
  ],
}

const standardsData = {
  vi: [
    {
      title: 'An toàn & tin cậy 🛡️',
      desc: 'Dịch vụ đúng cam kết, pháp lý minh bạch, bảo hiểm du lịch đầy đủ.',
    },
    {
      title: 'Đội ngũ chuyên nghiệp 👨‍💼',
      desc: 'Nhân sự giàu kinh nghiệm, am hiểu sâu sắc tuyến điểm, hỗ trợ tận tình.',
    },
    {
      title: 'Tận tâm với từng hành trình ❤️',
      desc: 'Mỗi khách hàng là một trải nghiệm riêng biệt, luôn lắng nghe và đồng hành.',
    },
    {
      title: 'Hãng bay & dịch vụ được lựa chọn kỹ ✈️',
      desc: 'Hợp tác chặt chẽ với các đối tác hàng không, lưu trú và vận tải uy tín.',
    },
    {
      title: 'Khách sạn phù hợp tiêu chuẩn 🏨',
      desc: 'Đảm bảo tiện nghi, vị trí thuận tiện và đúng cam kết theo chương trình.',
    },
    {
      title: 'Vận chuyển & điều hành đoàn 🚌',
      desc: 'Xe đời mới tiện nghi, tài xế kinh nghiệm, điều hành sát sao từng chặng.',
    },
  ],
  en: [
    {
      title: 'Safety & Trust 🛡️',
      desc: 'Fully committed services, licensed operations and comprehensive travel insurance.',
    },
    {
      title: 'Professional Team 👨‍💼',
      desc: 'Experienced specialists with deep destination knowledge and attentive support.',
    },
    {
      title: 'Care for Every Journey ❤️',
      desc: 'Treating each traveller as a unique journey with tailored attention.',
    },
    {
      title: 'Carefully Selected Airlines & Partners ✈️',
      desc: 'Direct partnerships with leading carriers, hotels and vetted local vendors.',
    },
    {
      title: 'Standard-Compliant Accommodations 🏨',
      desc: 'Comfortable, well-located hotels meeting all agreed program standards.',
    },
    {
      title: 'Reliable Fleet & Tour Operations 🚌',
      desc: 'Modern vehicles, experienced drivers, and tight operational coordination.',
    },
  ],
}

export const WingsGroupCapabilitySection = ({ description, eyebrow, locale, title }: Props) => {
  const isEnglish = locale === 'en'
  const fallbackRows = WINGSGROUP_CAPABILITY_ROWS[isEnglish ? 'en' : 'vi']
  const rows = fallbackRows
  const steps = isEnglish ? stepsData.en : stepsData.vi
  const standards = isEnglish ? standardsData.en : standardsData.vi

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
            <p className={styles.eyebrow}>
              {eyebrow || (isEnglish ? 'SPECIALIZED CAPABILITIES' : 'NĂNG LỰC PHỤC VỤ CHUYÊN SÂU')}
            </p>
            <h2 className={styles.sectionTitle} id="wingsgroup-capability-title">
              {title ||
                (isEnglish
                  ? 'Professional Services - Complete Journey with WingsGroup'
                  : 'Dịch vụ chuyên nghiệp - Trọn vẹn hành trình cùng WingsGroup')}
            </h2>
          </div>
          <p className={styles.sectionDescription}>
            {description ||
              (isEnglish
                ? 'Not all journeys are the same. WingsGroup connects travel, airport services, private itineraries and MICE so every need is properly advised.'
                : 'Không phải mọi chuyến đi đều giống nhau. WingsGroup kết nối hệ sinh thái dịch vụ từ du lịch, sân bay, hành trình riêng đến MICE, để mỗi nhu cầu được tư vấn đúng và triển khai trọn vẹn.')}
          </p>
        </header>

        <div className={styles.capabilityBadges}>
          <span className={styles.capabilityBadge}>
            <span aria-hidden="true">🛡️</span> {isEnglish ? 'Safe & Trusted' : 'An toàn & Tin cậy'}
          </span>
          <span className={styles.capabilityBadge}>
            <span aria-hidden="true">👥</span> {isEnglish ? 'Professional Team' : 'Đội ngũ chuyên nghiệp'}
          </span>
          <span className={styles.capabilityBadge}>
            <span aria-hidden="true">❤️</span> {isEnglish ? 'Dedicated Support' : 'Tận tâm với từng hành trình'}
          </span>
        </div>

        {/* Visual Highlights Gallery (Slide 05: Image slots for diverse visuals) */}
        <div className={styles.capabilityGallery}>
          <div className={styles.capabilityGalleryItem}>
            <div className={styles.capabilityGalleryImagePlaceholder}>
              <span>✈️ {isEnglish ? 'WingsGo Abroad' : 'WingsGo Du lịch quốc tế'}</span>
            </div>
            <p>
              {isEnglish
                ? 'Well-prepared international itineraries with direct partner connectivity.'
                : 'Hành trình chuẩn bị chu đáo, kết nối trực tiếp đối tác hàng không và lữ hành quốc tế.'}
            </p>
          </div>
          <div className={styles.capabilityGalleryItem}>
            <div className={styles.capabilityGalleryImagePlaceholder}>
              <span>🇻🇳 {isEnglish ? 'WingSide Vietnam' : 'WingSide Khám phá Việt Nam'}</span>
            </div>
            <p>
              {isEnglish
                ? 'Deep cultural and scenic journeys across Vietnam destinations.'
                : 'Đi gần, trải nghiệm sâu sắc văn hóa và cảnh quan đặc sắc khắp mọi miền đất nước.'}
            </p>
          </div>
          <div className={styles.capabilityGalleryItem}>
            <div className={styles.capabilityGalleryImagePlaceholder}>
              <span>🛫 {isEnglish ? 'WingsPass Airport' : 'WingsPass Dịch vụ sân bay'}</span>
            </div>
            <p>
              {isEnglish
                ? 'Fast Track, executive lounge access, and expedited terminal assistance.'
                : 'Đón tiễn Fast Track, phòng chờ thương gia và hỗ trợ thủ tục nhanh chóng, tiện lợi.'}
            </p>
          </div>
          <div className={styles.capabilityGalleryItem}>
            <div className={styles.capabilityGalleryImagePlaceholder}>
              <span>👥 {isEnglish ? 'WingsPlus MICE' : 'WingsPlus Hành trình riêng & MICE'}</span>
            </div>
            <p>
              {isEnglish
                ? 'Tailored private journeys, corporate events and team building.'
                : 'Thiết kế may đo theo yêu cầu cho gia đình và chương trình hội nghị, sự kiện doanh nghiệp.'}
            </p>
          </div>
        </div>

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
            {isEnglish ? 'Consult with us 🎧' : 'Gặp nhân viên tư vấn 🎧'}
          </SiteLink>
        </div>
      </div>
    </section>
  )
}
