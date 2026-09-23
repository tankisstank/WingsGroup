'use client'

import { useDocumentInfo } from '@payloadcms/ui'

export default function TourProductEditGuidance() {
  const { data, id } = useDocumentInfo()
  const site = data?.site

  if (site) return null

  if (id == null || id === 'create') {
    return (
      <section className="wings-admin-guidance" data-tour-product-create-guidance>
        <strong>Chọn site để bắt đầu</strong>
        <p>Chọn site cho tour mới trước khi nhập nội dung. Site sẽ quyết định phạm vi dữ liệu và đường dẫn website.</p>
      </section>
    )
  }

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
