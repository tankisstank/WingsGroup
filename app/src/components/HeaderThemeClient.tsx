'use client'

import { useHeaderTheme } from '@/providers/HeaderTheme'
import type { Theme } from '@/providers/Theme/types'
import React, { useEffect } from 'react'

const HeaderThemeClient: React.FC<{ theme: Theme }> = ({ theme }) => {
  const { setHeaderTheme } = useHeaderTheme()

  useEffect(() => {
    setHeaderTheme(theme)
  }, [setHeaderTheme, theme])

  return <React.Fragment />
}

export default HeaderThemeClient
