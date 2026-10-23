'use client'

import React, { useEffect, useRef, useState } from 'react'

import { ProtectedEmailLink } from './ProtectedEmailLink'
import type { HotlineItem } from '@/utilities/siteHotlines'
import { formatHotlineDisplay, resolveSiteHotlines } from '@/utilities/siteHotlines'
import { getSharedZaloCTA } from '@/utilities/sharedConsultationChannels'

type Props = { locale?: string | null; siteCode?: string | null; hotlines?: HotlineItem[] }

export const SiteContactFab: React.FC<Props> = ({ locale, siteCode, hotlines }) => {
  const [open, setOpen] = useState(false)
  const [footerVisible, setFooterVisible] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const wasOpenRef = useRef(false)
  const isSupportedSite = siteCode === 'wings-go' || siteCode === 'wing-side'
  const isVi = locale === 'vi'
  const isWingsGo = siteCode === 'wings-go'
  const contactPath = siteCode === 'wing-side' ? '/contact-us' : '/lien-he'
  const sharedZalo = isWingsGo ? getSharedZaloCTA(siteCode, locale) : null
  const resolvedHotlines =
    hotlines !== undefined ? hotlines : resolveSiteHotlines(undefined, siteCode)

  useEffect(() => {
    if (!isWingsGo || typeof IntersectionObserver === 'undefined') return
    const footer = document.querySelector('footer.site-footer')
    if (!footer) return
    const observer = new IntersectionObserver(([entry]) => {
      setFooterVisible(entry.isIntersecting)
    })
    observer.observe(footer)
    return () => observer.disconnect()
  }, [isWingsGo])

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false
        const focusTarget = isWingsGo && footerVisible
          ? document.querySelector<HTMLAnchorElement>('footer .wingsgo-footer__phone')
          : triggerRef.current
        ;(focusTarget || triggerRef.current)?.focus()
      }
      return
    }
    wasOpenRef.current = true
    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        return
      }
      if (event.key !== 'Tab') return

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', handleDialogKeys)
    return () => document.removeEventListener('keydown', handleDialogKeys)
  }, [open, footerVisible, isWingsGo])

  if (!isSupportedSite) return null

  return (
    <>
      <button
        aria-expanded={open}
        aria-controls="site-contact-dialog"
        aria-haspopup="dialog"
        className="fixed bottom-20 right-4 sm:bottom-5 sm:right-5 z-[80] rounded-full bg-[var(--site-brand)] px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-xl transition hover:scale-[1.02]"
        hidden={isWingsGo && footerVisible && !open}
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        {isVi ? 'Liên hệ' : 'Contact us'}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-end bg-slate-950/35 p-3 sm:items-center sm:justify-center sm:p-5"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <section
            aria-labelledby="site-contact-title"
            aria-modal="true"
            className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 text-slate-950 shadow-2xl sm:max-h-[calc(100dvh-2.5rem)] sm:p-6"
            id="site-contact-dialog"
            ref={dialogRef}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {isVi ? 'Kết nối trực tiếp' : 'Direct contact'}
                </p>
                <h2 className="mt-2 text-2xl font-semibold" id="site-contact-title">
                  {isVi ? 'Bạn cần hỗ trợ?' : 'How can we help?'}
                </h2>
              </div>
              <button
                aria-label={isVi ? 'Đóng' : 'Close'}
                autoFocus
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)]"
                onClick={() => setOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {isVi
                ? isWingsGo
                  ? 'Đội ngũ WingsGo luôn sẵn sàng hỗ trợ bạn chọn tour và lịch khởi hành phù hợp.'
                  : 'Đội ngũ WingsSide sẽ tiếp nhận và phản hồi nhu cầu của bạn.'
                : isWingsGo
                  ? 'The WingsGo team is ready to help with tours and departure dates.'
                  : 'The WingsSide team will receive your request and follow up.'}
            </p>
            <div className="mt-5 grid gap-3">
              {isWingsGo ? (
                resolvedHotlines.map((item) => (
                  <a
                    key={item.normalized}
                    aria-label={
                      isVi
                        ? item.label
                          ? `Gọi ${item.label} ${formatHotlineDisplay(item.normalized)}`
                          : `Gọi hotline ${formatHotlineDisplay(item.normalized)}`
                        : item.label
                          ? `Call ${item.label} ${formatHotlineDisplay(item.normalized)}`
                          : `Call hotline ${formatHotlineDisplay(item.normalized)}`
                    }
                    className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 font-medium hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)]"
                    href={item.href}
                  >
                    <span aria-hidden="true">📞</span>
                    <span>
                      {item.label
                        ? `${item.label}: ${formatHotlineDisplay(item.normalized)}`
                        : formatHotlineDisplay(item.normalized)}
                    </span>
                  </a>
                ))
              ) : (
                <a
                  aria-label={isVi ? 'Gọi hotline 0912 910 101' : 'Call hotline 0912 910 101'}
                  className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 font-medium hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)]"
                  href="tel:0912910101"
                >
                  <span aria-hidden="true">📞</span>
                  <span>0912 910 101</span>
                </a>
              )}
              {sharedZalo ? (
                <a
                  aria-label={sharedZalo.ariaLabel}
                  className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 font-medium hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)]"
                  href={sharedZalo.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <span aria-hidden="true">💬</span>
                  <span>{sharedZalo.label}</span>
                </a>
              ) : null}
              <div className="flex min-h-12 min-w-0 items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 font-medium hover:border-slate-400">
                <span aria-hidden="true">✉️</span>
                <ProtectedEmailLink
                  className="min-w-0 break-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)]"
                  email="info@wingsgroup.vn"
                />
              </div>
              <div className="flex min-h-12 min-w-0 items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 font-medium hover:border-slate-400">
                <span aria-hidden="true">💼</span>
                <ProtectedEmailLink
                  className="min-w-0 break-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)]"
                  email="sales@wingsgroup.vn"
                />
              </div>
              <a
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-center font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)]"
                href={contactPath}
              >
                {isVi ? 'Mở trang liên hệ' : 'Open contact page'}
              </a>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
