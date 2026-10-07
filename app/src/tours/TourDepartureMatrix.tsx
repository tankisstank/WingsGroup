'use client'

import React, { useState } from 'react'

import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import { getAvailabilityLabel, getTourInquiryPath, formatTourDate, formatTourPrice } from './utils'
import type { DepartureCardViewModel } from './types'
import { useTourDepartureSelection } from './TourDepartureSelectionContext'

type Props = {
  departures: DepartureCardViewModel[]
  locale: SupportedLocaleCode
  onSelectDeparture?: (departure: DepartureCardViewModel) => void
  selectedDepartureId?: null | number | string
  tour: { id?: number | string; slug?: null | string }
}

const monthKey = (date?: null | string) => (date ? String(date).slice(0, 7) : '')

export const TourDepartureMatrix = ({
  departures,
  locale,
  onSelectDeparture,
  selectedDepartureId,
  tour,
}: Props) => {
  const context = useTourDepartureSelection()
  const effectiveSelectedId =
    selectedDepartureId !== undefined && selectedDepartureId !== null
      ? selectedDepartureId
      : context?.selectedDeparture?.id

  const handleSelect = (departure: DepartureCardViewModel | null) => {
    if (departure) {
      onSelectDeparture?.(departure)
      context?.setSelectedDeparture?.(departure)
      context?.setIsPrivateTour?.(false)
      context?.setAnnounceMessage?.(
        locale === 'en'
          ? `Selected departure ${formatTourDate(departure.departureDate, locale)}`
          : `Đã chọn đợt khởi hành ngày ${formatTourDate(departure.departureDate, locale)}`,
      )
    } else {
      context?.setSelectedDeparture?.(null)
      context?.setAnnounceMessage?.(
        locale === 'en' ? 'No departure selected' : 'Chưa chọn đợt khởi hành',
      )
    }
  }

  const [activeMonth, setActiveMonth] = useState('all')

  // Derive unique cities
  const cities = Array.from(
    new Set(departures.map((d) => d.departureCity).filter(Boolean)),
  ) as string[]

  const activeCity = context?.selectedCity || 'all'

  // AND Filter: (Month === activeMonth) AND (City === activeCity)
  const visible = departures.filter((departure) => {
    const matchMonth =
      activeMonth === 'all' || monthKey(departure.departureDate) === activeMonth
    const matchCity =
      activeCity === 'all' || !activeCity || departure.departureCity === activeCity
    return matchMonth && matchCity
  })

  // Selection Policy:
  // When filters change or when returning from private tour:
  // Fallback to first sellable departure in visible; if none sellable, first departure; if visible empty, null.
  React.useEffect(() => {
    if (context?.isPrivateTour) return

    const currentSelected = context?.selectedDeparture
    const isStillVisible = currentSelected && visible.some((d) => String(d.id) === String(currentSelected.id))

    if (!isStillVisible) {
      if (visible.length === 0) {
        handleSelect(null)
      } else {
        const firstSellable = visible.find(
          (d) => d.commerceVerified && d.availabilityStatus !== 'sold-out' && Number(d.priceFrom) > 0,
        )
        handleSelect(firstSellable || visible[0])
      }
    }
  }, [activeMonth, activeCity, departures, context?.isPrivateTour])

  const months = Array.from(new Set(departures.map((departure) => monthKey(departure.departureDate))))
    .filter((value) => /^\d{4}-\d{2}$/.test(value))
    .sort()
  const allTabs = ['all', ...months]
  const isEn = locale === 'en'

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % allTabs.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + allTabs.length) % allTabs.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = allTabs.length - 1
    }

    if (nextIndex >= 0) {
      e.preventDefault()
      const nextMonth = allTabs[nextIndex]
      setActiveMonth(nextMonth)
      const nextBtn = document.getElementById(`departure-tab-${nextMonth}`)
      nextBtn?.focus()
    }
  }

  const handleClearFilters = () => {
    setActiveMonth('all')
    context?.setSelectedCity?.('all')
  }

  return (
    <div className="space-y-4" data-od-id="section-departures-inner">
      {/* City + Month Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
        {cities.length > 0 ? (
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="matrix-city-filter" className="font-semibold text-muted-foreground">
              {isEn ? 'Departure point:' : 'Nơi khởi hành:'}
            </label>
            <select
              id="matrix-city-filter"
              data-od-id="departureCity"
              className="rounded-lg border border-border/70 bg-background px-3 py-1.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={activeCity}
              onChange={(e) => context?.setSelectedCity?.(e.target.value)}
            >
              <option value="all">{isEn ? 'All departure points' : 'Tất cả nơi đi'}</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="text-xs text-muted-foreground" data-od-id="departureCount" role="status">
          {visible.length}{' '}
          {isEn
            ? visible.length === 1
              ? 'departure available'
              : 'departures available'
            : 'đợt khởi hành'}
        </div>
      </div>

      {/* Month Tablist */}
      <div
        aria-label={isEn ? 'Filter departures by month' : 'Lọc lịch khởi hành theo tháng'}
        className="flex gap-2 overflow-x-auto pb-1"
        role="tablist"
      >
        {allTabs.map((month, index) => {
          const label =
            month === 'all'
              ? isEn
                ? 'All'
                : 'Tất cả tháng'
              : `${isEn ? 'Month' : 'Tháng'} ${Number(month.slice(5))} ${month.slice(0, 4)}`
          return (
            <button
              aria-selected={activeMonth === month}
              aria-controls="tour-departure-panel"
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)] ${
                activeMonth === month
                  ? 'border-[var(--site-brand)] bg-[var(--site-brand)] text-white shadow-sm'
                  : 'border-border/70 bg-background text-foreground hover:bg-muted/40'
              }`}
              id={`departure-tab-${month}`}
              key={month}
              onClick={() => setActiveMonth(month)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              role="tab"
              tabIndex={activeMonth === month ? 0 : -1}
              type="button"
            >
              {label}
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <div
          aria-labelledby={`departure-tab-${activeMonth}`}
          className="rounded-2xl border border-border/70 bg-muted/20 p-6 text-center"
          data-od-id="departureEmpty"
          id="tour-departure-panel"
          role="tabpanel"
          tabIndex={0}
        >
          <h3 className="text-base font-bold text-foreground">
            {isEn ? 'No departures match your filter' : 'Chưa có lịch phù hợp'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEn
              ? 'No departures match the selected departure point and month.'
              : 'Không có đợt đi khớp nơi khởi hành và tháng đang chọn. Bạn có thể bỏ bộ lọc hoặc trao đổi về lịch mới.'}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              data-od-id="clearDepartureFilters"
              onClick={handleClearFilters}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-semibold hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isEn ? 'Clear filters' : 'Bỏ bộ lọc'}
            </button>
          </div>
        </div>
      ) : (
        <div
          aria-labelledby={`departure-tab-${activeMonth}`}
          className="relative"
          id="tour-departure-panel"
          role="tabpanel"
          tabIndex={0}
        >
          <div className="mb-1 text-xs text-muted-foreground lg:hidden">
            {isEn ? '← Swipe horizontally to see pricing and booking options →' : '← Vuốt sang ngang để xem giá và thao tác giữ chỗ →'}
          </div>
          {/* Desktop Table View (>= 680px) */}
          <div className="hidden sm:block overflow-x-auto rounded-2xl border border-border/70">
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
                  const commerceVerified = Boolean(departure.commerceVerified)
                  const isSellable = commerceVerified && !isSoldOut
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
                    intent: isSellable ? 'hold-seat' : 'inquiry',
                    source: 'tour-detail-departures',
                    tourId: tour.id,
                    tourSlug: tour.slug,
                  })

                const isSelected = effectiveSelectedId !== undefined && effectiveSelectedId !== null && String(effectiveSelectedId) === String(departure.id)

                return (
                  <tr
                    className={`border-t border-border/70 align-top transition-colors cursor-pointer hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      isSelected ? 'bg-primary/5 ring-1 ring-inset ring-primary/30' : ''
                    }`}
                    data-departure-id={departure.id}
                    data-od-id="tour-departure-row"
                    key={departure.id}
                    onClick={() => {
                      handleSelect(departure)
                    }}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        handleSelect(departure)
                      }
                    }}
                    role="row"
                    tabIndex={0}
                  >
                    <td className="whitespace-nowrap px-4 py-4 font-semibold" data-od-id="tour-departure-date">
                      {formatTourDate(departure.departureDate, locale) || '—'}
                    </td>
                    <td className="px-4 py-4" data-od-id="tour-departure-airline">
                      <div className="font-semibold">
                        {[variant?.label, departure.airline].filter(Boolean).join(' / ') || '—'}
                      </div>
                      {departure.flightNumber ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {isEn ? 'Flight' : 'Chuyến bay'}: {departure.flightNumber}
                        </div>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4" data-od-id="tour-departure-price">
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
                    <td className="px-4 py-4" data-od-id="tour-departure-status">
                      {(() => {
                        const label = commerceVerified
                          ? departure.availabilityBadge ||
                            getAvailabilityLabel(departure.availabilityStatus, locale)
                          : isEn
                            ? 'Confirm with us'
                            : 'Liên hệ xác nhận'
                        return label ? (
                          <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                            {label}
                          </span>
                        ) : null
                      })()}
                      {departure.urgencyLabel ? (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {departure.urgencyLabel}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-4" data-od-id="tour-departure-action">
                      <a
                        className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full bg-[var(--site-brand)] px-4 font-semibold text-white no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)]"
                        data-od-id="tour-departure-cta"
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

        {/* Mobile Cards View (< 680px) to prevent horizontal scrolling */}
        <div className="grid gap-3 sm:hidden" data-od-id="departureList">
          {visible.map((departure) => {
            const isSoldOut = departure.availabilityStatus === 'sold-out'
            const commerceVerified = Boolean(departure.commerceVerified)
            const isSellable = commerceVerified && !isSoldOut
            const currentPrice = formatTourPrice(departure.priceFrom, departure.currency)
            const isSelected = effectiveSelectedId !== undefined && effectiveSelectedId !== null && String(effectiveSelectedId) === String(departure.id)
            const dateStr = formatTourDate(departure.departureDate, locale) || '—'

            const statusLabel = commerceVerified
              ? departure.availabilityBadge || getAvailabilityLabel(departure.availabilityStatus, locale)
              : isEn ? 'Confirm with us' : 'Cần xác nhận lại giá'

            return (
              <article
                key={departure.id}
                data-od-id={`departure-${departure.id}`}
                className={`rounded-xl border p-4 transition-colors ${
                  isSelected
                    ? 'border-foreground bg-muted/40 ring-1 ring-foreground'
                    : 'border-border/70 bg-card hover:bg-muted/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-foreground" data-od-id={`title-${departure.id}`}>
                      {dateStr} {departure.departureCity ? `· ${departure.departureCity}` : ''}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {departure.airline || '—'} {departure.flightNumber ? `(${departure.flightNumber})` : ''}
                    </p>
                  </div>
                  <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
                    {statusLabel}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
                  <div>
                    <span className="text-xs text-muted-foreground">{isEn ? 'From' : 'Giá từ'}: </span>
                    <span className="font-mono text-base font-bold text-primary">
                      {currentPrice || (isEn ? 'Contact us' : 'Liên hệ')}
                    </span>
                  </div>
                  <button
                    type="button"
                    data-od-id={`select-${departure.id}`}
                    aria-pressed={isSelected}
                    onClick={() => handleSelect(departure)}
                    className={`inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      isSelected
                        ? 'bg-foreground text-background'
                        : 'border border-border bg-background text-foreground hover:bg-muted'
                    }`}
                  >
                    {isSelected
                      ? isEn ? 'Selected' : 'Đang chọn'
                      : isSellable
                        ? isEn ? 'Select this' : 'Chọn đợt này'
                        : isEn ? 'View status' : 'Xem tình trạng'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    )}
  </div>
)
}
