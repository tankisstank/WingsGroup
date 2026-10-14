'use client'

import React, { useState } from 'react'
import type { CuratedTourCardData, SimulatorViewportMode } from './types'

interface Props {
  tours: CuratedTourCardData[]
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
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  } catch {
    return dateStr
  }
}

export const LiveSimulatorPreview: React.FC<Props> = ({ tours }) => {
  const [mode, setMode] = useState<SimulatorViewportMode>('desktop')

  const heroTours = tours.slice(0, 3)
  const catalogTours = tours.slice(3, 6)

  return (
    <div className="curation-simulator-panel" data-testid="live-simulator-panel">
      {/* Top control bar */}
      <div className="simulator-topbar">
        <div className="simulator-badge">
          <span className="live-dot" aria-hidden="true" />
          <span>Mô phỏng WingsGo Live (1:1)</span>
        </div>
        <div className="device-switch-group" role="group" aria-label="Chế độ giả lập thiết bị">
          <button
            type="button"
            className={mode === 'desktop' ? 'active' : ''}
            onClick={() => setMode('desktop')}
            title="Xem giao diện Desktop màn hình rộng"
          >
            💻 Desktop
          </button>
          <button
            type="button"
            className={mode === 'tablet' ? 'active' : ''}
            onClick={() => setMode('tablet')}
            title="Xem giao diện Tablet (768px)"
          >
            📋 Tablet
          </button>
          <button
            type="button"
            className={mode === 'mobile' ? 'active' : ''}
            onClick={() => setMode('mobile')}
            title="Xem giao diện Mobile điện thoại (375px)"
          >
            📱 Mobile
          </button>
        </div>
      </div>

      {/* Viewport container */}
      <div className="simulator-viewport-container">
        <div className={`simulator-device-frame mode-${mode}`}>
          {/* Simulated Browser Bar */}
          <div className="sim-browser-bar">
            <div className="dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="url-input">
              🔒 https://wingsgo.vn/tour
            </div>
          </div>

          {/* Simulated Page Content */}
          <div className="sim-content-wrapper">
            {tours.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                Chưa có tour nổi bật nào được ghim.
                <br />
                Vui lòng chọn tour ở bảng bên trái để xem mô phỏng.
              </div>
            ) : (
              <>
                {/* 1. Hero Block (Slot #1 - #3) */}
                {heroTours.length > 0 && (
                  <div className="sim-hero-section">
                    <div className="sim-section-label">
                      🌟 Khối Ưu đãi Hero (Top {heroTours.length} Tour)
                    </div>
                    <div className="sim-hero-cards">
                      {heroTours.map((tour, idx) => (
                        <div key={tour.id} className="sim-hero-card" data-testid={`sim-hero-card-${tour.id}`}>
                          {tour.thumbnailUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={tour.thumbnailUrl} alt={tour.title} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', background: '#334155' }} />
                          )}
                          <div className="sim-card-overlay">
                            <span className="sim-badge">
                              {tour.promoLabel ? `🔥 ${tour.promoLabel}` : `Slot #${idx + 1}`}
                            </span>
                            <p className="sim-hero-title">{tour.title}</p>
                            <div className="sim-hero-price">
                              {formatPriceVND(tour.priceFrom, tour.currency || 'VND')}
                              {tour.nextDepartureDate ? ` • ✈️ ${formatDateVN(tour.nextDepartureDate)}` : ''}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Catalog Grid Block (Slot #4 - #6) */}
                {catalogTours.length > 0 && (
                  <div className="sim-catalog-section">
                    <div className="sim-section-label">
                      📋 Lưới Catalog tiếp nối (Slot #4 - #{3 + catalogTours.length})
                    </div>
                    <div className="sim-catalog-grid">
                      {catalogTours.map((tour) => (
                        <div key={tour.id} className="sim-mini-tour-card" data-testid={`sim-catalog-card-${tour.id}`}>
                          <div className="sim-mini-thumb">
                            {tour.thumbnailUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={tour.thumbnailUrl} alt={tour.title} />
                            ) : null}
                          </div>
                          <div className="sim-mini-body">
                            <p className="sim-mini-title">{tour.title}</p>
                            <div className="sim-mini-price">
                              {formatPriceVND(tour.priceFrom, tour.currency || 'VND')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
