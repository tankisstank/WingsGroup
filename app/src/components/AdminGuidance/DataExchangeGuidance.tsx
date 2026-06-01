import React from 'react'

const sampleLinks = [
  { href: '/samples/pages-import-sample.csv', label: 'Mẫu pages' },
  { href: '/samples/posts-import-sample.csv', label: 'Mẫu posts' },
  { href: '/samples/site-settings-import-sample.csv', label: 'Mẫu cấu hình site' },
  { href: '/samples/forms-import-sample.csv', label: 'Mẫu forms' },
]

export default function DataExchangeGuidance() {
  return (
    <section className="wings-admin-guidance wings-admin-guidance--warning">
      <strong>Kiểm tra kỹ trước khi nhập dữ liệu</strong>
      <p>
        Import có thể tạo hoặc cập nhật nhiều bản ghi. Dữ liệu import trong CMS được tạo ở trạng
        thái nháp khi collection hỗ trợ draft; hãy review trước khi publish.
      </p>
      <div>
        {sampleLinks.map((link) => (
          <a href={link.href} key={link.href}>
            {link.label}
          </a>
        ))}
      </div>
    </section>
  )
}
