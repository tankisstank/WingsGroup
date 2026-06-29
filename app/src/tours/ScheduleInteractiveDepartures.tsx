'use client'

import { useState } from 'react'

import { SiteLink } from '@/components/SiteLink'

import type { DepartureCardViewModel } from './types'
import {
  formatTourDate,
  formatTourPrice,
  getAvailabilityLabel,
  getTourInquiryPath,
  getTourPath,
  groupDeparturesByMonth,
} from './utils'

const asDoc = <T extends object>(value: T | number | string | null | undefined): T | null =>
  value && typeof value === 'object' ? value : null

export const ScheduleInteractiveDepartures = ({
  departures,
}: {
  departures: DepartureCardViewModel[]
}) => {
  const [market, setMarket] = useState('all')
  const [month, setMonth] = useState('all')
  const [airline, setAirline] = useState('all')
  const [status, setStatus] = useState('all')

  const monthGroups = groupDeparturesByMonth(departures)

  const filtered = departures.filter((departure) => {
    const product = asDoc<Record<string, any>>(departure.tourProduct)
    const marketMatch = market === 'all' || product?.market === market
    const departureMonthGroup = groupDeparturesByMonth([departure])[0]?.key || 'undated'
    const monthMatch = month === 'all' || departureMonthGroup === month
    const airlineMatch = airline === 'all' || departure.airline === airline
    const statusMatch = status === 'all' || departure.availabilityStatus === status

    return marketMatch && monthMatch && airlineMatch && statusMatch
  })

  const grouped = groupDeparturesByMonth(filtered)
  const airlines = Array.from(
    new Set(departures.map((departure) => departure.airline).filter((value): value is string => Boolean(value))),
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-[28px] border border-border/70 bg-card/95 p-5 xl:grid-cols-[1fr_220px_220px_220px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Lọc nhanh</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              ['all', 'Tất cả'],
              ['korea', 'Hàn Quốc'],
              ['japan', 'Nhật Bản'],
              ['china', 'Trung Quốc'],
            ].map(([value, label]) => (
              <button
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                  market === value
                    ? 'border-[var(--site-brand)] bg-[var(--site-brand)] text-white'
                    : 'border-border bg-background text-foreground'
                }`}
                key={value}
                onClick={() => setMarket(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          <span>Tháng khởi hành</span>
          <select
            className="h-11 rounded-2xl border border-border bg-background px-3"
            onChange={(event) => setMonth(event.target.value)}
            value={month}
          >
            <option value="all">Tất cả các tháng</option>
            {monthGroups.map((group) => (
              <option key={group.key} value={group.key}>
                {group.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          <span>Hãng bay</span>
          <select
            className="h-11 rounded-2xl border border-border bg-background px-3"
            onChange={(event) => setAirline(event.target.value)}
            value={airline}
          >
            <option value="all">Tất cả hãng bay</option>
            {airlines.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          <span>Tình trạng</span>
          <select
            className="h-11 rounded-2xl border border-border bg-background px-3"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="open">Mở bán</option>
            <option value="limited">Sắp hết chỗ</option>
            <option value="sold-out">Đã kín</option>
          </select>
        </label>
      </div>

      <div className="space-y-6">
        {grouped.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-border/70 bg-card/95 p-8 text-center">
            <p className="text-lg font-semibold text-foreground">Chưa có đợt phù hợp với bộ lọc hiện tại</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Thử đổi tháng, thị trường hoặc tình trạng chỗ để xem thêm lựa chọn đang mở bán.
            </p>
          </div>
        ) : null}
        {grouped.map((group) => (
          <section className="space-y-3" key={group.key}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-foreground">{group.label}</h3>
              <p className="text-sm text-muted-foreground">{group.items.length} đợt đang hiển thị</p>
            </div>
            <div className="space-y-3">
              {group.items.map((departure) => {
                const product = asDoc<Record<string, any>>(departure.tourProduct)
                const variant = asDoc<Record<string, any>>(departure.variantRef)

                return (
                  <div
                    className="grid gap-4 rounded-[28px] border border-border/70 bg-card/95 p-5 lg:grid-cols-[1.25fr_repeat(4,minmax(0,1fr))_180px]"
                    key={departure.id}
                  >
                    <div>
                      {product?.slug ? (
                        <SiteLink className="text-lg font-semibold no-underline" href={getTourPath(product.slug)}>
                          {product.title}
                        </SiteLink>
                      ) : (
                        <p className="text-lg font-semibold">{product?.title || 'Tour'}</p>
                      )}
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[variant?.label, departure.departureCity || null].filter(Boolean).join(' · ')}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                          {departure.availabilityBadge || getAvailabilityLabel(departure.availabilityStatus)}
                        </span>
                        {departure.urgencyLabel ? (
                          <span className="rounded-full border border-[var(--site-accent)]/40 bg-[var(--site-accent)]/10 px-3 py-1 text-xs font-semibold text-foreground">
                            {departure.urgencyLabel}
                          </span>
                        ) : null}
                        {departure.promoLabel ? (
                          <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground">
                            {departure.promoLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Khởi hành</p>
                      <p className="mt-2 text-base font-semibold">{formatTourDate(departure.departureDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Ngày về</p>
                      <p className="mt-2 text-base font-semibold">
                        {formatTourDate(departure.returnDate) || 'Theo lịch bay'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Hãng bay</p>
                      <p className="mt-2 text-base font-semibold">{departure.airline || 'Đang cập nhật'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Giá từ</p>
                      <p className="mt-2 text-xl font-semibold text-foreground">
                        {formatTourPrice(departure.priceFrom, departure.currency) || 'Liên hệ'}
                      </p>
                    </div>
                    <div className="flex flex-col justify-between gap-3">
                      <p className="text-sm text-muted-foreground">
                        {departure.holdNote || departure.depositNote || departure.note || 'Sales xác nhận lại trước khi giữ chỗ.'}
                      </p>
                      <div className="flex flex-col gap-2">
                        <SiteLink
                          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--site-brand)] px-4 text-sm font-semibold text-white no-underline"
                          href={getTourInquiryPath({
                            departureId: departure.id,
                            intent: 'hold-seat',
                            source: 'schedule',
                            tourId: product?.id,
                            tourSlug: product?.slug,
                          })}
                        >
                          {departure.ctaLabelOverride || 'Giữ chỗ'}
                        </SiteLink>
                        {product?.slug ? (
                          <SiteLink
                            className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-4 text-sm font-semibold no-underline"
                            href={getTourPath(product.slug)}
                          >
                            Xem tour
                          </SiteLink>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
