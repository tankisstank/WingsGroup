'use client'

import { ArrowUpRightIcon } from 'lucide-react'
import React, { useEffect, useId, useRef, useState } from 'react'

import { Media } from '@/components/Media'
import { SiteLink } from '@/components/SiteLink'
import type { WingsGroupEcosystemBlock } from '@/payload-types'

import {
  isWingsGroupRenderableMedia,
  isWingsGroupPublishedMedia,
  resolveEcosystemCTA,
  resolveWingsGroupEcosystemProfiles,
  WINGSGROUP_PROFILE_PRESENTATION,
} from './model'
import styles from './WingsGroupV3.module.css'
import { useReducedMotion } from './useReducedMotion'

type Props = WingsGroupEcosystemBlock & {
  approvedProofKeys?: readonly string[]
  allowWingsGroupDevelopmentMedia?: boolean
  locale?: null | string
  showDeepDiveLinks?: boolean
}

const copyByLocale = {
  en: {
    choose: 'Choose a WingsGroup service brand',
    mediaFallback: 'A governed service image will appear here when available.',
    proof: 'Client feedback:',
    verified: 'Verified information is available.',
    railDescription: 'Select a team to see how it can accompany your next step.',
    railTitle: 'Choose a service team',
    exploreCapabilities: 'Explore capabilities and services',
    exploreEcosystem: 'Explore the five-brand ecosystem',
  },
  vi: {
    choose: 'Chọn thương hiệu dịch vụ trong WingsGroup',
    mediaFallback: 'Hình ảnh dịch vụ được kiểm soát sẽ xuất hiện khi sẵn sàng.',
    proof: 'Phản hồi sau dịch vụ:',
    verified: 'Đã có thông tin được xác minh.',
    railDescription: 'Chạm để xem cách từng đội ngũ đồng hành cùng bạn.',
    railTitle: 'Chọn một đơn vị',
    exploreCapabilities: 'Xem chi tiết năng lực và dịch vụ',
    exploreEcosystem: 'Tìm hiểu hệ sinh thái 5 thương hiệu',
  },
} as const

