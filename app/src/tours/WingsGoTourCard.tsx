/* eslint-disable @next/next/no-img-element */
import React from 'react'

import { SiteLink } from '@/components/SiteLink'

import type { WingsGoCatalogCard } from './wingsGoCatalog'

const marketLabels: Record<string, string> = {
  cambodia: 'Campuchia',
  china: 'Trung Quốc',
  indochina: 'Đông Dương',
  japan: 'Nhật Bản',
  korea: 'Hàn Quốc',
  laos: 'Lào',
  myanmar: 'Myanmar',
  other: 'Outbound',
  thailand: 'Thái Lan',
  vietnam: 'Việt Nam',
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))

const formatPrice = (value: number, currency: string) =>
  `${new Intl.NumberFormat('vi-VN').format(value)} ${currency}`

export const WingsGoTourCard = ({ card }: { card: WingsGoCatalogCard }) => (
  <article className="group overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-[var(--site-brand)]/35 hover:shadow-[0_18px_48px_color-mix(in_oklch,var(--site-brand)_14%,transparent)]">
    <SiteLink className="block no-underline" href={card.href}>
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {card.image ? (
          <img
            alt={card.image.alt}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            src={card.image.url}
          />
        ) : (
          <div
            aria-label={`Ảnh đang cập nhật cho ${card.title}`}
            className="flex h-full items-center justify-center bg-[linear-gradient(135deg,color-mix(in_oklch,var(--site-brand)_18%,transparent),color-mix(in_oklch,var(--site-accent)_16%,transparent))] px-6 text-center text-sm font-semibold text-foreground/70"
            role="img"
          >
            Ảnh tour đang cập nhật
          </div>
        )}
      </div>
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <span>{marketLabels[card.market] || card.market}</span>
          <span aria-hidden="true">•</span>
          <span>
            {card.duration.days} ngày {card.duration.nights} đêm
          </span>
        </div>
        <div>
          <h3 className="text-xl font-semibold leading-tight text-foreground transition-colors group-hover:text-[var(--site-brand)]">
            {card.title}
          </h3>
          {card.summary ? (
            <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted-foreground">
              {card.summary}
            </p>
          ) : null}
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Giá từ
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {card.price.kind === 'verified'
                ? formatPrice(card.price.value, card.price.currency)
                : card.price.label}
            </p>
          </div>
          <span className="text-sm font-semibold text-[var(--site-brand)]">Xem tour →</span>
        </div>
        <div className="rounded-[16px] border border-border/60 bg-muted/25 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Khởi hành gần nhất
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {formatDate(card.nextDeparture.date)}
            {card.nextDeparture.departureCity ? ` • ${card.nextDeparture.departureCity}` : ''}
            {card.nextDeparture.airline ? ` • ${card.nextDeparture.airline}` : ''}
          </p>
        </div>
      </div>
    </SiteLink>
  </article>
)
