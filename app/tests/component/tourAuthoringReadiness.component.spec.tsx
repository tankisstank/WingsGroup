import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const uiState = vi.hoisted(() => ({ formModified: false }))

vi.mock('@payloadcms/ui', () => ({
  useLivePreviewContext: () => ({ isLivePreviewing: false }),
  useDocumentEvents: () => ({ reportUpdate: vi.fn() }),
  useDocumentInfo: () => ({ data: {}, id: 75 }),
  useFormModified: () => uiState.formModified,
  useLocale: () => ({ code: 'vi' }),
}))

import TourAuthoringReadiness from '@/components/TourAuthoring/TourAuthoringReadiness'

afterEach(() => {
  cleanup()
  uiState.formModified = false
  vi.unstubAllGlobals()
})

describe('TourAuthoringReadiness', () => {
  it('starts departures unchecked, posts explicit selection, and blocks dirty actions', async () => {
    const readiness = {
      canPublish: true,
      departures: [{ id: 11, status: 'draft', updatedAt: '2026-09-17T00:00:00.000Z' }, { id: 12, status: 'draft', updatedAt: '2026-09-17T00:00:00.000Z' }],
      issues: [],
      product: { id: 75, site: 2, status: 'draft', updatedAt: '2026-09-17T00:00:00.000Z' },
      revision: 'rev-1',
      wrapper: { id: 91, path: '/tours/sample', status: 'draft' },
    }
    const response = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(readiness))
      .mockResolvedValueOnce(response(readiness))
      .mockResolvedValueOnce(response(readiness))
    vi.stubGlobal('fetch', fetchMock)
    const confirmMock = vi.fn(() => false)
    vi.stubGlobal('confirm', confirmMock)

    const { rerender } = render(<TourAuthoringReadiness />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tạo wrapper thay thế' })).toBeTruthy())
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    expect(checkboxes.map((checkbox) => checkbox.checked)).toEqual([false, false])
    expect((screen.getByRole('button', { name: 'Xuất bản tour' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(checkboxes[0])
    expect((screen.getByRole('button', { name: 'Xuất bản tour' }) as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Tạo wrapper thay thế' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const request = fetchMock.mock.calls[1][1] as RequestInit
    expect(JSON.parse(String(request.body))).toMatchObject({ action: 'provision', departureIDs: [11], locale: 'vi', revision: 'rev-1' })
    fireEvent.click(screen.getByRole('button', { name: 'Xuất bản tour' }))
    expect(confirmMock).toHaveBeenCalledWith('Xuất bản TourProduct #75, Page #91 (/tours/sample) và các lịch #11?')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    confirmMock.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Xuất bản tour' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    const publishRequest = fetchMock.mock.calls[2][1] as RequestInit
    expect(JSON.parse(String(publishRequest.body))).toMatchObject({ action: 'publish', departureIDs: [11], locale: 'vi', revision: 'rev-1' })

    uiState.formModified = true
    rerender(<TourAuthoringReadiness />)
    expect((screen.getByRole('button', { name: 'Xuất bản tour' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Xuất bản tour' }))
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
