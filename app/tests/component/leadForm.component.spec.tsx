import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FormBlock } from '@/blocks/Form/Component'
import { PlanPrefillBridge } from '@/components/WingsSideHiFi/PlanPrefillBridge'

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
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
      new Promise<Response>((resolve) => { resolveFetch = resolve }),
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ challengeRequired: true, siteKey: 'test-site-key' }), { status: 403 }),
    ))

    render(<FormBlock enableIntro={false} form={form as never} />)
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Alice' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send brief' }))

    expect((await screen.findByRole('alert')).textContent).toContain('security verification')
    expect(screen.getByLabelText('Security verification')).toBeTruthy()
  })

  it('localizes Vietnamese form labels and first-invalid focus without submitting', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    window.history.replaceState({}, '', '/wingsside/vi/plan-your-trip')
    document.documentElement.lang = 'vi'

    render(<FormBlock enableIntro={false} form={mixedForm as never} />)

    const fullName = await screen.findByLabelText(/Họ và tên/)
    expect(fullName.getAttribute('id')).toBe('planner-form-full-name')
    expect(screen.getByRole('button', { name: 'Gửi yêu cầu' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }))

    await waitFor(() => expect(document.activeElement).toBe(fullName))
    expect(fullName.getAttribute('aria-invalid')).toBe('true')
    expect(fullName.getAttribute('aria-describedby')).toBe('planner-form-full-name-error')
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

  it('keeps required controls script-validated without native required interception', async () => {
    window.history.replaceState({}, '', '/wingsside/en/plan-your-trip')

    render(<FormBlock enableIntro={false} form={mixedForm as never} />)

    const fullName = await screen.findByLabelText(/Full name/)
    expect(fullName).toHaveProperty('required', false)
    expect(fullName.getAttribute('aria-required')).toBe('true')
    expect(document.querySelector('form')?.hasAttribute('novalidate')).toBe(true)
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
    expect(document.getElementById('9-country')?.getAttribute('aria-label')).toBe('Destination')
    expect(document.getElementById('9-travel-month')?.getAttribute('aria-label')).toBe(
      'Travel month',
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
})
