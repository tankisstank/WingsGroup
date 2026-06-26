'use client'

import Link from 'next/link'
import {
  DatabaseIcon,
  InboxIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  SearchCheckIcon,
  UserRoundIcon,
  WandSparklesIcon,
} from 'lucide-react'
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
    siteReview: 'Site review',
    importData: 'Import data',
    users: 'Users',
  },
  vi: {
    console: 'Console vận hành',
    leadInbox: 'Lead gửi về',
    managementLayer: 'Nền quản trị',
    multisiteCMS: 'Multisite CMS',
    pageWizard: 'Tạo trang nhanh',
    siteReview: 'Rà soát site',
    importData: 'Nhập dữ liệu',
    users: 'Người dùng',
  },
} satisfies Record<AdminLocale, Record<string, string>>

type QuickLinkKey = keyof (typeof textByLocale)['en']
type QuickLink = {
  href: string
  Icon: LucideIcon
  key: QuickLinkKey
  requiresDataManager?: boolean
  requiresSuperAdmin?: boolean
}

const quickLinks: QuickLink[] = [
  { href: '/admin/console', Icon: LayoutDashboardIcon, key: 'console' },
  { href: '/admin/site-review', Icon: SearchCheckIcon, key: 'siteReview' },
  { href: '/admin/page-wizard', Icon: WandSparklesIcon, key: 'pageWizard' },
  { href: '/admin/collections/form-submissions', Icon: InboxIcon, key: 'leadInbox' },
  { href: '/admin/collections/imports', Icon: DatabaseIcon, key: 'importData', requiresDataManager: true },
  { href: '/admin/collections/users', Icon: UserRoundIcon, key: 'users', requiresSuperAdmin: true },
] as const

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
      <div className="wings-admin-nav-intro__head">
        <span>{t.managementLayer}</span>
        <strong>{t.multisiteCMS}</strong>
      </div>
      <div className="wings-admin-nav-intro__links">
        {quickLinks.map((link) => {
          if (link.requiresDataManager && !canManageData) {
            return null
          }

          if (link.requiresSuperAdmin && !isSuperAdmin) {
            return null
          }

          const label = t[link.key]
          const Icon = link.Icon

          return (
            <Link
              aria-label={label}
              href={link.href}
              key={link.href}
              title={label}
            >
              <span className="wings-admin-nav-intro__icon" aria-hidden="true">
                <Icon />
              </span>
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default AdminNavIntro
