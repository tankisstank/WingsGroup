'use client'

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { FieldError, FieldLabel, useField } from '@payloadcms/ui'

import { TourSortableCard } from './TourSortableCard'
import { TourPickerModal } from './TourPickerModal'
import { LiveSimulatorPreview } from './LiveSimulatorPreview'
import type { CuratedTourCardData, TourPickerCandidate } from './types'
import './index.scss'

type RelationshipItem = number | string | { id?: number | string | null }

interface Props {
  field?: {
    label?: string
    required?: boolean
    admin?: {
      description?: string
    }
  }
  path: string
  readOnly?: boolean
}

const extractIDs = (val: unknown): Array<number | string> => {
  if (!Array.isArray(val)) return []
  return val
    .map((item: RelationshipItem) => {
      if (typeof item === 'number' || typeof item === 'string') return item
      if (item && typeof item === 'object' && 'id' in item && item.id != null) return item.id
      return null
    })
    .filter((id): id is number | string => id !== null && id !== undefined)
}

export const FeaturedToursCurationField: React.FC<Props> = ({
  field,
  path = 'wingsGoTourCatalog.featuredTours',
  readOnly = false,
}) => {
  const dndContextId = useId()
  const { errorMessage, setValue, showError, value } = useField<RelationshipItem[]>({ path })
  const selectedIDs = useMemo(() => extractIDs(value), [value])

  const [toursData, setToursData] = useState<CuratedTourCardData[]>([])
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Configure DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Hydrate tour details from Payload REST API
  useEffect(() => {
    let cancelled = false
    if (selectedIDs.length === 0) {
      setToursData([])
      return
    }

    setLoading(true)
    const idsQuery = selectedIDs.join(',')

    const loadTourDetails = async () => {
      try {
        const [toursRes, depsRes] = await Promise.all([
          fetch(`/api/tour-products?where[id][in]=${idsQuery}&depth=1&limit=20`, {
            credentials: 'include',
          }),
          fetch(
            `/api/tour-departures?where[tourProduct][in]=${idsQuery}&where[_status][equals]=published&sort=departureDate&limit=100`,
            { credentials: 'include' },
          ),
        ])

        const toursJson = toursRes.ok ? await toursRes.json() : { docs: [] }
        const depsJson = depsRes.ok ? await depsRes.json() : { docs: [] }

        if (cancelled) return

        const now = new Date()
        const futureDepsByTour = new Map<string, any[]>()

        for (const dep of depsJson.docs || []) {
          const prodId =
            typeof dep.tourProduct === 'object' && dep.tourProduct
              ? dep.tourProduct.id
              : dep.tourProduct
          if (!prodId) continue
          const depDate = dep.departureDate ? new Date(dep.departureDate) : null
          if (depDate && depDate >= now) {
            const list = futureDepsByTour.get(String(prodId)) || []
            list.push(dep)
            futureDepsByTour.set(String(prodId), list)
          }
        }

        const toursMap = new Map<string, Record<string, any>>(
          (toursJson.docs || []).map((t: any) => [String(t.id), t]),
        )

        // Keep the exact order of selectedIDs
        const hydrated: CuratedTourCardData[] = selectedIDs.map((id, index) => {
          const tourDoc = toursMap.get(String(id))
          const futureDeps = futureDepsByTour.get(String(id)) || []
          const nextDep = futureDeps[0]

          let thumbUrl: string | null = null
          if (tourDoc?.heroMedia && typeof tourDoc.heroMedia === 'object') {
            thumbUrl = tourDoc.heroMedia.thumbnailURL || tourDoc.heroMedia.url || null
          }

          return {
            id,
            slotNumber: index + 1,
            title: tourDoc?.title || `Tour #${id}`,
            slug: tourDoc?.slug || '',
            market: tourDoc?.market || null,
            durationDays: tourDoc?.durationDays || null,
            durationNights: tourDoc?.durationNights || null,
            thumbnailUrl: thumbUrl,
            priceFrom: nextDep?.priceFrom ?? null,
            currency: nextDep?.currency || 'VND',
            nextDepartureDate: nextDep?.departureDate || null,
            departureCity: nextDep?.departureCity || null,
            airline: nextDep?.airline || null,
            promoLabel: nextDep?.promoLabel || null,
            isPublished: tourDoc?._status === 'published',
            hasFutureDeparture: futureDeps.length > 0,
            hasWrapperPage: Boolean(tourDoc?.wrapperPage),
            wrapperPagePathname: tourDoc?.wrapperPage?.pathname || null,
          }
        })

        setToursData(hydrated)
      } catch (err) {
        console.error('Failed to hydrate curated tours:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadTourDetails()
    return () => {
      cancelled = true
    }
  }, [selectedIDs])

  // Update value in Payload form
  const commitNewOrder = useCallback(
    (newOrderTours: CuratedTourCardData[]) => {
      setToursData(
        newOrderTours.map((t, idx) => ({
          ...t,
          slotNumber: idx + 1,
        })),
      )
      setValue(newOrderTours.map((t) => t.id))
    },
    [setValue],
  )

  // Drag End handler
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = toursData.findIndex((t) => String(t.id) === String(active.id))
      const newIndex = toursData.findIndex((t) => String(t.id) === String(over.id))

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(toursData, oldIndex, newIndex)
        commitNewOrder(reordered)
      }
    },
    [commitNewOrder, toursData],
  )

  // Quick Action: Move Up
  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return
      const reordered = arrayMove(toursData, index, index - 1)
      commitNewOrder(reordered)
    },
    [commitNewOrder, toursData],
  )

  // Quick Action: Move Down
  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= toursData.length - 1) return
      const reordered = arrayMove(toursData, index, index + 1)
      commitNewOrder(reordered)
    },
    [commitNewOrder, toursData],
  )

  // Quick Action: Remove
  const handleRemove = useCallback(
    (id: number | string) => {
      const remaining = toursData.filter((t) => String(t.id) !== String(id))
      commitNewOrder(remaining)
    },
    [commitNewOrder, toursData],
  )

  // Add Tour from Picker Modal
  const handleSelectTour = useCallback(
    (tour: TourPickerCandidate) => {
      if (toursData.length >= 6) return
      const newTourCard: CuratedTourCardData = {
        id: tour.id,
        slotNumber: toursData.length + 1,
        title: tour.title,
        slug: tour.slug,
        market: tour.market,
        durationDays: tour.durationDays,
        durationNights: tour.durationNights,
        thumbnailUrl: tour.thumbnailUrl,
        priceFrom: tour.priceFrom,
        currency: tour.currency,
        nextDepartureDate: tour.nextDepartureDate,
        promoLabel: tour.promoLabel,
        isPublished: tour.isPublished,
        hasFutureDeparture: tour.hasFutureDeparture,
        hasWrapperPage: tour.hasWrapperPage,
      }
      commitNewOrder([...toursData, newTourCard])
    },
    [commitNewOrder, toursData],
  )

  // Pre-validation computation
  const validationReport = useMemo(() => {
    const missingDepartures = toursData
      .filter((t) => !t.hasFutureDeparture)
      .map((t) => t.id)
    const missingPromoInHero = toursData
      .slice(0, 3)
      .filter((t) => !t.promoLabel)
      .map((t) => t.id)

    const isFull = toursData.length === 6
    const hasErrors = missingDepartures.length > 0
    const hasWarnings = missingPromoInHero.length > 0

    return {
      isFull,
      hasErrors,
      hasWarnings,
      missingDepartures,
      missingPromoInHero,
    }
  }, [toursData])

  const heroZoneTours = toursData.slice(0, 3)
  const catalogZoneTours = toursData.slice(3, 6)
  const label = field?.label || 'Tour nổi bật WingsGo'

  return (
    <div className="curation-console" id={`field-${path}`} data-testid="wingsgo-curation-console">
      {/* Payload Field Label */}
      <FieldLabel label={label} path={path} required={field?.required} />

      {/* Top Bar with Stats & Pre-validation Status */}
      <div className="curation-top-bar">
        <div className="curation-header-title">
          <h3>
            <span>🎛️ Bảng Điều Phối Tour Nổi Bật &amp; Live Simulator</span>
          </h3>
          <p>
            Kéo thả để sắp xếp thứ tự hiển thị. 3 vị trí đầu ghim vào Hero Banner; 3 vị trí sau hiển thị đầu lưới Catalog.
          </p>
        </div>

        <div className="curation-header-stats">
          <span className={`slot-counter-badge ${toursData.length === 6 ? 'full' : ''}`}>
            {toursData.length} / 6 Slot
          </span>

          {validationReport.hasErrors ? (
            <span className="status-pill error" title="Có tour thiếu lịch bay tương lai">
              ⛔ Cần kiểm tra lịch bay
            </span>
          ) : validationReport.hasWarnings ? (
            <span className="status-pill warning" title="3 vị trí Hero nên có nhãn ưu đãi">
              ⚠️ Thiếu nhãn Hero
            </span>
          ) : (
            <span className="status-pill valid" title="Đầy đủ điều kiện kinh doanh">
              ✓ Sẵn sàng hiển thị
            </span>
          )}
        </div>
      </div>

      {/* Split Screen Layout */}
      <div className="curation-split-layout">
        {/* LEFT COLUMN: CURATION BOARD */}
        <div className="curation-board-panel">
          <DndContext
            id={dndContextId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            {/* 1. HERO ZONE (SLOT 1, 2, 3) */}
            <div className="zone-container hero-zone">
              <div className="zone-header">
                <h4>
                  <span>🌟 Khối Ưu đãi hot Hero</span>
                </h4>
                <span className="zone-hint">(Hiển thị 3 Tour nổi bật đầu trang)</span>
              </div>
              <div className="zone-cards">
                <SortableContext
                  items={heroZoneTours.map((t) => String(t.id))}
                  strategy={verticalListSortingStrategy}
                >
                  {heroZoneTours.map((tour, index) => (
                    <TourSortableCard
                      key={tour.id}
                      tour={tour}
                      index={index}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                      onRemove={handleRemove}
                      canMoveUp={index > 0}
                      canMoveDown={index < toursData.length - 1}
                    />
                  ))}
                </SortableContext>

                {heroZoneTours.length < 3 && (
                  <div className="empty-slot-placeholder">
                    + Slot #{heroZoneTours.length + 1} trống trong khối Hero
                  </div>
                )}
              </div>
            </div>

            {/* 2. CATALOG ZONE (SLOT 4, 5, 6) */}
            <div className="zone-container catalog-zone">
              <div className="zone-header">
                <h4>
                  <span>📋 Lưới Catalog tiếp nối</span>
                </h4>
                <span className="zone-hint">(Hiển thị các vị trí kế tiếp trong catalog)</span>
              </div>
              <div className="zone-cards">
                <SortableContext
                  items={catalogZoneTours.map((t) => String(t.id))}
                  strategy={verticalListSortingStrategy}
                >
                  {catalogZoneTours.map((tour, index) => {
                    const actualIndex = index + 3
                    return (
                      <TourSortableCard
                        key={tour.id}
                        tour={tour}
                        index={actualIndex}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        onRemove={handleRemove}
                        canMoveUp={actualIndex > 0}
                        canMoveDown={actualIndex < toursData.length - 1}
                      />
                    )
                  })}
                </SortableContext>

                {catalogZoneTours.length < 3 && toursData.length >= 3 && (
                  <div className="empty-slot-placeholder">
                    + Slot #{toursData.length + 1} trống trong khối Catalog
                  </div>
                )}
              </div>
            </div>
          </DndContext>

          {/* Add Tour Button */}
          {!readOnly && (
            <button
              type="button"
              className="btn-add-tour"
              disabled={toursData.length >= 6}
              onClick={() => setIsPickerOpen(true)}
              data-testid="btn-add-curated-tour"
            >
              {toursData.length >= 6
                ? '✓ Đã đạt tối đa 6 tour nổi bật'
                : `+ Thêm tour vào danh sách nổi bật (${6 - toursData.length} slot còn lại)`}
            </button>
          )}

          <p style={{ margin: '0.25rem 0 0', color: 'var(--theme-elevation-600)', fontSize: '0.8rem' }}>
            {field?.admin?.description ||
              'Mỗi tour phải là sản phẩm WingsGo đã publish, có wrapper page cùng site và có ít nhất 1 đợt khởi hành tương lai.'}
          </p>

          <FieldError message={errorMessage} path={path} showError={showError} />
        </div>

        {/* RIGHT COLUMN: LIVE SIMULATOR */}
        <div className="curation-simulator-col">
          <LiveSimulatorPreview tours={toursData} />
        </div>
      </div>

      {/* Tour Picker Modal */}
      <TourPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelectTour={handleSelectTour}
        selectedIds={selectedIDs}
      />
    </div>
  )
}

export default FeaturedToursCurationField
