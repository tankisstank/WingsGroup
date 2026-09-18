import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const galleryState = vi.hoisted(() => ({
  documents: {
    media: {
      '1': { alt: 'Đoàn tour', filename: 'tour.jpg', id: 1, thumbnailURL: '/media/tour-thumb.jpg', url: '/media/tour.jpg' },
      '2': { alt: 'Biển', filename: 'sea.jpg', id: 2, thumbnailURL: '/media/sea-thumb.jpg', url: '/media/sea.jpg' },
      '3': false,
    },
  },
  getRelationships: vi.fn(),
  setValue: vi.fn(),
  value: [1, { id: 2 }, 3],
}))

vi.mock('@payloadcms/ui', () => ({
  RelationshipProvider: ({ children }: { children: React.ReactNode }) => children,
  useField: () => ({ setValue: galleryState.setValue, value: galleryState.value }),
  useListRelationships: () => ({ documents: galleryState.documents, getRelationships: galleryState.getRelationships }),
}))

import TourGalleryField from '@/components/TourGalleryField'

afterEach(() => {
  cleanup()
  galleryState.getRelationships.mockClear()
  galleryState.setValue.mockClear()
})

describe('TourGalleryField', () => {
  it('shows selected thumbnails and removes only the relation', () => {
    render(<TourGalleryField />)

    expect(screen.getByRole('link', { name: 'Mở ảnh tour.jpg' }).getAttribute('href')).toBe('/media/tour.jpg')
    expect(screen.getByRole('img', { name: 'Biển' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ ảnh tour.jpg' }))
    expect(galleryState.setValue).toHaveBeenCalledWith([2, 3])
  })

  it('keeps a removable placeholder when media metadata is unavailable', () => {
    render(<TourGalleryField />)

    expect(screen.getByRole('alert').textContent).toContain('Không thể đọc ảnh #3')
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ ảnh #3' }))
    expect(galleryState.setValue).toHaveBeenCalledWith([1, 2])
  })
})
