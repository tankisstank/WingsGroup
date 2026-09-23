import { describe, expect, it, vi } from 'vitest'

import { deliverWithRetry } from '@/lead-capture/delivery'
import { getClientIP } from '@/lead-capture/redis'
import { verifyTurnstile } from '@/lead-capture/turnstile'
import { LeadValidationError, parseLeadRequest, validateFieldsForForm } from '@/lead-capture/validation'
import type { Form } from '@/payload-types'

const form = {
  fields: [
    { blockType: 'text', label: 'Name', name: 'name', required: true },
    { blockType: 'email', label: 'Email', name: 'email', required: true },
    {
      blockType: 'select',
      label: 'Trip type',
      name: 'tripType',
      options: [{ label: 'Private', value: 'private' }],
    },
  ],
  id: 7,
  title: 'Lead form',
} as Form

const wingsGoContactForm = {
  fields: [
    { blockType: 'text', label: 'Họ và tên', name: 'full-name', required: true },
    { blockType: 'text', label: 'Số điện thoại', name: 'phone', required: true },
    { blockType: 'text', label: 'Điểm đến', name: 'destination', required: false },
    { blockType: 'text', label: 'Ngày đi', name: 'departure-date', required: false },
    { blockType: 'number', label: 'Số khách', name: 'guests', required: true },
    { blockType: 'text', label: 'Tour', name: 'tour-interest', required: false },
  ],
  id: 8,
  title: 'WingsGo Quick Inquiry',
} as Form

describe('lead capture validation', () => {
  it('accepts a bounded request and normalizes only form-defined fields', () => {
    const request = parseLeadRequest(JSON.stringify({
      formId: 7,
      idempotencyKey: '4cb68f3f-6dc9-4b3f-918b-74153f271abc',
      submissionData: [
        { field: 'name', value: '  Alice  ' },
        { field: 'email', value: 'alice@example.com' },
        { field: 'tripType', value: 'private' },
      ],
    }))

    expect(validateFieldsForForm(form, request.submissionData)).toEqual([
      { field: 'name', label: 'Name', value: 'Alice' },
      { field: 'email', label: 'Email', value: 'alice@example.com' },
      { field: 'tripType', label: 'Trip type', value: 'private' },
    ])
  })

  it.each([
    [[{ field: 'email', value: 'alice@example.com' }], 'missing required'],
    [[{ field: 'name', value: 'Alice' }, { field: 'email', value: 'invalid' }], 'invalid email'],
    [[{ field: 'name', value: 'Alice' }, { field: 'email', value: 'a@b.co' }, { field: 'admin', value: 'true' }], 'unknown field'],
  ])('rejects %s (%s)', (submissionData) => {
    expect(() => validateFieldsForForm(form, submissionData)).toThrow(LeadValidationError)
  })

  it('accepts the WingsGo contact form with normalized phone, date and guest count', () => {
    expect(
      validateFieldsForForm(wingsGoContactForm, [
        { field: 'full-name', value: '  Test Guest  ' },
        { field: 'phone', value: '+84 912 345 678' },
        { field: 'destination', value: 'Tokyo' },
        { field: 'departure-date', value: '2027-02-28' },
        { field: 'guests', value: '2' },
        { field: 'tour-interest', value: 'Tokyo spring tour' },
      ]),
    ).toEqual([
      { field: 'full-name', label: 'Họ và tên', value: 'Test Guest' },
      { field: 'phone', label: 'Số điện thoại', value: '+84 912 345 678' },
      { field: 'destination', label: 'Điểm đến', value: 'Tokyo' },
      { field: 'departure-date', label: 'Ngày đi', value: '2027-02-28' },
      { field: 'guests', label: 'Số khách', value: '2' },
      { field: 'tour-interest', label: 'Tour', value: 'Tokyo spring tour' },
    ])
  })

  it.each([
    { name: 'phone', value: '123' },
    { name: 'departure-date', value: '2027-02-30' },
    { name: 'guests', value: '1.5' },
    { name: 'guests', value: '0' },
  ])('rejects invalid WingsGo $name value', ({ name, value }) => {
    expect(() =>
      validateFieldsForForm(wingsGoContactForm, [
        { field: 'full-name', value: 'Test Guest' },
        { field: 'phone', value: name === 'phone' ? value : '0912 345 678' },
        ...(name === 'departure-date' ? [{ field: 'departure-date', value }] : []),
        { field: 'guests', value: name === 'guests' ? value : '2' },
      ]),
    ).toThrow(LeadValidationError)
  })

  it('enforces the Vietnamese ten-digit phone contract when the site opts in', () => {
    expect(() =>
      validateFieldsForForm(
        wingsGoContactForm,
        [
          { field: 'full-name', value: 'Test Guest' },
          { field: 'phone', value: '+84 912 345 678' },
          { field: 'guests', value: '2' },
        ],
        { phonePattern: /^0\d{9}$/u },
      ),
    ).toThrow(LeadValidationError)

    expect(
      validateFieldsForForm(
        wingsGoContactForm,
        [
          { field: 'full-name', value: 'Test Guest' },
          { field: 'phone', value: '0912345678' },
          { field: 'guests', value: '2' },
        ],
        { phonePattern: /^0\d{9}$/u },
      ),
    ).toHaveLength(3)
  })

  it('rejects request bodies over 32 KiB', () => {
    expect(() => parseLeadRequest(`{"padding":"${'x'.repeat(33 * 1024)}"}`)).toThrow(LeadValidationError)
  })

  it('parses normalized enquiry context separately from customer fields', () => {
    const request = parseLeadRequest(JSON.stringify({
      context: {
        discovery: {
          destination: 'sapa',
          duration: 'multi-day',
          style: 'culture',
        },
        source: 'journeys',
        tourId: '42',
        tourSlug: 'sapa-trek-and-market',
      },
      formId: 7,
      idempotencyKey: '4cb68f3f-6dc9-4b3f-918b-74153f271abc',
      submissionData: [
        { field: 'name', value: 'Alice' },
        { field: 'email', value: 'alice@example.com' },
      ],
    }))

    expect(request.context).toEqual({
      discovery: {
        destination: 'sapa',
        duration: 'multi-day',
        style: 'culture',
      },
      source: 'journeys',
      tourId: '42',
      tourSlug: 'sapa-trek-and-market',
    })
    expect(request.submissionData).not.toContainEqual(
      expect.objectContaining({ field: 'tourSlug' }),
    )
  })

  it.each([
    { context: { admin: true }, reason: 'unknown top-level context field' },
    { context: { discovery: { destination: 'Sa Pa!' } }, reason: 'unnormalized discovery code' },
    { context: { tourId: 42 }, reason: 'non-string tour identifier' },
    { context: { tourSlug: '../private' }, reason: 'unsafe tour slug' },
  ])('rejects $reason', ({ context }) => {
    expect(() => parseLeadRequest(JSON.stringify({
      context,
      formId: 7,
      idempotencyKey: '4cb68f3f-6dc9-4b3f-918b-74153f271abc',
      submissionData: [],
    }))).toThrow(LeadValidationError)
  })
})

