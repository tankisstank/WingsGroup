import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  type KeyObject,
} from 'node:crypto'

import {
  createLocalReq,
  getPayload,
  type Payload,
  type PayloadRequest,
} from 'payload'

import {
  executeWingsSideEnglishEditorialGuardedRuntimeWithAdapterFactory,
  wingsSideEnglishEditorialTargetProofSigningDigest,
  type WingsSideEnglishEditorialGuardedCapability,
  type WingsSideEnglishEditorialRuntimeTargetAttestation,
  type WingsSideEnglishEditorialSignedTargetProof,
  type WingsSideTourEnglishEditorialRuntimeAdapter,
} from './wingsSideTourEnglishEditorialRuntime'
import {
  wingsSideTourEnglishEditorialChecksum,
  type WingsSideTourEnglishEditorialDocument,
  type WingsSideTourEnglishEditorialPlan,
} from './wingsSideTourEnglishEditorial'

type ProtectedEnvironment = Partial<Record<string, string | undefined>>

type PayloadTransaction = {
  closed: boolean
  id: number | string
  req: PayloadRequest
}

type PayloadTargetMeasurement = {
  backendPID: string
  currentDatabase: string
  currentUser: string
  serverAddress: string
  serverPort: string
  transactionMarker: string
}

type PayloadAdapterDependencies = {
  createRequest: (payload: Payload, user: unknown) => Promise<PayloadRequest>
  env: ProtectedEnvironment
  initialize: () => Promise<{ payload: Payload; user: unknown }>
}

const requiredProtectedValue = (env: ProtectedEnvironment, name: string) => {
  const value = env[name]?.trim()
  if (!value) {
    throw new Error(`English editorial Payload adapter requires protected environment ${name}`)
  }
  return value
}

const assertPreInitializationEnvironment = (env: ProtectedEnvironment) => {
  if (env.PAYLOAD_DB_PUSH !== 'false') {
    throw new Error('English editorial Payload adapter requires PAYLOAD_DB_PUSH=false')
  }
  if (env.NODE_ENV !== 'production') {
    throw new Error('English editorial Payload adapter requires NODE_ENV=production')
  }
  const databaseURL = requiredProtectedValue(env, 'DATABASE_URL')
  let parsed: URL
  try {
    parsed = new URL(databaseURL)
  } catch {
    throw new Error('English editorial Payload adapter requires a valid PostgreSQL DATABASE_URL')
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('English editorial Payload adapter requires PostgreSQL before initialization')
  }
}

const clone = <T>(value: T): T =>
  value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T)

const relationshipID = (value: unknown): null | number | string => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'number' || typeof id === 'string' ? id : null
  }
  return null
}

const projectToGovernedShape = (
  source: unknown,
  governedShape: unknown,
  path = '$',
): unknown => {
  if (Array.isArray(governedShape)) {
    if (!Array.isArray(source)) return source
    const governedIDs = governedShape.map((entry) => relationshipID(entry))
    if (governedIDs.every((id) => id !== null)) {
      const sourceByID = new Map(
        source
          .map((entry) => [relationshipID(entry), entry] as const)
          .filter(([id]) => id !== null),
      )
      return governedShape.map((entry, index) => {
        const id = governedIDs[index]
        const sourceEntry = sourceByID.get(id)
        if (!sourceEntry) {
          throw new Error(
            `English editorial Payload adapter detected governed array identity drift at ${path}.${index}: missing=${String(id)}`,
          )
        }
        return projectToGovernedShape(sourceEntry, entry, `${path}.${index}`)
      })
    }
    if (source.length !== governedShape.length) {
      throw new Error(
        `English editorial Payload adapter detected governed array cardinality drift at ${path}: source=${source.length}; governed=${governedShape.length}`,
      )
    }
    return governedShape.map((entry, index) =>
      projectToGovernedShape(source[index], entry, `${path}.${index}`),
    )
  }
  if (
    governedShape &&
    typeof governedShape === 'object' &&
    source &&
    typeof source === 'object'
  ) {
    return Object.fromEntries(
      Object.entries(governedShape as Record<string, unknown>).map(([key, value]) => [
        key,
        projectToGovernedShape((source as Record<string, unknown>)[key], value, `${path}.${key}`),
      ]),
    )
  }
  return clone(source)
}

