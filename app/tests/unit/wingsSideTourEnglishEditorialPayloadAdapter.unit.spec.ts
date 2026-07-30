import { afterEach, describe, expect, it, vi } from 'vitest'

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

const stubEnvironment = (environment = safeEnvironment()) => {
  for (const [name, value] of Object.entries(environment)) vi.stubEnv(name, value)
}

afterEach(() => vi.unstubAllEnvs())

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
    stubEnvironment()
    await expect(
      executeWingsSideTourEnglishEditorialWithPayloadAdapter({
        capability: {} as never,
        phase: 'apply',
      }),
    ).rejects.toThrow('requires an issued guarded capability')
  })

  it.each(['true', '1', '', undefined])(
    'blocks unsafe PAYLOAD_DB_PUSH=%s before config import or getPayload initialization',
    async (payloadDbPush) => {
      stubEnvironment({
        ...safeEnvironment(),
        PAYLOAD_DB_PUSH: payloadDbPush ?? '',
      })
      await expect(
        executeWingsSideTourEnglishEditorialWithPayloadAdapter({
          capability: {} as never,
          phase: 'verify',
        }),
      ).rejects.toThrow('PAYLOAD_DB_PUSH=false')
    },
  )

  it('rejects non-production and non-PostgreSQL prerequisites before initialization', async () => {
    stubEnvironment({ ...safeEnvironment(), NODE_ENV: 'development' })
    await expect(
      executeWingsSideTourEnglishEditorialWithPayloadAdapter({
        capability: {} as never,
        phase: 'verify',
      }),
    ).rejects.toThrow('NODE_ENV=production')
    vi.unstubAllEnvs()
    stubEnvironment({ ...safeEnvironment(), DATABASE_URL: 'file:./payload.db' })
    await expect(
      executeWingsSideTourEnglishEditorialWithPayloadAdapter({
        capability: {} as never,
        phase: 'verify',
      }),
    ).rejects.toThrow('requires PostgreSQL before initialization')
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
