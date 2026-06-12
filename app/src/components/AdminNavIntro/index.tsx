'use client'

import Link from 'next/link'
import React, { useEffect, useState } from 'react'

type Role = 'editor' | 'site-manager' | 'super-admin'
type AdminLocale = 'en' | 'vi'

const textByLocale = {
  en: {
    console: 'Operator console',
    leadInbox: 'Lead inbox',
    managementLayer: 'Management layer',
    multisiteCMS: 'Multisite CMS',
    pageWizard: 'Quick page wizard',
    importData: 'Import data',
    users: 'Users',
  },
  vi: {
    console: 'Console vận hành',
    leadInbox: 'Lead gửi về',
    managementLayer: 'Nền quản trị',
    multisiteCMS: 'Multisite CMS',
    pageWizard: 'Tạo trang nhanh',
    importData: 'Nhập dữ liệu',
    users: 'Người dùng',
  },
} satisfies Record<AdminLocale, Record<string, string>>

const detectAdminLocale = (): AdminLocale => {
  const htmlLang = document.documentElement.lang?.toLowerCase()

  if (htmlLang?.startsWith('en')) {
    return 'en'
  }

  const localeText = document.body.textContent?.match(/Locale:\s*(English|Tiếng Việt|Vietnamese)/i)?.[1]

  if (localeText?.toLowerCase().includes('english')) {
    return 'en'
  }

  return 'vi'
}

const AdminNavIntro: React.FC = () => {
  const [role, setRole] = useState<Role>('editor')
  const [locale, setLocale] = useState<AdminLocale>('vi')

  useEffect(() => {
    const loadRole = async () => {
      const response = await fetch('/api/users/me', {
        credentials: 'include',
      })

      if (!response.ok) {
        return
      }

      const data = (await response.json()) as { user?: { role?: Role } }
      setRole(data.user?.role ?? 'editor')
    }

    void loadRole()
  }, [])

  useEffect(() => {
    const syncLocale = () => setLocale(detectAdminLocale())

    syncLocale()

    const observer = new MutationObserver(syncLocale)
    observer.observe(document.documentElement, {
      attributeFilter: ['lang'],
      attributes: true,
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [])

  const canManageData = role === 'site-manager' || role === 'super-admin'
  const isSuperAdmin = role === 'super-admin'
  const t = textByLocale[locale]

  return (
    <div className="wings-admin-nav-intro">
      <span>{t.managementLayer}</span>
      <strong>{t.multisiteCMS}</strong>
      <Link href="/admin/console">{t.console}</Link>
      <Link href="/admin/page-wizard">{t.pageWizard}</Link>
      <Link href="/admin/collections/form-submissions">{t.leadInbox}</Link>
      {canManageData ? <Link href="/admin/collections/imports">{t.importData}</Link> : null}
      {isSuperAdmin ? <Link href="/admin/collections/users">{t.users}</Link> : null}
    </div>
  )
}

export default AdminNavIntro
