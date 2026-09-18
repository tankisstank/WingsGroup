'use client'

import { useRowLabel, type RowLabelProps } from '@payloadcms/ui'
import type { FC } from 'react'

type ItineraryRow = {
  dayNumber?: number | null
  title?: string | null
}

export const TourItineraryRowLabel: FC<RowLabelProps> = () => {
  const row = useRowLabel<ItineraryRow>()
  const day = row?.data?.dayNumber || (row?.rowNumber !== undefined ? row.rowNumber + 1 : null)
  const title = typeof row?.data?.title === 'string' ? row.data.title.trim() : ''

  return <div>{day ? `Ngày ${day}${title ? ` — ${title}` : ''}` : 'Ngày hành trình'}</div>
}

export default TourItineraryRowLabel
