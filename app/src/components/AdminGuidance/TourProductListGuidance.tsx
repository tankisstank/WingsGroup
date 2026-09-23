'use client'

import React from 'react'

const marketQuickFilters = [
  { label: 'Trung Quốc', value: 'china' },
  { label: 'Việt Nam', value: 'vietnam' },
  { label: 'Nhật Bản', value: 'japan' },
  { label: 'Hàn Quốc', value: 'korea' },
  { label: 'Thái Lan', value: 'thailand' },
  { label: 'Campuchia', value: 'cambodia' },
  { label: 'Lào', value: 'laos' },
  { label: 'Myanmar', value: 'myanmar' },
  { label: 'Đông Dương', value: 'indochina' },
  { label: 'Thị trường khác', value: 'other' },
] as const

export default function TourProductListGuidance() {
  const changeMarket = (market?: string) => {
    const url = new URL(window.location.href)
    if (market) {
      url.searchParams.set('where[market][equals]', market)
    } else {
      url.searchParams.delete('where[market][equals]')
    }
    url.searchParams.delete('page')
    window.location.assign(url.toString())
  }

  return (
    <section
      className="wings-admin-guidance wings-admin-guidance--warning"
      data-tour-product-scope-warning
    >
      <span className="wings-admin-guidance__badge">Chưa gán site</span>
      <strong>Kiểm tra site của Tour Product</strong>
      <p>
        Tour legacy chưa gán site sẽ không được public đọc và không thể publish. Hãy gán site trước khi
        xuất bản.
      </p>
      <p>
        Bấm tên tour để mở chi tiết. Sau khi chọn một hoặc nhiều dòng, nút “Chỉnh sửa” trên thanh công cụ
        dùng để cập nhật hàng loạt các tour đã chọn.
      </p>
      <div aria-label="Lọc nhanh theo thị trường" role="group">
        <button onClick={() => changeMarket()} type="button">
          Tất cả thị trường
        </button>
        {marketQuickFilters.map((filter) => (
          <button key={filter.value} onClick={() => changeMarket(filter.value)} type="button">
            {filter.label}
          </button>
        ))}
        <button
          onClick={() => {
            const url = new URL(window.location.href)
            url.searchParams.delete('where[market][equals]')
            url.searchParams.set('where[site][exists]', 'false')
            url.searchParams.delete('page')
            window.location.assign(url.toString())
          }}
          type="button"
        >
          Lọc nhanh: site chưa gán
        </button>
      </div>
    </section>
  )
}
