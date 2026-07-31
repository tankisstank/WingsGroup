import { rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { buildUs057BoundBackupManifest } from './lib/wingsSideUs057ReleaseEvidence'

const value = (name: string) => {
  const inline = process.argv.find((argument) => argument.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const required = (name: string) => {
  const result = String(value(name) || '').trim()
  if (!result) throw new Error(`${name} is required`)
  return result
}

const backupPath = path.resolve(required('--backup'))
if (value('--confirm') !== 'BIND_WINGSSIDE_US057_RELEASE_EVIDENCE') {
  throw new Error('Evidence binding requires --confirm BIND_WINGSSIDE_US057_RELEASE_EVIDENCE')
}
const manifest = buildUs057BoundBackupManifest({
  backupPath,
  databaseHost: required('--database-host'),
  databaseName: required('--database-name'),
  planPath: path.resolve(required('--plan')),
  releaseSha: required('--release-sha'),
  restoreEvidencePath: path.resolve(required('--restore-evidence')),
  rollbackRelease: required('--rollback-release'),
  rollbackReleaseSha: required('--rollback-release-sha'),
})
const output = `${backupPath}.json`
const temporary = `${output}.${process.pid}.tmp`
await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
await rename(temporary, output)
console.log(JSON.stringify({
  backupSha256: manifest.checksumSha256,
  manifest: output,
  planSha256: manifest.intendedPlanSha256,
  restoreEvidenceSha256: manifest.restoreEvidenceSha256,
}))
