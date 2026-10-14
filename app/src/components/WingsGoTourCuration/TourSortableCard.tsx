'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type { CuratedTourCardData } from './types'

interface Props {
  tour: CuratedTourCardData
  index: number
  onRemove: (id: number | string) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  canMoveUp: boolean
  canMoveDown: boolean
}

const formatPriceVND = (price?: number | null, currency = 'VND') => {
  if (price === undefined || price === null || isNaN(price)) return 'Liên hệ'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency || 'VND',
    maximumFractionDigits: 0,
  }).format(price)
}

const formatDateVN = (dateStr?: string | null) => {
  if (!dateStr) return 'Đang cập nhật'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export const TourSortableCard: React.FC<Props> = ({
  tour,
  index,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(tour.id) })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const slotNumber = index + 1
  const isHeroZone = slotNumber <= 3

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`tour-sortable-card ${isDragging ? 'is-dragging' : ''}`}
      data-slot={slotNumber}
      data-testid={`curation-card-${tour.id}`}
    >
      {/* 1. Drag handle */}
      <div
        className="card-drag-handle"
        {...attributes}
        {...listeners}
        title="Kéo thả để đổi thứ tự hiển thị"
        aria-label={`Kéo thả đổi vị trí tour ${tour.title}`}
      >
        <span aria-hidden="true">⠿</span>
      </div>

      {/* 2. Slot number badge */}
      <div
        className={`card-slot-badge ${isHeroZone ? 'hero-badge' : 'catalog-badge'}`}
        title={isHeroZone ? `Slot #${slotNumber}: Khối Ưu đãi Hero đầu trang` : `Slot #${slotNumber}: Khối Catalog tiếp nối`}
      >
        #{slotNumber}
      </div>

      {/* 3. Thumbnail */}
      <div className="card-thumb-wrapper">
        {tour.thumbnailUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={tour.thumbnailUrl} alt={tour.title} loading="lazy" />
        ) : (
          <div className="no-thumb" role="img" aria-label="Chưa có ảnh đại diện">
            📷 Ảnh tour
          </div>
        )}
      </div>

      {/* 4. Main information */}
      <div className="card-main-info">
        <h5 className="card-title-line" title={tour.title}>
          {tour.title}
        </h5>
        <div className="card-meta-line">
          <span className="meta-price">
            {formatPriceVND(tour.priceFrom, tour.currency || 'VND')}
          </span>
          <span>•</span>
          <span>✈️ {formatDateVN(tour.nextDepartureDate)}</span>
          {tour.durationDays ? (
            <>
              <span>•</span>
              <span>{tour.durationDays}N{tour.durationNights || tour.durationDays - 1}Đ</span>
            </>
          ) : null}

          {/* Promo label badge */}
          {tour.promoLabel ? (
            <span className="meta-promo-pill" title="Nhãn ưu đãi ghim trên thẻ">
              🔥 {tour.promoLabel}
            </span>
          ) : isHeroZone ? (
            <span
              className="warning-pill"
              title="Khối Hero nên có nhãn ưu đãi (ví dụ: Giảm 2Tr, Đang hot) để tối ưu CTR"
            >
              ⚠️ Chưa có nhãn ưu đãi
            </span>
          ) : null}

          {/* Validation departure warning */}
          {!tour.hasFutureDeparture ? (
            <span
              className="danger-pill"
              title="Tour này chưa có đợt khởi hành tương lai đã publish. Frontend sẽ tự động bỏ qua nếu không có lịch bay."
            >
              ⛔ Hết lịch bay tương lai
            </span>
          ) : null}
        </div>
      </div>

      {/* 5. Quick Actions */}
      <div className="card-action-tools">
        <button
          type="button"
          onClick={() => onMoveUp(index)}
          disabled={!canMoveUp}
          title="Di chuyển lên trên"
          aria-label={`Di chuyển tour ${tour.title} lên trên`}
        >
          ▲
        </button>
        <button
          type="button"
          onClick={() => onMoveDown(index)}
          disabled={!canMoveDown}
          title="Di chuyển xuống dưới"
          aria-label={`Di chuyển tour ${tour.title} xuống dưới`}
        >
          ▼
        </button>
        <button
          type="button"
          className="btn-remove"
          onClick={() => onRemove(tour.id)}
          title="Gỡ khỏi danh sách tour nổi bật"
          aria-label={`Gỡ tour ${tour.title}`}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
