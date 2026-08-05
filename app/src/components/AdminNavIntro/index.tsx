'use client'

import Link from 'next/link'
import {
  InboxIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  SearchCheckIcon,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

type AdminLocale = 'en' | 'vi'

const textByLocale = {
  en: {
    console: 'Operator console',
    leadInbox: 'Lead inbox',
    managementLayer: 'Management layer',
    multisiteCMS: 'Multisite CMS',
    siteReview: 'Site review',
  },
  vi: {
    console: 'Console vận hành',
    leadInbox: 'Lead gửi về',
    managementLayer: 'Nền quản trị',
    multisiteCMS: 'Multisite CMS',
    siteReview: 'Rà soát site',
  },
} satisfies Record<AdminLocale, Record<string, string>>

type QuickLinkKey = keyof (typeof textByLocale)['en']
type QuickLink = {
  href: string
  Icon: LucideIcon
  key: QuickLinkKey
}

const quickLinks: QuickLink[] = [
  { href: '/admin/console', Icon: LayoutDashboardIcon, key: 'console' },
  { href: '/admin/site-review', Icon: SearchCheckIcon, key: 'siteReview' },
  { href: '/admin/collections/form-submissions', Icon: InboxIcon, key: 'leadInbox' },
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
  const [locale, setLocale] = useState<AdminLocale>('vi')

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

  const t = textByLocale[locale]

  return (
    <div className="wings-admin-nav-intro">
      <div className="wings-admin-nav-intro__head">
        <span>{t.managementLayer}</span>
        <strong>{t.multisiteCMS}</strong>
      </div>
      <div className="wings-admin-nav-intro__links">
        {quickLinks.map((link) => {
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
