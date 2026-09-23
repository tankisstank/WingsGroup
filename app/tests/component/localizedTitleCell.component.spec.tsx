import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import TourProductListGuidance from '@/components/AdminGuidance/TourProductListGuidance'
import LocalizedTitleCell from '@/components/AdminCells/LocalizedTitleCell'

vi.mock('@payloadcms/ui', () => ({
  useConfig: () => ({ config: { routes: { admin: '/admin' } } }),
  useLocale: () => ({ code: 'vi' }),
}))

afterEach(cleanup)

describe('LocalizedTitleCell', () => {
  it('links a tour title to its detail editor', () => {
    render(
      <LocalizedTitleCell
        cellData="Tour Hàn Quốc"
        collectionSlug="tour-products"
        field={{ name: 'title', type: 'text' }}
        rowData={{ id: 51 }}
      />,
    )

    expect(
      screen.getByRole('link', { name: 'Mở chi tiết tour: Tour Hàn Quốc' }).getAttribute('href'),
    ).toBe('/admin/collections/tour-products/51')
  })

  it('links a page title to its detail editor', () => {
    render(
      <LocalizedTitleCell
        cellData="Hệ sinh thái WingsGroup"
        collectionSlug="pages"
        field={{ name: 'title', type: 'text' }}
        rowData={{ id: 181 }}
      />,
    )

    expect(screen.getByText('Hệ sinh thái WingsGroup').closest('a')?.getAttribute('href')).toBe(
      '/admin/collections/pages/181',
    )
  })

  it('keeps other collection title cells as plain text', () => {
    render(
      <LocalizedTitleCell
        cellData="Bài viết"
        collectionSlug="posts"
        field={{ name: 'title', type: 'text' }}
        rowData={{ id: 8 }}
      />,
    )

    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Bài viết')).toBeTruthy()
  })

  it('distinguishes opening one tour from bulk editing selected tours', () => {
    render(<TourProductListGuidance />)

    expect(screen.getByText(/Bấm tên tour để mở chi tiết/)).toBeTruthy()
    expect(screen.getByText(/cập nhật hàng loạt các tour đã chọn/)).toBeTruthy()
  })
})
