'use client'

import React, { useEffect, useState } from 'react'
import type { TourPickerCandidate } from './types'

type RawPickerProduct = {
  id: number | string
  title?: string | null
  slug?: string | null
  market?: string | null
  durationDays?: number | null
  durationNights?: number | null
  _status?: string | null
  wrapperPage?: unknown
  heroMedia?: {
    url?: string | null
    thumbnailURL?: string | null
  } | null
}

type RawPickerDeparture = {
  id: number | string
  tourProduct?: number | string | { id?: number | string | null } | null
  departureDate?: string | null
  priceFrom?: number | null
  currency?: string | null
  promoLabel?: string | null
  _status?: string | null
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelectTour: (tour: TourPickerCandidate) => void
  selectedIds: Array<number | string>
  siteId?: number | string | null
}

const SOUTHEAST_ASIA_MARKETS = [
  'vietnam',
  'thailand',
  'cambodia',
  'laos',
  'myanmar',
  'indochina',
]

const KNOWN_MARKETS = ['korea', 'japan', 'china', ...SOUTHEAST_ASIA_MARKETS]

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
  siteId,
}) => {
  const [candidates, setCandidates] = useState<TourPickerCandidate[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedMarket, setSelectedMarket] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setPage(1)
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset page to 1 when changing market tab
  const handleMarketChange = (marketKey: string) => {
    setSelectedMarket(marketKey)
    setPage(1)
  }

  // Fetch tour candidates with server-side pagination, site filtering, and future departure verification
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setLoading(true)

    const fetchTours = async () => {
      try {
        const params = new URLSearchParams()
        params.set('limit', '20')
        params.set('page', String(page))
        params.set('depth', '1')
        params.set('sort', '-updatedAt')
        params.set('where[_status][equals]', 'published')

        // Constrain to current page's site if provided
        if (siteId !== undefined && siteId !== null && siteId !== '') {
          params.set('where[site][equals]', String(siteId))
        }

        // Server-side market filter
        if (selectedMarket === 'korea') {
          params.set('where[market][equals]', 'korea')
        } else if (selectedMarket === 'japan') {
          params.set('where[market][equals]', 'japan')
        } else if (selectedMarket === 'china') {
          params.set('where[market][equals]', 'china')
        } else if (selectedMarket === 'southeast-asia') {
          params.set('where[market][in]', SOUTHEAST_ASIA_MARKETS.join(','))
        } else if (selectedMarket === 'other') {
          params.set('where[market][in]', 'other')
        }

        // Server-side search filter
        const trimmedQuery = debouncedQuery.trim()
        if (trimmedQuery) {
          params.set('where[or][0][title][like]', trimmedQuery)
          params.set('where[or][1][slug][like]', trimmedQuery)
        }

        // 1. Fetch products
        const toursRes = await fetch(`/api/tour-products?${params.toString()}`, {
          credentials: 'include',
        })
        const toursData = toursRes.ok ? await toursRes.json() : { docs: [], totalPages: 1, totalDocs: 0 }

        if (cancelled) return

        setTotalPages(toursData.totalPages || 1)
        setTotalDocs(toursData.totalDocs || 0)

        const products = (toursData.docs || []) as RawPickerProduct[]
        const productIds = products.map((t) => t.id)

        // 2. Fetch only future published departures for the returned products
        const futureDeparturesByTour = new Map<string, RawPickerDeparture[]>()

        if (productIds.length > 0) {
          const nowIso = new Date().toISOString()
          const depParams = new URLSearchParams()
          depParams.set('where[tourProduct][in]', productIds.join(','))
          depParams.set('where[_status][equals]', 'published')
          depParams.set('where[departureDate][greater_than]', nowIso)
          depParams.set('sort', 'departureDate')
          depParams.set('limit', '100')

          if (siteId !== undefined && siteId !== null && siteId !== '') {
            depParams.set('where[site][equals]', String(siteId))
          }

          const departuresRes = await fetch(`/api/tour-departures?${depParams.toString()}`, {
            credentials: 'include',
          })
          const departuresData = departuresRes.ok ? await departuresRes.json() : { docs: [] }

          if (!cancelled) {
            for (const dep of departuresData.docs || []) {
              const prodId =
                typeof dep.tourProduct === 'object' && dep.tourProduct
                  ? dep.tourProduct.id
                  : dep.tourProduct
              if (!prodId) continue
              const list = futureDeparturesByTour.get(String(prodId)) || []
              list.push(dep)
              futureDeparturesByTour.set(String(prodId), list)
            }
          }
        }

        if (cancelled) return

        const mapped: TourPickerCandidate[] = products.map((t) => {
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

        // Filter fallback for 'other' tab in case market has unexpected custom value
        const finalCandidates =
          selectedMarket === 'other'
            ? mapped.filter((item) => item.market === 'other' || !KNOWN_MARKETS.includes(item.market || ''))
            : mapped

        setCandidates(finalCandidates)
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
  }, [debouncedQuery, isOpen, page, selectedMarket, siteId])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

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

        {/* Filters & Search */}
        <div className="dialog-filters">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Tìm theo tên tour hoặc slug (tìm kiếm tức thì)..."
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
                onClick={() => handleMarketChange(tab.key)}
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
          ) : candidates.length === 0 ? (
            <div className="empty-results">
              Không tìm thấy tour phù hợp với điều kiện tìm kiếm.
            </div>
          ) : (
            candidates.map((tour) => {
              const isAlreadySelected = selectedSet.has(String(tour.id))
              const isEligible = tour.hasWrapperPage && tour.hasFutureDeparture

              return (
                <div
                  key={tour.id}
                  className={`candidate-row ${isAlreadySelected ? 'selected' : ''} ${!isEligible ? 'ineligible' : ''}`}
                  onClick={() => {
                    if (!isAlreadySelected && isEligible) {
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
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          background: '#e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                        }}
                      >
                        Tour
                      </div>
                    )}
                  </div>
                  <div className="candidate-info">
                    <h5>{tour.title}</h5>
                    <p>
                      {tour.priceFrom ? (
                        <span style={{ color: '#059669', fontWeight: 600 }}>
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                            maximumFractionDigits: 0,
                          }).format(tour.priceFrom)}
                        </span>
                      ) : (
                        'Giá liên hệ'
                      )}
                      {' • '}
                      {tour.hasFutureDeparture ? (
                        <span>✈️ {new Date(tour.nextDepartureDate!).toLocaleDateString('vi-VN')}</span>
                      ) : (
                        <span style={{ color: '#b91c1c', fontWeight: 600 }}>
                          ⛔ Hết lịch bay tương lai
                        </span>
                      )}
                      {!tour.hasWrapperPage ? (
                        <span style={{ color: '#b91c1c', fontWeight: 600, marginLeft: 6 }}>
                          ⛔ Thiếu wrapper /tour/{tour.slug}
                        </span>
                      ) : null}
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
                    disabled={isAlreadySelected || !isEligible}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isAlreadySelected && isEligible) {
                        onSelectTour(tour)
                        onClose()
                      }
                    }}
                  >
                    {isAlreadySelected
                      ? '✓ Đã chọn'
                      : !isEligible
                      ? 'Chưa đủ điều kiện'
                      : '+ Chọn tour'}
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div
            className="dialog-pagination-footer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 1.25rem',
              borderTop: '1px solid var(--theme-elevation-150, #e2e8f0)',
              background: 'var(--theme-elevation-50, #f8fafc)',
              fontSize: '0.85rem',
            }}
          >
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 6,
                border: '1px solid var(--theme-elevation-250, #cbd5e1)',
                background: 'var(--theme-elevation-0, #fff)',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.5 : 1,
              }}
            >
              « Trang trước
            </button>
            <span style={{ color: 'var(--theme-elevation-700, #334155)', fontWeight: 500 }}>
              Trang {page} / {totalPages} ({totalDocs} tour)
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 6,
                border: '1px solid var(--theme-elevation-250, #cbd5e1)',
                background: 'var(--theme-elevation-0, #fff)',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages ? 0.5 : 1,
              }}
            >
              Trang sau »
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
