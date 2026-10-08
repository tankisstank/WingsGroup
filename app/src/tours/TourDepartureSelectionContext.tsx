'use client'

import React, { createContext, useContext, useState } from 'react'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import type { DepartureCardViewModel } from './types'
import { formatTourDate } from './utils'

export const monthKey = (date?: null | string) => (date ? String(date).slice(0, 7) : '')

export const getVisibleDepartures = (
  deps: DepartureCardViewModel[],
  city: string,
  month: string,
) => {
  return (deps || []).filter((d) => {
    const matchCity = !city || city === 'all' || d.departureCity === city
    const dMonth = monthKey(d.departureDate)
    const matchMonth = !month || month === 'all' || dMonth === month
    return matchCity && matchMonth
  })
}

export const findBestDeparture = (deps: DepartureCardViewModel[]) => {
  if (!deps || deps.length === 0) return null

  const openDeps = deps.filter(
    (d) =>
      (d.commerceVerified && d.availabilityStatus !== 'sold-out' && Number(d.priceFrom) > 0) ||
      d.availabilityStatus === 'open' ||
      d.availabilityStatus === 'limited' ||
      (d as any).status === 'open' ||
      (d as any).status === 'limited',
  )

  if (openDeps.length > 0) {
    const sorted = [...openDeps].sort((a, b) => {
      const priceA = Number(a.priceFrom) || Infinity
      const priceB = Number(b.priceFrom) || Infinity
      if (priceA !== priceB) return priceA - priceB
      const dateA = a.departureDate ? new Date(a.departureDate).getTime() : Infinity
      const dateB = b.departureDate ? new Date(b.departureDate).getTime() : Infinity
      return dateA - dateB
    })
    return sorted[0]
  }

  return deps[0] || null
}

type TourDepartureSelectionContextType = {
  departures: DepartureCardViewModel[]
  selectedDeparture: DepartureCardViewModel | null
  setSelectedDeparture: (departure: DepartureCardViewModel | null) => void
  isSelectionExplicit: boolean
  selectedCity: string
  setSelectedCity: (city: string) => void
  activeMonth: string
  setActiveMonth: (month: string) => void
  guestCount: number
  setGuestCount: (count: number | ((prev: number) => number)) => void
  isPrivateTour: boolean
  setIsPrivateTour: (isPrivate: boolean) => void
  announceMessage: string
  setAnnounceMessage: (msg: string) => void
  isConsultationOpen?: boolean
  setIsConsultationOpen?: (open: boolean) => void
}

const TourDepartureSelectionContext = createContext<TourDepartureSelectionContextType>({
  departures: [],
  selectedDeparture: null,
  setSelectedDeparture: () => {},
  isSelectionExplicit: false,
  selectedCity: '',
  setSelectedCity: () => {},
  activeMonth: 'all',
  setActiveMonth: () => {},
  guestCount: 2,
  setGuestCount: () => {},
  isPrivateTour: false,
  setIsPrivateTour: () => {},
  announceMessage: '',
  setAnnounceMessage: () => {},
  isConsultationOpen: false,
  setIsConsultationOpen: () => {},
})