export const wingsSideEnglishEditorialDatabaseIdentityChecksum = ({
  currentDatabase,
  currentUser,
  serverAddress,
  serverPort,
}: Pick<
  PayloadTargetMeasurement,
  'currentDatabase' | 'currentUser' | 'serverAddress' | 'serverPort'
>) =>
  wingsSideTourEnglishEditorialChecksum({
    currentDatabase,
    currentUser,
    serverAddress,
    serverPort,
    version: 1,
  })

const parsePrivateKey = (
  env: ProtectedEnvironment,
): { keyID: string; privateKey: KeyObject } => {
  const keyID = requiredProtectedValue(env, 'WINGSSIDE_EN_EDITORIAL_TARGET_KEY_ID')
  const encodedPrivateKey = requiredProtectedValue(
    env,
    'WINGSSIDE_EN_EDITORIAL_TARGET_PRIVATE_KEY_PKCS8_BASE64',
  )
  const protectedPublicKey = requiredProtectedValue(
    env,
    'WINGSSIDE_EN_EDITORIAL_TARGET_PUBLIC_KEY_SPKI_BASE64',
  )
  let privateKey: KeyObject
  try {
    privateKey = createPrivateKey({
      format: 'der',
      key: Buffer.from(encodedPrivateKey, 'base64'),
      type: 'pkcs8',
    })
  } catch {
    throw new Error('English editorial Payload adapter target private key is invalid')
  }
  if (privateKey.asymmetricKeyType !== 'ed25519') {
    throw new Error('English editorial Payload adapter target key must be Ed25519')
  }
  const derivedPublicKey = createPublicKey(privateKey)
    .export({ format: 'der', type: 'spki' })
    .toString('base64')
  if (derivedPublicKey !== protectedPublicKey) {
    throw new Error('English editorial Payload adapter private/public target keys do not match')
  }
  return { keyID, privateKey }
}

const transactionDatabase = (
  payload: Payload,
  transaction: PayloadTransaction,
) => {
  if (transaction.closed || transaction.req.transactionID !== transaction.id) {
    throw new Error('English editorial Payload adapter transaction is closed or substituted')
  }
  const sessions = payload.db.sessions as
    | Record<string, { db?: unknown }>
    | undefined
  const session = sessions?.[String(transaction.id)]
  if (!session?.db) {
    throw new Error('English editorial Payload adapter transaction session is unavailable')
  }
  return session.db as NonNullable<Parameters<Payload['db']['execute']>[0]['db']>
}

const measureTarget = async (
  payload: Payload,
  transaction: PayloadTransaction,
): Promise<PayloadTargetMeasurement> => {
  const result = await payload.db.execute({
    db: transactionDatabase(payload, transaction),
    raw: `select
      pg_backend_pid()::text as "backendPID",
      current_database()::text as "currentDatabase",
      current_user::text as "currentUser",
      coalesce(inet_server_addr()::text, 'local') as "serverAddress",
      coalesce(inet_server_port()::text, 'local') as "serverPort",
      txid_current()::text as "transactionMarker"`,
  })
  const row = (result as { rows?: Array<Record<string, unknown>> }).rows?.[0]
  const measurement = {
    backendPID: String(row?.backendPID || ''),
    currentDatabase: String(row?.currentDatabase || ''),
    currentUser: String(row?.currentUser || ''),
    serverAddress: String(row?.serverAddress || ''),
    serverPort: String(row?.serverPort || ''),
    transactionMarker: String(row?.transactionMarker || ''),
  }
  if (Object.values(measurement).some((value) => !value)) {
    throw new Error('English editorial Payload adapter could not measure PostgreSQL target')
  }
  return measurement
}

