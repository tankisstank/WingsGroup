import { generateKeyPairSync, verify } from 'node:crypto'

import { describe, expect, it, vi } from 'vitest'

import {
  createWingsSideTourEnglishEditorialPayloadAdapterFactory,
  wingsSideEnglishEditorialDatabaseIdentityChecksum,
} from '../../scripts/lib/wingsSideTourEnglishEditorialPayloadAdapter'
import {
  wingsSideEnglishEditorialTargetProofSigningDigest,
  type WingsSideEnglishEditorialTargetChallenge,
} from '../../scripts/lib/wingsSideTourEnglishEditorialRuntime'
import type { WingsSideTourEnglishEditorialPlan } from '../../scripts/lib/wingsSideTourEnglishEditorial'

const keys = generateKeyPairSync('ed25519')
const publicKeySpkiBase64 = keys.publicKey
  .export({ format: 'der', type: 'spki' })
  .toString('base64')
const privateKeyPkcs8Base64 = keys.privateKey
  .export({ format: 'der', type: 'pkcs8' })
  .toString('base64')

const measurement = {
  backendPID: '4123',
  currentDatabase: 'wingstravel',
  currentUser: 'wingstravel_release',
  serverAddress: '10.0.0.8',
  serverPort: '5432',
  transactionMarker: '9001',
}

const protectedEnvironment = () => ({
  WINGSSIDE_EN_EDITORIAL_CURRENT_DATABASE: measurement.currentDatabase,
  WINGSSIDE_EN_EDITORIAL_DATABASE_IDENTITY_SHA256:
    wingsSideEnglishEditorialDatabaseIdentityChecksum(measurement),
  WINGSSIDE_EN_EDITORIAL_SOURCE_KIND: 'database-snapshot',
  WINGSSIDE_EN_EDITORIAL_SOURCE_SHA256: 'b'.repeat(64),
  WINGSSIDE_EN_EDITORIAL_TARGET_KEY_ID: 'target-key-01',
  WINGSSIDE_EN_EDITORIAL_TARGET_PRIVATE_KEY_PKCS8_BASE64:
    privateKeyPkcs8Base64,
  WINGSSIDE_EN_EDITORIAL_TARGET_PUBLIC_KEY_SPKI_BASE64:
    publicKeySpkiBase64,
  WINGSTRAVEL_RELEASE_SHA: 'a'.repeat(40),
})

const plan = {
  entries: [
    {
      after: { slug: 'tour-one', title: 'After title' },
      before: { slug: 'tour-one', title: 'Before title' },
      fieldChanges: [{ after: 'After title', before: 'Before title', path: 'title' }],
      slug: 'tour-one',
      tourID: 101,
    },
  ],
  tourIdentities: [{ slug: 'tour-one', tourID: 101 }],
} as unknown as WingsSideTourEnglishEditorialPlan

const fixture = (target = measurement) => {
  let document = { id: 101, site: 7, slug: 'tour-one', title: 'Before title' }
  let transactionSequence = 0
  const sessions: Record<string, { db: object }> = {}
  const payload = {
    db: {
      beginTransaction: vi.fn(async () => {
        transactionSequence += 1
        const id = `transaction-${transactionSequence}`
        sessions[id] = { db: { id } }
        return id
      }),
      commitTransaction: vi.fn(async (id: string) => {
        delete sessions[id]
      }),
      execute: vi.fn(async () => ({
        rows: [
          {
            ...target,
            transactionMarker: String(Number(target.transactionMarker) + transactionSequence),
          },
        ],
      })),
      packageName: '@payloadcms/db-postgres',
      rollbackTransaction: vi.fn(async (id: string) => {
        delete sessions[id]
      }),
      sessions,
    },
    find: vi.fn(async () => ({ docs: [{ code: 'wing-side', id: 7 }] })),
    findByID: vi.fn(async () => structuredClone(document)),
    update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      document = { ...document, ...structuredClone(data) }
      return structuredClone(document)
    }),
  }
  const requests: Array<{ transactionID?: number | string }> = []
  const factory = createWingsSideTourEnglishEditorialPayloadAdapterFactory({
    createRequest: async () => {
      const req = {}
      requests.push(req)
      return req as never
    },
    env: protectedEnvironment(),
    initialize: async () => ({ payload: payload as never, user: { id: 1 } }),
  })
  return { factory, payload, requests }
}

