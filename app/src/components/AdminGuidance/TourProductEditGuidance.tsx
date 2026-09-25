'use client'

import { useDocumentInfo } from '@payloadcms/ui'

export default function TourProductEditGuidance() {
  const { data, id } = useDocumentInfo()
  const site = data?.site

  if (site) {
    return (
      <section className="wings-admin-guidance" data-tour-product-site-guidance>
        <span className="wings-admin-guidance__badge">Bước 1 đã xong</span>
        <strong>Site đã được chọn</strong>
        <p>Tiếp theo, lưu nội dung tour rồi mở tab “Lịch bay & xuất bản” để tạo wrapper, thêm lịch và kiểm tra điều kiện publish.</p>
        <div><a href="#tour-authoring">Mở luồng tạo và xuất bản</a></div>
      </section>
    )
  }

  if (id == null || id === 'create') {
    return (
      <section className="wings-admin-guidance wings-admin-guidance--warning" data-tour-product-create-guidance>
        <span className="wings-admin-guidance__badge">Bước 1</span>
        <strong>Chọn site để bắt đầu</strong>
        <p>Chọn site cho tour mới trước khi nhập nội dung. Site quyết định website, đường dẫn và phạm vi quyền của tour.</p>
        <div><a href="#field-site">Đi tới trường Site</a></div>
      </section>
    )
  }

  return (
    <section className="wings-admin-guidance wings-admin-guidance--warning" data-tour-product-legacy-warning>
      <span className="wings-admin-guidance__badge">Cần xử lý trước</span>
      <strong>Tour chưa được gán site</strong>
      <p>
        Đây là bản ghi legacy chưa có site. Tour sẽ không được public đọc và không thể tạo wrapper hoặc publish
        cho đến khi gán đúng site.
      </p>
      <div><a href="#field-site">Gán site cho tour</a></div>
    </section>
  )
}
