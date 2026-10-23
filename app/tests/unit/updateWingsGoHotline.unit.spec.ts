import { describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import { updateWingsGoHotlineInPayload } from '../../scripts/updateWingsGoHotline'

function fixture(supportPhone: string | null) {
  const settings = {
    id: 10,
    site: 2,
    supportPhone,
    additionalHotlines: [{ phoneNumber: '0915250101', label: 'Tư vấn tour' }],
    supportEmail: 'info@wingsgroup.vn',
  }
  const find = vi.fn(async ({ collection }) => ({
    docs: collection === 'sites' ? [{ id: 2, code: 'wings-go' }] : [settings],
  }))
  const update = vi.fn(async ({ data }) => Object.assign(settings, data))
  return { settings, find, update, payload: { find, update } as unknown as Payload }
}

describe('WingsGo main hotline update', () => {
  it('plans by default without writing and scopes both lookups to WingsGo', async () => {
    const state = fixture('0912910101')
    expect(await updateWingsGoHotlineInPayload(state.payload)).toMatchObject({
      status: 'planned', siteCode: 'wings-go', currentPhone: '0948786775',
    })
    expect(state.update).not.toHaveBeenCalled()
    expect(state.find.mock.calls[0][0]).toMatchObject({
      collection: 'sites', where: { code: { equals: 'wings-go' } },
    })
    expect(state.find.mock.calls[1][0]).toMatchObject({
      collection: 'site-settings', where: { site: { equals: 2 } },
    })
  })

  it('changes only supportPhone, preserves extra channels and is idempotent', async () => {
    const state = fixture('+84 912 910 101')
    const supplementary = structuredClone(state.settings.additionalHotlines)
    expect(await updateWingsGoHotlineInPayload(state.payload, { apply: true }))
      .toMatchObject({ status: 'updated', currentPhone: '0948786775' })
    expect(state.update).toHaveBeenCalledExactlyOnceWith({
      collection: 'site-settings', id: 10,
      data: { supportPhone: '0948786775' }, overrideAccess: true,
      context: { seed: true },
    })
    expect(state.settings.additionalHotlines).toEqual(supplementary)
    expect(state.settings.supportEmail).toBe('info@wingsgroup.vn')
    expect(await updateWingsGoHotlineInPayload(state.payload, { apply: true }))
      .toMatchObject({ status: 'noop' })
    expect(state.update).toHaveBeenCalledTimes(1)
  })

  it.each(['', '   ', null, '0948 786 775'])('does not write cleared or current main: %j', async (phone) => {
    const state = fixture(phone)
    expect(await updateWingsGoHotlineInPayload(state.payload, { apply: true }))
      .toMatchObject({ status: 'noop' })
    expect(state.update).not.toHaveBeenCalled()
  })

  it.each(['0919000000', 'invalid-phone'])('rejects unexpected CMS values: %s', async (phone) => {
    const state = fixture(phone)
    await expect(updateWingsGoHotlineInPayload(state.payload, { apply: true })).rejects.toThrow('Unexpected')
    expect(state.update).not.toHaveBeenCalled()
  })

  it('rejects missing settings without writing', async () => {
    const state = fixture('0912910101')
    state.find.mockResolvedValueOnce({ docs: [{ id: 2, code: 'wings-go' }] })
    state.find.mockResolvedValueOnce({ docs: [] })
    await expect(updateWingsGoHotlineInPayload(state.payload, { apply: true })).rejects.toThrow('settings')
    expect(state.update).not.toHaveBeenCalled()
  })
})
