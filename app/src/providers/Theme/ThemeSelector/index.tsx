'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import React, { useState } from 'react'

import type { Theme } from './types'
import type { PublicChromeCopy } from '@/i18n/publicCopy'

import { useTheme } from '..'
import { themeLocalStorageKey } from './types'

type ThemeSelectorCopy = PublicChromeCopy['themeSelector']

export const ThemeSelector: React.FC<{ copy: ThemeSelectorCopy }> = ({ copy }) => {
  const { setTheme } = useTheme()
  const [value, setValue] = useState('')

  const onThemeChange = (themeToSet: Theme & 'auto') => {
    if (themeToSet === 'auto') {
      setTheme(null)
      setValue('auto')
    } else {
      setTheme(themeToSet)
      setValue(themeToSet)
    }
  }

  React.useEffect(() => {
    const preference = window.localStorage.getItem(themeLocalStorageKey)
    setValue(preference ?? 'auto')
  }, [])

  return (
    <Select onValueChange={onThemeChange} value={value}>
      <SelectTrigger
        aria-label={copy.ariaLabel}
        className="w-auto bg-transparent gap-2 pl-0 md:pl-3 border-none"
      >
        <SelectValue placeholder={copy.placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="auto">{copy.auto}</SelectItem>
        <SelectItem value="light">{copy.light}</SelectItem>
        <SelectItem value="dark">{copy.dark}</SelectItem>
      </SelectContent>
    </Select>
  )
}
