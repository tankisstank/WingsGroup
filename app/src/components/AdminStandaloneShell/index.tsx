'use client'

import type { ReactNode } from 'react'

import AdminNavIntro from '@/components/AdminNavIntro'

import './index.scss'

export default function AdminStandaloneShell({ children }: { children: ReactNode }) {
  return (
    <div className="wings-admin-standalone-shell" data-od-id="admin-standalone-shell">
      <aside
        aria-label="Điều hướng CMS"
        className="wings-admin-standalone-shell__rail"
        data-od-id="admin-standalone-rail"
      >
        <AdminNavIntro />
      </aside>
      <div className="wings-admin-standalone-shell__workspace">{children}</div>
    </div>
  )
}
