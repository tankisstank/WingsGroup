import { describe, expect, it } from 'vitest'
import type { Payload } from 'payload'
import {
  evaluateHotlineTransition,
  updateWingsGroupHotlineInPayload,
  EXPECTED_OLD_HOTLINE,
  NEW_WINGSGROUP_HOTLINE,
} from '../../scripts/updateWingsGroupHotline'

describe('US-085 WingsGroup Hotline Update Safety & Idempotency', () => {
  describe('evaluateHotlineTransition (pure logic)', () => {
    it('updates expected old hotline 0912910101 to 0948786775', () => {
      const { shouldUpdate, result } = evaluateHotlineTransition('wings-group', EXPECTED_OLD_HOTLINE)
      expect(shouldUpdate).toBe(true)
      expect(result.status).toBe('updated')
      expect(result.previousPhone).toBe('0912910101')
      expect(result.currentPhone).toBe(NEW_WINGSGROUP_HOTLINE)
    })

    it('updates formatted old hotline 0912 910 101 to 0948786775', () => {
      const { shouldUpdate, result } = evaluateHotlineTransition('wings-group', '0912 910 101')
      expect(shouldUpdate).toBe(true)
      expect(result.status).toBe('updated')
      expect(result.currentPhone).toBe(NEW_WINGSGROUP_HOTLINE)
    })

    it('preserves empty or null hotline without modifying (CMS-cleared state)', () => {
      const { shouldUpdate, result } = evaluateHotlineTransition('wings-group', null)
      expect(shouldUpdate).toBe(false)
      expect(result.status).toBe('noop')
      expect(result.currentPhone).toBe('')

      const emptyStr = evaluateHotlineTransition('wings-group', '')
      expect(emptyStr.shouldUpdate).toBe(false)
      expect(emptyStr.result.status).toBe('noop')
    })

    it('is idempotent when hotline is already 0948786775 (noop)', () => {
      const { shouldUpdate, result } = evaluateHotlineTransition('wings-group', NEW_WINGSGROUP_HOTLINE)
      expect(shouldUpdate).toBe(false)
      expect(result.status).toBe('noop')
      expect(result.currentPhone).toBe(NEW_WINGSGROUP_HOTLINE)
    })

    it('is idempotent when hotline is formatted 0948 786 775 (noop)', () => {
      const { shouldUpdate, result } = evaluateHotlineTransition('wings-group', '0948 786 775')
      expect(shouldUpdate).toBe(false)
      expect(result.status).toBe('noop')
      expect(result.currentPhone).toBe(NEW_WINGSGROUP_HOTLINE)
    })

    it('rejects unexpected custom hotline number without updating', () => {
      expect(() => evaluateHotlineTransition('wings-group', '0988776655')).toThrowError(
        /Unexpected custom supportPhone '0988776655'/,
      )
    })

    it('rejects tenants other than wings-group for isolation safety', () => {
      expect(() => evaluateHotlineTransition('wings-go', EXPECTED_OLD_HOTLINE)).toThrowError(
        /Target tenant must be 'wings-group'/,
      )
      expect(() => evaluateHotlineTransition('wing-side', EXPECTED_OLD_HOTLINE)).toThrowError(
        /Target tenant must be 'wings-group'/,
      )
    })
  })

  describe('updateWingsGroupHotlineInPayload (wrapper execution & write count)', () => {
    it('updates only supportPhone and preserves intentionally empty additionalHotlines', async () => {
      const updates: Array<Record<string, unknown>> = []
      const mockPayload = {
        find: async ({ collection }: { collection: string }) => ({
          docs:
            collection === 'sites'
              ? [{ id: 1, code: 'wings-group' }]
              : [{ id: 10, site: 1, supportPhone: '0912910101', additionalHotlines: [] }],
        }),
        update: async (options: { data: Record<string, unknown> }) => {
          updates.push(options.data)
          return { id: 10, ...options.data }
        },
        logger: { info: () => undefined },
      } as unknown as Payload

      const result = await updateWingsGroupHotlineInPayload(mockPayload)
      expect(result.status).toBe('updated')
      expect(result.currentPhone).toBe(NEW_WINGSGROUP_HOTLINE)
      expect(updates).toHaveLength(1)
      expect(updates[0]).toEqual({ supportPhone: NEW_WINGSGROUP_HOTLINE })
      expect('additionalHotlines' in updates[0]!).toBe(false)
    })

    it('performs a truthful noop (0 writes) when already up-to-date with empty additionalHotlines', async () => {
      const updates: Array<Record<string, unknown>> = []
      const mockPayload = {
        find: async ({ collection }: { collection: string }) => ({
          docs:
            collection === 'sites'
              ? [{ id: 1, code: 'wings-group' }]
              : [{ id: 10, site: 1, supportPhone: NEW_WINGSGROUP_HOTLINE, additionalHotlines: [] }],
        }),
        update: async (options: { data: Record<string, unknown> }) => {
          updates.push(options.data)
          return { id: 10, ...options.data }
        },
        logger: { info: () => undefined },
      } as unknown as Payload

      const result = await updateWingsGroupHotlineInPayload(mockPayload)
      expect(result.status).toBe('noop')
      expect(updates).toHaveLength(0)
    })

    it('performs a truthful noop (0 writes) when supportPhone was cleared in CMS', async () => {
      const updates: Array<Record<string, unknown>> = []
      const mockPayload = {
        find: async ({ collection }: { collection: string }) => ({
          docs:
            collection === 'sites'
              ? [{ id: 1, code: 'wings-group' }]
              : [{ id: 10, site: 1, supportPhone: null, additionalHotlines: [] }],
        }),
        update: async (options: { data: Record<string, unknown> }) => {
          updates.push(options.data)
          return { id: 10, ...options.data }
        },
        logger: { info: () => undefined },
      } as unknown as Payload

      const result = await updateWingsGroupHotlineInPayload(mockPayload)
      expect(result.status).toBe('noop')
      expect(updates).toHaveLength(0)
    })

    it('aborts without writing when an unexpected custom hotline is found', async () => {
      const updates: Array<Record<string, unknown>> = []
      const mockPayload = {
        find: async ({ collection }: { collection: string }) => ({
          docs:
            collection === 'sites'
              ? [{ id: 1, code: 'wings-group' }]
              : [{ id: 10, site: 1, supportPhone: '0977112233', additionalHotlines: [] }],
        }),
        update: async (options: { data: Record<string, unknown> }) => {
          updates.push(options.data)
          return { id: 10, ...options.data }
        },
        logger: { info: () => undefined },
      } as unknown as Payload

      await expect(updateWingsGroupHotlineInPayload(mockPayload)).rejects.toThrowError(
        /Unexpected custom supportPhone '0977112233'/,
      )
      expect(updates).toHaveLength(0)
    })
  })
})
