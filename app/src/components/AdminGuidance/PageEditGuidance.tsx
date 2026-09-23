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
    <section className="wings-admin-guidance">
      <strong>Luồng duyệt nội dung</strong>
      <p>
        Editor lưu nháp; site-manager hoặc super-admin kiểm tra preview rồi publish khi sẵn sàng.
      </p>
      <Link href={wizardHref}>Tạo trang khác từ preset này</Link>
    </section>
  )
}
