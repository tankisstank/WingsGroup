import { describe, expect, it, vi } from 'vitest'

import * as payloadAdapterModule from '../../scripts/lib/wingsSideTourEnglishEditorialPayloadAdapter'
import {
  executeWingsSideTourEnglishEditorialWithPayloadAdapter,
  wingsSideEnglishEditorialDatabaseIdentityChecksum,
} from '../../scripts/lib/wingsSideTourEnglishEditorialPayloadAdapter'
const safeEnvironment = () => ({
  DATABASE_URL: 'postgresql://release:protected@example.invalid/wingstravel',
  NODE_ENV: 'production',
  PAYLOAD_DB_PUSH: 'false',
})

describe('WingSide English editorial guarded Payload adapter boundary', () => {
  it('exports no raw adapter factory or transaction mutation method', () => {
    expect(Object.keys(payloadAdapterModule).sort()).toEqual([
      'executeWingsSideTourEnglishEditorialWithPayloadAdapter',
      'wingsSideEnglishEditorialDatabaseIdentityChecksum',
    ])
    expect(payloadAdapterModule).not.toHaveProperty(
      'createWingsSideTourEnglishEditorialPayloadAdapterFactory',
    )
    expect(payloadAdapterModule).not.toHaveProperty('writeTour')
  })

  it('rejects a forged capability before Payload initialization or any write surface is reachable', async () => {
    const initialize = vi.fn()
    await expect(
      executeWingsSideTourEnglishEditorialWithPayloadAdapter({
        capability: {} as never,
        dependencies: {
          createRequest: vi.fn() as never,
          env: safeEnvironment(),
          initialize,
        },
        phase: 'apply',
      }),
    ).rejects.toThrow('requires an issued guarded capability')
    expect(initialize).not.toHaveBeenCalled()
  })

  it.each(['true', '1', '', undefined])(
    'blocks unsafe PAYLOAD_DB_PUSH=%s before config import or getPayload initialization',
    async (payloadDbPush) => {
      const initialize = vi.fn()
      await expect(
        executeWingsSideTourEnglishEditorialWithPayloadAdapter({
          capability: {} as never,
          dependencies: {
            createRequest: vi.fn() as never,
            env: {
              ...safeEnvironment(),
              PAYLOAD_DB_PUSH: payloadDbPush,
            },
            initialize,
          },
          phase: 'verify',
        }),
      ).rejects.toThrow('PAYLOAD_DB_PUSH=false')
      expect(initialize).not.toHaveBeenCalled()
    },
  )

  it('rejects non-production and non-PostgreSQL prerequisites before initialization', async () => {
    const initialize = vi.fn()
    await expect(
      executeWingsSideTourEnglishEditorialWithPayloadAdapter({
        capability: {} as never,
        dependencies: {
          createRequest: vi.fn() as never,
          env: { ...safeEnvironment(), NODE_ENV: 'development' },
          initialize,
        },
        phase: 'verify',
      }),
    ).rejects.toThrow('NODE_ENV=production')
    await expect(
      executeWingsSideTourEnglishEditorialWithPayloadAdapter({
        capability: {} as never,
        dependencies: {
          createRequest: vi.fn() as never,
          env: { ...safeEnvironment(), DATABASE_URL: 'file:./payload.db' },
          initialize,
        },
        phase: 'verify',
      }),
    ).rejects.toThrow('requires PostgreSQL before initialization')
    expect(initialize).not.toHaveBeenCalled()
  })

  it('derives a stable non-secret database identity from measured target fields', () => {
    const measurement = {
      currentDatabase: 'wingstravel',
      currentUser: 'release_operator',
      serverAddress: '10.0.0.8',
      serverPort: '5432',
    }
    expect(wingsSideEnglishEditorialDatabaseIdentityChecksum(measurement)).toBe(
      wingsSideEnglishEditorialDatabaseIdentityChecksum({ ...measurement }),
    )
    expect(wingsSideEnglishEditorialDatabaseIdentityChecksum(measurement)).toMatch(
      /^[a-f0-9]{64}$/u,
    )
  })
})
