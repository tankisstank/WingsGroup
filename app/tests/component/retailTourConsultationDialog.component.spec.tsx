import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RetailTourConsultationDialog } from '@/tours/RetailTourConsultationDialog'
import {
  TourDepartureSelectionProvider,
  useTourDepartureSelection,
} from '@/tours/TourDepartureSelectionContext'
import { RetailDecisionRail, TourDetailPage } from '@/tours/StructuredPages'
import type { TourResolvedData } from '@/tours/types'

vi.mock('@/components/Media', () => ({ Media: () => <span>photo</span> }))
vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({ children, href, onClick, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}))

// Mock HTMLDialogElement methods in jsdom
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function mockShowModal(this: HTMLDialogElement) {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function mockClose(this: HTMLDialogElement) {
    this.open = false
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const baseTour = {
  id: 105,
  title: 'Seoul - Nami - Everland 5N4D',
  slug: 'seoul-nami-everland-5n4d',
  durationDays: 5,
  durationNights: 4,
}

const sampleDeparture = {
  id: 101,
  departureDate: '2026-11-20T00:00:00.000Z',
  departureCity: 'Hà Nội',
  airline: 'Vietnam Airlines',
  priceFrom: 12000000,
  currency: 'VND',
  availabilityStatus: 'open' as const,
  commerceVerified: true,
}

describe('RetailTourConsultationDialog Component (Phase 4)', () => {
  it('renders snapshot card with tour details, departure info, and pax count', () => {
    const handleClose = vi.fn()
    render(
      <TourDepartureSelectionProvider
        departures={[sampleDeparture]}
        initialDeparture={sampleDeparture}
      >
        <RetailTourConsultationDialog
          isOpen={true}
          nextDeparture={sampleDeparture}
          onClose={handleClose}
          tour={baseTour}
        />
      </TourDepartureSelectionProvider>,
    )

    const snapshot = document.querySelector('[data-od-id="consultation-snapshot"]')!
    expect(snapshot).toBeTruthy()
    expect(snapshot.textContent).toContain('Seoul - Nami - Everland 5N4D')
    expect(snapshot.textContent).toContain('Hà Nội')
    expect(snapshot.textContent).toContain('20/11/2026')
    expect(snapshot.textContent).toContain('2 khách')
    expect(snapshot.textContent).toContain('Tour ghép đoàn')
    expect(snapshot.textContent).toContain('12.000.000')
    expect(snapshot.textContent).toContain('/ khách')
  })

  it('updates snapshot when in private tour mode', () => {
    const PrivateConsumer = () => {
      const context = useTourDepartureSelection()
      return (
        <div>
          <button onClick={() => context.setIsPrivateTour(true)} type="button">
            Set Private
          </button>
          <RetailTourConsultationDialog
            isOpen={true}
            nextDeparture={sampleDeparture}
            onClose={() => {}}
            tour={baseTour}
          />
        </div>
      )
    }

    render(
      <TourDepartureSelectionProvider
        departures={[sampleDeparture]}
        initialDeparture={sampleDeparture}
      >
        <PrivateConsumer />
      </TourDepartureSelectionProvider>,
    )

    fireEvent.click(screen.getByText('Set Private'))

    const snapshot = document.querySelector('[data-od-id="consultation-snapshot"]')!
    expect(snapshot.textContent).toContain('Tour riêng thiết kế')
    expect(snapshot.textContent).toContain('Tour riêng thiết kế theo lịch hẹn')
    expect(snapshot.textContent).toContain('Liên hệ tư vấn')
  })

  it('copies tour requirements to clipboard and shows success feedback', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    render(
      <TourDepartureSelectionProvider
        departures={[sampleDeparture]}
        initialDeparture={sampleDeparture}
      >
        <RetailTourConsultationDialog
          isOpen={true}
          nextDeparture={sampleDeparture}
          onClose={() => {}}
          tour={baseTour}
        />
      </TourDepartureSelectionProvider>,
    )

    const copyBtn = document.querySelector('[data-od-id="consultation-copy-btn"]')!
    fireEvent.click(copyBtn)

    expect(writeTextMock).toHaveBeenCalledTimes(1)
    const copiedText = writeTextMock.mock.calls[0][0]
    expect(copiedText).toContain('[YÊU CẦU TƯ VẤN TOUR WINGSGO]')
    expect(copiedText).toContain('• Tour: Seoul - Nami - Everland 5N4D')
    expect(copiedText).toContain('• Nơi khởi hành: Hà Nội')
    expect(copiedText).toContain('• Ngày đi: 20/11/2026')
    expect(copiedText).toContain('• Số lượng khách: 2 khách')
    expect(copiedText).toContain('• Hình thức: Tour ghép đoàn')
    expect(copiedText).toContain('• Đơn giá niêm yết tham khảo: ')
    expect(copiedText).toContain('12.000.000')
    expect(copiedText).toContain('/ khách')

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="consultation-copy-success"]')).toBeTruthy()
    })
  })

  it('renders direct contact channels and canonical inquiry form CTA with query parameters', () => {
    render(
      <TourDepartureSelectionProvider
        departures={[sampleDeparture]}
        initialDeparture={sampleDeparture}
      >
        <RetailTourConsultationDialog
          isOpen={true}
          nextDeparture={sampleDeparture}
          onClose={() => {}}
          tour={baseTour}
        />
      </TourDepartureSelectionProvider>,
    )

    const hotline = document.querySelector('[data-od-id="consultation-hotline-btn"]')!
    expect(hotline.getAttribute('href')).toBe('tel:0912910101')
    const channels = document.querySelector('[data-od-id="consultation-channels"]')!
    expect(Array.from(channels.querySelectorAll('a[href^="tel:"]'), (link) => link.getAttribute('href')))
      .toEqual(['tel:0912910101', 'tel:0915250101', 'tel:0915260101'])

    const zalo = document.querySelector('[data-od-id="consultation-zalo-btn"]')!
    expect(zalo.getAttribute('href')).toBe('https://zalo.me/4142059657526524531')

    const formCta = document.querySelector('[data-od-id="consultation-form-cta"]')!
    const formHref = formCta.getAttribute('href') || ''
    expect(formHref).toContain('/lien-he')
    expect(formHref).toContain('tourId=105')
    expect(formHref).toContain('tour=seoul-nami-everland-5n4d')
    expect(formHref).toContain('departureId=101')
    expect(formHref).toContain('departureDate=2026-11-20')
    expect(formHref).toContain('guests=2')
    expect(formHref).toContain('source=retail-modal')
  })

  it('honors an empty hotline list without restoring defaults', () => {
    render(
      <TourDepartureSelectionProvider departures={[sampleDeparture]} initialDeparture={sampleDeparture}>
        <RetailTourConsultationDialog
          hotlines={[]}
          isOpen={true}
          nextDeparture={sampleDeparture}
          onClose={() => {}}
          tour={baseTour}
        />
      </TourDepartureSelectionProvider>,
    )
    expect(document.querySelector('[data-od-id="consultation-channels"] a[href^="tel:"]')).toBeNull()
    expect(document.querySelector('[data-od-id="consultation-zalo-btn"]')?.getAttribute('href'))
      .toBe('https://zalo.me/4142059657526524531')
  })

  it('calls onClose when close button clicked or ESC key canceled', () => {
    const handleClose = vi.fn()
    render(
      <TourDepartureSelectionProvider
        departures={[sampleDeparture]}
        initialDeparture={sampleDeparture}
      >
        <RetailTourConsultationDialog
          isOpen={true}
          nextDeparture={sampleDeparture}
          onClose={handleClose}
          tour={baseTour}
        />
      </TourDepartureSelectionProvider>,
    )

    const closeBtn = document.querySelector('[data-od-id="consultation-close-btn"]')!
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)

    const dialog = document.querySelector('dialog')!
    fireEvent(dialog, new Event('cancel'))
    expect(handleClose).toHaveBeenCalledTimes(2)
  })

  it('opens dialog from RetailDecisionRail consultation trigger button', async () => {
    const resolvedData: TourResolvedData = {
      departures: [sampleDeparture],
      featuredDepartures: [],
      nextDeparture: sampleDeparture,
      sectionOrder: ['hero'],
      sectionVisibility: ['hero'],
      variants: [],
      tour: baseTour,
    }

    render(
      <TourDetailPage
        data={resolvedData}
        hotlines={[{ raw: '0919000000', normalized: '0919000000', href: 'tel:0919000000' }]}
        locale="vi"
        siteCode="wings-go"
      />,
    )

    const trigger = document.querySelector('[data-od-id="tour-decision-consultation-trigger"]')!
    expect(trigger).toBeTruthy()

    const dialog = document.querySelector<HTMLDialogElement>('[data-od-id="tour-consultation-dialog"]')!
    expect(dialog).toBeTruthy()
    expect(dialog.open).toBe(false)

    fireEvent.click(trigger)

    await waitFor(() => {
      expect(dialog.open).toBe(true)
    })
    expect(Array.from(dialog.querySelectorAll('a[href^="tel:"]'), (link) => link.getAttribute('href')))
      .toEqual(['tel:0919000000'])
  })
})
