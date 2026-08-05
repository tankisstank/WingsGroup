'use client'

import { useEffect } from 'react'

const adminThemeClasses = ['wings-admin-theme-ats', 'wings-admin-theme-finexy'] as const
const adminShellClass = 'wings-admin-shell'
const adminThemeStorageKey = 'wings-admin-theme'
const defaultAdminTheme = 'finexy-soft'
const validAdminThemes = ['ats-compact', 'finexy-soft'] as const

type AdminTheme = (typeof validAdminThemes)[number]

const isAdminTheme = (value: string | null): value is AdminTheme =>
  validAdminThemes.includes(value as AdminTheme)

const themeClassByKey: Record<AdminTheme, (typeof adminThemeClasses)[number]> = {
  'ats-compact': 'wings-admin-theme-ats',
  'finexy-soft': 'wings-admin-theme-finexy',
}

const applyAdminTheme = (theme: AdminTheme) => {
  const themeClass = themeClassByKey[theme]

  for (const target of [document.documentElement, document.body]) {
    target.classList.remove(...adminThemeClasses)
    target.classList.add(adminShellClass, themeClass)
    target.dataset.adminTheme = theme
    target.dataset.adminShell = 'payload'
  }
}

export default function AdminThemeBootstrap() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const themeFromURL = params.get('adminTheme')
    const themeFromStorage = window.localStorage.getItem(adminThemeStorageKey)
    const theme =
      themeFromURL !== null
        ? isAdminTheme(themeFromURL)
          ? themeFromURL
          : defaultAdminTheme
        : isAdminTheme(themeFromStorage)
          ? themeFromStorage
          : defaultAdminTheme

    window.localStorage.setItem(adminThemeStorageKey, theme)
    applyAdminTheme(theme)
  }, [])

  return null
}
