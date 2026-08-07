'use client'

import { useDocumentInfo } from '@payloadcms/ui'

export default function TourProductEditGuidance() {
  const { data } = useDocumentInfo()
  const site = data?.site

  if (site) return null

  return (
    <section className="wings-admin-guidance wings-admin-guidance--warning" data-tour-product-legacy-warning>
      <strong>Chưa gán site</strong>
      <p>
        Đây là bản ghi legacy chưa có site. Bản ghi không được public đọc; hãy gán đúng site trước khi
        publish.
      </p>
    </section>
  )
}
