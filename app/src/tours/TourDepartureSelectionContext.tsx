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
  initialDeparture = null,
  initialCity = '',
}: {
  children: React.ReactNode
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

  const setSelectedDeparture = (departure: DepartureCardViewModel | null) => {
    setIsSelectionExplicit(true)
    setSelectedDepartureState(departure)
  }

  const setIsPrivateTour = (isPrivate: boolean) => {
    setIsPrivateTourState(isPrivate)
    if (isPrivate) {
      setSelectedDeparture(null)
      setAnnounceMessage('Đã chuyển sang tư vấn lịch riêng theo đoàn')
    } else {
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
