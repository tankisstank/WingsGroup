'use client'

import type { Header } from '@/payload-types'
import { useRowLabel, type RowLabelProps } from '@payloadcms/ui'
import type { FC } from 'react'

export const NavItemRowLabel: FC<RowLabelProps> = () => {
  const data = useRowLabel<NonNullable<Header['navItems']>[number]>()

  const label = data?.data?.link?.label
    ? `Nav item ${data.rowNumber !== undefined ? data.rowNumber + 1 : ''}: ${data?.data?.link?.label}`
    : 'Row'

  return <div>{label}</div>
}
