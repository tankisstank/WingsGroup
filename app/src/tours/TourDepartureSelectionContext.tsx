'use client'

import React, { createContext, useContext, useState } from 'react'
import type { DepartureCardViewModel } from './types'

type TourDepartureSelectionContextType = {
  selectedDeparture: DepartureCardViewModel | null
  setSelectedDeparture: (departure: DepartureCardViewModel | null) => void
  isSelectionExplicit: boolean
  selectedCity: string
  setSelectedCity: (city: string) => void
  isPrivateTour: boolean
  setIsPrivateTour: (isPrivate: boolean) => void
  announceMessage: string
  setAnnounceMessage: (msg: string) => void
}

const TourDepartureSelectionContext = createContext<TourDepartureSelectionContextType>({
  selectedDeparture: null,
  setSelectedDeparture: () => {},
  isSelectionExplicit: false,
  selectedCity: '',
  setSelectedCity: () => {},
  isPrivateTour: false,
  setIsPrivateTour: () => {},
  announceMessage: '',
  setAnnounceMessage: () => {},
})

export const TourDepartureSelectionProvider = ({
  children,
  departures = [],
  initialDeparture = null,
  initialCity = '',
}: {
  children: React.ReactNode
  departures?: DepartureCardViewModel[]
  initialDeparture?: DepartureCardViewModel | null
  initialCity?: string
}) => {
  const [selectedDeparture, setSelectedDepartureState] = useState<DepartureCardViewModel | null>(
    initialDeparture,
  )
  const [isSelectionExplicit, setIsSelectionExplicit] = useState<boolean>(false)
  const [selectedCity, setSelectedCity] = useState<string>(initialCity)
  const [isPrivateTour, setIsPrivateTourState] = useState<boolean>(false)
  const [announceMessage, setAnnounceMessage] = useState<string>('')

  const prevDeparturesRef = React.useRef(departures)
  const prevInitialDepRef = React.useRef(initialDeparture)

  // Reconcile selectedDeparture when departures or initialDeparture change
  React.useEffect(() => {
    const departuresChanged = prevDeparturesRef.current !== departures
    const initialDepChanged = prevInitialDepRef.current !== initialDeparture

    prevDeparturesRef.current = departures
    prevInitialDepRef.current = initialDeparture

    if (!departuresChanged && !initialDepChanged) {
      return
    }

    if (isPrivateTour) {
      return
    }

    if (!departures || departures.length === 0) {
      setSelectedDepartureState(null)
      return
    }

    setSelectedDepartureState((prev) => {
      if (!prev) {
        return null
      }
      const match = departures.find((d) => String(d.id) === String(prev.id))
      return match || initialDeparture || departures[0] || null
    })
  }, [departures, initialDeparture, isPrivateTour])

  const setSelectedDeparture = (departure: DepartureCardViewModel | null) => {
    setIsSelectionExplicit(true)
    if (departure && isPrivateTour) {
      setIsPrivateTourState(false)
    }
    setSelectedDepartureState(departure)
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
      // Filter departures matching selectedCity if a city filter is active
      const candidateDepartures = selectedCity && selectedCity !== 'all'
        ? departures.filter((d) => d.departureCity === selectedCity)
        : departures

      const restored =
        candidateDepartures.find(
          (d) =>
            d.availabilityStatus === 'open' ||
            d.availabilityStatus === 'limited' ||
            (d as any).status === 'open' ||
            (d as any).status === 'limited',
        ) ||
        candidateDepartures[0] ||
        (selectedCity && selectedCity !== 'all' ? null : initialDeparture) ||
        null

      setSelectedDepartureState(restored)
      setAnnounceMessage('Đã quay lại xem lịch tour ghép')
    }
  }

  return (
    <TourDepartureSelectionContext.Provider
      value={{
        selectedDeparture,
        setSelectedDeparture,
        isSelectionExplicit,
        selectedCity,
        setSelectedCity,
        isPrivateTour,
        setIsPrivateTour,
        announceMessage,
        setAnnounceMessage,
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
