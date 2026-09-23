'use client'

import React, { useState } from 'react'

import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import { getAvailabilityLabel, getTourInquiryPath, formatTourDate, formatTourPrice } from './utils'
import type { DepartureCardViewModel } from './types'

type Props = {
  departures: DepartureCardViewModel[]
  locale: SupportedLocaleCode
  tour: { id?: number | string; slug?: null | string }
}

const monthKey = (date?: null | string) => (date ? String(date).slice(0, 7) : '')

export const TourDepartureMatrix = ({ departures, locale, tour }: Props) => {
  const [activeMonth, setActiveMonth] = useState('all')
  const months = Array.from(new Set(departures.map((departure) => monthKey(departure.departureDate))))
    .filter((value) => /^\d{4}-\d{2}$/.test(value))
    .sort()
  const visible =
    activeMonth === 'all'
      ? departures
      : departures.filter((departure) => monthKey(departure.departureDate) === activeMonth)
  const isEn = locale === 'en'

  return (
    <div className="space-y-4">
      <div
        aria-label={isEn ? 'Filter departures by month' : 'Lọc lịch khởi hành theo tháng'}
        className="flex gap-2 overflow-x-auto pb-1"
        role="tablist"
      >
        {['all', ...months].map((month) => {
          const label =
            month === 'all'
              ? isEn
                ? 'All'
                : 'Tất cả'
              : `${isEn ? 'Month' : 'Tháng'} ${Number(month.slice(5))} ${month.slice(0, 4)}`
          return (
            <button
              aria-selected={activeMonth === month}
              aria-controls="tour-departure-panel"
              className="min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)]"
              id={`departure-tab-${month}`}
              key={month}
              onClick={() => setActiveMonth(month)}
              role="tab"
              type="button"
            >
              {label}
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
          {isEn ? 'No departures are listed for this month.' : 'Tháng này chưa có lịch khởi hành.'}
        </p>
      ) : (
        <div
          aria-labelledby={`departure-tab-${activeMonth}`}
          className="overflow-x-auto rounded-2xl border border-border/70"
          id="tour-departure-panel"
          role="tabpanel"
          tabIndex={0}
        >
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{isEn ? 'Departure date' : 'Ngày khởi hành'}</th>
                <th className="px-4 py-3">{isEn ? 'Tour class / airline' : 'Hạng tour / hãng bay'}</th>
                <th className="px-4 py-3">{isEn ? 'Tour price' : 'Giá tour'}</th>
                <th className="px-4 py-3">{isEn ? 'Availability' : 'Tình trạng'}</th>
                <th className="px-4 py-3">{isEn ? 'Action' : 'Thao tác'}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((departure) => {
                const variant =
                  departure.variantRef && typeof departure.variantRef === 'object'
                    ? departure.variantRef
                    : null
                const isSoldOut = departure.availabilityStatus === 'sold-out'
                const commerceVerified = departure.commerceVerified ?? Boolean(departure.availabilityStatus)
                const currentPrice = formatTourPrice(departure.priceFrom, departure.currency)
                const originalPrice =
                  departure.originalPrice &&
                  departure.priceFrom &&
                  departure.originalPrice > departure.priceFrom
                    ? formatTourPrice(departure.originalPrice, departure.currency)
                    : null
                const href = getTourInquiryPath({
                  departureDate: departure.departureDate?.slice(0, 10),
                  departureId: departure.id,
                  intent: isSoldOut ? 'inquiry' : 'hold-seat',
                  source: 'tour-detail-departures',
                  tourId: tour.id,
                  tourSlug: tour.slug,
                })

                return (
                  <tr className="border-t border-border/70 align-top" key={departure.id}>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold">
                      {formatTourDate(departure.departureDate, locale) || '—'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold">
                        {[variant?.label, departure.airline].filter(Boolean).join(' / ') || '—'}
                      </div>
                      {departure.flightNumber ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {isEn ? 'Flight' : 'Chuyến bay'}: {departure.flightNumber}
                        </div>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {originalPrice ? (
                        <del className="block text-xs text-muted-foreground">{originalPrice}</del>
                      ) : null}
                      <span className="font-bold text-[var(--site-brand)]">
                        {currentPrice || (isEn ? 'Contact us' : 'Liên hệ')}
                      </span>
                      {departure.loyaltyPoints ? (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {isEn ? 'Earn' : 'Tích lũy'} {departure.loyaltyPoints.toLocaleString('vi-VN')}{' '}
                          {isEn ? 'points' : 'điểm'}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                        {commerceVerified
                          ? departure.availabilityBadge ||
                            getAvailabilityLabel(departure.availabilityStatus, locale)
                          : isEn
                            ? 'Confirm with us'
                            : 'Liên hệ xác nhận'}
                      </span>
                      {departure.urgencyLabel ? (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {departure.urgencyLabel}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <a
                        className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full bg-[var(--site-brand)] px-4 font-semibold text-white no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)]"
                        href={href}
                      >
                        {!commerceVerified || isSoldOut
                          ? isEn
                            ? 'Send request'
                            : 'Gửi yêu cầu'
                          : isEn
                            ? 'Hold a seat'
                            : 'Giữ chỗ ngay'}
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
