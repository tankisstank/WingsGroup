import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FormBlock } from '@/blocks/Form/Component'

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

describe('lead form hardened submission', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
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
})
