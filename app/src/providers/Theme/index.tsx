'use client'

import React, { createContext, useCallback, use, useEffect, useState } from 'react'

import type { Theme, ThemeContextType } from './types'

import canUseDOM from '@/utilities/canUseDOM'
import { defaultTheme, getImplicitPreference, themeLocalStorageKey } from './shared'
import { themeIsValid } from './types'

const initialContext: ThemeContextType = {
  setTheme: () => null,
  theme: undefined,
}

const ThemeContext = createContext(initialContext)

export const ThemeProvider = ({
  children,
  siteCode,
}: {
  children: React.ReactNode
  siteCode?: string
}) => {
  const isAlwaysLight = siteCode === 'wings-group' || siteCode === 'wings-go'
  const [theme, setThemeState] = useState<Theme | undefined>(
    canUseDOM
      ? (isAlwaysLight ? 'light' : document.documentElement.getAttribute('data-theme')) as Theme
      : undefined,
  )

  const setTheme = useCallback((themeToSet: Theme | null) => {
    if (isAlwaysLight) {
      setThemeState('light')
      document.documentElement.setAttribute('data-theme', 'light')
      return
    }

    if (themeToSet === null) {
      window.localStorage.removeItem(themeLocalStorageKey)
      const implicitPreference = getImplicitPreference()
      document.documentElement.setAttribute('data-theme', implicitPreference || '')
      if (implicitPreference) setThemeState(implicitPreference)
    } else {
      setThemeState(themeToSet)
      window.localStorage.setItem(themeLocalStorageKey, themeToSet)
      document.documentElement.setAttribute('data-theme', themeToSet)
    }
  }, [isAlwaysLight])

  useEffect(() => {
    if (isAlwaysLight) {
      document.documentElement.setAttribute('data-theme', 'light')
      setThemeState('light')
      return
    }

    let themeToSet: Theme = defaultTheme
    const preference = window.localStorage.getItem(themeLocalStorageKey)

    if (themeIsValid(preference)) {
      themeToSet = preference
    }

    document.documentElement.setAttribute('data-theme', themeToSet)
    setThemeState(themeToSet)
  }, [isAlwaysLight])

  return <ThemeContext value={{ setTheme, theme }}>{children}</ThemeContext>
}

export const useTheme = (): ThemeContextType => use(ThemeContext)
