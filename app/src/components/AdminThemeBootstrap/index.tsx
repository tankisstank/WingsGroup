'use client'

import { useEffect } from 'react'

const adminThemeClasses = ['wings-admin-theme-ats', 'wings-admin-theme-finexy'] as const
const adminShellClass = 'wings-admin-shell'
const adminThemeStorageKey = 'wings-admin-theme'
const defaultAdminTheme = 'finexy-soft'
const validAdminThemes = ['ats-compact', 'finexy-soft'] as const
const adminLocaleCookie = 'payload-lng'
const adminLocale = 'vi'

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

const hasCookie = (name: string, value: string) =>
  document.cookie.split(';').some((item) => item.trim() === `${name}=${value}`)

const ensureAdminLocale = () => {
  // This is the operator UI locale only. Content locale is selected explicitly
  // by Payload/API callers and never inferred from this document attribute.
  document.documentElement.lang = adminLocale

  if (!hasCookie(adminLocaleCookie, adminLocale)) {
    document.cookie = `${adminLocaleCookie}=${adminLocale}; Path=/; Max-Age=31536000; SameSite=Lax`
    return true
  }

  return false
}

const ensureAdminMain = () => {
  const existingMain = document.querySelector('main')
  const fallbackMain = document.querySelector<HTMLElement>(
    '.login, .template-default__wrap, .dashboard__wrap, .collection-list__wrap, .collection-edit__wrap',
  )
  const main = existingMain ?? fallbackMain

  if (!main) {
    return null
  }

  if (!existingMain) {
    main.setAttribute('role', 'main')
  }

  const id = main.id || 'admin-main-content'
  main.id = id
  main.setAttribute('tabindex', '-1')
  main.setAttribute('data-admin-main', 'true')
  main.style.scrollMarginTop = '88px'

  if (!existingMain?.getAttribute('aria-label') && !existingMain?.getAttribute('aria-labelledby')) {
    main.setAttribute('aria-label', 'Nội dung quản trị')
  }

  return main
}

const ensureAdminSkipLink = (main: HTMLElement | null) => {
  if (!main) {
    return
  }

  let link = document.querySelector<HTMLAnchorElement>('.wings-admin-skip-link')

  if (!link) {
    link = document.createElement('a')
    link.className = 'wings-admin-skip-link'
    link.textContent = 'Bỏ qua đến nội dung chính'
    document.body.prepend(link)
  }

  link.href = `#${main.id}`

  if (link.dataset.skipBound !== 'true') {
    link.addEventListener('click', (event) => {
      const targetID = link?.getAttribute('href')?.slice(1)
      const target = targetID ? document.getElementById(targetID) : null

      if (!target) {
        return
      }

      event.preventDefault()
      target.focus({ preventScroll: true })
      target.scrollIntoView({ block: 'start' })
    })
    link.dataset.skipBound = 'true'
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

    ensureAdminLocale()
    const syncLandmarks = () => ensureAdminSkipLink(ensureAdminMain())
    const frame = window.requestAnimationFrame(syncLandmarks)
    const observer = new MutationObserver(syncLandmarks)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  return null
}
