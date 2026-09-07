import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'

/**
 * Local preview deliberately gives SQLite `:memory:` only. The optional
 * baseline is copied into that database before any child process starts; no
 * SQLite connection ever receives a preview pathname, so WAL/SHM creation and
 * media writes cannot follow a replaced filesystem leaf. The loopback bearer
 * token is process-local and is never serialized into a marker or URL query.
 */
const PREVIEW_STORE_HOST = '127.0.0.1'
const PREVIEW_MEDIA_PREFIX = '/preview-media/'
const PREVIEW_STORE_TOKEN_BYTES = 32

type HranaValue =
  | { type: 'blob'; base64: string }
  | { type: 'float'; value: number }
  | { type: 'integer'; value: string }
  | { type: 'null' }
  | { type: 'text'; value: string }

type HranaStatement = {
  args?: HranaValue[]
  named_args?: Array<{ name: string; value: HranaValue }>
  sql?: string
  sql_id?: number
  want_rows?: boolean
}

type HranaCondition =
  | { type: 'and' | 'or'; conds: HranaCondition[] }
  | { type: 'error' | 'ok'; step: number }
  | { type: 'is_autocommit' }
  | { cond: HranaCondition; type: 'not' }

type HranaBatchStep = {
  condition?: HranaCondition
  stmt: HranaStatement
}

type HranaRequest =
  | { sql: string; type: 'sequence' }
  | { sql: string; type: 'store_sql'; sql_id: number }
  | { sql_id: number; type: 'close_sql' }
  | { stmt: HranaStatement; type: 'execute' }
  | { batch: { steps: HranaBatchStep[] }; type: 'batch' }
  | { type: 'close' }
  | { type: 'get_autocommit' }

type PreviewStoreRequest = {
  baton?: string
  requests?: HranaRequest[]
}

type StoredMedia = {
  bytes: Buffer
  contentType: string
}

type PreviewStoreOptions = {
  baseDatabasePath?: string
  ttlMs?: number
}

export type WingsGroupLocalPreviewStore = {
  close: () => Promise<void>
  token: string
  url: string
}

const authHeader = (request: http.IncomingMessage): string => {
  const value = request.headers.authorization || ''
  return value.startsWith('Bearer ') ? value.slice('Bearer '.length) : ''
}

const sendJSON = (
  response: http.ServerResponse,
  status: number,
  body: Record<string, unknown>,
): void => {
  const encoded = JSON.stringify(body)
  response.statusCode = status
  response.setHeader('content-type', 'application/json')
  response.setHeader('content-length', Buffer.byteLength(encoded))
  response.end(encoded)
}

const readBody = async (request: http.IncomingMessage): Promise<Buffer> => {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}

const fromHranaValue = (value: HranaValue): null | bigint | Buffer | number | string => {
  switch (value.type) {
    case 'blob':
      return Buffer.from(value.base64, 'base64')
    case 'float':
      return value.value
    case 'integer':
      return BigInt(value.value)
    case 'null':
      return null
    case 'text':
      return value.value
  }
}

const toHranaValue = (value: unknown): HranaValue => {
  if (value === null || value === undefined) return { type: 'null' }
  if (typeof value === 'bigint') return { type: 'integer', value: String(value) }
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { type: 'integer', value: String(value) }
      : { type: 'float', value }
  }
  if (typeof value === 'string') return { type: 'text', value }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return { type: 'blob', base64: Buffer.from(value).toString('base64') }
  }
  throw new Error('Preview store received an unsupported SQLite value.')
}

const statementArguments = (
  statement: HranaStatement,
): SQLInputValue[] | Record<string, SQLInputValue> => {
  if (statement.named_args?.length) {
    return Object.fromEntries(
      statement.named_args.map(({ name, value }) => [
        name.replace(/^[@:$]/u, ''),
        fromHranaValue(value),
      ]),
    ) as Record<string, SQLInputValue>
  }
  return (statement.args || []).map(fromHranaValue)
}

const statementSQL = (statement: HranaStatement, sqlByID: Map<number, string>): string => {
  if (statement.sql) return statement.sql
  if (statement.sql_id !== undefined) {
    const sql = sqlByID.get(statement.sql_id)
    if (sql) return sql
  }
  throw new Error('Preview store received a statement without SQL text.')
}

const updateTransactionState = (sql: string, state: { open: boolean }): void => {
  const firstKeyword = sql.trim().split(/\s+/u, 1)[0]?.toUpperCase()
  if (firstKeyword === 'BEGIN' || firstKeyword === 'SAVEPOINT') state.open = true
  if (firstKeyword === 'COMMIT' || firstKeyword === 'ROLLBACK' || firstKeyword === 'RELEASE') {
    state.open = false
  }
}

