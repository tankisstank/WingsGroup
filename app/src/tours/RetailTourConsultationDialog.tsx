'use client'

import React, { useEffect, useRef, useState } from 'react'

import { SiteLink } from '@/components/SiteLink'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import type { TourEnquiryIntent } from './enquiryContext'
import { useTourDepartureSelection } from './TourDepartureSelectionContext'
import { formatTourDate, formatTourPrice, getTourInquiryPath } from './utils'
import type { HotlineItem } from '@/utilities/siteHotlines'
import { formatHotlineDisplay, resolveSiteHotlines } from '@/utilities/siteHotlines'
import { getSharedZaloCTA } from '@/utilities/sharedConsultationChannels'

export type RetailTourConsultationDialogProps = {
  hotlines?: HotlineItem[]
  isOpen: boolean
  locale?: SupportedLocaleCode
  nextDeparture?: Record<string, any> | null
  onClose: () => void
  siteCode?: null | string
  tour: Record<string, any>
}

export const RetailTourConsultationDialog: React.FC<RetailTourConsultationDialogProps> = ({
  hotlines,
  isOpen,
  locale = 'vi',
  nextDeparture: nextDepartureProp,
  onClose,
  siteCode,
  tour,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerElementRef = useRef<Element | null>(null)
  const [copied, setCopied] = useState(false)
  const resolvedHotlines =
    hotlines !== undefined ? hotlines : resolveSiteHotlines(undefined, siteCode || 'wings-go')
  const sharedZalo = getSharedZaloCTA(siteCode || 'wings-go', locale)

  const context = useTourDepartureSelection()
  const isPrivateTour = Boolean(context?.isPrivateTour)
  const selectedDeparture = isPrivateTour
    ? null
    : context
      ? context.selectedDeparture
      : nextDepartureProp

  const guestCount = context?.guestCount ?? 2
  const activeCity = context?.selectedCity || 'all'

  // Derive sellable status for Honest Commerce price display
  const nextDepDate = selectedDeparture?.departureDate ? new Date(selectedDeparture.departureDate) : null
  const now = new Date()
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const hasFutureDeparture = Boolean(
    !isPrivateTour &&
      selectedDeparture &&
      nextDepDate &&
      !Number.isNaN(nextDepDate.getTime()) &&
      new Date(Date.UTC(nextDepDate.getUTCFullYear(), nextDepDate.getUTCMonth(), nextDepDate.getUTCDate())).getTime() >= todayUtc.getTime(),
  )
  const isSoldOut = selectedDeparture?.availabilityStatus === 'sold-out'
  const commerceVerified = Boolean(selectedDeparture?.commerceVerified)
  const isSellable = !isPrivateTour && hasFutureDeparture && !isSoldOut && commerceVerified

  // Dialog open/close lifecycle and focus management
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      triggerElementRef.current = document.activeElement
      if (!dialog.open) {
        dialog.showModal()
      }
    } else {
      if (dialog.open) {
        dialog.close()
      }
      if (triggerElementRef.current instanceof HTMLElement) {
        triggerElementRef.current.focus()
      }
    }
  }, [isOpen])

  // Reset copied status when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCopied(false)
    }
  }, [isOpen])

  // Derive snapshot strings
  const departureCity = isPrivateTour
    ? 'Linh hoạt theo yêu cầu'
    : selectedDeparture?.departureCity || (activeCity !== 'all' ? activeCity : 'Linh hoạt')

  const departureDateText = isPrivateTour
    ? 'Tour riêng thiết kế theo lịch hẹn'
    : selectedDeparture?.departureDate
      ? formatTourDate(selectedDeparture.departureDate, locale) || selectedDeparture.departureDate
      : 'Chưa chọn ngày cụ thể'

  const tourTypeText = isPrivateTour ? 'Tour riêng thiết kế' : 'Tour ghép đoàn'

  const priceText = isSellable
    ? `${formatTourPrice(selectedDeparture?.priceFrom, selectedDeparture?.currency)} / khách`
    : 'Liên hệ tư vấn'

  // Clipboard text
  const clipboardSummary = [
    `[YÊU CẦU TƯ VẤN TOUR WINGSGO]`,
    `• Tour: ${tour.title || 'Tour du lịch'}`,
    `• Nơi khởi hành: ${departureCity}`,
    `• Ngày đi: ${departureDateText}`,
    `• Số lượng khách: ${guestCount} khách`,
    `• Hình thức: ${tourTypeText}`,
    `• Đơn giá niêm yết tham khảo: ${priceText}`,
  ].join('\n')

  const handleCopy = async () => {
    let succeeded = false
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(clipboardSummary)
        succeeded = true
      }
    } catch {
      // Clipboard API might reject in environments without focus/permission; fallback below
    }

    if (!succeeded && typeof document !== 'undefined') {
      let textarea: HTMLTextAreaElement | null = null
      try {
        textarea = document.createElement('textarea')
        textarea.value = clipboardSummary
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        textarea.setAttribute('aria-hidden', 'true')
        const container = dialogRef.current || document.body
        container.appendChild(textarea)
        textarea.focus()
        textarea.select()
        succeeded = document.execCommand('copy')
      } catch {
        succeeded = false
      } finally {
        if (textarea && textarea.parentNode) {
          textarea.parentNode.removeChild(textarea)
        }
      }
    }

    if (succeeded) {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  // Preserve configured commerce intent instead of unconditionally upgrading to hold-seat
  const configuredIntent: TourEnquiryIntent =
    (tour?.bcfg?.ctaStyle as TourEnquiryIntent) || 'hold-seat'
  const effectiveIntent: TourEnquiryIntent = isPrivateTour
    ? 'request-quote'
    : isSellable
      ? configuredIntent
      : 'inquiry'

  // Canonical form URL
  const canonicalInquiryHref = getTourInquiryPath({
    departureDate: !isPrivateTour && selectedDeparture?.departureDate ? selectedDeparture.departureDate : undefined,
    departureId: !isPrivateTour && selectedDeparture?.id ? selectedDeparture.id : undefined,
    discoveryContext: tour.discoveryContext,
    guests: guestCount,
    intent: effectiveIntent,
    siteCode,
    source: 'retail-modal',
    tourId: tour.id,
    tourSlug: tour.slug,
    tourTitle: tour.title,
  })

  return (
    <dialog
      aria-labelledby="consultation-dialog-title"
      aria-modal="true"
      className="backdrop:bg-black/60 backdrop:backdrop-blur-sm fixed inset-0 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-[24px] border border-border/80 bg-card p-6 text-foreground shadow-2xl focus:outline-none"
      data-od-id="tour-consultation-dialog"
      onClick={(e) => {
        const dialog = dialogRef.current
        if (dialog && e.target === dialog) {
          const rect = dialog.getBoundingClientRect()
          const isInDialog = (
            rect.top <= e.clientY &&
            e.clientY <= rect.top + rect.height &&
            rect.left <= e.clientX &&
            e.clientX <= rect.left + rect.width
          )
          if (!isInDialog) {
            onClose()
          }
        }
      }}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      ref={dialogRef}
    >
      {isOpen ? (
        <>
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border/60 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--site-brand)]">
            Tư vấn trực tiếp
          </p>
          <h2 className="mt-1 text-lg font-bold text-foreground sm:text-xl" id="consultation-dialog-title">
            Yêu cầu tư vấn nhanh
          </h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Xem lại thông tin tour đã chọn và chọn phương thức kết nối thuận tiện nhất.
          </p>
        </div>
        <button
          aria-label="Đóng hộp thoại tư vấn"
          className="ml-3 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)]"
          data-od-id="consultation-close-btn"
          onClick={onClose}
          type="button"
        >
          ✕
        </button>
      </div>

      {/* Snapshot Card */}
      <div
        className="mt-4 rounded-[20px] border border-border/70 bg-muted/20 p-4 space-y-2.5 text-xs sm:text-sm"
        data-od-id="consultation-snapshot"
      >
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground shrink-0">Tour:</span>
          <span className="font-semibold text-right text-foreground line-clamp-2">
            {tour.title}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground shrink-0">Nơi khởi hành:</span>
          <span className="font-medium text-foreground">{departureCity}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground shrink-0">Ngày đi:</span>
          <span className="font-medium text-foreground">{departureDateText}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground shrink-0">Số lượng khách:</span>
          <span className="font-medium text-foreground">{guestCount} khách</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground shrink-0">Hình thức:</span>
          <span className="font-medium text-foreground">{tourTypeText}</span>
        </div>
        <div className="flex justify-between gap-3 border-t border-border/60 pt-2">
          <span className="text-muted-foreground shrink-0">Đơn giá niêm yết:</span>
          <span className="font-bold text-[var(--site-brand)]">{priceText}</span>
        </div>
      </div>

      {/* Copy Action */}
      <div className="mt-4 space-y-2">
        <button
          className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--site-brand)] bg-[var(--site-brand)]/10 px-4 text-sm font-semibold text-[var(--site-brand)] transition hover:bg-[var(--site-brand)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)]"
          data-od-id="consultation-copy-btn"
          onClick={handleCopy}
          type="button"
        >
          {copied ? (
            <>
              <span aria-hidden="true">✓</span>
              <span>Đã sao chép yêu cầu tour!</span>
            </>
          ) : (
            <>
              <span aria-hidden="true">📋</span>
              <span>Sao chép thông tin nhu cầu</span>
            </>
          )}
        </button>

        {copied ? (
          <p
            className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-center text-xs font-medium text-emerald-600 dark:text-emerald-400"
            data-od-id="consultation-copy-success"
          >
            Đã sao chép thông tin vào bộ nhớ tạm. Bạn có thể dán vào Zalo hoặc Fanpage!
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground text-center">
            Sao chép để gửi nhanh qua Zalo / Hotline. Thao tác này không thay thế xác nhận giữ chỗ.
          </p>
        )}
      </div>

      {/* Contact Channels */}
      <div className="mt-4 border-t border-border/60 pt-4" data-od-id="consultation-channels">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2.5">
          Kênh liên hệ trực tiếp
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {resolvedHotlines.map((item, idx) => (
            <a
              key={item.normalized}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground no-underline transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)] sm:text-sm"
              {...(idx === 0 ? { 'data-od-id': 'consultation-hotline-btn' } : {})}
              href={item.href}
            >
              <span aria-hidden="true">📞</span>
              <span>
                {item.label
                  ? `${item.label}: ${formatHotlineDisplay(item.normalized)}`
                  : formatHotlineDisplay(item.normalized)}
              </span>
            </a>
          ))}
          <a
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground no-underline transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)] sm:text-sm"
            data-od-id="consultation-zalo-btn"
            href={sharedZalo?.href || 'https://zalo.me/4142059657526524531'}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span aria-hidden="true">💬</span>
            <span>{sharedZalo?.label || 'Zalo OA'}</span>
          </a>
        </div>
      </div>

      {/* Canonical Form CTA */}
      <div className="mt-4 border-t border-border/60 pt-4">
        <SiteLink
          className="flex w-full min-h-12 items-center justify-center rounded-xl bg-[var(--site-brand)] px-5 text-sm font-bold text-white no-underline shadow-sm transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)]"
          data-od-id="consultation-form-cta"
          href={canonicalInquiryHref}
        >
          Tiếp tục gửi qua Form tư vấn trực tuyến →
        </SiteLink>
      </div>
        </>
      ) : null}
    </dialog>
  )
}
