'use client'

import React, { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSitePublicLocale } from '@/providers/SitePath'
import { useSitePath } from '@/utilities/useSitePath'

import styles from './WingsGroupV3.module.css'

export const WingsGroupConsultationDialog = () => {
  const router = useRouter()
  const locale = useSitePublicLocale()
  const toSitePath = useSitePath()
  const isEnglish = locale === 'en'
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
        ),
      )

    const openDialog = (event?: Event) => {
      event?.preventDefault()
      lastFocusedRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      if (!dialog.open) dialog.showModal()
      requestAnimationFrame(() => closeRef.current?.focus())
    }

    const closeDialog = () => {
      if (dialog.open) dialog.close()
      requestAnimationFrame(() => lastFocusedRef.current?.focus())
    }

    const onTrigger = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (!target.closest('[data-wingsgroup-consultation-trigger]')) return
      openDialog(event)
    }

    const onOpenEvent = (event: Event) => openDialog(event)
    const onCancel = (event: Event) => {
      event.preventDefault()
      closeDialog()
    }
    const onClose = () => requestAnimationFrame(() => lastFocusedRef.current?.focus())
    const onDialogClick = (event: MouseEvent) => {
      if (event.target === dialog) closeDialog()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeDialog()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    const onContactForm = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const button = target.closest<HTMLButtonElement>('[data-consult-form]')
      if (!button) return
      closeDialog()
      router.push(toSitePath('/lien-he#contact-form'))
      window.setTimeout(() => {
        document
          .querySelector<HTMLInputElement>(
            '[data-od-id="contact-intake"] input:not([aria-hidden="true"])',
          )
          ?.focus()
      }, 80)
    }

    document.addEventListener('click', onTrigger)
    document.addEventListener('click', onContactForm)
    window.addEventListener('wingsgroup-consultation-open', onOpenEvent)
    dialog.addEventListener('cancel', onCancel)
    dialog.addEventListener('close', onClose)
    dialog.addEventListener('click', onDialogClick)
    dialog.addEventListener('keydown', onKeyDown)

    let observer: IntersectionObserver | undefined
    const hero = document.querySelector('[data-od-id="hero"]')
    const fab = document.querySelector<HTMLElement>('[data-od-id="consultation-fab"]')
    if (hero && fab && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        ([entry]) => {
          fab.dataset.visible = entry?.isIntersecting ? 'false' : 'true'
        },
        { threshold: 0.05 },
      )
      observer.observe(hero)
    }

    return () => {
      document.removeEventListener('click', onTrigger)
      document.removeEventListener('click', onContactForm)
      window.removeEventListener('wingsgroup-consultation-open', onOpenEvent)
      dialog.removeEventListener('cancel', onCancel)
      dialog.removeEventListener('close', onClose)
      dialog.removeEventListener('click', onDialogClick)
      dialog.removeEventListener('keydown', onKeyDown)
      observer?.disconnect()
    }
  }, [router, toSitePath])

  return (
    <>
      <button
        aria-haspopup="dialog"
        className={styles.consultationFab}
        data-od-id="consultation-fab"
        data-visible="false"
        data-wingsgroup-consultation-trigger="true"
        type="button"
      >
        <span aria-hidden="true">↗</span>
        {isEnglish ? 'Speak with a specialist' : 'Trao đổi với chuyên viên'}
      </button>
      <dialog
        aria-labelledby="consultation-title"
        className={styles.consultationDialog}
        data-od-id="consultation-dialog"
        ref={dialogRef}
      >
        <div className={styles.consultationDialogInner}>
          <div className={styles.consultationDialogTop}>
            <div>
              <p className={styles.eyebrow}>
                {isEnglish ? 'Journey consultation' : 'Tư vấn hành trình'}
              </p>
              <h2 id="consultation-title">
                {isEnglish ? 'Speak with a specialist.' : 'Trao đổi với chuyên viên.'}
              </h2>
            </div>
            <button
              aria-label={isEnglish ? 'Close channel chooser' : 'Đóng bảng chọn kênh'}
              className={styles.consultationClose}
              onClick={() => dialogRef.current?.close()}
              ref={closeRef}
              type="button"
            >
              ×
            </button>
          </div>
          <p>
            {isEnglish
              ? 'Share what you need. The WingsGroup team will listen carefully and clarify your plans before the journey begins.'
              : 'Để lại nhu cầu. Đội ngũ WingsGroup sẽ trực tiếp tiếp nhận và làm rõ nhu cầu trước hành trình.'}
          </p>
          <button className={styles.channelChoice} data-consult-form="true" type="button">
            <span className={styles.channelMark} aria-hidden="true">
              ↗
            </span>
            <span>
              <b>{isEnglish ? 'Share your plans' : 'Để lại nhu cầu'}</b>
              <small>
                {isEnglish
                  ? 'Our specialists will guide the next step.'
                  : 'Chuyên viên sẽ đồng hành cùng bạn.'}
              </small>
            </span>
            <span className={styles.channelArrow} aria-hidden="true">
              ↗
            </span>
          </button>
        </div>
      </dialog>
    </>
  )
}
