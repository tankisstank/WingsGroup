'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState, type ReactNode } from 'react'
import {
  UsersIcon,
  GlobeIcon,
  FileTextIcon,
  ArrowLeftRightIcon,
  UserIcon,
  LogOutIcon,
  MenuIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from 'lucide-react'
import { useAuth } from '@payloadcms/ui'

import AdminNavIntro from '@/components/AdminNavIntro'

import './index.scss'

const viewTitles: Record<string, string> = {
  '/admin/page-wizard': 'Tạo trang nhanh (Page Wizard)',
  '/admin/console': 'Console vận hành',
  '/admin/site-review': 'Rà soát site / page',
  '/admin/theme': 'Quản lý giao diện & Theme',
}

const roleLabelMap: Record<string, string> = {
  'super-admin': 'Quản trị toàn hệ',
  'site-manager': 'Quản lý site',
  editor: 'Biên tập viên',
}

export default function AdminStandaloneShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || ''
  const { user } = useAuth<{ email?: string; role?: string }>()
  const isSuper = user?.role === 'super-admin'
  const isManager = user?.role === 'site-manager' || isSuper
  const currentTitle = viewTitles[pathname] || 'Vận hành'
  const [isNavOpen, setIsNavOpen] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1050) {
      setIsNavOpen(false)
    }
  }, [])

  return (
    <div
      className={`wings-admin-standalone-shell ${isNavOpen ? 'wings-admin-standalone-shell--open' : 'wings-admin-standalone-shell--closed'}`}
      data-od-id="admin-standalone-shell"
    >
      {/* Sidebar Rail - Đồng bộ 100% với Payload .nav */}
      <aside
        aria-label="Điều hướng CMS"
        className="wings-admin-standalone-shell__rail"
        data-od-id="admin-standalone-rail"
      >
        <div className="wings-admin-standalone-scroll">
          <AdminNavIntro />

          {/* Nhóm Cài đặt hệ thống (Dành cho Manager & SuperAdmin giống hệt .nav__wrap của Payload) */}
          {isManager ? (
            <section className="wings-admin-nav-intro__group wings-admin-nav-advanced">
              <span className="wings-admin-nav-intro__group-label">Hệ thống</span>
              <div className="wings-admin-nav-intro__links">
                <Link
                  aria-current={pathname === '/admin/collections/users' ? 'page' : undefined}
                  className={pathname === '/admin/collections/users' ? 'is-active' : undefined}
                  href="/admin/collections/users"
                >
                  <span className="wings-admin-nav-intro__icon" aria-hidden="true">
                    <UsersIcon />
                  </span>
                  <span>Người dùng</span>
                </Link>
                <Link
                  aria-current={pathname === '/admin/collections/sites' ? 'page' : undefined}
                  className={pathname === '/admin/collections/sites' ? 'is-active' : undefined}
                  href="/admin/collections/sites"
                >
                  <span className="wings-admin-nav-intro__icon" aria-hidden="true">
                    <GlobeIcon />
                  </span>
                  <span>Sites</span>
                </Link>
                <Link
                  aria-current={pathname === '/admin/collections/forms' ? 'page' : undefined}
                  className={pathname === '/admin/collections/forms' ? 'is-active' : undefined}
                  href="/admin/collections/forms"
                >
                  <span className="wings-admin-nav-intro__icon" aria-hidden="true">
                    <FileTextIcon />
                  </span>
                  <span>Biểu mẫu</span>
                </Link>
                {isSuper ? (
                  <Link
                    aria-current={pathname === '/admin/collections/redirects' ? 'page' : undefined}
                    className={pathname === '/admin/collections/redirects' ? 'is-active' : undefined}
                    href="/admin/collections/redirects"
                  >
                    <span className="wings-admin-nav-intro__icon" aria-hidden="true">
                      <ArrowLeftRightIcon />
                    </span>
                    <span>Redirects</span>
                  </Link>
                ) : null}
              </div>
            </section>
          ) : null}

          {/* Chân trang Sidebar: User profile + Đăng xuất */}
          <div className="wings-admin-standalone-footer">
            <div className="wings-admin-standalone-footer__user">
              <span className="wings-admin-standalone-footer__avatar">
                <UserIcon size={16} />
              </span>
              <div className="wings-admin-standalone-footer__meta">
                <strong className="wings-admin-standalone-footer__name">
                  {user?.email || 'Tài khoản'}
                </strong>
                <span className="wings-admin-standalone-footer__role">
                  {roleLabelMap[user?.role ?? ''] ?? 'Đang kết nối'}
                </span>
              </div>
            </div>
            <Link
              className="wings-admin-standalone-footer__logout"
              href="/admin/logout"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOutIcon size={18} />
            </Link>
          </div>
        </div>
      </aside>

      {/* Workspace Area - Có Top Header chứa Breadcrumbs và Site Switcher actions */}
      <div className="wings-admin-standalone-shell__workspace">
        <header className="app-header wings-admin-standalone-header">
          <div className="app-header__step-nav-wrapper">
            <button
              aria-expanded={isNavOpen}
              aria-label={isNavOpen ? 'Thu gọn điều hướng' : 'Mở điều hướng'}
              className="wings-admin-standalone-toggler"
              onClick={() => setIsNavOpen(!isNavOpen)}
              type="button"
            >
              {isNavOpen ? <PanelLeftCloseIcon size={18} /> : <PanelLeftOpenIcon size={18} />}
            </button>
            <nav className="step-nav" aria-label="Điều hướng cấp">
              <Link href="/admin">Trang chủ</Link>
              <span aria-hidden="true" className="step-nav__separator">/</span>
              <span>{currentTitle}</span>
            </nav>
          </div>
          <div className="app-header__actions">
            {/* AdminSiteSwitcher sẽ tự động Portal vào đây */}
          </div>
        </header>

        <div className="wings-admin-standalone-shell__content">
          {children}
        </div>
      </div>
    </div>
  )
}
