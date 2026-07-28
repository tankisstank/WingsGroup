import { generateKeyPairSync } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  assertUs055CatalogLifecycleTarget,
  authorizeUs055TargetProof,
  createBoundPayloadCloser,
  createUs055TargetProof,
  publicKeyFingerprint,
  type Us055ArtifactBinding,
  type Us055TargetIdentity,
} from '../../scripts/lib/wingsSideUs055CatalogLifecycle'

const directories: string[] = []
const environment = {
  PAYLOAD_DB_PUSH: 'false',
  WINGSSIDE_TOUR_EDITORIAL_REHEARSAL_ALLOW: 'disposable-postgres',
}
const target: Us055TargetIdentity = {
  database: 'wingsside_us055_rehearsal_test',
  host: '127.0.0.1',
  port: 35432,
}
const artifacts: Us055ArtifactBinding = {
  backupSha256: '1'.repeat(64),
  beforeArtifactChecksum: '2'.repeat(64),
  catalogRawSha256: '3'.repeat(64),
  planCanonicalSha256: '4'.repeat(64),
  planRawSha256: '5'.repeat(64),
  releaseSourceCommit: '6'.repeat(40),
  restoreEvidenceSha256: '7'.repeat(64),
}

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  )
})

describe('US-055 catalog lifecycle target isolation', () => {
  it('accepts only the explicit-port loopback rehearsal target with both kill switches', () => {
    expect(
      assertUs055CatalogLifecycleTarget({
        databaseURL:
          'postgresql://operator:secret@127.0.0.1:35432/wingsside_us055_rehearsal_test',
        environment,
      }),
    ).toEqual(target)
  })

  it.each([
    ['remote host', 'postgresql://operator:secret@db.example.com:35432/rehearsal', environment],
    ['implicit port', 'postgresql://operator:secret@127.0.0.1/rehearsal', environment],
    ['non-rehearsal database', 'postgresql://operator:secret@127.0.0.1:35432/wingsside', environment],
    [
      'database push enabled',
      'postgresql://operator:secret@127.0.0.1:35432/rehearsal',
      { ...environment, PAYLOAD_DB_PUSH: 'true' },
    ],
    [
      'missing allow value',
      'postgresql://operator:secret@127.0.0.1:35432/rehearsal',
      { ...environment, WINGSSIDE_TOUR_EDITORIAL_REHEARSAL_ALLOW: '' },
    ],
    [
      'production marker',
      'postgresql://operator:secret@127.0.0.1:35432/rehearsal',
      { ...environment, VERCEL_ENV: 'production' },
    ],
  ])('rejects %s', (_label, databaseURL, candidateEnvironment) => {
    expect(() =>
      assertUs055CatalogLifecycleTarget({
        databaseURL,
        environment: candidateEnvironment,
      }),
    ).toThrow()
  })
})

