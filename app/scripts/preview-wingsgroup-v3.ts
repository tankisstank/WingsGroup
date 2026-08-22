/**
 * One-shot local E09 preview launcher.
 *
 * The store token is kept in this process and injected only into the seed and
 * server child environments. The store itself is memory-only and disappears
 * when this launcher exits; no marker, database path, URL query, or log line
 * carries the token.
 */
import path from 'node:path'
import { spawn } from 'node:child_process'

import {
  startWingsGroupLocalPreviewStore,
  type WingsGroupLocalPreviewStore,
} from '../src/utilities/localPreviewStore'

const option = (argv: string[], name: string): string | undefined =>
  argv.find((argument) => argument.startsWith(`--${name}=`))?.slice(name.length + 3)

const loopbackHost = (value: string | undefined): string => {
  const host = value || '127.0.0.1'
  if (!['127.0.0.1', '::1', 'localhost'].includes(host)) {
    throw new Error('--hostname must be a loopback host for the local E09 preview.')
  }
  return host
}

const localPort = (value: string | undefined): string | undefined => {
  if (!value) return undefined
  if (!/^\d+$/u.test(value) || Number(value) < 1 || Number(value) > 65535) {
    throw new Error('--port must be a valid TCP port.')
  }
  return value
}

const runChild = (
  command: string,
  args: string[],
  environment: NodeJS.ProcessEnv,
): Promise<number> =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [command, ...args], {
      cwd: process.cwd(),
      env: environment,
      stdio: 'inherit',
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)))
  })

const main = async () => {
  const argv = process.argv.slice(2)
  const assetsDirectory = option(argv, 'assets-dir')
  if (!assetsDirectory) throw new Error('--assets-dir is required.')
  const hostname = loopbackHost(option(argv, 'hostname'))
  const port = localPort(option(argv, 'port'))

  let store: WingsGroupLocalPreviewStore | undefined
  try {
    store = await startWingsGroupLocalPreviewStore({
      baseDatabasePath:
        option(argv, 'base-database') ||
        process.env.E09_PREVIEW_BASE_DATABASE ||
        path.resolve(process.cwd(), 'e09-preview.db'),
    })
    const environment: NodeJS.ProcessEnv = {
      ...process.env,
      DATABASE_URL: store.url,
      E09_PREVIEW_MEDIA_SEED: 'true',
      E09_PREVIEW_STORE_TOKEN: store.token,
      E09_PREVIEW_STORE_URL: store.url,
      NODE_ENV: process.env.NODE_ENV === 'production' ? 'development' : process.env.NODE_ENV,
    }
    delete environment.E09_PREVIEW_MEDIA_DIRECTORY
    delete environment.E09_PREVIEW_ROOT_CAPABILITY

    const manifest = option(argv, 'manifest')
    const seedArgs = ['--apply', `--assets-dir=${path.resolve(assetsDirectory)}`]
    if (manifest) seedArgs.push(`--manifest=${path.resolve(manifest)}`)
    const seedStatus = await runChild(
      'scripts/seed-wingsgroup-v3-home-preview.ts',
      seedArgs,
      environment,
    )
    if (seedStatus !== 0) process.exitCode = seedStatus
    if (seedStatus !== 0) return

    // Webpack keeps this portable local preview independent of any prior
    // Turbopack cache location (including a cache symlink from another run).
    const nextArgs = ['dev', '--webpack', '--hostname', hostname]
    if (port) nextArgs.push('--port', port)
    await runChild('node_modules/next/dist/bin/next', nextArgs, environment)
  } finally {
    await store?.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
