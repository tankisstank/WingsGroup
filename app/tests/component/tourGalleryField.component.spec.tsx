import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const galleryState = vi.hoisted(() => ({
  setValue: vi.fn(),
  value: [1, { id: 2 }, 3],
}))

vi.mock('@payloadcms/ui', () => ({
  useField: () => ({ setValue: galleryState.setValue, value: galleryState.value }),
}))

import TourGalleryField from '@/components/TourGalleryField'

afterEach(() => {
  cleanup()
  galleryState.setValue.mockClear()
  vi.unstubAllGlobals()
})

describe('TourGalleryField', () => {
  it('loads selected thumbnails and removes only the relation', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        docs: [
          { alt: 'Đoàn tour', filename: 'tour.jpg', id: 1, thumbnailURL: '/media/tour-thumb.jpg', url: '/media/tour.jpg' },
          { alt: 'Biển', filename: 'sea.jpg', id: 2, thumbnailURL: '/media/sea-thumb.jpg', url: '/media/sea.jpg' },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<TourGalleryField />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByRole('link', { name: 'Mở ảnh tour.jpg' }).getAttribute('href')).toBe('/media/tour.jpg'))
    expect(screen.getByRole('img', { name: 'Biển' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ ảnh tour.jpg' }))
    expect(galleryState.setValue).toHaveBeenCalledWith([2, 3])
  })

  it('keeps a removable placeholder when media metadata is unavailable', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ docs: [{ alt: 'Đoàn tour', filename: 'tour.jpg', id: 1, thumbnailURL: '/media/tour-thumb.jpg', url: '/media/tour.jpg' }] }),
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<TourGalleryField />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText('Không thể đọc ảnh #3.')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ ảnh #3' }))
    expect(galleryState.setValue).toHaveBeenCalledWith([1, 2])
  })

  it('renders safely with an empty gallery on create', () => {
    galleryState.value = []
    render(<TourGalleryField />)

    expect(screen.getByRole('status').textContent).toContain('0 ảnh')
  })
})