describe('US-055 Ed25519 target proof and replay ledger', () => {
  const makeFixture = async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'us055-proof-unit-'))
    directories.push(directory)
    const { privateKey, publicKey } = generateKeyPairSync('ed25519')
    const fingerprint = publicKeyFingerprint(publicKey)
    const keyID = `us055-rehearsal-${fingerprint.slice(0, 16)}`
    const proof = createUs055TargetProof({
      artifacts,
      keyID,
      privateKey,
      runID: 'rehearsal_unit_001',
      stage: 'apply',
      target,
    })
    return {
      directory,
      keyID,
      privateKey,
      proof,
      trust: { fingerprint, keyID, publicKey },
    }
  }

  it('authorizes one exact fresh binding and atomically rejects replay', async () => {
    const fixture = await makeFixture()
    const input = {
      artifacts,
      ledgerPath: path.join(fixture.directory, 'ledger.json'),
      proof: fixture.proof,
      runID: 'rehearsal_unit_001',
      stage: 'apply' as const,
      target,
      trust: fixture.trust,
    }
    await expect(authorizeUs055TargetProof(input)).resolves.toMatchObject({ stage: 'apply' })
    await expect(authorizeUs055TargetProof(input)).rejects.toThrow(/replay/u)
  })

  it('rejects wrong stage, target, artifacts, trust fingerprint, and forged signature', async () => {
    const fixture = await makeFixture()
    const authorize = (overrides: Record<string, unknown>) =>
      authorizeUs055TargetProof({
        artifacts,
        ledgerPath: path.join(
          fixture.directory,
          `ledger-${Math.random().toString(16).slice(2)}.json`,
        ),
        proof: fixture.proof,
        runID: 'rehearsal_unit_001',
        stage: 'apply',
        target,
        trust: fixture.trust,
        ...overrides,
      })
    await expect(authorize({ stage: 'rollback' })).rejects.toThrow(/binding/u)
    await expect(
      authorize({ target: { ...target, port: target.port + 1 } }),
    ).rejects.toThrow(/binding/u)
    await expect(
      authorize({ artifacts: { ...artifacts, backupSha256: '8'.repeat(64) } }),
    ).rejects.toThrow(/binding/u)
    await expect(
      authorize({
        trust: { ...fixture.trust, fingerprint: '9'.repeat(64) },
      }),
    ).rejects.toThrow(/fingerprint/u)
    await expect(
      authorize({
        proof: { ...fixture.proof, signature: Buffer.alloc(64).toString('base64') },
      }),
    ).rejects.toThrow(/signature/u)
  })

  it('rejects expired, future-dated, and overlong proofs', async () => {
    const fixture = await makeFixture()
    const authorize = (proof: ReturnType<typeof createUs055TargetProof>) =>
      authorizeUs055TargetProof({
        artifacts,
        ledgerPath: path.join(
          fixture.directory,
          `ledger-${Math.random().toString(16).slice(2)}.json`,
        ),
        proof,
        runID: 'rehearsal_unit_001',
        stage: 'apply',
        target,
        trust: fixture.trust,
      })
    const expired = createUs055TargetProof({
      artifacts,
      keyID: fixture.keyID,
      now: new Date(Date.now() - 10 * 60_000),
      privateKey: fixture.privateKey,
      runID: 'rehearsal_unit_001',
      stage: 'apply',
      target,
    })
    const future = createUs055TargetProof({
      artifacts,
      keyID: fixture.keyID,
      now: new Date(Date.now() + 60_000),
      privateKey: fixture.privateKey,
      runID: 'rehearsal_unit_001',
      stage: 'apply',
      target,
    })
    const overlong = createUs055TargetProof({
      artifacts,
      keyID: fixture.keyID,
      privateKey: fixture.privateKey,
      runID: 'rehearsal_unit_001',
      stage: 'apply',
      target,
      ttlMilliseconds: 5 * 60_000 + 1,
    })
    await expect(authorize(expired)).rejects.toThrow(/stale/u)
    await expect(authorize(future)).rejects.toThrow(/future-dated/u)
    await expect(authorize(overlong)).rejects.toThrow(/malformed/u)
  })
})

describe('US-055 bounded Payload/PostgreSQL close ownership', () => {
  it('delegates pool ownership to Payload and closes exactly once', async () => {
    let destroys = 0
    const close = createBoundPayloadCloser({
      destroy: async () => {
        destroys += 1
      },
    })

    await Promise.all([close(), close(), close()])
    expect(destroys).toBe(1)
  })

  it('returns the same bounded failure without retrying a hung owner', async () => {
    let destroys = 0
    const close = createBoundPayloadCloser({
      destroy: async () => {
        destroys += 1
        await new Promise(() => {})
      },
    })

    const first = close(5)
    const second = close(50)
    expect(first).toBe(second)
    await expect(first).rejects.toThrow(/exceeded 5ms/u)
    expect(destroys).toBe(1)
  })

  it('installs a PostgreSQL pool error listener before Payload owns shutdown', async () => {
    const order: string[] = []
    const observed: Error[] = []
    const close = createBoundPayloadCloser(
      {
        db: {
          pool: {
            on: (event, listener) => {
              order.push(`listen:${event}`)
              listener(new Error('intentional close event'))
            },
          },
        },
        destroy: async () => {
          order.push('destroy')
        },
      },
      (error) => observed.push(error),
    )

    await close()
    expect(order).toEqual(['listen:error', 'destroy'])
    expect(observed.map(({ message }) => message)).toEqual([
      'intentional close event',
    ])
  })
})
