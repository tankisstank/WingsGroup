import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { PreviewStatusBanner } from '@/components/PreviewStatusBanner'

afterEach(cleanup)

describe('PreviewStatusBanner', () => {
  it('distinguishes a new Vietnamese tour draft', () => {
    render(
      <PreviewStatusBanner
        collection="tour-products"
        hasPublishedVersion={false}
        locale="vi"
        mode="draft"
      />,
    )

    expect(screen.getByRole('status').getAttribute('data-preview-status')).toBe('new-draft')
    expect(screen.getByText('Tour mới — bản nháp chưa xuất bản')).toBeTruthy()
    expect(screen.getByText(/chỉ hiển thị trong preview được cấp quyền/i)).toBeTruthy()
  })

  it('distinguishes an existing English draft from public content', () => {
    render(
      <PreviewStatusBanner
        collection="tour-products"
        hasPublishedVersion
        locale="en"
        mode="draft"
      />,
    )

    expect(screen.getByRole('status').getAttribute('data-preview-status')).toBe('draft')
    expect(screen.getByText('Viewing the saved draft')).toBeTruthy()
    expect(screen.getByText(/public version remains unchanged/i)).toBeTruthy()
  })
})