describe('lead notification retry abstraction', () => {
  it('retries deterministically and succeeds without dead-lettering', async () => {
    const delivery = vi.fn().mockRejectedValueOnce(new Error('temporary')).mockResolvedValue(undefined)
    const delay = vi.fn().mockResolvedValue(undefined)
    const deadLetter = vi.fn()

    const delivered = await deliverWithRetry(
      delivery,
      { fields: [], formTitle: 'Form', siteCode: 'wingsgo', submissionId: 42 },
      { attempts: 3, delay, onDeadLetter: deadLetter },
    )

    expect(delivered).toBe(true)
    expect(delivery).toHaveBeenCalledTimes(2)
    expect(delay).toHaveBeenCalledWith(250)
    expect(deadLetter).not.toHaveBeenCalled()
  })

  it('dead-letters metadata only after all retries fail', async () => {
    const delivery = vi.fn().mockRejectedValue(new Error('permanent'))
    const deadLetter = vi.fn()

    const delivered = await deliverWithRetry(
      delivery,
      { fields: [{ label: 'Email', value: 'private@example.com' }], formTitle: 'Form', siteCode: 'wingsgo', submissionId: 42 },
      { attempts: 3, delay: async () => undefined, onDeadLetter: deadLetter },
    )

    expect(delivered).toBe(false)
    expect(delivery).toHaveBeenCalledTimes(3)
    expect(deadLetter).toHaveBeenCalledWith({ siteCode: 'wingsgo', submissionId: 42 })
  })
})

describe('lead request trust boundaries', () => {
  it('uses only middleware-created client IP context', () => {
    const trusted = new Headers({
      'cf-connecting-ip': '203.0.113.99',
      'x-client-ip': '198.51.100.20',
      'x-forwarded-for': '203.0.113.88',
      'x-site-context-source': 'proxy',
    })
    expect(getClientIP(trusted)).toBe('198.51.100.20')

    trusted.delete('x-site-context-source')
    expect(getClientIP(trusted)).toBe('unknown')
  })

  it('accepts Turnstile only for an active trusted domain and required action', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      action: 'lead-submit',
      hostname: 'www.wingsgo.vn',
      success: true,
    }), { status: 200 }))

    await expect(verifyTurnstile({
      expectedHosts: ['wingsgo.vn', 'www.wingsgo.vn'],
      ip: '198.51.100.20',
      token: 'token',
    })).resolves.toBe(true)

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      action: 'lead-submit',
      hostname: 'attacker.example',
      success: true,
    }), { status: 200 }))
    await expect(verifyTurnstile({
      expectedHosts: ['wingsgo.vn', 'www.wingsgo.vn'],
      ip: '198.51.100.20',
      token: 'token',
    })).resolves.toBe(false)

    fetchMock.mockRestore()
    vi.unstubAllEnvs()
  })
})
