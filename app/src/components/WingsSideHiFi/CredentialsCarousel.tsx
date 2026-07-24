'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon, XIcon } from 'lucide-react'

import type { CredentialsCarouselBlock } from '@/payload-types'
import { Media } from '@/components/Media'
import { SiteLink } from '@/components/SiteLink'

import { getWingsSideHiFiCopy } from './copy'
import {
  getProofTypeLabel,
  mapCredentialsBlockToProofRecords,
  type ProofRecord,
} from './proofArchiveViewModel'

type ProofFilter = 'all' | ProofRecord['category']

const filterOptions: ProofFilter[] = ['all', 'appointment', 'award']

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName.toLowerCase()
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable
  )
}

const pad = (value: number): string => String(value).padStart(2, '0')

export const WingsSideCredentialsCarousel = ({
  content,
  locale,
}: {
  content?: CredentialsCarouselBlock | null
  locale?: null | string
}) => {
  const copy = getWingsSideHiFiCopy(locale)
  const labels = copy.creds
  const sectionRef = useRef<HTMLElement | null>(null)
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const lastFocusRef = useRef<HTMLElement | null>(null)
  const records = useMemo(
    () => mapCredentialsBlockToProofRecords(content, labels),
    [content, labels],
  )
  const [filter, setFilter] = useState<ProofFilter>('all')
  const [activeId, setActiveId] = useState<string | null>(records[0]?.id || null)

  const filteredRecords = useMemo(
    () => (filter === 'all' ? records : records.filter((record) => record.category === filter)),
    [filter, records],
  )
  const activeRecord = filteredRecords.find((record) => record.id === activeId) || filteredRecords[0]
  const activeIndex = activeRecord
    ? filteredRecords.findIndex((record) => record.id === activeRecord.id)
    : -1
  const proofType = activeRecord ? getProofTypeLabel(activeRecord.category, labels) : ''
  const ariaLabel = content?.ariaLabel || content?.title || labels.ariaLabel

  useEffect(() => {
    if (!filteredRecords.length) {
      setActiveId(null)
      return
    }
    if (!activeId || !filteredRecords.some((record) => record.id === activeId)) {
      setActiveId(filteredRecords[0]!.id)
    }
  }, [activeId, filteredRecords])

  const selectByOffset = useCallback(
    (offset: number) => {
      if (!filteredRecords.length || activeIndex < 0) return
      const nextIndex = (activeIndex + offset + filteredRecords.length) % filteredRecords.length
      setActiveId(filteredRecords[nextIndex]!.id)
    },
    [activeIndex, filteredRecords],
  )

  const setActiveFilter = (nextFilter: ProofFilter) => {
    setFilter(nextFilter)
    const nextRecords =
      nextFilter === 'all' ? records : records.filter((record) => record.category === nextFilter)
    if (!activeId || !nextRecords.some((record) => record.id === activeId)) {
      setActiveId(nextRecords[0]?.id || null)
    }
  }

  const openDialog = () => {
    if (!activeRecord) return
    lastFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    if (!dialog) return
    if (typeof dialog.showModal === 'function') {
      dialog.showModal()
    } else {
      dialog.setAttribute('open', '')
    }
  }

  const closeDialog = () => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close()
    } else {
      dialog.removeAttribute('open')
      lastFocusRef.current?.focus()
    }
  }

  const handleDialogClose = () => {
    lastFocusRef.current?.focus()
  }

  const handleDialogBackdrop = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) closeDialog()
  }

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Escape') closeDialog()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      isEditableTarget(event.target) ||
      dialogRef.current?.open
    ) {
      return
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      selectByOffset(-1)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      selectByOffset(1)
    }
  }

  if (!records.length || !activeRecord) return null

  return (
    <section
      aria-label={ariaLabel}
      className={`ws-hifi-creds${content?.fullBleed === false ? '' : ' ws-hifi-creds--full-bleed'}`}
      data-od-id="home-creds"
      data-testid="wingsside-hifi-creds"
      onKeyDown={handleKeyDown}
      ref={sectionRef}
    >
      <div className="ws-hifi-creds__inner">
        <header className="ws-hifi-creds__head">
          <div>
            <p className="ws-hifi-creds__kicker">{content?.eyebrow || labels.kicker}</p>
            <h2 className="ws-hifi-creds__title">{content?.title || labels.title}</h2>
            {content?.description || labels.lede ? (
              <p className="ws-hifi-creds__lede">{content?.description || labels.lede}</p>
            ) : null}
          </div>
          <SiteLink className="ws-hifi-creds__cta" href="/plan-your-trip">
            {labels.ctaPlanPrivateJourney}
          </SiteLink>
        </header>

        <div className="ws-hifi-creds__archive-bar">
          <div aria-label={labels.filterGroupLabel} className="ws-hifi-creds__filters" role="group">
            {filterOptions.map((option) => (
              <button
                aria-pressed={filter === option}
                className="ws-hifi-creds__filter"
                key={option}
                onClick={() => setActiveFilter(option)}
                type="button"
              >
                {option === 'all'
                  ? labels.filterAll
                  : option === 'appointment'
                    ? labels.filterAppointments
                    : labels.filterAwards}
              </button>
            ))}
          </div>
          <output aria-live="polite" className="ws-hifi-creds__count">
            {labels.verifiedArchiveLabel} · {filteredRecords.length} {labels.recordsLabel}
          </output>
        </div>

        <div
          className="ws-hifi-creds__proof-stage"
          data-od-id="credentials-proof-stage"
          data-testid="credentials-proof-stage"
        >
          <div className="ws-hifi-creds__document-pane">
            <button
              aria-label={labels.viewDocument}
              className="ws-hifi-creds__document-button"
              data-testid="credentials-document-button"
              onClick={openDialog}
              type="button"
            >
              <Media
                alt={activeRecord.imageAlt}
                className="ws-hifi-creds__document-media"
                fill
                imgClassName="ws-hifi-creds__document-image"
                priority
                resource={activeRecord.image}
                src={activeRecord.image as never}
                size="(max-width: 760px) 100vw, 53vw"
              />
            </button>
            <span aria-hidden="true" className="ws-hifi-creds__zoom-note">
              <SearchIcon aria-hidden="true" />
              {labels.inspectOriginal}
            </span>
          </div>

          <article
            aria-live="polite"
            className="ws-hifi-creds__copy-pane"
            data-od-id="credential-copy"
          >
            <p className="ws-hifi-creds__record-type">
              {activeRecord.issuer} · {proofType}
            </p>
            <h3>{activeRecord.title}</h3>
            <p className="ws-hifi-creds__summary">{activeRecord.summary}</p>
            <dl className="ws-hifi-creds__meta">
              <div>
                <dt>{labels.issuedBy}</dt>
                <dd>{activeRecord.issuer}</dd>
              </div>
              <div>
                <dt>{labels.proofType}</dt>
                <dd>{proofType}</dd>
              </div>
              <div>
                <dt>{labels.awardedEntity}</dt>
                <dd>{activeRecord.awardedEntity}</dd>
              </div>
              <div>
                <dt>{labels.year}</dt>
                <dd>{activeRecord.year || labels.missingField}</dd>
              </div>
            </dl>
            <div className="ws-hifi-creds__actions">
              <span className="ws-hifi-creds__counter">
                {pad(activeIndex + 1)} / {pad(filteredRecords.length)}
              </span>
              <div className="ws-hifi-creds__nav-pair">
                <button
                  aria-label={labels.prev}
                  className="ws-hifi-creds__nav"
                  onClick={() => selectByOffset(-1)}
                  type="button"
                >
                  <ChevronLeftIcon aria-hidden="true" />
                </button>
                <button
                  aria-label={labels.next}
                  className="ws-hifi-creds__nav"
                  onClick={() => selectByOffset(1)}
                  type="button"
                >
                  <ChevronRightIcon aria-hidden="true" />
                </button>
              </div>
            </div>
          </article>
        </div>

        <div aria-label={labels.thumbnailRailLabel} className="ws-hifi-creds__rail">
          {filteredRecords.map((record) => {
            const isActive = record.id === activeRecord.id
            return (
              <button
                aria-current={isActive ? 'true' : undefined}
                aria-label={`${labels.viewDocument}: ${record.title}`}
                className="ws-hifi-creds__thumb"
                key={record.id}
                onClick={() => setActiveId(record.id)}
                type="button"
              >
                <Media
                alt=""
                className="ws-hifi-creds__thumb-media"
                fill
                imgClassName="ws-hifi-creds__thumb-image"
                resource={record.image}
                src={record.image as never}
                size="64px"
              />
                <span className="ws-hifi-creds__thumb-copy">
                  <strong>{record.issuer}</strong>
                  <span>{getProofTypeLabel(record.category, labels)}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <dialog
        aria-label={labels.dialogLabel}
        className="ws-hifi-creds__dialog"
        data-testid="credentials-dialog"
        onClick={handleDialogBackdrop}
        onClose={handleDialogClose}
        onKeyDown={handleDialogKeyDown}
        ref={dialogRef}
      >
        <div className="ws-hifi-creds__dialog-inner">
          <Media
            alt={activeRecord.imageAlt}
            className="ws-hifi-creds__dialog-media"
            fill
            imgClassName="ws-hifi-creds__dialog-image"
            priority
            resource={activeRecord.image}
            src={activeRecord.image as never}
            size="100vw"
          />
          <button
            aria-label={labels.close}
            className="ws-hifi-creds__dialog-close"
            onClick={closeDialog}
            type="button"
          >
            <XIcon aria-hidden="true" />
          </button>
        </div>
      </dialog>
    </section>
  )
}