export const TourDepartureSelectionProvider = ({
  children,
  departures = [],
  initialDeparture = null,
  initialCity = '',
  locale = 'vi',
}: {
  children: React.ReactNode
  departures?: DepartureCardViewModel[]
  initialDeparture?: DepartureCardViewModel | null
  initialCity?: string
  locale?: SupportedLocaleCode | string
}) => {
  const [selectedDeparture, setSelectedDepartureState] = useState<DepartureCardViewModel | null>(
    initialDeparture ?? findBestDeparture(departures),
  )
  const [isSelectionExplicit, setIsSelectionExplicit] = useState<boolean>(false)
  const [selectedCity, setSelectedCity] = useState<string>(initialCity || 'all')
  const [activeMonth, setActiveMonth] = useState<string>('all')
  const [guestCount, setGuestCountState] = useState<number>(2)
  const [isPrivateTour, setIsPrivateTourState] = useState<boolean>(false)
  const [announceMessage, setAnnounceMessage] = useState<string>('')
  const [isConsultationOpen, setIsConsultationOpen] = useState<boolean>(false)

  const selectedDepRef = React.useRef(selectedDeparture)
  selectedDepRef.current = selectedDeparture

  const enrichedInitialDeparture = React.useMemo(() => {
    if (!initialDeparture) return null
    const match = (departures || []).find((d) => String(d.id) === String(initialDeparture.id))
    return match ? { ...match, ...initialDeparture } : initialDeparture
  }, [initialDeparture, departures])

  const enrich = React.useCallback(
    (d: DepartureCardViewModel | null) => {
      if (!d) return null
      if (initialDeparture && String(d.id) === String(initialDeparture.id)) {
        return enrichedInitialDeparture
      }
      return d
    },
    [initialDeparture, enrichedInitialDeparture],
  )

  const setGuestCount = (count: number | ((prev: number) => number)) => {
    setGuestCountState((prev) => {
      const next = typeof count === 'function' ? count(prev) : count
      const clamped = Math.max(1, Math.min(99, Math.round(Number(next) || 1)))
      return clamped
    })
  }

  const announceSelection = React.useCallback(
    (departure: DepartureCardViewModel | null) => {
      if (departure) {
        setAnnounceMessage(
          locale === 'en'
            ? `Selected departure ${formatTourDate(departure.departureDate, (locale || 'vi') as SupportedLocaleCode)}`
            : `Đã chọn đợt khởi hành ngày ${formatTourDate(departure.departureDate, (locale || 'vi') as SupportedLocaleCode)}`,
        )
      } else {
        setAnnounceMessage(locale === 'en' ? 'No departure selected' : 'Chưa chọn đợt khởi hành')
      }
    },
    [locale],
  )

  const prevDeparturesRef = React.useRef(departures)
  const prevCityRef = React.useRef(selectedCity)
  const prevMonthRef = React.useRef(activeMonth)
  const prevIsPrivateRef = React.useRef(isPrivateTour)
  const isInitialMount = React.useRef(true)

  // Reconcile selectedDeparture when departures, selectedCity, activeMonth, or isPrivateTour change
  React.useEffect(() => {
    const departuresChanged = prevDeparturesRef.current !== departures
    const cityChanged = prevCityRef.current !== selectedCity
    const monthChanged = prevMonthRef.current !== activeMonth
    const privateChanged = prevIsPrivateRef.current !== isPrivateTour

    prevDeparturesRef.current = departures
    prevCityRef.current = selectedCity
    prevMonthRef.current = activeMonth
    prevIsPrivateRef.current = isPrivateTour

    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (isPrivateTour) {
      if (selectedDepRef.current !== null) {
        setSelectedDepartureState(null)
      }
      return
    }

    const visible = getVisibleDepartures(departures, selectedCity, activeMonth)

    if (visible.length === 0) {
      if (selectedDepRef.current !== null) {
        setSelectedDepartureState(null)
        announceSelection(null)
      }
      return
    }

    const current = selectedDepRef.current
    if (current) {
      const match = visible.find((d) => String(d.id) === String(current.id))
      if (match) {
        // Still visible! Only update if departures list refreshed and match object changed
        if (departuresChanged && match !== current) {
          const enriched = enrich(match)
          if (enriched !== current) {
            setSelectedDepartureState(enriched)
          }
        }
      } else {
        // Selection no longer in visible departures (due to filter change or item deleted)
        const best = enrich(findBestDeparture(visible))
        setSelectedDepartureState(best)
        announceSelection(best)
      }
    } else {
      // Current selection was null
      if (cityChanged || monthChanged || privateChanged) {
        // Filter change or return from private: restore best available in new visible list
        const best = enrich(findBestDeparture(visible))
        setSelectedDepartureState(best)
        announceSelection(best)
      }
    }
  }, [departures, selectedCity, activeMonth, isPrivateTour, announceSelection, enrich])

  const setSelectedDeparture = (departure: DepartureCardViewModel | null) => {
    setIsSelectionExplicit(true)
    if (departure && isPrivateTour) {
      setIsPrivateTourState(false)
    }
    const enriched = enrich(departure)
    setSelectedDepartureState(enriched)
    announceSelection(enriched)
  }

  const setIsPrivateTour = (isPrivate: boolean) => {
    if (isPrivate === isPrivateTour) {
      return
    }
    setIsPrivateTourState(isPrivate)
    if (isPrivate) {
      setSelectedDepartureState(null)
      setAnnounceMessage('Đã chuyển sang tư vấn lịch riêng theo đoàn')
    } else {
      const candidateDepartures = getVisibleDepartures(departures, selectedCity, activeMonth)
      const restored = enrich(findBestDeparture(candidateDepartures))
      setSelectedDepartureState(restored)
      setAnnounceMessage('Đã quay lại xem lịch tour ghép')
    }
  }

  return (
    <TourDepartureSelectionContext.Provider
      value={{
        departures,
        selectedDeparture,
        setSelectedDeparture,
        isSelectionExplicit,
        selectedCity,
        setSelectedCity,
        activeMonth,
        setActiveMonth,
        guestCount,
        setGuestCount,
        isPrivateTour,
        setIsPrivateTour,
        announceMessage,
        setAnnounceMessage,
        isConsultationOpen,
        setIsConsultationOpen,
      }}
    >
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-od-id="tour-departure-live-region"
      >
        {announceMessage}
      </div>
    </TourDepartureSelectionContext.Provider>
  )
}

export const useTourDepartureSelection = () => useContext(TourDepartureSelectionContext)
