import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const databaseURL = process.env.DATABASE_URL
const backupDir = path.resolve(process.env.BACKUP_DIR || path.join(process.cwd(), 'backups'))
const retentionDays = Math.max(1, Number(process.env.BACKUP_RETENTION_DAYS || 14))
const encryptionRecipient = process.env.BACKUP_ENCRYPTION_RECIPIENT

if (!databaseURL || !/^postgres(?:ql)?:\/\//i.test(databaseURL)) {
  throw new Error('DATABASE_URL must be a PostgreSQL URL.')
}
if (process.env.NODE_ENV === 'production' && !encryptionRecipient) {
  throw new Error('Production backups require BACKUP_ENCRYPTION_RECIPIENT.')
}

const database = new URL(databaseURL)
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const baseName = `wingstravel-${timestamp}.dump`
const plainPath = path.join(backupDir, baseName)
const finalPath = encryptionRecipient ? `${plainPath}.age` : plainPath
const manifestPath = `${finalPath}.json`
const pgEnv = {
  ...process.env,
  PGDATABASE: database.pathname.replace(/^\//, ''),
  PGHOST: database.hostname,
  PGPASSWORD: decodeURIComponent(database.password),
  PGPORT: database.port || '5432',
  PGUSER: decodeURIComponent(database.username),
}

const run = (command, args) => {
  const result = spawnSync(command, args, { env: pgEnv, stdio: 'inherit' })
  if (result.error || result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status ?? 'unknown'}.`)
  }
}

const sha256 = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(hash.digest('hex')))
  })

fs.mkdirSync(backupDir, { recursive: true })

try {
  run('pg_dump', ['--format=custom', '--no-owner', '--no-acl', '--file', plainPath])

  if (encryptionRecipient) {
    run('age', ['--recipient', encryptionRecipient, '--output', finalPath, plainPath])
    fs.rmSync(plainPath, { force: true })
  }

  const manifest = {
    checksumSha256: await sha256(finalPath),
    createdAt: new Date().toISOString(),
    database: database.pathname.replace(/^\//, ''),
    encrypted: Boolean(encryptionRecipient),
    file: path.basename(finalPath),
    format: 'postgres-custom',
    sizeBytes: fs.statSync(finalPath).size,
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
  for (const entry of fs.readdirSync(backupDir, { withFileTypes: true })) {
    if (!entry.isFile() || !/^wingstravel-.*\.dump(?:\.age)?(?:\.json)?$/.test(entry.name)) continue
    const candidate = path.join(backupDir, entry.name)
    if (fs.statSync(candidate).mtimeMs < cutoff) fs.rmSync(candidate, { force: true })
  }

  console.log(JSON.stringify({ backup: finalPath, manifest: manifestPath, status: 'ok' }))
} catch (error) {
  fs.rmSync(plainPath, { force: true })
  if (!fs.existsSync(manifestPath)) fs.rmSync(finalPath, { force: true })
  throw error
}
