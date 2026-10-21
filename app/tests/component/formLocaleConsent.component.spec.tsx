import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FormBlock, type FormBlockType } from '@/blocks/Form/Component'

const context = vi.hoisted(() => ({ locale: 'vi' }))
vi.mock('@/providers/SitePath', () => ({ useSitePublicLocale: () => context.locale }))
vi.mock('@/utilities/useSitePath', () => ({ useSitePath: () => (pathname: string) => pathname }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/components/RichText', () => ({ default: () => null }))
vi.mock('@/utilities/getURL', () => ({ getClientSideURL: () => 'http://localhost' }))

const form: FormBlockType['form'] = {
  id: '1',
  title: 'Contact',
  fields: [],
  confirmationType: 'message',
  emails: [],
  submitButtonLabel: 'Submit',
}

const view = (selectedForm = form) => (
  <FormBlock enableIntro={false} form={selectedForm} siteCode="wings-group" />
)
const reply = (locale: string) =>
  new Response(
    JSON.stringify({
      available: true,
      channels: [],
      consentCopy: `Consent ${locale}`,
      consentVersion: 'wingsgroup-contact-v1',
      enabled: true,
      policyHref: locale === 'en' ? '/en/chinh-sach-bao-mat' : '/chinh-sach-bao-mat',
      retentionMonths: 24,
    }),
  )

beforeEach(() => {
  context.locale = 'vi'
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Form consent locale requests', () => {
  it('uses one governed checkbox for a legacy required consent field and sends both contracts', async () => {
    context.locale = 'en'
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply('en'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'accepted' }), { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)
    const { container } = render(
      view({
        ...form,
        fields: [{ blockType: 'checkbox', label: '', name: 'consent', required: true }],
      }),
    )
    const consent = await screen.findByRole('checkbox', { name: 'Consent en' })
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)
    expect(consent.getAttribute('aria-required')).toBe('true')
    const formElement = container.querySelector('form')!
    fireEvent.submit(formElement)
    await waitFor(() => expect(consent.getAttribute('aria-invalid')).toBe('true'))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    fireEvent.click(consent)
    fireEvent.submit(formElement)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const payload = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(payload.locale).toBe('en')
    expect(payload.leadContract.consent).toBe(true)
    expect(payload.submissionData).toContainEqual({ field: 'consent', value: true })
  })

  it.each(['resolve', 'reject'] as const)(
    'ignores an old locale request that later %ss',
    async (outcome) => {
      let resolveOld!: (value: Response) => void
      let rejectOld!: (reason: Error) => void
      const oldRequest = new Promise<Response>((resolve, reject) => {
        resolveOld = resolve
        rejectOld = reject
      })
      const fetchMock = vi.fn().mockReturnValueOnce(oldRequest).mockResolvedValueOnce(reply('en'))
      vi.stubGlobal('fetch', fetchMock)

      const { rerender } = render(view())
      const oldSignal = fetchMock.mock.calls[0][1].signal as AbortSignal
      context.locale = 'en'
      rerender(view())
      await screen.findByRole('checkbox', { name: 'Consent en' })
      expect(oldSignal.aborted).toBe(true)
      expect(fetchMock.mock.calls[1][0]).toContain('?locale=en')

      await act(async () => {
        if (outcome === 'resolve') resolveOld(reply('vi'))
        else rejectOld(new TypeError('Old request failed after the locale changed'))
      })
      expect(
        screen.getByRole('checkbox', { name: 'Consent en' }).getAttribute('aria-checked'),
      ).toBe('false')
      expect(document.querySelector('a[href="/en/chinh-sach-bao-mat"]')).not.toBeNull()
      expect(screen.queryByText('Consent vi')).toBeNull()
    },
  )

  it('clears accepted consent when changing locale on the mounted form', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(reply('vi')).mockResolvedValueOnce(reply('en')),
    )
    const { rerender } = render(view())
    const checkbox = await screen.findByRole('checkbox', { name: 'Consent vi' })
    fireEvent.click(checkbox)
    expect(checkbox.getAttribute('aria-checked')).toBe('true')
    context.locale = 'en'
    rerender(view())
    await waitFor(() => {
      expect(
        screen.getByRole('checkbox', { name: 'Consent en' }).getAttribute('aria-checked'),
      ).toBe('false')
    })
  })
})