const challenge = (
  stage: WingsSideEnglishEditorialTargetChallenge['stage'],
): WingsSideEnglishEditorialTargetChallenge => ({
  governanceChecksum: 'c'.repeat(64),
  nonce: 'd'.repeat(64),
  planArtifactSha256: 'e'.repeat(64),
  stage,
})

describe('WingSide English editorial Payload/PostgreSQL adapter', () => {
  it('measures and signs a fresh target inside the same transaction as reads and writes', async () => {
    const value = fixture()
    const adapter = await value.factory({
      artifacts: { plan, planArtifactSha256: 'e'.repeat(64) },
      phase: 'apply',
    })
    const transaction = await adapter.beginTransaction()
    expect(transaction).not.toBeNull()

    const proof = await adapter.attestTarget({
      challenge: challenge('after-begin'),
      transaction: transaction!,
    })
    expect(proof.payload).toMatchObject({
      currentDatabase: 'wingstravel',
      databaseIdentitySha256:
        protectedEnvironment().WINGSSIDE_EN_EDITORIAL_DATABASE_IDENTITY_SHA256,
      transactionNonce: 'd'.repeat(64),
    })
    expect(
      verify(
        null,
        Buffer.from(wingsSideEnglishEditorialTargetProofSigningDigest(proof.payload), 'utf8'),
        keys.publicKey,
        Buffer.from(proof.signature.valueBase64, 'base64'),
      ),
    ).toBe(true)

    await expect(adapter.readTours(transaction!)).resolves.toEqual([
      {
        document: { slug: 'tour-one', title: 'Before title' },
        locale: 'en',
        siteCode: 'wing-side',
        tourID: 101,
      },
    ])
    await adapter.writeTour({
      document: { slug: 'tour-one', title: 'After title' },
      tourID: 101,
      transaction: transaction!,
    })
    await expect(adapter.readTours(transaction!)).resolves.toEqual([
      expect.objectContaining({
        document: { slug: 'tour-one', title: 'After title' },
      }),
    ])
    expect(value.payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { title: 'After title' },
        locale: 'en',
        overrideAccess: false,
        req: value.requests[0],
      }),
    )
    await adapter.commitTransaction(transaction!)
    await expect(adapter.readTours(transaction!)).rejects.toThrow('closed or substituted')

    const next = await adapter.beginTransaction()
    const nextProof = await adapter.attestTarget({
      challenge: challenge('after-begin'),
      transaction: next!,
    })
    expect(nextProof.payload.transactionSessionID).not.toBe(
      proof.payload.transactionSessionID,
    )
    await adapter.killTransaction(next!)
  })

  it('refuses a wrong database measurement before returning a signed proof', async () => {
    const value = fixture({ ...measurement, currentDatabase: 'attacker_database' })
    const adapter = await value.factory({
      artifacts: { plan, planArtifactSha256: 'e'.repeat(64) },
      phase: 'verify',
    })
    const transaction = await adapter.beginTransaction()
    await expect(
      adapter.attestTarget({
        challenge: challenge('after-begin'),
        transaction: transaction!,
      }),
    ).rejects.toThrow('wrong PostgreSQL target')
    await adapter.killTransaction(transaction!)
    expect(value.payload.findByID).not.toHaveBeenCalled()
  })

  it('refuses protected target private/public key substitution', async () => {
    const otherKeys = generateKeyPairSync('ed25519')
    const value = fixture()
    const factory = createWingsSideTourEnglishEditorialPayloadAdapterFactory({
      createRequest: async () => ({}) as never,
      env: {
        ...protectedEnvironment(),
        WINGSSIDE_EN_EDITORIAL_TARGET_PUBLIC_KEY_SPKI_BASE64:
          otherKeys.publicKey.export({ format: 'der', type: 'spki' }).toString('base64'),
      },
      initialize: async () => ({
        payload: value.payload as never,
        user: { id: 1 },
      }),
    })
    await expect(
      factory({
        artifacts: { plan, planArtifactSha256: 'e'.repeat(64) },
        phase: 'verify',
      }),
    ).rejects.toThrow('private/public target keys do not match')
  })
})
