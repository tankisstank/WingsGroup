import { describe, expect, it, vi } from 'vitest'

import { down } from '@/migrations/20260730_130000_wings_side_enquiry_discovery_context'

describe('WingSide enquiry discovery context migration', () => {
  it('preserves durable lead attribution during rollback', async () => {
    const execute = vi.fn()

    await expect(down({ db: { execute } } as never)).resolves.toBeUndefined()
    expect(execute).not.toHaveBeenCalled()
  })
})