const executeStatement = (
  database: DatabaseSync,
  statement: HranaStatement,
  sqlByID: Map<number, string>,
  transactionState: { open: boolean },
) => {
  const sql = statementSQL(statement, sqlByID)
  const prepared = database.prepare(sql)
  prepared.setAllowBareNamedParameters(true)
  const args = statementArguments(statement)
  const columns = prepared.columns()
  if (statement.want_rows || columns.length > 0) {
    const rows = Array.isArray(args) ? prepared.all(...args) : prepared.all(args)
    return {
      affected_row_count: 0,
      cols: columns.map((column) => ({
        decltype: column.type,
        name: column.name,
      })),
      last_insert_rowid: undefined,
      rows: rows.map((row) => Object.values(row).map(toHranaValue)),
    }
  }

  const result = Array.isArray(args) ? prepared.run(...args) : prepared.run(args)
  updateTransactionState(sql, transactionState)
  return {
    affected_row_count: result.changes,
    cols: [],
    last_insert_rowid: String(result.lastInsertRowid),
    rows: [],
  }
}

const conditionIsTrue = (
  condition: HranaCondition | undefined,
  results: Array<null | { error?: unknown }>,
  transactionState: { open: boolean },
): boolean => {
  if (!condition) return true
  switch (condition.type) {
    case 'and':
      return condition.conds.every((child) => conditionIsTrue(child, results, transactionState))
    case 'or':
      return condition.conds.some((child) => conditionIsTrue(child, results, transactionState))
    case 'error':
      return Boolean(results[condition.step]?.error)
    case 'ok':
      return !results[condition.step]?.error
    case 'is_autocommit':
      return !transactionState.open
    case 'not':
      return !conditionIsTrue(condition.cond, results, transactionState)
  }
}

