import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FormBlock } from '@/blocks/Form/Component'
import { PlanPrefillBridge } from '@/components/WingsSideHiFi/PlanPrefillBridge'
import { TourEnquiryContextBridge } from '@/tours/TourEnquiryContextBridge'

vi.mock('next/navigation', () => ({
  usePathname: () => '/en',
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('@/utilities/getURL', () => ({ getClientSideURL: () => '' }))
vi.mock('@/components/RichText', () => ({ default: () => <div>Rich text</div> }))

const form = {
  confirmationMessage: null,
  confirmationType: 'message',
  fields: [{ blockType: 'text', label: 'Name', name: 'name', required: true }],
  id: 'lead-form',
  submitButtonLabel: 'Send brief',
  title: 'Lead form',
}

const mixedForm = {
  confirmationMessage: null,
  confirmationType: 'message',
  fields: [
    { blockType: 'text', label: 'Full name', name: 'full-name', required: true },
    { blockType: 'email', label: 'Email', name: 'email', required: true },
    { blockType: 'number', label: 'Group size', name: 'group-size', required: true },
    {
      blockType: 'select',
      label: 'Travel style',
      name: 'style',
      options: [
        { label: 'Family', value: 'family' },
        { label: 'Culture', value: 'culture' },
      ],
      required: true,
    },
    { blockType: 'textarea', label: 'Message', name: 'message', required: true },
    { blockType: 'checkbox', label: 'I agree', name: 'consent', required: true },
  ],
  id: 'planner-form',
  submitButtonLabel: 'Send',
  title: 'Planner form',
}

const wingsGroupForm = {
  confirmationMessage: null,
  confirmationType: 'message',
  fields: [
    { blockType: 'text', label: 'Full name', name: 'full-name', required: true },
    { blockType: 'textarea', label: 'Need', name: 'message', required: true },
  ],
  id: 'wingsgroup-contact',
  site: 9,
  submitButtonLabel: 'Send',
  title: 'WingsGroup Contact',
}

describe('lead form hardened submission', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        disconnect() {}
        observe() {}
        unobserve() {}
      },
    )
    window.history.replaceState({}, '', '/en')
  })

  afterEach(() => {
    cleanup()
    window.history.replaceState({}, '', '/')
  })

  it('uses the bounded endpoint and prevents a second submit while pending', async () => {
    let resolveFetch: ((value: Response) => void) | undefined
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<FormBlock enableIntro={false} form={form as never} />)
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Alice' } })
    const submit = screen.getByRole('button', { name: 'Send brief' })
    fireEvent.click(submit)
    fireEvent.click(submit)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(submit).toHaveProperty('disabled', true)
    const [url, options] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/lead-submissions')
    expect(JSON.parse(String((options as RequestInit).body))).toMatchObject({
      formId: 'lead-form',
      submissionData: [{ field: 'name', value: 'Alice' }],
    })

    resolveFetch?.(new Response(JSON.stringify({ status: 'accepted' }), { status: 202 }))
    await screen.findByRole('status')
  })

  it('shows the Turnstile path only when the server requests a challenge', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ challengeRequired: true, siteKey: 'test-site-key' }), {
            status: 403,
          }),
        ),
    )

    render(<FormBlock enableIntro={false} form={form as never} />)
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Alice' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send brief' }))

    expect((await screen.findByRole('alert')).textContent).toContain('security verification')
    expect(screen.getByLabelText('Security verification')).toBeTruthy()
  })

  it('localizes Vietnamese form labels and focuses the first invalid numeric-id control', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    window.history.replaceState({}, '', '/wingsside/vi/plan-your-trip')
    document.documentElement.lang = 'vi'

    render(<FormBlock enableIntro={false} form={{ ...mixedForm, id: 9 } as never} />)

    const fullName = await screen.findByLabelText(/Họ và tên/)
    expect(fullName.getAttribute('id')).toBe('9-full-name')
    expect(screen.getByRole('button', { name: 'Gửi yêu cầu' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }))

    await waitFor(() => expect(document.activeElement).toBe(fullName))
    expect(fullName.getAttribute('aria-invalid')).toBe('true')
    expect(fullName.getAttribute('aria-describedby')).toBe('9-full-name-error')
    expect(screen.getAllByText('Vui lòng điền thông tin này').length).toBeGreaterThan(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses stable unique ids and describedby associations for every field type', async () => {
    window.history.replaceState({}, '', '/wingsside/en/contact-us')
    document.documentElement.lang = 'en'

    render(
      <>
        <FormBlock enableIntro={false} form={mixedForm as never} />
        <FormBlock enableIntro={false} form={{ ...mixedForm, id: 'contact-form' } as never} />
      </>,
    )

    const fullNameFields = screen.getAllByLabelText(/Full name/)
    expect(fullNameFields[0]?.getAttribute('id')).toBe('planner-form-full-name')
    expect(fullNameFields[1]?.getAttribute('id')).toBe('contact-form-full-name')
    expect(document.querySelectorAll('.site-form-fields')).toHaveLength(2)
    expect(fullNameFields[0]?.closest<HTMLElement>('.site-form-field')?.dataset.formFieldType).toBe(
      'text',
    )
    expect(
      screen.getAllByLabelText(/Message/)[0]?.closest<HTMLElement>('.site-form-field')?.dataset
        .formFieldType,
    ).toBe('textarea')

    fireEvent.click(screen.getAllByRole('button', { name: 'Send brief' })[0])

    await screen.findAllByText('This field is required')
    for (const id of [
      'planner-form-full-name',
      'planner-form-email',
      'planner-form-group-size',
      'planner-form-style',
      'planner-form-message',
      'planner-form-consent',
    ]) {
      const control = document.getElementById(id)
      expect(control, id).toBeTruthy()
      expect(control?.getAttribute('aria-invalid'), id).toBe('true')
      expect(control?.getAttribute('aria-describedby'), id).toBe(`${id}-error`)
      expect(document.getElementById(`${id}-error`), `${id}-error`).toBeTruthy()
    }
  })

  it('aligns native required, aria-required and script validation semantics', async () => {
    window.history.replaceState({}, '', '/wingsside/en/plan-your-trip')

    render(<FormBlock enableIntro={false} form={mixedForm as never} />)

    const fullName = await screen.findByLabelText(/Full name/)
    expect(fullName).toHaveProperty('required', true)
    expect(fullName.getAttribute('aria-required')).toBe('true')
    expect(document.querySelector('form')?.hasAttribute('novalidate')).toBe(false)
  })

  it('labels hidden real plan fields and exposes deterministic consent focus/errors', async () => {
    const css = await import('node:fs').then(({ readFileSync }) =>
      readFileSync('src/components/WingsSideHiFi/hifi-pages.css', 'utf8'),
    )
    document.body.innerHTML = `
      <div class="ws-hifi-plan-form">
        <form>
          <div class="mb-4">
            <div class="mb-6"><input id="9-country" name="country" /></div>
            <div class="mb-6"><input id="9-travel-month" name="travel-month" /></div>
            <div class="mb-6"><input id="9-group-size" name="group-size" /></div>
          </div>
        </form>
      </div>
    `

    render(
      <PlanPrefillBridge
        budgetLabel="Budget"
        budgetOptions={['Under $1k']}
        consentLabel="I agree to be contacted"
        destLabel="Destination"
        destOptions={['Vietnam']}
        groupLabel="Group size"
        groupOptions={[{ label: '2 travelers', value: '2' }]}
        monthLabel="Travel month"
        monthOptions={[{ label: 'March', value: '3' }]}
        styleLabel="Style"
        styleOptions={['Culture']}
      />,
    )

    await waitFor(() => expect(document.querySelector('.ws-plan-chrome-host-mid')).toBeTruthy())
    expect(document.getElementById('9-country')?.getAttribute('aria-label')).toBe(
      'Country of residence',
    )
    expect(document.getElementById('9-travel-month')?.getAttribute('aria-label')).toBe(
      'Preferred travel month/date window',
    )
    expect(css).toMatch(/\.chip\s*\{[\s\S]*min-height:\s*44px;/)

    const formNode = document.querySelector('form')!
    const validateEvent = new Event('ws-plan-validate', { bubbles: true, cancelable: true })
    expect(formNode.dispatchEvent(validateEvent)).toBe(false)

    const consent = await screen.findByRole('checkbox', { name: 'I agree to be contacted' })
    await waitFor(() => expect(document.activeElement).toBe(consent))
    expect(consent.getAttribute('aria-invalid')).toBe('true')
    expect(consent.getAttribute('aria-describedby')).toBe('ws-plan-consent-error')
    expect(screen.getByRole('alert').id).toBe('ws-plan-consent-error')
  })

  it('keeps Journeys q/type in hidden plan context without changing the visitor message', async () => {
    window.history.replaceState({}, '', '/wingsside/en/plan-your-trip?q=H%C3%A0%20N%E1%BB%99i&type=group&destination=hanoi&style=culture&duration=8-14&source=journeys')
    document.body.innerHTML = '<div class="ws-hifi-plan-form"><form><textarea name="message"></textarea></form></div>'
    render(<PlanPrefillBridge budgetLabel="Budget" budgetOptions={[]} consentLabel="Consent" destLabel="Destination" destOptions={['Hanoi']} groupLabel="Group" groupOptions={[]} monthLabel="Month" monthOptions={[]} styleLabel="Style" styleOptions={['Culture']} searchParams={{ q: 'Hà Nội', type: 'group', destination: 'hanoi', style: 'culture', duration: '8-14', source: 'journeys' }} />)
    const planForm = document.querySelector<HTMLFormElement>('.ws-hifi-plan-form form')!
    await waitFor(() => expect(planForm.dataset.wsEnquiryContext).toBeTruthy())
    expect(JSON.parse(planForm.dataset.wsEnquiryContext!)).toMatchObject({ discovery: { q: 'Hà Nội', type: 'group', destination: 'hanoi', style: 'culture', duration: '8-14' } })
    expect(document.querySelector<HTMLTextAreaElement>('textarea[name="message"]')?.value).toBe('')
  })

  it('keeps customer message clean and submits validated tour context separately', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ status: 'accepted' }), { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)
    const enquiryForm = {
      ...form,
      fields: [
        { blockType: 'text', label: 'Name', name: 'name', required: true },
        { blockType: 'textarea', label: 'Message', name: 'message', required: true },
      ],
    }

    render(
      <>
        <FormBlock enableIntro={false} form={enquiryForm as never} />
        <TourEnquiryContextBridge
          context={{
            discovery: { destination: 'sapa', duration: '8-14', style: 'culture' },
            source: 'journeys',
            tourId: 42,
            tourSlug: 'sapa-trek-and-market',
          }}
          rootSelector="#contact-form"
        />
      </>,
    )

    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Alice' } })
    fireEvent.change(screen.getByLabelText(/Message/), {
      target: { value: 'Please share availability.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send brief' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))
    expect(body.context).toEqual({
      discovery: { destination: 'sapa', duration: '8-14', style: 'culture' },
      source: 'journeys',
      tourId: '42',
      tourSlug: 'sapa-trek-and-market',
    })
    expect(body.submissionData).toContainEqual({
      field: 'message',
      value: 'Please share availability.',
    })
    expect(
      body.submissionData.find(({ field }: { field: string }) => field === 'message').value,
    ).not.toMatch(/Tour slug|Tour ID|Source|Discovery/)
  })

  it('fails closed on missing consent, preserves values on delivery errors, and never links pending channels', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'GET') {
        return new Response(
          JSON.stringify({
            available: true,
            channels: [
              { key: 'zalo', label: 'Zalo', state: 'pending-update' },
              {
                href: 'https://example.com/whatsapp',
                key: 'whatsapp',
                label: 'WhatsApp',
                state: 'approved',
              },
            ],
            consentCopy:
              'I agree that WingsGroup may use the information provided to contact me, provide consultation, and route my request to the appropriate team in accordance with the Privacy Policy.',
            consentVersion: 'wingsgroup-contact-v1',
            enabled: true,
            policyHref: '/en/chinh-sach-bao-mat',
            retentionMonths: 24,
          }),
          { status: 200 },
        )
      }

      return new Response(JSON.stringify({ error: 'Lead delivery is temporarily unavailable.' }), {
        status: 503,
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <FormBlock enableIntro={false} form={wingsGroupForm as never} siteCode="wings-group" />,
    )

    const fullName = await screen.findByLabelText(/Full name/)
    const need = screen.getByLabelText(/Message/)
    fireEvent.change(fullName, { target: { value: 'Alice' } })
    fireEvent.change(need, { target: { value: 'Please plan a private journey.' } })

    const consent = await screen.findByRole('checkbox', { name: /I agree that WingsGroup/ })
    expect(consent.tagName).toBe('BUTTON')
    expect(screen.queryByRole('link', { name: 'Zalo' })).toBeNull()
    expect(
      screen
        .getAllByText(/Zalo — Pending update/)
        .find((element) => element.tagName === 'SPAN')
        ?.getAttribute('aria-disabled'),
    ).toBe('true')
    expect(screen.getByRole('link', { name: 'WhatsApp' }).getAttribute('href')).toBe(
      'https://example.com/whatsapp',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Send brief' }))
    await waitFor(() => expect(document.activeElement).toBe(consent))
    expect(consent.getAttribute('aria-invalid')).toBe('true')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    fireEvent.change(screen.getByLabelText(/Preferred contact channel/), {
      target: { value: 'zalo' },
    })
    fireEvent.click(consent)
    fireEvent.click(screen.getByRole('button', { name: 'Send brief' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await screen.findByRole('alert')
    expect(fullName).toHaveProperty('value', 'Alice')
    expect(need).toHaveProperty('value', 'Please plan a private journey.')
    expect(consent.getAttribute('aria-checked')).toBe('true')

    const postOptions = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')?.[1]
    expect(JSON.parse(String(postOptions?.body))).toMatchObject({
      leadContract: {
        consent: true,
        consentVersion: 'wingsgroup-contact-v1',
        preferredChannel: 'zalo',
      },
      submissionData: [
        { field: 'full-name', value: 'Alice' },
        { field: 'message', value: 'Please plan a private journey.' },
      ],
    })
  })
})
