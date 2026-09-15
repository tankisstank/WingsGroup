import { describe, expect, it, vi } from 'vitest'

import {
  PostgresSmokeEnvironmentError,
  PostgresSmokeProofError,
  runPostgresCrudSmoke,
} from '../../scripts/lib/postgresCrudSmokeLifecycle.mjs'

describe('PostgreSQL CRUD smoke lifecycle', () => {
  it('keeps command order and tears down after a proof failure', async () => {
    const calls: string[] = []
    const log = vi.fn()
    const shell = (command: string, args: string[]) => {
      calls.push(`${command} ${args.join(' ')}`)
      if (args[0] === 'version') return { status: 0, stderr: '', stdout: '16' }
      if (args[0] === 'run') return { status: 0, stderr: '', stdout: 'container-id' }
      if (args[0] === 'exec') return { status: 0, stderr: '', stdout: 'accepting connections' }
      if (args[0] === 'port') return { status: 0, stderr: '', stdout: '127.0.0.1:54321\n' }
      return { status: 0, stderr: '', stdout: '' }
    }
    const run = vi.fn(async (_command: string, args: string[]) => {
      calls.push(`pnpm ${args.join(' ')}`)
      return args.includes('migrate') ? 0 : 1
    })

    await expect(
      runPostgresCrudSmoke({
        container: 'smoke-test',
        database: 'smoke_db',
        log,
        migration: { args: ['exec', 'payload', 'migrate'] },
        onMigrationStart: () => log('migrate'),
        onProofStart: () => log('proof'),
        proof: { args: ['exec', 'tsx', 'proof.ts'] },
        run,
        shell,
        sleep: async () => undefined,
        user: 'smoke',
        password: 'smoke',
      }),
    ).rejects.toBeInstanceOf(PostgresSmokeProofError)

    expect(calls.slice(0, 6)).toEqual([
      'docker version --format {{.Server.Version}}',
      'docker run -d --name smoke-test -e POSTGRES_USER=smoke -e POSTGRES_PASSWORD=smoke -e POSTGRES_DB=smoke_db -p 127.0.0.1::5432 postgres:16-alpine',
      'docker exec smoke-test pg_isready -U smoke -d smoke_db',
      'docker port smoke-test 5432/tcp',
      'pnpm exec payload migrate',
      'pnpm exec tsx proof.ts',
    ])
    expect(calls.at(-1)).toBe('docker rm -f smoke-test')
    expect(log).toHaveBeenNthCalledWith(1, 'migrate')
    expect(log).toHaveBeenNthCalledWith(2, 'proof')
  })

  it('keeps the runner-specific environment failure exit code', async () => {
    const shell = vi.fn(() => ({ status: 1, stderr: '', stdout: '' }))

    await expect(
      runPostgresCrudSmoke({
        container: 'hifi-test',
        database: 'hifi_db',
        environmentExitCode: 2,
        run: vi.fn(),
        shell,
        user: 'smoke',
        password: 'smoke',
      }),
    ).rejects.toMatchObject({ exitCode: 2 } satisfies Partial<PostgresSmokeEnvironmentError>)

    expect(shell).toHaveBeenCalledTimes(1)
  })
})
