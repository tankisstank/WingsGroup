'use client'

import Link from 'next/link'
import React, { useMemo } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

const relationID = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'string' || typeof id === 'number' ? id : undefined
  }
  return undefined
}

export default function PageEditGuidance() {
  const { data } = useDocumentInfo()
  const document = data as { layoutPresetKey?: unknown; pathname?: unknown; site?: unknown } | undefined
  const isTourWrapper = document?.layoutPresetKey === 'tour-conversion' && typeof document.pathname === 'string' && document.pathname.startsWith('/tour/')
  const wizardHref = useMemo(() => {
    const document = data as { layoutPresetKey?: unknown; site?: unknown } | undefined
    const params = new URLSearchParams()
    const siteID = relationID(document?.site)

    if (siteID !== undefined) params.set('site', String(siteID))
    if (typeof document?.layoutPresetKey === 'string' && document.layoutPresetKey.trim()) {
      params.set('preset', document.layoutPresetKey)
    }

    return `/admin/page-wizard${params.toString() ? `?${params.toString()}` : ''}`
  }, [data])

  return (
    <section className={`wings-admin-guidance${isTourWrapper ? ' wings-admin-guidance--warning' : ''}`}>
      {isTourWrapper && <span className="wings-admin-guidance__badge">Wrapper liên kết TourProduct</span>}
      <strong>{isTourWrapper ? 'Không sửa wrapper từ màn hình Page' : 'Luồng duyệt nội dung'}</strong>
      <p>
        {isTourWrapper
          ? 'Giữ site và pathname khớp /tour/<slug> của tour. Dùng panel “Lịch bay & xuất bản” trên TourProduct để tạo, gán, preview và publish; đổi URL đã public sẽ tạo redirect 301.'
          : 'Editor lưu nháp; site-manager hoặc super-admin kiểm tra preview rồi publish khi sẵn sàng.'}
      </p>
      {isTourWrapper && <ol>
        <li>Lưu thay đổi Page nếu có.</li>
        <li>Quay lại TourProduct để kiểm tra tình trạng wrapper.</li>
        <li>Chỉ publish sau khi preview đúng URL.</li>
      </ol>}
      <div>
        <Link href={wizardHref}>Tạo trang khác từ preset này</Link>
        {isTourWrapper && <Link href="/admin/collections/tour-products">Mở danh sách TourProduct</Link>}
      </div>
    </section>
  )
}
