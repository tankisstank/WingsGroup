'use client'

import { ArrowRightIcon, ImageIcon } from 'lucide-react'
import React, { useEffect, useId, useRef, useState } from 'react'

import { Media } from '@/components/Media'
import { SiteLink } from '@/components/SiteLink'
import type { WingsGroupEcosystemBlock } from '@/payload-types'

import { isWingsGroupPublishedMedia, resolveEcosystemCTA } from './model'
import styles from './WingsGroupV3.module.css'
import { useReducedMotion } from './useReducedMotion'

type Props = WingsGroupEcosystemBlock & {
  approvedProofKeys?: readonly string[]
  locale?: null | string
}

const copyByLocale = {
  en: {
    approved: 'Verified information available',
    fallback: 'The destination remains under review. This request will stay with WingsGroup.',
    imagePending: 'Editorial image pending publication review',
    notApplicable: 'No public proof required',
    pending: 'Being updated',
    tabs: 'Choose a WingsGroup service brand',
  },
  vi: {
    approved: 'Đã có thông tin được xác minh',
    fallback: 'Điểm đến đang được kiểm tra. Yêu cầu sẽ tiếp tục qua WingsGroup.',
    imagePending: 'Ảnh biên tập đang chờ kiểm duyệt công bố',
    notApplicable: 'Không yêu cầu hồ sơ công khai',
    pending: 'Đang cập nhật',
    tabs: 'Chọn thương hiệu dịch vụ trong WingsGroup',
  },
} as const

export const EcosystemExplorer = ({
  approvedProofKeys = [],
  description,
  eyebrow,
  locale,
  profiles,
  title,
}: Props) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [manualPause, setManualPause] = useState(false)
  const id = useId().replace(/:/g, '')
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const reducedMotion = useReducedMotion()
  const copy = locale === 'en' ? copyByLocale.en : copyByLocale.vi
  const safeProfiles = profiles || []
  const activeProfile = safeProfiles[activeIndex] || safeProfiles[0]

  useEffect(() => {
    if (activeIndex < safeProfiles.length) return
    setActiveIndex(0)
  }, [activeIndex, safeProfiles.length])

  useEffect(() => {
    if (reducedMotion || manualPause || isPaused || safeProfiles.length < 2) return

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setActiveIndex((current) => (current + 1) % safeProfiles.length)
      }
    }, 7000)

    return () => window.clearInterval(timer)
  }, [isPaused, manualPause, reducedMotion, safeProfiles.length])

  if (!activeProfile) return null

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

  const cta = resolveEcosystemCTA(activeProfile, locale)
  const hasApprovedProof =
    activeProfile.proofState === 'approved' &&
    (activeProfile.proofReferences || []).some((reference) =>
      approvedProofKeys.includes(reference.key),
    )
  const proofLabel = hasApprovedProof
    ? copy.approved
    : activeProfile.proofState === 'not-applicable'
      ? copy.notApplicable
      : copy.pending
  const panelID = `${id}-ecosystem-panel`
  const media = isWingsGroupPublishedMedia(activeProfile.stageMedia)
    ? activeProfile.stageMedia
    : null
  const ctaContent = (
    <>
      {cta.label}
      <ArrowRightIcon aria-hidden="true" size={17} />
    </>
  )

  return (
    <section
      aria-labelledby={`${id}-title`}
      className={`${styles.section} ${styles.ecosystemSection}`}
      data-testid="wingsgroup-ecosystem"
      id="ecosystem"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false)
      }}
      onFocus={() => {
        setIsPaused(true)
        setManualPause(true)
      }}
      onMouseEnter={() => {
        setIsPaused(true)
        setManualPause(true)
      }}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="container">
        <header className={styles.sectionHeader}>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h2 className={styles.sectionTitle} id={`${id}-title`}>
            {title}
          </h2>
          {description ? <p className={styles.sectionDescription}>{description}</p> : null}
        </header>

        <div className={styles.ecosystemFrame} data-testid="wingsgroup-ecosystem-frame">
          <div aria-label={copy.tabs} className={styles.ecosystemTabs} role="tablist">
            {safeProfiles.map((profile, index) => (
              <button
                aria-controls={panelID}
                aria-selected={activeIndex === index}
                className={styles.ecosystemTab}
                id={`${id}-ecosystem-tab-${index}`}
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
                <span>{profile.brandName}</span>
                <ArrowRightIcon aria-hidden="true" size={16} />
              </button>
            ))}
          </div>

          <div
            aria-labelledby={`${id}-ecosystem-tab-${activeIndex}`}
            className={styles.ecosystemPanel}
            id={panelID}
            role="tabpanel"
          >
            <div className={styles.ecosystemStage}>
              {media ? (
                <Media
                  className={styles.stageMedia}
                  fill
                  imgClassName={styles.stageMedia}
                  resource={media}
                  size="(max-width: 850px) 100vw, 60vw"
                />
              ) : (
                <div className={styles.mediaPending} role="status">
                  <ImageIcon aria-hidden="true" size={28} />
                  <span>{copy.imagePending}</span>
                </div>
              )}
            </div>

            <div aria-live="polite" className={styles.ecosystemDetails}>
              <div className={styles.ecosystemCopy}>
                <h3>{activeProfile.brandName}</h3>
                <p>{activeProfile.description}</p>
                <ul
                  aria-label={locale === 'en' ? 'Service scope' : 'Phạm vi dịch vụ'}
                  className={styles.serviceList}
                >
                  {activeProfile.serviceScope.map((service, index) => (
                    <li key={`${service.label}-${service.id || index}`}>{service.label}</li>
                  ))}
                </ul>
                <p
                  className={styles.proofState}
                  data-state={hasApprovedProof ? 'approved' : 'pending'}
                >
                  {proofLabel}
                </p>
              </div>
              <div className={styles.ecosystemAction}>
                {cta.href.startsWith('https://') ? (
                  <a
                    className={styles.ecosystemCta}
                    data-cta-state="approved-deep-link"
                    href={cta.href}
                    rel="noopener noreferrer"
                  >
                    {ctaContent}
                  </a>
                ) : (
                  <SiteLink
                    className={styles.ecosystemCta}
                    data-cta-state="contact-fallback"
                    href={cta.href}
                  >
                    {ctaContent}
                  </SiteLink>
                )}
                {cta.isFallback ? <p className={styles.fallbackNote}>{copy.fallback}</p> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