const executeRequest = (
  database: DatabaseSync,
  request: HranaRequest,
  sqlByID: Map<number, string>,
  transactionState: { open: boolean },
): Record<string, unknown> => {
  if (request.type === 'close') return { type: 'close' }
  if (request.type === 'store_sql') {
    sqlByID.set(request.sql_id, request.sql)
    return { type: 'store_sql' }
  }
  if (request.type === 'close_sql') {
    sqlByID.delete(request.sql_id)
    return { type: 'close_sql' }
  }
  if (request.type === 'get_autocommit') {
    return { is_autocommit: !transactionState.open, type: 'get_autocommit' }
  }
  if (request.type === 'sequence') {
    database.exec(request.sql)
    updateTransactionState(request.sql, transactionState)
    return { type: 'sequence' }
  }
  if (request.type === 'execute') {
    return {
      result: executeStatement(database, request.stmt, sqlByID, transactionState),
      type: 'execute',
    }
  }

  const stepResults: Array<null | Record<string, unknown>> = []
  const stepErrors: Array<null | Record<string, unknown>> = []
  const stepOutcomes: Array<null | { error?: unknown }> = []
  for (const step of request.batch.steps) {
    if (!conditionIsTrue(step.condition, stepOutcomes, transactionState)) {
      stepResults.push(null)
      stepErrors.push(null)
      stepOutcomes.push(null)
      continue
    }
    try {
      const result = executeStatement(database, step.stmt, sqlByID, transactionState)
      stepResults.push(result)
      stepErrors.push(null)
      stepOutcomes.push({})
    } catch (error) {
      const stepError = {
        code: (error as NodeJS.ErrnoException).code || 'SQLITE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      }
      stepResults.push(null)
      stepErrors.push(stepError)
      stepOutcomes.push({ error: stepError })
    }
  }
  return {
    result: {
      step_errors: stepErrors,
      step_results: stepResults,
    },
    type: 'batch',
  }
}

const pipelineResponse = (
  database: DatabaseSync,
  request: PreviewStoreRequest,
  sqlByID: Map<number, string>,
  transactionState: { open: boolean },
) => ({
  results: (request.requests || []).map((entry) => {
    try {
      return { response: executeRequest(database, entry, sqlByID, transactionState), type: 'ok' }
    } catch (error) {
      return {
        error: {
          code: (error as NodeJS.ErrnoException).code || 'SQLITE_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
        type: 'error',
      }
    }
  }),
})

const loadBaseDatabase = (database: DatabaseSync, baseDatabasePath: string | undefined): void => {
  if (!baseDatabasePath) return
  const stat = fs.lstatSync(baseDatabasePath)
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error('E09 preview base database must be a regular non-symlink file.')
  }
  ;(database as DatabaseSync & { deserialize: (bytes: Buffer) => void }).deserialize(
    fs.readFileSync(baseDatabasePath),
  )
}

export const isWingsGroupLocalPreviewStoreConfigured = (): boolean => {
  const url = process.env.E09_PREVIEW_STORE_URL?.trim()
  const token = process.env.E09_PREVIEW_STORE_TOKEN?.trim()
  if (Boolean(url) !== Boolean(token)) {
    throw new Error('E09 preview store requires both E09_PREVIEW_STORE_URL and its private token.')
  }
  return Boolean(url && token)
}

export const getWingsGroupLocalPreviewStoreURL = (): string => {
  if (!isWingsGroupLocalPreviewStoreConfigured()) {
    throw new Error('E09 preview store is not configured.')
  }
  return process.env.E09_PREVIEW_STORE_URL!.trim().replace(/\/$/u, '')
}

const previewStoreHeaders = (): Record<string, string> => ({
  authorization: `Bearer ${process.env.E09_PREVIEW_STORE_TOKEN!.trim()}`,
})

export const putWingsGroupLocalPreviewMedia = async ({
  bytes,
  contentType,
  filename,
}: {
  bytes: Buffer
  contentType: string
  filename: string
}): Promise<void> => {
  const response = await fetch(
    `${getWingsGroupLocalPreviewStoreURL()}${PREVIEW_MEDIA_PREFIX}${encodeURIComponent(filename)}`,
    {
      body: new Uint8Array(bytes),
      headers: { ...previewStoreHeaders(), 'content-type': contentType },
      method: 'PUT',
    },
  )
  if (!response.ok) throw new Error('E09 preview media store rejected the upload.')
}

export const deleteWingsGroupLocalPreviewMedia = async (filename: string): Promise<void> => {
  const response = await fetch(
    `${getWingsGroupLocalPreviewStoreURL()}${PREVIEW_MEDIA_PREFIX}${encodeURIComponent(filename)}`,
    { headers: previewStoreHeaders(), method: 'DELETE' },
  )
  if (!response.ok && response.status !== 404) {
    throw new Error('E09 preview media store rejected the deletion.')
  }
}

export const getWingsGroupLocalPreviewMedia = async (filename: string): Promise<Response> => {
  const response = await fetch(
    `${getWingsGroupLocalPreviewStoreURL()}${PREVIEW_MEDIA_PREFIX}${encodeURIComponent(filename)}`,
    { headers: previewStoreHeaders() },
  )
  return new Response(response.body, {
    headers: response.headers,
    status: response.status,
  })
}

export const startWingsGroupLocalPreviewStore = async (
  options: PreviewStoreOptions = {},
): Promise<WingsGroupLocalPreviewStore> => {
  const database = new DatabaseSync(':memory:')
  loadBaseDatabase(database, options.baseDatabasePath)
  const token = crypto.randomBytes(PREVIEW_STORE_TOKEN_BYTES).toString('hex')
  const expiresAt =
    options.ttlMs === undefined ? Number.POSITIVE_INFINITY : Date.now() + options.ttlMs
  const media = new Map<string, StoredMedia>()
  const sqlByID = new Map<number, string>()
  const transactionState = { open: false }

  const server = http.createServer(async (request, response) => {
    const presentedToken = Buffer.from(authHeader(request))
    const expectedToken = Buffer.from(token)
    if (
      Date.now() >= expiresAt ||
      presentedToken.length !== expectedToken.length ||
      !crypto.timingSafeEqual(presentedToken, expectedToken)
    ) {
      sendJSON(response, 401, { message: 'E09 preview store authorization failed.' })
      return
    }

    const requestURL = new URL(request.url || '/', `http://${PREVIEW_STORE_HOST}`)
    if (request.method === 'POST' && requestURL.pathname === '/v2/pipeline') {
      try {
        const body = JSON.parse((await readBody(request)).toString('utf8')) as PreviewStoreRequest
        sendJSON(response, 200, pipelineResponse(database, body, sqlByID, transactionState))
      } catch (error) {
        sendJSON(response, 400, {
          message: error instanceof Error ? error.message : 'Invalid preview store request.',
        })
      }
      return
    }

    if (requestURL.pathname.startsWith(PREVIEW_MEDIA_PREFIX)) {
      const filename = decodeURIComponent(requestURL.pathname.slice(PREVIEW_MEDIA_PREFIX.length))
      if (!/^[A-Za-z0-9._-]+$/u.test(filename)) {
        sendJSON(response, 400, { message: 'Invalid preview media filename.' })
        return
      }
      if (request.method === 'PUT') {
        media.set(filename, {
          bytes: await readBody(request),
          contentType: request.headers['content-type'] || 'application/octet-stream',
        })
        response.statusCode = 204
        response.end()
        return
      }
      if (request.method === 'DELETE') {
        media.delete(filename)
        response.statusCode = 204
        response.end()
        return
      }
      if (request.method === 'GET') {
        const stored = media.get(filename)
        if (!stored) {
          sendJSON(response, 404, { message: 'Preview media not found.' })
          return
        }
        response.statusCode = 200
        response.setHeader('content-type', stored.contentType)
        response.setHeader('content-length', stored.bytes.length)
        response.end(stored.bytes)
        return
      }
    }

    sendJSON(response, 404, { message: 'Preview store route not found.' })
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, PREVIEW_STORE_HOST, () => resolve())
  })
  const address = server.address()
  if (!address || typeof address === 'string') {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    database.close()
    throw new Error('E09 preview store did not receive a TCP address.')
  }

  return {
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()))
      database.close()
    },
    token,
    url: `http://${PREVIEW_STORE_HOST}:${address.port}`,
  }
}
