import React from 'react'
import Link from 'next/link'

export default function TourProductListGuidance() {
  return (
    <section className="wings-admin-guidance wings-admin-guidance--warning" data-tour-product-scope-warning>
      <span className="wings-admin-guidance__badge">Chưa gán site</span>
      <strong>Kiểm tra site của Tour Product</strong>
      <p>
        Tour legacy chưa gán site sẽ không được public đọc và không thể publish. Hãy gán site trước khi
        xuất bản.
      </p>
      <Link href="/admin/collections/tour-products?where%5Bsite%5D%5Bexists%5D=false">
        Lọc nhanh: site exists=false
      </Link>
    </section>
  )
}
