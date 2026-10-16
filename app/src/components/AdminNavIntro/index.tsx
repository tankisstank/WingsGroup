'use client'

import Link from 'next/link'
import {
  BookOpenIcon,
  FilePlus2Icon,
  FileTextIcon,
  ImageIcon,
  InboxIcon,
  LayoutDashboardIcon,
  MapIcon,
  PaletteIcon,
  SearchCheckIcon,
  Settings2Icon,
  SparklesIcon,
  type LucideIcon,
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import React from 'react'

const text = {
  console: 'Bàn điều hành',
  createPage: 'Tạo trang nhanh',
  leadInbox: 'Lead gửi về',
  media: 'Thư viện media',
  managementLayer: 'Nền quản trị',
  multisiteCMS: 'Multisite CMS',
  pages: 'Quản lý trang',
  siteSettings: 'Cài đặt site',
  siteReview: 'Rà soát site',
  theme: 'Giao diện & Theme',
  tours: 'Quản lý tour',
  tourCurations: 'Bộ tour nổi bật',
  posts: 'Bài viết',
} as const

type QuickLinkKey = keyof typeof text
type QuickLink = {
  href: string
  Icon: LucideIcon
  key: QuickLinkKey
}

type NavigationGroup = {
  label: string
  links: QuickLink[]
}

const navigationGroups: NavigationGroup[] = [
  {
    label: 'Vận hành',
    links: [
      { href: '/admin/console', Icon: LayoutDashboardIcon, key: 'console' },
      { href: '/admin/site-review', Icon: SearchCheckIcon, key: 'siteReview' },
      { href: '/admin/collections/form-submissions', Icon: InboxIcon, key: 'leadInbox' },
    ],
  },
  {
    label: 'Nội dung',
    links: [
      { href: '/admin/collections/pages', Icon: FileTextIcon, key: 'pages' },
      { href: '/admin/collections/tour-products', Icon: MapIcon, key: 'tours' },
      { href: '/admin/collections/tour-curations', Icon: SparklesIcon, key: 'tourCurations' },
      { href: '/admin/collections/posts', Icon: BookOpenIcon, key: 'posts' },
      { href: '/admin/collections/media', Icon: ImageIcon, key: 'media' },
      { href: '/admin/page-wizard', Icon: FilePlus2Icon, key: 'createPage' },
    ],
  },
  {
    label: 'Cấu hình site',
    links: [
      { href: '/admin/theme', Icon: PaletteIcon, key: 'theme' },
      { href: '/admin/collections/site-settings', Icon: Settings2Icon, key: 'siteSettings' },
    ],
  },
] as const

const mobileLinks = navigationGroups[0].links

const AdminNavIntro: React.FC = () => {
  const pathname = usePathname() || ''

  return (
    <div className="wings-admin-nav-intro">
      <div className="wings-admin-nav-intro__head" data-od-id="admin-nav-heading">
        <span>{text.managementLayer}</span>
        <strong>{text.multisiteCMS}</strong>
      </div>
      <nav aria-label="Không gian vận hành" className="wings-admin-nav-intro__desktop">
        {navigationGroups.map((group) => (
          <section className="wings-admin-nav-intro__group" key={group.label}>
            <span className="wings-admin-nav-intro__group-label">{group.label}</span>
            <div className="wings-admin-nav-intro__links">
              {group.links.map((link) => {
                const label = text[link.key]
                const Icon = link.Icon
                const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)

                return (
                  <Link
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={label}
                    className={isActive ? 'is-active' : undefined}
                    data-od-id={`admin-nav-${link.key}`}
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
          </section>
        ))}
      </nav>
      <nav aria-label="Điều hướng nhanh trên mobile" className="wings-admin-nav-intro__mobile">
        {mobileLinks.map((link) => {
          const label = text[link.key]
          const Icon = link.Icon
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)

          return (
            <Link
              aria-current={isActive ? 'page' : undefined}
              aria-label={label}
              className={isActive ? 'is-active' : undefined}
              data-od-id={`admin-nav-mobile-${link.key}`}
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
      </nav>
    </div>
  )
}

export default AdminNavIntro
