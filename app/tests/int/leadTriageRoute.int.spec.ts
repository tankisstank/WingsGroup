import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createLocalReq: vi.fn(),
  find: vi.fn(),
  findByID: vi.fn(),
  getPayload: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }))
vi.mock('payload', () => ({
  createLocalReq: mocks.createLocalReq,
  getPayload: mocks.getPayload,
}))

import { GET, PATCH } from '@/app/(payload)/api/form-submissions/[id]/triage/route'

const context = (id = '101') => ({ params: Promise.resolve({ id }) })

const manager = { id: 7, role: 'site-manager', sites: [1] }
const editor = { id: 8, role: 'editor', sites: [1] }

const submission = (overrides: Record<string, unknown> = {}) => ({
  assignedTo: null,
  deliveryStatus: 'delivered',
  id: 101,
  salesNote: null,
  salesStatus: null,
  salesStatusFrom: null,
  salesStatusTo: null,
  salesTriageVersion: 0,
  salesUpdatedAt: null,
  salesUpdatedBy: null,
  site: 1,
  submissionData: [{ field: 'email', value: 'customer@example.com' }],
  ...overrides,
})

describe('lead triage endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createLocalReq.mockResolvedValue({ user: manager })
    mocks.auth.mockResolvedValue({ user: manager })
    mocks.findByID.mockResolvedValue(submission())
    mocks.find.mockResolvedValue({
      docs: [
        { id: 7, name: 'Site manager', role: 'site-manager' },
        { id: 9, name: 'Site editor', role: 'editor' },
      ],
    })
    mocks.update.mockResolvedValue({
      docs: [
        submission({
          assignedTo: 9,
          salesNote: 'Đã gọi khách',
          salesStatus: 'contacting',
          salesStatusFrom: null,
          salesStatusTo: 'contacting',
          salesTriageVersion: 1,
          salesUpdatedAt: '2026-09-14T08:00:00.000Z',
          salesUpdatedBy: 7,
        }),
      ],
    })
    mocks.getPayload.mockResolvedValue({
      auth: mocks.auth,
      find: mocks.find,
      findByID: mocks.findByID,
      update: mocks.update,
    })
  })

  it('returns triage metadata without exposing customer submission data', async () => {
    const response = await GET(new Request('https://admin.example/api'), context())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      canUpdate: true,
      salesStatus: null,
      version: 0,
    })
    expect(body).not.toHaveProperty('submissionData')
    expect(body.assignees).toEqual([
      { id: 7, name: 'Site manager', role: 'site-manager' },
      { id: 9, name: 'Site editor', role: 'editor' },
    ])
  })

  it('keeps editor read-only and never calls the update operation', async () => {
    mocks.auth.mockResolvedValue({ user: editor })
    mocks.createLocalReq.mockResolvedValue({ user: editor })

    const response = await PATCH(
      new Request('https://admin.example/api', {
        body: JSON.stringify({ expectedVersion: 0, salesStatus: 'contacting' }),
        headers: { 'content-type': 'application/json' },
        method: 'PATCH',
      }),
      context(),
    )

    expect(response.status).toBe(403)
    expect(mocks.findByID).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('updates only triage fields with a version predicate and preserves delivery state', async () => {
    const response = await PATCH(
      new Request('https://admin.example/api', {
        body: JSON.stringify({
          assignedTo: 9,
          expectedVersion: 0,
          salesNote: 'Đã gọi khách',
          salesStatus: 'contacting',
        }),
        headers: { 'content-type': 'application/json' },
        method: 'PATCH',
      }),
      context(),
    )

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assignedTo: 9,
          salesNote: 'Đã gọi khách',
          salesStatus: 'contacting',
          salesTriageVersion: 1,
        }),
        where: {
          and: [
            { id: { equals: '101' } },
            { salesTriageVersion: { equals: 0 } },
          ],
        },
      }),
    )
    expect(mocks.update.mock.calls[0][0].data).not.toHaveProperty('deliveryStatus')
  })

  it('returns conflict and does not update when the expected version is stale', async () => {
    mocks.findByID.mockResolvedValue(submission({ salesTriageVersion: 2 }))

    const response = await PATCH(
      new Request('https://admin.example/api', {
        body: JSON.stringify({ expectedVersion: 0, salesStatus: 'contacting' }),
        headers: { 'content-type': 'application/json' },
        method: 'PATCH',
      }),
      context(),
    )

    expect(response.status).toBe(409)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
