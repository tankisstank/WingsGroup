'use client'

import React from 'react'
import { StarIcon } from 'lucide-react'
import { SiteLink } from '@/components/SiteLink'
import styles from './WingsGroupV3.module.css'

interface Props {
  locale?: null | string
}

export const WingsGroupTestimonialsSection: React.FC<Props> = ({ locale = 'vi' }) => {
  const isEnglish = locale === 'en'

  const testimonials = [
    {
      author: isEnglish ? 'Ms. Thu Trang (Hanoi)' : 'Chị Thu Trang (Hà Nội)',
      brand: 'WingsGo',
      category: isEnglish ? 'International Travel' : 'Du lịch nước ngoài',
      trip: isEnglish ? 'Cherry Blossom Japan Tour' : 'Tour Nhật Bản mùa hoa anh đào',
      rating: 5,
      quote: isEnglish
        ? 'The all-inclusive Japan tour was exceptionally well organized. The tour guide was enthusiastic and the itinerary was perfect for our multi-generational family. Everyone was delighted!'
        : 'Tour Nhật Bản trọn gói cực kỳ chu đáo, hướng dẫn viên nhiệt tình, lịch trình hợp lý cho gia đình có người lớn tuổi. Cả nhà đều rất hài lòng!',
    },
    {
      author: isEnglish ? 'Mr. Minh Hoang (Da Nang)' : 'Anh Minh Hoàng (Đà Nẵng)',
      brand: 'WingsPlus',
      category: isEnglish ? 'Private Journeys & MICE' : 'Hành trình riêng & MICE',
      trip: isEnglish ? 'Corporate MICE & Teambuilding' : 'Teambuilding & Hội thảo Doanh nghiệp (150 khách)',
      rating: 5,
      quote: isEnglish
        ? 'Our 150-person corporate MICE and teambuilding trip in Phu Quoc was executed with utmost professionalism. Unexpected requests were solved swiftly. We look forward to working with WingsGroup again!'
        : 'Dịch vụ MICE và teambuilding 150 người tại Phú Quốc được tổ chức rất chuyên nghiệp, xử lý phát sinh nhanh chóng. Sẽ tiếp tục đồng hành cùng WingsGroup trong các chương trình tới!',
    },
    {
      author: isEnglish ? 'Mr. Le Nam (HCMC)' : 'Bác Lê Nam (TP.HCM)',
      brand: 'WingsPass',
      category: isEnglish ? 'Airport Services' : 'Dịch vụ sân bay',
      trip: isEnglish ? 'Tan Son Nhat Fast Track' : 'Dịch vụ Fast Track & Đón tiễn Sân bay',
      rating: 5,
      quote: isEnglish
        ? 'The Fast Track and airport concierge service at Tan Son Nhat saved me so much time. Staff were attentive and escorted us right to the departure gate.'
        : 'Dịch vụ Fast Track và hỗ trợ sân bay tại Tân Sơn Nhất giúp tiết kiệm rất nhiều thời gian, nhân viên ân cần hỗ trợ tận cửa ra máy bay. Rất an tâm và thuận tiện!',
    },
  ]

  return (
    <section
      aria-labelledby="testimonials-heading"
      className={`${styles.section} ${styles.testimonialsSection}`}
      data-od-id="testimonials"
      id="testimonials"
    >
      <div className="container">
        <header className={styles.sectionHeader}>
          <p className={styles.eyebrow}>
            {isEnglish ? 'CLIENT TESTIMONIALS & SOCIAL PROOF' : 'ĐÁNH GIÁ & PHẢN HỒI THỰC TẾ'}
          </p>
          <h2 className={styles.sectionTitle} id="testimonials-heading">
            {isEnglish
              ? 'What Our Clients Say About WingsGroup'
              : 'Khách hàng nói gì về WingsGroup?'}
          </h2>
          <p className={styles.sectionDescription}>
            {isEnglish
              ? 'Every complete journey begins with trust and dedicated accompaniment.'
              : 'Những hành trình trọn vẹn bắt đầu từ sự tin tưởng và đồng hành tận tâm.'}
          </p>
        </header>

        <div className={styles.testimonialsGrid}>
          {testimonials.map((item, idx) => (
            <article className={styles.testimonialCard} key={idx}>
              <div aria-label={`${item.rating} stars`} className={styles.testimonialStars}>
                {Array.from({ length: item.rating }).map((_, i) => (
                  <StarIcon
                    aria-hidden="true"
                    className={styles.starIcon}
                    fill="currentColor"
                    key={i}
                    size={16}
                  />
                ))}
              </div>
              <blockquote className={styles.testimonialQuote}>
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <div className={styles.testimonialMeta}>
                <div className={styles.testimonialAuthor}>{item.author}</div>
                <div className={styles.testimonialTrip}>{item.trip}</div>
                <span className={styles.testimonialBrandTag}>
                  {item.brand} · {item.category}
                </span>
              </div>
            </article>
          ))}
        </div>

        {/* Conversion Banner (Slide 12) */}
        <div className={styles.testimonialConversionBanner}>
          <div className={styles.conversionCopy}>
            <h3>
              {isEnglish
                ? 'Ready for your own complete journey with WingsGroup?'
                : 'Bạn cũng muốn có một hành trình trọn vẹn như khách hàng của WingsGroup?'}
            </h3>
            <p>
              {isEnglish
                ? 'From international trips and Vietnam discoveries to airport concierge and private MICE — let our specialists guide you.'
                : 'Từ du lịch quốc tế, trải nghiệm Việt Nam đến dịch vụ sân bay và MICE — hãy để đội ngũ chuyên viên WingsGroup tư vấn phương án tối ưu cho bạn.'}
            </p>
          </div>
          <div className={styles.conversionActions}>
            <SiteLink className={styles.conversionSecondaryBtn} href="#services">
              {isEnglish ? 'EXPLORE TOURS' : 'XEM TOUR'}
            </SiteLink>
            <SiteLink
              className={styles.conversionPrimaryBtn}
              data-wingsgroup-consultation-trigger="true"
              href="/lien-he#contact-form"
            >
              {isEnglish ? 'GET CONSULTATION' : 'NHẬN TƯ VẤN'}
            </SiteLink>
          </div>
        </div>
      </div>
    </section>
  )
}
