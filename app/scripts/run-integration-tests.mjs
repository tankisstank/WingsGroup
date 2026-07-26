import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const tempDirectory = await mkdtemp(path.join(tmpdir(), 'wings-int-'))
const databasePath = path.join(tempDirectory, 'integration.sqlite')
const vitestEntrypoint = fileURLToPath(
  new URL('../node_modules/vitest/vitest.mjs', import.meta.url),
)
const cliArgs = process.argv.slice(2)

const collectIntegrationFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        return collectIntegrationFiles(entryPath)
      }

      return entry.name.endsWith('.int.spec.ts') ? [entryPath] : []
    }),
  )

  return files.flat().sort()
}

const resolveSerialRuns = async () => {
  if (cliArgs.length === 0) {
    return collectIntegrationFiles(path.join(process.cwd(), 'tests', 'int'))
  }

  if (cliArgs.every((arg) => !arg.startsWith('-') && existsSync(path.resolve(process.cwd(), arg)))) {
    return cliArgs
  }

  return [null]
}

const runVitest = async (filters) => {
  const child = spawn(
    process.execPath,
    [
      vitestEntrypoint,
      'run',
      '--config',
      './vitest.config.mts',
      '--no-file-parallelism',
      '--maxWorkers',
      '1',
      ...filters,
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

  try {
    return await new Promise((resolve, reject) => {
      child.once('error', reject)
      child.once('exit', (code, signal) => resolve(signal ? 1 : (code ?? 1)))
    })
  } finally {
    process.removeListener('SIGINT', handleInterrupt)
    process.removeListener('SIGTERM', handleTermination)
  }
}

let exitCode = 1

try {
  const runs = await resolveSerialRuns()
  exitCode = 0

  for (const run of runs) {
    const result = await runVitest(run ? [run] : cliArgs)

    if (result !== 0) {
      exitCode = result
      break
    }
  }
} finally {
  await rm(tempDirectory, { force: true, recursive: true })
}

process.exitCode = exitCode
