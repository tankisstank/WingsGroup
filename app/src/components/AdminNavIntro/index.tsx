'use client'

import Link from 'next/link'
import React, { useEffect, useState } from 'react'

type Role = 'editor' | 'site-manager' | 'super-admin'

const AdminNavIntro: React.FC = () => {
  const [role, setRole] = useState<Role>('editor')

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

  const canManageData = role === 'site-manager' || role === 'super-admin'
  const isSuperAdmin = role === 'super-admin'

  return (
    <div className="wings-admin-nav-intro">
      <span>Nền quản trị</span>
      <strong>Multisite CMS</strong>
      <Link href="/admin/console">Console vận hành</Link>
      <Link href="/admin/page-wizard">Tạo trang nhanh</Link>
      <Link href="/admin/collections/form-submissions">Lead gửi về</Link>
      {canManageData ? <Link href="/admin/collections/imports">Nhập dữ liệu</Link> : null}
      {isSuperAdmin ? <Link href="/admin/collections/users">Người dùng</Link> : null}
    </div>
  )
}

export default AdminNavIntro
