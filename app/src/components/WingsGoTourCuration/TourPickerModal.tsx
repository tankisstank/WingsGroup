'use client'

import React, { useEffect, useMemo, useState } from 'react'
import type { TourPickerCandidate } from './types'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelectTour: (tour: TourPickerCandidate) => void
  selectedIds: Array<number | string>
}

const MARKET_TABS = [
  { key: 'all', label: 'Tất cả thị trường' },
  { key: 'korea', label: 'Hàn Quốc' },
  { key: 'japan', label: 'Nhật Bản' },
  { key: 'china', label: 'Trung Quốc' },
  { key: 'southeast-asia', label: 'Đông Nam Á' },
  { key: 'other', label: 'Khác' },
]

export const TourPickerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectTour,
  selectedIds,
}) => {
  const [candidates, setCandidates] = useState<TourPickerCandidate[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMarket, setSelectedMarket] = useState('all')

  // Fetch tour candidates when modal opens
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setLoading(true)

    const fetchTours = async () => {
      try {
        // Fetch published tours
        const toursRes = await fetch(
          '/api/tour-products?limit=100&depth=1&sort=-updatedAt',
          { credentials: 'include' },
        )
        const toursData = toursRes.ok ? await toursRes.json() : { docs: [] }

        // Fetch published departures to match future dates
        const departuresRes = await fetch(
          '/api/tour-departures?limit=250&where[_status][equals]=published&sort=departureDate',
          { credentials: 'include' },
        )
        const departuresData = departuresRes.ok ? await departuresRes.json() : { docs: [] }

        if (cancelled) return

        const now = new Date()
        const futureDeparturesByTour = new Map<string, any[]>()

        for (const dep of departuresData.docs || []) {
          const prodId = typeof dep.tourProduct === 'object' && dep.tourProduct ? dep.tourProduct.id : dep.tourProduct
          if (!prodId) continue
          const depDate = dep.departureDate ? new Date(dep.departureDate) : null
          if (depDate && depDate >= now) {
            const list = futureDeparturesByTour.get(String(prodId)) || []
            list.push(dep)
            futureDeparturesByTour.set(String(prodId), list)
          }
        }

        const mapped: TourPickerCandidate[] = (toursData.docs || []).map((t: any) => {
          const futureDeps = futureDeparturesByTour.get(String(t.id)) || []
          const nextDep = futureDeps[0]
          
          let thumb: string | null = null
          if (t.heroMedia && typeof t.heroMedia === 'object') {
            thumb = t.heroMedia.thumbnailURL || t.heroMedia.url || null
          }

          return {
            id: t.id,
            title: t.title || `Tour #${t.id}`,
            slug: t.slug || '',
            market: t.market || null,
            durationDays: t.durationDays || null,
            durationNights: t.durationNights || null,
            thumbnailUrl: thumb,
            priceFrom: nextDep?.priceFrom ?? null,
            currency: nextDep?.currency || 'VND',
            nextDepartureDate: nextDep?.departureDate || null,
            promoLabel: nextDep?.promoLabel || null,
            isPublished: t._status === 'published',
            hasFutureDeparture: futureDeps.length > 0,
            hasWrapperPage: Boolean(t.wrapperPage),
          }
        })

        setCandidates(mapped)
      } catch (err) {
        console.error('Failed to load candidate tours:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchTours()
    return () => {
      cancelled = true
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const filteredCandidates = useMemo(() => {
    return candidates.filter((item) => {
      // Market filter
      if (selectedMarket !== 'all') {
        const m = (item.market || '').toLowerCase()
        if (selectedMarket === 'korea' && !m.includes('korea') && !m.includes('hàn')) return false
        if (selectedMarket === 'japan' && !m.includes('japan') && !m.includes('nhật')) return false
        if (selectedMarket === 'china' && !m.includes('china') && !m.includes('trung')) return false
        if (selectedMarket === 'southeast-asia' && !['thailand', 'singapore', 'malaysia', 'indochina', 'đông nam á'].some(k => m.includes(k))) return false
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTitle = item.title.toLowerCase().includes(q)
        const matchSlug = item.slug.toLowerCase().includes(q)
        if (!matchTitle && !matchSlug) return false
      }

      return true
    })
  }, [candidates, searchQuery, selectedMarket])

  if (!isOpen) return null

  const selectedSet = new Set(selectedIds.map(String))

  return (
    <div
      className="tour-picker-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="tour-picker-dialog">
        {/* Header */}
        <div className="dialog-header">
          <h3 id="modal-title">🌟 Chọn Tour đưa vào danh sách Nổi Bật</h3>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
          >
            ✕
          </button>
        </div>

        {/* Filters */}
        <div className="dialog-filters">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Tìm nhanh theo tên tour hoặc slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          <div className="market-pills" role="tablist" aria-label="Bộ lọc thị trường">
            {MARKET_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={selectedMarket === tab.key}
                className={selectedMarket === tab.key ? 'active' : ''}
                onClick={() => setSelectedMarket(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Candidates List */}
        <div className="dialog-candidates-list">
          {loading ? (
            <div className="empty-results">Đang nạp danh sách tour từ hệ thống…</div>
          ) : filteredCandidates.length === 0 ? (
            <div className="empty-results">
              Không tìm thấy tour phù hợp với từ khóa &quot;{searchQuery}&quot;.
            </div>
          ) : (
            filteredCandidates.map((tour) => {
              const isAlreadySelected = selectedSet.has(String(tour.id))

              return (
                <div
                  key={tour.id}
                  className={`candidate-row ${isAlreadySelected ? 'selected' : ''}`}
                  onClick={() => {
                    if (!isAlreadySelected) {
                      onSelectTour(tour)
                      onClose()
                    }
                  }}
                  data-testid={`candidate-row-${tour.id}`}
                >
                  <div className="candidate-thumb">
                    {tour.thumbnailUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={tour.thumbnailUrl} alt={tour.title} loading="lazy" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                        Tour
                      </div>
                    )}
                  </div>
                  <div className="candidate-info">
                    <h5>{tour.title}</h5>
                    <p>
                      {tour.priceFrom ? (
                        <span style={{ color: '#059669', fontWeight: 600 }}>
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(tour.priceFrom)}
                        </span>
                      ) : (
                        'Giá liên hệ'
                      )}
                      {' • '}
                      {tour.hasFutureDeparture ? (
                        <span>✈️ {new Date(tour.nextDepartureDate!).toLocaleDateString('vi-VN')}</span>
                      ) : (
                        <span style={{ color: '#b91c1c' }}>⛔ Chưa có lịch bay tương lai</span>
                      )}
                      {tour.promoLabel ? (
                        <span style={{ marginLeft: 6, color: '#ea580c', fontWeight: 700 }}>
                          🔥 {tour.promoLabel}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-select"
                    disabled={isAlreadySelected}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isAlreadySelected) {
                        onSelectTour(tour)
                        onClose()
                      }
                    }}
                  >
                    {isAlreadySelected ? '✓ Đã chọn' : '+ Chọn tour'}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