export const EcosystemExplorer = ({
  approvedProofKeys = [],
  allowWingsGroupDevelopmentMedia = false,
  description,
  eyebrow,
  locale,
  profiles,
  showDeepDiveLinks = false,
  title,
}: Props) => {
  const safeProfiles = resolveWingsGroupEcosystemProfiles(profiles)
  const [activeIndex, setActiveIndex] = useState(0)
  const [manualPause, setManualPause] = useState(false)
  const id = useId().replace(/:/g, '')
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const reducedMotion = useReducedMotion()
  const copy = locale === 'en' ? copyByLocale.en : copyByLocale.vi
  const activeProfile = safeProfiles[activeIndex] || safeProfiles[0]

  useEffect(() => {
    if (activeIndex < safeProfiles.length) return
    setActiveIndex(0)
  }, [activeIndex, safeProfiles.length])

  useEffect(() => {
    if (reducedMotion || manualPause || safeProfiles.length < 2) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setActiveIndex((current) => (current + 1) % safeProfiles.length)
      }
    }, 7000)
    return () => window.clearInterval(timer)
  }, [manualPause, reducedMotion, safeProfiles.length])

  if (!activeProfile) return null

  const presentation =
    WINGSGROUP_PROFILE_PRESENTATION[activeProfile.brandKey]?.[locale === 'en' ? 'en' : 'vi']
  const cta = resolveEcosystemCTA(activeProfile, locale)
  const hasApprovedProof =
    activeProfile.proofState === 'approved' &&
    (activeProfile.proofReferences || []).some((reference) =>
      approvedProofKeys.includes(reference.key),
    )
  const mediaPredicate = allowWingsGroupDevelopmentMedia
    ? isWingsGroupRenderableMedia
    : isWingsGroupPublishedMedia
  const media = mediaPredicate(activeProfile.stageMedia) ? activeProfile.stageMedia : null
  const panelID = `${id}-ecosystem-active-detail`

  const selectProfile = (index: number, focus = false) => {
    setActiveIndex(index)
    setManualPause(true)
    if (focus) tabRefs.current[index]?.focus()
  }

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % safeProfiles.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + safeProfiles.length) % safeProfiles.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = safeProfiles.length - 1
    }
    if (nextIndex === null) return
    event.preventDefault()
    selectProfile(nextIndex, true)
  }

  return (
    <section
      aria-labelledby={`${id}-title`}
      className={`${styles.section} ${styles.ecosystemSection}`}
      data-od-id="ecosystem"
      data-profile-count={safeProfiles.length}
      data-testid="wingsgroup-ecosystem"
      id="about"
      onFocus={() => setManualPause(true)}
      onMouseEnter={() => setManualPause(true)}
    >
      <span aria-hidden="true" className={styles.anchor} id="ecosystem" />
      <div className="container">
        <header className={styles.sectionHeader} data-od-id="ecosystem-unified-heading">
          <div>
            {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
            <h2 className={styles.sectionTitle} id={`${id}-title`}>
              {title ||
                (locale === 'en'
                  ? 'One ecosystem. Five ways to move forward.'
                  : 'Một hệ sinh thái. Năm cách đồng hành.')}
            </h2>
          </div>
          <p className={styles.sectionDescription} id="services">
            {description ||
              (locale === 'en'
                ? 'Choose what you need. Each brand connects you with a focused team and a clear next step.'
                : 'Chọn điều bạn đang cần. Mỗi thương hiệu kết nối bạn với một đội ngũ, dịch vụ và điểm bắt đầu riêng.')}
          </p>
          {showDeepDiveLinks ? (
            <div className={styles.sectionHeaderActions}>
              <SiteLink className={styles.routeCta} href="/nang-luc-dich-vu">
                {copy.exploreCapabilities} <span aria-hidden="true">↗</span>
              </SiteLink>
              <SiteLink className={styles.routeCta} href="/he-sinh-thai">
                {copy.exploreEcosystem} <span aria-hidden="true">↗</span>
              </SiteLink>
            </div>
          ) : null}
        </header>

        <div className={styles.ecosystemUnified} data-od-id="ecosystem-unified-stage">
          <article aria-live="polite" className={styles.unifiedStage}>
            {media ? (
              <Media
                className={styles.unifiedStageImage}
                fill
                imgClassName={styles.unifiedStageImage}
                priority={activeIndex === 0}
                resource={media}
                size="(max-width: 850px) 100vw, 58vw"
              />
            ) : (
              <div className={styles.mediaPending} data-media-state="safe-fallback">
                <strong>{copy.mediaFallback}</strong>
              </div>
            )}
            <div className={styles.unifiedStageContent}>
              <p className={styles.unifiedStageKicker}>
                {String(activeIndex + 1).padStart(2, '0')} / {presentation?.category}
              </p>
              <p className={styles.unifiedStageTitle}>{activeProfile.brandName}</p>
              <p className={styles.unifiedStageSubtitle}>{presentation?.stageTitle}</p>
              <p className={styles.unifiedStageCopy}>{activeProfile.description}</p>
            </div>
          </article>

          <div className={styles.unifiedRailShell}>
            <div className={styles.unifiedRailHeading}>
              <b>{copy.railTitle}</b>
              <p>{copy.railDescription}</p>
            </div>
            <div aria-label={copy.choose} className={styles.unifiedRail} role="tablist">
              {safeProfiles.map((profile, index) => (
                <button
                  aria-controls={panelID}
                  aria-selected={activeIndex === index}
                  className={styles.unifiedBrand}
                  data-od-id={`unified-brand-${profile.brandKey}`}
                  key={`${profile.brandKey}-${profile.id || index}`}
                  onClick={() => selectProfile(index)}
                  onKeyDown={(event) => onTabKeyDown(event, index)}
                  ref={(node) => {
                    tabRefs.current[index] = node
                  }}
                  role="tab"
                  tabIndex={activeIndex === index ? 0 : -1}
                  type="button"
                >
                  <span className={styles.unifiedBrandNumber}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.unifiedBrandCopy}>
                    <b translate="no">{profile.brandName}</b>
                    <small>{profile.serviceScope[0]?.label || presentation?.category}</small>
                  </span>
                  <span className={styles.unifiedBrandAction}>
                    {locale === 'en' ? 'Explore' : 'Khám phá'}
                  </span>
                </button>
              ))}
            </div>

            <div className={styles.unifiedDirectory}>
              <article
                aria-live="polite"
                className={styles.unifiedDetailPanel}
                data-od-id="ecosystem-active-detail"
                id={panelID}
                role="tabpanel"
              >
                <div className={styles.unifiedDetailIdent}>
                  <h3>{activeProfile.brandName}</h3>
                  <p>{presentation?.category}</p>
                </div>
                <div className={styles.unifiedDetailContent}>
                  <p className={styles.unifiedDetailCopy}>{activeProfile.description}</p>
                  {hasApprovedProof ? (
                    <p className={styles.unifiedDetailProof}>
                      <b>{copy.proof}</b> {copy.verified}
                    </p>
                  ) : null}
                  <ul className={styles.unifiedDetailServices}>
                    {activeProfile.serviceScope.slice(0, 3).map((service, index) => (
                      <li key={`${service.label}-${service.id || index}`}>{service.label}</li>
                    ))}
                  </ul>
                  {cta.href.startsWith('https://') ? (
                    <a
                      className={styles.unifiedDetailCta}
                      data-cta-state="approved-deep-link"
                      href={cta.href}
                      rel="noopener noreferrer"
                    >
                      {cta.label} <ArrowUpRightIcon aria-hidden="true" size={16} />
                    </a>
                  ) : (
                    <SiteLink
                      className={styles.unifiedDetailCta}
                      data-cta-state="contact-fallback"
                      href={cta.href}
                    >
                      {cta.label} <ArrowUpRightIcon aria-hidden="true" size={16} />
                    </SiteLink>
                  )}
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