const defaultDependencies = (): PayloadAdapterDependencies => ({
  createRequest: async (payload, user) =>
    createLocalReq(
      {
        context: { disableRevalidate: true, releaseRemediation: true },
        user: user as never,
      },
      payload,
    ),
  env: process.env,
  initialize: async () => {
    assertPreInitializationEnvironment(process.env)
    const config = (await import('../../src/payload.config')).default
    const payload = await getPayload({ config })
    if (payload.db.packageName !== '@payloadcms/db-postgres') {
      throw new Error('English editorial Payload adapter requires @payloadcms/db-postgres')
    }
    const adminEmail = requiredProtectedValue(process.env, 'ADMIN_EMAIL')
    const result = await payload.find({
      collection: 'users',
      depth: 0,
      limit: 2,
      overrideAccess: true,
      pagination: false,
      where: { email: { equals: adminEmail } },
    })
    if (result.docs.length !== 1 || result.docs[0]!.role !== 'super-admin') {
      throw new Error('English editorial Payload adapter requires exactly one protected super-admin')
    }
    return { payload, user: result.docs[0]! }
  },
})

/**
 * Application-owned factory for the guarded English editorial runtime.
 * The only returned writes are transaction-bound adapter methods; no standalone
 * mutation function is exported.
 */
const createWingsSideTourEnglishEditorialPayloadAdapterFactory = () => {
  const dependencies = defaultDependencies()
  return async ({
    artifacts,
  }: {
    artifacts: {
      plan: WingsSideTourEnglishEditorialPlan
      planArtifactSha256: string
    }
    phase: 'apply' | 'rollback' | 'verify'
  }): Promise<WingsSideTourEnglishEditorialRuntimeAdapter<PayloadTransaction>> => {
    const { payload, user } = await dependencies.initialize()
    if (payload.db.packageName !== '@payloadcms/db-postgres') {
      throw new Error('English editorial Payload adapter requires @payloadcms/db-postgres')
    }
    const { keyID, privateKey } = parsePrivateKey(dependencies.env)
    const expectedDatabaseIdentity = requiredProtectedValue(
      dependencies.env,
      'WINGSSIDE_EN_EDITORIAL_DATABASE_IDENTITY_SHA256',
    )
    const expectedDatabase = requiredProtectedValue(
      dependencies.env,
      'WINGSSIDE_EN_EDITORIAL_CURRENT_DATABASE',
    )
    const expectedReleaseSha = requiredProtectedValue(
      dependencies.env,
      'WINGSTRAVEL_RELEASE_SHA',
    )
    const expectedSourceKind = requiredProtectedValue(
      dependencies.env,
      'WINGSSIDE_EN_EDITORIAL_SOURCE_KIND',
    )
    const expectedSourceSha256 = requiredProtectedValue(
      dependencies.env,
      'WINGSSIDE_EN_EDITORIAL_SOURCE_SHA256',
    )
    const entriesByID = new Map(
      artifacts.plan.entries.map((entry) => [String(entry.tourID), entry]),
    )

    const assertSite = async (req: PayloadRequest) => {
      const sites = await payload.find({
        collection: 'sites',
        depth: 0,
        limit: 2,
        overrideAccess: false,
        pagination: false,
        req,
        where: { code: { equals: 'wing-side' } },
      })
      if (sites.docs.length !== 1) {
        throw new Error('English editorial Payload adapter requires exactly one wing-side site')
      }
      return sites.docs[0]!.id
    }

    const adapter: WingsSideTourEnglishEditorialRuntimeAdapter<PayloadTransaction> = {
      attestTarget: async ({ challenge, transaction }) => {
        const measurement = await measureTarget(payload, transaction)
        const databaseIdentitySha256 =
          wingsSideEnglishEditorialDatabaseIdentityChecksum(measurement)
        if (
          measurement.currentDatabase !== expectedDatabase ||
          databaseIdentitySha256 !== expectedDatabaseIdentity
        ) {
          throw new Error('English editorial Payload adapter measured the wrong PostgreSQL target')
        }
        const payloadAttestation: WingsSideEnglishEditorialRuntimeTargetAttestation = {
          currentDatabase: measurement.currentDatabase,
          databaseIdentitySha256,
          environmentKind: 'production',
          governanceChecksum: challenge.governanceChecksum,
          planArtifactSha256: challenge.planArtifactSha256,
          releaseSha: expectedReleaseSha,
          siteCode: 'wing-side',
          sourceKind:
            expectedSourceKind as WingsSideEnglishEditorialRuntimeTargetAttestation['sourceKind'],
          sourceSha256: expectedSourceSha256,
          stage: challenge.stage,
          transactionNonce: challenge.nonce,
          transactionSessionID: createHash('sha256')
            .update(
              `${transaction.id}:${measurement.backendPID}:${measurement.transactionMarker}`,
            )
            .digest('hex'),
        }
        const proof: WingsSideEnglishEditorialSignedTargetProof = {
          payload: payloadAttestation,
          signature: {
            algorithm: 'ed25519',
            keyID,
            valueBase64: sign(
              null,
              Buffer.from(
                wingsSideEnglishEditorialTargetProofSigningDigest(payloadAttestation),
                'utf8',
              ),
              privateKey,
            ).toString('base64'),
          },
        }
        return proof
      },
      beginTransaction: async () => {
        const req = await dependencies.createRequest(payload, user)
        if (req.transactionID) {
          throw new Error('English editorial Payload adapter requires a fresh request transaction')
        }
        const id = await payload.db.beginTransaction()
        if (id === null || id === undefined) return null
        req.transactionID = id
        return { closed: false, id, req }
      },
      commitTransaction: async (transaction) => {
        transactionDatabase(payload, transaction)
        await payload.db.commitTransaction(transaction.id)
        transaction.closed = true
        delete transaction.req.transactionID
      },
      killTransaction: async (transaction) => {
        transactionDatabase(payload, transaction)
        try {
          await payload.db.rollbackTransaction(transaction.id)
        } finally {
          transaction.closed = true
          delete transaction.req.transactionID
        }
      },
      readTours: async (transaction) => {
        transactionDatabase(payload, transaction)
        const siteID = await assertSite(transaction.req)
        const rows = []
        for (const identity of artifacts.plan.tourIdentities) {
          const entry = entriesByID.get(String(identity.tourID))
          if (!entry) throw new Error('English editorial Payload adapter plan identity is missing')
          const document = await payload.findByID({
            collection: 'tour-products',
            depth: 1,
            draft: false,
            id: identity.tourID as never,
            locale: 'en',
            overrideAccess: false,
            req: transaction.req,
          })
          if (
            relationshipID(document.site) !== siteID ||
            document.slug !== identity.slug
          ) {
            throw new Error(`English editorial Payload adapter tour target mismatch: ${identity.slug}`)
          }
          const projected = projectToGovernedShape(
            document,
            entry.before,
            `tour-products.${identity.slug}`,
          ) as WingsSideTourEnglishEditorialDocument
          rows.push({
            document: projected,
            locale: 'en' as const,
            siteCode: 'wing-side' as const,
            tourID: identity.tourID,
          })
        }
        return rows
      },
      writeTour: async ({ document, tourID, transaction }) => {
        transactionDatabase(payload, transaction)
        const entry = entriesByID.get(String(tourID))
        if (!entry || entry.slug !== document.slug) {
          throw new Error('English editorial Payload adapter refused an unplanned tour write')
        }
        const changedRoots = [
          ...new Set(entry.fieldChanges.map(({ path }) => path.split('.')[0]).filter(Boolean)),
        ]
        if (changedRoots.length === 0) {
          throw new Error('English editorial Payload adapter refused an empty mutation')
        }
        const data = Object.fromEntries(
          changedRoots.map((root) => [
            root,
            clone((document as Record<string, unknown>)[root!]),
          ]),
        )
        await payload.update({
          collection: 'tour-products',
          context: { disableRevalidate: true, releaseRemediation: true },
          data: data as never,
          id: tourID as never,
          locale: 'en',
          overrideAccess: false,
          req: transaction.req,
        })
      },
    }
    return adapter
  }
}

export const executeWingsSideTourEnglishEditorialWithPayloadAdapter = async ({
  capability,
  phase,
}: {
  capability: WingsSideEnglishEditorialGuardedCapability
  phase: 'apply' | 'rollback' | 'verify'
}) => {
  assertPreInitializationEnvironment(process.env)
  return executeWingsSideEnglishEditorialGuardedRuntimeWithAdapterFactory({
    adapterFactory: async (artifacts) => {
      const factory = createWingsSideTourEnglishEditorialPayloadAdapterFactory()
      return factory({ artifacts, phase })
    },
    capability,
    phase,
  })
}
