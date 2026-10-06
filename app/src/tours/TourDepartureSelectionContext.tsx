'use client'

import React, { createContext, useContext, useState } from 'react'
import type { DepartureCardViewModel } from './types'

type TourDepartureSelectionContextType = {
  selectedDeparture: DepartureCardViewModel | null
  setSelectedDeparture: (departure: DepartureCardViewModel | null) => void
}

const TourDepartureSelectionContext = createContext<TourDepartureSelectionContextType>({
  selectedDeparture: null,
  setSelectedDeparture: () => {},
})

export const TourDepartureSelectionProvider = ({
  children,
  initialDeparture = null,
}: {
  children: React.ReactNode
  initialDeparture?: DepartureCardViewModel | null
}) => {
  const [selectedDeparture, setSelectedDeparture] = useState<DepartureCardViewModel | null>(
    initialDeparture,
  )

  return (
    <TourDepartureSelectionContext.Provider
      value={{ selectedDeparture, setSelectedDeparture }}
    >
      {children}
    </TourDepartureSelectionContext.Provider>
  )
}

export const useTourDepartureSelection = () => useContext(TourDepartureSelectionContext)
