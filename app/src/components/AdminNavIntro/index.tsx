'use client'

import Link from 'next/link'
import { InboxIcon, LayoutDashboardIcon, type LucideIcon, SearchCheckIcon } from 'lucide-react'
import { usePathname } from 'next/navigation'
import React from 'react'

const text = {
  console: 'Console vận hành',
  leadInbox: 'Lead gửi về',
  managementLayer: 'Nền quản trị',
  multisiteCMS: 'Multisite CMS',
  siteReview: 'Rà soát site',
} as const

type QuickLinkKey = keyof typeof text
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

const AdminNavIntro: React.FC = () => {
  const pathname = usePathname()

  return (
    <div className="wings-admin-nav-intro">
      <div className="wings-admin-nav-intro__head">
        <span>{text.managementLayer}</span>
        <strong>{text.multisiteCMS}</strong>
      </div>
      <div className="wings-admin-nav-intro__links">
        {quickLinks.map((link) => {
          const label = text[link.key]
          const Icon = link.Icon

          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)

          return (
            <Link
              aria-current={isActive ? 'page' : undefined}
              aria-label={label}
              className={isActive ? 'is-active' : undefined}
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
