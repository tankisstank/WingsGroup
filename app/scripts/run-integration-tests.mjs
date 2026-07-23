import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const tempDirectory = await mkdtemp(path.join(tmpdir(), 'wings-int-'))
const databasePath = path.join(tempDirectory, 'integration.sqlite')
const vitestEntrypoint = fileURLToPath(
  new URL('../node_modules/vitest/vitest.mjs', import.meta.url),
)

const child = spawn(
  process.execPath,
  [
    vitestEntrypoint,
    'run',
    '--config',
    './vitest.config.mts',
    '--no-file-parallelism',
    ...process.argv.slice(2),
  ],
  {
    env: {
      ...process.env,
      DATABASE_URL: pathToFileURL(databasePath).href,
      PAYLOAD_DB_PUSH: 'true',
      PAYLOAD_SECRET: 'test-only-secret-not-for-production',
    },
    stdio: 'inherit',
  },
)

const forwardSignal = (signal) => {
  if (!child.killed) child.kill(signal)
}
const handleInterrupt = () => forwardSignal('SIGINT')
const handleTermination = () => forwardSignal('SIGTERM')

process.once('SIGINT', handleInterrupt)
process.once('SIGTERM', handleTermination)

let exitCode = 1

try {
  exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code, signal) => resolve(signal ? 1 : (code ?? 1)))
  })
} finally {
  process.removeListener('SIGINT', handleInterrupt)
  process.removeListener('SIGTERM', handleTermination)
  await rm(tempDirectory, { force: true, recursive: true })
}

process.exitCode = exitCode
